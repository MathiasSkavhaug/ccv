import { updateWeightedVote } from "./cardPanel.js";
import { ticked } from "./graphInit.js";
import { getWeights } from "./graphParameterPanel.js";
import { getAttrBetween, getLinkBetween, getNeighborsOfType, getSubGraphs, getNodesWithIds } from "./graphTraversal.js"
import { scaleValues } from "./util.js";

// Retrieves the parameters and runs SRWR.
export function startSRWR() {
    var params = getParameters();
    runSRWR(params.c, params.theta, params.mu, params.beta, params.gamma, params.epsilon, params.delay);
};

// Retrives the SRWR parameters from the sliders.
function getParameters() {
    var weights = getWeights("#SRWR-sliders");
    return {"c": weights[0], "theta": weights[1], "mu": weights[2], "beta": weights[3], "gamma": weights[4], "epsilon": weights[5], "delay": 1000*weights[6]}
};

// Runs the modified SRWR algorithm on the evidence nodes only graph.
// c: restart probability of the surfer.
// theta: certainty of "the friend of my friend is my friend"
// mu: certainty of "the friend of my enemy is my enemy"
// beta: certainty of "the enemy of my enemy is my friend"
// gamma: certainty of "the enemy of my friend is my enemy"
// epsilon: error threshold.
export function runSRWR(c = 0.5, theta = 1, mu = 1, beta = 0.5, gamma = 0.9, epsilon = 0.01, delay = 0, subGraphs, subGraphRs) {
    var m = math.multiply, dm = math.dotMultiply, t = math.transpose, a = math.add, s = math.subtract;

    distributeDocScores();
    
    if (typeof subGraphs === "undefined") {
        var evidences = d3.selectAll(".node.evidence").data().map(function(d) {return d.id});
        var subGraphs = getSubGraphs(evidences);
    }
    
    var subGraphScoresTimeline = [];
    subGraphs.forEach(function(subGraph, i) {
        var scoresTimeline = [];
        var subGraphSum = math.sum(getNodesWithIds(subGraph).data().map(n => n.size))
        
        var scores = getNormalizedSubGraphScores(subGraph)
        var initialImportance = math.matrix(structuredClone(scores)).resize([subGraph.length, 1]);
        scoresTimeline.push(scores)
        
        // Only do computation if sub-graph size is greater than 1.
        if (subGraph.length !== 1) {
            if (typeof subGraphRs === "undefined") {
                var A = getSignedAdjacencyMatrix(subGraph);
                var r = getSemiRowNormalizedMatrices(A);
            } else {
                var r = subGraphRs[i]
            }
            var APos = r.APos
            var ANeg = r.ANeg
            
            var rP = initialImportance
            var rN = math.matrix().resize([subGraph.length,1])
            var rMark = math.concat(rP, rN, 0)
            
            var delta;
            var counter = 0;
            do {
                rP = a(dm((1 - c), a(dm(theta, m(t(APos), rP)), a(dm((1-mu), m(t(ANeg), rP)), a(dm(beta, m(t(ANeg), rN)), dm((1-gamma), m(t(APos), rN)))))), dm(c, initialImportance))
                rN =   dm((1 - c), a(dm((1-theta), m(t(APos), rP)), a(dm(mu, m(t(ANeg), rP)), a(dm((1-beta), m(t(ANeg), rN)), dm(gamma, m(t(APos), rN))))))
                r = math.concat(rP, rN, 0)
                delta = math.norm(s(r, rMark), 1)
                rMark = r;
                scoresTimeline.push(t(s(rP, rN))._data[0])
                
                counter += 1
                // Does not converge.
                if (counter == 50) {
                    scoresTimeline.push(Array(subGraph.length).fill(null).map(() => 1/subGraph.length))
                    break;
                }
                
            } while (delta > epsilon);
        }
        
        scoresTimeline = scoresTimeline.map(function(s) {
            var scaled = scaleValues(s, 0, 1);
            var sum = math.sum(scaled)
            s = scaled.map(v => (sum != 0) ? v/sum : 1/s.length);
            return getUnnormalizedSubGraphScores(s, subGraphSum);
        });
        
        subGraphScoresTimeline.push(scoresTimeline);
    });
    
    updateNodeSizes(subGraphScoresTimeline, subGraphs, delay);
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
    // Make sure graph is updated.
    ticked();
};

// Retrieves the normalized node scores for the sub-graph.
function getNormalizedSubGraphScores(subGraph) {
    var scores = getNodesWithIds(subGraph).data().map(n => n.size)
    if (math.sum(scores == 0)) {scores = scores.map(s => 1)}
    return scores.map(s => s/math.sum(scores))
}

// Retrieves the unnormalized node scores for the sub-graph.
function getUnnormalizedSubGraphScores(scores, subGraphSum) {
    return scores.map(s => s*subGraphSum)
}

// Retrieves the signed adjacency matrix for the graph consisting of "nodes".
export function getSignedAdjacencyMatrix(nodes) {
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
                        if (link["label"] == "false") {
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
export function getSemiRowNormalizedMatrices(A) {
    var D = math.sum(math.abs(A),1)
    var invD = math.inv(math.diag(D))
    var RNA = math.multiply(invD, A)
    var RNAP = RNA.map(function(e) {return (e > 0) ? e : 0})
    var RNAN = RNA.map(function(e) {return (e < 0) ? math.abs(e) : 0})
    return {"APos": RNAP, "ANeg": RNAN};
}

// Combine each document's rationales(s)'s score(s) into document score.
function collectDocScores() {
    d3.selectAll(".node.document")
        .each(function(doc) {
            var evidences = getNeighborsOfType(doc, "evidence");

            // No rationales, keep current size.
            if (evidences.data().length == 0) {
                return;
            }

            var newSize = 0;
            evidences
                .each(function(evi) {
                    newSize += evi.size
                });
            doc.size = newSize
        });
    // Make sure graph is updated.
    ticked();
}

// Updates the size of the evidence nodes.
function updateEvidenceSize(subGraphScores, subGraphs) {
    subGraphScores.forEach(function(scores,i) {
        getNodesWithIds(subGraphs[i])
            .each(function(d, j) {
                d.size = scores[j]
            });
    });
    // Make sure graph is updated.
    ticked();
}

// Moves one step ahead in the SRWR score timeline every WaitTime ms.
// For each step, updates the node sizes accordingly.
// Once all steps are complete, updates document node sizes.
function updateNodeSizes(subGraphScoresTimeline, subGraphs, waitTime = 0) {
    const timer = ms => new Promise(res => setTimeout(res, ms))

    async function updateSize() {
        for (let i = 0; i < math.max(subGraphScoresTimeline.map(sg => sg.length)); i++) {
            subGraphScoresTimeline.forEach(function(sg) {
                if (sg[i] === undefined) {
                    sg.push(sg[i-1])
                }
            });

            var subGraphScores = subGraphScoresTimeline.map(sg => sg[i])
            updateEvidenceSize(subGraphScores, subGraphs)
            await timer(waitTime);
        }
        collectDocScores();
        updateWeightedVote();
    }

    // No need to be async if no delay
    if (waitTime == 0) {
        var subGraphScores = subGraphScoresTimeline.map(sg => sg.pop())
        updateEvidenceSize(subGraphScores, subGraphs)
        collectDocScores();
        updateWeightedVote();
    } else {
        updateSize();
    }
}