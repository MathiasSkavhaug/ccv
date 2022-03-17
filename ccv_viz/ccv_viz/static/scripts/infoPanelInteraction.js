import { getNeighborsOfType, getDocument } from "./graphTraversal.js"
import { nodeHighlight, removeHighlight } from "./graphInteraction.js"

export function infoPanelInteractionInit() {

}

// Opens the info panel.
export function openInfoPanel() {
    d3.select("#graph-container")
        .transition()
            .style("width", "60%")

    d3.select("#info-container")
        .style("border-left", "2.5px solid #f2e9e4")
}

// Closes the info panel.
export function closeInfoPanel() {
    d3.select("#graph-container")
        .transition()
            .style("width", "100%")
    
    d3.select("#info-container")
        .style("border-left", "0px solid #f2e9e4")
    clearInfoPanel();
}

// Populates the info panel.
export function populateInfoPanel(node) {
    clearInfoPanel();

    var node = d3.select(node).data()[0]
    var originalNode = node
    var nodeType = "document", neighborType = "evidence"
    
    if (node.type == "0") { // claim
        var nodeType = "claim", neighborType = "document"
    } else if (node.type == "2") { // evidence
        node = getDocument(node)
    }
        
    var evidences = getNeighborsOfType(node, neighborType)

    d3.select("#info-panel")
        .append("div")
            .classed("top", true)
            .classed("card", true)
            .classed("card-selected", function() {return node === originalNode})
            .classed(nodeType, true)
            .html(node.text)
            .on("click", function() {
                d3.event.stopPropagation();
                nodeHighlight(node);
                moveHighlight(this);
            })
            
    d3.select("#info-panel")
        .append("div")
            .attr("id", "evidence-container")

    evidences
        .each(function(d) {
            d3.select("#evidence-container")
                .append("div")
                    .classed("card", true)
                    .classed("card-selected", function() {return d === originalNode})
                    .classed(neighborType, true)
                    .html(d.text)
                    .on("click", function() {
                        d3.event.stopPropagation();
                        nodeHighlight(d);
                        moveHighlight(this);
                    })
        })
}

// Clears the info panel.
function clearInfoPanel() {
    d3.select("#info-panel").html("")
}

// Moves the card highlight to element
function moveHighlight(element) {
    d3.select(".card-selected")
        .classed("card-selected", false)

    d3.select(element)
        .classed("card-selected", true)
}