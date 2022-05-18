import { graphInit } from "./graphInit.js";
import { resizeInit } from "./graphResize.js";
import { graphInteractionInit } from "./graphInteraction.js"
import { graphTooltipInit } from "./graphTooltip.js"
import { graphSearchBarInit } from "./graphSearchBar.js"
import { graphOptionsBarInit } from "./graphOptionsBar.js";
import { cardPanelInit } from "./cardPanel.js"
import { initialState } from "./initialState.js"
import { graphParameterPanelInit } from "./graphParameterPanel.js"

import { gridCalc, gridCalcInitialImportance } from './analysis.js';
window.gridCalc = gridCalc;
window.gridCalcInitialImportance = gridCalcInitialImportance;

export var originalGraph;

// Sets the graph to the one found at graphResource and calls the callback.
export function setGraph(graphResource, callback) {
    d3.json(graphResource, function (error, graph) {
        if (error) throw error;

        originalGraph = graph;
        callback();
    });
};

// Initialization
export function init() {
    graphInit();
    graphInteractionInit();
    resizeInit();
    graphOptionsBarInit();
    cardPanelInit();
    graphTooltipInit();
    graphSearchBarInit();
    graphParameterPanelInit();
    initialState();
}

// On load
d3.select(window).on('load', function () {
    d3.text("/static/data/claims.txt", function(claims) {
        var claim = d3.csvParseRows(claims)[0];
        setGraph("/search?claim="+encodeURIComponent(claim), init);
    });
});