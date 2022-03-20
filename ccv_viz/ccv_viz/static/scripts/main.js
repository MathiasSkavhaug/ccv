import { graphInit } from "./graphInit.js";
import { resizeInit } from "./graphResize.js";
import { graphInteractionInit } from "./graphInteraction.js"
import { cardPanelInit } from "./cardPanel.js"
import { graphTooltipInit } from "./graphTooltip.js"
import { graphSearchBarInit } from "./graphSearchBar.js"

d3.select(window).on('load', function () {
    d3.json("static/data/graph.json", function (error, graph) {
        if (error) throw error;

        graphInit(graph);
        resizeInit();
        graphInteractionInit();
        cardPanelInit();
        graphTooltipInit();
        graphSearchBarInit();
    });
});