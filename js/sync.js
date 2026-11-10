// Offline-first cloud sync with Supabase (REST + Auth over fetch; no external library).
// The local ledger (IndexedDB) is always the working copy. The cloud holds one snapshot per user.
// Changes are never merged silently: if both sides changed, the person chooses which copy wins.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const META_KEY = 'savings-manager-sync';
const TABLE = 'ledgers';
const AUTO_INTERVAL_MS = 120000;
const DEBOUNCE_MS = 2500;

let api = null; // { getState, applyRemote, validate, onRemoteApplied, askConflict }
let meta = loadMeta();
let running = false; let queued = false; let timer = null; let conflictPending = false;
let status = { state: 'off', message: '' };
const listeners = new Set();

function loadMeta() {
  try { return { autoSync: true, baseRevision: null, syncedFp: null, ...JSON.parse(localStorage.getItem(META_KEY) || '{}') }; } catch { return { autoSync: true, baseRevision: null, syncedFp: null }; }
}
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* storage full/blocked */ } }

export function fingerprint(s) {
  const core = JSON.stringify({ wallet: s.wallet, branches: s.branches, transactions: s.transactions, activities: s.activities, presets: s.presets, plans: s.plans });
  let h = 5381; for (let i = 0; i < core.length; i += 1) h = ((h << 5) + h + core.charCodeAt(i)) | 0;
  return `${core.length}:${(h >>> 0).toString(36)}`;
}
const isPristine = s => !s.transactions.length && !s.plans.length && s.wallet.balanceCents === 0;
const corePayload = s => ({ version: 1, wallet: s.wallet, branches: s.branches, transactions: s.transactions, activities: s.activities, presets: s.presets, plans: s.plans });

export const getConfig = () => ({ url: meta.url || SUPABASE_URL || '', anonKey: meta.anonKey || SUPABASE_ANON_KEY || '' });
export const isSignedIn = () => !!(meta.refreshToken && meta.userId);
export function getStatus() { return { ...status, signedIn: isSignedIn(), email: meta.email || '', autoSync: meta.autoSync !== false, lastSyncAt: meta.lastSyncAt || null, configured: !!(getConfig().url && getConfig().anonKey) }; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function setStatus(state, message = '') { status = { state, message }; listeners.forEach(fn => { try { fn(getStatus()); } catch { /* ignore */ } }); }
function idleStatus() {
  if (!isSignedIn()) return setStatus('off', meta.sessionExpired ? 'Session expired. Sign in again to resume syncing.' : 'Not connected');
  if (!navigator.onLine) return setStatus('offline', 'Offline. Changes are saved on this device and will sync when you are online.');
  const dirty = api && fingerprint(api.getState()) !== meta.syncedFp;
  return dirty ? setStatus('pending', 'Changes waiting to sync') : setStatus('synced', meta.lastSyncAt ? `Up to date · ${new Date(meta.lastSyncAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Up to date');
}

// ---------- HTTP ----------
function cleanUrl(value) {
  const url = String(value || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\/[^/\s]+$/i.test(url) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url)) throw new Error('Enter the Supabase project URL, like https://abcd1234.supabase.co');
  return url;
}
function checkKey(value) {
  const key = String(value || '').trim();
  if (!key) throw new Error('Enter the Supabase anon (publishable) key.');
  if (/^sb_secret_/i.test(key)) throw new Error('That is a secret key. Use the public anon / publishable key instead.');
  try { const role = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; if (role === 'service_role') throw new Error('That is the secret service_role key. Use the public anon key instead.'); } catch (error) { if (/service_role/.test(error.message)) throw error; }
  return key;
}
async function http(path, { method = 'GET', body, headers = {}, auth = true, timeout = 15000 } = {}) {
  const { url, anonKey } = getConfig();
  const controller = new AbortController(); const stop = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${url}${path}`, { method, signal: controller.signal, body: body === undefined ? undefined : JSON.stringify(body), headers: { apikey: anonKey, 'Content-Type': 'application/json', Accept: 'application/json', ...(auth ? { Authorization: `Bearer ${meta.accessToken}` } : {}), ...headers } });
    const text = await res.text(); let json = null; try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (!res.ok) throw Object.assign(new Error(json?.msg || json?.message || json?.error_description || json?.error || `Request failed (${res.status})`), { status: res.status, body: json });
    return json;
  } finally { clearTimeout(stop); }
}
const isNetworkError = error => error?.name === 'AbortError' || error instanceof TypeError;

// ---------- Auth ----------
function adoptSession(data, email) {
  if (meta.userId && data.user?.id && meta.userId !== data.user.id) { meta.baseRevision = null; meta.syncedFp = null; meta.lastSyncAt = null; }
  Object.assign(meta, { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000, userId: data.user?.id || meta.userId, email: data.user?.email || email, sessionExpired: false });
  saveMeta();
}
// Tell Supabase where to send the person after they click the confirmation link.
// Without this it uses the project's Site URL (default http://localhost:3000), which is often the wrong place.
// The address must also be listed under Supabase -> Authentication -> URL Configuration -> Redirect URLs.
// Skipped inside the Android app (its address is not a public URL); there the Site URL is used.
function confirmRedirectQuery() {
  if (window.Capacitor || !/^https?:$/.test(location.protocol)) return '';
  return `?redirect_to=${encodeURIComponent(location.origin + location.pathname)}`;
}
const unreachable = () => new Error('Could not reach Supabase. Check your internet connection and the project URL.');
export async function signIn({ url, anonKey, email, password }) {
  meta.url = cleanUrl(url); meta.anonKey = checkKey(anonKey); saveMeta();
  if (!email || !password) throw new Error('Enter your email and password.');
  const data = await http('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email: email.trim(), password } }).catch(error => { if (isNetworkError(error)) throw unreachable(); if (/email not confirmed/i.test(error.message)) throw new Error('Email not confirmed yet. Open the newest confirmation email and click its link once. If that already failed, check Supabase -> Authentication -> Users, or turn off Confirm email.'); throw error; });
  adoptSession(data, email.trim()); idleStatus(); schedule(300); return true;
}
export async function signUp({ url, anonKey, email, password }) {
  meta.url = cleanUrl(url); meta.anonKey = checkKey(anonKey); saveMeta();
  if (!email || !password) throw new Error('Enter an email and a password (at least 6 characters).');
  const data = await http(`/auth/v1/signup${confirmRedirectQuery()}`, { method: 'POST', auth: false, body: { email: email.trim(), password } }).catch(error => { throw isNetworkError(error) ? unreachable() : error; });
  if (data?.access_token) { adoptSession(data, email.trim()); idleStatus(); schedule(300); return { signedIn: true }; }
  return { signedIn: false };
}
export function signOut() {
  Object.assign(meta, { accessToken: null, refreshToken: null, expiresAt: 0, sessionExpired: false }); saveMeta(); clearTimeout(timer); idleStatus();
}
export function setAutoSync(on) { meta.autoSync = !!on; saveMeta(); if (on) schedule(300); else idleStatus(); }
async function ensureToken() {
  if (meta.accessToken && meta.expiresAt - Date.now() > 60000) return;
  try {
    const data = await http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: meta.refreshToken } });
    adoptSession(data, meta.email);
  } catch (error) {
    if (isNetworkError(error)) throw error;
    Object.assign(meta, { accessToken: null, refreshToken: null, sessionExpired: true }); saveMeta(); throw Object.assign(new Error('Session expired. Sign in again.'), { fatal: true });
  }
}

// ---------- Remote ledger row ----------
async function fetchRemote() {
  const rows = await http(`/rest/v1/${TABLE}?select=data,revision&user_id=eq.${meta.userId}`);
  return rows?.[0] || null;
}
async function pushLocal(expectedRevision) {
  const snapshot = api.getState(); const fp = fingerprint(snapshot); const data = corePayload(snapshot);
  let rows;
  if (expectedRevision === null) {
    try { rows = await http(`/rest/v1/${TABLE}`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: { user_id: meta.userId, data, revision: 1 } }); } catch (error) { if (error.status === 409) return { conflict: true }; throw error; }
  } else {
    rows = await http(`/rest/v1/${TABLE}?user_id=eq.${meta.userId}&revision=eq.${expectedRevision}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: { data, revision: expectedRevision + 1, updated_at: new Date().toISOString() } });
  }
  if (!rows?.length) return { conflict: true };
  Object.assign(meta, { baseRevision: rows[0].revision, syncedFp: fp, lastSyncAt: new Date().toISOString() }); saveMeta();
  return { pushed: true };
}
async function pullRemote(remote) {
  const next = { ...remote.data, settings: api.getState().settings };
  api.validate(next);
  await api.applyRemote(next);
  Object.assign(meta, { baseRevision: remote.revision, syncedFp: fingerprint(api.getState()), lastSyncAt: new Date().toISOString() }); saveMeta();
  api.onRemoteApplied?.();
  return { pulled: true };
}

// ---------- The sync round ----------
export async function syncNow({ manual = false } = {}) {
  if (!api) return { skipped: 'not-ready' };
  if (!isSignedIn()) { idleStatus(); return { skipped: 'signed-out' }; }
  if (!navigator.onLine) { idleStatus(); return { skipped: 'offline' }; }
  if (conflictPending && !manual) return { skipped: 'conflict' };
  if (running) { queued = true; return { skipped: 'busy' }; }
  running = true; setStatus('syncing', 'Syncing…');
  try {
    await ensureToken();
    const remote = await fetchRemote(); const local = api.getState(); const fp = fingerprint(local); const dirty = fp !== meta.syncedFp;
    let result;
    if (!remote) { result = await pushLocal(null); }
    else if (meta.baseRevision === remote.revision) { result = dirty ? await pushLocal(remote.revision) : { upToDate: true }; }
    else if (fingerprint(remote.data) === fp) { Object.assign(meta, { baseRevision: remote.revision, syncedFp: fp, lastSyncAt: new Date().toISOString() }); saveMeta(); result = { upToDate: true }; }
    else if (isPristine(local) || (meta.baseRevision !== null && !dirty)) { result = await pullRemote(remote); }
    else { result = { conflict: true, remote }; }
    if (result.conflict) {
      const latest = result.remote || await fetchRemote();
      conflictPending = true; setStatus('conflict', 'This device and the cloud both have changes. Choose which to keep.');
      const choice = await api.askConflict({ local: api.getState(), remote: latest?.data });
      if (choice === 'local') { const outcome = await pushLocal(latest ? latest.revision : null); if (outcome.conflict) throw new Error('The cloud copy changed again. Tap Sync now to retry.'); conflictPending = false; result = outcome; }
      else if (choice === 'remote' && latest) { await pullRemote(latest); conflictPending = false; result = { pulled: true }; }
      else { idleStatus(); setStatus('conflict', 'Sync paused. Tap Sync now to choose which copy to keep.'); return { conflict: true }; }
    }
    idleStatus(); return result;
  } catch (error) {
    if (isNetworkError(error)) { idleStatus(); return { skipped: 'offline' }; }
    if (error.fatal) { idleStatus(); return { error: error.message }; }
    setStatus('error', error.message || 'Sync failed.'); return { error: error.message };
  } finally {
    running = false;
    if (queued) { queued = false; schedule(500); }
  }
}

function schedule(delay = DEBOUNCE_MS) {
  clearTimeout(timer);
  if (!isSignedIn() || meta.autoSync === false) return;
  timer = setTimeout(() => syncNow(), delay);
}

export function init(hooks) {
  api = hooks;
  window.addEventListener('online', () => { idleStatus(); schedule(800); });
  window.addEventListener('offline', () => idleStatus());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(800); });
  setInterval(() => { if (document.visibilityState === 'visible' && meta.autoSync !== false) syncNow(); }, AUTO_INTERVAL_MS);
  idleStatus(); schedule(1000);
}
// Call after every local save.
export function notifyChanged() { if (!api) return; idleStatus(); schedule(); }
