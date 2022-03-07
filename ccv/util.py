import json
import requests
import time
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from typing import Dict, Any, List


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

    r = requests.get(url)
    if r.status_code == 429 or r.status_code == 403:
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


# Code derived from parts of https://github.com/castorini/pygaggle,
# mainly https://github.com/castorini/pygaggle/blob/dcfaacbff62298da39098ff0d296dc541fadcc9c/pygaggle/rerank/transformer.py#L98
def rerank(
    query: str,
    texts: List[str],
    model: AutoModelForSeq2SeqLM,
    tokenizer: AutoTokenizer,
    device: str,
) -> List[float]:
    """Takes a ranking and re-ranks it using a specified model.

    Args:
        query (str): The claim.
        rankings (List[str]): Initial texts to rank.
        model (AutoModelForSeq2SeqLM): Model to use for re-ranking
        tokenizer (AutoTokenizer): Tokenizer to tokenize the text.
        device (str): Device to use.

    Returns:
        List[float]: Returns a list of scores.
    """

    data = [f"'Query: {query} Document: {text} Relevant:'" for text in texts]
    input = tokenizer.batch_encode_plus(
        data,
        return_attention_mask=True,
        padding="longest",
        truncation=True,
        return_tensors="pt",
        max_length=512,
    )
    input["tokens"] = list(map(tokenizer.tokenize, data))
    input_ids = input["input_ids"].to(device)
    attention = input["attention_mask"].to(device)

    with torch.no_grad():
        decode_ids = torch.full(
            (input_ids.size(0), 1),
            model.config.decoder_start_token_id,
            dtype=torch.long,
        ).to(device)
        input = model.get_encoder()(input_ids, attention_mask=attention)
        input = model.prepare_inputs_for_generation(
            decode_ids,
            encoder_outputs=input,
            past=None,
            attention_mask=attention,
            use_cache=True,
        )
        outputs = model(**input)
        scores = outputs[0][:, -1, :]

    token_false_id = tokenizer.get_vocab()["▁false"]
    token_true_id = tokenizer.get_vocab()["▁true"]
    scores = scores[:, [token_false_id, token_true_id]]
    scores = torch.nn.functional.log_softmax(scores, dim=1)

    return scores[:, 1].tolist()


if __name__ == "__main__":
    assert get_corpusid("219604114") == 219604114
    assert get_corpusid("27009955", "pubmed") == 4779710
