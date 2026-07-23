const LOADING_TEXT = 'Загружаем свежие вещи';

function removeLoadingState(): void {
  document.querySelectorAll<HTMLElement>('.empty-state').forEach((element) => {
    if (element.textContent?.includes(LOADING_TEXT)) {
      element.remove();
    }
  });
}

export function enableFeedLoadingCleanup(): void {
  if (typeof window === 'undefined') return;

  removeLoadingState();

  const observer = new MutationObserver(() => removeLoadingState());
  observer.observe(document.body, { childList: true, subtree: true });
}
