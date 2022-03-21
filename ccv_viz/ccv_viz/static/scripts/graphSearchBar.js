import { initWithLoad } from "./main.js"
import { resetGraph } from "./graphInit.js"

export function graphSearchBarInit() {
    d3.select("#search-arrow")
        .on("click", toggleSearchBar)

    d3.select("#search-bar")
        .on("keypress", sendSearchRequest)
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

// Run search
function sendSearchRequest() {
    var searchBar = d3.select("#search-bar").node()
    // Enter key is pressed
    if (d3.event.keyCode === 13) {
        var query = searchBar.value

        // Remove graph and remake with new data.
        resetGraph()
        initWithLoad("/search/"+query)

        searchBar.value = ""
        toggleSearchBar()
        d3.select("#option-author").classed("option-selected", false)
    }
}