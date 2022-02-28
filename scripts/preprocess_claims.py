"""Takes a .jsonl file containing claims and outputs two files required for
prediction using longchecker.

example usage:
    python scripts/preprocess_claims.py \
        --index "./anserini/indexes/lucene-index-cord19-abstract-2022-02-07" \
        --k 20 \
        --input "./data/covidfact.jsonl" \
        --claim_col "claim" \
        --output_claims "./data/predict_claims.jsonl" \
        --output_corpus "./data/predict_corpus.jsonl"
"""


import argparse
import json
import nltk
import pandas as pd
from pathlib import Path
from typing import Any, List, TextIO, Dict
from pyserini.search import SimpleSearcher


def get_args() -> argparse.Namespace:
    """Returns the given arguments.

    Returns:
        argparse.Namespace: The arguments.
    """

    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=str, help="index file path")
    parser.add_argument(
        "--k", type=int, help="number of documenst to return per claim"
    )
    parser.add_argument(
        "--input", type=str, help="input file containing claims"
    )
    parser.add_argument(
        "--claim_col", type=str, help="name of claim column in dataset"
    )
    parser.add_argument(
        "--output_claims", type=str, help="claim output file path"
    )
    parser.add_argument(
        "--output_corpus", type=str, help="corpus output file path"
    )
    parser.add_argument(
        "--delimiter", type=str, help="if not json, which delimiter"
    )

    return parser.parse_args()


def extract_nested_value(d: Dict, key: Any) -> Any:
    """Returns the value of the first occurrence of the given key in the given
        dictionary.

    Args:
        d (Dict): Dictionary to search through.
        key (Any): Key to search for.

    Returns:
        Any: The value from the first occurene of the given key in the given
        dictionary.
    """
    value = None
    for k, v in d.items():
        if k == key:
            value = v
        elif type(v) is dict:
            value = extract_nested_value(v, key)
        if value:
            return value
    return value


def get_sentences(
    hit: Dict[str, any], tokenizer: nltk.tokenize.punkt.PunktSentenceTokenizer
) -> List[str]:
    """Retrieves sentences from a hit's abstract.

    Args:
        hit (Dict[str, any]): The hit to retrieve abstract sentences from.
        tokenizer (nltk.tokenize.punkt.PunktSentenceTokenizer): 
            Splits text into sentences.

    Returns:
        List[str]: The sentences from a hit's abstract.
    """

    abstract = extract_nested_value(json.loads(hit.raw), "abstract")
    if type(abstract) is list:
        abstract = " ".join([x["text"] for x in abstract])
    return tokenizer.tokenize(abstract)


def process_hits(
    hits: Dict[str, any], tokenizer: nltk.tokenize.punkt.PunktSentenceTokenizer
) -> List[Dict[str, any]]:
    """Processes the hits from a query.

    Args:
        hits (Dict[str, any]): The hits from a query.
        tokenizer (nltk.tokenize.punkt.PunktSentenceTokenizer): 
            Splits text into sentences.

    Returns:
        List[Dict[str, any]]: List of documents.
    """

    doc_dict = {
        extract_nested_value(json.loads(h.raw), "s2_id"): h for h in hits
    }  # remove duplicates
    docs = []
    for k, v in doc_dict.items():
        if k == "":
            continue
        doc = {
            "doc_id": int(k),
            "title": extract_nested_value(json.loads(v.raw), "title"),
            "abstract": get_sentences(v, tokenizer),
        }
        if len(doc["abstract"]):
            docs.append(doc)
    return docs


def write_claim(
    file: TextIO, claim_id: int, claim: str, docs: List[Dict[str, any]]
) -> None:
    """Writes the given claim to the given file.

    Args:
        file (TextIO): File to write to.
        claim_id (int): Id of given claim.
        claim (str): The claim to write to file.
        docs (List[Dict[str, any]]): The documents retrieved for the given
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
    file: TextIO, doc: Dict[str, any], written_docs: List[int]
) -> None:
    """Writes the given document representation to the given file.

    Args:
        file (TextIO): File to write to.
        doc (Dict[str, any]): Document to write to file.
        written_docs (List[int]): Document already written to file.
    """

    if doc["doc_id"] not in written_docs:
        file.write(json.dumps(doc) + "\n")
        written_docs.append(doc["doc_id"])


def main() -> None:
    """Executes the script.
    """

    args = get_args()
    nltk.download("punkt")
    tokenizer = nltk.data.load("tokenizers/punkt/english.pickle")
    searcher = SimpleSearcher(args.index)
    file_type = args.input.split(".")[-1]
    if file_type == "jsonl":
        claims = pd.read_json(Path(args.input), lines=True)
    elif file_type == "json":
        claims = pd.read_json(Path(args.input))
    else:
        claims = pd.read_csv(Path(args.input), delimiter=args.delimiter)
    written_docs = []
    with open(Path(args.output_claims), "w") as cl, open(
        Path(args.output_corpus), "w"
    ) as co:
        for index, row in claims.iterrows():
            claim = row[args.claim_col]
            hits = searcher.search(claim, args.k)
            docs = process_hits(hits, tokenizer)
            write_claim(cl, index, claim, docs)
            for d in docs:
                write_doc(co, d, written_docs)


if __name__ == "__main__":
    main()
