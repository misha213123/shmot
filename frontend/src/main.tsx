import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRoot from './app/AppRoot';
import { enableInstantMarketplaceCache } from './lib/instantMarketplaceCache';
import { enableProductEditDomSync } from './lib/productEditDomSync';
import { enableProfileDomSync } from './lib/profileDomSync';
import './styles/global.css';
import './styles/mobile.css';
import './styles/profile.css';

enableInstantMarketplaceCache();
enableProfileDomSync();
enableProductEditDomSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>,
);
