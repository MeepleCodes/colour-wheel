import * as convert from "color-convert";
import * as calculus from "color-calculus";
import { RGB } from "color-convert/conversions";


/**
 * Perform the most common scaling of the A/B parameters for a model, using
 * a/b Min/Max parameters.
 * 
 * @param distance Distance, range 0-1
 * @param aMin 
 * @param aMax 
 * @param bMin 
 * @param bMax 
 * @returns 
 */
function scaleAB(distance: number, aMin: number, aMax: number, bMin: number, bMax: number): {a: number, b: number} {
    return {
        a: aMin + (aMax - aMin) * distance,
        b: bMin + (bMax - bMin) * distance
    }
}
/**
 * Produce a ModelResult from an sRGB value expressed as an array
 * (as returned from the color-calculus module).
 * 
 * Any RGB values outside the [0,255] range will be clamped and cause
 * inGamut to be false in the return value.
 * 
 * @param rgb 
 * @returns 
 */
function rgbToResult(rgb: RGB): ModelResult {
    var inGamut = !rgb.some(v => v < 0 || v > 255);
    return {
        inGamut: inGamut,
        sRGB: "#" + convert.rgb.hex(rgb.map(v => Math.max(0, Math.min(255, v))) as RGB)
    };
}

  /**
   * Return the eliptical disc projection of a point angle [0-1] around the circumference
   * of a unit circle onto the unit square.
   * @param angle 
   */
function elipticalDiscProject(angle: number): {x: number, y: number} {
    var u = Math.sin(angle * Math.PI * 2);
    var v = Math.cos(angle * Math.PI * 2);
    // Calculate some intermediates
    const twosqrttwo = 2 * Math.sqrt(2);
    var u2 = u*u;
    var v2 = v*v;
    // The intermediate calculations can sometimes result in numbers very slightly below zero (when they should be zero)
    // due to floating point rounding. As sqrt(-0.000000000001) is still NaN, fix that
    var xa = Math.max(2 + u2 - v2 + (twosqrttwo * u), 0);
    var xb = Math.max(2 + u2 - v2 - (twosqrttwo * u), 0);
    var x = Math.min(1, (Math.sqrt(xa) - Math.sqrt(xb)) / 2);
    var ya = Math.max(2 - u2 + v2 + (twosqrttwo * v), 0);
    var yb = Math.max(2 - u2 + v2 - (twosqrttwo * v), 0);
    var y = Math.min(1, (Math.sqrt(ya) - Math.sqrt(yb)) / 2)
    return {x: x, y: y};
  }

  /**
   * Return the linear projection of an angle [0,1] onto the perimeter
   * of a unit square on the origin.
   * @param angle 
   */
function rayProject(angle: number): {x: number, y: number} {
    // Unwind just in case
    angle = angle % 1.0;

    // It's easier to do this in the +x,+y quadrant and then rotate around
    var tanAngle = Math.tan((angle % 0.25) * Math.PI * 2);
    // Can't represent Pi/2 in floating point so the highest we get is +largenumber
    var u = Math.min(1, tanAngle);
    var v = tanAngle == 0 ? 1 : Math.min(1, 1/tanAngle);
    var x: number, y: number;
    if(angle < 0.25) {
      x = u;
      y = v;
    } else if(angle < 0.5) {
      x = v;
      y = -u;
    } else if(angle < 0.75) {
      x = -u;
      y = -v;
    } else { // Better not be > 1...
      x = -v;
      y = u;
    }
    return {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y))
    };
  }


export type ModelResult = {
    inGamut: boolean;
    sRGB: string;
}

export interface ColourModel {
    code: string;
    name: string;
    description: string;
    aLabel: string;
    bLabel: string | null;
    aMinDefault?: number;
    aMaxDefault?: number;
    bMinDefault?: number;
    bMaxDefault?: number;
    generateRGB: (angle: number, distance: number, aMin: number, aMax: number, bMin: number, bMax: number) => ModelResult;
}
  
export const HSLModel: ColourModel = {
    code: "HSL",
    name: "Hue/Saturation/Lightness",
    description: "Hue/Saturation/Lightness per NPM color-convert module",
    aLabel: "Saturation",
    bLabel: "Lightness",
    generateRGB: (angle: number, distance: number, aMin: number, aMax: number, bMin: number, bMax: number) => {
        var h = angle * 360;
        var {a: s, b: l} = scaleAB(distance, aMin, aMax, bMin, bMax);
        return {
            inGamut: true,
            sRGB: "#" + convert.hsl.hex([h, s, l])
        };
      }
}

export const HSVModel: ColourModel = {
    code: "HSV",
    name: "Hue/Saturation/Value",
    description: "Hue/Saturation/Value per NPM color-convert module",
    aLabel: "Saturation",
    bLabel: "Value",
    generateRGB: (angle: number, distance: number, aMin: number, aMax: number, bMin: number, bMax: number) => {
        var h = angle * 360;
        var {a: s, b: v} = scaleAB(distance, aMin, aMax, bMin, bMax);
        return {
            inGamut: true,
            sRGB: "#" + convert.hsv.hex([h, s, v])
        };
      }
}

export const HCVModel: ColourModel = {
    code: "HCV",
    name: "Hue/Chroma/inverted Value (Greyness)",
    description: "Hue/Chroma/Value or Greynesss per https://github.com/hydra2s-info/hcv-color",
    aLabel: "Chroma",
    bLabel: "Value (inverted - 100 is max greyness, 0 is no greyness)",
    bMaxDefault: 0,
    generateRGB: (angle: number, distance: number, aMin: number, aMax: number, bMin: number, bMax: number) => {
        var h = angle * 360;
        var {a: c, b: g} = scaleAB(distance, aMin, aMax, bMin, bMax);
        return {
            inGamut: true,
            sRGB: "#" + convert.hcg.hex([h, c, g])
        };
      }
}


export const HWBModel: ColourModel = {
    code: "HWB",
    name: "Hue/White/Black",
    description: "Hue/White/Black per NPM color-convert module",
    aLabel: "White",
    bLabel: "Black",
    aMaxDefault: 0,
    generateRGB: (angle: number, distance: number, aMin: number, aMax: number, bMin: number, bMax: number) => {
        var h = angle * 360;
        var {a: s, b: v} = scaleAB(distance, aMin, aMax, bMin, bMax);
        return {
            inGamut: true,
            sRGB: "#" + convert.hsv.hex([h, s, v])
        };
    }
}

export const JChModel: ColourModel = {
    code: "JCh",
    name: "CIECAM02 JCh",
    description: "CIECAM02 lightness/chroma/hue using NPM color-calculus module",
    aLabel: "Lightness",
    bLabel: "Chroma",
    generateRGB: (angle: number, distance: number, aMin: number, aMax: number, bMin: number, bMax: number) => {
        var h = angle * 360;
        var {a: J, b: C} = scaleAB(distance, aMin, aMax, bMin, bMax);
        return rgbToResult(calculus.JCh_to_sRGB(J, C, h));
    }
}

export const LABModel: ColourModel = {
    code: "LAB",
    name: "CIELAB",
    description: "CIELAB (lightness, a, b) using NPM color-calculus module. A* and B* are mapped onto the circle using an eliptical-disc projection - so 45° is (1,1) and not (⅟√2,⅟√2), etc.",
    aLabel: "Lightness",
    bLabel: null,
    generateRGB: (angle: number, distance: number, aMin: number, aMax: number, bMin: number, bMax: number) => {
        var {a: l} = scaleAB(distance, aMin, aMax, bMin, bMax);
        // Could make this swappable but they seem to generate the exact same output
        var {x: x, y: y} = elipticalDiscProject(angle);
        // Invert x/y as that ends up with us closely matching hue angle from every other model
        return rgbToResult(calculus.lab_to_sRGB(l, y * 100, x * 100));
    }
}

export const HCLModel: ColourModel = {
    code: "HCL",
    name: "CIELAB in polar coordinates",
    description: "CIELAB (lightness, a, b) using NPM color-calculus module, in polar coordinates.",
    aLabel: "Chroma",
    bLabel: "Lightness",
    generateRGB: (angle: number, distance: number, aMin: number, aMax: number, bMin: number, bMax: number) => {
        var h = angle * 360;
        var {a: c, b: l} = scaleAB(distance, aMin, aMax, bMin, bMax);
        return rgbToResult(calculus.hcl_to_sRGB(h, c, l));
    }
}

export const ALL_MODELS = [HSLModel, HSVModel, HCVModel, HWBModel, JChModel, LABModel, HCLModel/*, JChAltModel*/];

// Currently not using this as the ciebase-ts and ciecam02-ts modules don't pack under webpack5 without
// config changes and I can't be bothered to eject react-create-app just yet. They don't really achieve much so we're
// fine without them for the time being
// import * as ciebase from "ciebase-ts";
// import * as ciecam02 from "ciecam02-ts";
// // Use the default viewing condition (D65)
// const cam = ciecam02.cam({}, ciecam02.cfs("JCh"));
// const xyz = ciebase.xyz(ciebase.workspace.sRGB, ciebase.illuminant.D65);
// const gamut = ciecam02.gamut(xyz, cam);
// // All ciecam correlates, for reference:
// // Q: brightness
// // J: lightness
// // M: colorfullness
// // C: chroma
// // s: saturation
// // h: hue angle
// // H: hue composition
// export const JChAltModel: ColourModel = {
//     code: "JChALT",
//     name: "CIECAM02 JCh Alternate",
//     description: "CIECAM02 lightness/chroma/hue using NPM ciecam02 module and an alternative gamut clamp function",
//     aLabel: "Lightness",
//     bLabel: "Chroma",
//     generateRGB: (angle: number, distance: number, aMin: number, aMax: number, bMin: number, bMax: number) => {
//         var h = angle * 360;
//         var {a: J, b: C} = scaleAB(distance, aMin, aMax, bMin, bMax);
//         var trueCAM = {J: J, C: C, h: h};
//         var [isInside, rgb] = gamut.contains(trueCAM);
//         if(!isInside) {
//             // Alternative way of getting within gamut is to just clamp R/G/B in range
//             // return [false, this.converter.fromRgb(rgb.map(x => Math.max(0, Math.min(1, x))))]
//             var gamutCam = gamut.limit({J: 0, C: 0, h: h}, trueCAM);
//             rgb = xyz.toRgb(cam.toXyz(gamutCam));
//         }
//         return {
//             inGamut: isInside,
//             sRGB: ciebase.rgb.toHex(rgb)
//         }
    
//     }
// }
/*
  ciecamDistoredRGB(angle, distance) {
    // Hue is directly proportional to angle
    var h = angle * 360;
    // For a given hue angle, find the maximum chroma/lightness renderable in RGB
    var camMin = {J: 0, C: 0, h: h};
    var camMax = {J: 100, C: 100, h: h};
    var camVisible = this.gamut.limit(camMin, camMax);
    // Now try and skew the chroma back towards 100 for a given lightness max
    const C_TARGET = 0;
    if(camVisible.C < C_TARGET) {
      camVisible.C = C_TARGET;
      camVisible = this.gamut.limit(camMin, camVisible);
    }
    
    

    var j = camVisible.J * distance;
    var c = camVisible.C * distance;

    return [true, this.camToHex({J: j, C: c, h: h})];
  }
*/