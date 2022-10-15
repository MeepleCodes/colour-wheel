import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ColourWheel } from './ColourWheel';
import * as m from './ColourModels';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { WheelViewer } from './WheelViewer';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <WheelViewer/>
    <Grid container spacing={2} sx={{margin: 1}}>
      {m.ALL_MODELS.map(model => 
      <Grid key={model.code}>
        <Card sx={{width: 350, height: 520}}>
          <Stack spacing={1} sx={{height: '100%'}}>
          <CardContent>
            <Typography variant="h5">
              {model.code}
            </Typography>
            <Typography sx={{ mb: 1.5 }} color="text.secondary">
              {model.name}
            </Typography>
            <Typography variant="body2">
              {model.description}
            </Typography>
          </CardContent>
          <Box sx={{flexGrow: 1}}/>
          <CardMedia sx={{alignSelf: 'center', padding:2, paddingTop: 0}}><ColourWheel model={model} /></CardMedia>
          </Stack>
        </Card>
      </Grid>
      )}
    </Grid>

  </React.StrictMode>
);
