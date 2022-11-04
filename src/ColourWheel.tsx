import React, { RefObject, useLayoutEffect, useRef } from 'react';
import { ColourModel, getModelDefaults, RadialScaling } from './ColourModels';
import { getNamedColourID, NamedColour } from './colours/Colours';

import useResizeObserver from '@react-hook/resize-observer'

import './ColourWheel.css';
import { Swatch } from './Swatch';


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
  swatches?: NamedColour[];
  swatchLabels?: boolean;
}


function redrawCanvas(canvasRef: RefObject<HTMLCanvasElement>, props: ColourWheelProps) {
  // Blithely assert we'll never fail to get a context
  if(!canvasRef.current) {
    console.debug("Canvas ref is undefined");
    return;
  }
  const ctx = canvasRef.current?.getContext("2d");
  if(!ctx) {
    console.debug("Failed to get a context");
    return;
  } 
  // Model isn't optional so this can't fail to get the right defaults
  const modelDefaults: RadialScaling = getModelDefaults(props.model);
  const {
    slices = 60,
    rings = 10,
    fill = true,
    gamutWarnings = false,
    model,
    aMin,
    aMax,
    bMin,
    bMax
  } = {...modelDefaults, ...props};
  const scaling: RadialScaling = {aMin: aMin, aMax: aMax, bMin: bMin, bMax: bMax};
  const [width, height] = [canvasRef.current.clientWidth, canvasRef.current.clientHeight];
  
  // Scale the wheel to the smaller dimension
  const size = Math.min(width, height);
  // Resize the canvas buffer to be the same size as it's client width/height,
  // then clear it
  ctx.canvas.width = width; ctx.canvas.height=height;
  ctx.resetTransform();
  ctx.clearRect(0, 0, width, height);
  // The maths is much easier if the canvas looks like the x/y space usually used
  // in most maths examples, ie 0,0 is in the centre, +x is right, +y is up.
  // So, offset x/y by half:
  ctx.translate(width/2, height/2);
  // Flip the canvas to make +ve y towards the top of the screen. This also has the
  // side-effect of making all angles counterclockwise from horizontal. Fortunately
  // that gives us hue circles in the order we generally expect, so we don't bother
  // compensating for it (except when we need to go back to angles that are clockwise
  // in a few places)
  ctx.scale(1, -1);

  // Angle swept by a single pie slice
  const sliceAngle = Math.PI * 2 / slices;
  // Radius delta of a single ring. Subtract 1 pixel so if we draw strokes on the section
  // (ie no-fill mode) the outermost ring doesn't clip
  const ringRadius = (size/2 - 1) / rings;
  
  // Expand sections by this small amount from the 'ideal' calculation to avoid
  // tiny gaps between them
  const overlap = 0.5;

  for(let slice = 0; slice < slices; slice++) {
    // Whether we were previously in-gamut in this slice, or null if unknown (ie first ring)
    let sliceInGamut: boolean | null = null;
    for(var ring=0; ring < rings; ring++) {
      // Overlap would otherwise have us draw the first ring starting at -0.5, so clamp to 0
      const innerRadius = Math.max(0, ring * ringRadius - overlap);
      const outerRadius = (ring + 1) * ringRadius;
      // 'Ideal' angles for this section, we'll add some overlap later
      const startAngle = ((slice - 0.5) * sliceAngle);
      const endAngle = ((slice + 0.5) * sliceAngle);      

      // Work out how much angle the overlap spans at each edge of the section
      const innerOverlapAngle = innerRadius === 0 ? 0 : Math.asin(overlap/innerRadius);
      const outerOverlapAngle = Math.asin(overlap/outerRadius);
      
      // Angle goes [0, 1) but distance goes (0, 1] because we always want to at least draw the maximum chroma/brightness/value at the outside
      const result = model.generateRGB(slice/slices, (ring + 1)/rings, scaling);
      ctx.fillStyle = result.sRGB;
      
      ctx.beginPath();
      // Inside border, runs 'clockwise' (in pre-transform canvas space; ccw on screen)
      ctx.arc(0, 0, innerRadius, startAngle - innerOverlapAngle, endAngle + innerOverlapAngle);
      // Draw a border on the inside of this section if gamut has changed from the previous
      // section along the radial (and we want to draw them). Do this now so we can
      // piggy-back off the arc() call that describes the inside edge of the section
      if(fill && gamutWarnings && result.inGamut !== sliceInGamut) {
        ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
        ctx.stroke();
      }
      // Outside border, running 'anticlockwise', defines the rest of the section
      ctx.arc(0, 0, outerRadius, endAngle + outerOverlapAngle, startAngle - innerOverlapAngle, true);
      ctx.closePath();
      if(fill) ctx.fill();
      else ctx.stroke();
      // If the section is out of gamut, draw a marker in the middle
      if(fill && gamutWarnings && !result.inGamut) {
        let x = Math.cos(slice * sliceAngle) * (ring + 0.5) * ringRadius;
        let y = Math.sin(slice * sliceAngle) * (ring + 0.5) * ringRadius;
        ctx.beginPath();
        ctx.arc(x, y, ringRadius/20, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
        ctx.stroke();
      }
      // Store in-gamut flag to be used by the rest of the sections on this radial
      sliceInGamut = result.inGamut;
    }
  }
}

export function ColourWheel (props: ColourWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // We redraw the canvas when either the element is resized (eg window resize, reflow, whatever)
  // or after everything else has been layed out (initial render, also whenever props change)
  useResizeObserver(canvasRef, (_) => {
    redrawCanvas(canvasRef, props);
  });
  useLayoutEffect(() => {
    redrawCanvas(canvasRef, props);
  }, [canvasRef, props]);


  const {
    swatches = [], 
    model, 
    swatchSize = 20,
    swatchLabels = true,
    aMin,
    aMax,
    bMin,
    bMax
  } = {...getModelDefaults(props.model), ...props};
  const scaling: RadialScaling = {aMin: aMin, aMax: aMax, bMin: bMin, bMax: bMax};
  return(
    <div className="wheel">
      <div className="square">
      <>
      <canvas ref={canvasRef}/>
      {swatches.map(colour => <Swatch key={getNamedColourID(colour)} colour={colour} model={model} scaling={scaling} showLabel={swatchLabels} size={swatchSize}/>)}
      </>
      </div>
    </div>
  )
}
