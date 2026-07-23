import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { Camera, Check, LoaderCircle, MapPin, PackageCheck, Trash2, X } from 'lucide-react';

import { api, type ApiProduct } from '../lib/api';
import { supabase } from '../lib/supabase';
import '../styles/edit-product.css';

type NewImage = { file: File; preview: string };
type DeliveryMode = 'meetup' | 'shipping' | 'both';
type Props = { product: ApiProduct; onClose: () => void; onSaved: (product: ApiProduct) => void };

const bucket = 'product-images';
const deliveryText: Record<DeliveryMode, string> = {
  meetup: 'Личная встреча', shipping: 'Отправка', both: 'Личная встреча или отправка',
};

function deliveryMode(value: string | null): DeliveryMode {
  if (value === deliveryText.meetup) return 'meetup';
  if (value === deliveryText.shipping) return 'shipping';
  return 'both';
}

export default function EditProductOverlay({ product, onClose, onSaved }: Props) {
  const ordered = useMemo(() => [...product.images].sort((a, b) => a.position - b.position), [product.images]);
  const [existing, setExisting] = useState(ordered);
  const [added, setAdded] = useState<NewImage[]>([]);
  const [title, setTitle] = useState(product.title);
  const [brand, setBrand] = useState(product.brand);
  const [category, setCategory] = useState(product.category);
  const [size, setSize] = useState(product.size || '');
  const [condition, setCondition] = useState(product.condition);
  const [color, setColor] = useState(product.color || '');
  const [price, setPrice] = useState(String(Number(product.price)));
  const [description, setDescription] = useState(product.description);
  const [delivery, setDelivery] = useState<DeliveryMode>(deliveryMode(product.delivery));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const imageCount = existing.length + added.length;

  const selectImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    const free = Math.max(0, 10 - imageCount);
    setAdded((current) => [...current, ...files.slice(0, free).map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    event.target.value = '';
  };

  const uploadNew = async () => {
    const result: Array<{ url: string; position: number; is_cover: boolean }> = [];
    for (let index = 0; index < added.length; index += 1) {
      const image = added[index];
      const ext = image.file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${product.seller_id}/${product.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, image.file, {
        cacheControl: '3600', contentType: image.file.type, upsert: false,
      });
      if (uploadError) throw new Error(`Не удалось загрузить фото: ${uploadError.message}`);
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      result.push({ url: data.publicUrl, position: existing.length + index, is_cover: false });
    }
    return result;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!imageCount) { setError('Оставь хотя бы одну фотографию'); return; }
    setSaving(true); setError('');
    try {
      const uploaded = await uploadNew();
      const images = [
        ...existing.map((image, index) => ({ url: image.url, position: index, is_cover: index === 0 })),
        ...uploaded.map((image, index) => ({ ...image, position: existing.length + index, is_cover: existing.length === 0 && index === 0 })),
      ];
      const updated = await api.updateMyProduct(product.id, {
        title: title.trim(), brand: brand.trim(), category, description: description.trim(),
        size: size.trim() || undefined, color: color.trim() || undefined, condition,
        price: Number(price), currency: product.currency, country_code: product.country_code,
        city: product.city, delivery: deliveryText[delivery], images,
      });
      onSaved(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить объявление');
    } finally { setSaving(false); }
  };

  return <div className="edit-product-backdrop" role="dialog" aria-modal="true">
    <section className="edit-product-panel">
      <header><button onClick={onClose} aria-label="Закрыть"><X /></button><strong>Редактировать товар</strong><span>{imageCount}/10</span></header>
      <form onSubmit={submit}>
        <div className="edit-image-grid">
          {existing.map((image, index) => <div className="edit-image" key={image.id}><img src={image.url} alt="Фото товара" />{index === 0 && <span><Check size={12} /> Главное</span>}<button type="button" onClick={() => setExisting((items) => items.filter((item) => item.id !== image.id))}><Trash2 size={16} /></button></div>)}
          {added.map((image, index) => <div className="edit-image" key={image.preview}><img src={image.preview} alt="Новое фото" /><button type="button" onClick={() => setAdded((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={16} /></button></div>)}
          {imageCount < 10 && <label className="edit-add-image"><Camera /><b>Добавить</b><input type="file" accept="image/*" multiple onChange={selectImages} /></label>}
        </div>
        <label>Название<input value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} required /></label>
        <label>Бренд<input value={brand} onChange={(e) => setBrand(e.target.value)} required /></label>
        <div className="edit-row"><label>Категория<select value={category} onChange={(e) => setCategory(e.target.value)}><option>Куртки</option><option>Худи</option><option>Футболки</option><option>Брюки</option><option>Кроссовки</option><option>Аксессуары</option></select></label><label>Размер<input value={size} onChange={(e) => setSize(e.target.value)} /></label></div>
        <div className="edit-row"><label>Состояние<select value={condition} onChange={(e) => setCondition(e.target.value)}><option>Новое</option><option>Как новое</option><option>Хорошее</option><option>Есть следы носки</option></select></label><label>Цвет<input value={color} onChange={(e) => setColor(e.target.value)} /></label></div>
        <label>Цена<input type="number" min="1" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required /></label>
        <label>Описание<textarea rows={5} minLength={10} value={description} onChange={(e) => setDescription(e.target.value)} required /></label>
        <fieldset><legend>Получение товара</legend><div className="edit-delivery"><button type="button" className={delivery === 'meetup' ? 'active' : ''} onClick={() => setDelivery('meetup')}><MapPin /><span>Личная встреча</span></button><button type="button" className={delivery === 'shipping' ? 'active' : ''} onClick={() => setDelivery('shipping')}><PackageCheck /><span>Отправка</span></button><button type="button" className={delivery === 'both' ? 'active' : ''} onClick={() => setDelivery('both')}><Check /><span>Оба варианта</span></button></div></fieldset>
        {error && <p className="edit-error">{error}</p>}
        <button className="edit-save" disabled={saving}>{saving ? <><LoaderCircle className="spin" /> Сохраняем</> : 'Сохранить изменения'}</button>
      </form>
    </section>
  </div>;
}
