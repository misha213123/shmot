import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminPanel from './app/AdminPanel';
import AppRoot from './app/AppRoot';
import { enableChatRuntime } from './lib/chatRuntime';
import { enableDealRuntime } from './lib/dealRuntime';
import { enableFeedLoadingCleanup } from './lib/removeFeedLoadingText';
import { enableInstantMarketplaceCache } from './lib/instantMarketplaceCache';
import { enableProductEditDomSync } from './lib/productEditDomSync';
import { enableProfileDomSync } from './lib/profileDomSync';
import { enableReportRuntime } from './lib/reportRuntime';
import { enableReservationDomSync } from './lib/reservationDomSync';
import { enableSocialRuntime } from './lib/socialRuntime';
import './styles/global.css';
import './styles/mobile.css';
import './styles/profile.css';
import './styles/deals.css';
import './styles/reports.css';
import './styles/reservations.css';
import './styles/social.css';

const isAdminRoute = window.location.pathname === '/admin';

if (!isAdminRoute) {
  enableInstantMarketplaceCache();
  enableFeedLoadingCleanup();
  enableProfileDomSync();
  enableProductEditDomSync();
  enableChatRuntime();
  enableReservationDomSync();
  enableReportRuntime();
  enableSocialRuntime();
  enableDealRuntime();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdminRoute ? <AdminPanel /> : <AppRoot />}
  </React.StrictMode>,
);
