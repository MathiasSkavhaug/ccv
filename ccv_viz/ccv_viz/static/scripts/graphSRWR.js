import { getAttrBetween, getLinkBetween, getNeighborsOfType, getSubGraphs, getNodesWithIds } from "./graphTraversal.js"
import { scaleValue, scaleValues } from "./util.js";

// Runs the SRWR algorithm on the evidence nodes only graph.
// beta: parameter for the uncertainty of "the enemy of my enemy is my friend".
// gamma: parameter for the uncertainty of "the friend of my enemy is my enemy".
// epsilon: stopping threshold.
export function runSRWR(beta=0.5, gamma=0.9, epsilon) {
    distributeDocScores();

    var evidences = d3.selectAll(".node.evidence").data().map(function(d) {return d.id});
    var subGraphs = getSubGraphs(evidences);

    var importanceMass = getImportanceMass(subGraphs);
    
    var scores = [];
    subGraphs.forEach(function(subGraph) {
        if (subGraph.length == 1) {return} // No point in doing computations for one node.

        var initialImportance = scaleValues(getNodesWithIds(subGraph).data().map(function(d) {return d.size}))

        var A = getSignedAdjacencyMatrix(subGraph);
        var r = getSemiRowNormalizedMatrices(A);

        var converged = false;
        while (!converged) {
            r = runSRWRIteration(r.APos, r.ANeg, initialImportance, beta, gamma, epsilon);
            converged = r.converged

        };
        scores.push(r.scores)
    });
    
    updateEvidenceSize(scores, importanceMass);

    collectDocScores();
};

// Distributes each document's score to it's rationale(s).
function distributeDocScores() {
    d3.selectAll(".node.document")
        .each(function(doc) {
            var totalLinkProb = 0;
            var evidences = getNeighborsOfType(doc, "evidence");

            evidences
                .each(function(evi) {
                    totalLinkProb += getAttrBetween(doc, evi, "width")
                });
            evidences
                .each(function(evi) {
                    evi.size = doc.size * getAttrBetween(doc, evi, "width")/totalLinkProb;
                });
        });
};

// Gets the sum of importance scores for each sub-graph.
function getImportanceMass(subGraphs) {
    var importanceMass = [];
    subGraphs.forEach(function(subGraph) {
        var mass = 0;
        getNodesWithIds(subGraph)
            .each(function(d) {
                mass += d.size;
            });
        importanceMass.push(mass)
    });
    return importanceMass;
};

// Retrieves the signed adjacency matrix for the graph consisting of "nodes".
function getSignedAdjacencyMatrix(nodes) {
    var numNodes = nodes.length;
    var A = Array(numNodes).fill().map(()=>Array(numNodes).fill());
    var nodes = d3.selectAll(".node").filter(function(d) {return nodes.includes(d.id)})
    nodes
        .each(function(evi1,i) {
            nodes
                .each(function(evi2,j) {
                    var link = getLinkBetween(evi1, evi2);
                    var value = 0;
                    if (typeof link !== "undefined") {
                        if (link["label"] == 0) {
                            value = -link["width"];
                        } else {
                            value = link["width"];
                        };
                    }
                    A[i][j] = value;
                });
        });
    return math.matrix(A);
};

// Retrieves the semi-row normalized matrices A+ and A- from A.
function getSemiRowNormalizedMatrices(A) {
    var D = math.abs(A);
    var semiRowNormA = math.multiply(math.inv(D), A);
    var semiRowNormAPos = semiRowNormA.map(function(e) {return (e > 0) ? e : 0})
    var semiRowNormANeg = semiRowNormA.map(function(e) {return (e < 0) ? e : 0})
    return {"APos":semiRowNormAPos, "ANeg":semiRowNormANeg};
}

// todo: implement
// Runs one iteration of SRWR for the associated sub-graph.
function runSRWRIteration(APos, ANeg, initialImportance, beta, gamma, epsilon) {
    
}

// todo: update
// Combine each document's rationales(s)'s score(s) into document score.
function collectDocScores() {
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

// todo: update
// Updates the size of the evidence nodes.
function updateEvidenceSize(scores, importanceMass) {
    var minSize = math.min(scores)
    var maxSize = math.max(scores)

    d3.selectAll(".node.evidence")
        .each(function(d, i) {
            d.size = scaleValue(scores[i], minSize, maxSize, 0, 1)
        });
    ticked();
}