export type Swatch = {
    name: string,
    munsell: [string, number, number],
    lab: [number, number, number]
}
export type SwatchSet = {
    name: string;
    swatches: Swatch[];
}
/**
 * Return a (hopefully) unique ID for a swatch
 * 
 * Useful for aria IDs or React keys
 * 
 * @param swatch Swatch to get an ID for
 * @return a hopefully-unique ID string safe for use as a DOM ID
 */
export function getSwatchID(swatch: Swatch): string {
    // Strip everything that's not allowed in an element ID
    // (. and : are allowed but I prefer not to use them, so also strip those)
    let name = swatch.name.replace(/[^a-zA-Z0-9_-]/g, "");
    // Try and remove anything up to the first letter (ID must start with a-zA-Z)
    let m = name.match(/^[^a-zA-Z]*(?<safeName>[a-zA-Z].*)$/);
    if(m === null) {
        name = "none"
    } else {
        name = m.groups?.safeName!;
    }
    // Use the LAB values as extra duplicate protection (for example, thin vs thick readings of the same paint from Golden's database)
    return `${name}-${swatch.lab.join('-')}`
}