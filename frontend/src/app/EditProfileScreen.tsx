import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { Camera, ChevronLeft, LoaderCircle, Save, UserRound } from 'lucide-react';

import { api, type ApiProfile } from '../lib/api';
import { supabase } from '../lib/supabase';
import '../styles/edit-profile.css';

type Props = {
  profile: ApiProfile;
  onBack: () => void;
  onSaved: (profile: ApiProfile) => void;
};

const countries: Record<string, { name: string; phoneCode: string; cities: string[] }> = {
  RU: { name: 'Россия', phoneCode: '+7', cities: ['Москва', 'Санкт-Петербург', 'Казань', 'Краснодар', 'Сочи', 'Новосибирск', 'Екатеринбург'] },
  BY: { name: 'Беларусь', phoneCode: '+375', cities: ['Минск', 'Бобруйск', 'Гомель', 'Могилёв', 'Витебск', 'Гродно', 'Брест'] },
  KZ: { name: 'Казахстан', phoneCode: '+7', cities: ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе', 'Актау'] },
  UA: { name: 'Украина', phoneCode: '+380', cities: ['Киев', 'Харьков', 'Одесса', 'Днепр', 'Львов'] },
  AM: { name: 'Армения', phoneCode: '+374', cities: ['Ереван', 'Гюмри', 'Ванадзор'] },
  GE: { name: 'Грузия', phoneCode: '+995', cities: ['Тбилиси', 'Батуми', 'Кутаиси'] },
};

function localPhone(profile: ApiProfile) {
  const code = countries[profile.country_code]?.phoneCode || '';
  return profile.phone?.startsWith(code) ? profile.phone.slice(code.length) : profile.phone || '';
}

export default function EditProfileScreen({ profile, onBack, onSaved }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username);
  const [countryCode, setCountryCode] = useState(profile.country_code);
  const [city, setCity] = useState(profile.city);
  const [phone, setPhone] = useState(localPhone(profile));
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const country = countries[countryCode] || countries.RU;
  const cityOptions = useMemo(() => {
    const query = city.trim().toLowerCase();
    return country.cities.filter((item) => !query || item.toLowerCase().includes(query)).slice(0, 7);
  }, [city, country]);

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Выбери изображение'); return; }
    if (file.size > 6 * 1024 * 1024) { setError('Аватар должен быть меньше 6 МБ'); return; }

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setUploading(true);
    setError('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${profile.id}/avatars/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '86400', upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (reason) {
      setAvatarPreview(profile.avatar_url || '');
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить аватар');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const digits = phone.replace(/\D/g, '');
      const saved = await api.saveMyProfile({
        display_name: displayName.trim(),
        username: username.trim().replace(/^@/, ''),
        avatar_url: avatarUrl || null,
        phone: digits ? `${country.phoneCode}${digits}` : null,
        country_code: countryCode,
        city: city.trim(),
        bio: bio.trim() || null,
      });
      onSaved(saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  };

  return <main className="edit-profile-screen">
    <header className="edit-profile-header motion-header">
      <button type="button" onClick={onBack} aria-label="Назад"><ChevronLeft /></button>
      <strong>Редактировать профиль</strong>
      <span />
    </header>

    <form className="edit-profile-form" onSubmit={submit}>
      <section className="avatar-editor motion-pop">
        <div className="avatar-editor-preview">
          {avatarPreview ? <img src={avatarPreview} alt="Аватар" /> : <UserRound />}
          {uploading && <div className="avatar-uploading"><LoaderCircle className="spin" /></div>}
        </div>
        <label className="avatar-upload-button pressable"><Camera size={18} /> Изменить фото<input type="file" accept="image/*" onChange={uploadAvatar} /></label>
        <small>Квадратное фото до 6 МБ</small>
      </section>

      <section className="edit-profile-fields motion-pop">
        <label>Имя<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={100} required /></label>
        <label>Username<div className="username-input"><span>@</span><input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} pattern="[a-zA-Z0-9._-]+" required /></div></label>
        <div className="edit-profile-row">
          <label>Страна<select value={countryCode} onChange={(event) => { setCountryCode(event.target.value); setCity(''); setPhone(''); }}>{Object.entries(countries).map(([code, value]) => <option key={code} value={code}>{value.name}</option>)}</select></label>
          <label>Город<input list="edit-city-options" value={city} onChange={(event) => setCity(event.target.value)} required /><datalist id="edit-city-options">{cityOptions.map((item) => <option key={item} value={item} />)}</datalist></label>
        </div>
        <label>Телефон<div className="edit-phone"><span>{country.phoneCode}</span><input type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Номер телефона" /></div></label>
        <label>О себе<textarea rows={4} maxLength={500} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Что продаёшь и как отправляешь товары" /><small>{bio.length}/500</small></label>
      </section>

      {error && <p className="edit-profile-error motion-pop">{error}</p>}
      <button className="save-profile-button pressable" disabled={saving || uploading} type="submit">{saving ? <LoaderCircle className="spin" /> : <Save size={19} />}{saving ? 'Сохраняем…' : 'Сохранить изменения'}</button>
    </form>
  </main>;
}
