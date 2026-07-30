import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Phone, Send } from 'lucide-react';

import type { ApiProduct, ApiProfile } from '../../lib/api';
import '../../styles/seller-chat.css';

type ChatMessage = {
  id: string;
  text: string;
  mine: boolean;
  createdAt: string;
};

type Props = {
  seller: ApiProfile;
  product: ApiProduct;
  onClose: () => void;
};

function initials(name: string) {
  return (name || 'U').trim().slice(0, 1).toUpperCase();
}

export default function SellerChatSheet({ seller, product, onClose }: Props) {
  const storageKey = useMemo(() => `driply.chat.${seller.id}.${product.id}`, [product.id, seller.id]);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored) as ChatMessage[];
    } catch { /* ignore corrupted local cache */ }
    return [{
      id: crypto.randomUUID(),
      text: `Здравствуйте! Меня интересует «${product.title}».`,
      mine: true,
      createdAt: new Date().toISOString(),
    }];
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, {
      id: crypto.randomUUID(),
      text,
      mine: true,
      createdAt: new Date().toISOString(),
    }]);
    setDraft('');
  };

  const callSeller = () => {
    if (!seller.phone) return;
    if (seller.phone.startsWith('@')) {
      window.open(`https://t.me/${seller.phone.slice(1)}`, '_blank', 'noopener,noreferrer');
      return;
    }
    window.location.href = `tel:${seller.phone.replace(/\s/g, '')}`;
  };

  return (
    <section className="seller-chat-overlay" role="dialog" aria-modal="true" aria-label={`Чат с ${seller.username}`}>
      <div className="seller-chat-sheet">
        <header className="seller-chat-header">
          <button type="button" onClick={onClose} aria-label="Назад"><ArrowLeft /></button>
          <div className="seller-chat-person">
            {seller.avatar_url ? <img src={seller.avatar_url} alt={seller.display_name || seller.username} /> : <span>{initials(seller.display_name || seller.username)}</span>}
            <div><b>{seller.display_name || seller.username}</b><small>@{seller.username}</small></div>
          </div>
          <button type="button" onClick={callSeller} disabled={!seller.phone} aria-label="Позвонить"><Phone /></button>
        </header>

        <div className="seller-chat-product">
          {product.images[0]?.url && <img src={product.images[0].url} alt={product.title} />}
          <div><small>Объявление</small><b>{product.title}</b><span>{product.price} {product.currency}</span></div>
        </div>

        <div className="seller-chat-messages">
          <div className="seller-chat-day">Сегодня</div>
          {messages.map((message) => <div key={message.id} className={`seller-chat-message ${message.mine ? 'mine' : ''}`}>{message.text}</div>)}
        </div>

        <form className="seller-chat-compose" onSubmit={submit}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Написать сообщение…" aria-label="Сообщение" />
          <button type="submit" disabled={!draft.trim()} aria-label="Отправить"><Send /></button>
        </form>
      </div>
    </section>
  );
}
