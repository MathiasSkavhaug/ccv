import { init } from "./main.js"
import { resetGraph } from "./util.js"
import { startSRWR } from "./graphSRWR.js"
import { getNeighborsOfType, getNodesWithIds } from "./graphTraversal.js";
import { updateNodeSize, openParameterPanel, closeParameterPanel } from "./graphParameterPanel.js"

export function graphOptionsBarInit() {
    d3.select("#options-arrow")
        .on("click", toggleOptionsBar)

    d3.select("#option-author")
        .on("click", function() {
            toggleAuthors();
            d3.select(this)
                .classed("option-selected", !d3.select(this).classed("option-selected"));
        });

    d3.select("#option-algorithm")
        .on("click", function() {
            var active = d3.select(this).classed("option-selected")
            d3.select(this).classed("option-selected", !active)
            if (active) {
                // Reset node sizes back to size before algorithm
                updateNodeSize();
            } else {
                // Run algorithm
                startSRWR();
            }
        });

    d3.select("#option-date")
        .on("click", function() {
            var active = d3.select(this).classed("option-selected")
            if (active) {
                changeFromDateColors();
            } else {
                changeToDateColors();
            }
            d3.select(this).classed("option-selected", !active)
        });

    d3.select("#option-slider")
        .on("click", function() {
            var active = d3.select(this).classed("option-selected")
            if (active) {
                closeParameterPanel();
            } else {
                openParameterPanel();
            }
            d3.select(this).classed("option-selected", !active)
        });

    // Add tooltip to option buttons.
    d3.select("#option-author").append("title").text("Toggle authors");
    d3.select("#option-algorithm").append("title").text("Toggle SRWR");
    d3.select("#option-date").append("title").text("Toggle publish date colors");
    d3.select("#option-slider").append("title").text("Toggle parameter panel");

    // Date option is already selected.
    if (d3.select("#option-date").classed("option-selected")) { changeToDateColors(); }

    // Algorithm option is already selected.
    d3.select("#option-algorithm").classed("option-selected", false)
};

// Hides or shows the options bar, depending on current state.
function toggleOptionsBar() {
    var optionsBar = d3.select("#graph-options-bar")
    var newState = "3rem"
    if (optionsBar.style("width") == newState) { newState = "0rem" }

    optionsBar
        .transition()
        .duration(250)
        .style("width", newState)

    d3.select("#options-arrow")
        .classed("right", !(newState == "3rem"))
        .classed("left", (newState == "3rem"))

    d3.selectAll(".option-button")
        .transition()
        .duration(250)
        .style("width", (newState == "3rem") * 32 + "px")
}

// Toggle author nodes.
function toggleAuthors() {
    resetGraph()
    if (d3.select("#option-author").classed("option-selected")) {
        init()
    } else {
        init(["author"])
    }
}

// Changes node colors to reflect their date and adds a color bar to the graph.
function changeToDateColors() {
    var colors = ["#a1cbe3","#08306b"];

    // Define time scale.
    var dates = d3.selectAll(".node.document").data().map(function(d) { return d3.timeParse("%Y-%m-%d")(d.date) })
    var range = d3.scaleTime().domain([d3.min(dates), d3.max(dates)]).range(colors);

    // Color nodes according to their date.
    d3.selectAll(".node.document")
        .style("fill", function(d) {return range(d3.timeParse("%Y-%m-%d")(d.date))})
        .each(function(doc) {
            getNodesWithIds(getNeighborsOfType(doc, "evidence").data().map(function(evi) {return evi.id}))
                .style("fill", d3.select(this).style("fill"))
            getNodesWithIds(getNeighborsOfType(doc, "author").data().map(function(evi) {return evi.id}))
                .style("fill", d3.select(this).style("fill"))
        });

    addColorBar(colors, d3.min(dates), d3.max(dates));
};

// Adds the color bar to the graph.
function addColorBar(colors, minDate, maxDate) {
    var container = d3.select("#graph-svg")
        .append("g")
            .attr("id", "color-bar")

    var gradient = container
        .append("linearGradient")
        .attr("id", "gradient")
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "0%")
        .attr("y2", "0%")

    gradient.selectAll("stop")
            .data(colors)
            .enter()
        .append("stop")
            .style("stop-color", function(d) { return d })
            .attr("offset", function(d,i) {
                return 100 * (i / (colors.length - 1)) + "%";
            });

    var barCenter = 50;
    var barWidth = 25;
    var barHeight = 2;

    container
        .append("rect")
            .attr("id", "color-bar-rect")
            .attr("x", barCenter - barWidth/2 + "%")
            .attr("y", 100 - 1 - barHeight + "%")
            .attr("width", barWidth + "%")
            .attr("height", barHeight + "%")
            .style("fill", "url(#gradient)");

    container
        .append("text")
            .classed("color-bar-text", true)
            .classed("color-bar-text-left", true)
            .attr("x", barCenter - 1 - barWidth/2 + "%")
            .attr("y", 100 - 1.5 + "%")
            .attr("height", barHeight + "%")
            .text(d3.timeFormat("%Y-%m-%d")(minDate))

    container
        .append("text")
            .classed("color-bar-text", true)
            .attr("x", barCenter + 1 + barWidth/2 + "%")
            .attr("y", 100 - 1.5 + "%")
            .attr("height", barHeight + "%")
            .text(d3.timeFormat("%Y-%m-%d")(maxDate))
};

// Changes node colors back to normal colors and removes the color bar.
function changeFromDateColors() {
    d3.selectAll(".node.document")
    .style("fill", null)
    .each(function(doc) {
        getNodesWithIds(getNeighborsOfType(doc, "evidence").data().map(function(evi) {return evi.id}))
            .style("fill", null)
        getNodesWithIds(getNeighborsOfType(doc, "author").data().map(function(evi) {return evi.id}))
            .style("fill", null)
    });

    d3.select("#color-bar").remove()
}