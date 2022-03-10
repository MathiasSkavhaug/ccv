"""Takes a claim as input and retrieves evidences for that claim together
with other information related to it.

Example usage:
    python ccv/run_query.py \
        --claim "SARS-CoV-2 binds ACE2 receptor to gain entry into cells" \
        --exe_id "a8f5f167f44f4964e6c998dee827110c"
"""


import argparse
from retrieval import retrieval
from stance_evidence import produce_files
from feature_visualization import get_features
import json
import sys

sys.path.append("longchecker/")
sys.path.append("longchecker/longchecker/")
from longchecker.predict import format_predictions, get_predictions
from longchecker.util import write_jsonl


def get_args() -> argparse.Namespace:
    """Returns the given arguments.

    Returns:
        argparse.Namespace: The arguments.
    """

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--claim", type=str, help="claim to use for searching.", required=True
    )
    parser.add_argument(
        "--exe_id", type=str, help="unique execution id.", required=True
    )
    return parser.parse_args()


def run_retrieval(claim: str, exe_id: str) -> None:
    """Runs retrieval on the provided claim.

    Args:
        claim (str): The claim.
        exe_id (str): The execution id.
    """

    input = f"./data/{exe_id}_claim.jsonl"
    with open(input, "w", encoding="utf-8") as f:
        f.write(json.dumps({"claim": claim}))

    args = argparse.Namespace()
    args.index = "anserini/indexes/lucene-index-cord19-abstract-2022-02-07"
    args.nkeep = 20
    args.ninit = 100
    args.input = input
    args.claim_col = "claim"
    args.output_claims = f"data/{exe_id}_ds_claims.jsonl"
    args.output_corpus = f"data/{exe_id}_ds_corpus.jsonl"
    args.rerank = True
    args.device = "cuda:0"
    args.batch_size = 100

    retrieval(args)


def stance_document(exe_id: str) -> None:
    """Runs stance prediction for each retrieved evidence for the
    current execution instance.

    Args:
        exe_id (str): The execution id.
    """

    args = argparse.Namespace()
    args.checkpoint_path = "longchecker/checkpoints/scifact.ckpt"
    args.input_file = f"data/{exe_id}_ds_claims.jsonl"
    args.corpus_file = f"data/{exe_id}_ds_corpus.jsonl"
    args.output_file = f"data/{exe_id}_ds_result.jsonl"
    args.batch_size = 1
    args.device = 0
    args.num_workers = 4
    args.no_nei = False
    args.force_rationale = False
    args.debug = False

    predictions = get_predictions(args)
    data = format_predictions(args, predictions)

    write_jsonl(data, args.output_file)


def stance_evidence(exe_id: str) -> None:
    """Produces the files needed to predict the stances between the evidences.

    Args:
        exe_id (str): The execution id.
    """

    output_claims = f"data/{exe_id}_es_claims.jsonl"
    output_corpus = f"data/{exe_id}_es_corpus.jsonl"

    args = argparse.Namespace()
    args.oclaims = output_claims
    args.ocorpus = output_corpus
    args.omap = f"data/{exe_id}_es_map.json"
    args.claims = f"data/{exe_id}_ds_claims.jsonl"
    args.corpus = f"data/{exe_id}_ds_corpus.jsonl"
    args.predictions = f"data/{exe_id}_ds_result.jsonl"

    produce_files(args)

    args = argparse.Namespace()
    args.checkpoint_path = "longchecker/checkpoints/scifact.ckpt"
    args.input_file = output_claims
    args.corpus_file = output_corpus
    args.output_file = f"data/{exe_id}_es_result.jsonl"
    args.batch_size = 1
    args.device = 0
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
    args.output = f"data/{exe_id}_final_output.jsonl"
    args.claims = f"data/{exe_id}_ds_claims.jsonl"
    args.corpus = f"data/{exe_id}_ds_corpus.jsonl"
    args.predictions = f"data/{exe_id}_ds_result.jsonl"
    args.erelations = f"data/{exe_id}_es_result.jsonl"
    args.emap = f"data/{exe_id}_es_map.json"

    get_features(args)


def run_query(claim: str, exe_id: str) -> None:
    """Runs the pipeline on the provided claim.

    Args:
        claim (str): The claim.
        exe_id (str): The execution id.
    """
    run_retrieval(claim, exe_id)
    stance_document(exe_id)
    stance_evidence(exe_id)
    feature_visualization(exe_id)


def main() -> None:
    """Executes the script."""

    args = get_args()
    run_query(args.claim, args.exe_id)


if __name__ == "__main__":
    main()
