'use client';

/** Shared components (e.g. bills) use the session belonging to their page. */
export function scopedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const path = window.location.pathname;
  const portal = /^\/(chu-tro|admin|portal)(\/|$)/.test(path);
  const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
    headers.set('x-auth-scope', portal ? 'portal' : 'tenant');
  }
  return globalThis.fetch(input, { ...init, headers });
}
