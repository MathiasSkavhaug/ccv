import { getEvidences, getDocument } from "./graphTraversal.js"

export function infoPanelInteractionInit() {

}

// Opens the info panel.
export function openInfoPanel() {
    d3.select("#graph-container")
        .transition()
            .style("width", "60%")
}

// Closes the info panel.
export function closeInfoPanel() {
    d3.select("#graph-container")
        .transition()
            .style("width", "100%")
    clearInfoPanel();
}

// Populates the info panel.
export function populateInfoPanel(node) {
    clearInfoPanel();

    var node = d3.select(node).data()[0]
    
    if (node.type == "2") { // evidence
        node = getDocument(node)
    }
        
    var evidences = getEvidences(node)

    d3.select("#info-panel")
        .append("div")
            .classed("title", true)
            .html(node.text)
            
    d3.select("#info-panel")
        .append("div")
            .attr("id", "evidence-container")

    evidences
        .each(function(d) {
            d3.select("#evidence-container")
                .append("div")
                    .classed("evidence", true)
                    .html(d.text)
        })
}

// Clears the info panel.
function clearInfoPanel() {
    d3.select("#info-panel").html("")
}