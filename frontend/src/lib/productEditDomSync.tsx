import React from 'react';
import { createRoot, type Root } from 'react-dom/client';

import EditProductOverlay from '../app/EditProductOverlay';
import { api, type ApiProduct } from './api';

let currentProductId = '';
let root: Root | null = null;
let mountNode: HTMLDivElement | null = null;
let observer: MutationObserver | null = null;

function closeEditor() {
  root?.unmount();
  root = null;
  mountNode?.remove();
  mountNode = null;
  document.body.classList.remove('product-editor-open');
}

async function openEditor() {
  if (!currentProductId || mountNode) return;
  const product = await api.product(currentProductId);
  mountNode = document.createElement('div');
  mountNode.id = 'driply-product-editor';
  document.body.appendChild(mountNode);
  document.body.classList.add('product-editor-open');
  root = createRoot(mountNode);
  root.render(<React.StrictMode><EditProductOverlay product={product} onClose={closeEditor} onSaved={(updated: ApiProduct) => {
    try {
      const cached = JSON.parse(localStorage.getItem('driply:feed-cache') || '[]') as ApiProduct[];
      localStorage.setItem('driply:feed-cache', JSON.stringify(cached.map((item) => item.id === updated.id ? updated : item)));
    } catch { /* ignore cache errors */ }
    window.dispatchEvent(new CustomEvent('driply:product-updated', { detail: updated }));
    closeEditor();
    window.setTimeout(() => window.location.reload(), 180);
  }} /></React.StrictMode>);
}

function attachButton() {
  const controls = document.querySelector('.own-product-management .management-actions');
  if (!controls || controls.querySelector('[data-edit-product]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.editProduct = 'true';
  button.className = 'edit-own-product-button';
  button.innerHTML = '<span aria-hidden="true">✎</span> Редактировать';
  button.addEventListener('click', () => openEditor().catch(() => window.alert('Не удалось открыть редактор')));
  controls.prepend(button);
}

export function enableProductEditDomSync() {
  window.addEventListener('driply:product-opened', ((event: CustomEvent<{ productId: string }>) => {
    currentProductId = event.detail.productId;
    window.setTimeout(attachButton, 0);
  }) as EventListener);
  observer = new MutationObserver(attachButton);
  observer.observe(document.body, { childList: true, subtree: true });
  attachButton();
}
