import { ticked } from "./graphInit.js";
import { scaleMatrix, scaleValues } from "./util.js";

export function graphParameterPanelInit() {
    // If already instantiated, return.
    if (d3.select("#parameter-panel").node().hasChildNodes()) { return }

    var sliderNames = [
        "Publish date", 
        "Author h-indices", 
        "Author citation counts", 
        "Author paper counts", 
        "Document influential citation count",
        "Document citation count",
    ];

    d3.select("#parameter-panel")
        .append("div")
        .attr("id", "parameter-panel-title")
        .html("Weights used in node size weighted average");

    [1,1,1,1,1,1].forEach(function() {
        d3.select("#parameter-panel")
            .append("div")
            .classed("slider", true)
            .each(function() {
                // Displays the value of the slider
                var value = d3.select(this)
                    .append("div")
                    .classed("slider-value", true);

                // Is the slider
                d3.select(this)
                    .append("input")
                    .classed("slider-slider", true)
                    .attr("type", "range")
                    .attr("min", 0)
                    .attr("max", 1)
                    .attr("step", 0.001)
                    .attr("value", 0.5)
                    .each(function() {
                        value.html(parseFloat(d3.select(this).node().value).toFixed(3));
                    })
                    .on("input", function() {
                        value.html(parseFloat(d3.select(this).node().value).toFixed(3));
                        updateNodeSize();
                    })

                // Displays the attribute name for the slider
                d3.select(this)
                    .append("div")
                    .classed("slider-name", true)
                    .html(sliderNames.pop());
            });
    });
};

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
function getWeights() {
    var weights = []
    d3.selectAll(".slider-slider")
        .each(function() {
            weights.push(d3.select(this).node().value/100);
        });
    return weights
}

// Updates document and author node sizes according to the slider weights.
export function updateNodeSize() {
    var weights = getWeights();
    updateDocSize(weights);
    updateAutSize(weights.slice(2,5));
    
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