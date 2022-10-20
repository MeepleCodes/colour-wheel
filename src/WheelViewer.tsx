import React from 'react';

import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';

import { ColourWheel } from './ColourWheel';
import { ALL_MODELS, ColourModel, getModelDefaults, getModelFromCode, HSLModel } from './ColourModels';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import { goldenFluidAcrylicSetThick, goldenFluidAcrylicSetThin, goldenHeavyBodyModernMixingSetThick, goldenHeavyBodyModernMixingSetThin } from './paints/GoldenPalettes';
import { uniqueHues } from './paints/UniqueHues';
import { SwatchSet } from './paints/Swatch';

const noSwatchSet: SwatchSet = {
    name: "None",
    swatches: []
};
const ALL_SWATCHESETS = [noSwatchSet, goldenFluidAcrylicSetThick, goldenFluidAcrylicSetThin, goldenHeavyBodyModernMixingSetThick, goldenHeavyBodyModernMixingSetThin, uniqueHues];
/**
 * Current state of the wheel viewer.
 * 
 * I'd like to define this as {model: ..., rings: ..., slices: ...} & RadialScaling
 * but that breaks the key detection in the generic typing of of setState(), despite
 * the resultant types being identical as far as I can tell.
 */
type ViewerState = {
    model: ColourModel,
    swatchSet: SwatchSet,
    rings: number,
    slices: number,
    aMin: number,
    aMax: number,
    bMin: number,
    bMax: number
}
type ViewerProps = {}
export class WheelViewer extends React.Component<{}, ViewerState> {

    state: ViewerState = {
        model: HSLModel,
        swatchSet: noSwatchSet,
        rings: 10,
        slices: 60,
        aMin: 0,
        aMax: 100,
        bMin: 0,
        bMax: 100
    };
    changeModel(newModel: ColourModel) {
        this.setState((prevState: ViewerState, props: ViewerProps) => {
            if(prevState.model !== newModel) {
                // If all of a/b min/max were default, then use the new model's defaults
                // Otherwise, keep them where they were to avoid losing user changes
                let prevDefaults = getModelDefaults(prevState.model);
                if(Object.entries(prevDefaults).every(([k, v]) => v === prevState[k])) {
                    return {
                        model: newModel,
                        ...getModelDefaults(newModel)
                    };
                } else {
                    return {
                        ...prevState,
                        model: newModel
                    };
                }
                
            } else {
                // Do nothing, as we haven't changed anything!
                return null;
            }
        })
    }
    changeMinMax(newValue: {aMin?: number, aMax?: number, bMin?: number, bMax?: number}) {
        this.setState({...this.state, ...newValue});
    }
    changeSwatchSet(newValue: string | null) {
        let newSet = noSwatchSet;
        for(let set of ALL_SWATCHESETS) {
            if(newValue === set.name) {
                newSet = set;
                break;
            }
        }
        this.setState({swatchSet: newSet});
    }
    render(): React.ReactNode {
        return (
            <Card sx={{display: 'flex', flexDirection: 'row', margin: 2, width: 1200}}>
            <CardMedia sx={{margin: 2}}><ColourWheel swatches={this.state.swatchSet.swatches} size={750} model={this.state.model} slices={this.state.slices} rings={this.state.rings} aMin={this.state.aMin} aMax={this.state.aMax} bMin={this.state.bMin} bMax={this.state.bMax}/></CardMedia>
            <CardContent sx={{flex: 1}}>
                <FormControl sx={{display: 'flex'}}>
                    <FormLabel id="colour-swatchset-label">Show swatches</FormLabel>
                    <Select labelId="colour-swatchset-label" value={this.state.swatchSet?.name} onChange={e => this.changeSwatchSet(e.target.value)}>
                        {ALL_SWATCHESETS.map(set =>
                            <MenuItem value={set.name}>{set.name}</MenuItem>
                        )}
                    </Select>
                </FormControl>
                <FormControl sx={{display: 'flex'}}>
                    <FormLabel id="colour-model-label">Model</FormLabel>
                    <Select labelId="colour-model-label" value={this.state.model.code} onChange={e => this.changeModel(getModelFromCode(e.target.value) as ColourModel)}>
                        {ALL_MODELS.map(model =>
                            <MenuItem value={model.code}>{model.name}</MenuItem>
                        )}
                    </Select>
                </FormControl>
                <Typography variant="body2">
                {this.state.model.description}
                </Typography>
                <h5>Wheel</h5>
                Slices: <Slider value={this.state.slices} min={3} max={120} step={3} onChange={(event, newValue) => this.setState({...this.state, slices: newValue as number})}/>
                Rings: <Slider value={this.state.rings} min={1} max={20} onChange={(event, newValue) => this.setState({...this.state, rings: newValue as number})}/>
                <h5>{this.state.model.aLabel}</h5>
                Fixed: <Slider value={this.state.aMin} min={0} max={100} onChange={(event, newValue) => this.changeMinMax({aMin: newValue as number, aMax: newValue as number})}/>
                Min: <Slider value={this.state.aMin} min={0} max={100} onChange={(event, newValue) => this.changeMinMax({aMin: newValue as number})}/>
                Max: <Slider value={this.state.aMax} min={0} max={100} onChange={(event, newValue) => this.changeMinMax({aMax: newValue as number})}/>
                <h5>{this.state.model.bLabel}</h5>
                Fixed: <Slider value={this.state.bMin} min={0} max={100} onChange={(event, newValue) => this.changeMinMax({bMin: newValue as number, bMax: newValue as number})}/>
                Min: <Slider value={this.state.bMin} min={0} max={100} onChange={(event, newValue) => this.changeMinMax({bMin: newValue as number})}/>
                Max: <Slider value={this.state.bMax} min={0} max={100} onChange={(event, newValue) => this.changeMinMax({bMax: newValue as number})}/>                    
            </CardContent>
            </Card>
        )
    }
}