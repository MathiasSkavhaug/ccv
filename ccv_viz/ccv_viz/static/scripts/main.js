import { graphInit } from "./graphInit.js";
import { resizeInit } from "./graphResize.js";
import { graphInteractionInit } from "./graphInteraction.js"
import { graphTooltipInit } from "./graphTooltip.js"
import { graphSearchBarInit } from "./graphSearchBar.js"
import { graphOptionsBarInit } from "./graphOptionsBar.js";
import { cardPanelInit } from "./cardPanel.js"
import { initialState } from "./initialState.js"
import { graphParameterPanelInit } from "./graphParameterPanel.js"

export var originalGraph;

export function initWithLoad(graphResource) {
    d3.json(graphResource, function (error, graph) {
        if (error) throw error;

        originalGraph = graph;
        init()
    });
};

export function init() {
    graphInit();
    graphInteractionInit();
    resizeInit();
    graphOptionsBarInit();
    cardPanelInit();
    graphTooltipInit();
    graphSearchBarInit();
    graphParameterPanelInit();
}

d3.select(window).on('load', function () {
    d3.text("/static/data/claims.txt", function(claims) {
        var claim = d3.csvParseRows(claims)[0];
        initWithLoad("/search?claim="+encodeURIComponent(claim))
        initialState();
    });
})