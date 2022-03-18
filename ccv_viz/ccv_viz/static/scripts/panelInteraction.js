import { getNeighborsOfType, getLabelBetween } from "./graphTraversal.js"
import { nodeHighlight } from "./graphInteraction.js"
import { linkType } from "./graphInit.js"

export function panelInteractionInit() {
    
}

// Opens the info panel.
export function openInfoPanel() {
    d3.select("#graph-container")
        .transition()
            .style("width", "60%")
}

// Closes the info panel.
export function closeInfoPanel() {
    d3.select("#graph-container")
        .transition()
            .style("width", "100%")
    
    clearInfoPanel();
}

// Populates the info panel.
export function populateInfoPanel(node, dom=true) {
    clearInfoPanel();

    if (dom) {
        var node = d3.select(node).data()[0]
    }
    
    if (node.type == "0") { // claim
        var nodeType = "claim", neighborType = "document"
    } else if (node.type == "1") { // document
        var nodeType = "document", neighborType = "evidence"
    } else if (node.type == "2") { // evidence
        var nodeType = "evidence", neighborType = "evidence"
    }
        
    var evidences = getNeighborsOfType(node, neighborType)

    d3.select("#info-panel")
        .append("div")
            .classed("top", true)
            .classed("card", true)
            .classed("card-selected", true)
            .classed(nodeType, true)
            .html(node.text)
            .on("click", function() {
                d3.event.stopPropagation();
                nodeHighlight(node);
                moveHighlight(this);
            })

    d3.select("#info-panel")
        .append("hr")
            
    d3.select("#info-panel")
        .append("div")
            .attr("id", "evidence-container")
            
    evidences
        .each(function(d) {
            var label = linkType[getLabelBetween(d, node)]
            d3.select("#evidence-container")
            .append("div")
                .classed("card", true)
                .classed("card-selected", function() {return d === node})
                .classed(neighborType, true)
                .classed(label, true)
                .html(d.text)
                .on("click", function() {
                    d3.event.stopPropagation();
                    nodeHighlight(d);
                    moveHighlight(this);
                })
                .on("dblclick", function() {
                    d3.event.stopPropagation();
                    populateInfoPanel(d, false);
                })
        })

    setTimeout(showInfoPanel, 250)
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

// Gets the height of the heighest div of class "cls".
function getClassHeighest(cls) {
    var highest = 0;
    d3.selectAll(cls)
        .each(function() {
            highest = Math.max(highest, parseFloat(window.getComputedStyle(this).height))
        })
    return highest
}

// Displays the info panel.
function showInfoPanel() {
    var highest = getClassHeighest(".card")

    d3.selectAll((".card"))
        .style("height", highest+"px")
        .transition()
        .duration(250)
        .style("opacity", "1")

    d3.select("#info-container hr")
        .transition()
        .duration(250)
        .style("opacity", "1")
}
