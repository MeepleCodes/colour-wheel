import { Swatch, SwatchSet } from "./Swatch";
// "... hue angles of 25°, 92°, 163°, and 253° in CIELAB are considered to have unique red, yellow, green, and blue"
// https://eprints.whiterose.ac.uk/157983/3/UniqueHue_Clean.pdf
function ab(angle: number): [number, number] {
    let aRad = angle * Math.PI / 180;
    return [150 * Math.cos(aRad), 150 * Math.sin(aRad)];
}
export const uniqueRed: Swatch = {name: "Unique Red", munsell: ["", 0, 0], lab: [75, ...ab(25)] };
export const uniqueYellow: Swatch = {name: "Unique Yellow", munsell: ["", 0, 0], lab: [100, ...ab(92)] };
export const uniqueGreen: Swatch = {name: "Unique Green", munsell: ["", 0, 0], lab: [50, ...ab(163)] };
export const uniqueBlue: Swatch = {name: "Unique Blue", munsell: ["", 0, 0], lab: [25, ...ab(253)] };
export const uniqueHues: SwatchSet = {
    name: "'Unique' hues",
    swatches: [uniqueRed, uniqueYellow, uniqueGreen, uniqueBlue]
}