import { graphInit } from "./graphInit.js";
import { resizeInit } from "./graphResize.js";
import { graphInteractionInit } from "./graphInteraction.js"
import { cardPanelInit } from "./cardPanel.js"
import { graphTooltipInit } from "./graphTooltip.js"
import { graphSearchBarInit } from "./graphSearchBar.js"

export function init(graphResource) {
    d3.json(graphResource, function (error, graph) {
        if (error) throw error;
        
        graphInit(graph);
        resizeInit();
        graphInteractionInit();
        cardPanelInit();
        graphTooltipInit();
        graphSearchBarInit();
    });
};

d3.select(window).on('load', function () {
    init("/static/data/graph.json")
})