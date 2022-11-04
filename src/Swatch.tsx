import { lab_to_sRGB } from "color-calculus";
import { ColourModel, RadialScaling, rgbToClampedHex } from "./ColourModels";
import { getNamedColourID, NamedColour } from "./colours/Colours";

import React from 'react';

import { styled } from '@mui/material/styles';
import Accordion, { AccordionProps } from '@mui/material/Accordion';
import AccordionSummary,  {AccordionSummaryProps } from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Typography from '@mui/material/Typography';

const SwatchLabel = styled((props: AccordionProps) => (
  <Accordion disableGutters {...props} />
))(({ theme }) => ({
  position: "absolute",
  left: `calc(100% + ${theme.spacing(1)})`,
  color: "#fff",
  background: "rgba(0, 0, 0, 0.74)",
  fontSize: "0.8rem",
  borderRadius: theme.spacing(0.5),
  zIndex: theme.zIndex.tooltip,
  '&.Mui-expanded': {
    zIndex: theme.zIndex.tooltip + 100,
  },
  '&:focus-within': {
    zIndex: theme.zIndex.tooltip + 1,
  },
  '&.Mui-expanded:focus-within': {
    zIndex: theme.zIndex.tooltip + 101,
  },
  '&:hover': {
    zIndex: theme.zIndex.tooltip + 10,
  },
  '&.Mui-expanded:hover': {
    zIndex: theme.zIndex.tooltip + 110,
  },
}));

const SwatchSummary = styled((props: AccordionSummaryProps) => (
  <AccordionSummary
    expandIcon={<ExpandMoreIcon sx={{color: "#fff"}} />}
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
  paddingTop: 0,
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
    textAlign: "center"
  },
  "& h6": {
    fontSize: "0.9rem",
    marginTop: theme.spacing(1)
  }
}));


/** Number of stops on a model parameter gradient for swatch details */
const GRAD_STOPS = 11;
/** Size of each stop, in % points */
const GRAD_STOP_SIZE = 100/(GRAD_STOPS-1);

export type SwatchProps = {
    colour: NamedColour,
    model: ColourModel,
    scaling: RadialScaling,
    size: number,
    showLabel: boolean
}

export function Swatch(props: SwatchProps) {
    const {
        model,
        colour,
        scaling,
        size,
        showLabel
    } = props;

    // Calculate where to place the swatch dot relative to the container, which we do using
    // percentage left/top values
    const location = model.locateLAB(colour.lab, scaling);
    const angleRad = location.angle * Math.PI * 2;
    const  clampedDistance = Math.max(0, Math.min(1, location.distance));
    // Because of the flipped canvas, our angles start from the +ve X axis and wind anticlockwise
    // Get x/y positions in the range -1 to +1
    const x = (clampedDistance * Math.cos(angleRad));
    const y = (clampedDistance * Math.sin(angleRad));
    const hex = rgbToClampedHex(lab_to_sRGB(colour.lab));
    // Convert x/y between [-1, +1] from centre to [0%, 100%] from top left corner
    const left = `calc(${(x * 50) + 50}% - ${size/2}px)`;
    const top = `calc(${50 - (y * 50)}% - ${size/2}px)`;
    // And store a css class to add if the real location is outside the wheel
    const dotClassName = location.distance < 0 ? "dot inside" : location.distance > 1 ? "dot outside" : "dot";

    // Set up some gradients
    const aGrad = model.aGradient ? model.aGradient(location.inModel) : undefined;
    const bGrad = model.bGradient ? model.bGradient(location.inModel) : undefined;

    const id = getNamedColourID(colour);
    // We could use styled-components to remove the explicit width/height everywhere, but this works for now
    return <div
      className="swatch"
      style={{left, top, width: size, height: size}}>
        <div className={dotClassName}
        // Angle is offset by 45 degrees as the border-radiuses mean our "horizontal" starts out going bottom-left to top-right
        // It's also clockwise (whereas our angles are usually CCW)
          style={{transform: `rotate(${-angleRad + Math.PI/4}rad)`, backgroundColor: hex}}/>
        {showLabel &&
            <SwatchLabel>
                <SwatchSummary aria-controls={`${id}-content`} id={`${id}-header`}>
                    {colour.name}
                </SwatchSummary>
                <SwatchDetails sx={{minWidth: 160}}>
                {aGrad && <>
                    <Typography variant="h6">{model.aLabel}</Typography>
                    <div className="gradient" style={{background: `linear-gradient(90deg, ${Array.from({length: GRAD_STOPS}, (_, i) => aGrad.stopFn(i * GRAD_STOP_SIZE)).join(", ")})`}}>
                    <div className="location" style={{left: `${Math.min(100, aGrad.position)}%`}} title={aGrad.position > 100 ? `${model.aLabel} off the scale` : ''}>{aGrad.position > 100 && '>'}</div>
                    </div>
                </>}
                {bGrad && <>
                  <Typography variant="h6">{model.bLabel}</Typography>
                    <div className="gradient" style={{background: `linear-gradient(90deg, ${Array.from({length: GRAD_STOPS}, (_, i) => bGrad.stopFn(i * GRAD_STOP_SIZE)).join(", ")})`}}>
                    <div className="location" style={{left: `${Math.min(100, bGrad.position)}%`}}title={bGrad.position > 100 ? `${model.bLabel} off the scale` : ''}>{bGrad.position > 100 && '>'}</div>
                    </div>
                </>}
                <Typography variant="h6">CIE L*A*B*</Typography>
                {colour.lab.map(v => Math.round(v * 10)/10).join(", ")}
                <Typography variant="h6">{model.name}</Typography>
                {location.inModel.map(v => Math.round(v * 10)/10).join(", ")}
                </SwatchDetails>
            </SwatchLabel>
        }
    </div>;
}