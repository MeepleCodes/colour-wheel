import { Palette } from './Colours';
import { LiquitexNames, liquitexSinglePigmentPaints, liquitexMixedPigmentPaints } from './LiquitexAcrylics';

const gouacheSetNames: LiquitexNames[] = [
        
    // "Primary Yellow",
    // "Scarlet",
    // "Primary Red",
    "Dioxazine Purple",
    "Ultramarine Blue (Red Shade)",
    // "Primary Blue",
    "Emerald Green",
    // "Viridian Hue",
    "Yellow Oxide",
    "Burnt Sienna",
    // "Titanium White",
    "Mars Black"
]
const allLiquitex = [...liquitexSinglePigmentPaints, ...liquitexMixedPigmentPaints];
export const LiquitexAcrylicGouacheSet: Palette = {
    name: "Liquitex Acrylic Gouache Set",
    colours: allLiquitex.filter(paint => gouacheSetNames.includes(paint.name as LiquitexNames))
}