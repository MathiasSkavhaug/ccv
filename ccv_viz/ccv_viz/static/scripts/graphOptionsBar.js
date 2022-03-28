import { init } from "./main.js"
import { resetGraph } from "./util.js"
import { runSRWR } from "./graphSRWR.js"

export function graphOptionsBarInit(graph) {
    d3.select("#options-arrow")
        .on("click", toggleOptionsBar)

    d3.select("#option-author")
        .on("click", function() {
            toggleAuthors(graph);
            d3.select(this)
                .classed("option-selected", !d3.select(this).classed("option-selected"));
        });

    d3.select("#option-algorithm")
        .on("click", function() {
            var active = d3.select(this).classed("option-selected")
            if (active) {
                resetGraph();
                init(graph);
            } else {
                runSRWR();
            }
            d3.select(this).classed("option-selected", !active)
        });
};

// Hides or shows the options bar, depending on current state.
function toggleOptionsBar() {
    var optionsBar = d3.select("#graph-options-bar")
    var newState = "3rem"
    if (optionsBar.style("width") == newState) { newState = "0rem" }

    optionsBar
        .transition()
        .duration(250)
        .style("width", newState)

    d3.select("#options-arrow")
        .classed("right", !(newState == "3rem"))
        .classed("left", (newState == "3rem"))

    d3.selectAll(".option-button")
        .transition()
        .duration(250)
        .style("width", (newState == "3rem") * 32 + "px")
}

// Toggle author nodes.
function toggleAuthors(graph) {
    resetGraph()
    if (d3.select("#option-author").classed("option-selected")) {
        init(graph)
    } else {
        init(graph, ["author"])
    }
}