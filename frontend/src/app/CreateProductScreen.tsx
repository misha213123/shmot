import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Camera, Check, LoaderCircle, Trash2, X } from 'lucide-react';

import { api, type ApiProduct, type ApiProfile } from '../lib/api';
import { supabase } from '../lib/supabase';
import '../styles/create-product.css';

type Props = {
  profile: ApiProfile;
  onBack: () => void;
  onCreated: (product: ApiProduct) => void;
};

type SelectedImage = {
  file: File;
  preview: string;
};

const currencyByCountry: Record<string, string> = {
  RU: 'RUB',
  BY: 'BYN',
  KZ: 'KZT',
  UA: 'UAH',
  AM: 'AMD',
  GE: 'GEL',
};

export default function CreateProductScreen({ profile, onBack, onCreated }: Props) {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Куртки');
  const [size, setSize] = useState('');
  const [condition, setCondition] = useState('Хорошее');
  const [color, setColor] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [delivery, setDelivery] = useState('Личная встреча или отправка');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currency = useMemo(() => currencyByCountry[profile.country_code] || 'RUB', [profile.country_code]);

  useEffect(() => () => {
    images.forEach((image) => URL.revokeObjectURL(image.preview));
  }, [images]);

  const selectImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;

    setImages((current) => {
      const freeSlots = Math.max(0, 10 - current.length);
      const added = files.slice(0, freeSlots).map((file) => ({ file, preview: URL.createObjectURL(file) }));
      return [...current, ...added];
    });
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((_, imageIndex) => imageIndex !== index);
    });
  };

  const uploadImages = async () => {
    const uploaded: Array<{ url: string; position: number; is_cover: boolean }> = [];

    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const extension = image.file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${profile.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, image.file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw new Error(`Не удалось загрузить фото: ${uploadError.message}`);
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      uploaded.push({ url: data.publicUrl, position: index, is_cover: index === 0 });
    }

    return uploaded;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!images.length) {
      setError('Добавь хотя бы одну фотографию');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const uploadedImages = await uploadImages();
      const product = await api.createMyProduct({
        title: title.trim(),
        brand: brand.trim(),
        category,
        description: description.trim(),
        size: size.trim() || undefined,
        color: color.trim() || undefined,
        condition,
        price: Number(price),
        currency,
        country_code: profile.country_code,
        city: profile.city,
        delivery: delivery.trim() || undefined,
        images: uploadedImages,
      });
      onCreated(product);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось опубликовать товар');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="create-product-screen">
      <header className="create-product-header">
        <button type="button" onClick={onBack} aria-label="Закрыть"><X /></button>
        <strong>Новое объявление</strong>
        <span>{images.length}/10</span>
      </header>

      <form className="create-product-form" onSubmit={submit}>
        <div className="image-picker-grid">
          {images.map((image, index) => (
            <div className="selected-image motion-pop" key={image.preview}>
              <img src={image.preview} alt={`Фото ${index + 1}`} />
              {index === 0 && <span><Check size={13} /> Главное</span>}
              <button type="button" onClick={() => removeImage(index)} aria-label="Удалить фото"><Trash2 size={17} /></button>
            </div>
          ))}
          {images.length < 10 && (
            <label className="add-image-tile pressable">
              <Camera />
              <b>Добавить фото</b>
              <small>До 10 изображений</small>
              <input type="file" accept="image/*" multiple onChange={selectImages} />
            </label>
          )}
        </div>

        <p className="create-hint">Первое фото станет обложкой. Нажимай на товар — покупатель сможет листать остальные фотографии.</p>

        <label>Название<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, худи оверсайз" minLength={3} required /></label>
        <label>Бренд<input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Nike, Stone Island..." required /></label>

        <div className="create-row">
          <label>Категория<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Куртки</option><option>Худи</option><option>Футболки</option><option>Брюки</option><option>Кроссовки</option><option>Аксессуары</option></select></label>
          <label>Размер<input value={size} onChange={(event) => setSize(event.target.value)} placeholder="M, 42..." /></label>
        </div>

        <div className="create-row">
          <label>Состояние<select value={condition} onChange={(event) => setCondition(event.target.value)}><option>Новое</option><option>Как новое</option><option>Хорошее</option><option>Есть следы носки</option></select></label>
          <label>Цвет<input value={color} onChange={(event) => setColor(event.target.value)} placeholder="Чёрный" /></label>
        </div>

        <label>Цена<div className="price-field"><input type="number" inputMode="decimal" min="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0" required /><span>{currency}</span></div></label>
        <label>Описание<textarea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Состояние, замеры, комплект, особенности..." minLength={10} required /></label>
        <label>Доставка<input value={delivery} onChange={(event) => setDelivery(event.target.value)} /></label>

        {error && <p className="create-error motion-pop">{error}</p>}
        <button className="publish-button pressable" type="submit" disabled={saving}>
          {saving ? <><LoaderCircle className="spin" /> Загружаем и публикуем</> : 'Опубликовать товар'}
        </button>
      </form>
    </section>
  );
}
