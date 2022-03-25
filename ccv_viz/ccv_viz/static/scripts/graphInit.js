import { algorithmActive } from "./graphAlgorithm.js";
import { scaleValue } from "./util.js"

export var nodeType = {"0": "claim", "1": "document", "2": "evidence", "3": "author"};
export var linkType = {"0": "false", "1": "true", "2": "reference", "3": "author"};
var baseLinkSize = 1.5;
var minSize = 0;
var maxSize = 0;
var nodeSizeRange = [5,15];
var link;
var node;


export function graphInit(graph, config) {
    var currentGraph = structuredClone(graph)

    var width = d3.select("#graph-container").node().getBoundingClientRect().width,
        height = d3.select("#graph-container").node().getBoundingClientRect().height;

    var viz = d3.select("#graph-svg")
            .attr("width", "100%")
            .attr("height", "100%")
        .append("g")
            .attr("width", width)
            .attr("height", height)
            .attr("id", "viz")

    if (!config.includes("author")) {
        currentGraph.links = currentGraph.links.filter(function(d) {return ["0","1","2"].includes(d.label)}) // only add true, false and reference links.
        currentGraph.nodes = currentGraph.nodes.filter(function(d) {return [0,1,2].includes(d.type)}) // only add claim, document and evidence nodes.
    }

    // ### Section from https://bl.ocks.org/mbostock/4062045 (with some modifications) ### //

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function (d) {
            return d.id;
        }))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 2, height / 2));

    link = viz.append("g")
            .attr("class", "links")
        .selectAll("line")
            .data(currentGraph.links)
            .enter()
        .append("line")
            .classed("link", true)
            .attr("class", function(d) { return d3.select(this).attr("class") + " " + linkType[d.label]})
            .attr("stroke-width", function (d) {return d.width*baseLinkSize;})

    node = viz.append("g")
            .attr("class", "nodes")
        .selectAll("circle")
            .data(currentGraph.nodes)
            .enter()
        .append("circle")
            .classed("node", true)
            .attr("class", function(d) { return d3.select(this).attr("class") + " " + nodeType[d.type]})
            .attr("r", function(d) {return d.size})
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

    node.append("title")
        .text(function (d) {
            return d.id;
        });

    simulation
        .nodes(currentGraph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(currentGraph.links);


    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // ### ### //

    // Scale nodes to nodeSizeRange.
    minSize = d3.min(node.data(), function (d) { return d.size; });
    maxSize = d3.max(node.data(), function (d) { return d.size; });
    node.attr("r", function(d) {return scaleValue(d.size, minSize, maxSize, nodeSizeRange[0], nodeSizeRange[1])});
};

export function ticked() {
    link
        .attr("x1", function (d) {return d.source.x;})
        .attr("y1", function (d) {return d.source.y;})
        .attr("x2", function (d) {return d.target.x;})
        .attr("y2", function (d) {return d.target.y;});

    node
        .attr("cx", function (d) {return d.x;})
        .attr("cy", function (d) {return d.y;})
        .transition()
        .duration(250)
        .ease(d3.easeLinear)
        .attr("r", function(d) {return scaleValue(d.size, minSize, maxSize, nodeSizeRange[0], nodeSizeRange[1])})
}