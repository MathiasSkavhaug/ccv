"""Contains various methods related to producing a graph representation from
features extracted in feature_visualization.py"""


from typing import Dict, Any, List
from statistics import mean


BASE_SIZE = 5
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

    return values


def scale(
    val: float, omin: float, omax: float, nmin: float, nmax: float
) -> float:
    """Takes a value and scales it from range [omin, omax] to [nmin, nmax]

    Args:
        val (float): Value to scale.
        omin (float): Old minimum.
        omax (float): Old maximum.
        nmin (float): New minimum.
        nmax (float): Old maximum.

    Returns:
        float: Scaled value.
    """

    return nmin + (nmax - nmin) * (val - omin) / (omax - omin)


def compute_importance_scores(
    docs: Dict[str, Dict[str, Any]]
) -> Dict[str, float]:
    """Computes the importance score for the given documents.

    Args:
        docs (List[Dict[str, Any]]): List of documents.

    Returns:
        Dict[str, float]: Dict with doc_id as key and importance score as
            value.
    """

    values = {id: set(get_doc_values(doc)) for id, doc in docs.items()}

    # todo: scale each attr.

    # todo: combine attrs with weighted average.

    # todo: scale weighted average to node size

    return None


def create_graph(dinfo: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Creates a graph representation from the claim information dictionary.

    Args:
        dinfo (Dict[str, any]): Dictionary containing various claim related
            evidence.

    Returns:
        Dict[str, Dict[str, any]]: The graph as a dictionary.
    """

    lmap = {"SUPPORT": 1, "CONTRADICT": 0}
    nodes, links = [], []

    doc_scores = compute_importance_scores(dinfo["docs"])

    # Add claim node
    nodes.append(
        {"id": "Claim", "type": 0, "text": dinfo["claim"], "size": BASE_SIZE}
    )
    for id, doc in dinfo["docs"].items():
        # Add document node
        nodes.append(
            {"id": id, "type": 1, "text": doc["title"], "size": doc_scores[id]}
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
                    "type": 2,
                    "text": e["text"],
                    "size": BASE_SIZE,
                }
            )
            # Add document-evidence link
            links.append(
                {
                    "source": f"{id}_{i}",
                    "target": id,
                    "label": lmap[doc["label"]],
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
                    "label": 2,
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
            {"id": aid, "type": 3, "text": amap[aid], "size": BASE_SIZE}
        )
        for doc in docs:
            # create author-document link
            links.append(
                {"target": aid, "source": doc, "label": 3, "width": BASE_WIDTH}
            )

    d = {}
    # Only keep links in one direction.
    for i, link in enumerate(links):
        target = link["source"]
        source = link["target"]
        label = link["label"]
        width = link["width"]

        d[(target, source)] = (str(label), width)

        # Only continue if evidence-evidence link
        if "_" not in target:
            continue

        ele1 = d.get((target, source), None)
        ele2 = d.get((source, target), None)

        if ele1 and ele2:
            # if labels do not agree, remove both
            if ele1[0] != ele2[0]:
                d.pop((target, source))
                d.pop((source, target))
            # keep first one
            else:
                d.pop((target, source))

    links = [
        {"source": s, "target": t, "label": l, "width": w}
        for (s, t), (l, w) in d.items()
    ]

    graph = {"nodes": nodes, "links": links}

    return graph
