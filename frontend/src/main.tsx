import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { preventPullToRefresh } from './lib/preventPullToRefresh';
import './styles/global.css';
import './styles/mobile.css';

preventPullToRefresh();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
