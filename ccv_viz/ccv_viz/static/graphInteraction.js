export function graphInteraction() {
    // Add onclick listener to nodes.
    d3.selectAll(".node")
        .on("click", function () {
            // Stop click propagation.
            d3.event.stopPropagation();

            nodeHighlight(this);
        });

    // When no nodes are clicked reset highlight to normal.
    d3.select("#viz-svg")
        .on("click", function () {
            d3.selectAll(".unselected")
                .classed("unselected", false)
        });

    // Highlight node and neighboring nodes
    function nodeHighlight(node) {
        var node = d3.select(node).data()[0]
        var nodeLinks = getNodeLinks(node)
        var nodeIds = getLinkedNodes(nodeLinks)

        d3.selectAll(".node")
            .classed("unselected", function (d) {
                return !nodeIds.has(d.id)
            })

        d3.selectAll(".link")
            .classed("unselected", function (d) {
                return !nodeLinks.data().includes(d)
            })
    }

    // Get all links connected to "node".
    function getNodeLinks(node) {
        var links = d3
            .selectAll(".link")
            .filter(function (d) {
                return isNeighborLink(node, d)
            });

        return links
    }

    // Get all nodes linked with "links".
    function getLinkedNodes(links) {
        var nodes = new Set()
        links
            .each(function (d) {
                nodes.add(d.source.id)
                nodes.add(d.target.id)
            })
        return nodes
    }

    // Check if "node" is connected with "link".
    function isNeighborLink(node, link) {
        return (link.source.id === node.id || link.target.id === node.id)
    }
}