"""Takes a file containing claims and outputs two files required for
prediction using longchecker.

example usage:
    python ccv/preprocess_claims.py \
        --index "./anserini/indexes/lucene-index-cord19-abstract-2022-02-07" \
        --nkeep 20 \
        --ninit 100 \
        --input "./data/covidfact.jsonl" \
        --claim_col "claim" \
        --output_claims "./data/predict_claims.jsonl" \
        --output_corpus "./data/predict_corpus.jsonl" \
        --rerank
        --batch_size 100

    Without re-ranking:
    python ccv/preprocess_claims.py \
        --index "./anserini/indexes/lucene-index-cord19-abstract-2022-02-07" \
        --nkeep 20 \
        --input "./data/covidfact.jsonl" \
        --claim_col "claim" \
        --output_claims "./data/predict_claims.jsonl" \
        --output_corpus "./data/predict_corpus.jsonl" \
"""


import argparse
import json
import nltk
import pandas as pd
from pathlib import Path
from tqdm import tqdm
import util
from typing import Any, List, TextIO, Dict
from difflib import SequenceMatcher
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from pyserini.search.lucene import LuceneSearcher


nunavail = 0  # number of docs not having the corpusid initially available.
nmissed = 0  # number of docs where the corpusid could not be found.


def get_args() -> argparse.Namespace:
    """Returns the given arguments.

    Returns:
        argparse.Namespace: The arguments.
    """

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--index", type=str, help="index file path", required=True
    )
    parser.add_argument(
        "--nkeep",
        type=int,
        help="number of documents to keep per claim",
        required=True,
    )
    parser.add_argument(
        "--ninit", type=int, help="number of documents to return per claim"
    )
    parser.add_argument(
        "--input", type=str, help="input file containing claims", required=True
    )
    parser.add_argument(
        "--claim_col",
        type=str,
        help="name of claim column in dataset",
        required=True,
    )
    parser.add_argument(
        "--output_claims",
        type=str,
        help="claim output file path",
        required=True,
    )
    parser.add_argument(
        "--output_corpus",
        type=str,
        help="corpus output file path",
        required=True,
    )
    parser.add_argument(
        "--delimiter", type=str, help="if not json, which delimiter"
    )
    parser.add_argument(
        "--rerank", action="store_true", help="if given, perform re-ranking"
    )
    parser.add_argument(
        "--batch_size", type=int, help="batch-size to use when re-ranking"
    )

    return parser.parse_args()


def get_sentences(
    metadata: Dict[str, str],
    tokenizer: nltk.tokenize.punkt.PunktSentenceTokenizer,
) -> List[str]:
    """Retrieves sentences from a hit's abstract.

    Args:
        hit (Dict[str, Any]): The metadata associated with the hit to retrieve
            abstract sentences from.
        tokenizer (nltk.tokenize.punkt.PunktSentenceTokenizer):
            Splits text into sentences.

    Returns:
        List[str]: The sentences from a hit's abstract.
    """

    abstract = metadata["abstract"]
    if type(abstract) is list:
        abstract = " ".join([x["text"] for x in abstract])
    return tokenizer.tokenize(abstract)


def get_doc_id(metadata: Dict[str, str]) -> str:
    """Retrives the corpusid from the hit metadata.

    Args:
        metadata (Dict[str, str]): Metadata of the given hit.

    Returns:
        str: corpusid of the given hit
    """
    global nunavail
    global nmissed

    id = metadata["s2_id"]
    if not id:
        nunavail += 1
        for (
            key,
            type,
        ) in [  # look through the other associated ids and use them to try and find the corpusid.
            ("arxiv_id", "arxiv"),
            ("doi", "doi"),
            ("pubmed_id", "pubmed"),
            ("pmcid", "pmc"),
            ("mag_id", "mag"),
            ("sha", "s2"),
        ]:
            id = metadata[key]
            if id:
                id = util.get_corpusid(id, type)
                if id:
                    break
    if not id:
        nmissed += 1
    return id


def remove_duplicates(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Removes duplicate papers from docs.

    Args:
        docs (Dict[str, Any]): The documents containing possible duplicates.

    Returns:
        Dict[str, Any]: List of unique documents.
    """

    duplicates = []
    for i in range(len(docs)):
        for j in range(i + 1, len(docs)):
            t1 = docs[i]["title"].lower()
            t2 = docs[j]["title"].lower()
            r = SequenceMatcher(a=t1, b=t2).ratio()
            if r >= 0.825:
                duplicates.append((i, j))
    remove = []
    for i1, i2 in duplicates:
        b = len(docs[i1]["abstract"]) > len(docs[i2]["abstract"])
        k = i1 if b else i2
        r = i2 if b else i1
        remove.append(r)
        docs[k]["aliases"].append(docs[r]["doc_id"])
        docs[k]["aliases"].extend(docs[r]["aliases"])
    remove = list(set(remove))
    remove = sorted(remove, reverse=True)
    for i in remove:
        docs.pop(i)

    return docs


def process_hits(
    hits: Dict[str, Any], tokenizer: nltk.tokenize.punkt.PunktSentenceTokenizer
) -> List[Dict[str, Any]]:
    """Processes the hits from a query.

    Args:
        hits (Dict[str, Any]): The hits from a query.
        tokenizer (nltk.tokenize.punkt.PunktSentenceTokenizer):
            Splits text into sentences.

    Returns:
        List[Dict[str, Any]]: List of documents.
    """

    doc_dict = {  # also removes duplicate corpusids
        get_doc_id(json.loads(h.raw)["csv_metadata"]): h for h in hits
    }
    docs = []
    for k, v in doc_dict.items():
        if k == "":
            continue
        metadata = json.loads(v.raw)["csv_metadata"]
        doc = {
            "doc_id": int(k),
            "title": metadata["title"],
            "abstract": get_sentences(metadata, tokenizer),
            "journal": metadata["journal"],
            "publish_time": metadata["publish_time"],
            "aliases": [],
        }
        if len(doc["abstract"]):
            docs.append(doc)
    docs = remove_duplicates(docs)
    return docs


def rerank(
    claim: str,
    docs: List[Dict[str, Any]],
    model: AutoModelForSeq2SeqLM,
    tokenizer: AutoTokenizer,
    nkeep: int,
    batch_size: int = 64,
) -> List[Dict[str, Any]]:
    """Takes a claim and the associated retrieved evidence documents, reranks them, and returns the top nkeep.

    Args:
        claim (str): The claim.
        docs (List[Dict[str, Any]]): The lists of documents.
        model (AutoModelForSeq2SeqLM): The model to use for re-ranking.
        tokenizer (AutoTokenizer): The model's tokenizer.
        nkeep (int): How many of the top documents to return.
        batch_size (int): Batch size. Default 64.

    Returns:
        List[Dict[str, Any]]: Reranked and (possibly) truncated list of documents.
    """

    def chunks(l, k):
        for i in range(0, len(l), k):
            yield l[i : i + k]

    texts = [" ".join(d["abstract"]) for d in docs]
    scores = []
    for batch in chunks(texts, batch_size):
        scores.append(util.rerank(claim, batch, model, tokenizer, "cuda:0"))
    sdocs = sorted(zip(docs, scores), key=lambda x: x[-1], reverse=True)
    docs, _ = zip(*sdocs)
    return list(docs)[:nkeep]


def write_claim(
    file: TextIO, claim_id: int, claim: str, docs: List[Dict[str, Any]]
) -> None:
    """Writes the given claim to the given file.

    Args:
        file (TextIO): File to write to.
        claim_id (int): Id of given claim.
        claim (str): The claim to write to file.
        docs (List[Dict[str, Any]]): The documents retrieved for the given
            claim.
    """

    file.write(
        json.dumps(
            {
                "id": claim_id,
                "claim": claim,
                "doc_ids": [d["doc_id"] for d in docs],
            }
        )
        + "\n"
    )


def write_doc(
    file: TextIO, doc: Dict[str, Any], written_docs: List[int]
) -> None:
    """Writes the given document representation to the given file.

    Args:
        file (TextIO): File to write to.
        doc (Dict[str, Any]): Document to write to file.
        written_docs (List[int]): Document already written to file.
    """

    if doc["doc_id"] not in written_docs:
        file.write(json.dumps(doc) + "\n")
        written_docs.append(doc["doc_id"])


def main() -> None:
    """Executes the script."""

    args = get_args()

    nltk.download("punkt")
    stokenizer = nltk.data.load("tokenizers/punkt/english.pickle")

    searcher = LuceneSearcher(args.index)

    file_type = args.input.split(".")[-1]
    if file_type == "jsonl":
        claims = pd.read_json(Path(args.input), lines=True)
    elif file_type == "json":
        claims = pd.read_json(Path(args.input))
    else:
        claims = pd.read_csv(Path(args.input), delimiter=args.delimiter)

    if args.rerank:
        model_name = "castorini/monot5-base-med-msmarco"
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

    written_docs = []
    with open(Path(args.output_claims), "w") as cl, open(
        Path(args.output_corpus), "w"
    ) as co:
        for index, row in tqdm(claims.iterrows(), total=claims.shape[0]):
            claim = row[args.claim_col]
            hits = searcher.search(
                claim, args.ninit if args.ninit else args.nkeep
            )
            docs = process_hits(hits, stokenizer)
            if args.rerank:
                docs = rerank(
                    claim, docs, model, tokenizer, args.nkeep, args.batch_size
                )
            write_claim(cl, index, claim, docs)
            for d in docs:
                write_doc(co, d, written_docs)

    print("Done")
    print("Number of documents processed:", len(written_docs))
    print("Number of documents without corpusid:", nunavail)
    print("Number of documents where corpusid not resolved:", nmissed)


if __name__ == "__main__":
    main()
