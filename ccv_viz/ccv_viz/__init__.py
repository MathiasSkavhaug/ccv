from flask import Flask

app = Flask(__name__)

import ccv_viz.views

if __name__ == "__main__":
    app.run(debug=True)
