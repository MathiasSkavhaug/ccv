from sympy import true
from ccv_viz import app
from flask import render_template, send_from_directory


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/search/<query>")
def search(query):
    # TODO: search and return result.
    return send_from_directory("static/data", "graph.json")
