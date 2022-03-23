import { graphInit } from "./graphInit.js";
import { resizeInit } from "./graphResize.js";
import { graphInteractionInit } from "./graphInteraction.js"
import { cardPanelInit } from "./cardPanel.js"
import { graphTooltipInit } from "./graphTooltip.js"
import { graphSearchBarInit } from "./graphSearchBar.js"
import { graphOptionsBarInit } from "./graphOptionsBar.js";
import { graphAlgorithmInit } from "./graphAlgorithm.js";

export function initWithLoad(graphResource) {
    d3.json(graphResource, function (error, graph) {
        if (error) throw error;

        init(graph)
    });
};

export function init(graph, config=[]) {
    graphInit(graph, config);
    resizeInit();
    graphInteractionInit();
    cardPanelInit();
    graphTooltipInit();
    graphSearchBarInit();
    graphOptionsBarInit(graph);
    graphAlgorithmInit();
}

d3.select(window).on('load', function () {
    initWithLoad("/static/data/graph.json")
})