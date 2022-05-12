import { calcMajorityVote, calcWeightedVote } from "./cardPanel.js";
import { addAllNodes, startUpdates, stopUpdates } from "./graphInit.js";
import { runSRWR } from "./graphSRWR.js";
import { setGraph } from "./main.js";
import { resetGraph } from "./util.js";

// Calculates the result of the algorithm for many different parameter combinations.
export async function gridCalc() {
    stopUpdates();

    var claims = d3.selectAll("#search-bar > option").data().map(o => o.join(","));
    
    for (var i=0; i<claims.length; i++) {        
        resetGraph();
        setGraph("/search?claim="+encodeURIComponent(claims[i]), addAllNodes);
        await new Promise(r => setTimeout(r, 2000));
        
        var rows = [["claimID", "c", "theta", "mu", "beta", "gamma", "majority", "weighted", "weightedAfterAlgorithm"]];

        var majorityVote = calcMajorityVote().toFixed(3);
        var weightedVote = calcWeightedVote().toFixed(3);
        for (let params of parameterCombinationGenerator()) {
            runSRWR(params.c, params.theta, params.mu, params.beta, params.gamma, params.epsilon, params.delay);
            rows.push([i, params.c, params.theta, params.mu, params.beta, params.gamma, majorityVote, weightedVote, calcWeightedVote().toFixed(3)])
        }
        
        saveAs(new Blob([rows.map(e => e.join(",")).join("\n")], {type: "text/plain;charset=utf-8"}), `Claim_${i}.csv`);
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