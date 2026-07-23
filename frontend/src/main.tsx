import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminPanel from './app/AdminPanel';
import AppRoot from './app/AppRoot';
import { enableChatRuntime } from './lib/chatRuntime';
import { enableFeedLoadingCleanup } from './lib/removeFeedLoadingText';
import { enableInstantMarketplaceCache } from './lib/instantMarketplaceCache';
import { enableProductEditDomSync } from './lib/productEditDomSync';
import { enableProfileDomSync } from './lib/profileDomSync';
import { enableReportRuntime } from './lib/reportRuntime';
import { enableReservationDomSync } from './lib/reservationDomSync';
import './styles/global.css';
import './styles/mobile.css';
import './styles/profile.css';
import './styles/reports.css';
import './styles/reservations.css';

const isAdminRoute = window.location.pathname === '/admin';

if (!isAdminRoute) {
  enableInstantMarketplaceCache();
  enableFeedLoadingCleanup();
  enableProfileDomSync();
  enableProductEditDomSync();
  enableChatRuntime();
  enableReservationDomSync();
  enableReportRuntime();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdminRoute ? <AdminPanel /> : <AppRoot />}
  </React.StrictMode>,
);
