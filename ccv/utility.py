import json
import os
import requests
import time
from typing import Dict, Any


type_map = {
    "s2": "",
    "doi": "",
    "arxiv": "arXiv:",
    "mag": "MAG:",
    "acl": "ACL:",
    "pubmed": "PMID:",
    "pmc": "PMCID:",
}


def get_request(url: str) -> Dict[str, Any]:
    """Sends a http request to the given URL. If return code 429 or 403, waits 60 seconds and tries again.

    Args:
        url (str): URL to send request to.

    Returns:
        Dict[str, Any]: Request response as JSON.
    """

    key = os.environ.get("SS_API_KEY")
    header = {"x-api-key": key} if key else None
    r = requests.get(url, header=header)
    if r.status_code in [420, 403, 504]:
        print("Rate limited, waiting 5 minutes...")
        time.sleep(60 * 5)
        return get_request(url)
    if r.status_code != 200:
        print(r.text)
        return {}
    r = json.loads(r.text)
    return r


def get_corpusid(id: str, type: str) -> str:
    """Takes an id and the type of id and tries to find the associated papers
        corpusid.

    Args:
        id (str): The id of the paper.
        type (str): The type of id.

    Raises:
        ValueError: The type of id is not known.

    Returns:
        str: The corpusid of the paper, if found.
    """

    if type not in type_map:
        raise ValueError(f"{type} is not a known id type!")
    if type == "pmc":
        id = str(type_map[type]) + str(id)[3:]
    else:
        id = str(type_map[type]) + str(id)
    url = f"https://api.semanticscholar.org/graph/v1/paper/{id}?fields=externalIds"
    r = get_request(url)
    return r.get("externalIds", {}).get("CorpusId", "")


def extract_nested_value(d: Dict, key: Any) -> Any:
    """Returns the value of the first occurrence of the given key in the given
        dictionary.

    Args:
        d (Dict): Dictionary to search through.
        key (Any): Key to search for.

    Returns:
        Any: The value from the first occurene of the given key in the given
        dictionary.
    """
    value = None
    for k, v in d.items():
        if k == key:
            value = v
        elif type(v) is dict:
            value = extract_nested_value(v, key)
        if value:
            return value
    return value


if __name__ == "__main__":
    assert get_corpusid("219604114") == 219604114
    assert get_corpusid("27009955", "pubmed") == 4779710
