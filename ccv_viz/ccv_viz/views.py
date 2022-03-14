from ccv_viz import app
from flask import render_template, json


@app.route("/")
def index():
    return render_template("index.html")
