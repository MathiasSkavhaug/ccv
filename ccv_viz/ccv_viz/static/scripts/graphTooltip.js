export function graphTooltipInit() {
    d3.select("#graph-tooltip-container .question-mark")
        .on("click", toggleTooltip);

    toggleTooltip();
}


// Hides or shows the tooltip, depending on current state.
function toggleTooltip() {
    var tooltip = d3.select("#graph-tooltip")
    var newState = 1
    if (tooltip.style("opacity") == newState) { newState = 0 }
    
    tooltip
        .transition()
        .duration(250)
        .style("opacity", newState)
}