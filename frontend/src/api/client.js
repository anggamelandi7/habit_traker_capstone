// src/api/client.js
// Klien fetch yang stabil: normalisasi BASE URL, auto header token,
// handle 204/teks, timeout, auto-logout saat 401/403, dan kompatibel ESLint.

const RAW_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

// --- helpers yang dipakai di bawah (didefinisikan dulu agar no-undef/no-use-before-define aman) ---

// Normalisasi base: pastikan ada protokol & hapus trailing slash
function normalizeBase(u) {
  let base = String(u || '').trim();
  if (!/^https?:\/\//i.test(base)) base = 'http://' + base;
  return base.replace(/\/+$/, '');
}

const API_BASE = normalizeBase(RAW_BASE);

function getToken() {
  return localStorage.getItem('token') || null;
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Timeout util dengan AbortController
async function withTimeout(doFetch, ms = 20000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), ms);
  try {
    return await doFetch(ctrl.signal);
  } finally {
    clearTimeout(to);
  }
}

// Parser respons: coba JSON, fallback ke text; handle 204
async function parseResponse(res) {
  if (res.status === 204 || res.status === 205) return null;
  const ctype = res.headers.get('content-type') || '';
  if (ctype.includes('application/json')) {
    try { return await res.json(); } catch { return null; }
  }
  try { return await res.text(); } catch { return null; }
}

function makeError(status, error, detail, payload) {
  const e = new Error(error || 'Request error');
  e.status = status;
  if (detail !== undefined) e.detail = detail;
  if (payload !== undefined) e.payload = payload;
  return e;
}

// --- core handler & request ---

async function handle(res) {
  const payload = await parseResponse(res);
  if (!res.ok) {
    const err = makeError(
      res.status,
      (payload && (payload.error || payload.message)) || res.statusText || 'Request error',
      payload && payload.detail ? payload.detail : undefined,
      payload
    );
    if (res.status === 401 || res.status === 403) {
      try { localStorage.removeItem('token'); } catch {}
    }
    throw err;
  }
  return payload;
}

async function request(method, path, body, extraHeaders) {
  const url = `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers = {
    ...((method !== 'DELETE' && method !== 'GET') ? { 'Content-Type': 'application/json' } : {}),
    ...authHeaders(),
    ...(extraHeaders || {})
  };

  const doFetch = (signal) =>
    fetch(url, {
      method,
      headers,
      body: body !== undefined ? (headers['Content-Type'] ? JSON.stringify(body) : body) : undefined,
      signal
    });

  try {
    const res = await withTimeout(doFetch, 20000);
    return await handle(res);
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw makeError(0, 'Request timeout', 'The request took too long.');
    }
    if (e instanceof TypeError && String(e.message || '').includes('Failed to fetch')) {
      throw makeError(0, 'Network error', 'Cannot reach API server.');
    }
    throw e;
  }
}

// --- public API helpers ---

export function apiGet(path, extraHeaders) {
  return request('GET', path, undefined, extraHeaders);
}

export function apiPost(path, body, extraHeaders) {
  return request('POST', path, body, extraHeaders);
}

export function apiPut(path, body, extraHeaders) {
  return request('PUT', path, body, extraHeaders);
}

export function apiDel(path, extraHeaders) {
  return request('DELETE', path, undefined, extraHeaders);
}
