import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ColourWheel } from './ColourWheel';
import * as m from './ColourModels';


const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    {m.ALL_MODELS.map(model => 
    <div className="wheelbox">
      <h1>{model.code}</h1>
      <h2>{model.name}</h2>
      <p>{model.description}</p>
      <div className="spacer"/>
      <ColourWheel model={model} />
    </div>)}

  </React.StrictMode>
);
