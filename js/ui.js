import { escapeHTML, money, dateTime, percent } from './utils.js';

const iconPaths = {
  dashboard: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
  wallet: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H20a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 8h15.5A2.5 2.5 0 0 1 21 10.5v2H16a2 2 0 0 1 0-5h5"/><circle cx="16" cy="10" r=".7" fill="currentColor" stroke="none"/>',
  branches: '<path d="M7 4v5m0 0a3 3 0 1 0 3 3H7a3 3 0 1 1-3 3v5M17 4v5m0 0a3 3 0 1 1-3 3h3a3 3 0 1 0 3 3v5"/>',
  deposit: '<path d="M12 4v13m0-13L7 9m5-5 5 5"/><path d="M5 20h14"/>',
  transfer: '<path d="M7 7h12l-3-3m3 3-3 3M17 17H5l3-3m-3 3 3 3"/>',
  withdraw: '<path d="M12 20V7m0 13 5-5m-5 5-5-5"/><path d="M5 4h14"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3m10 7h-3M12 22v-3M2 12h3"/>',
  chart: '<path d="M4 19V5m0 14h17"/><path d="m7 15 3-4 3 2 5-7"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
  settings: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 0 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A2 2 0 0 0 1.7 11h-.2a2 2 0 0 1 0-4h.2a2 2 0 0 0 1.4-3.4L3 3.5A2 2 0 0 1 5.8.7l.1.1A2 2 0 0 0 9.3-.6h.2a2 2 0 0 1 4 0v.2a2 2 0 0 0 3.4 1.4l.1-.1A2 2 0 0 1 19.8 4l-.1.1A2 2 0 0 0 21.1 7h.2a2 2 0 0 1 0 4h-.2a2 2 0 0 0-1.7 4Z" transform="translate(0 4) scale(.82)"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4"/><path d="M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  up: '<path d="m6 14 6-6 6 6"/>',
  down: '<path d="m6 10 6 6 6-6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
  download: '<path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14"/>',
  upload: '<path d="M12 20V9m0 0 4 4m-4-4-4 4M5 4h14"/>',
  moon: '<path d="M20 15.5A8 8 0 0 1 8.5 4 8.2 8.2 0 1 0 20 15.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 9h16"/>',
  edit: '<path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13 6 4 4"/>',
  archive: '<path d="M4 7h16v13H4zM3 4h18v3H3zM9 12h6"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4m-4 2a8 8 0 0 0 14.9 3M20 19v-4h-4"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  trash: '<path d="M4 7h16m-10 4v5m4-5v5M9 7V4h6v3m-9 0 1 14h10l1-14"/>'
};

export function icon(name, size = 18) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.info}</svg>`;
}

export function branchDot(branch, size = 10) { return `<span class="branch-dot" style="--dot:${branch.color}; width:${size}px; height:${size}px" aria-hidden="true"></span>`; }
export function emptyState(title, copy, action = '') { return `<div class="empty-state">${icon('info', 24)}<strong>${escapeHTML(title)}</strong><span>${escapeHTML(copy)}</span>${action}</div>`; }

export function lineChart(values, color = '#62d4b5') {
  const max = Math.max(...values.map(v => v.value), 1);
  const width = 520; const height = 150; const pad = 14;
  const points = values.map((item, index) => `${pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1)},${height - pad - (item.value / max) * (height - pad * 2)}`).join(' ');
  return `<div class="line-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Savings trend line"><defs><linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="M ${points} L ${width - pad},${height - pad} L ${pad},${height - pad} Z" fill="url(#areaGradient)"/><polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${values.map((item, index) => { const x = pad + (index * (width - pad * 2)) / Math.max(values.length - 1, 1); const y = height - pad - (item.value / max) * (height - pad * 2); return `<circle cx="${x}" cy="${y}" r="3.5" fill="${color}"/><title>${item.label}: ${money(item.value)}</title>`; }).join('')}</svg><div class="chart-labels">${values.map(item => `<span>${escapeHTML(item.label)}</span>`).join('')}</div></div>`;
}

export function barChart(values) {
  const max = Math.max(...values.map(v => v.value), 1);
  return `<div class="bar-chart">${values.map(item => `<div class="bar-row"><div class="bar-label"><span>${escapeHTML(item.label)}</span><strong>${money(item.value)}</strong></div><div class="bar-track"><span style="width:${Math.max(2, (item.value / max) * 100)}%; background:${item.color || '#8aa4c5'}"></span></div></div>`).join('')}</div>`;
}

export function donutChart(items, total) {
  let cursor = 0;
  const stops = items.map(item => { const start = cursor; cursor += total ? (item.value / total) * 100 : 0; return `${item.color} ${start}% ${cursor}%`; }).join(', ');
  return `<div class="donut-wrap"><div class="donut" style="background:conic-gradient(${stops || '#dce4ee 0 100%'});"><div><strong>${money(total, true)}</strong><span>total savings</span></div></div><div class="donut-legend">${items.map(item => `<div><span>${branchDot({ color: item.color }, 9)}${escapeHTML(item.label)}</span><strong>${percent(item.value, total)}%</strong></div>`).join('')}</div></div>`;
}

export function openModal({ title, eyebrow = 'Action', body, submitLabel = 'Save', formId = '', wide = false }) {
  const root = document.querySelector('#modal-root');
  root.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}" data-modal-card><button class="icon-button modal-close" data-action="close-modal" aria-label="Close">${icon('close')}</button><div class="eyebrow">${escapeHTML(eyebrow)}</div><h2>${escapeHTML(title)}</h2>${formId ? `<form id="${formId}">${body}<div class="modal-actions"><button type="button" class="button button-ghost" data-action="close-modal">Cancel</button><button type="submit" class="button button-primary">${escapeHTML(submitLabel)} ${icon('arrow', 16)}</button></div></form>` : body}</section></div>`;
  root.querySelector('[data-modal-card]').addEventListener('click', (event) => event.stopPropagation());
  root.querySelector('[data-modal-card] input, [data-modal-card] select, [data-modal-card] textarea')?.focus();
}

export function closeModal() { document.querySelector('#modal-root').innerHTML = ''; }
export function toast(message, tone = 'success') { const root = document.querySelector('#toast-root'); const el = document.createElement('div'); el.className = `toast toast-${tone}`; el.innerHTML = `${icon(tone === 'success' ? 'check' : 'info', 16)}<span>${escapeHTML(message)}</span>`; root.append(el); setTimeout(() => el.classList.add('toast-hide'), 2500); setTimeout(() => el.remove(), 2900); }
