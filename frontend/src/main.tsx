import React from 'react';
import ReactDOM from 'react-dom/client';
import AppStable from './app/AppStable';
import './styles/global.css';
import './styles/mobile.css';
import './styles/profile.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppStable />
  </React.StrictMode>,
);