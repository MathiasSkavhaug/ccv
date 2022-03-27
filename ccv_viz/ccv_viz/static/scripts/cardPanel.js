import { getNeighborsOfType, getAttrBetween } from "./graphTraversal.js"
import { nodeHighlight } from "./graphInteraction.js"
import { linkType } from "./graphInit.js"

export function cardPanelInit() {
    d3.select("#card-panel-arrow")
        .on("click", function() {
            if (d3.select("#card-panel-arrow").classed("left")) {
                openCardPanel();
            } else {
                closeCardPanel();
            }
        });
};

// Opens the info panel.
export function openCardPanel() {
    d3.select("#graph-container")
        .transition()
            .style("width", "60%")

    d3.select("#card-panel-arrow").classed("left", false).classed("right", true);
}

// Closes the info panel.
export function closeCardPanel() {
    d3.select("#graph-container")
        .transition()
            .style("width", "100%")
    
    d3.select("#card-panel-arrow").classed("left", true).classed("right", false);

    clearCardPanel();
}

// Populates the info panel.
export function populateCardPanel(node, dom=true) {
    clearCardPanel();

    if (dom) {
        var node = d3.select(node).data()[0]
    }
    
    if (node.type == "0") { // claim
        var nodeType = "claim", neighborType = "document"
    } else if (node.type == "1") { // document
        var nodeType = "document", neighborType = "evidence"
    } else if (node.type == "2") { // evidence
        var nodeType = "evidence", neighborType = "evidence"
    } else if (node.type == "3") {
        var nodeType = "author", neighborType = "author"
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
            var label = linkType[getAttrBetween(d, node, "label")]
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
                    populateCardPanel(d, false);
                })
        })

    setTimeout(showCardPanel, 250)
}

// Clears the info panel.
export function clearCardPanel() {
    d3.select("#info-panel").html("")
}

// Moves the card highlight to element
function moveHighlight(element) {
    d3.select(".card-selected")
        .classed("card-selected", false)

    d3.select(element)
        .classed("card-selected", true)
}

// Gets the height of the highest div of class "cls".
function getClassHighest(cls) {
    var highest = 0;
    d3.selectAll(cls)
        .each(function() {
            highest = Math.max(highest, parseFloat(window.getComputedStyle(this).height))
        })
    return highest
}

// Displays the info panel.
function showCardPanel() {
    var highest = getClassHighest(".card")

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
