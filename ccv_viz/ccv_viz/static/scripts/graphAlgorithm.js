import { getAttrBetween, getNeighborsOfType } from "./graphTraversal.js"

export function graphAlgorithmInit() {
    iterate(); // tmp
};

var dampingFactor = 0.85;

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