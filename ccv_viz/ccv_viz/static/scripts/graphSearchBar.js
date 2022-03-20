export function graphSearchBarInit() {
    d3.select("#search-arrow")
        .on("click", toggleSearchBar)
}

// Hides or shows the search bar, depending on current state.
function toggleSearchBar() {
    var searchBar = d3.select("#graph-search-bar")
    var newState = 1
    if (searchBar.style("opacity") == newState) { newState = 0 }

    searchBar
        .transition()
        .duration(250)
        .style("opacity", newState)

    // flip search arrow
    d3.select("#search-arrow")
        .classed("down", !newState)
}