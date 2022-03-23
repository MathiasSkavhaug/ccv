export function resetGraph() {
    d3.select("#graph-svg")
        .selectAll("*")
        .remove();

    closeCardPanel();
};

export function scale(value, omin, omax, nmin, nmax) {
    return nmin + (nmax - nmin) * (value - omin) / (omax - omin);
};