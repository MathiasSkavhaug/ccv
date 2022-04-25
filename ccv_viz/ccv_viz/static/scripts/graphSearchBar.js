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
    var newState = (d3.select("#search-arrow").classed("down")) ? 1 : 0;

    d3.select("#graph-search-bar")
        .transition()
        .duration(250)
        .style("margin-bottom", newState*5+"px")
        .style("padding", newState*5+"px")
        .style("height", newState*1.25+"rem")

    // flip search arrow
    d3.select("#search-arrow")
        .classed("down", !newState)
}

// Run search
function sendSearchRequest() {
    var query = d3.select("#search-bar").node().value

    // Remove graph and remake with new data.
    resetGraph()
    initWithLoad("/search/"+encodeURIComponent(query))

    toggleSearchBar()
    d3.select("#option-author").classed("option-selected", false)
}