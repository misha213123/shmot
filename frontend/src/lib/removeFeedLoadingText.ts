const LOADING_TEXT = 'Загружаем свежие вещи';

function hideLoadingMessage(): void {
  document.querySelectorAll<HTMLElement>('.empty-state').forEach((element) => {
    if (!element.textContent?.includes(LOADING_TEXT)) return;
    if (element.dataset.loadingMessageHidden === 'true') return;

    element.dataset.loadingMessageHidden = 'true';
    element.setAttribute('aria-hidden', 'true');
    element.style.visibility = 'hidden';
    element.style.pointerEvents = 'none';
  });
}

export function enableFeedLoadingCleanup(): void {
  if (typeof window === 'undefined') return;

  const start = () => {
    hideLoadingMessage();
    const observer = new MutationObserver(() => hideLoadingMessage());
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.body) start();
  else window.addEventListener('DOMContentLoaded', start, { once: true });
}
