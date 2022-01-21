""" Contains methods used to hydrate a list of twitter ids.

    typical usage:
        python hydrate.py --i "./CMU_MisCov19_dataset.csv" --c "status_id" --b
            "./bearer_token.txt" --o "./CMU_MisCov19_dataset_hydrated.csv"
"""


import argparse
import pandas as pd
from copy import deepcopy as dc
from math import isnan
from tqdm import tqdm
from twarc import Twarc2
from typing import Dict, List
from geopy.exc import GeocoderTimedOut
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

tqdm.pandas()

REMOVE_LIST = [
    "public_metrics",
    "conversation_id",
    "referenced_tweets",
    "lang",
    "possibly_sensitive",
    "in_reply_to_user_id",
    "reply_settings",
    "context_annotations",
    "entities",
    "id",
    "attachments",
    "geo",
]


def process_tweet(tweet: Dict[str, any]) -> Dict[str, any]:
    """ Flattens tweet JSON, and removes unnecessary fields.

    Args:
        tweet (Dict[str, any]): Tweet JSON returned from the Twitter V2 api.

    Returns:
        Dict[str, any]: Flattened tweet JSON, with fields in REMOVE_LIST
        removed.
    """

    tweet = dc(tweet)
    tweet.update(tweet["public_metrics"])
    if tweet.get("geo", None):
        tweet.update(tweet["geo"])
    for col in REMOVE_LIST:
        tweet.pop(col, None)

    return tweet


def location_lookup(location: str, geocode: RateLimiter) -> Dict[str, str]:
    """ Given a string, assumed to be a location, tries to find the actual
    location.

    Args:
        location (str): String to be looked up.
        geocode (RateLimiter): Wrapped Nominatim().geocode, geocoder for
        OpenStreetMap data.

    Returns:
        Dict[str, str]: A dictionary on the form "location_type: value".
        "location_type" varies, depending on the result.
        (example keys: "country", "city", etc.)
    """

    if type(location) != str and isnan(location):
        return None
    location = location.replace("ÜT: ", "")  # Makes coordinates detectable
    try:
        location = geocode(location, language="en", addressdetails=True)
        if location:
            location = location.raw.get("address", {})
    except GeocoderTimedOut:
        location = None
    return location


def hydrate_tweets_wrapper(
    input_path: str, column_name: str, bearer_token_path: str, output_path: str
) -> None:
    """ Wrapper for hydrate_tweets.

    Args:
        input_path (str): Path of input csv file containing twitter ids
        column_name (str): Name of input file column containing the twitter ids
        bearer_token_path (str): Path of file containing the twitter bearer
            token
        output_path (str): Path of output csv file containing hydrated tweets
    """

    with open(bearer_token_path, "r") as f:
        bearer_token = f.readline().rstrip()

    twarc2 = Twarc2(bearer_token=bearer_token)
    data = pd.read_csv(input_path)

    ids = data[column_name].to_list()

    output = hydrate_tweets(twarc2, ids)

    output.to_csv(output_path)


def hydrate_tweets(twarc2: Twarc2, twitter_ids: List[int]) -> pd.DataFrame:
    """ Hydrates the tweets in twitter_ids.

    Args:
        twarc2 (Twarc2): The client for the Twitter v2 API.
        twitter_ids (List[int]): List of twitter ids.

    Returns:
        pd.DataFrame: Pandas dataframe containing the hydrated tweets, in the
            same order as the initial ids.
    """

    tweets = twarc2.tweet_lookup(
        twitter_ids,
        expansions="author_id,geo.place_id",
        user_fields="location",
        place_fields="country_code",
    )

    tdfs, udfs, pdfs = [], [], []
    for batch in tweets:
        tdfs.append(
            pd.DataFrame([process_tweet(t) for t in batch.get("data", {})])
        )
        udfs.append(pd.DataFrame(batch.get("includes", {}).get("users", {})))
        pdfs.append(pd.DataFrame(batch.get("includes", {}).get("places", {})))

    tdf = pd.concat(tdfs)
    udf = pd.concat(udfs)
    pdf = pd.concat(pdfs)

    geocode = RateLimiter(
        Nominatim(user_agent="COVID_FND").geocode, min_delay_seconds=1
    )

    if not udf.empty:
        udf = udf[["id", "location"]].rename(columns={"id": "author_id"})
        udf = udf.drop_duplicates(subset="author_id")
        tdf = pd.merge(tdf, udf, on="author_id", how="left")
        location = tdf.location.progress_apply(
            lambda x: location_lookup(x, geocode)
        )
        tdf = tdf.drop(axis=1, columns=["location"])

    if not pdf.empty:
        pdf = pdf[["id", "full_name"]].rename(
            columns={"id": "place_id", "full_name": "geo_location"}
        )
        pdf = pdf.drop_duplicates(subset="place_id")
        tdf = pd.merge(tdf, pdf, on="place_id", how="left")
        geo_location = tdf.geo_location.progress_apply(
            lambda x: location_lookup(x, geocode)
        )
        location = location.fillna(geo_location)
        tdf = tdf.drop(axis=1, columns=["place_id", "geo_location"])

    location = pd.json_normalize(location)[
        ["country_code", "state", "county", "city"]
    ]

    tdf = pd.concat([tdf, location], axis=1)

    tdf.text = tdf.text.apply(lambda x: " ".join(x.split()))

    return tdf


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-input_path",
        "--i",
        type=str,
        required=True,
        dest="input_path",
        help="Path of input csv file containing twitter ids",
    )
    parser.add_argument(
        "-id_column_name",
        "--c",
        type=str,
        required=True,
        dest="id_column_name",
        help="Name of input file column containing the twitter ids",
    )
    parser.add_argument(
        "-bearer_token_path",
        "--b",
        type=str,
        required=True,
        dest="bearer_token_path",
        help="Path of file containing the twitter bearer token",
    )
    parser.add_argument(
        "-output_path",
        "--o",
        type=str,
        required=True,
        dest="output_path",
        help="Path of output csv file containing hydrated tweets",
    )
    args = parser.parse_args()

    hydrate_tweets_wrapper(
        args.input_path,
        args.id_column_name,
        args.bearer_token_path,
        args.output_path,
    )
