import { initWithLoad } from "./main.js"
import { resetGraph } from "./util.js"

export function graphSearchBarInit() {
    d3.select("#search-arrow")
        .on("click", toggleSearchBar)

    d3.select("#search-bar")
        .on("change", sendSearchRequest)

    //Add options to select
    d3.text("/static/data/claims.txt", function(claims) {
        claims = d3.csvParseRows(claims);
        d3.select("#search-bar")
                .selectAll('option')
	            .data(claims)
                .enter()
            .append('option')
                .text(function (d) { return d; });
    });
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
    var query = d3.select("#search-bar").node().value

    // Remove graph and remake with new data.
    resetGraph()
    initWithLoad("/search/"+query)

    toggleSearchBar()
    d3.select("#option-author").classed("option-selected", false)
}