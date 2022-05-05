"""Contains various methods related to producing a graph representation from
features extracted in feature_visualization.py"""


from ctypes import Union
from datetime import datetime
from typing import Dict, Any, List, Tuple, Union
from statistics import mean


BASE_SIZE = 0
BASE_WIDTH = 1


def get_doc_values(doc: Dict[str, Any]) -> List[float]:
    """Retrieves values for a document used to calculate an importance score.

    Args:
        doc (Dict[str, Any]): The given document.

    Returns:
        List[float]: Retrived values.
    """

    values = []
    values.append(doc["pinfo"]["citationCount"])
    values.append(doc["pinfo"]["influentialCitationCount"])
    values.append(mean(doc["ainfo"]["paperCounts"]))
    values.append(mean(doc["ainfo"]["citationCounts"]))
    values.append(mean(doc["ainfo"]["hIndices"]))

    date = doc.get("publish_time", None)
    values.append(
        None if not date else datetime.strptime(date, "%Y-%m-%d").timestamp()
    )

    return values


def scale_value(
    value: float, omin: float, omax: float, nmin: float = 0, nmax: float = 1
) -> float:
    """Takes a value and scales it from range [omin, omax] to [nmin, nmax]

    Args:
        value (float): Value to scale.
        omin (float): Old minimum.
        omax (float): Old maximum.
        nmin (float): New minimum. Default 0.
        nmax (float): New maximum. Default 1.

    Returns:
        float: Scaled value.
    """

    return nmin + (nmax - nmin) * (value - omin) / (omax - omin)


def scale_values(
    values: List[float], nmin: float = 0, nmax: float = 1,
) -> List[float]:
    """Takes a list of values and scales them from their original range
    to [nmin, nmax].

    Args:
        values (List[float]): Values to scale.
        nmin (float): New minimum. Default 0.
        nmax (float): New maximum. Default 1.

    Returns:
        List[float]: Scaled values.
    """

    omin = min([v for v in values if v is not None])
    omax = max([v for v in values if v is not None])
    return [
        0 if not v else scale_value(v, omin, omax, nmin, nmax) for v in values
    ]


def scale_dict_with_values(
    dv: Dict[any, List[Union[int, float]]]
) -> Dict[str, float]:
    """Scales each attribute then combines each key's scaled attributes into
    one value then scales all keys' values.

    Args:
        dv (Dict[Any, List[int, float]]): Dictionary containing lists
            of numbers to scale as values.

    Returns:
        Dict[str, float]: A dictionary where each key has it's scaled value.
    """

    # Scale attribute values
    scaled = [scale_values(attr_vals) for attr_vals in zip(*dv.values())]

    # Back to attributes for each document.
    values = dict(zip(dv.keys(), zip(*scaled)))

    # Simple average
    values = {k: mean(v) for k, v in values.items()}

    # Scale to node size
    scaled = scale_values(values.values(), nmin=0, nmax=1)

    # Back to attribute for each document.
    values = dict(zip(values.keys(), scaled))

    return values


def compute_document_scores(
    docs: Dict[str, Dict[str, Any]]
) -> Tuple[Dict[str, float], Dict[str, List[float]]]:
    """Computes the importance score for the given documents.

    Args:
        docs (List[Dict[str, Any]]): List of documents.

    Returns:
        Dict[str, float]: Dict with doc_id as key and importance score as
            value.
         Dict[str, List[float]]: The raw values for each document.
    """

    # Retrieve attribute values
    values_raw = {id: get_doc_values(doc) for id, doc in docs.items()}

    values = scale_dict_with_values(values_raw)

    return values, values_raw


def compute_author_scores(
    docs: Dict[str, Dict[str, Any]]
) -> Tuple[Dict[str, float], Dict[str, List[float]]]:
    """Computes the importance score for the given documents's authors.

    Args:
        docs (List[Dict[str, Any]]): List of documents.

    Returns:
        Dict[str, float]: Dict with author_id as key and importance score as
            value.
        Dict[str, List[float]]: The raw values for each author.
    """
    values_raw = {}
    for _, doc in docs.items():
        ainfo = doc["ainfo"]
        for i, aid in enumerate(ainfo["authors"].keys()):
            values_raw[aid] = [
                ainfo["paperCounts"][i],
                ainfo["citationCounts"][i],
                ainfo["hIndices"][i],
            ]

    values = scale_dict_with_values(values_raw)

    return values, values_raw


def create_graph(dinfo: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Creates a graph representation from the claim information dictionary.

    Args:
        dinfo (Dict[str, any]): Dictionary containing various claim related
            evidence.

    Returns:
        Dict[str, Dict[str, any]]: The graph as a dictionary.
    """

    lmap = {"SUPPORT": "true", "CONTRADICT": "false"}
    nodes, links = [], []

    doc_scores, doc_scores_raw = compute_document_scores(dinfo["docs"])
    author_scores, author_scores_raw = compute_author_scores(dinfo["docs"])

    # Add claim node
    nodes.append(
        {
            "id": "Claim",
            "type": "claim",
            "text": dinfo["claim"],
            "size": BASE_SIZE,
        }
    )
    for id, doc in dinfo["docs"].items():
        # Add document node
        nodes.append(
            {
                "id": id,
                "type": "document",
                "text": doc["title"],
                "size": doc_scores[id],
                "sizeRaw": doc_scores_raw[id],
                "date": doc["publish_time"],
                "authors": ", ".join(doc["ainfo"]["authors"].values()),
                "journal": doc["journal"],
            }
        )
        # Add claim-document link
        links.append(
            {
                "source": id,
                "target": "Claim",
                "label": lmap[doc["label"]],
                "width": doc["label_prob"],
            }
        )
        for i, e in enumerate(doc["evidence"]):
            # Add evidence node
            nodes.append(
                {
                    "id": f"{id}_{i}",
                    "type": "evidence",
                    "text": e["text"],
                    "size": BASE_SIZE,
                }
            )
            # Add document-evidence link
            links.append(
                {
                    "source": f"{id}_{i}",
                    "target": id,
                    "label": "evidence",
                    "width": e["prob"],
                }
            )

    for k, rlinks in dinfo["rlinks"].items():
        # Add document-document link
        for rlink in rlinks:
            links.append(
                {
                    "source": k,
                    "target": rlink["reference"],
                    "label": "reference",
                    "width": BASE_WIDTH,
                }
            )
    for elink in dinfo["elinks"]:
        # Add evidence-evidence link
        links.append(
            {
                "source": f"{elink['fdoc_id']}_{elink['fdoc_e_num']}",
                "target": f"{elink['sdoc_id']}_{elink['sdoc_e_num']}",
                "label": lmap[elink["label"]],
                "width": elink["label_prob"],
                "sentProb": elink["sent_prob"],
                "bidirectional": False,
            }
        )

    authors = {}
    amap = {}
    for id, doc in dinfo["docs"].items():
        for aid, aname in doc["ainfo"]["authors"].items():
            amap[aid] = aname
            if aid in authors:
                authors[aid].append(id)
            else:
                authors[aid] = [id]

    for aid, docs in authors.items():
        # create author node.
        nodes.append(
            {
                "id": aid,
                "type": "author",
                "text": amap[aid],
                "size": author_scores[aid],
                "sizeRaw": author_scores_raw[aid],
            }
        )
        for doc in docs:
            # create author-document link
            links.append(
                {
                    "target": aid,
                    "source": doc,
                    "label": "author",
                    "width": BASE_WIDTH,
                }
            )

    d = {}
    # Only keep links in one direction.
    for i, link in enumerate(links):
        target = link.get("source", None)
        source = link.get("target", None)
        if target is None or source is None:
            continue

        d[(target, source)] = link
        # Only continue if evidence-evidence link
        if "_" not in source or "_" not in target:
            continue

        ele1 = d.get((target, source), {}).get("label", None)
        ele2 = d.get((source, target), {}).get("label", None)

        if ele1 and ele2:
            # if labels do not agree, remove both
            if ele1[0] != ele2[0]:
                d.pop((target, source))
                d.pop((source, target))
            # merge them together
            else:
                link1 = d.pop((target, source))
                link2 = d.pop((source, target))
                links.append(
                    {
                        "target": link1["target"],
                        "source": link1["source"],
                        "label": link1["label"],
                        "width": (link1["width"] + link2["width"]) / 2,
                        "sentProb": (link1["sentProb"] + link2["sentProb"]) / 2,
                        "bidirectional": True,
                    }
                )

    links = list(d.values())

    graph = {"nodes": nodes, "links": links}

    return graph
