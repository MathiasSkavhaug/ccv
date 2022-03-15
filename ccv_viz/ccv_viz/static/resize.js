export function resize() {
  var viz = d3.select("#viz")
  var zoom = d3.zoom()
    .on("zoom", zoomed);
      
  function zoomed() {
    viz.attr("transform", d3.event.transform);
  }

  function zoomFit(transitionDuration) {
    var bounds = viz.node().getBBox();
    var parent = viz.node().parentElement;
    var fullWidth  = parent.clientWidth  || parent.parentNode.clientWidth,
        fullHeight = parent.clientHeight || parent.parentNode.clientHeight;
    var width  = bounds.width,
        height = bounds.height;
    var midX = bounds.x + width / 2,
        midY = bounds.y + height / 2;

    if (width == 0 || height == 0) return; // nothing to fit

    var scale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
    var translate = [
        fullWidth  / 2 - scale * midX,
        fullHeight / 2 - scale * midY
    ];

    viz
      .transition()
      .duration(transitionDuration || 0)
      .call(zoom.transform, 
        d3.zoomIdentity
          .translate(translate[0], translate[1])
          .scale(scale));
  }
    
  function resize_graph() {
    // update viz size.
    var width = $("#graph-container").width(), height = $("#graph-container").height()
    viz.attr("width", width).attr("height", height);

    // center and scale the network graph
    zoomFit(1000);
  }

  window.addEventListener('resize', resize_graph);
  setTimeout(resize_graph, 400);
};