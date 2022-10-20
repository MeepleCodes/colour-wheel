export type Swatch = {
    name: string,
    munsell: [string, number, number],
    lab: [number, number, number]
}
export type SwatchSet = {
    name: string;
    swatches: Swatch[];
}