import { lab_to_sRGB } from "color-calculus";
import { ColourModel, ColourOnGradient, RadialScaling, rgbToClampedHex } from "./ColourModels";
import { getNamedColourID, NamedColour } from "./colours/Colours";

import React, { useState } from 'react';

import { createTheme, styled, Theme, ThemeProvider } from '@mui/material/styles';
import Accordion, { AccordionProps } from '@mui/material/Accordion';
import AccordionSummary,  {AccordionSummaryProps } from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import NorthIcon from '@mui/icons-material/North';
import SouthIcon from '@mui/icons-material/South';
import EastIcon from '@mui/icons-material/East';
import WestIcon from '@mui/icons-material/West';



enum LabelPosition {
  RIGHT,
  LEFT,
  ABOVE,
  BELOW
}
const SwatchTheme = createTheme({
  palette: {mode: 'dark'},
  typography: {
    fontSize: 10
  }
});
const LabelStyles = [
  (theme: Theme) => ({ // RIGHT
    left: `calc(100% + ${theme.spacing(1)})`,
    top: 0,
  }),
  (theme: Theme) => ({ // LEFT
    right: `calc(100% + ${theme.spacing(1)})`,
    top: 0
  }),
  (theme: Theme) => ({ // ABOVE
    transform: "translateX(-50%)",
    left: "50%",
    top: theme.spacing(-4),
  }),
  (theme: Theme) => ({ // BELOW
    transform: "translateX(-50%)",
    left: "50%",
    top: `calc(100% + ${theme.spacing(1)})`,
  }),

];
const SwatchLabel = styled(
  (props: AccordionProps & {position: LabelPosition}) => (
    <Accordion disableGutters {...props} />
  ),
  {
    name: "SwatchLabel",
    shouldForwardProp: (prop) => prop !== 'position',
  })
(({ theme, position }) => ({
  position: "absolute",
  minWidth: "170px",
  background: "rgba(0, 0, 0, 0.74)",  
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
  ...LabelStyles[position](theme)
}));

const SwatchSummary = styled((props: AccordionSummaryProps) => (
  <AccordionSummary
    expandIcon={<ExpandMoreIcon />}
    {...props}
  />
))(({ theme }) => ({
  whiteSpace: "nowrap",
  minHeight: theme.spacing(3),
  lineHeight: theme.spacing(3),
  margin: 0,
  padding: `0 0 0 ${theme.spacing(1)}`,
  '& .MuiAccordionSummary-content': {
    margin: 0
  }
}));

const SwatchDetails = styled(AccordionDetails)(({ theme }) => ({
  padding: theme.spacing(1),
  paddingTop: 0,
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
    marginTop: theme.spacing(1)
  }
}));


/** Number of stops on a model parameter gradient for swatch details */
const GRAD_STOPS = 11;
/** Size of each stop, in % points */
const GRAD_STOP_SIZE = 100/(GRAD_STOPS-1);

type SwatchGradientParams = {
  gradient: ColourOnGradient,
  label: string
};

function SwatchGradient({gradient, label}: SwatchGradientParams) {
  return (<>
    <Typography variant="h6">{label}</Typography>
    <div className="gradient" style={{background: `linear-gradient(90deg, ${Array.from({length: GRAD_STOPS}, (_, i) => gradient.stopFn(i * GRAD_STOP_SIZE)).join(", ")})`}}>
    <div className="location" style={{left: `${Math.min(100, gradient.position)}%`}} title={gradient.position > 100 ? `${label} off the scale` : ''}>{gradient.position > 100 && '>'}</div>
    </div>  
  </>)
}

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
    let [position, setPosition] = useState<LabelPosition>(LabelPosition.RIGHT);

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
    const aGrad = model.aGradient(location.inModel);
    const bGrad = model.bGradient(location.inModel);
    const angleGrad = model.angleGradient ? model.angleGradient(location.inModel) : undefined;

    const id = getNamedColourID(colour);
    console.log("Rendering swatch with position", position);
    // We could use styled-components to remove the explicit width/height everywhere, but this works for now
    return <div
      className="swatch"
      style={{left, top, width: size, height: size}}>
        <div className={dotClassName}
        // Angle is offset by 45 degrees as the border-radiuses mean our "horizontal" starts out going bottom-left to top-right
        // It's also clockwise (whereas our angles are usually CCW)
          style={{transform: `rotate(${-angleRad + Math.PI/4}rad)`, backgroundColor: hex}}/>
        {showLabel &&
        <ThemeProvider theme={SwatchTheme}>
            <SwatchLabel position={position}>
                <SwatchSummary aria-controls={`${id}-content`} id={`${id}-header`}>
                    {colour.name}
                </SwatchSummary>
                <SwatchDetails>
                {model.angleGradient && <SwatchGradient gradient={model.angleGradient(location.inModel)!} label="Hue/angle"/>
                }
                <SwatchGradient gradient={model.aGradient(location.inModel)} label={model.aLabel}/>
                <SwatchGradient gradient={model.bGradient(location.inModel)} label={model.bLabel}/>
                <Typography variant="h6">CIE L*A*B*</Typography>
                {colour.lab.map(v => Math.round(v * 10)/10).join(", ")}
                <Typography variant="h6">{model.name}</Typography>
                {location.inModel.map(v => Math.round(v * 10)/10).join(", ")}
                <Typography variant="h6">Label position</Typography>
                <ToggleButtonGroup
                  value={position}
                  exclusive
                  color="secondary"
                  size="small"
                  onChange={(_, newPosition) => setPosition(newPosition)}
                  aria-label="Label location"
                >
                  <ToggleButton value={LabelPosition.RIGHT} aria-label="right of swatch">
                    <EastIcon />
                  </ToggleButton>
                  <ToggleButton value={LabelPosition.LEFT} aria-label="left of swatch">
                    <WestIcon />
                  </ToggleButton>
                  <ToggleButton value={LabelPosition.ABOVE} aria-label="above swatch">
                    <NorthIcon />
                  </ToggleButton>
                  <ToggleButton value={LabelPosition.BELOW} aria-label="below swatch">
                    <SouthIcon />
                  </ToggleButton>
                </ToggleButtonGroup>                
                </SwatchDetails>
            </SwatchLabel>
          </ThemeProvider>
        }
    </div>;
}