export var resizing = false

export function resizeInit() {
    setTimeout(function() {
        new ResizeObserver(resizeGraph).observe(d3.select("#graph-container").node())
    }, 400);
}

function zoomed() {
    var viz = d3.select("#viz");
    viz.attr("transform", d3.event.transform);
}

function zoomFit(transitionDuration) {
    var fullWidth = d3.select("#graph-container").node().getBoundingClientRect().width,
    fullHeight = d3.select("#graph-container").node().getBoundingClientRect().height;
    var viz = d3.select("#viz");
    var vizBounds = viz.node().getBBox();
    var centerX = vizBounds.x + vizBounds.width / 2,
        centerY = vizBounds.y + vizBounds.height / 2;
    var scale =
        0.8 /
        Math.max(vizBounds.width / fullWidth, vizBounds.height / fullHeight);
    var translate = [
        fullWidth / 2 - scale * centerX,
        fullHeight / 2 - scale * centerY,
    ];

    viz
        .transition()
            .duration(transitionDuration || 0)
            .call(
                d3.zoom().on("zoom", zoomed).transform,
                d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
            );
}

export function resizeGraph() {
    // update viz size.
    var width = d3.select("#graph-container").node().getBoundingClientRect().width,
        height = d3.select("#graph-container").node().getBoundingClientRect().height;
    var viz = d3.select("#viz");
    viz.attr("width", width).attr("height", height);

    // center and scale the network graph
    resizing = true;
    zoomFit(1000);
    setTimeout(function() {
        resizing = false;
    }, 1000)
}

export function isResizing() {
    return resizing;
}