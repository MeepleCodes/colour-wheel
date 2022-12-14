import * as convert from "color-convert";
import * as calculus from "color-calculus";
import { RGB } from "color-convert/conversions";

/**
 * Perform the most common radial scaling: two parameters scaled linearly by a/b/min/max.
 * 
 * @param distance Distance, range 0-1
 * @param scaling Model's radial scaling parameters
 * @returns 
 */
function scaleAB(distance: number, scaling: RadialScaling): {a: number, b: number} {
    return {
        a: scaling.aMin + (scaling.aMax - scaling.aMin) * distance,
        b: scaling.bMin + (scaling.bMax - scaling.bMin) * distance
    }
}

/**
 * Given one or both A/B properties of a colour, and a set of radial scaling parameters,
 * determine the best distance from the centre to place a colour with those a/b values.
 * 
 * The returned distance is for the range [0, 1] (centre to outside) but it can return values
 * outside this range if the scaling parameters mean the circle doesn't include the A/B
 * values supplied.
 * 
 * If the scaling for one parameter is a fixed value (ie min==max, it doesn't vary along
 * the radius) then always use the other value to calculate a distance. If both are fixed,
 * return 0.5 (absent anything better to do). If both parameters vary along the radius then
 * use the average of them - this will probably match neither perfectly.
 * @param ab 
 * @param scaling 
 * @returns 
 */
function unscaleAB(ab: {a?: number, b?: number}, scaling: RadialScaling) : {distance: number, aDelta: number, bDelta: number} {
    var aScale, bScale, distance;
    if(ab.a !== undefined) aScale = scaling.aMax === scaling.aMin ? 0.5 : (ab.a - scaling.aMin) / (scaling.aMax - scaling.aMin);
    if(ab.b !== undefined) bScale = scaling.bMax === scaling.bMin ? 0.5 : (ab.b - scaling.bMin) / (scaling.bMax - scaling.bMin);
    if(aScale !== undefined && bScale !== undefined) {
        // If we have both but one of them was unscaled (ie min==max) then use the other
        if(scaling.aMin === scaling.aMax) distance = bScale;
        else if(scaling.bMin === scaling.bMax) distance = aScale;
        else distance = (aScale + bScale) / 2;
    } else if(aScale !== undefined) {
        distance = aScale;
    } else if(bScale !== undefined) {
        distance = bScale;
    } else {
        distance = 0.5;
    }
    // Now work out what the A,B values of the point *in* the plane of the circle
    // at that distance is, and use this to calculate deltas
    var {a, b} = scaleAB(distance, scaling);
    return {
        distance: distance,
        aDelta: ab.a !== undefined ? ab.a - a : 0,
        bDelta: ab.b !== undefined ? ab.b - b : 0
    }
}

/**
 * Turn an RGB value (as an array[3] in the range 0-255) to a hex string, eg "#f0f0f0".
 * 
 * Values outside the accepted range, eg as a result of out-of-gamut conversions, will
 * simply be clamped to [0, 255], which can lead to distortion.
 */
export function rgbToClampedHex(rgb: RGB): string {
    return "#" + convert.rgb.hex(rgb.map(v => Math.max(0, Math.min(255, v))) as RGB);
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
        sRGB: rgbToClampedHex(rgb)
    };
}

/**
 * Return the eliptical disc projection of a point angle [0-1] around the circumference
 * of a unit circle onto the unit square.
 * 
 * Taken from https://arxiv.org/ftp/arxiv/papers/1509/1509.06344.pdf
 * 
 * @param angle 
 */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars --
 This is an alternative way of projecting a square (colour space) onto a circle (the wheel).
 While I haven't unpacked the maths to confirm it, it appears to produce identical results
 to the somewhat simpler-to-comprehend rayProject function below so is currently unused.
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
   * Convert an angle on the colour wheel into X,Y coordinates in
   * colour space.
   * 
   * Performs a linear projection of angle to the perimeter of a 2x2
   * square centered on the origin, so x and y are both in the
   * range [-1,1] and at least one of them will always be +1 or -1.
   * @param angle 
   */
function rayProject(angle: number): {x: number, y: number} {
    // Unwind just in case
    angle = angle % 1.0;

    // It's easier to do this in the +x,+y quadrant and then flip
    // some signs later. u/v is the coordinate space where the line
    // is in that quadrant.
    // Remember angle is counterclockwise
    var tanAngle = Math.tan((angle % 0.25) * Math.PI * 2);
    var u = (tanAngle === 0) ? 1 : Math.min(1, 1/tanAngle);
    // Pi/2 can't be represented precisely in floating point so we never 
    // actually get infinity as a result, just some very large number.    
    var v = Math.min(1, tanAngle);
    var x: number, y: number;
    if(angle < 0.25) {
      x = u;
      y = v;
    } else if(angle < 0.5) {
      x = -v;
      y = u;
    } else if(angle < 0.75) {
      x = -u;
      y = -v;
    } else { // Better not be > 1...
      x = v;
      y = -u;
    }
    return {x, y};
  }

/**
 * Reverse rayProject to get an angle on the wheel from an x,y coordinate
 * in colour space. X and Y don't have to be scaled to fit any particular
 * range as the answer doesn't change.
 * 
 * Angle returned will be counterclockwise from the +ve X axis.
 * 
 * @param x X cordinate of a point in colour space
 * @param y Y coordinate of a point in colour space
 * @returns The angle to that point, in range [0, 1), counterclockwise from +ve X axis
 */
function rayUnProject(x: number, y: number): number {
    let angle = Math.atan2(y, x) / (Math.PI * 2);
    if(angle < 0) angle += 1;
    return angle;
}

/**
 * Convert an angle into an X,Y coordinate without any attempt to project
 * the square coordinate space down onto a circle (ie values like x=1, y=1
 * are not reachable on the circle).
 * @param angle Angle counterclockwise from +ve X axis, in range [0, 1)
 * @returns {x, y} coordinates of a point on the circumference of a unit
 * circle at that angle.
 */
function noProjection(angle: number): {x: number, y: number} {
    return {x: Math.cos(angle * Math.PI * 2), y: Math.sin(angle * Math.PI * 2)};
}


/**
 * The result of a model mapping a wheel position to a screen colour
 * 
 * If the resulting colour can't be represented in sRGB then sRGB will
 * clamped to something renderable and inGamut will be false.
 */
export type ModelResult = {
    inGamut: boolean;
    sRGB: string;
}

/** Generic type for colour model parameters, which are almost always triplets of numbers (usually 0-360 or 0-100) */
export type ModelParams = [number, number, number];
/**
 * Representation of where a spot colour lies in the range
 * of one parameter of a model.
 */
export type ColourOnGradient = {
    /** Function for generating gradient stops. t will be a percent in range [0, 100] */
    stopFn: (t: number) => string;
    /** How far along the gradient the given colour lies, as a percent in range [0, 100] */
    position: number;
}
export interface ColourModel<ParamType = ModelParams> {
    code: string;
    name: string;
    description: string;
    aLabel: string;
    bLabel: string;
    scaleDefaults?: RadialScalingOpt;
    generateRGB: (angle: number, distance: number, scaling: RadialScaling) => ModelResult;
    locateLAB: (lab: ModelParams, scaling: RadialScaling) => ColourLocation<ParamType>;
    aGradient: (colour: ModelParams) => ColourOnGradient;
    bGradient: (colour: ModelParams) => ColourOnGradient;
    angleGradient?: (colour: ModelParams) => ColourOnGradient;
}

export type RadialScaling = {
    aMin: number;
    aMax: number;
    bMin: number;
    bMax: number;    
}
export type RadialScalingOpt = {
    [k in keyof RadialScaling]?: RadialScaling[k];
}

export type ColourLocation<ParamType = ModelParams> = {
    angle: number;
    distance: number;
    inModel: ParamType;
    aDelta: number;
    bDelta: number;
}

/**
 * The default values for a/b min/max if a model doesn't override them
 */
 export const DefaultDefaults: RadialScaling = {
    aMin: 0,
    aMax: 100,
    bMin: 0,
    bMax: 100
};


/**
 * Get the default values from a model as a set of current values, ie for each of
 * [a|b][Min|Max]Default properties present on the model, return an object with
 * [a|b][MinMax] = <default>. For any values not defined by the model, return the
 * fallback defaults.
 * 
 * Use object assignment or spread to inject these into the default values
 * 
 * @param model Model to fetch defaults from
 * @returns 
 */
export function getModelDefaults(model?: ColourModel) : RadialScaling {
    return {...DefaultDefaults, ...model?.scaleDefaults};
}

export const HSLModel: ColourModel = {
    code: "HSL",
    name: "Hue/Saturation/Lightness",
    description: "Hue/Saturation/Lightness per NPM color-convert module",
    aLabel: "Saturation",
    bLabel: "Lightness",
    generateRGB: (angle: number, distance: number, scaling: RadialScaling) => {
        // Hue/X/X models place yellow at 300 degrees; to align with CIE (yellow at 270) we counterrotate a bit
        var h = (angle * 360 + 330) % 360;
        var {a: s, b: l} = scaleAB(distance, scaling);
        return {
            inGamut: true,
            sRGB: "#" + convert.hsl.hex([h, s, l])
        };
    },
    locateLAB(lab, scaling):  ColourLocation {
        var [h, s, l] = convert.lab.hsl(lab);
        return {
            angle: ((h + 30) % 360) / 360,
            inModel: [h, s, l],
            ...unscaleAB({a: s, b: l}, scaling)
        }        
    },
    aGradient(colour: ModelParams): ColourOnGradient {
        const [h, s, l] = colour;
        return {
            stopFn: (i) => "#" + convert.hsl.hex([h, i, l]),
            position: s
        }
    },
    bGradient(colour: ModelParams): ColourOnGradient {
        const [h, s, l] = colour;
        return {
            stopFn: (i) => "#" + convert.hsl.hex([h, s, i]),
            position: l
        }
    },    
}

export const HSVModel: ColourModel = {
    code: "HSV",
    name: "Hue/Saturation/Value",
    description: "Hue/Saturation/Value per NPM color-convert module",
    aLabel: "Saturation",
    bLabel: "Value",
    generateRGB: (angle: number, distance: number, scaling: RadialScaling) => {
        // Hue/X/X models place yellow at 300 degrees; to align with CIE (yellow at 270) we counterrotate a bit
        var h = (angle * 360 + 330) % 360;
        var {a: s, b: v} = scaleAB(distance, scaling);
        return {
            inGamut: true,
            sRGB: "#" + convert.hsv.hex([h, s, v])
        };
    },
    locateLAB(lab: ModelParams, scaling: RadialScaling) {
        var [h, s, v] = convert.lab.hsv(lab);
        return {
            angle: ((h + 30) % 360) / 360,
            inModel: [h, s, v],
            ...unscaleAB({a: s, b: v}, scaling)
        }
    },
    aGradient(colour: ModelParams): ColourOnGradient {
        const [h, s, v] = colour;
        return {
            stopFn: (i) => "#" + convert.hsv.hex([h, i, v]),
            position: s
        }
    },
    bGradient(colour: ModelParams): ColourOnGradient {
        const [h, s, v] = colour;
        return {
            stopFn: (i) => "#" + convert.hsv.hex([h, s, i]),
            position: v
        }
    },    
}

export const HCVModel: ColourModel = {
    code: "HCV",
    name: "Hue/Chroma/inverted Value (Greyness)",
    description: "Hue/Chroma/Value (or Greynesss) per NPM color-convert module. HCV from https://github.com/hydra2s-info/hcv-color",
    aLabel: "Chroma",
    bLabel: "Value (inverted - 100 is max greyness, 0 is no greyness)",
    scaleDefaults: {
        bMax: 0
    },
    generateRGB: (angle: number, distance: number, scaling: RadialScaling) => {
        // Hue/X/X models place yellow at 300 degrees; to align with CIE (yellow at 270) we counterrotate a bit
        var h = (angle * 360 + 330) % 360;
        var {a: c, b: g} = scaleAB(distance, scaling);
        return {
            inGamut: true,
            sRGB: "#" + convert.hcg.hex([h, c, g])
        };
      },
      locateLAB(lab: ModelParams, scaling: RadialScaling) {
        var [h, c, g] = convert.lab.hcg(lab);
        return {
            angle: ((h + 30) % 360) / 360,
            inModel: [h, c, g],
            ...unscaleAB({a: c, b: g}, scaling)
        }
    },      
    aGradient(colour: ModelParams): ColourOnGradient {
        const [h, c, g] = colour;
        return {
            stopFn: (i) => "#" + convert.hsv.hex([h, i, g]),
            position: c
        }
    },
    bGradient(colour: ModelParams): ColourOnGradient {
        const [h, c, g] = colour;
        return {
            stopFn: (i) => "#" + convert.hsv.hex([h, c, i]),
            position: g
        }
    },    
}


export const HWBModel: ColourModel = {
    code: "HWB",
    name: "Hue/White/Black",
    description: "Hue/White/Black per NPM color-convert module",
    aLabel: "White",
    bLabel: "Black",
    scaleDefaults: {
        aMax: 0,
        bMin: 100,
        bMax: 0
    },
    generateRGB: (angle: number, distance: number, scaling: RadialScaling) => {
        // Hue/X/X models place yellow at 300 degrees; to align with CIE (yellow at 270) we counterrotate a bit
        var h = (angle * 360 + 330) % 360;
        var {a: w, b} = scaleAB(distance, scaling);
        return {
            inGamut: true,
            sRGB: "#" + convert.hwb.hex([h, w, b])
        };
    },
    locateLAB(lab: ModelParams, scaling: RadialScaling) {
        var [h, w, b] = convert.lab.hwb(lab);
        return {
            angle: ((h + 30) % 360) / 360,
            inModel: [h, w, b],
            ...unscaleAB({b}, scaling)
        }
    },
    aGradient(colour: ModelParams): ColourOnGradient {
        const [h, w, b] = colour;
        return {
            stopFn: (i) => "#" + convert.hwb.hex([h, i, b]),
            position: w
        }
    },
    bGradient(colour: ModelParams): ColourOnGradient {
        const [h, w, b] = colour;
        return {
            stopFn: (i) => "#" + convert.hwb.hex([h, w, i]),
            position: b
        }
    },
}

const JCH_CHROMA_SCALE = 1.5;
export const JChModel: ColourModel = {
    code: "JCh",
    name: "CIECAM02 JCh",
    description: "CIECAM02 lightness/chroma/hue using NPM color-calculus module",
    aLabel: "Lightness",
    bLabel: "Chroma",
    scaleDefaults: {
        aMin: 50,
        aMax: 50,
        bMax: 69
    },
    generateRGB: (angle: number, distance: number, scaling: RadialScaling) => {
        var h = angle * 360;
        var {a: J, b: C} = scaleAB(distance, scaling);
        return rgbToResult(calculus.JCh_to_sRGB(J, C * JCH_CHROMA_SCALE, h));
    },
    locateLAB(lab, scaling):  ColourLocation {
        var [J, C, h] = calculus.lab_to_JCh(lab);
        return {
            angle: h / 360,
            inModel: [J, C, h],
            ...unscaleAB({a: J, b: C/JCH_CHROMA_SCALE}, scaling)
        }        
    },
    aGradient(colour: ModelParams): ColourOnGradient {
        const [J, C, h] = colour;
        return {
            stopFn: (i) => rgbToClampedHex(calculus.JCh_to_sRGB(i, C, h)),
            position: J
        }
    },
    bGradient(colour: ModelParams): ColourOnGradient {
        const [J, C, h] = colour;
        return {
            stopFn: (i) => rgbToClampedHex(calculus.JCh_to_sRGB(J, i * JCH_CHROMA_SCALE, h)),
            position: C / JCH_CHROMA_SCALE
        }
    },
    angleGradient(colour: ModelParams): ColourOnGradient {
        const [J, C, h] = colour;
        return {
            stopFn: (i) => rgbToClampedHex(calculus.JCh_to_sRGB(J, C, i * 3.6)),
            position: h / 3.6
        }
    },
}

/** Scale factor for A* and B* in L*A*B* space
 * While A* and B* are technically unbounded, +/- 100 is definitely
 * too small for a maximum value (128 is common when using a single byte,
 * 150 is possible for some reds).
*/
const LAB_SCALE = 1.5;

export const LABProjectedModel: ColourModel = {
    code: "LAB-PROJ",
    name: "CIELAB Projected",
    description: "CIELAB (lightness, a, b) using NPM color-calculus module. A* and B* are mapped onto the circle using an eliptical-disc projection - so 45?? is (1,1) and not (??????2,??????2), etc.",
    aLabel: "Lightness",
    bLabel: "A*B* scale",
    scaleDefaults: {
        aMin: 50,
        aMax: 50
    },
    generateRGB: (angle: number, distance: number, scaling: RadialScaling) => {
        let {a: l, b: scale} = scaleAB(distance, scaling);
        scale *= LAB_SCALE;
        // Could make this swappable but they seem to generate the exact same output
        let {x, y} = rayProject(angle);
        // Invert x/y as that ends up with us closely matching hue angle from every other model
        return rgbToResult(calculus.lab_to_sRGB(l, x * scale, y * scale));
    },
    locateLAB(lab, scaling):  ColourLocation {
        var [l, a, b] = lab;
        var angle = rayUnProject(a, b);
        // Work out where that angle intersects the +/-1 square in colour space
        let {x:unitX, y:unitY} = rayProject(angle);
        // Now work out how out along that ray we are
        let raydist = unitX === 0 ? (unitY === 0 ? 0 : b/unitY) : a/unitX;
        // Reduce down to get into the 0-100 range (ish)
        let scale = raydist/LAB_SCALE;
        return {
            angle: angle,
            inModel: lab,
            ...unscaleAB({a: l, b: scale}, scaling)
        }        
    },    
    aGradient(colour: ModelParams): ColourOnGradient {
        const [l, a, b] = colour;
        return {
            stopFn: (i) => rgbToClampedHex(calculus.lab_to_sRGB(i, a, b)),
            position: l
        }
    },
    bGradient(colour: ModelParams): ColourOnGradient {
        const [l, a, b] = colour;
        // Get the angle of this colour in A*B* projected space
        const angle = rayUnProject(a, b);
        // Then get a unit x,y vector on that angle
        const {x, y} = rayProject(angle);
        // Get our position on that
        const abSize = (x === 0 ? (y === 0 ? 0 : b/y) : a/x)/LAB_SCALE;
        return {
            stopFn: (i) => rgbToClampedHex(calculus.lab_to_sRGB(l, x * LAB_SCALE * i, y * LAB_SCALE * i)),
            position: abSize
        }
    },
}

export const LABModel: ColourModel = {
    code: "LAB",
    name: "CIELAB",
    description: "CIELAB (lightness, a, b) using NPM color-calculus module. A* and B* are left in cartesian coordinates so only reach their maximum values along the axes.",
    aLabel: "Lightness",
    bLabel: "A*B* scale",
    scaleDefaults: {
        bMin: 100
    },
    generateRGB: (angle: number, distance: number, scaling: RadialScaling) => {
        let {a: l, b: scale} = scaleAB(distance, scaling);
        // A*B* can exceed 100, so scale up
        scale *= LAB_SCALE;
        let {x, y} = noProjection(angle);
        return rgbToResult(calculus.lab_to_sRGB(l, x * scale, y * scale));
    },
    locateLAB(lab, scaling): ColourLocation {
        var [l, a, b] = lab;
        // Angle is the same whether it's a ray-square intersection or angle around a circle, at least
        var angle = rayUnProject(a, b)
        let scale = Math.sqrt(a**2 + b**2) / LAB_SCALE;
        return {
            angle: angle,
            inModel: lab,
            ...unscaleAB({a: l, b: scale}, scaling)
        }        
    },
    aGradient(colour: ModelParams): ColourOnGradient {
        const [l, a, b] = colour;
        return {
            stopFn: (i) => rgbToClampedHex(calculus.lab_to_sRGB(i, a, b)),
            position: l
        }
    },
    bGradient(colour: ModelParams): ColourOnGradient {
        const [l, a, b] = colour;
        // Get the angle of this colour in A*B* projected space
        const angle = rayUnProject(a, b);
        // Then get a unit x,y vector on that angle
        const {x, y} = noProjection(angle);
        // Get our position on that
        const abSize = (x === 0 ? (y === 0 ? 0 : b/y) : a/x)/LAB_SCALE;
        return {
            stopFn: (i) => rgbToClampedHex(calculus.lab_to_sRGB(l, x * LAB_SCALE * i, y * LAB_SCALE * i)),
            position: abSize
        }
    },        
}

/** Scale factor for Chroma, which can exceed 100 (150 seems a reasonable upper bound) */
const HCL_CHROMA_SCALE=1.5;
export const HCLModel: ColourModel = {
    code: "HCL",
    name: "CIELAB in polar coordinates",
    description: "CIELAB (lightness, a, b) using NPM color-calculus module, in polar coordinates.",
    aLabel: "Chroma",
    bLabel: "Lightness",
    generateRGB: (angle: number, distance: number, scaling: RadialScaling) => {
        let h = angle * 360;
        let {a: c, b: l} = scaleAB(distance, scaling);
        return rgbToResult(calculus.hcl_to_sRGB(h, c * HCL_CHROMA_SCALE, l));
    },
    locateLAB(lab: ModelParams, scaling: RadialScaling): ColourLocation {
        var [h, c, l] = calculus.lab_to_hcl(lab);
        return {
            angle: h / 360,
            inModel: [h, c, l],
            ...unscaleAB({a: c / HCL_CHROMA_SCALE, b: l}, scaling)
        }
    },
    aGradient(colour: ModelParams): ColourOnGradient {
        const [h, c, l] = colour;
        return {
            stopFn: (i) => rgbToClampedHex(calculus.hcl_to_sRGB(h, i * HCL_CHROMA_SCALE, l)),
            position: c / HCL_CHROMA_SCALE
        }
    },
    bGradient(colour: ModelParams): ColourOnGradient {
        const [h, c, l] = colour;
        return {
            stopFn: (i) => rgbToClampedHex(calculus.hcl_to_sRGB(h, c, i)),
            position: l
        }
    },    
    angleGradient(colour: ModelParams): ColourOnGradient {
        const [h, c, l] = colour;
        return {
            stopFn: (i) => rgbToClampedHex(calculus.hcl_to_sRGB(i * 3.6, c, l)),
            position: h/3.6
        }
    },    
    
}

export const ALL_MODELS = [HSLModel, HSVModel, HCVModel, HWBModel, JChModel, LABModel, LABProjectedModel, HCLModel/*, JChAltModel*/];
export function getModelFromCode(code: string): ColourModel | null {
    for(var m of ALL_MODELS) if(m.code === code) return m;
    return null;
}
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
//     generateRGB: (angle: number, distance: number, scaling: RadialScaling) => {
//         var h = angle * 360;
//         var {a: J, b: C} = scaleAB(distance, scaling);
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