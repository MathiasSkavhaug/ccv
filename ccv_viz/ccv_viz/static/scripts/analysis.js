import { calcMajorityVote, calcWeightedVote } from "./cardPanel.js";
import { addAllNodes, startUpdates, stopUpdates } from "./graphInit.js";
import { updateNodeSize, updateSize } from "./graphParameterPanel.js";
import { getSemiRowNormalizedMatrices, getSignedAdjacencyMatrix, runSRWR } from "./graphSRWR.js";
import { getSubGraphs } from "./graphTraversal.js";
import { setGraph } from "./main.js";
import { resetGraph } from "./util.js";

// Calculates the result of the algorithm for many different parameter combinations.
export async function gridCalc() {
    stopUpdates();

    var claims = d3.selectAll("#search-bar > option").data().map(o => o.join(","));
    
    for (var i=0; i<claims.length; i++) {        
        console.time('claim time');

        resetGraph();
        setGraph("/search?claim="+encodeURIComponent(claims[i]), addAllNodes);
        await new Promise(r => setTimeout(r, 5000));
        
        var rows = [["claimID", "c", "theta", "mu", "beta", "gamma", "majority", "weighted", "weightedAfterAlgorithm"]];

        var majorityVote = calcMajorityVote().toFixed(3);
        var weightedVote = calcWeightedVote().toFixed(3);
        var evidences = d3.selectAll(".node.evidence").data().map(function(d) {return d.id});
        var subGraphs = getSubGraphs(evidences);
        var subGraphRs = subGraphs.map(function(sg) {
            if (sg.length == 1) {return "NA";};
            var A = getSignedAdjacencyMatrix(sg);
            var r = getSemiRowNormalizedMatrices(A);
            return r
        })
            
        for (let params of parameterCombinationGenerator()) {
            runSRWR(params.c, params.theta, params.mu, params.beta, params.gamma, params.epsilon, params.delay, subGraphs, subGraphRs);
            rows.push([i, params.c, params.theta, params.mu, params.beta, params.gamma, majorityVote, weightedVote, calcWeightedVote().toFixed(3)])
            updateNodeSize();
        }
        
        saveAs(new Blob([rows.map(e => e.join(",")).join("\n")], {type: "text/plain;charset=utf-8"}), `Claim_${i}.csv`);

        console.timeEnd('claim time');
    };

    startUpdates();
};

// Returns the SRWR algorithm parameter combinations to run.
function* parameterCombinationGenerator() {
    for (var c=0; c<=10; c+=1) {
        for (var theta=0; theta<=5; theta+=1) {
            for (var mu=0; mu<=5; mu+=1) {
                for (var beta=0; beta<=5; beta+=1) {
                    for (var gamma=0; gamma<=5; gamma+=1) {
                        yield {
                            "c": (c*0.10).toFixed(3), 
                            "theta": (theta*0.20).toFixed(3), 
                            "mu": (mu*0.20).toFixed(3), 
                            "beta": (beta*0.20).toFixed(3), 
                            "gamma": (gamma*0.20).toFixed(3), 
                            "epsilon": 0.01, 
                            "delay": 0,
                        };
                    };
                };
            };
        };  
    };
};

// Calculates the result of the the weighted vote for many different importance weight combinations.
export async function gridCalcInitialImportance() {
    stopUpdates();

    var claims = d3.selectAll("#search-bar > option").data().map(o => o.join(","));
    
    for (var i=0; i<claims.length; i++) {        
        console.time('claim time');

        resetGraph();
        setGraph("/search?claim="+encodeURIComponent(claims[i]), addAllNodes);
        await new Promise(r => setTimeout(r, 5000));
        
        var rows = [["claimID", "document_citation_count", "document_influential_citation_count", "author_paper_counts", "author_citation_counts", "author_h_indices", "publish_date", "majority", "weighted"]];

        var majorityVote = calcMajorityVote().toFixed(3);
        for (let weights of importanceWeightCombinationGenerator()) {
            updateSize("document", weights);
            var weightedVote = calcWeightedVote().toFixed(3);

            rows.push([i, weights[0], weights[1], weights[2], weights[3], weights[4], weights[5], majorityVote, weightedVote]);
        };

        saveAs(new Blob([rows.map(e => e.join(",")).join("\n")], {type: "text/plain;charset=utf-8"}), `Claim_${i}.csv`);

        console.timeEnd('claim time');
    };

    startUpdates();
};

// Returns the importance weight combinations to run.
function* importanceWeightCombinationGenerator() {
    for (var w1=0; w1<=5; w1+=1) {
        for (var w2=0; w2<=5; w2+=1) {
            for (var w3=0; w3<=5; w3+=1) {
                for (var w4=0; w4<=5; w4+=1) {
                    for (var w5=0; w5<=5; w5+=1) {
                        for (var w6=0; w6<=5; w6+=1) {
                            yield [
                                (w1*0.20).toFixed(3),    
                                (w2*0.20).toFixed(3),    
                                (w3*0.20).toFixed(3),    
                                (w4*0.20).toFixed(3),    
                                (w5*0.20).toFixed(3),    
                                (w6*0.20).toFixed(3),    
                            ];
                        };
                    };
                };
            };
        };
    };
};