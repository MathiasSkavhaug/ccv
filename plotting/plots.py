"""Contains plotting code for the thesis.

Example usage:
    python plots.py
"""

import os
from random import randrange, seed
from typing import List, Tuple

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

sns.set_theme()

plt.rc("axes", labelsize=20)
plt.rc("xtick", labelsize=20)
plt.rc("ytick", labelsize=20)
plt.rc("legend", fontsize=20)

if not os.path.exists("figures"):
    os.makedirs("figures")


def create_df(claim_folder: str) -> pd.DataFrame:
    claim_folder = os.path.join("data", claim_folder)

    claims = []
    for filename in os.listdir(claim_folder):
        if filename.endswith(".csv"):
            filename = os.path.join(claim_folder, filename)
            claims.append(pd.read_csv(filename))

    return pd.concat(claims)


def plot_diff_params(df: pd.DataFrame, figure_suffix: str, title: str) -> None:
    seed(4)

    fig = plt.figure(constrained_layout=True, figsize=(30, 30))
    fig.suptitle(title, fontsize=40)

    cols = list(df.columns)
    cols = cols[cols.index("claimID") + 1 : cols.index("majority")]
    subfigs = fig.subfigures(nrows=5, ncols=1)
    for subfig in subfigs:
        claim = randrange(36)
        subfig.suptitle(f"claim {claim}", fontsize=40)

        axs = subfig.subplots(nrows=1, ncols=len(cols))
        for i, col in enumerate(cols):
            sns.boxplot(
                x=col, y="diff", data=df[df["claimID"] == claim], ax=axs[i]
            )

    fig.savefig(os.path.join("figures", f"diff_params_{figure_suffix}.svg"))


def plot_agreement(
    df: pd.DataFrame,
    figure_suffix: str,
    pred_cols: List[str],
    titles: List[str],
    grid_size: Tuple[int, int],
) -> None:
    fig = plt.figure(constrained_layout=True, figsize=(25, 25))
    axes = fig.subplots(nrows=grid_size[0], ncols=grid_size[1])
    if grid_size[0] + grid_size[1] > 2:
        axes = axes.flatten()
    else:
        axes = [axes]

    cols = list(df.columns)
    cols = cols[cols.index("claimID") + 1 : cols.index("majority")]

    for k, ax in enumerate(axes):
        series = [df.groupby(col).mean()[pred_cols[k]] for col in cols]
        pred_diff = pd.concat(series, axis=1).dropna()
        pred_diff.columns = cols
        pred_diff.plot(title=titles[k], style="s-", ax=ax, fontsize=30)
        ax.set_ylabel("ratio of total instances", fontsize=30)
        ax.title.set_size(30)

    fig.savefig(os.path.join("figures", f"agreement_{figure_suffix}.svg"))


def plot_agreement_claimID(
    df: pd.DataFrame,
    figure_suffix: str,
    pred_cols: List[str],
    titles: List[str],
    grid_size: Tuple[int, int],
) -> None:
    fig = plt.figure(constrained_layout=True, figsize=(25, 25))
    axes = fig.subplots(nrows=grid_size[0], ncols=grid_size[1])
    if grid_size[0] + grid_size[1] > 2:
        axes = axes.flatten()
    else:
        axes = [axes]

    cols = list(df.columns)
    cols = cols[cols.index("claimID") + 1 : cols.index("majority")]

    for k, ax in enumerate(axes):
        pred_diff = df.groupby("claimID").mean()[pred_cols[k]]
        pred_diff.plot(title=titles[k], style="s-", ax=ax, fontsize=30)
        ax.set_ylabel("ratio of claimID instances", fontsize=30)
        ax.title.set_size(30)

    fig.savefig(
        os.path.join("figures", f"agreement_claimID_{figure_suffix}.svg")
    )


def plot_diff_claimID(df: pd.DataFrame, figure_suffix: str, title: str) -> None:
    sns.set(rc={"figure.figsize": (25, 25)})
    sns.set(font_scale=2)
    fig = sns.boxplot(
        x="claimID", y="diff", data=df, ax=plt.figure().add_subplot()
    )
    fig.set_title(title)
    fig.get_figure().savefig(
        os.path.join("figures", f"diff_claimID_{figure_suffix}.svg")
    )


def plot_gridCalc() -> None:
    df = create_df("gridCalc")

    df["diff"] = df.weightedAfterAlgorithm - df.weighted
    diff_text = "diff = weighted average after algorithm - weighted average before algorithm"
    figure_suffix = "algo"

    df["prediction_m"] = (df.majority > 0).astype(int)
    df["prediction_w"] = (df.weighted > 0).astype(int)
    df["prediction_waa"] = (df.weightedAfterAlgorithm > 0).astype(int)
    df["prediction_1_1_0"] = (
        (df.prediction_m == df.prediction_w)
        & (df.prediction_w != df.prediction_waa)
    ).astype(int)
    df["prediction_1_0_1"] = (
        (df.prediction_m == df.prediction_waa)
        & (df.prediction_waa != df.prediction_w)
    ).astype(int)
    df["prediction_0_1_1"] = (
        (df.prediction_m != df.prediction_w)
        & (df.prediction_w == df.prediction_waa)
    ).astype(int)
    df["prediction_1_1_1"] = (
        (df.prediction_m == df.prediction_w)
        & (df.prediction_w == df.prediction_waa)
    ).astype(int)
    pred_cols = [
        "prediction_1_1_0",
        "prediction_1_0_1",
        "prediction_0_1_1",
        "prediction_1_1_1",
    ]
    titles = [
        "majority = weighted ≠ weightedAfterAlgorithm",
        "majority = weightedAfterAlgorithm ≠ weighted",
        "majority ≠ weighted = weightedAfterAlgorithm",
        "majority = weighted = weightedAfterAlgorithm",
    ]

    plot_diff_params(df, figure_suffix, diff_text)
    plot_agreement(df, figure_suffix, pred_cols, titles, (2, 2))
    plot_agreement_claimID(df, figure_suffix, pred_cols, titles, (2, 2))
    plot_diff_claimID(df, figure_suffix, diff_text)


def plot_gridCalcFiltered() -> None:
    df = create_df("gridCalcFiltered")

    df["diff"] = df.weightedAfterAlgorithm - df.weighted
    diff_text = "diff = weighted average after algorithm - weighted average before algorithm"
    figure_suffix = "algo_filtered"

    df["prediction_m"] = (df.majority > 0).astype(int)
    df["prediction_w"] = (df.weighted > 0).astype(int)
    df["prediction_waa"] = (df.weightedAfterAlgorithm > 0).astype(int)
    df["prediction_1_1_0"] = (
        (df.prediction_m == df.prediction_w)
        & (df.prediction_w != df.prediction_waa)
    ).astype(int)
    df["prediction_1_0_1"] = (
        (df.prediction_m == df.prediction_waa)
        & (df.prediction_waa != df.prediction_w)
    ).astype(int)
    df["prediction_0_1_1"] = (
        (df.prediction_m != df.prediction_w)
        & (df.prediction_w == df.prediction_waa)
    ).astype(int)
    df["prediction_1_1_1"] = (
        (df.prediction_m == df.prediction_w)
        & (df.prediction_w == df.prediction_waa)
    ).astype(int)
    pred_cols = [
        "prediction_1_1_0",
        "prediction_1_0_1",
        "prediction_0_1_1",
        "prediction_1_1_1",
    ]
    titles = [
        "majority = weighted ≠ weightedAfterAlgorithm",
        "majority = weightedAfterAlgorithm ≠ weighted",
        "majority ≠ weighted = weightedAfterAlgorithm",
        "majority = weighted = weightedAfterAlgorithm",
    ]

    plot_diff_params(df, figure_suffix, diff_text)
    plot_agreement(df, figure_suffix, pred_cols, titles, (2, 2))
    plot_agreement_claimID(df, figure_suffix, pred_cols, titles, (2, 2))
    plot_diff_claimID(df, figure_suffix, diff_text)


def plot_gridCalcImportance() -> None:
    df = create_df("gridCalcInitialImportance")

    df["diff"] = df.weighted - df.majority
    diff_text = "diff = weighted average - majority vote"
    figure_suffix = "importance"

    df["prediction_m"] = (df.majority > 0).astype(int)
    df["prediction_w"] = (df.weighted > 0).astype(int)
    df["prediction_1_0"] = (df.prediction_m != df.prediction_w).astype(int)
    pred_cols = ["prediction_1_0"]
    titles = ["majority ≠ weighted"]

    plot_diff_params(df, figure_suffix, diff_text)
    plot_agreement(df, figure_suffix, pred_cols, titles, (1, 1))
    plot_agreement_claimID(df, figure_suffix, pred_cols, titles, (1, 1))
    plot_diff_claimID(df, figure_suffix, diff_text)


if __name__ == "__main__":
    plot_gridCalc()
    plot_gridCalcFiltered()
    plot_gridCalcImportance()
