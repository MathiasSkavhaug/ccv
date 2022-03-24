import { reheatSimulation, coolSimulation } from "./graphInit.js";
import { getAttrBetween, getLinkBetween, getNeighborsOfType } from "./graphTraversal.js"
import { scaleValue } from "./util.js";

export function graphAlgorithmInit() {
    var m = getWeightedAdjacencyMatrix();
    var p = []
    
    var numNodes = d3.selectAll(".node.evidence").data().length
    d3.selectAll(".node.evidence")
    .each(function() {
            p.push(1/numNodes)
        });
        
    test(p, m);
};

var counter = 0

function test(p, m) {
    counter++
    updateEvidenceNodeScore(p);
    
    var n = math.exp(math.dotMultiply(1/0.5, math.multiply(math.transpose(m), p)))
    p = math.divide(n,math.norm(n,1))

    if (counter < 10) {
        setTimeout(function() {
            test(p, m)
        }, 1000)
    }
}


function iterate() {
    //var graph = structuredClone(graph) // Don't change original graph until after iteration.

    // For every document node, distribute it's score to it's rationale(s).
    d3.selectAll(".node.document")
        .each(function(doc) {
            scoreDocToRationale(doc);
        });

    // Normalize evidence values?
    // What about evidence nodes with no connections?

    // Create a snapshot of evidence nodes.
    var evi_snapshot = structuredClone(d3.select(".node.evidence").data())

    // For every evidence node, calculate interaction effect with other neighboring evidences on score.
    d3.select(".node.evidence")
        .each(function(evi) {
            rationaleInteraction(evi, evi_snapshot);
        });

    // For every document node, combine rationale scores to create new document score.
    d3.selectAll(".node.document")
    .each(function(doc) {
        scoreRationaleToDoc(doc);
    });
};

// Distributes document node's score to it's rationale(s), based on rationale probability.
function scoreDocToRationale(doc) {
    getNeighborsOfType(doc, "evidence")
        .each(function(evi) {
            evi.size = doc.size * getAttrBetween(doc, evi, "width");
        });
};

// Combine document node's rationale(s)'s score(s) into document score.
function scoreRationaleToDoc(doc) {
    var newSize = 0;
    var probSum = 0;

    getNeighborsOfType(doc, "evidence")
        .each(function(evi) {
            var linkProb = getAttrBetween(doc, evi, "width");
            newSize += evi.size;
            probSum += linkProb;
        });
    doc.size = newSize/probSum;
}

// Calculates the effect of other neighboring evidences on the given evidence's score.
function rationaleInteraction(evidence, snapshot) {

};

// Gets the weighted adjacency matrix for evidence nodes.
function getWeightedAdjacencyMatrix() {
    var numNodes = d3.selectAll(".node.evidence").data().length
    var m = Array(numNodes).fill().map(()=>Array(numNodes).fill())
    d3.selectAll(".node.evidence")
        .each(function(evi1,i) {
            d3.selectAll(".node.evidence")
                .each(function(evi2,j) {
                    var link = getLinkBetween(evi1, evi2)
                    var value = 0
                    if (typeof link !== "undefined") {
                        if (link["label"] == 0) {
                            value = -link["width"]
                        } else {
                            value = link["width"]
                        }
                    }
                    m[i][j] = value
                })
        })
    return m
}

function updateEvidenceNodeScore(scores) {
    var minSize = math.min(scores)
    var maxSize = math.max(scores)

    reheatSimulation()
    d3.selectAll(".node.evidence")
        .each(function(d, i) {
            d.size = scaleValue(scores[i], minSize, maxSize, 0, 1)
        });
    coolSimulation()
}