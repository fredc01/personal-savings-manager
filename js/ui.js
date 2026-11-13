import { escapeHTML, money, dateTime, percent } from './utils.js';

// Icons: Tabler Icons (outline set, MIT) — https://tabler.io/icons
const iconPaths = {
  dashboard: '<path d="M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1"/><path d="M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1"/><path d="M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1"/><path d="M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1"/>',
  wallet: '<path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12"/><path d="M20 12v4h-4a2 2 0 0 1 0 -4h4"/>',
  branches: '<path d="M10 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M15 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M7 8v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2 -2v-2"/><path d="M12 12l0 4"/>',
  deposit: '<path d="M7 15h-3a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v3"/><path d="M12 19h-4a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v2.5"/><path d="M12 14a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M16 19h6"/><path d="M19 16v6"/>',
  transfer: '<path d="M7 10h14l-4 -4"/><path d="M17 14h-14l4 4"/>',
  withdraw: '<path d="M7 15h-3a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v3"/><path d="M12 19h-4a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v5"/><path d="M12 14a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M16 19h6"/>',
  target: '<path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M7 12a5 5 0 1 0 10 0a5 5 0 1 0 -10 0"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/>',
  chart: '<path d="M4 19l16 0"/><path d="M4 15l4 -6l4 2l4 -5l4 4"/>',
  list: '<path d="M9 6l11 0"/><path d="M9 12l11 0"/><path d="M9 18l11 0"/><path d="M5 6l0 .01"/><path d="M5 12l0 .01"/><path d="M5 18l0 .01"/>',
  settings: '<path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>',
  sync: '<path d="M12 18.004h-5.343c-2.572 -.004 -4.657 -2.011 -4.657 -4.487c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.38 0 2.57 .811 3.128 1.986"/><path d="M19 22v-6"/><path d="M22 19l-3 -3l-3 3"/>',
  more: '<path d="M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>',
  plus: '<path d="M12 5l0 14"/><path d="M5 12l14 0"/>',
  arrow: '<path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/>',
  up: '<path d="M12 5l0 14"/><path d="M18 11l-6 -6"/><path d="M6 11l6 -6"/>',
  down: '<path d="M12 5l0 14"/><path d="M18 13l-6 6"/><path d="M6 13l6 6"/>',
  close: '<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>',
  check: '<path d="M5 12l5 5l10 -10"/>',
  search: '<path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/>',
  download: '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 11l5 5l5 -5"/><path d="M12 4l0 12"/>',
  upload: '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/><path d="M7 9l5 -5l5 5"/><path d="M12 4l0 12"/>',
  moon: '<path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008"/>',
  sun: '<path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"/>',
  menu: '<path d="M4 6l16 0"/><path d="M4 12l16 0"/><path d="M4 18l16 0"/>',
  lock: '<path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6"/><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/><path d="M8 11v-4a4 4 0 1 1 8 0v4"/>',
  calendar: '<path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/>',
  edit: '<path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"/><path d="M13.5 6.5l4 4"/>',
  archive: '<path d="M3 6a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2"/><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-10"/><path d="M10 12l4 0"/>',
  refresh: '<path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>',
  chevron: '<path d="M9 6l6 6l-6 6"/>',
  info: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 9h.01"/><path d="M11 12h1v4h1"/>',
  trash: '<path d="M4 7l16 0"/><path d="M10 11l0 6"/><path d="M14 11l0 6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/>',
  shield: '<path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3"/>',
  heart: '<path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/>',
  home: '<path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/>',
  plane: '<path d="M16 10h4a2 2 0 0 1 0 4h-4l-4 7h-3l2 -7h-4l-2 2h-3l2 -4l-2 -4h3l2 2h4l-2 -7h3l4 7"/>',
  spark: '<path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6"/>',
  'trend-up': '<path d="M3 17l6 -6l4 4l8 -8"/><path d="M14 7l7 0l0 7"/>',
  'trend-down': '<path d="M3 7l6 6l4 -4l8 8"/><path d="M21 10l0 7l-7 0"/>'
};

export function icon(name, size = 18) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.info}</svg>`;
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
  root.innerHTML = `<div class="modal-backdrop" data-backdrop-close><section class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}" data-modal-card><button class="icon-button modal-close" data-action="close-modal" aria-label="Close">${icon('close')}</button><div class="eyebrow">${escapeHTML(eyebrow)}</div><h2>${escapeHTML(title)}</h2>${formId ? `<form id="${formId}">${body}<div class="modal-actions"><button type="button" class="button button-ghost" data-action="close-modal">Cancel</button><button type="submit" class="button button-primary">${escapeHTML(submitLabel)} ${icon('arrow', 16)}</button></div></form>` : body}</section></div>`;
  root.querySelector('[data-modal-card] input, [data-modal-card] select, [data-modal-card] textarea')?.focus();
}

export function closeModal() { document.querySelector('#modal-root').innerHTML = ''; }
export function toast(message, tone = 'success') { const root = document.querySelector('#toast-root'); const el = document.createElement('div'); el.className = `toast toast-${tone}`; el.innerHTML = `${icon(tone === 'success' ? 'check' : 'info', 16)}<span>${escapeHTML(message)}</span>`; root.append(el); setTimeout(() => el.classList.add('toast-hide'), 2500); setTimeout(() => el.remove(), 2900); }
