"""Takes claims, corpus and results of the predictions using longchecker and
outputs the files needed to run longchecker for stance detection between
evidence sentences for each claim.

example usage:
    python ccv/evidence_relations.py \
        --oclaims "./data/eclaims.jsonl" \
        --ocorpus "./data/ecorpus.jsonl" \
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
    parser.add_argument("--claims", type=str, help="claims file", required=True)
    parser.add_argument("--corpus", type=str, help="corpus file", required=True)
    parser.add_argument(
        "--predictions", type=str, help="predictions file", required=True
    )

    return parser.parse_args()


def main():
    """Executes the script."""

    args = get_args()

    claims = pd.read_json(args.claims, lines=True).set_index("id")
    corpus = pd.read_json(args.corpus, lines=True).set_index("doc_id")
    predictions = pd.read_json(args.predictions, lines=True).set_index("id")

    with open(args.ocorpus, "w") as ecorpus, open(args.oclaims, "w") as eclaims:
        for index, row in tqdm(
            predictions.iterrows(), total=predictions.shape[0]
        ):
            evidence_dict = row.iloc[0]
            if not evidence_dict:  # Did not find any evidence for claim.
                continue

            info = {}
            info["claim"] = claims.loc[index][0]
            info["docs"] = []
            for doc_id, evidence in evidence_dict.items():
                doc = corpus.loc[int(doc_id)]

                d = {}
                d["id"] = doc_id
                d["label"] = evidence["label"]
                d["evidence"] = [
                    doc["abstract"][s] for s in evidence["sentences"]
                ]
                try:
                    d["publish_time"] = doc["publish_time"].strftime("%Y-%m-%d")
                except ValueError:
                    d["publish_time"] = "0000-00-00"

                info["docs"].append(d)

            docs = sorted(info["docs"], key=lambda x: x["publish_time"])

            for i, d1 in enumerate(docs):
                for j, e1 in enumerate(d1["evidence"]):
                    ecorpus.write(
                        json.dumps(
                            {
                                "doc_id": int(f"{index+1}0{i+1}0{j+1}"),
                                "abstract": [e1],
                            }
                        )
                        + "\n"
                    )

                    for k, d2 in enumerate(docs[i + 1 :]):
                        for l in range(len(d2["evidence"])):
                            eclaims.write(
                                json.dumps(
                                    {
                                        "id": int(f"{index+1}0{i+1}0{j+1}"),
                                        "claim": e1,
                                        "doc_ids": [
                                            int(f"{index+1}0{i+1+k+1}0{l+1}")
                                        ],
                                    }
                                )
                                + "\n"
                            )


main()
