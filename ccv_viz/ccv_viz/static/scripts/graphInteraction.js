import { getNeighbors, getNodeLinks } from "./graphTraversal.js"
import { openInfoPanel, closeInfoPanel, populateInfoPanel } from "./panelInteraction.js"

export function graphInteractionInit() {
    // When nodes are clicked highlight node and neighboring nodes and open info panel.
    d3.selectAll(".node")
        .on("click", function () {
            // Stop click propagation.
            d3.event.stopPropagation();

            var node = d3.select(this).data()[0]
            nodeHighlight(node);
            openInfoPanel();
            populateInfoPanel(this);
        });

    // When no nodes are clicked reset highlight to normal and close info panel.
    d3.select("#viz-svg")
        .on("click", function () {
            removeHighlight();
            closeInfoPanel();
        });
}

// Highlight node and neighboring nodes.
export function nodeHighlight(node) {
    var neighbors = getNeighbors(node)
    var nodeLinks = getNodeLinks(node)

    d3.selectAll(".node")
        .classed("unselected", function (d) {
            return !neighbors.has(d)
        })
        .classed("node-selected", function (d) {
            return d === node
        })

    d3.selectAll(".link")
        .classed("unselected", function (d) {
            return !nodeLinks.data().includes(d)
        })
}

// Remove all node highlighting.
export function removeHighlight() {
    d3.selectAll(".unselected")
        .classed("unselected", false)
    
    d3.selectAll(".node-selected")
        .classed("node-selected", false)
}