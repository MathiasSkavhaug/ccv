import { getNeighbors, getNodeLinks } from "./graphTraversal.js"
import { openInfoPanel, closeInfoPanel, populateInfoPanel } from "./infoPanelInteraction.js"

export function graphInteractionInit() {
    // When nodes are clicked highlight node and neighboring nodes and open info panel.
    d3.selectAll(".node")
        .on("click", function () {
            // Stop click propagation.
            d3.event.stopPropagation();

            nodeHighlight(this);
            openInfoPanel();
            populateInfoPanel(this);
        });

    // When no nodes are clicked reset highlight to normal and close info panel.
    d3.select("#viz-svg")
        .on("click", function () {
            d3.selectAll(".unselected")
                .classed("unselected", false)
            closeInfoPanel();
        });
}

// Highlight node and neighboring nodes
function nodeHighlight(node) {
    var node = d3.select(node).data()[0]
    var neighbors = getNeighbors(node)
    var nodeLinks = getNodeLinks(node)

    d3.selectAll(".node")
        .classed("unselected", function (d) {
            return !neighbors.has(d)
        })

    d3.selectAll(".link")
        .classed("unselected", function (d) {
            return !nodeLinks.data().includes(d)
        })
}