import { lab_to_sRGB } from 'color-calculus';
import { rgb } from 'color-convert';
import { RGB } from 'color-convert/conversions';
import React from 'react';
import { ColourModel, getModelDefaults, RadialScaling } from './ColourModels';
import { Swatch } from './paints/Swatch';

import Tooltip from '@mui/material/Tooltip';

import './ColourWheel.css';

export type ColourWheelProps = {
  size?: number;
  slices?: number;
  rings?: number;
  fill?: boolean;
  gamutWarnings?: boolean;
  model: ColourModel;
  aMin?: number;
  aMax?: number;
  bMin?: number;
  bMax?: number;
  swatchSize?: number;
  swatches?: Swatch[];
  swatchLabels?: boolean;
}

const DEFAULT_SIZE = 300;
const SWATCHES_CANVAS = false;

export class ColourWheel extends React.Component<ColourWheelProps> {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  constructor(props: ColourWheelProps) {
    super(props);
    this.canvasRef = React.createRef();
  }
  componentDidMount(): void {
    const canvas = this.canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;
    // ctx.reset();
    this.redrawCanvas(ctx);
  }
  componentDidUpdate(prevProps: Readonly<ColourWheelProps>, prevState: Readonly<{}>, snapshot?: any): void {
    const canvas = this.canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;
    this.redrawCanvas(ctx);
  }
  redrawCanvas(ctx: CanvasRenderingContext2D): void {
    // Model isn't optional so this can't fail to get the right defaults
    const modelDefaults: RadialScaling = getModelDefaults(this.props.model);
    const {
      size = DEFAULT_SIZE,
      slices = 60,
      rings = 10,
      fill = true,
      gamutWarnings = false,
      model,
      aMin,
      aMax,
      bMin,
      bMax,
      swatches = []
    } = {...modelDefaults, ...this.props};
    const scaling: RadialScaling = {aMin: aMin, aMax: aMax, bMin: bMin, bMax: bMax};
    ctx.resetTransform();
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size/2, size/2);
    // Flip the canvas to make +ve y towards the top of the screen. This also has the
    // side-effect of making all angles counterclockwise from horizontal. Fortunately
    // that gives us hue circles in the order we generally expect, so we don't bother
    // compensating for it
    ctx.scale(1, -1);
    const sliceAngle = Math.PI * 2 / slices;
    // Avoid clipping the outside ring by insetting 1px
    const radius = size/2 - 1;
    const ringRadius = radius/rings;

    
    const radiusOverlap = 0.5;

    for(var slice = 0; slice < slices; slice++) {
      // Whether we were previously in-gamut in this slice, or null if unknown (ie first ring)
      var sliceInGamut: boolean | null = null;
      for(var ring=0; ring < rings; ring++) {
        
        
        var startRadius = Math.max(0, ring * ringRadius - radiusOverlap);
        var endRadius = (ring + 1) * ringRadius;
        var angleOverlap = Math.asin(0.5/endRadius);
        var startAngle = ((slice - 0.5) * sliceAngle) - angleOverlap;
        var endAngle = ((slice + 0.5) * sliceAngle) + angleOverlap;
        
        // Angle goes [0, 1) but distance goes (0, 1] because we always want to at least draw the maximum chroma/brightness/value at the outside
        var result = model.generateRGB(slice/slices, (ring + 1)/rings, scaling);
        ctx.fillStyle = result.sRGB;
        
        ctx.beginPath();
        ctx.arc(0, 0, startRadius, startAngle, endAngle);
        // Draw a gamut border if the in-gamut has changed (and wasn't previously null for 'unknown')
        if(fill && gamutWarnings && result.inGamut !== sliceInGamut) {
          ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
          ctx.stroke();
        }
        ctx.arc(0, 0, endRadius, endAngle, startAngle, true);
        ctx.closePath();
        if(fill) ctx.fill();
        else ctx.stroke();
        if(fill && gamutWarnings && !result.inGamut) {
          let x = Math.cos(slice * sliceAngle) * (ring + 0.5) * ringRadius;
          let y = Math.sin(slice * sliceAngle) * (ring + 0.5) * ringRadius;
          ctx.beginPath();
          ctx.arc(x, y, ringRadius/20, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
          ctx.stroke();
        }
        sliceInGamut = result.inGamut;
      }
    }
    const paintRadius = 10;
    if(model.locateLAB && SWATCHES_CANVAS) {
      for(var s of swatches) {
        let {angle, distance} = model.locateLAB(s.lab, scaling);
        let angleRad = angle * Math.PI * 2;
        let clampedDistance = Math.max(0, Math.min(1, distance));
        // Angle starts at 0 = +ve X axis
        let x = clampedDistance * radius * Math.cos(angleRad);
        let y = clampedDistance * radius * Math.sin(angleRad);
        let hex = "#" + rgb.hex(lab_to_sRGB(s.lab).map(v => Math.max(0, Math.min(255, v))) as RGB);
        ctx.fillStyle = hex;
        ctx.beginPath();
        if(distance < 0) {
          ctx.arc(x, y, paintRadius,  angleRad + (5/4 * Math.PI), angleRad + (3/4 * Math.PI));
          ctx.lineTo(x - paintRadius * Math.cos(angleRad) * Math.SQRT2, y - paintRadius * Math.sin(angleRad) * Math.SQRT2);
          ctx.closePath();
        } else if (distance > 1) {
          ctx.arc(x, y, paintRadius,  angleRad + (1/4 * Math.PI), angleRad + (7/4 * Math.PI));
          ctx.lineTo(x + paintRadius * Math.cos(angleRad) * Math.SQRT2, y + paintRadius * Math.sin(angleRad) * Math.SQRT2);
          ctx.closePath();
        } else {
          ctx.arc(x, y, paintRadius,  0, Math.PI * 2);
        }
        // ctx.moveTo(x - paintRadius, y);
        // ctx.lineTo(x, y + paintRadius);
        // ctx.lineTo(x+paintRadius, y);
        // ctx.lineTo(x, y-paintRadius);
        // ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

  }



  render() {
    const {
      size = DEFAULT_SIZE, 
      swatches = [], 
      model, 
      swatchSize = 20,
      swatchLabels = true,
      aMin,
      aMax,
      bMin,
      bMax
    } = {...getModelDefaults(this.props.model), ...this.props};
    const scaling: RadialScaling = {aMin: aMin, aMax: aMax, bMin: bMin, bMax: bMax};
    var details: SwatchDetails[] = [];
    if(model.locateLAB && !SWATCHES_CANVAS) {
      // Need a const to capture to stop typescript worrying about the lambda in map()
      const lab = model.locateLAB;
      details = swatches.map(swatch => {
        let {angle, distance, aDelta, bDelta, inModel} = lab(swatch.lab, scaling);
        let angleRad = angle * Math.PI * 2;
        let clampedDistance = Math.max(0, Math.min(1, distance));
        // Because of the flipped canvas, our angles start from the +ve X axis and wind anticlockwise
        let x = clampedDistance * size/2 * Math.cos(angleRad);
        let y = clampedDistance * size/2 * Math.sin(angleRad);
        let hex = "#" + rgb.hex(lab_to_sRGB(swatch.lab).map(v => Math.max(0, Math.min(255, v))) as RGB);        
        return {
          left: x + size/2 - swatchSize/2,
          top: size/2 - y - swatchSize/2,
          colour: hex,
          name: swatch.name,
          // Invert angle into CSS world (where it's clockwise again)
          angle: -angleRad,
          inModel: inModel,
          aDelta,
          bDelta,
          oob: distance < 0 ? "inside" : distance > 1 ? "outside" : ""
        }
      });
    }
    return(
      <div className="wheel-wrapper">
        <>
        <canvas ref={this.canvasRef} width={size} height={size} />
        {
          // We could use styled-components to remove the explicit width/height everywhere, but this works for now
          // Angle is offset by 45 degrees as the border-radiuses mean our "horizontal" starts out going bottom-left to top-right
          details.map(swatch => {
            const dot = <div
            className={"swatch " + swatch.oob} 
            style={{transform: `rotate(${swatch.angle + Math.PI/4}rad)`, left: swatch.left, top: swatch.top, backgroundColor: swatch.colour, width: swatchSize, height: swatchSize}}/>;
            if(swatchLabels) {
              return (
                <Tooltip open={true} 
                  key={swatch.name}
                  arrow
                  placement="right"
                  // title={`${swatch.name}: angle=${swatch.angle * 360 / (Math.PI * 2)}, HWB=${swatch.inModel}`}
                  // title={`${swatch.name} a:${swatch.aDelta} b: ${swatch.bDelta} (${swatch.inModel})`}
                  title={swatch.name}
                  >
                    {dot}
                </Tooltip>
              );
            } else {
              return dot;
            }
          })
        }
        </>
      </div>
    )
  }
}
type SwatchDetails = {
  left: number;
  top: number;
  colour: string;
  name: string;
  angle: number;
  oob: string;
  aDelta: number;
  bDelta: number;
  inModel: [number, number, number]
}