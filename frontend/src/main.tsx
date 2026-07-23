import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRoot from './app/AppRoot';
import { enableProfileDomSync } from './lib/profileDomSync';
import './styles/global.css';
import './styles/mobile.css';
import './styles/profile.css';

enableProfileDomSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>,
);
