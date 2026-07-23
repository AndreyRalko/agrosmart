const BACKEND_PROXY_PREFIX = '/backend';
const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8001';

/** Базовый URL API: в браузере — через прокси Next.js, на сервере — напрямую к Django. */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return BACKEND_PROXY_PREFIX;
  }

  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_BACKEND_URL
  );
}

/** Собирает полный URL API-пути с trailing slash для Django (только path, не query/hash). */
export function buildApiUrl(path: string): string {
  const base = getApiUrl().replace(/\/$/, '');
  const trimmed = path.startsWith('/') ? path.slice(1) : path;

  const hashIndex = trimmed.indexOf('#');
  const hash = hashIndex >= 0 ? trimmed.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;

  const queryIndex = withoutHash.indexOf('?');
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex) : '';
  let pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;

  if (pathname && !pathname.endsWith('/')) {
    pathname += '/';
  }

  return `${base}/${pathname}${query}${hash}`;
}
