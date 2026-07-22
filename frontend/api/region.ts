type RequestLike = { headers: Record<string, string | string[] | undefined> };
type ResponseLike = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};

const SUPPORTED = new Set(['RU', 'BY', 'KZ', 'UA', 'AM', 'GE', 'KG', 'UZ', 'MD']);

export default function handler(request: RequestLike, response: ResponseLike) {
  const headerCountry = String(request.headers['x-vercel-ip-country'] ?? '').toUpperCase();
  const country = SUPPORTED.has(headerCountry) ? headerCountry : 'RU';

  response.setHeader('Cache-Control', 'private, no-store');
  response.status(200).json({ country });
}
