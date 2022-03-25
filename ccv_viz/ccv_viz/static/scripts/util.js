import { closeCardPanel } from "./cardPanel.js";

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

// Scales values from original range to [nmin, nmax] range.
export function scaleValues(values, omin, omax, nmin, nmax) {
    var omin = math.min(values);
    var omax = math.max(values);
    return values.map(function(d) { scaleValue(d, omin, omax, nmin, nmax)});
};

// Flattens the given array.
// From https://stackoverflow.com/a/15030117
function flatten(arr) {
    return arr.reduce(function (flat, toFlatten) {
      return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
    }, []);
  }

// Searches for object in the given nested array.
export function searchNested(value, nested) {
    return flatten(nested).includes(value);
}