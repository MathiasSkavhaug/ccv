"""Takes claims, corpus and results of the predictions using longchecker and
for each claim extracts additional information for each evidence document but
also for the various relationsships between them.

example usage:
    python ccv/network_features.py \
        --output "./data/evidence_summary.json" \
        --claims "./data/predict_claims.jsonl" \
        --corpus "./data/predict_corpus.jsonl" \
        --predictions "./data/predict_result.jsonl"
"""


import argparse
import json
import pandas as pd
import statistics
from tqdm import tqdm
from typing import Dict
from util import get_request


def get_args() -> argparse.Namespace:
    """Returns the given arguments.

    Returns:
        argparse.Namespace: The arguments.
    """

    parser = argparse.ArgumentParser()

    parser.add_argument("--output", type=str, help="output file", required=True)
    parser.add_argument("--claims", type=str, help="claims file", required=True)
    parser.add_argument("--corpus", type=str, help="corpus file", required=True)
    parser.add_argument(
        "--predictions", type=str, help="predictions file", required=True
    )

    return parser.parse_args()


def process_paper(corpusid: str) -> Dict[str, any]:
    """Retrieves various information related to the document associated with
    the given corpusid.

    Args:
        corpusid (str): The corpusid of a document.

    Returns:
        Dict[str, any]: Dict containing various information about the document.
    """

    fields = ",".join(["citationCount", "influentialCitationCount"])
    url = f"https://api.semanticscholar.org/graph/v1/paper/corpusid:{corpusid}?fields={fields}"
    res = get_request(url)
    res.pop("paperId")
    return res


def process_authors(
    corpusid: str, author_map: Dict[str, str]
) -> Dict[str, any]:
    """Retrieves various information related to the authors of the paper
    associated with the given corpusid. Also updates the author id to author
    name mapping.

    Args:
        corpusid (str): The corpusid of a document.
        author_map (Dict[str,str]): A mapping between author ids and names.

    Returns:
        Dict[str, any]: Dict containing various author related information.
    """

    def get_max_and_median(d, k):
        new = {}
        d[k] = [c if c else 0 for c in d[k]]  # some values might be None.
        new[f"max{k[:1].upper()+k[1:]}"] = max(d[k])
        new[f"median{k[:1].upper()+k[1:]}"] = statistics.median(d[k])
        return new

    fields = ",".join(
        [
            "authors.name",
            "authors.paperCount",
            "authors.citationCount",
            "authors.hIndex",
        ]
    )
    url = f"https://api.semanticscholar.org/graph/v1/paper/corpusid:{corpusid}?fields={fields}"
    res = get_request(url)
    authors = res["authors"]

    d = dict(zip(authors[0].keys(), zip(*[a.values() for a in authors])))
    d = {k: list(v) for k, v in d.items()}

    result = {}
    author_map.update(dict(zip(d["authorId"], d["name"])))
    result["authors"] = d["authorId"]
    result["numAuthors"] = len(d["authorId"])
    result.update(get_max_and_median(d, "paperCount"))
    result.update(get_max_and_median(d, "citationCount"))
    result.update(get_max_and_median(d, "hIndex"))
    return result


def process_references(corpusid: str) -> Dict[str, any]:
    """Retrieves various information related to the references of the paper
    associated with the given corpusid.

    Args:
        corpusid (str): The corpusid of a document.

    Returns:
        Dict[str, any]: Dict containing various reference related information.
    """

    fields = ",".join(["externalIds", "contexts", "intents", "isInfluential"])
    url = f"https://api.semanticscholar.org/graph/v1/paper/corpusid:{corpusid}/references?fields={fields}&limit=1000"
    res = get_request(url)

    d = res["data"]

    d = {
        str(r["citedPaper"]["externalIds"]["CorpusId"]): r
        for r in d
        if r["citedPaper"]["externalIds"] is not None
    }
    for v in d.values():
        v.pop("citedPaper")
    return d


def get_ref_links(dinfo: Dict[str, any]) -> Dict[str, any]:
    """Looks for reference links between documents identified as evidence to a
    claim.

    Args:
        dinfo (Dict[str, any]): Dictionary containing various claim related
            evidence.

    Returns:
        Dict[str, any]: Dictionary where the key is the referencing document
            and the value is a dictionary containing information about that
            reference.
    """

    d = {}
    docs = list(dinfo.keys())
    for d1 in docs:
        for d2 in docs:
            references = dinfo[d1]["rinfo"].keys()
            ids = dinfo[d2]["aliases"].copy()
            ids.append(d2)
            for id in ids:
                if id in references:
                    if not d.get(d1, None):
                        d[d1] = []
                    d[d1].append(
                        {
                            "reference": d2,
                            "isInfluential": dinfo[d1]["rinfo"][d2][
                                "isInfluential"
                            ],
                            "intent": dinfo[d1]["rinfo"][d2]["intents"],
                        }
                    )
                    break
    return d


def get_aut_links(dinfo: Dict[str, any]) -> Dict[str, any]:
    """Looks for common authors between documents identified as evidence to a claim.

    Args:
        dinfo (Dict[str, any]): Dictionary containing various claim related
            evidence.

    Returns:
        Dict[str, any]: Dictionary containing information about which documents
            have common authors.
    """

    d = {}
    docs = list(dinfo.keys())
    for i in range(len(docs)):
        for j in range(i + 1, len(docs)):
            d1, d2 = docs[i], docs[j]
            a1 = set(dinfo[d1]["ainfo"]["authors"])
            a2 = set(dinfo[d2]["ainfo"]["authors"])
            common = a1.intersection(a2)
            if common:
                d[d1] = {"doc": d2, "common": list(common)}
    return d


def main():
    """Executes the script."""

    args = get_args()

    claims = pd.read_json(args.claims, lines=True).set_index("id")
    corpus = pd.read_json(args.corpus, lines=True).set_index("doc_id")
    predictions = pd.read_json(args.predictions, lines=True).set_index("id")

    author_map = {}

    with open(args.output, "w", encoding="utf-8") as f:
        for index, row in tqdm(
            predictions.iterrows(), total=predictions.shape[0]
        ):
            evidence_dict = row.iloc[0]
            if not evidence_dict:  # Did not find any evidence for claim.
                continue

            info = {}
            info["claim"] = claims.loc[index][0]
            info["docs"] = {}
            for doc_id, evidence in evidence_dict.items():
                doc = corpus.loc[int(doc_id)]

                d = {}
                d["label"] = evidence["label"]
                d["evidence"] = [
                    doc["abstract"][s] for s in evidence["sentences"]
                ]
                d["aliases"] = doc["aliases"]
                d["pinfo"] = process_paper(doc_id)
                d["ainfo"] = process_authors(doc_id, author_map)
                d["rinfo"] = process_references(doc_id)
                try:
                    d["publish_time"] = doc["publish_time"].strftime("%Y-%m-%d")
                except ValueError:
                    d["publish_time"] = "0000-00-00"
                d["journal"] = doc["journal"]

                info["docs"][doc_id] = d
            info["alinks"] = get_aut_links(info["docs"])
            info["rlinks"] = get_ref_links(info["docs"])

            f.write(json.dumps(info, indent=4) + "\n")


if __name__ == "__main__":
    main()
