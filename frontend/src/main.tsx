import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRoot from './app/AppRoot';
import { enableChatRuntime } from './lib/chatRuntime';
import { enableFeedLoadingCleanup } from './lib/removeFeedLoadingText';
import { enableInstantMarketplaceCache } from './lib/instantMarketplaceCache';
import { enableProductEditDomSync } from './lib/productEditDomSync';
import { enableProfileDomSync } from './lib/profileDomSync';
import { enableReservationDomSync } from './lib/reservationDomSync';
import './styles/global.css';
import './styles/mobile.css';
import './styles/profile.css';
import './styles/reservations.css';

enableInstantMarketplaceCache();
enableFeedLoadingCleanup();
enableProfileDomSync();
enableProductEditDomSync();
enableChatRuntime();
enableReservationDomSync();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>,
);
