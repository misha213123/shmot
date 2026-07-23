import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import AdminPanel from './app/AdminPanel';
import AppRoot from './app/AppRoot';
import './styles/global.css';
import './styles/mobile.css';
import './styles/profile.css';
import './styles/advanced-search.css';
import './styles/deals.css';
import './styles/recommendations.css';
import './styles/reports.css';
import './styles/reservations.css';
import './styles/reviews.css';
import './styles/social.css';

type BoundaryProps = { children: ReactNode };
type BoundaryState = { failed: boolean };

class AppErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DRIPLY render error', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', background: '#f7f5f1', color: '#111' }}>
          <section>
            <h1 style={{ marginBottom: 12 }}>DRIPLY</h1>
            <p style={{ marginBottom: 20 }}>Не удалось открыть приложение.</p>
            <button type="button" onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 18, padding: '16px 24px', background: '#111', color: '#fff', fontWeight: 800 }}>
              Перезагрузить
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const isAdminRoute = window.location.pathname === '/admin';
const rootElement = document.getElementById('root');

if (!rootElement) {
  document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;font-family:system-ui">Не найден контейнер приложения</main>';
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AppErrorBoundary>
        {isAdminRoute ? <AdminPanel /> : <AppRoot />}
      </AppErrorBoundary>
    </React.StrictMode>,
  );
}

async function enableOptionalRuntimes(): Promise<void> {
  if (isAdminRoute) return;

  const runtimes: Array<() => Promise<void>> = [
    async () => (await import('./lib/instantMarketplaceCache')).enableInstantMarketplaceCache(),
    async () => (await import('./lib/removeFeedLoadingText')).enableFeedLoadingCleanup(),
    async () => (await import('./lib/profileDomSync')).enableProfileDomSync(),
    async () => (await import('./lib/productEditDomSync')).enableProductEditDomSync(),
    async () => (await import('./lib/chatRuntime')).enableChatRuntime(),
    async () => (await import('./lib/reservationDomSync')).enableReservationDomSync(),
    async () => (await import('./lib/reportRuntime')).enableReportRuntime(),
    async () => (await import('./lib/socialRuntime')).enableSocialRuntime(),
    async () => (await import('./lib/dealRuntime')).enableDealRuntime(),
    async () => (await import('./lib/reviewRuntime')).enableReviewRuntime(),
    async () => (await import('./lib/advancedSearchRuntime')).enableAdvancedSearchRuntime(),
    async () => (await import('./lib/recommendationRuntime')).enableRecommendationRuntime(),
  ];

  for (const enable of runtimes) {
    try {
      await enable();
    } catch (error) {
      console.error('Optional DRIPLY module failed to start', error);
    }
  }
}

window.setTimeout(() => {
  void enableOptionalRuntimes();
}, 0);
