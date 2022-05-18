import { updateWeightedVote } from "./cardPanel.js";
import { addLink, removeLink, ticked } from "./graphInit.js";
import { originalGraph } from "./main.js";
import { resetNodeSize, scaleMatrix, scaleValues } from "./util.js";

export function graphParameterPanelInit() {
    createParameterPanelImportance();
    createParameterPanelSRWR();
    createParameterPanelFilter();
};

//Appends a slider to target with name "name" and initial value "initialValue".
function appendSlider(target, slider, callback) {
    // Displays the value of the slider
    var value = d3.select(target)
        .append("div")
        .classed("slider-value", true);

    // The slider
    d3.select(target)
        .append("input")
        .classed("slider-slider", true)
        .attr("type", "range")
        .attr("min", slider.min)
        .attr("max", slider.max)
        .attr("step", slider.step)
        .attr("value", slider.value)
        .each(function() {
            value.html(parseFloat(d3.select(this).node().value).toFixed(3));
        })
        .on("input", function() {
            value.html(parseFloat(d3.select(this).node().value).toFixed(3));
            callback();
        })

    // Displays the attribute name for the slider
    d3.select(target)
        .append("div")
        .classed("slider-name", true)
        .html(slider.name);
}

// Creates the importance parameter panel.
function createParameterPanelImportance() {
    // If already instantiated, return.
    if (d3.select("#importance-sliders").data().length !== 0) { return }

    var sliders = [
        {"name": "Document citation count", "value": 0.5, "min": 0, "max": 1, "step": 0.0001},
        {"name": "Document influential citation count", "value": 0.5, "min": 0, "max": 1, "step": 0.0001},
        {"name": "Author paper counts", "value": 0.5, "min": 0, "max": 1, "step": 0.0001}, 
        {"name": "Author citation counts", "value": 0.5, "min": 0, "max": 1, "step": 0.0001}, 
        {"name": "Author h-indices", "value": 0.5, "min": 0, "max": 1, "step": 0.0001}, 
        {"name": "Publish date", "value": 0.5, "min": 0, "max": 1, "step": 0.0001}, 
    ];

    var panel = d3.select("#parameter-panel")
        .append("div")
        .classed("panel-sliders", true)
        .attr("id", "importance-sliders")
    
    panel
        .append("div")
        .classed("parameter-panel-title", true)
        .html("Weights used in node size weighted average");

    sliders.forEach(function(s) {
        panel
            .append("div")
            .classed("slider", true)
            .each(function() {appendSlider(this, s, updateNodeSize)});
    });
};

// Creates the SRWR parameter panel.
function createParameterPanelSRWR() {
    // If already instantiated, return.
    if (d3.select("#SRWR-sliders").data().length !== 0) { return }

    var sliders = [
        {"name": "Restart probability of the surfer (c)", "value": 0.5, "min": 0, "max": 1, "step": 0.0001},
        {"name": "Certainty of \"the friend of my friend is my friend\" (theta)", "value": 1, "min": 0, "max": 1, "step": 0.0001},
        {"name": "Certainty of \"the friend of my enemy is my enemy\" (mu)", "value": 1, "min": 0, "max": 1, "step": 0.0001},
        {"name": "Certainty of \"the enemy of my enemy is my friend\" (beta)", "value": 0.8, "min": 0, "max": 1, "step": 0.0001},
        {"name": "Certainty of \"the enemy of my friend is my enemy\" (gamma)", "value": 0.8, "min": 0, "max": 1, "step": 0.0001},
        {"name": "Error threshold (epsilon)", "value": 0.01, "min": 0.001, "max": 1, "step": 0.0001},
        {"name": "Animation step delay (seconds)", "value": 0, "min": 0, "max": 1, "step": 0.0001},
    ];

    var panel = d3.select("#parameter-panel")
        .append("div")
        .classed("panel-sliders", true)
        .attr("id", "SRWR-sliders")
    
    panel
        .append("div")
        .classed("parameter-panel-title", true)
        .html("Parameters used in the SRWR algorithm");

    sliders.forEach(function(s) {
        panel
            .append("div")
            .classed("slider", true)
            .each(function() {appendSlider(this, s, updateNodeSize)});
    });
}

// Creates the graph filtering parameter panel.
function createParameterPanelFilter() {
    // If already instantiated, return.
    if (d3.select("#filter-sliders").data().length !== 0) { return }

    var sliders = [
        {"name": "Evidence-evidence link minimum weight", "value": 0, "min": 0, "max": 1, "step": 0.0001},
        {"name": "Evidence-evidence link minimum sentence probability", "value": 0, "min": 0, "max": 1, "step": 0.0001},
        {"name": "Evidence-evidence link must be bidirectional", "value": 0, "min": 0, "max": 1, "step": 1},
    ];

    var panel = d3.select("#parameter-panel")
        .append("div")
        .classed("panel-sliders", true)
        .attr("id", "filter-sliders")
    
    panel
        .append("div")
        .classed("parameter-panel-title", true)
        .html("Filters applied to graph");

    sliders.forEach(function(s) {
        panel
            .append("div")
            .classed("slider", true)
            .each(function() {appendSlider(this, s, filterGraph)});
    });
};

// Opens the parameter panel
export function openParameterPanel() {
    d3.select("#graph-parameter-panel-container")
        .transition()
        .duration(250)
        .style("height", "35%");
};

// Closes the parameter panel
export function closeParameterPanel() {
    d3.select("#graph-parameter-panel-container")
        .transition()
        .duration(250)
        .style("height", "0%");
};

// Retrieves the slider weights
export function getWeights(panelID) {
    var weights = []
    d3.selectAll(panelID+" .slider-slider")
        .each(function() {
            weights.push(d3.select(this).node().value);
        });
    return weights
}

// Updates document and author node sizes according to the slider weights.
export function updateNodeSize() {
    var weights = getWeights("#importance-sliders");
    updateDocSize(weights);
    updateAutSize(weights.slice(2,5));
    
    d3.select("#option-algorithm").classed("option-selected", false);
    resetNodeSize(".node.evidence");

    // Make sure graph is updated
    ticked();
}

// Updates the size of nodes of type "type" according to the weights.
export function updateSize(type, weights) {
    weights = weights.map(w => w/weights.length)
    var values = []
    d3.selectAll(".node."+type)
        .each(function(d) {
            values.push(d.sizeRaw)
        });

    // Return if no nodes of type "type" was found
    if (values.length == 0) {return}

    values = scaleMatrix(math.matrix(values));
    values = math.multiply(values, weights);
    values = scaleValues(values._data, 0, 1);

    d3.selectAll(".node."+type)
        .each(function(d,i) {
            d.size = values[i];
        });
}

// Updates document node sizes according to the weights.
function updateDocSize(weights) {
    updateSize("document", weights);
    updateWeightedVote();
}

// Updates author node sizes according to the the weights.
function updateAutSize(weights) {
    updateSize("author", weights);
}

// Filters the graph based on the filter parameters.
export function filterGraph() {
    function isFiltered(l) {
        var weights = getWeights("#filter-sliders")
        var thresholds = {
            "labelProb": weights[0],
            "sentProb": weights[1],
            "bidirectional": weights[2],
        }

        var filter = false;
        if (l.width < thresholds.labelProb) {
            filter = true;
        } else if (l.sentProb < thresholds.sentProb) {
            filter = true;
        } else if (l.bidirectional < thresholds.bidirectional) {
            filter = true;
        }
        return filter
    }
    
    originalGraph.links
        .filter(l => l.target.includes("_") && l.source.includes("_"))
        .forEach(l => {
            var present = d3.selectAll(".link").data().filter(d => d.target.id == l.target && d.source.id == l.source)
            if (isFiltered(l)) {
                // Only remove if present.
                if (present.length == 1) {
                    removeLink(l.target, l.source)
                };
            } else {
                // Only add if not present.
                if (present.length == 0) {
                    addLink(l.target, l.source)
                };
            }
        });
};