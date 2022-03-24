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

// Finds neighboring nodes of type "type" of node "node".
export function getNeighborsOfType(node, type) {
    var neighbors = getNeighbors(node, false)
    var evidences = d3.selectAll("."+type)
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

// Retrieves the link  between two nodes.
export function getLinkBetween(node1, node2) {
    return d3.selectAll(".link")
        .filter(function(d) {
            return ((d.target.id == node1.id && d.source.id == node2.id) || d.target.id == node2.id && d.source.id == node1.id)
        }).data()[0]
}

// Retrieves the link attribute between two nodes.
export function getAttrBetween(node1, node2, attr) {
    var link = getLinkBetween(node1, node2)
    return (typeof link !== "undefined") ? link[attr] : link
}