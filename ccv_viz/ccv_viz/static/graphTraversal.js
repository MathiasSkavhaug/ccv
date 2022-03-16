// Returns the neighbors of "node".
export function getNeighbors(node, includeSelf = true) {
    var nodeLinks = getNodeLinks(node)
    var neighbors = getLinkedNodes(nodeLinks)

    if (!includeSelf) {
        neighbors.delete(node)
    }

    return neighbors
}

// Get all links connected to "node".
export function getNodeLinks(node) {
    var links = d3
        .selectAll(".link")
        .filter(function (d) {
            return isNeighborLink(node, d)
        });

    return links
}

// Get all nodes linked with "links".
export function getLinkedNodes(links) {
    var nodes = new Set()
    links
        .each(function (d) {
            nodes.add(d.source)
            nodes.add(d.target)
        })
    return nodes
}

// Check if "node" is connected with "link".
export function isNeighborLink(node, link) {
    return (link.source.id === node.id || link.target.id === node.id)
}

// Finds evidence nodes of "node".
export function getEvidences(node) {
    var neighbors = getNeighbors(node, false)
    var evidences = d3.selectAll(".evidence")
        .filter(function(d) {
            return neighbors.has(d)
        })
    return evidences
}

// Finds document node of "evidence".
export function getDocument(evidence) {
    var neighbors = getNeighbors(evidence, false)
    var document = d3.selectAll(".document")
        .filter(function(d) {
            return neighbors.has(d)
        })
    return document.data()[0]
}