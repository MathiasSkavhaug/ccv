import { toggleTooltip } from "./graphTooltip.js"

export function initialState() {
    setTimeout(function() {
        toggleTooltip();
        //d3.select(".node.claim").dispatch("click")
    }, 1500)
}