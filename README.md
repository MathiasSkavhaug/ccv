# Interactive Graph-Based Visualisation and Veracity Prediction of Scientific COVID-19 Claims (Master's Thesis)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

This repository contains code for a system that allows COVID-19 claims to be visualised as an interactive graph, intended to help users decide the veracity of those claims. It also uses the visualisation elements to try and predict the veracity of claims in an adjustable way so that it can emulate the user's path of reasoning. The visualisation elements consist of documents relevant to the claim, relevant documents' stances to the claim, rationales for those stances, stances between the rationales of different abstracts, and more.

### Setup
First step after cloning the repository is to run the [setup.sh](scripts/setup.sh) script. It sets up the necessary environment, starts indexing the [CORD-19](https://github.com/allenai/cord19) dataset, downloads model checkpoints, and other necessary setup steps. Make sure that you have Java 11 and Maven 3.3+, as it is required to create the index.

The setup uses the `2022-02-07` version of the CORD-19 dataset, to user another version replace the date in
```
python src/main/python/trec-covid/index_cord19.py --date 2022-02-07 --download --index
```
All scripts are designed to be called from the top directory.

### Graph
In order to generate the graph structure used for visualisation, run the [run_query.py](ccv/run_query.py) script.

Example usage:
```
python ccv/run_query.py \
    --claim ccv_viz/ccv_viz/static/data/claims.txt \
    --exe_id "8e07ef5c41d7c1805593048efd379e19"
```

In this case, the output will be placed in `data/8e07ef5c41d7c1805593048efd379e19/`

### Webpage
Starting the webserver is done by running [start.sh](ccv_viz/start.sh) (or alternatively [start.bat](ccv_viz/start.bat)), and can then be accessed at [127.0.0.1:5000](http://127.0.0.1:5000/).

To use the graphs generated by run_query.py simply replace the [graphs.jsonl](/ccv_viz/ccv_viz/static/data/graphs.jsonl) with [final_output.jsonl](data/8e07ef5c41d7c1805593048efd379e19/final_output.jsonl) generated by run_query.py. (needs to be named graphs.jsonl). In order to make the claims selectable in the drop-down, [claims.txt](/ccv_viz/ccv_viz/static/data/claims.txt) should be updated with the claims that should be selectable.

### Training
The script [train.py](ccv/train.py) trains the longchecker model for rationale-rationale stance detection.

### API Key
The system does not require a Semantic Scholar Academic Graph API key to function. However, it will be slower without one, as the rate limit is 100 requests per 5 minutes. If you have an API key, add it to your environment as "SS_API_KEY" for the system to detect and use it.

### Attributions
This repository uses the [Semantic Scholar Academic Graph API](https://www.semanticscholar.org/product/api).
