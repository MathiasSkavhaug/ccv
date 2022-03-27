import { getNeighbors, getNodeLinks } from "./graphTraversal.js"
import { openCardPanel, closeCardPanel, clearCardPanel, populateCardPanel } from "./cardPanel.js"
import { isResizing } from "./graphResize.js";

var lastClicked;

export function graphInteractionInit() {
    // When nodes are clicked highlight node and neighboring nodes and open card panel.
    d3.selectAll(".node")
        .on("click", function () {
            // Stop click propagation.
            d3.event.stopPropagation();
            
            var node = d3.select(this).data()[0]
            nodeHighlight(node);
            openCardPanel();
            populateCardPanel(this);
            setLastClicked(this);
        });

    // When nodes are hovered over highlight node and neighboring nodes only if card panel is open and not resizing.
    d3.selectAll(".node")
    .on("mouseover", function () {
        if (d3.select("#card-panel-arrow").classed("right") && !isResizing()) {    
            var node = d3.select(this).data()[0];
            nodeHighlight(node);
            openCardPanel();
            populateCardPanel(this);
        };
    });

    d3.selectAll(".node")
    .on("mouseout", function () {
        if (d3.select("#card-panel-arrow").classed("right") && !isResizing()) {
            if (typeof lastClicked !== "undefined") {
                d3.select(lastClicked).dispatch("click")
            };
        };
    });

    // When graph background is clicked reset highlight to normal
    d3.select("#graph-svg")
        .on("click", function () {
            removeHighlight();
            clearCardPanel();
        });

    // When graph background is double clicked reset highlight to normal and close card panel.
    d3.select("#graph-svg")
    .on("dblclick", function () {
        removeHighlight();
        clearCardPanel();
        closeCardPanel();
    });
}

export function setLastClicked(node) {
    lastClicked = node;
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