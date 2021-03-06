import { closeCardPanel, resetWeightedPredictions } from "./cardPanel.js";
import { removeAllNodes, ticked } from "./graphInit.js";
import { originalGraph } from "./main.js";

// Resets the graph
export function resetGraph() {
    removeAllNodes();
    closeCardPanel();
    resetWeightedPredictions();
};

// Resets all nodes matching "selection" to their original size.
export function resetNodeSize(selection=".node") {
    d3.selectAll(selection)
        .each(function(d) {
            d.size = originalGraph.nodes.find(x => x.id === d.id).size
        })
    // Make sure graph updates.
    ticked();
}

// Scales value from [omin, omax] range to [nmin, nmax] range.
export function scaleValue(value, omin, omax, nmin, nmax) {
    if (omax - omin == 0) {
        return omin;
    };
    return nmin + (nmax - nmin) * (value - omin) / (omax - omin);
};

// Scales values from original range to [nmin, nmax] range.
export function scaleValues(values, nmin, nmax) {
    var omin = math.min(values);
    var omax = math.max(values);
    return values.map(v => scaleValue(v, omin, omax, nmin, nmax));
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

// Scales matrix by attribute.
export function scaleMatrix(matrix) {
    var scaled = [];
    for (let i = 0; i < matrix._size[1]; i++) {
        var values = math.column(matrix, i)._data.map(v => v[0]);
        scaled.push(scaleValues(values, 0, 1))
    }
    return math.transpose(math.matrix(scaled))
}