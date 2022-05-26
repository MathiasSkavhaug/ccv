"""Takes claims, corpus and results of the predictions using longchecker and
outputs the files needed to run longchecker for stance detection between
evidence sentences for each claim.

example usage:
    python ccv/stance_evidence.py \
        --oclaims "./data/eclaims.jsonl" \
        --ocorpus "./data/ecorpus.jsonl" \
        --omap "./data/emap.json" \
        --claims "./data/predict_claims.jsonl" \
        --corpus "./data/predict_corpus.jsonl" \
        --predictions "./data/predict_result.jsonl"
"""


import argparse
import json
import pandas as pd
from tqdm import tqdm


def get_args() -> argparse.Namespace:
    """Returns the given arguments.

    Returns:
        argparse.Namespace: The arguments.
    """

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--oclaims", type=str, help="output claims file", required=True
    )
    parser.add_argument(
        "--ocorpus", type=str, help="output corpus file", required=True
    )
    parser.add_argument(
        "--omap", type=str, help="output claim map file", required=True
    )
    parser.add_argument("--claims", type=str, help="claims file", required=True)
    parser.add_argument("--corpus", type=str, help="corpus file", required=True)
    parser.add_argument(
        "--predictions", type=str, help="predictions file", required=True
    )

    return parser.parse_args()


def produce_files(args: argparse.Namespace) -> None:
    """Produces the files needed to predict the stances between the evidences.

    Args:
        args (argparse.Namespace): The provided arguments.
    """

    claims = pd.read_json(args.claims, lines=True).set_index("id")
    corpus = pd.read_json(args.corpus, lines=True).set_index("doc_id")
    predictions = pd.read_json(args.predictions, lines=True).set_index("id")

    claim_map = {}
    claim_count = 0
    with open(args.ocorpus, "w") as ecorpus, open(args.oclaims, "w") as eclaims:
        for claim_num, row in tqdm(
            predictions.iterrows(), total=predictions.shape[0]
        ):
            evidence_dict = row.iloc[0]
            if not evidence_dict:  # Did not find any evidence for claim.
                continue

            # Aggregate document information
            info = {}
            info["claim"] = claims.loc[claim_num][0]
            info["docs"] = []
            for doc_id, evidence in evidence_dict.items():
                doc = corpus.loc[int(doc_id)]

                d = {}
                d["id"] = doc_id
                d["label"] = evidence["label"]
                d["evidence"] = [
                    doc["abstract"][s] for s in evidence["sentences"]
                ]
                info["docs"].append(d)

            docs = info["docs"]

            # Produce all possible pairs of evidences, excluding pairs of
            # evidences from same document.
            for doc_num, d1 in enumerate(docs):
                # For every evidence in document
                for evidence_num, e1 in enumerate(d1["evidence"]):
                    # Write to "evidence corpus"
                    ecorpus.write(
                        json.dumps(
                            {
                                "doc_id": int(
                                    f"{claim_num+1}0{doc_num+1}0{evidence_num+1}"
                                ),
                                "title": None,
                                "abstract": [e1],
                            }
                        )
                        + "\n"
                    )

                    # For every document
                    for other_doc_num, d2 in enumerate(docs):
                        if (
                            other_doc_num == doc_num
                        ):  # No need to check a document's evidences against each other.
                            continue
                        # For every evidence in other document.
                        for other_evidence_num in range(len(d2["evidence"])):
                            # Write evidence pair
                            eclaims.write(
                                json.dumps(
                                    {
                                        "id": claim_count,
                                        "claim": e1,
                                        "doc_ids": [
                                            int(
                                                f"{claim_num+1}0{other_doc_num+1}0{other_evidence_num+1}"
                                            )
                                        ],
                                    }
                                )
                                + "\n"
                            )
                            claim_map[claim_count] = {
                                "claim_id": claim_num,
                                "fdoc_id": d1["id"],
                                "fdoc_e_num": evidence_num,
                                "sdoc_id": d2["id"],
                                "sdoc_e_num": other_evidence_num,
                            }
                            claim_count += 1
    with open(args.omap, "w") as emap:
        emap.write(json.dumps(claim_map))


def main():
    """Executes the script."""

    args = get_args()
    produce_files(args)


if __name__ == "__main__":
    main()
