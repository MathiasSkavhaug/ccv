// Resets the graph
export function resetGraph() {
    d3.select("#graph-svg")
        .selectAll("*")
        .remove();

    closeCardPanel();
};

// Scales value from [omin, omax] range to [nmin, nmax] range.
export function scaleValue(value, omin, omax, nmin, nmax) {
    if (omax - omin == 0) {
        return omin;
    };
    return nmin + (nmax - nmin) * (value - omin) / (omax - omin);
};