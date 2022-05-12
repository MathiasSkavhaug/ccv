import { getNeighborsOfType, getAttrBetween, getNodesWithIds, getNodeLinks } from "./graphTraversal.js"
import { nodeHighlight } from "./graphInteraction.js"

var weightedVote, weightedVoteAlgo;

export function cardPanelInit() {
    d3.select("#card-panel-arrow")
        .on("click", function() {
            if (d3.select("#card-panel-arrow").classed("left")) {
                openCardPanel();
            } else {
                closeCardPanel(false);
            }
        });

    new ResizeObserver(resizeCardPanel).observe(d3.select("#card-container").node());

    updateWeightedVote();
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
    
    if (node.type == "claim") {
        var nodeType = "claim", neighborType = "document"
    } else if (node.type == "document") {
        var nodeType = "document", neighborType = "evidence"
    } else if (node.type == "evidence") {
        var nodeType = "evidence", neighborType = "evidence"
    } else if (node.type == "author") {
        var nodeType = "author", neighborType = "author"
    }
        
    var evidences = getNeighborsOfType(node, neighborType)

    if (nodeType == "document") {
        var probNode = getNeighborsOfType(node, "claim").data()[0];
    } else if (nodeType == "evidence") {
        var probNode = getNeighborsOfType(node, "document").data()[0];
    }

    var div = d3.select("#card-panel").append("div")
    appendCard(div, node, probNode, nodeType)
        .classed("top", true)
        .classed("card-selected", true)

    d3.select("#card-panel")
        .append("hr")
            
    d3.select("#card-panel")
        .append("div")
            .attr("id", "evidence-container")
            
    if (nodeType == "claim") {
        evidences = evidences.sort((a,b) => d3.descending(new Date(a.date), new Date(b.date)))
    }

    evidences
        .each(function(d) {
            var div = d3.select("#evidence-container").append("div")
            appendCard(div, d, node, neighborType)
        })

    populateCards();
    resizeCardPanel();
}

// Appends the card associated with node "node" of type "type" to div "div".
function appendCard(div, node, probNode, type) {
    if (["evidence", "document"].includes(type)) {
        var label = getAttrBetween(node, probNode, "label");
    }

    div
        .classed("card", true)
        .classed(type, true)
        .classed(label, (["evidence", "document"].includes(type)))
        .on("click", function() {
            d3.event.stopPropagation();
            nodeHighlight(node);
            moveHighlight(this);
            resizeCardPanel();
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

            if (node.classed("claim")) {
                var div = card.append("div").classed("predictions", true)
                div.append("div").html("<span>Majority Vote:</span>"+getMajorityVote())
                div.append("div").html("<span>Weighted Average:</span>"+weightedVote)
                div.append("div").html("<span>SRWR:</span>"+weightedVoteAlgo)
                return
            }
                        
            if (node.classed("document") || node.classed("evidence")) {
                var metadata = card.append("div").classed("metadata", true)

                if (node.classed("document")) {
                    var div = metadata.append("div")
                    div
                        .append("div")
                        .classed("card-link", true)
                        .on("click", function() {
                            d3.event.stopPropagation();
                        })
                        .append("a")
                            .attr("href", "https://api.semanticscholar.org/corpusid:"+nodeData.id)
                            .attr("target", "_blank")
                            .html("Open in Semantic Scholar")

                    div
                        .append("div")
                            .classed("card-authors", true)
                            .html(nodeData.authors)
                            
                    div
                        .append("div")
                            .classed("card-journal", true)
                            .html(nodeData.journal)

                    div
                        .append("div")
                            .classed("card-date", true)
                            .html(nodeData.date)

                } else {
                    // Dummy div
                    metadata.append("div")
                }

                var topNode = getNodesWithIds([d3.select(".card.top").attr("node-id")]).data()[0]
                if (nodeData.id == topNode.id) {
                    if (node.classed("document")) {
                        var topNode = getNeighborsOfType(nodeData, "claim").data()[0]
                    } else {
                        var topNode = getNeighborsOfType(nodeData, "document").data()[0]
                    }
                }
                var prob = getAttrBetween(nodeData, topNode, "width")
                
                metadata
                    .append("div")
                        .classed("card-score", true)
                        .html(prob.toFixed(3) + (typeof sentProb !== "undefined" ? "|"+sentProb.toFixed(3) : ""))
            }
        })
};

// Clears the info panel.
export function clearCardPanel() {
    d3.select("#card-panel").html("")
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

// Makes the cards equal size.
function resizeCardPanel() {
    var prevHighest = getClassHighest(".card")

    // Allow cards to expand/shrink
    d3.selectAll((".card"))
        .style("height", null)

    var highest = getClassHighest(".card")

    d3.selectAll((".card"))
        .style("height", prevHighest+"px")
        .transition()
        .duration(10)
        .style("height", highest+"px")
}

// Returns prediction of claim veracity based on majority vote.
function getMajorityVote() {
    var mean = calcMajorityVote();
    var label = (mean > 0 ? "True" : "False");
    return "<span class='"+label.toLowerCase()+"'>" + label + " " + "("+mean.toFixed(3)+")" + "</span>";
};

// Calculates majority vote.
export function calcMajorityVote() {
    var votes = [];
    getNodeLinks(d3.select(".node.claim").data()[0])
        .each(function(d) {
            votes.push(d.label == "true" ? 1 : -1)
        });
    return math.mean(votes);
}

// Returns prediction of claim veracity based on weighted vote.
function getWeightedVote() {
    var mean = calcWeightedVote();
    var label = (mean > 0 ? "True" : "False");
    return "<span class='"+label.toLowerCase()+"'>" + label + " " + "("+mean.toFixed(3)+")" + "</span>";
};

// Calculates weighted vote.
export function calcWeightedVote() {
    var votes = [];
    getNodeLinks(d3.select(".node.claim").data()[0])
        .each(function(l) {
            var d = (l.target.id == "Claim" ? l.source : l.target)
            votes.push(l.label == "true" ? d.size : -d.size)
        });
    return math.mean(votes);
}

// Updates the correct prediction.
export function updateWeightedVote() {
    if (d3.select("#option-algorithm").classed("option-selected")) {
        weightedVoteAlgo = getWeightedVote();
        if (!d3.select(".card.claim.top").empty()) {
            d3.select(".predictions>div:nth-child(3)").html("<span>SRWR:</span>"+weightedVoteAlgo);
        };
    } else {
        weightedVote = getWeightedVote();
        weightedVoteAlgo = "Not run"
        if (!d3.select(".card.claim.top").empty()) {
            d3.select(".predictions>div:nth-child(2)").html("<span>Weighted Average:</span>"+weightedVote);
            d3.select(".predictions>div:nth-child(3)").html("<span>SRWR:</span>"+weightedVoteAlgo);
        };
    };
};