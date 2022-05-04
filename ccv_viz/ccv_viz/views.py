import json
from pathlib import Path

from flask import render_template, request

from ccv_viz import app


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/search")
def search():
    claim = request.args.get("claim")
    with open(Path(app.static_folder + "/data/graphs.jsonl"), "r") as f:
        for line in f:
            graph = json.loads(line)
            if graph["nodes"][0]["text"] == claim:
                return graph
    return {}
