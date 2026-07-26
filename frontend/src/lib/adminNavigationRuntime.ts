import { API_URL } from './api';
import { auth } from './auth';

type AdminAccess = { is_admin: boolean; is_owner: boolean; username: string };

let started = false;
let isAdmin = false;

function installStyles(): void {
  if (document.getElementById('driply-admin-navigation-styles')) return;
  const style = document.createElement('style');
  style.id = 'driply-admin-navigation-styles';
  style.textContent = `
    @media(max-width:600px){
      html,body,#root{
        width:100%!important;
        height:100%!important;
        min-height:100%!important;
        overflow:hidden!important;
      }
      .app-shell{
        position:fixed!important;
        inset:0!important;
        width:min(100%,430px)!important;
        height:100dvh!important;
        min-height:100dvh!important;
        max-height:100dvh!important;
        margin:0 auto!important;
        padding:0!important;
        overflow:hidden!important;
        transform:none!important;
        contain:none!important;
      }
      /* Content scrolls in its own layer. Navigation never participates in that scroll. */
      .app-shell .screen-transition{
        position:absolute!important;
        inset:0 0 calc(82px + env(safe-area-inset-bottom)) 0!important;
        width:100%!important;
        height:auto!important;
        min-height:0!important;
        padding:max(16px,env(safe-area-inset-top)) 18px 28px!important;
        overflow-x:hidden!important;
        overflow-y:auto!important;
        -webkit-overflow-scrolling:touch!important;
        overscroll-behavior-y:contain!important;
        touch-action:pan-y!important;
      }
      .app-shell.feed-screen .screen-transition{
        display:grid!important;
        grid-template-rows:auto auto minmax(0,1fr) auto!important;
        overflow:hidden!important;
        touch-action:none!important;
      }
      .app-shell .bottom-nav{
        position:absolute!important;
        inset:auto 0 0 0!important;
        left:0!important;
        right:0!important;
        top:auto!important;
        bottom:0!important;
        width:100%!important;
        max-width:430px!important;
        margin:0 auto!important;
        transform:none!important;
        translate:none!important;
        animation:none!important;
        z-index:2147483000!important;
        will-change:auto!important;
      }
    }
    .bottom-nav .admin-nav-button{color:#111!important}
    .bottom-nav .admin-nav-button svg{width:22px;height:22px}
    .bottom-nav.has-admin-nav{grid-template-columns:repeat(6,minmax(0,1fr))!important}
    .bottom-nav.has-admin-nav button{min-width:0!important;padding-left:2px!important;padding-right:2px!important}
    .bottom-nav.has-admin-nav button span{font-size:10px!important}
    @media(max-width:380px){.bottom-nav.has-admin-nav button span{font-size:9px!important}}
  `;
  document.head.append(style);
}

function addAdminButton(): void {
  const nav = document.querySelector<HTMLElement>('.bottom-nav');
  if (!nav || !isAdmin || nav.querySelector('.admin-nav-button')) return;
  nav.classList.add('has-admin-nav');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'admin-nav-button';
  button.setAttribute('aria-label', 'Админ-панель');
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg><span>Админ</span>';
  button.addEventListener('click', () => { window.location.href = '/admin'; });
  nav.append(button);
}

async function checkAccess(): Promise<void> {
  const token = await auth.accessToken();
  if (!token) return;
  const response = await fetch(`${API_URL}/api/v1/admin/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return;
  const data = await response.json() as AdminAccess;
  isAdmin = data.is_admin;
  addAdminButton();
}

export function enableAdminNavigationRuntime(): () => void {
  if (typeof window === 'undefined' || started) return () => undefined;
  started = true;
  installStyles();
  void checkAccess().catch(() => undefined);
  const observer = new MutationObserver(() => addAdminButton());
  observer.observe(document.body, { childList: true, subtree: true });
  return () => { started = false; observer.disconnect(); };
}
