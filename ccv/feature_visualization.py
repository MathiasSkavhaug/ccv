"""Takes claims, corpus and results of the predictions using longchecker and
for each claim extracts additional information for each evidence document but
also for the various relationsships between them.

example usage:
    python ccv/feature_visualization.py \
        --output "./data/graphs.jsonl" \
        --claims "./data/predict_claims.jsonl" \
        --corpus "./data/predict_corpus.jsonl" \
        --predictions "./data/predict_result.jsonl" \
        --erelations "./data/erelations.jsonl" \
        --emap "./data/emap.json"
"""


"""
get_features() saved dict structure:
    "claim": str,
    "docs": {
        corpusid: {
            "label": str,
            "evidence": [str],
            "aliases": [int],
            "pinfo": {
                "citationCount": int,
                "influentialCitationCount": int
            },
            "ainfo": {
                "authors": [str],
                "numAuthors": int,
                "maxPaperCount": int,
                "medianPaperCount": int,
                "maxCitationCount": int,
                "medianCitationCount": int,
                "maxHIndex": int,
                "medianHIndex": int
            },
            "rinfo": {
                corpusid: {
                    "isInfluential": bool,
                    "intents": [str],
                    "contexts": [str]
                }
                }
            },
            "publish_time": str,
            "journal": str
        }
    "alinks": {
        "doc": corpusid,
        "common": list[str]
    },
    "rlinks": {
        corpusid: [
            {
                "reference": corpusid,
                "isInfluential": bool,
                "intent": [str]
            }
        ]
    }
    "elinks": {
        id: {
            claim_id: int, 
            'fdoc_id': corpusid, 
            'fdoc_e_num': int, 
            'sdoc_id': corpusid, 
            'sdoc_e_num': int,
        },
    }
"""


import argparse
import json
import pandas as pd
import statistics
from tqdm import tqdm
from typing import Dict, Any
from utility import get_request


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
    parser.add_argument(
        "--erelations", type=str, help="evidence relations file"
    )
    parser.add_argument("--emap", type=str, help="evidence map file")

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


def get_evi_links(
    evidence_relations: pd.DataFrame, emap: Dict[str, Any]
) -> Dict[str, Any]:
    """Loads the evidence stances from the given datastructures.

    Args:
        evidence_relations (pd.DataFrame): Result from longchecker
            ran on the output from stance_evidence.py
        emap (Dict[str, Any]): Mapping claim ids from output o
            stance_evidence.py to various information.

    Returns:
        Dict[str, Any]: Dict containing the evidence stances for each claim.
    """

    evi_links = {}
    for _, er in evidence_relations.iterrows():
        evidence = er["evidence"]
        if not evidence:
            continue
        label = evidence[list(evidence.keys())[0]]["label"]
        d = emap[str(er["id"])]
        d["label"] = label
        id = d.pop("claim_id")
        if id not in evi_links:
            evi_links[id] = []
        evi_links[id].append(d)
    return evi_links


def create_graph(dinfo: Dict[str, any]) -> Dict[str, Dict[str, any]]:
    """Creates a graph representation from the claim information dictionary.

    Args:
        dinfo (Dict[str, any]): Dictionary containing various claim related
            evidence.

    Returns:
        Dict[str, Dict[str, any]]: The graph as a dictionary.
    """

    lmap = {"SUPPORT": 1, "CONTRADICT": 0}
    nodes, links = [], []

    # Add claim node
    nodes.append(
        {"id": "Claim", "group": 0, "text": dinfo["claim"],}
    )
    for id, doc in dinfo["docs"].items():
        # Add document node
        nodes.append(
            {"id": id, "group": 1,}
        )
        # Add claim-document link
        links.append(
            {
                "source": id,
                "target": "Claim",
                "value": 1,
                "label": lmap[doc["label"]],
            }
        )
        for i, e in enumerate(doc["evidence"]):
            # Add evidence node
            nodes.append(
                {"id": f"{id}_{i}", "group": 3,}
            )
            # Add document-evidence link
            links.append(
                {
                    "source": f"{id}_{i}",
                    "target": id,
                    "value": 1,
                    "label": lmap[doc["label"]],
                }
            )
    for k, rlinks in dinfo["rlinks"].items():
        # Add document-document link
        for rlink in rlinks:
            links.append(
                {
                    "source": k,
                    "target": rlink["reference"],
                    "value": 1,
                    "label": 2,
                }
            )
    for elink in dinfo["elinks"]:
        # Add evidence-evidence link
        links.append(
            {
                "source": f"{elink['fdoc_id']}_{elink['fdoc_e_num']}",
                "target": f"{elink['sdoc_id']}_{elink['sdoc_e_num']}",
                "label": lmap[elink["label"]],
            }
        )

    d = {}
    # Only keep links in one direction.
    for i, link in enumerate(links):
        target = link["source"]
        source = link["target"]
        label = link["label"]

        # Only continue if evidence-evidence link
        if "_" not in target:
            d[(target, source)] = str(label)
            continue

        d[(target, source)] = str(label)

        ele1 = d.get((target, source), {})
        ele2 = d.get((source, target), {})

        if ele1 and ele2:
            # if labels do not agree, remove both
            if ele1 != ele2:
                d.pop((target, source))
                d.pop((source, target))
            # keep first one
            else:
                d.pop((target, source))

    links = [{"source": s, "target": t, "label": l} for (s, t), l in d.items()]

    graph = {"nodes": nodes, "links": links}

    return graph


def get_features(args: argparse.Namespace) -> None:
    """Extracts features used for visualization.

    Args:
        args (argparse.Namespace): The provided arguments.
    """

    claims = pd.read_json(args.claims, lines=True).set_index("id")
    corpus = pd.read_json(args.corpus, lines=True).set_index("doc_id")
    predictions = pd.read_json(args.predictions, lines=True).set_index("id")

    if args.erelations and args.emap:
        evidence_relations = pd.read_json(args.erelations, lines=True)
        with open(args.emap, "r", encoding="utf-8") as f:
            emap = json.load(f)

    author_map = {}
    evi_links = get_evi_links(evidence_relations, emap)

    with open(args.output, "w", encoding="utf-8") as f:
        for index, row in tqdm(
            predictions.iterrows(), total=predictions.shape[0]
        ):
            evidence_dict = row.iloc[0]
            if not evidence_dict:  # Did not find any evidence for claim.
                continue

            info = {}
            info["claim"] = claims.loc[index][0]
            info["claim_id"] = index
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
            if args.erelations and args.emap:
                info["elinks"] = evi_links.get(info["claim_id"], {})

            graph = create_graph(info)
            f.write(json.dumps(graph) + "\n")


def main():
    """Executes the script."""

    args = get_args()
    get_features(args)


if __name__ == "__main__":
    main()
