import { ticked } from "./graphInit.js";
import { resetNodeSize, scaleMatrix, scaleValues } from "./util.js";

var active = 0;

export function graphParameterPanelInit() {
    createParameterPanelImportance();
    createParameterPanelSRWR();
    cycleActive();

    d3.select("#parameter-panel-arrow")
        .on("click", function() {
            cycleActive();
        });
};

// Cycles which parameter panel is currently displayed.
function cycleActive() {
    d3.select("#graph-parameter-panel-container")
        .transition()
        .duration(250)
        .style("height", "0px")
        .on("end", function() {
            d3.selectAll(".panel-sliders")
                .style("display", "none");
        
            var panel;
            switch (active) {
                case 0:
                    panel = "#importance-sliders";
                    active = 1;
                    break;
                case 1:
                    panel = "#SRWR-sliders";
                    active = 0;
                    break;
            }
        
            d3.select(panel)
                .style("display", "block");

            if (d3.select("#option-slider").classed("option-selected")) {
                d3.select(this)
                    .transition()
                    .duration(250)
                    .style("height", d3.select("#parameter-panel").style("height"));
            };
        });
}

//Appends a slider to target with name "name" and initial value "initialValue".
function appendSlider(target, slider) {
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
        .attr("step", 0.0001)
        .attr("value", slider.value)
        .each(function() {
            value.html(parseFloat(d3.select(this).node().value).toFixed(3));
        })
        .on("input", function() {
            value.html(parseFloat(d3.select(this).node().value).toFixed(3));
            updateNodeSize();
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
        {"name": "Document citation count", "value": 0.5, "min": 0, "max": 1},
        {"name": "Document influential citation count", "value": 0.5, "min": 0, "max": 1},
        {"name": "Author paper counts", "value": 0.5, "min": 0, "max": 1}, 
        {"name": "Author citation counts", "value": 0.5, "min": 0, "max": 1}, 
        {"name": "Author h-indices", "value": 0.5, "min": 0, "max": 1}, 
        {"name": "Publish date", "value": 0.5, "min": 0, "max": 1}, 
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
            .each(function() {appendSlider(this, s)});
    });
};

// Creates the SRWR parameter panel.
function createParameterPanelSRWR() {
    // If already instantiated, return.
    if (d3.select("#SRWR-sliders").data().length !== 0) { return }

    var sliders = [
        {"name": "Restart probability of the surfer (c)", "value": 0.5, "min": 0, "max": 1},
        {"name": "Uncertainty of \"the enemy of my enemy is my friend\" (beta)", "value": 0.8, "min": 0, "max": 1},
        {"name": "Uncertainty of \"the friend of my enemy is my enemy\" (gamma)", "value": 0.8, "min": 0, "max": 1},
        {"name": "Delta threshold (epsilon)", "value": 0.01, "min": 0.001, "max": 1},
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
            .each(function() {appendSlider(this, s)});
    });
}

// Opens the parameter panel
export function openParameterPanel() {
    d3.select("#graph-parameter-panel-container")
        .transition()
        .duration(250)
        .style("height", d3.select("#parameter-panel").style("height"));
};

// Closes the parameter panel
export function closeParameterPanel() {
    d3.select("#graph-parameter-panel-container")
        .transition()
        .duration(250)
        .style("height", "0px");
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
function updateSize(type, weights) {
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
}

// Updates author node sizes according to the the weights.
function updateAutSize(weights) {
    updateSize("author", weights);
}