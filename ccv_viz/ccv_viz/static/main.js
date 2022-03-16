import {
    init
} from "./init.js";
import {
    resize
} from "./resize.js";
import {
    graphInteraction
} from "./graphInteraction.js"

d3.select(window).on('load', function () {
    d3.json("static/data/graph.json", function (error, graph) {
        if (error) throw error;

        init(graph);
        resize();
        graphInteraction();
    });
});