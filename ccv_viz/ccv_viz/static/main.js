import { init } from "./init.js";
import { resizeInit } from "./resize.js";
import { graphInteractionInit } from "./graphInteraction.js"
import { infoPanelInteractionInit } from "./infoPanelInteraction.js"

d3.select(window).on('load', function () {
    d3.json("static/data/graph.json", function (error, graph) {
        if (error) throw error;

        init(graph);
        resizeInit();
        graphInteractionInit();
        infoPanelInteractionInit();
    });
});