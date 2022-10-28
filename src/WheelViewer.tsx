import React, { useReducer } from 'react';

import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';

import { ColourWheel } from './ColourWheel';
import { ALL_MODELS, ColourModel, getModelDefaults, getModelFromCode, HSLModel, RadialScaling } from './ColourModels';
import { goldenFluidAcrylicSetThick, goldenFluidAcrylicSetThin, goldenHeavyBodyModernMixingSetThick, goldenHeavyBodyModernMixingSetThin } from './paints/GoldenPalettes';
import { uniqueHues } from './paints/UniqueHues';
import { SwatchSet } from './paints/Swatch';
import { NavigateFunction, Params, useNavigate, useParams } from 'react-router';
import { useSearchParams } from 'react-router-dom';


const noSwatchSet: SwatchSet = {
    name: "None",
    swatches: []
};
const ALL_SWATCHESETS = [noSwatchSet, goldenFluidAcrylicSetThick, goldenFluidAcrylicSetThin, goldenHeavyBodyModernMixingSetThick, goldenHeavyBodyModernMixingSetThin, uniqueHues];
function getSwatchSetByName(name?: string) {
    // Somewhat clunky way of doing array.get(index, default)
    return [...ALL_SWATCHESETS.filter(s => s.name === name), noSwatchSet][0];
}
/**
 * Current state of the wheel viewer.
 */
type ViewerState = {
    model: ColourModel,
    swatchSet: SwatchSet,
    rings: number,
    slices: number,
    fill: boolean,
    gamutWarnings: boolean,
    swatchLabels: boolean
} & RadialScaling;
type ViewerProps = {
    model?: string;
}
type UpdateAction = {
    action: Actions.MODEL;
    // Only parameter is the (code of) the new model
    model: string;
    
} | ({
    action: Actions.MODEL_PARAMS;
    // The params we can change here is everything except model
    // we also convert a string to a swatchset object so remove that
    // from the type definition and replace it with a string
} & Omit<Partial<ViewerState>, "model" | "swatchSet"> & {swatchSet?: string}
);
enum Actions {
    MODEL,
    MODEL_PARAMS
}
function encodeSearchParams(state: ViewerState): string {
    const defaults = getDefaultState(state.model);
    console.log("Search encoding non-default state from", state, defaults);
    return new URLSearchParams(Object.fromEntries(
        Object.entries(state)
            .filter(([k, v]) => k !== "model" && v !== defaults[k])
            .map(([k, v]) => [k, k === "swatchSet" ? (v as SwatchSet).name : v.toString()])
        )).toString();
}
function getDefaultState(model?: ColourModel): ViewerState {
    return {
        model: model || HSLModel,
        swatchSet: noSwatchSet,
        rings: 10,
        slices: 60,
        fill: true,
        gamutWarnings: false,
        swatchLabels: true,
        ...getModelDefaults(model)
    }    
}
function getStateReducer(nav: NavigateFunction,  params: Readonly<Params<string>>, searchParams: URLSearchParams) {
    return(state: ViewerState, action: UpdateAction) => {
        const modState = addRouteToState(state, params, searchParams);
        switch(action.action) {
            case Actions.MODEL: {
                const newModel = getModelFromCode(action.model);
                console.log("Changing to new model", newModel, "from", modState.model);
                if(newModel !== null && newModel !== modState.model) {
                    // If we change model, reset all parameters to model defaults
                    // then take any we might've passed in as well
                    const newState = {...modState, ...getModelDefaults(newModel), model: newModel};
                    nav({pathname: `/colour-wheel/${newModel.code}`, search: encodeSearchParams(newState)}, {replace: false});
                    return newState;
                } else {
                    // Do nothing if just the model changes
                    // Maybe this is wrong? TBC...
                    return modState;
                }
                
            }
            case Actions.MODEL_PARAMS: {
                const actionParamsAsState = Object.fromEntries(
                    Object.entries(action)
                        .filter(([k]) => k !== "action")
                        .map(([k, v]) => [k, k === "swatchSet" ? getSwatchSetByName(action.swatchSet) : v])
                );
                const newState = {...modState, ...actionParamsAsState};
                let searchParams = encodeSearchParams(newState);
                nav({search: searchParams}, {replace: false});
                return newState;
            }
        }
    }
}
/**
 * Return a merge of the current state with any parameters from the route (route params or search params)
 * that would override it.
 * 
 * We do this rather than calling setState because we don't want to trigger an additional re-render when
 * we first load the page.
 * 
 * @param state 
 * @param params 
 * @param searchParams 
 * @returns 
 */
function addRouteToState(state: ViewerState, params: Readonly<Params<string>>, searchParams: URLSearchParams) {
    let modState = {...state};
    if(params.model !== undefined) {
        modState.model = getModelFromCode(params.model) || HSLModel;
        modState = {...modState, ...getDefaultState(modState.model)};
    }
    // TODO: Extract this to decodeSearchParams, apply min/max/step restrictions to each property
    const intStateParams = ["slices", "rings", "aMin", "aMax", "bMin", "bMax"];
    const boolStateParams = ["gamutWarnings", "fill"];
    for(const k of intStateParams) {
        if(searchParams.has(k)) modState[k] = parseInt(searchParams.get(k)!, 10);
    }
    for(const k of boolStateParams) {
        if(searchParams.has(k)) modState[k] = searchParams.get(k)?.toLowerCase() === "true";
    }
    if(searchParams.has("swatchSet")) modState.swatchSet = getSwatchSetByName(searchParams.get("swatchSet")!);
    return modState;
}
export function WheelViewer({model}: ViewerProps) {
    const params = useParams();
    const [searchParams] = useSearchParams();
    const [state, dispatch] = useReducer(getStateReducer(useNavigate(), params, searchParams), getDefaultState());
    const modState = addRouteToState(state, params, searchParams);

    return (
        <Card sx={{display: 'flex', flexDirection: 'row', margin: 2, width: 1200}}>
        <CardMedia sx={{margin: 2}}>
            <ColourWheel 
                swatches={modState.swatchSet.swatches} 
                size={750} 
                model={modState.model} 
                slices={modState.slices} 
                rings={modState.rings} 
                fill={modState.fill}
                gamutWarnings={modState.gamutWarnings}
                aMin={modState.aMin} 
                aMax={modState.aMax} 
                bMin={modState.bMin} 
                bMax={modState.bMax}
                swatchLabels={modState.swatchLabels}/>
        </CardMedia>
        <CardContent sx={{flex: 1}}>
            <FormControl sx={{display: 'flex'}}>
                <FormLabel id="colour-model-label">Colour model</FormLabel>
                <Select labelId="colour-model-label" value={modState.model.code} onChange={e => dispatch({action: Actions.MODEL, model: e.target.value})}>
                    {ALL_MODELS.map(model =>
                        <MenuItem value={model.code} key={model.code}>{model.name}</MenuItem>
                    )}
                </Select>
            </FormControl>
            <FormControl sx={{display: 'flex'}}>
                <FormLabel id="colour-swatchset-label">Show swatches</FormLabel>
                <Select labelId="colour-swatchset-label" value={modState.swatchSet?.name} onChange={e => dispatch({action: Actions.MODEL_PARAMS, swatchSet: e.target.value})}>
                    {ALL_SWATCHESETS.map(set =>
                        <MenuItem value={set.name} key={set.name}>{set.name}</MenuItem>
                    )}
                </Select>
            </FormControl>
            <FormControlLabel control={<Switch checked={modState.fill} onChange={e => dispatch({action: Actions.MODEL_PARAMS, fill: e.target.checked})}/>} label="Fill wheel with colour"/>
            <FormControlLabel disabled={!modState.fill} control={<Switch checked={modState.gamutWarnings} onChange={e => dispatch({action: Actions.MODEL_PARAMS, gamutWarnings: e.target.checked})}/>} label="Show gamut warnings"/>
            <FormControlLabel control={<Switch checked={modState.swatchLabels} onChange={e => dispatch({action: Actions.MODEL_PARAMS, swatchLabels: e.target.checked})}/>} label="Show swatch labels"/>
            <h5>Wheel</h5>
            Slices: <Slider value={modState.slices} valueLabelDisplay="auto" min={3} max={120} step={3} onChange={(event, newValue) => dispatch({action: Actions.MODEL_PARAMS, slices: newValue as number})}/>
            Rings: <Slider value={modState.rings} valueLabelDisplay="auto" min={1} max={20} onChange={(event, newValue) =>dispatch({action: Actions.MODEL_PARAMS, rings: newValue as number})}/>
            <h5>{modState.model.aLabel}</h5>
            Fixed: <Slider value={modState.aMin} valueLabelDisplay="auto" min={0} max={100} onChange={(event, newValue) => dispatch({action: Actions.MODEL_PARAMS, aMin: newValue as number, aMax: newValue as number})}/>
            Min: <Slider value={modState.aMin} valueLabelDisplay="auto" min={0} max={100} onChange={(event, newValue) => dispatch({action: Actions.MODEL_PARAMS, aMin: newValue as number})}/>
            Max: <Slider value={modState.aMax} valueLabelDisplay="auto" min={0} max={100} onChange={(event, newValue) => dispatch({action: Actions.MODEL_PARAMS, aMax: newValue as number})}/>
            <h5>{modState.model.bLabel}</h5>
            Fixed: <Slider value={modState.bMin} valueLabelDisplay="auto" min={0} max={100} onChange={(event, newValue) => dispatch({action: Actions.MODEL_PARAMS, bMin: newValue as number, bMax: newValue as number})}/>
            Min: <Slider value={modState.bMin} valueLabelDisplay="auto" min={0} max={100} onChange={(event, newValue) => dispatch({action: Actions.MODEL_PARAMS, bMin: newValue as number})}/>
            Max: <Slider value={modState.bMax} valueLabelDisplay="auto" min={0} max={100} onChange={(event, newValue) => dispatch({action: Actions.MODEL_PARAMS, bMax: newValue as number})}/>                    
        </CardContent>
        </Card>
    )
}