import { getNeighborsOfType, getAttrBetween, getNodesWithIds } from "./graphTraversal.js"
import { nodeHighlight, setLastClicked } from "./graphInteraction.js"
import { linkType } from "./graphInit.js"

export function cardPanelInit() {
    d3.select("#card-panel-arrow")
        .on("click", function() {
            if (d3.select("#card-panel-arrow").classed("left")) {
                openCardPanel();
            } else {
                closeCardPanel(false);
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
export function closeCardPanel(clear=true) {
    d3.select("#graph-container")
        .transition()
            .style("width", "100%")
    
    d3.select("#card-panel-arrow").classed("left", true).classed("right", false);

    if (clear) {
        clearCardPanel();
    }
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

    var div = d3.select("#info-panel").append("div")
    var card = appendCard(div, node, nodeType)
    card
        .classed("top", true)
        .classed("card-selected", true)

    d3.select("#info-panel")
        .append("hr")
            
    d3.select("#info-panel")
        .append("div")
            .attr("id", "evidence-container")
            
    evidences
        .each(function(d) {
            var div = d3.select("#evidence-container").append("div")
            appendCard(div, d, neighborType)
        })

    populateCards();

    setTimeout(showCardPanel, 250)
}

function appendCard(div, node, type) {
    if (["evidence", "document"].includes(type)) {
        if (type == "document") {
            var probNode = getNeighborsOfType(node, "claim").data()[0];
        } else if (type == "evidence") {
            var probNode = getNeighborsOfType(node, "document").data()[0];
        }
        var label = linkType[getAttrBetween(node, probNode, "label")];
    }

    div
        .classed("card", true)
        .classed(type, true)
        .classed(label, (["evidence", "document"].includes(type)))
        .on("click", function() {
            d3.event.stopPropagation();
            nodeHighlight(node);
            moveHighlight(this);
        })
        .on("dblclick", function() {
            d3.event.stopPropagation();
            getNodesWithIds([node.id]).dispatch("click")
        })
        .attr("node-id", node.id)

        return div
}

// Fills the cards with information.
function populateCards() {
    d3.selectAll(".card")
        .each(function() {
            var card = d3.select(this);
            var node = d3.selectAll(".node")
                .filter(function(d) {return d.id == card.attr("node-id")})
            var nodeData = node.data()[0]
            
            card
                .append("div")
                    .html(nodeData.text)

            if (node.classed("claim")) {return}
                        
            if (node.classed("document") || node.classed("evidence")) {
                var metadata = card.append("div").classed("metadata", true)

                if (node.classed("document")) {
                    metadata
                        .append("div")
                        .classed("card-link", true)
                        .append("a")
                            .attr("href", "http://api.semanticscholar.org/corpusid:"+nodeData.id)
                            .html("Open in Semantic Scholar")

                    metadata
                        .append("div")
                            .classed("card-authors", true)
                            .html(nodeData.authors)
                            
                    metadata
                        .append("div")
                            .classed("card-date-and-journal", true)
                            .html(nodeData.date +", "+ nodeData.journal)
                }

                if (node.classed("document")) {
                    var linkNodeData = getNeighborsOfType(nodeData, "claim").data()[0]
                    var prob = getAttrBetween(nodeData, linkNodeData, "width")
                } else {
                    var linkNodeData = getNeighborsOfType(nodeData, "document").data()[0]
                    var prob = getAttrBetween(nodeData, linkNodeData, "width")
                }

                metadata
                    .append("div")
                        .classed("card-score", true)
                        .html(prob.toFixed(3))
            }
        })
};

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
