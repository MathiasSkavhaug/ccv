"""Calculates metrics based upon majority vote claim-evidence pair aggregation.

    example usage:
        python ccv/agg_sm.py --gt "data/covidfact.jsonl" \
            --p "data/predict_result.jsonl" \
            --gt_lab_t "SUPPORTED" \
            --gt_lab_f "REFUTED" \
            --gt_col "label"
"""

import argparse
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix


def get_args() -> argparse.Namespace:
    """Returns the given arguments.

    Returns:
        argparse.Namespace: The arguments.
    """

    parser = argparse.ArgumentParser()
    parser.add_argument("--gt", type=str, help="ground truth file path")
    parser.add_argument("--p", type=str, help="prediction file path")
    parser.add_argument(
        "--gt_col", type=str, help="ground truth file label column"
    )
    parser.add_argument(
        "--gt_lab_t", type=str, help="ground truth file true label value"
    )
    parser.add_argument(
        "--gt_lab_f", type=str, help="ground truth file false label value"
    )

    return parser.parse_args()


def main() -> None:
    """Executes the script."""

    args = get_args()

    claims = pd.read_json(args.gt, lines=True)
    predictions = pd.read_json(args.p, lines=True).set_index("id")

    pmap = {"SUPPORT": 1, "CONTRADICT": 0}
    tmap = {args.gt_lab_t: 1, args.gt_lab_f: 0}
    plabels, tlabels = [], []
    for index, row in predictions.iterrows():
        if not row.iloc[0]:
            continue
        labels = [pmap[v["label"]] for x in row for v in x.values()]
        plabels.append(1 if sum(labels) / len(labels) >= 0.5 else 0)
        tlabels.append(tmap[claims[args.gt_col].iloc[index]])

    print(confusion_matrix(tlabels, plabels))
    print(f"Accuracy: {accuracy_score(tlabels, plabels)}")
    print(f"F1:       {f1_score(tlabels, plabels)}")


if __name__ == "__main__":
    main()
