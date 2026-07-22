export type CountryCode = 'RU' | 'BY' | 'KZ' | 'UA' | 'AM' | 'GE' | 'KG' | 'UZ' | 'MD';

export type RegionConfig = {
  code: CountryCode;
  name: string;
  currency: string;
  locale: string;
  symbol: string;
  defaultCity: string;
  cities: string[];
};

export const REGIONS: Record<CountryCode, RegionConfig> = {
  RU: { code: 'RU', name: 'Россия', currency: 'RUB', locale: 'ru-RU', symbol: '₽', defaultCity: 'Москва', cities: ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск'] },
  BY: { code: 'BY', name: 'Беларусь', currency: 'BYN', locale: 'ru-BY', symbol: 'Br', defaultCity: 'Минск', cities: ['Минск', 'Гомель', 'Брест', 'Гродно', 'Витебск'] },
  KZ: { code: 'KZ', name: 'Казахстан', currency: 'KZT', locale: 'ru-KZ', symbol: '₸', defaultCity: 'Алматы', cities: ['Алматы', 'Астана', 'Шымкент', 'Караганда', 'Актобе'] },
  UA: { code: 'UA', name: 'Украина', currency: 'UAH', locale: 'ru-UA', symbol: '₴', defaultCity: 'Киев', cities: ['Киев', 'Харьков', 'Одесса', 'Днепр', 'Львов'] },
  AM: { code: 'AM', name: 'Армения', currency: 'AMD', locale: 'ru-AM', symbol: '֏', defaultCity: 'Ереван', cities: ['Ереван', 'Гюмри', 'Ванадзор'] },
  GE: { code: 'GE', name: 'Грузия', currency: 'GEL', locale: 'ru-GE', symbol: '₾', defaultCity: 'Тбилиси', cities: ['Тбилиси', 'Батуми', 'Кутаиси'] },
  KG: { code: 'KG', name: 'Кыргызстан', currency: 'KGS', locale: 'ru-KG', symbol: 'сом', defaultCity: 'Бишкек', cities: ['Бишкек', 'Ош', 'Каракол'] },
  UZ: { code: 'UZ', name: 'Узбекистан', currency: 'UZS', locale: 'ru-UZ', symbol: 'сум', defaultCity: 'Ташкент', cities: ['Ташкент', 'Самарканд', 'Бухара', 'Наманган'] },
  MD: { code: 'MD', name: 'Молдова', currency: 'MDL', locale: 'ru-MD', symbol: 'L', defaultCity: 'Кишинёв', cities: ['Кишинёв', 'Бельцы', 'Тирасполь'] },
};

const STORAGE_KEY = 'driply-country';

export function getSavedCountry(): CountryCode | null {
  const value = window.localStorage.getItem(STORAGE_KEY) as CountryCode | null;
  return value && value in REGIONS ? value : null;
}

export function saveCountry(country: CountryCode) {
  window.localStorage.setItem(STORAGE_KEY, country);
}

export function detectCountryFallback(): CountryCode {
  const locale = navigator.language.toUpperCase();
  const localeCode = locale.split('-')[1] as CountryCode | undefined;
  if (localeCode && localeCode in REGIONS) return localeCode;

  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (zone === 'Europe/Minsk') return 'BY';
  if (zone === 'Asia/Almaty' || zone === 'Asia/Aqtobe' || zone === 'Asia/Aqtau') return 'KZ';
  if (zone === 'Europe/Kyiv') return 'UA';
  if (zone === 'Asia/Yerevan') return 'AM';
  if (zone === 'Asia/Tbilisi') return 'GE';
  if (zone === 'Asia/Bishkek') return 'KG';
  if (zone === 'Asia/Tashkent') return 'UZ';
  if (zone === 'Europe/Chisinau') return 'MD';
  return 'RU';
}

export async function detectCountry(): Promise<CountryCode> {
  const saved = getSavedCountry();
  if (saved) return saved;

  try {
    const response = await fetch('/api/region', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json() as { country?: CountryCode };
      if (data.country && data.country in REGIONS) return data.country;
    }
  } catch {
    // Fallback below.
  }

  return detectCountryFallback();
}

export function formatMoney(amount: number, country: CountryCode) {
  const region = REGIONS[country];
  return new Intl.NumberFormat(region.locale, {
    style: 'currency',
    currency: region.currency,
    maximumFractionDigits: region.currency === 'BYN' ? 2 : 0,
  }).format(amount);
}
