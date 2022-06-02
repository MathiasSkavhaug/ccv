"""Contains code for reproducing the stance detection pre and post training results for claims 0 and 15.

    Usage:
        python rationale_stance_eval.py "../data/8e07ef5c41d7c1805593048efd379e19/"
"""

import pandas as pd
import sys


def get_claims(data_path: str) -> pd.DataFrame:
    """retrieves all rationale-rationale combinations.

    Args:
        data_path (str): path to data.

    Returns:
        pd.DataFrame: dataframe containing all rationale-rationale combinations.
    """
    if "all_claims" not in globals():
        claims = pd.read_json(
            data_path + "es_claims.jsonl", lines=True
        ).set_index("id")
        corpus = pd.read_json(
            data_path + "es_corpus.jsonl", lines=True
        ).set_index("doc_id")
        claim_map = pd.read_json(data_path + "es_map.json")

        claims["doc_ids"] = claims["doc_ids"].apply(lambda x: x[0])
        claim_map = claim_map.transpose().claim_id
        claims["docs"] = claims.doc_ids.apply(
            lambda x: corpus.loc[x]["abstract"][0]
        )
        claims = claims.drop("doc_ids", axis=1)

        claims["claim_id"] = claims.index.map(claim_map)
        claims.columns = ["r1", "r2", "cid"]
        claims = claims.sample(frac=1, random_state=0)

        global all_claims
        all_claims = claims

        return claims.copy()
    else:
        return all_claims.copy()


def get_results(data_path: str, claim_id: int, rationale_results: str) -> None:
    """prints results for claim_id on rationale_results.

    Args:
        data_path (str): path to data.
        claim_id (int): claim_id to print results for.
        rationale_results (str): rationale-rationale stance predictions file.
    """
    claims = get_claims(data_path)

    claims = claims[claims.cid == claim_id]

    annotated_rationales = pd.read_csv(
        data_path + f"annotated_rationales_claim_{claim_id}.tsv", sep="\t"
    )
    claim_map = dict(
        zip(annotated_rationales["r"], annotated_rationales["stance"])
    )
    claims["sr1"] = claims.r1.map(claim_map)
    claims["sr2"] = claims.r2.map(claim_map)
    claims["stance"] = claims.apply(
        lambda x: "support" if x.sr1 == x.sr2 else "contradict", axis=1
    )
    claims["stance"] = claims.apply(
        lambda x: "unrelated"
        if x.sr1 == "unrelated" or x.sr2 == "unrelated"
        else x.stance,
        axis=1,
    )
    claims = claims.reset_index().rename(columns={"id": "pair_id"})

    res = pd.read_json(data_path + rationale_results, lines=True)
    res["stance"] = res.evidence.apply(
        lambda x: "unrelated" if len(x) == 0 else list(x.values())[0]["label"]
    )
    res = res.drop("evidence", axis=1)
    res.columns = ["pair_id", "stance"]

    merged = pd.merge(
        res, claims, on="pair_id", suffixes=("_predicted", "_actual")
    )
    merged["stance_predicted"] = merged.stance_predicted.apply(
        lambda x: x.lower()
    )

    print(f"Results for claim {claim_id}")

    print(
        "Accuracy:",
        round((merged.stance_predicted == merged.stance_actual).mean(), 3),
    )

    print(
        merged.groupby(["stance_predicted", "stance_actual"])
        .size()
        .unstack(fill_value=0)
    )

    print()


if __name__ == "__main__":
    if len(sys.argv) == 1:
        sys.exit("Data path needed!")
    if len(sys.argv) > 2:
        sys.exit("Too many parameters!")

    data_path = sys.argv[1]

    print()
    print("Before training")
    print()
    get_results(data_path, 0, "es_result.jsonl")
    get_results(data_path, 15, "es_result.jsonl")

    print("After training")
    print()
    get_results(data_path, 0, "es_result_stance.jsonl")
    get_results(data_path, 15, "es_result_stance.jsonl")
