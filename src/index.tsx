import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { WheelViewer } from './WheelViewer';
import { Navigate, RouterProvider } from 'react-router';
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate replace to="/colour-wheel/JCh" />
  },
  {
    path: "/colour-wheel/",
    element: <Navigate replace to="/colour-wheel/JCh" />
  },
  {
    path: "/colour-wheel/:model",
    element: <WheelViewer/>
  }
])
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
