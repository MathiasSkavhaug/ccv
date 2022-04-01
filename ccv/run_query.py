"""Takes a claim as input and retrieves evidences for that claim together
with other information related to it.

Example usage:
    python ccv/run_query.py \
        --claim "SARS-CoV-2 binds ACE2 receptor to gain entry into cells" \
        --exe_id "a8f5f167f44f4964e6c998dee827110c"
"""


import argparse
import hashlib
import json
import os
import sys

from feature_visualization import get_features
from retrieval import retrieval
from stance_evidence import produce_files

sys.path.append("longchecker/")
sys.path.append("longchecker/longchecker/")
from longchecker.predict import get_predictions
from longchecker.util import load_jsonl, write_jsonl


def get_args() -> argparse.Namespace:
    """Returns the given arguments.

    Returns:
        argparse.Namespace: The arguments.
    """

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--claim",
        type=str,
        help="claim to use for searching, can also be a file of claims.",
        required=True,
    )
    parser.add_argument("--exe_id", type=str, help="unique execution id.")
    parser.add_argument(
        "--device",
        type=str,
        help="device to run the models on.",
        default="cuda:0",
    )
    args = parser.parse_args()

    if not args.exe_id:
        args.exe_id = hashlib.md5(args.claim.encode()).hexdigest()

    return args


def run_retrieval(claim: str, exe_id: str, device: str) -> None:
    """Runs retrieval on the provided claim.

    Args:
        claim (str): The claim, or path to claim file.
        exe_id (str): The execution id.
        device (str): The device to run the model on.
    """

    input = f"./data/{exe_id}/claim.jsonl"
    with open(input, "w") as f:
        # Is file of claims.
        if os.path.exists(claim):
            with open(claim, "r") as c:
                for line in c:
                    f.write(json.dumps({"claim": line.strip()}) + "\n")
        else:
            f.write(json.dumps({"claim": claim}))

    args = argparse.Namespace()
    args.index = "anserini/indexes/lucene-index-cord19-abstract-2022-02-07"
    args.nkeep = 20
    args.ninit = 100
    args.input = input
    args.claim_col = "claim"
    args.output_claims = f"data/{exe_id}/ds_claims.jsonl"
    args.output_corpus = f"data/{exe_id}/ds_corpus.jsonl"
    args.rerank = True
    args.device = device
    args.batch_size = 100

    retrieval(args)


# modified version of format_predictions from longchecker/predict.py
def format_predictions(args, predictions_all):
    claims = load_jsonl(args.input_file)
    claim_ids = [x["id"] for x in claims]
    assert len(claim_ids) == len(set(claim_ids))

    formatted = {claim: {} for claim in claim_ids}

    # Dict keyed by claim.
    for prediction in predictions_all:
        # If it's NEI, skip it.
        if prediction["predicted_label"] == "NEI":
            continue

        # Add prediction.
        formatted_entry = {
            prediction["abstract_id"]: {
                "label": prediction["predicted_label"],
                "label_probs": prediction["label_probs"],
                "sentences": prediction["predicted_rationale"],
                "sentences_probs": prediction["rationale_probs"],
            }
        }
        formatted[prediction["claim_id"]].update(formatted_entry)

    # Convert to jsonl.
    res = []
    for k, v in formatted.items():
        to_append = {"id": k, "evidence": v}
        res.append(to_append)

    return res


def stance_document(exe_id: str, device: str) -> None:
    """Runs stance prediction for each retrieved evidence for the
    current execution instance.

    Args:
        exe_id (str): The execution id.
        device (str): The device to run the model on.
    """

    args = argparse.Namespace()
    args.checkpoint_path = "longchecker/checkpoints/covidfact.ckpt"
    args.input_file = f"data/{exe_id}/ds_claims.jsonl"
    args.corpus_file = f"data/{exe_id}/ds_corpus.jsonl"
    args.output_file = f"data/{exe_id}/ds_result.jsonl"
    args.batch_size = 1
    args.device = device
    args.num_workers = 4
    args.no_nei = False
    args.force_rationale = False
    args.debug = False

    predictions = get_predictions(args)
    data = format_predictions(args, predictions)

    write_jsonl(data, args.output_file)


def stance_evidence(exe_id: str, device: str) -> None:
    """Produces the files needed to predict the stances between the evidences.

    Args:
        exe_id (str): The execution id.
        device (str): The device to run the model on.
    """

    output_claims = f"data/{exe_id}/es_claims.jsonl"
    output_corpus = f"data/{exe_id}/es_corpus.jsonl"

    args = argparse.Namespace()
    args.oclaims = output_claims
    args.ocorpus = output_corpus
    args.omap = f"data/{exe_id}/es_map.json"
    args.claims = f"data/{exe_id}/ds_claims.jsonl"
    args.corpus = f"data/{exe_id}/ds_corpus.jsonl"
    args.predictions = f"data/{exe_id}/ds_result.jsonl"

    produce_files(args)

    args = argparse.Namespace()
    args.checkpoint_path = "longchecker/checkpoints/covidfact.ckpt"
    args.input_file = output_claims
    args.corpus_file = output_corpus
    args.output_file = f"data/{exe_id}/es_result.jsonl"
    args.batch_size = 1
    args.device = device
    args.num_workers = 4
    args.no_nei = False
    args.force_rationale = False
    args.debug = False

    predictions = get_predictions(args)
    data = format_predictions(args, predictions)

    write_jsonl(data, args.output_file)


def feature_visualization(exe_id: str) -> None:
    """Extracts features used for visualization.

    Args:
        exe_id (str): The execution id.
    """

    args = argparse.Namespace()
    args.output = f"data/{exe_id}/final_output.jsonl"
    args.claims = f"data/{exe_id}/ds_claims.jsonl"
    args.corpus = f"data/{exe_id}/ds_corpus.jsonl"
    args.predictions = f"data/{exe_id}/ds_result.jsonl"
    args.erelations = f"data/{exe_id}/es_result.jsonl"
    args.emap = f"data/{exe_id}/es_map.json"

    get_features(args)


def run_query(claim: str, exe_id: str, device: str) -> None:
    """Runs the pipeline on the provided claim.

    Args:
        claim (str): The claim.
        exe_id (str): The execution id.
        device (str): The device to run the model on.
    """

    os.makedirs(f"data/{exe_id}", exist_ok=True)
    run_retrieval(claim, exe_id, device)
    stance_document(exe_id, device)
    stance_evidence(exe_id, device)
    feature_visualization(exe_id)


def main() -> None:
    """Executes the script."""

    args = get_args()
    run_query(args.claim, args.exe_id, args.device)


if __name__ == "__main__":
    main()
