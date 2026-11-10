export const CURRENCY = '₱';

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function ref(prefix = 'REF') {
  return `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export function cents(value) {
  const parsed = typeof value === 'number' ? value : Number(String(value || '').replaceAll(',', '').replace(/[₱$\s]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function money(amountCents, compact = false) {
  const value = (Number(amountCents) || 0) / 100;
  return `${CURRENCY}${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2, notation: compact && Math.abs(value) >= 1000000 ? 'compact' : 'standard' })}`;
}

export function signedMoney(amountCents) {
  const value = Number(amountCents) || 0;
  return `${value >= 0 ? '+' : '−'}${money(Math.abs(value))}`;
}

export function dateTime(value) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

export function dateOnly(value) {
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-PH', { month: 'short' }).format(new Date(year, month - 1, 1));
}

export function monthKey(value = Date.now()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

export function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
export function sum(list, selector = (value) => value) { return list.reduce((total, item) => total + Number(selector(item) || 0), 0); }
export function percent(value, total) { return total ? Math.round((value / total) * 100) : 0; }

export function download(filename, content, type = 'application/octet-stream') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function toCSV(rows) {
  return rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
}
