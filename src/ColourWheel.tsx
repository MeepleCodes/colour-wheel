import { lab_to_sRGB } from 'color-calculus';
import { rgb } from 'color-convert';
import { RGB } from 'color-convert/conversions';
import React, { MutableRefObject, RefObject, useEffect, useLayoutEffect, useRef } from 'react';
import { ColourLocation, ColourModel, getModelDefaults, RadialScaling } from './ColourModels';
import { getSwatchID, Swatch } from './paints/Swatch';

import { styled } from '@mui/material/styles';
import Accordion, { AccordionProps } from '@mui/material/Accordion';
import AccordionSummary,  {AccordionSummaryProps } from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Grid from '@mui/material/Grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Typography from '@mui/material/Typography';

import useResizeObserver from '@react-hook/resize-observer'

import './ColourWheel.css';

type SwatchDetails = {
  left: string;
  top: string;
  colour: string;
  angle: number;
  oob: string;
  aDelta: number;
  bDelta: number;
  inModel: [number, number, number]
} & Swatch;

function getSwatchDetails(swatch: Swatch, location: ColourLocation, swatchSize: number): SwatchDetails {
  let {angle, distance, aDelta, bDelta, inModel} = location;
  // The size of the wheel, which will be drawn in the middle of the canvas if it's not square
  let angleRad = angle * Math.PI * 2;
  let clampedDistance = Math.max(0, Math.min(1, distance));
  // Because of the flipped canvas, our angles start from the +ve X axis and wind anticlockwise
  // Get x/y positions in the range -1 to +1
  let x = (clampedDistance * Math.cos(angleRad));
  let y = (clampedDistance * Math.sin(angleRad));
  let hex = "#" + rgb.hex(lab_to_sRGB(swatch.lab).map(v => Math.max(0, Math.min(255, v))) as RGB);        
  // Convert x/y between [-1, +1] from centre to [0%, 100%] from top left corner
  return {
    ...swatch,
    left: `calc(${(x * 50) + 50}% - ${swatchSize/2}px)`,
    top: `calc(${50 - (y * 50)}% - ${swatchSize/2}px)`,
    colour: hex,
    // Invert angle into CSS world (where it's clockwise again)
    angle: -angleRad,
    inModel: inModel,
    aDelta,
    bDelta,
    oob: distance < 0 ? "inside" : distance > 1 ? "outside" : ""
  }
}

// div.swatch .tooltip {
//   position: absolute;
//   top: 0;
//   left: 25px;
//   opacity: 0.9;
//   background: rgba(97, 97, 97, 0.92);
//   color: white;
//   border-radius: 4px;
// }
// div.swatch .tooltip.Mui-expanded {
//   z-index: 10;
// }
const SwatchLabel = styled((props: AccordionProps) => (
  <Accordion disableGutters {...props} />
))(({ theme }) => ({
  position: "absolute",
  left: "calc(100% + 5px)",
  color: "#fff",
  background: "rgba(0, 0, 0, 0.74)",
  fontSize: "0.8rem",
  borderRadius: theme.spacing(0.5),
  zIndex: theme.zIndex.tooltip,
  '&.Mui-expanded': {
    zIndex: theme.zIndex.tooltip + 100,
  },
}));

const SwatchSummary = styled((props: AccordionSummaryProps) => (
  <AccordionSummary
    expandIcon={<ExpandMoreIcon />}
    {...props}
  />
))(({ theme }) => ({
  whiteSpace: "nowrap",
  minHeight: 0,
  margin: 0,
  padding: `0 0 0 ${theme.spacing(1)}`,
  '& .MuiAccordionSummary-content': {
    margin: 0
  }
}));

const SwatchDetails = styled(AccordionDetails)(({ theme }) => ({
  padding: theme.spacing(1),
  '& .MuiTypography-caption': {
    fontSize: "0.6rem"
  },
  '& .gradient': {
    width: "100%",
    height: 25,
    position: "relative"
  },
  '& .location': {
    top: "50%",
    margin: -10,
    width: 20,
    height: 20,
    position: "absolute",
    border: "1px solid white",
    outline: "1px solid black",
    boxSizing: "border-box",
    borderRadius: "100%",
  }
  // borderTop: '1px solid rgba(0, 0, 0, .125)',
}));


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
    bMax,
    swatches = []
  } = {...modelDefaults, ...props};
  const scaling: RadialScaling = {aMin: aMin, aMax: aMax, bMin: bMin, bMax: bMax};
  const [width, height] = [canvasRef.current.clientWidth, canvasRef.current.clientHeight];
  
  const size = Math.min(width, height);
  console.log("Redrawing canvas to scale ", size, "from canvas with width", width,"height", height);
  // Resize the canvas buffer to be the same size as it's client width/height
  ctx.canvas.width = width; ctx.canvas.height=height;
  ctx.resetTransform();
  ctx.clearRect(0, 0, width, height);
  ctx.translate(width/2, height/2);
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

export function ColourWheel (props: ColourWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useResizeObserver(canvasRef, (entry) => {
    console.log("Resize observer: redrawing");
    redrawCanvas(canvasRef, props);
  });
  useLayoutEffect(() => {
    console.log("layoutEffect: redrawing");
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
  var details: SwatchDetails[] = [];
  if(model.locateLAB && !SWATCHES_CANVAS) {
    // Need a const to capture to stop typescript worrying about the lambda in map()
    const lab = model.locateLAB;
    details = swatches.map(swatch => getSwatchDetails(swatch, lab(swatch.lab, scaling), swatchSize));
  }
  return(
    <div className="wheel">
      <div className="square">
      <>
      <canvas ref={canvasRef}/>
      {
        // We could use styled-components to remove the explicit width/height everywhere, but this works for now
        // Angle is offset by 45 degrees as the border-radiuses mean our "horizontal" starts out going bottom-left to top-right
        details.map(swatch => {
          const aGrad = model.aGradient ? model.aGradient(swatch.inModel) : undefined;
          const bGrad = model.bGradient ? model.bGradient(swatch.inModel) : undefined;
          return <div
            key={getSwatchID(swatch)}
            className="swatch"
            style={{left: swatch.left, top: swatch.top, width: swatchSize, height: swatchSize}}>
              <div className={"dot " + swatch.oob}
                style={{transform: `rotate(${swatch.angle + Math.PI/4}rad)`, backgroundColor: swatch.colour}}/>
            <SwatchLabel>
              <SwatchSummary
                aria-controls={`${getSwatchID(swatch)}-content`}
                id={`${getSwatchID(swatch)}-header`}
              >
                {swatch.name}
              </SwatchSummary>
              <SwatchDetails sx={{minWidth: 160}}>
              {aGrad && <>
                  {model.aLabel}
                  <div className="gradient" style={{background: `linear-gradient(90deg, ${aGrad.stops.join(", ")})`}}>
                    <div className="location" style={{left: `${aGrad.position * 100}%`}}/>
                  </div>
                </>}
                {bGrad && <>
                  {model.bLabel}
                  <div className="gradient" style={{background: `linear-gradient(90deg, ${bGrad.stops.join(", ")})`}}>
                    <div className="location" style={{left: `${bGrad.position * 100}%`}}/>
                  </div>
                </>}
                <p>
                <Typography variant="caption">CIE L*A*B*</Typography>
                {swatch.lab.map(v => Math.round(v * 10)/10).join(", ")}
                </p>
                <p>
                <Typography variant="caption">{model.code}</Typography>
                {swatch.inModel.map(v => Math.round(v * 10)/10).join(", ")}
                </p>
              </SwatchDetails>
            </SwatchLabel>
          </div>;
          
          // if(swatchLabels) {
          //   return (
          //     <Tooltip open={true} 
          //       key={swatch.name}
          //       arrow
          //       placement="right"
          //       // title={`${swatch.name}: angle=${swatch.angle * 360 / (Math.PI * 2)}, HWB=${swatch.inModel}`}
          //       // title={`${swatch.name} a:${swatch.aDelta} b: ${swatch.bDelta} (${swatch.inModel})`}
          //       title={swatch.name}
          //       >
          //         {dot}
          //     </Tooltip>
          //   );
          // } else {
          //   return dot;
          // }
        })
      }
      </>
      </div>
    </div>
  )
}
