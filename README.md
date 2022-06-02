# COVID-19 scientific claim verification (Master Thesis)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

### Setup
First step after cloning the repository is to run the [setup.sh](scripts/setup.sh) script. It sets up the necessary environment, starts indexing the [CORD-19](https://github.com/allenai/cord19) dataset, downloads model checkpoints, and other necessary setup steps.

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