"""Contains various methods related to producing a graph representation from
features extracted in feature_visualization.py"""


from typing import Dict, Any


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

    # Add claim node
    nodes.append(
        {"id": "Claim", "type": 0, "text": dinfo["claim"],}
    )
    for id, doc in dinfo["docs"].items():
        # Add document node
        nodes.append(
            {"id": id, "type": 1, "text": doc["title"],}
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
                {"id": f"{id}_{i}", "type": 2, "text": e["text"]}
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
                    "width": 1,
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

    d = {}
    # Only keep links in one direction.
    for i, link in enumerate(links):
        target = link["source"]
        source = link["target"]
        label = link["label"]
        width = link["width"]

        # Only continue if evidence-evidence link
        if "_" not in target:
            d[(target, source)] = (str(label), width)
            continue

        d[(target, source)] = (str(label), width)

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

    links = [{"source": s, "target": t, "label": l, "width": w} for (s, t), (l, w) in d.items()]

    graph = {"nodes": nodes, "links": links}

    return graph
