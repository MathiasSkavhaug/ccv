import { scaleValue } from "./util.js"
import { originalGraph } from "./main.js";
import { resizeGraph } from "./graphResize.js";
import { graphInteractionInit } from "./graphInteraction.js";

var baseLinkSize = 1.5;
var minSize = 0;
var maxSize = 0;
var nodeSizeRange = [5,15];
var link;
var node;
var text;
var currentGraph;
var simulation;

export function graphInit() {
    currentGraph = structuredClone(originalGraph)

    var width = d3.select("#graph-container").node().getBoundingClientRect().width,
        height = d3.select("#graph-container").node().getBoundingClientRect().height;

    var viz = d3.select("#graph-svg")
            .attr("width", "100%")
            .attr("height", "100%")
        .append("g")
            .attr("width", width)
            .attr("height", height)
            .attr("id", "viz")

    // Did not find relevant documents for the claim.
    if (Object.keys(currentGraph).length === 0) {
        viz
            .append("text")
            .text("No relevant documents found for the claim.")
            .attr("id", "documents-not-found")
            .attr("x", width / 2)
            .attr("y", height / 2)
        return
    }

    if (!d3.select("#option-author").classed("option-selected")) {
        currentGraph.links = currentGraph.links.filter(function(d) {return d.label != "author"})
        currentGraph.nodes = currentGraph.nodes.filter(function(d) {return d.type != "author"})
    };

    simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function (d) {return d.id;}))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 2, height / 2));

    link = viz.append("g")
            .classed("links", true)
        .selectAll("line")

    node = viz.append("g")
            .classed("nodes", true)
        .selectAll("circle")

    currentGraph.texts = currentGraph.nodes
        .filter(d => d.type == "document")
        .map(function(d) {
            return {
                "node": d, 
                "text": d.authors.split(",")[0].split(" ").pop() +", "+ d.date.split("-").slice(0,2).join("-")
            }
        })

    text = viz.append("g")
            .classed("texts", true)
        .selectAll("text")
    
    update(false);
        
    // Scale nodes to nodeSizeRange.
    minSize = d3.min(node.data(), function (d) { return d.size; });
    maxSize = d3.max(node.data(), function (d) { return d.size; });
    node.attr("r", function(d) {return scaleValue(d.size, minSize, maxSize, nodeSizeRange[0], nodeSizeRange[1])});
};

// Removes elements removed from underlying data.
function update(resize=true) {
    link = link.data(currentGraph.links, d => d.id)
    link.exit().remove();
    link = link
        .enter()
    .append("line")
        .classed("link", true)
        .attr("class", function(d) { return d3.select(this).attr("class") + " " + d.label})
        .attr("stroke-width", function (d) {return d.width*baseLinkSize;})
        .merge(link);

    node = node.data(currentGraph.nodes, d => d.id)
    node.exit().remove();
    node = node
        .enter()
    .append("circle")
        .classed("node", true)
        .attr("class", function(d) { return d3.select(this).attr("class") + " " + d.type})
        .attr("r", function(d) {return d.size})
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .each(function() {
            d3.select(this).append("title").text(d => d.text)
        })
        .merge(node);
    
    text = text.data(currentGraph.texts, d => d.id)
    text.exit().remove();
    text = text
        .enter()
    .append("text")
        .classed("text", true)
        .text(d => d.text)
        .merge(text)

    simulation.nodes(currentGraph.nodes).on("tick", ticked);
    simulation.force("link").links(currentGraph.links);
    simulation.alpha(1).restart();

    graphInteractionInit();

    if (resize) {
        setTimeout(() => {
            resizeGraph();
        }, 500);
    }
}

// Removes a node, and its associated links and text, from the graph given the id.
function removeNode(id) {
    currentGraph.nodes = currentGraph.nodes.filter(d => d.id != id)
    currentGraph.links = currentGraph.links.filter(function(d) {return d.target.id != id && d.source.id != id})
    currentGraph.texts = currentGraph.texts.filter(d => d.node.id != id)

    removeDetachedNodes();

    update();
}

// (re-)Adds a node, and its associated links and text, to the graph given the id.
function addNode(id) {
    let node = originalGraph.nodes.filter(d => d.id == id)[0];
    currentGraph.nodes.push(node);
    
    let links = originalGraph.links.filter(d => d.target == id || d.source == id);
    let presentNodes = currentGraph.nodes.map(d => d.id);
    links = links.filter(d => presentNodes.includes(d.target) && presentNodes.includes(d.source));
    currentGraph.links.push(...links);
    
    if (node.type == "document") {
        texts.push(
            {
                "node": node, 
                "text": node.authors.split(",")[0].split(" ").pop() +", "+ node.date.split("-").slice(0,2).join("-")
            }
        );
    };

    update();
}

// Removes a link between two nodes.
function removeLink(id1, id2) {
    currentGraph.links = currentGraph.links.filter(d => (d.target.id != id1 || d.source.id != id2) && (d.target.id != id2 || d.source.id != id1))

    removeDetachedNodes();

    update();
}

// (re-)Adds a link between two nodes.
function addLink(id1, id2) {
    let links = originalGraph.links.filter(d => (d.target == id1 && d.source == id2) || (d.target == id2 && d.source == id1))
    let presentNodes = currentGraph.nodes.map(d => d.id);
    links = links.filter(d => presentNodes.includes(d.target) && presentNodes.includes(d.source));
    currentGraph.links.push(...links);
    update();
}

// Remove nodes with no links
function removeDetachedNodes() {
    let nodes = currentGraph.links.map(d => d.target.id).concat(currentGraph.links.map(d => d.source.id))
    currentGraph.nodes = currentGraph.nodes.filter(d => nodes.includes(d.id))
    update();
}

// Removes nodes of type "type", and their associated links and text, from the graph.
export function removeAllNodesOfType(type) {
    let nodes = currentGraph.nodes.filter(d => d.type == type)
    nodes.forEach(d => { removeNode(d.id) });
    update();
}

// (re-)Adds nodes of type "type", and their associated links and text, to the graph.
export function addAllNodesOfType(type) {
    let nodes = originalGraph.nodes.filter(d => d.type == type)
    nodes.forEach(d => { addNode(d.id) });
    update();
}

// Removes all nodes.
export function removeAllNodes() {
    currentGraph.nodes = [];
    currentGraph.links = [];
    currentGraph.texts = [];
    update();
}

// Adds all nodes.
export function addAllNodes() {
    currentGraph.nodes = originalGraph.nodes;
    currentGraph.links = originalGraph.links;
    currentGraph.texts = currentGraph.nodes
    .filter(d => d.type == "document")
    .map(function(d) {
        return {
            "node": d, 
            "text": d.authors.split(",")[0].split(" ").pop() +", "+ d.date.split("-").slice(0,2).join("-")
        }
    })

    if (!d3.select("#option-author").classed("option-selected")) {
        currentGraph.links = currentGraph.links.filter(function(d) {return d.label != "author"})
        currentGraph.nodes = currentGraph.nodes.filter(function(d) {return d.type != "author"})
    };
    update();
}

// Keeps the graph up to date.
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

    text.attr("x", function(d) { return d.node.x })
        .attr("y", function(d) { return d.node.y - 2 - scaleValue(d.node.size, minSize, maxSize, nodeSizeRange[0], nodeSizeRange[1])});
}

// Drag start
function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

// Dragging
function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
}

// Drag end
function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}