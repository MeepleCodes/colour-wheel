/**
 * A small subset of golden's acrylic line that makes a useful reference palette
 */
import { Palette } from './Colours';
import { goldenAcrylicsThick, goldenAcrylicsThin, GoldenAcrylicNames } from './GoldenAcrylics';
const fluidSetNames: GoldenAcrylicNames[] = ["Burnt Sienna", "Benzimidazolone Yellow Medium", "Carbon Black", "Phthalo Blue (Green Shade)", "Phthalo Green (Blue Shade)", "Pyrrole Red", "Quinacridone Magenta", "Titanium White", "Ultramarine Blue", "Yellow Oxide"];
export const goldenFluidAcrylicSetThick: Palette = {
    name: "Golden Fluid Acrylic Set (thick disc)",
    colours: goldenAcrylicsThick.filter(paint => fluidSetNames.includes(paint.name as GoldenAcrylicNames))
}
export const goldenFluidAcrylicSetThin: Palette = {
    name: "Golden Fluid Acrylic Set (thin film)",
    colours: goldenAcrylicsThin.filter(paint => fluidSetNames.includes(paint.name as GoldenAcrylicNames))
}
const modernMixingNames: GoldenAcrylicNames[] = ["Benzimidazolone Yellow Light", "Benzimidazolone Yellow Medium", "Napthol Red Light", "Quinacridone Magenta", "Anthraquinone Blue", "Phthalo Blue (Green Shade)", "Phthalo Green (Blue Shade)", "Titanium White"];
export const goldenHeavyBodyModernMixingSetThick: Palette = {
    name: "Golden Heavy Body Modern Mixing Set (thick disc)",
    colours: goldenAcrylicsThick.filter(paint => modernMixingNames.includes(paint.name as GoldenAcrylicNames))
}
export const goldenHeavyBodyModernMixingSetThin: Palette = {
    name: "Golden Heavy Body Modern Mixing Set (thin film)",
    colours: goldenAcrylicsThin.filter(paint => modernMixingNames.includes(paint.name as GoldenAcrylicNames))
}
