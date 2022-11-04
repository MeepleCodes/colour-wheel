import { NamedColour, Palette } from "./Colours";
// "... hue angles of 25°, 92°, 163°, and 253° in CIELAB are considered to have unique red, yellow, green, and blue"
// https://eprints.whiterose.ac.uk/157983/3/UniqueHue_Clean.pdf
function ab(angle: number, scale = 150): [number, number] {
    let aRad = angle * Math.PI / 180;
    return [scale * Math.cos(aRad), scale * Math.sin(aRad)];
}
export const uniqueRed: NamedColour = {name: "Unique Red", munsell: ["", 0, 0], lab: [75, ...ab(25)] };
export const uniqueYellow: NamedColour = {name: "Unique Yellow", munsell: ["", 0, 0], lab: [100, ...ab(92)] };
export const uniqueGreen: NamedColour = {name: "Unique Green", munsell: ["", 0, 0], lab: [50, ...ab(163)] };
export const uniqueBlue: NamedColour = {name: "Unique Blue", munsell: ["", 0, 0], lab: [25, ...ab(253, 100)] }; // A*B* need scaling down to fit in JCh space
export const uniqueHues: Palette = {
    name: "'Unique' hues",
    colours: [uniqueRed, uniqueYellow, uniqueGreen, uniqueBlue]
}