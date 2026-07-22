import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPPORTED = new Set(['RU', 'BY', 'KZ', 'UA', 'AM', 'GE', 'KG', 'UZ', 'MD']);

export default function handler(request: VercelRequest, response: VercelResponse) {
  const headerCountry = String(request.headers['x-vercel-ip-country'] ?? '').toUpperCase();
  const country = SUPPORTED.has(headerCountry) ? headerCountry : 'RU';

  response.setHeader('Cache-Control', 'private, no-store');
  response.status(200).json({ country });
}
