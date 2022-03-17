export function graphInit(graph) {
    var width = d3.select("#graph-container").node().getBoundingClientRect().width,
        height = d3.select("#graph-container").node().getBoundingClientRect().height;

    var viz = d3.select("svg")
            .attr("width", "100%")
            .attr("height", "100%")
        .append("g")
            .attr("width", width)
            .attr("height", height)
            .attr("id", "viz")

    var node_type = {"0": "claim", "1": "document", "2": "evidence"}
    var link_type = {"0": "false", "1": "true", "2": "reference"}

    // ### Section from https://bl.ocks.org/mbostock/4062045 (with some modifications) ### //

    var simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(function (d) {
            return d.id;
        }))
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2));

    var link = viz.append("g")
            .attr("class", "links")
        .selectAll("line")
            .data(graph.links)
            .enter()
        .append("line")
            .classed("link", true)
            .attr("class", function(d) { return d3.select(this).attr("class") + " " + link_type[d.label]})
            .attr("stroke-width", function (d) {return d.value;})

    var node = viz.append("g")
            .attr("class", "nodes")
        .selectAll("circle")
            .data(graph.nodes)
            .enter()
        .append("circle")
            .classed("node", true)
            .attr("class", function(d) { return d3.select(this).attr("class") + " " + node_type[d.type]})
            .attr("r", 5)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

    node.append("title")
        .text(function (d) {
            return d.id;
        });

    simulation
        .nodes(graph.nodes)
        .on("tick", ticked);

    simulation.force("link")
        .links(graph.links);

    function ticked() {
        link
            .attr("x1", function (d) {return d.source.x;})
            .attr("y1", function (d) {return d.source.y;})
            .attr("x2", function (d) {return d.target.x;})
            .attr("y2", function (d) {return d.target.y;});

        node
            .attr("cx", function (d) {return d.x;})
            .attr("cy", function (d) {return d.y;});
    }

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
};