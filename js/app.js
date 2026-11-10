import * as Finance from './finance.js';
import { saveState } from './db.js';
import * as Sync from './sync.js';
import { cents, money, signedMoney, dateTime, dateOnly, monthKey, monthLabel, escapeHTML, percent, sum, toCSV, download } from './utils.js';
import { icon, branchDot, lineChart, barChart, donutChart, openModal, closeModal, toast, emptyState } from './ui.js';

const routeMeta = {
  '/': ['Overview', 'Dashboard', 'A clear view of where your savings stand today.'],
  '/wallet': ['Money in', 'Main wallet', 'Your central entry point for recorded deposits.'],
  '/branches': ['Your money map', 'Branch accounts', 'Give every goal a place to grow.'],
  '/deposit': ['Money in', 'Deposit money', 'Record a deposit, then decide where it should go.'],
  '/transfer': ['Move money', 'Transfer money', 'Move savings between branches without changing your total.'],
  '/withdraw': ['Money out', 'Withdraw money', 'Record a withdrawal with a clear balance trail.'],
  '/allocation': ['Configuration', 'Allocation settings', 'Set the default split for your next deposit.'],
  '/goals': ['Progress', 'Savings goals', 'Turn a target into visible momentum.'],
  '/transactions': ['Ledger', 'Transaction history', 'Every movement, one searchable record.'],
  '/reports': ['Patterns', 'Reports & analytics', 'See the habits behind your progress.'],
  '/planner': ['Plan ahead', 'Recurring planner', 'Keep future contributions visible and realistic.'],
  '/settings': ['Control center', 'Settings & backup', 'Protect, export, and tune your local ledger.']
};

let currentRoute = '/';
let state;
let txFilter = { search: '', type: 'all', branch: 'all', sort: 'newest', start: '', end: '' };
let pendingConfirm = null;
let pendingChoice = null;

const activeBranches = () => state.branches.filter(item => item.status === 'active');
const allAccounts = () => [{ id: 'wallet', name: 'Main Wallet', balanceCents: state.wallet.balanceCents }, ...activeBranches()];
const ledgerAccounts = () => [{ id: 'wallet', name: 'Main Wallet', balanceCents: state.wallet.balanceCents }, ...state.branches];
const branch = id => state.branches.find(item => item.id === id);
const typeLabel = type => ({ deposit: 'Deposit', automatic_distribution: 'Auto distribution', manual_allocation: 'Manual allocation', transfer: 'Transfer', withdrawal: 'Withdrawal', deposit_reversal: 'Deposit reversal', balance_adjustment: 'Adjustment' }[type] || type);
const titleForRoute = route => routeMeta[route] || routeMeta['/'];

function pageIntro(actions = '') {
  const [eyebrow, title, copy] = titleForRoute(currentRoute);
  return `<section class="page-intro"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${copy}</p></div><div class="page-actions">${actions}</div></section>`;
}
function button(label, action, style = 'button-primary', extra = '') { return `<button class="button ${style}" data-action="${action}" ${extra}>${label}</button>`; }
function metric(label, value, note, tone = 'blue', iconName = 'chart') { return `<article class="metric-card metric-${tone}"><div class="metric-top"><span class="metric-label">${label}</span><span class="metric-icon">${icon(iconName, 17)}</span></div><strong class="metric-value privacy-value">${value}</strong><span class="metric-note">${note}</span></article>`; }
function card(title, content, className = '', action = '') { return `<section class="card ${className}"><div class="card-heading"><div><h2>${title}</h2></div>${action}</div>${content}</section>`; }
function field(label, input, hint = '') { return `<label class="field"><span>${label}</span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`; }
function selectAccount(name, accounts, selected = '', includeWallet = true) { const list = includeWallet ? accounts : accounts.filter(item => item.id !== 'wallet'); return `<select name="${name}" required>${list.map(item => `<option value="${item.id}" ${item.id === selected ? 'selected' : ''}>${escapeHTML(item.name)} · ${money(item.balanceCents)}</option>`).join('')}</select>`; }

function transactionRows(list, showAction = true) {
  if (!list.length) return emptyState('No transactions yet', 'Your completed deposits, moves, and withdrawals will appear here.');
  return `<div class="transaction-list">${list.map(tx => `<div class="transaction-row" data-action="${showAction ? 'view-transaction' : ''}" data-id="${tx.id}"><span class="transaction-symbol ${tx.type === 'withdrawal' || tx.type === 'deposit_reversal' ? 'negative' : tx.type === 'transfer' ? 'neutral' : 'positive'}">${icon(tx.type === 'withdrawal' || tx.type === 'deposit_reversal' ? 'down' : tx.type === 'transfer' ? 'transfer' : 'up', 15)}</span><span class="transaction-main"><strong>${escapeHTML(tx.description || typeLabel(tx.type))}</strong><small>${typeLabel(tx.type)} · ${dateTime(tx.date)}</small></span><span class="transaction-ref">${escapeHTML(tx.reference)}</span><strong class="transaction-amount privacy-value ${tx.type === 'withdrawal' || tx.type === 'deposit_reversal' ? 'amount-negative' : tx.type === 'transfer' ? 'amount-neutral' : 'amount-positive'}">${tx.type === 'withdrawal' || tx.type === 'deposit_reversal' ? '−' : '+'}${money(tx.amountCents)}</strong>${showAction ? `<span class="row-chevron">${icon('chevron', 16)}</span>` : ''}</div>`).join('')}</div>`;
}

function branchCard(item, totalSavings) {
  const progress = percent(item.balanceCents, item.targetCents);
  return `<article class="branch-card" style="--branch:${item.color}"><div class="branch-card-top"><div class="branch-icon" style="--branch:${item.color}">${icon(item.icon === 'shield' ? 'lock' : item.icon === 'heart' ? 'target' : item.icon === 'home' ? 'branches' : item.icon === 'plane' ? 'arrow' : 'spark', 20)}</div><span class="branch-status">${item.status === 'active' ? 'Active' : 'Archived'}</span></div><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.description || 'A named place for your progress.')}</p><div class="branch-balance privacy-value">${money(item.balanceCents)}</div><div class="progress-meta"><span>${progress}% of ${money(item.targetCents)} goal</span><span>${percent(item.balanceCents, totalSavings)}% of total</span></div><div class="progress-track"><span style="width:${Math.min(progress, 100)}%; background:${item.color}"></span></div><div class="branch-card-actions"><button class="text-button" data-action="view-branch" data-id="${item.id}">${icon('list', 14)} History</button><button class="text-button" data-action="edit-branch" data-id="${item.id}">${icon('edit', 14)} Edit</button>${item.status === 'active' ? `<button class="text-button muted" data-action="archive-branch" data-id="${item.id}">${icon('archive', 14)} Archive</button>` : `<button class="text-button" data-action="reactivate-branch" data-id="${item.id}">${icon('refresh', 14)} Reactivate</button>`}</div></article>`;
}

function renderDashboard() {
  const overview = Finance.summary();
  const total = overview.totalSavings;
  const branches = activeBranches();
  const distribution = branches.map(item => ({ label: item.name, value: item.balanceCents, color: item.color }));
  const months = Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setMonth(date.getMonth() - (5 - index)); const key = monthKey(date); const value = sum(state.transactions.filter(tx => tx.type === 'deposit' && monthKey(tx.date) <= key), tx => tx.amountCents) - sum(state.transactions.filter(tx => tx.type === 'withdrawal' && monthKey(tx.date) <= key), tx => tx.amountCents); return { label: new Intl.DateTimeFormat('en-PH', { month: 'short' }).format(date), value: Math.max(0, value) }; });
  const goalBranch = branches.slice().sort((a, b) => percent(b.balanceCents, b.targetCents) - percent(a.balanceCents, a.targetCents))[0];
  return `${pageIntro(button('Deposit money ' + icon('arrow', 15), 'go-deposit'))}<section class="hero-ledger"><div class="hero-copy"><div class="eyebrow eyebrow-light">Current position</div><h2 class="privacy-value">${money(total)}</h2><p>Across ${overview.activeBranchCount} active branch accounts and your main wallet.</p><div class="hero-actions">${button(icon('plus', 16) + ' Record deposit', 'go-deposit', 'button-light')}<button class="button button-quiet-light" data-action="go-transfer">Transfer between branches ${icon('arrow', 15)}</button></div></div><div class="hero-spark">${lineChart(months, '#62d4b5')}<span>6-month savings path</span></div></section><div class="metrics-grid">${metric('Total deposited', money(overview.deposits), 'All recorded deposits', 'green', 'deposit')}${metric('Total withdrawn', money(overview.withdrawals), 'Outflows from your ledger', 'amber', 'withdraw')}${metric('Branch accounts', overview.branchCount, `${overview.activeBranchCount} active · ${overview.branchCount - overview.activeBranchCount} archived`, 'purple', 'branches')}${metric('Internal transfers', overview.transfers, 'Money moved, total unchanged', 'blue', 'transfer')}</div><div class="dashboard-grid"><div class="dashboard-main">${card('Savings distribution', `<div class="card-subline"><span>Where your current balance lives</span><button class="text-button" data-action="go-branches">View branches ${icon('arrow', 14)}</button></div>${donutChart(distribution, total)}`, 'distribution-card')}${card('Monthly progress', `<div class="card-subline"><span>Net position across the last six months</span><span class="trend-positive">${overview.monthlyNet >= 0 ? '↑' : '↓'} ${money(Math.abs(overview.monthlyNet))} this month</span></div>${lineChart(months, '#8aa4ff')}`, 'monthly-card')}</div><aside class="dashboard-side">${card('Quick actions', `<div class="quick-actions">${button(icon('deposit', 17) + '<span><strong>Record a deposit</strong><small>Keep or distribute savings</small></span>', 'go-deposit', 'quick-action')} ${button(icon('transfer', 17) + '<span><strong>Move money</strong><small>Transfer across branches</small></span>', 'go-transfer', 'quick-action')} ${button(icon('withdraw', 17) + '<span><strong>Record withdrawal</strong><small>Keep the trail complete</small></span>', 'go-withdraw', 'quick-action')}</div>`)}${card('Next milestone', goalBranch ? `<div class="milestone"><div class="milestone-icon" style="--branch:${goalBranch.color}">${icon('target', 20)}</div><div><strong>${escapeHTML(goalBranch.name)}</strong><span>${money(Math.max(0, goalBranch.targetCents - goalBranch.balanceCents))} to goal</span></div><b>${percent(goalBranch.balanceCents, goalBranch.targetCents)}%</b></div><div class="progress-track large"><span style="width:${Math.min(percent(goalBranch.balanceCents, goalBranch.targetCents), 100)}%;background:${goalBranch.color}"></span></div>` : emptyState('No goals yet', 'Create a branch target to see progress here.'), 'milestone-card')}</aside></div>${card('Recent activity', transactionRows(state.transactions.slice(0, 5)), 'activity-card', `<button class="text-button" data-action="go-transactions">See full history ${icon('arrow', 14)}</button>`)}`;
}

function renderWallet() {
  const walletTx = state.transactions.filter(tx => tx.source === 'Main Wallet' || tx.destination === 'Main Wallet' || tx.source === 'External' || tx.destination === 'External').slice(0, 12);
  return `${pageIntro(button('Record deposit ' + icon('arrow', 15), 'go-deposit'))}<div class="wallet-hero"><div><div class="eyebrow eyebrow-light">Available in main wallet</div><h2 class="privacy-value">${money(state.wallet.balanceCents)}</h2><p>The central holding place for deposits you choose not to distribute yet.</p></div><div class="wallet-orbit">${icon('wallet', 54)}</div></div><div class="two-column-layout"><div>${card('Wallet controls', `<div class="action-stack">${button(icon('deposit', 17) + '<span><strong>Deposit into wallet</strong><small>Keep the full amount here</small></span>', 'go-deposit', 'quick-action')} ${button(icon('withdraw', 17) + '<span><strong>Withdraw from wallet</strong><small>Record an outflow with a note</small></span>', 'go-withdraw', 'quick-action')}</div>`)}${card('Wallet notes', `<div class="callout callout-blue">${icon('info', 18)}<div><strong>Record what happened, not what might happen.</strong><span>Planned contributions stay in the Recurring Planner until you record the real deposit.</span></div></div>`)}</div>${card('Wallet activity', transactionRows(walletTx), 'tall-card')}</div>`;
}

function renderBranches() {
  const total = Finance.summary().totalSavings;
  const archived = state.branches.filter(item => item.status === 'archived');
  return `${pageIntro(button(icon('plus', 15) + ' New branch', 'open-branch'))}<div class="branch-summary-strip"><div><span>Across all branches</span><strong class="privacy-value">${money(sum(state.branches, item => item.balanceCents))}</strong></div><div><span>Active goals</span><strong>${activeBranches().length}</strong></div><div><span>Allocation set</span><strong>${sum(activeBranches(), item => item.allocationPercent)}%</strong></div><div class="strip-action"><button class="text-button" data-action="go-allocation">Tune allocation ${icon('arrow', 14)}</button></div></div><div class="branch-grid">${activeBranches().map(item => branchCard(item, total)).join('')}</div>${archived.length ? card('Archived accounts', `<div class="archived-list">${archived.map(item => `<div class="archived-row"><span>${branchDot(item)}<strong>${escapeHTML(item.name)}</strong></span><span>${money(item.balanceCents)}</span><button class="text-button" data-action="reactivate-branch" data-id="${item.id}">Reactivate</button></div>`).join('')}</div>`, 'archived-card') : ''}`;
}

const syncTitles = { off: 'Cloud sync is off', synced: 'Cloud synced', syncing: 'Syncing…', pending: 'Waiting to sync', offline: 'Offline · saved on this device', error: 'Sync problem', conflict: 'Needs your decision' };
function paintSync(st) {
  const btn = document.querySelector('#sync-button'); if (btn) { btn.dataset.state = st.state; btn.title = `${syncTitles[st.state] || 'Cloud sync'}${st.message ? ` — ${st.message}` : ''}`; }
  document.querySelector('#sync-dot')?.setAttribute('data-state', st.state);
  const title = document.querySelector('#sync-status-title'); if (title) title.textContent = syncTitles[st.state] || '';
  const detail = document.querySelector('#sync-status-detail'); if (detail) detail.textContent = st.message || '';
  const note = document.querySelector('#sidebar-sync-note'); if (note) note.textContent = st.signedIn ? `Saved on this device · ${st.state === 'synced' ? 'cloud synced' : (syncTitles[st.state] || '').toLowerCase()}` : 'Saved on this device';
}
function cloudCard() {
  const st = Sync.getStatus(); const cfg = Sync.getConfig();
  const statusRow = `<div class="sync-status-row"><span class="sync-dot" id="sync-dot" data-state="${st.state}"></span><div><strong id="sync-status-title">${syncTitles[st.state]}</strong><small id="sync-status-detail">${escapeHTML(st.message)}</small></div></div>`;
  const intro = `<p class="cloud-note">Your ledger is always saved on this device first and works fully offline. When you are online, a copy is synced to your own Supabase database.</p>`;
  if (st.signedIn) return card('Cloud sync', `${statusRow}${intro}<div class="setting-row"><div><strong>Signed in</strong><span>${escapeHTML(st.email)}</span></div><div class="inline-actions">${button(icon('sync', 15) + ' Sync now', 'sync-now', 'button-secondary')}${button('Sign out', 'cloud-signout', 'button-secondary')}</div></div><div class="setting-row"><div><strong>Auto-sync</strong><span>Sync automatically when online, after changes, and when you reopen the app.</span></div><button class="switch ${st.autoSync ? 'on' : ''}" data-action="toggle-autosync" aria-label="Toggle auto-sync"><span></span></button></div>`);
  return card('Cloud sync', `${statusRow}${intro}<form id="cloud-form" class="cloud-form"><details ${st.configured ? '' : 'open'}><summary>Supabase connection</summary><div class="cloud-fields">${field('Project URL', `<input name="url" type="url" placeholder="https://abcd1234.supabase.co" value="${escapeHTML(cfg.url)}" autocomplete="off">`)}${field('Anon (publishable) key', `<input name="anonKey" type="text" placeholder="eyJ… or sb_publishable_…" value="${escapeHTML(cfg.anonKey)}" autocomplete="off" spellcheck="false">`, 'Public key only. Never paste the secret / service_role key.')}</div></details><div class="cloud-fields">${field('Email', '<input name="email" type="email" required autocomplete="email">')}${field('Password', '<input name="password" type="password" required minlength="6" autocomplete="current-password">')}</div><div class="inline-actions"><button type="submit" class="button button-primary">Sign in</button>${button('Create account', 'cloud-signup', 'button-secondary', 'type="button"')}</div></form>`);
}
function summarizeLedger(ledger) {
  const total = (ledger?.wallet?.balanceCents || 0) + sum(ledger?.branches || [], item => item.balanceCents);
  return `<strong>${money(total)}</strong> total · ${(ledger?.transactions || []).length} transactions`;
}
function askConflict({ local, remote }) {
  return new Promise(resolve => {
    pendingChoice = resolve;
    openModal({ title: 'Which copy should win?', eyebrow: 'Sync conflict', body: `<div class="confirm-summary"><p>This device and your cloud copy both have different changes. Nothing has been overwritten yet.</p><div class="summary-line"><span>This device</span><span>${summarizeLedger(local)}</span></div><div class="summary-line"><span>Cloud copy</span><span>${summarizeLedger(remote)}</span></div><p><button type="button" class="text-button" data-action="export-backup">${icon('download', 14)} Download a backup of this device first</button></p></div><div class="modal-actions modal-actions-stack"><button type="button" class="button button-primary" data-action="choice-local">Keep this device (replace cloud)</button><button type="button" class="button button-secondary" data-action="choice-remote">Use cloud copy (replace this device)</button><button type="button" class="button button-ghost" data-action="choice-later">Decide later</button></div>` });
  });
}
function refreshAfterRemote() {
  state = Finance.getState();
  const busyUI = document.querySelector('#modal-root')?.children.length || ['/deposit', '/transfer', '/withdraw'].includes(currentRoute) || document.activeElement?.closest?.('form');
  if (busyUI) toast('Updated from cloud. Reopen this page to see the latest.', 'info'); else { renderPage(); toast('Updated from cloud.', 'info'); }
}

function confirmAction(title, summary) {
  return new Promise(resolve => {
    pendingConfirm = resolve;
    openModal({ title, eyebrow: 'Review before recording', body: `<div class="confirm-summary">${summary}</div><div class="modal-actions"><button type="button" class="button button-ghost" data-action="reject-confirm">Cancel</button><button type="button" class="button button-primary" data-action="accept-confirm">Confirm and record ${icon('check', 15)}</button></div>` });
  });
}

function allocationRows(mode = 'auto') {
  return activeBranches().map(item => `<div class="allocation-row" data-branch-row="${item.id}"><label class="check-wrap"><input type="checkbox" name="participate-${item.id}" data-participate="${item.id}" checked><span class="fake-check">${icon('check', 12)}</span>${branchDot(item)}<span>${escapeHTML(item.name)}</span></label><span class="allocation-percent-field">${mode === 'auto' ? `<input type="number" min="0" max="100" step="0.01" value="${item.allocationPercent}" data-alloc-percent="${item.id}" aria-label="${escapeHTML(item.name)} percentage"><b>%</b>` : `<input type="number" min="0" step="0.01" placeholder="0.00" data-alloc-amount="${item.id}" aria-label="${escapeHTML(item.name)} amount">`}</span></div>`).join('');
}

function renderDeposit() {
  return `${pageIntro()}<form id="deposit-form" class="form-layout"><section class="form-panel form-panel-main"><div class="form-section-heading"><div><div class="eyebrow">Step 01</div><h2>How much are you recording?</h2></div><span class="secure-note">${icon('lock', 14)} Saved locally</span></div><div class="amount-entry"><span>${'₱'}</span><input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required inputmode="decimal" autofocus><small>PHP · Philippine peso</small></div><div class="form-grid two-up">${field('Date and time', '<input name="date" type="datetime-local" value="' + new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) + '" required>')}${field('Description or note', '<input name="note" type="text" placeholder="e.g. Monthly payday contribution" maxlength="120">')}</div><div class="form-section-heading compact"><div><div class="eyebrow">Step 02</div><h2>Where should it go?</h2></div></div><div class="mode-grid"><label class="mode-card selected"><input type="radio" name="mode" value="auto" checked><span class="mode-icon">${icon('branches', 20)}</span><strong>Auto distribute</strong><small>Use your saved branch percentages.</small></label><label class="mode-card"><input type="radio" name="mode" value="wallet"><span class="mode-icon">${icon('wallet', 20)}</span><strong>Keep in wallet</strong><small>Hold the full amount centrally.</small></label><label class="mode-card"><input type="radio" name="mode" value="manual"><span class="mode-icon">${icon('edit', 20)}</span><strong>Manual allocation</strong><small>Choose exact amounts per branch.</small></label></div><div id="distribution-controls" class="distribution-controls"><div class="allocation-heading"><div><strong>Choose participating branches</strong><span id="allocation-hint">Percentages should add up to 100%.</span></div><button type="button" class="text-button" data-action="go-allocation">Edit defaults ${icon('arrow', 14)}</button></div><div class="allocation-list">${allocationRows()}</div><div id="deposit-preview" class="deposit-preview"></div></div><div class="form-footnote">${icon('info', 15)} Automatic distributions are recorded as a deposit plus allocation legs. Any rounding remainder goes to the first selected branch.</div></section><aside class="form-summary"><div class="summary-sticky"><div class="eyebrow">Before you confirm</div><h3>Your deposit preview</h3><div id="summary-preview" class="summary-preview"><span>Enter an amount to see the balance impact.</span></div><div class="summary-divider"></div><div class="integrity-note">${icon('check', 16)}<div><strong>Financial integrity check</strong><span>The recorded total will equal your input exactly. No branch can go negative.</span></div></div><button type="submit" class="button button-primary button-full">Review and record ${icon('arrow', 16)}</button></div></aside></form>`;
}

function renderTransfer() {
  const accounts = activeBranches();
  return `${pageIntro()}<form id="transfer-form" class="form-layout"><section class="form-panel form-panel-main"><div class="form-section-heading"><div><div class="eyebrow">Internal move</div><h2>Move savings between branches</h2><p class="section-copy">Transfers change branch balances, not your overall savings.</p></div><span class="neutral-pill">Total stays the same</span></div><div class="transfer-visual"><div class="transfer-node"><span class="node-label">From</span><div class="node-select">${selectAccount('sourceId', accounts, accounts[0]?.id, false)}</div><span class="available" id="transfer-available">Available ${money(accounts[0]?.balanceCents || 0)}</span></div><div class="transfer-arrow">${icon('transfer', 24)}</div><div class="transfer-node"><span class="node-label">To</span><div class="node-select">${selectAccount('destinationId', accounts, accounts[1]?.id, false)}</div><span class="available">Choose a different branch</span></div></div><div class="amount-entry small-entry"><span>₱</span><input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required inputmode="decimal"></div><div class="form-grid two-up">${field('Transfer note', '<input name="note" type="text" placeholder="e.g. Rebalancing for safety" maxlength="120">')}${field('Transfer reference', '<input value="Generated on confirm" disabled>')}</div><div class="form-footnote">${icon('info', 15)} A unique transfer reference is created when you confirm. Both sides stay in the audit trail.</div></section><aside class="form-summary"><div class="summary-sticky"><div class="eyebrow">Transfer summary</div><h3>Keep the full picture.</h3><div class="summary-preview"><div class="summary-line"><span>Source</span><strong id="transfer-source-name">${escapeHTML(accounts[0]?.name || '—')}</strong></div><div class="summary-line"><span>Destination</span><strong id="transfer-destination-name">${escapeHTML(accounts[1]?.name || '—')}</strong></div><div class="summary-line total"><span>Overall savings</span><strong>Unchanged</strong></div></div><button type="submit" class="button button-primary button-full">Review transfer ${icon('arrow', 16)}</button></div></aside></form>`;
}

function renderWithdraw() {
  return `${pageIntro()}<form id="withdraw-form" class="form-layout"><section class="form-panel form-panel-main"><div class="form-section-heading"><div><div class="eyebrow">Money out</div><h2>Which account is paying out?</h2><p class="section-copy">A withdrawal reduces total savings by exactly the amount recorded.</p></div></div>${field('Account', selectAccount('accountId', allAccounts(), 'wallet', true))}<div class="amount-entry small-entry"><span>₱</span><input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required inputmode="decimal"></div><div class="form-grid two-up">${field('Withdrawal note', '<input name="note" type="text" placeholder="e.g. Utility payment" maxlength="120">')}${field('Date and time', '<input name="date" type="datetime-local" value="' + new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) + '" required>')}</div><div class="balance-callout" id="withdraw-balance">${icon('wallet', 18)}<span>Available balance: <strong>${money(state.wallet.balanceCents)}</strong></span></div></section><aside class="form-summary"><div class="summary-sticky"><div class="eyebrow">Before you confirm</div><h3>Keep the trail complete.</h3><div class="integrity-note warning-note">${icon('info', 16)}<div><strong>Balance validation</strong><span>The selected account must have enough balance; the total savings card will update immediately.</span></div></div><button type="submit" class="button button-primary button-full">Review withdrawal ${icon('arrow', 16)}</button></div></aside></form>`;
}

function renderAllocation() {
  const total = sum(activeBranches(), item => item.allocationPercent);
  return `${pageIntro(button(icon('plus', 15) + ' Save as preset', 'save-allocation-preset', 'button-secondary'))}<div class="settings-layout"><section class="card allocation-settings-card"><div class="card-heading"><div><h2>Default distribution</h2><p>These percentages are used the next time you auto distribute a deposit.</p></div><span class="allocation-total ${total === 100 ? 'valid' : 'invalid'}">${total}% <small>${total === 100 ? 'ready' : 'needs 100%'}</small></span></div><form id="allocation-settings-form"><div class="allocation-settings-list">${activeBranches().map(item => `<div class="allocation-setting-row"><div class="allocation-setting-label">${branchDot(item)}<div><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.description)}</span></div></div><label class="percent-input"><input type="number" min="0" max="100" step="0.01" name="allocation-${item.id}" data-alloc-setting="${item.id}" value="${item.allocationPercent}"><b>%</b></label></div>`).join('')}</div><div class="settings-form-actions"><span class="form-footnote">${icon('info', 15)} Active branches must total exactly 100% for automatic distribution.</span><button type="submit" class="button button-primary">Save allocation ${icon('check', 15)}</button></div></form></section><aside>${card('Saved presets', `<div class="preset-list">${state.presets.map(preset => `<div class="preset-row"><div><strong>${escapeHTML(preset.name)}</strong><span>${escapeHTML(preset.description)}</span></div><button class="text-button" data-action="use-preset" data-id="${preset.id}">Use preset</button></div>`).join('')}</div>`)}</aside></div>`;
}

function renderGoals() {
  const total = Finance.summary().totalSavings;
  return `${pageIntro(button(icon('plus', 15) + ' Add goal', 'open-goal'))}<div class="goal-grid">${activeBranches().map(item => { const remaining = Math.max(0, item.targetCents - item.balanceCents); const progress = Math.min(100, percent(item.balanceCents, item.targetCents)); return `<article class="goal-card" style="--branch:${item.color}"><div class="goal-card-head"><div class="goal-icon">${icon('target', 20)}</div><button class="icon-button" data-action="edit-goal" data-id="${item.id}" aria-label="Edit goal">${icon('edit', 16)}</button></div><div class="eyebrow">${escapeHTML(item.name)}</div><h2>${money(item.balanceCents)} <small>of ${money(item.targetCents)}</small></h2><div class="goal-progress"><span style="width:${progress}%;background:${item.color}"></span></div><div class="progress-meta"><span>${progress}% complete</span><strong>${!item.targetCents ? 'No target set' : remaining ? `${money(remaining)} to go` : 'Goal achieved'}</strong></div><p>${item.goalCadence ? `Planned cadence: ${escapeHTML(item.goalCadence)}.` : 'Set a cadence to estimate your finish line.'}</p></article>`; }).join('')}</div>${card('How goal progress works', `<div class="callout callout-blue">${icon('info', 18)}<div><strong>Goals stay connected to real balances.</strong><span>Only recorded deposits and transfers change progress. Planned contributions are visible in the planner but do not inflate your current savings.</span></div></div>`, 'goal-note')}`;
}

function renderTransactions() {
  const query = txFilter.search.toLowerCase();
  let list = state.transactions.filter(tx => { const matchesSearch = !query || [tx.description, tx.reference, tx.source, tx.destination, typeLabel(tx.type)].join(' ').toLowerCase().includes(query); const matchesType = txFilter.type === 'all' || tx.type === txFilter.type; const matchesBranch = txFilter.branch === 'all' || tx.source === branch(txFilter.branch)?.name || tx.destination === branch(txFilter.branch)?.name || (txFilter.branch === 'wallet' && (tx.source === 'Main Wallet' || tx.destination === 'Main Wallet')); const txDate = new Date(tx.date); const matchesStart = !txFilter.start || txDate >= new Date(`${txFilter.start}T00:00:00`); const matchesEnd = !txFilter.end || txDate <= new Date(`${txFilter.end}T23:59:59`); return matchesSearch && matchesType && matchesBranch && matchesStart && matchesEnd; });
  list = list.sort((a, b) => txFilter.sort === 'oldest' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));
  return `${pageIntro(button(icon('download', 15) + ' Export CSV', 'export-csv', 'button-secondary'))}<section class="card transaction-card"><div class="filter-bar"><label class="search-field">${icon('search', 16)}<input id="tx-search" type="search" value="${escapeHTML(txFilter.search)}" placeholder="Search reference, note, or account"></label><select id="tx-type"><option value="all">All types</option>${['deposit', 'automatic_distribution', 'transfer', 'withdrawal', 'deposit_reversal'].map(type => `<option value="${type}" ${txFilter.type === type ? 'selected' : ''}>${typeLabel(type)}</option>`).join('')}</select><select id="tx-branch"><option value="all">All accounts</option>${ledgerAccounts().map(item => `<option value="${item.id}" ${txFilter.branch === item.id ? 'selected' : ''}>${escapeHTML(item.name)}${item.status === 'archived' ? ' · archived' : ''}</option>`).join('')}</select><select id="tx-sort"><option value="newest" ${txFilter.sort === 'newest' ? 'selected' : ''}>Newest first</option><option value="oldest" ${txFilter.sort === 'oldest' ? 'selected' : ''}>Oldest first</option></select><label class="date-filter">From <input id="tx-start" type="date" value="${txFilter.start}"></label><label class="date-filter">To <input id="tx-end" type="date" value="${txFilter.end}"></label></div><div class="transaction-table-head"><span>Transaction</span><span>Reference</span><span>Amount</span><span>Status</span></div><div class="transaction-table">${list.length ? list.map(tx => `<div class="transaction-table-row" data-action="view-transaction" data-id="${tx.id}"><div class="transaction-table-main"><span class="transaction-symbol ${tx.type === 'withdrawal' || tx.type === 'deposit_reversal' ? 'negative' : tx.type === 'transfer' ? 'neutral' : 'positive'}">${icon(tx.type === 'withdrawal' || tx.type === 'deposit_reversal' ? 'down' : tx.type === 'transfer' ? 'transfer' : 'up', 15)}</span><span><strong>${escapeHTML(tx.description || typeLabel(tx.type))}</strong><small>${typeLabel(tx.type)} · ${dateTime(tx.date)}</small></span></div><span class="transaction-ref">${escapeHTML(tx.reference)}</span><strong class="transaction-amount privacy-value ${tx.type === 'withdrawal' || tx.type === 'deposit_reversal' ? 'amount-negative' : 'amount-positive'}">${tx.type === 'withdrawal' || tx.type === 'deposit_reversal' ? '−' : '+'}${money(tx.amountCents)}</strong><span class="status-pill status-completed">${escapeHTML(tx.status || 'Completed')}</span></div>`).join('') : `<div class="table-empty">${emptyState('No matches', 'Try another keyword or clear one of the filters.')}</div>`}</div><div class="table-footer"><span>Showing ${list.length} of ${state.transactions.length} recorded transactions</span><span>Financial records are never silently deleted.</span></div></section>`;
}

function renderReports() {
  const overview = Finance.summary();
  const branchValues = activeBranches().slice().sort((a, b) => b.balanceCents - a.balanceCents).map(item => ({ label: item.name, value: item.balanceCents, color: item.color }));
  const months = Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setMonth(date.getMonth() - (5 - index)); const key = monthKey(date); const deposits = sum(state.transactions.filter(tx => tx.type === 'deposit' && monthKey(tx.date) === key), tx => tx.amountCents); const withdrawals = sum(state.transactions.filter(tx => tx.type === 'withdrawal' && monthKey(tx.date) === key), tx => tx.amountCents); return { label: new Intl.DateTimeFormat('en-PH', { month: 'short' }).format(date), value: deposits - withdrawals, deposits, withdrawals }; });
  const highest = branchValues[0]; const lowest = branchValues.at(-1);
  return `${pageIntro(button(icon('download', 15) + ' Export CSV', 'export-csv', 'button-secondary'))}<div class="report-kpis">${metric('Average monthly deposit', money(months.length ? sum(months, item => item.deposits) / months.length : 0), 'Based on this visible period', 'green', 'deposit')}${metric('Monthly net', money(overview.monthlyNet), 'Deposits less withdrawals', 'blue', 'chart')}${metric('Highest-funded branch', highest ? money(highest.value) : '—', highest?.label || 'No active branch', 'purple', 'target')}${metric('Lowest-funded branch', lowest ? money(lowest.value) : '—', lowest?.label || 'No active branch', 'amber', 'branches')}</div><div class="reports-grid">${card('Savings growth', lineChart(months.map(item => ({ label: item.label, value: Math.max(0, item.value) })), '#62d4b5'), 'report-wide')}${card('Branch comparison', barChart(branchValues), 'report-side')}${card('Monthly deposits vs withdrawals', `<div class="dual-bars">${months.map(item => `<div class="dual-bar-col"><div class="dual-bar-stack"><span style="height:${Math.max(4, Math.min(100, item.deposits / Math.max(...months.map(m => m.deposits), 1) * 100))}%;background:#62d4b5"></span><span style="height:${Math.max(4, Math.min(100, item.withdrawals / Math.max(...months.map(m => m.deposits), 1) * 100))}%;background:#ffb86b"></span></div><small>${item.label}</small></div>`).join('')}</div><div class="legend-inline"><span><i style="background:#62d4b5"></i>Deposits</span><span><i style="background:#ffb86b"></i>Withdrawals</span></div>`, 'report-wide')}</div>`;
}

function renderPlanner() {
  return `${pageIntro(button(icon('plus', 15) + ' New plan', 'focus-planner'))}<div class="planner-layout"><section>${state.plans.length ? state.plans.map(plan => `<article class="plan-card ${plan.active ? '' : 'plan-paused'}"><div class="plan-card-top"><div class="plan-icon">${icon('calendar', 20)}</div><span class="status-pill ${plan.active ? 'status-active' : 'status-paused'}">${plan.active ? 'Active reminder' : 'Paused'}</span></div><h2>${escapeHTML(plan.name)}</h2><div class="plan-amount">${money(plan.amountCents)} <small>· ${escapeHTML(plan.cadence)}</small></div><div class="plan-meta"><span>Next planned date</span><strong>${dateOnly(plan.nextDate)}</strong></div><div class="plan-meta"><span>Allocation preset</span><strong>${escapeHTML(state.presets.find(item => item.id === plan.presetId)?.name || 'Custom')}</strong></div><button class="text-button" data-action="toggle-plan" data-id="${plan.id}">${plan.active ? 'Pause reminder' : 'Resume reminder'} ${icon('arrow', 14)}</button></article>`).join('') : emptyState('No plans yet', 'Use a plan to keep your next contribution visible.')}</section><section class="card planner-form-card" id="planner-form-anchor"><div class="eyebrow">Planned only</div><h2>Make the next contribution visible.</h2><p>This creates a reminder and preview. It does not move money from a bank or external wallet.</p><form id="planner-form">${field('Plan name', '<input name="name" type="text" placeholder="e.g. Every payday" required>')}${field('Contribution amount', '<div class="input-prefix"><span>₱</span><input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required></div>')}${field('Cadence', '<select name="cadence"><option>Every payday</option><option>Weekly</option><option>Monthly</option><option>Custom</option></select>')}${field('Next planned date', '<input name="nextDate" type="date" required>')}${field('Allocation preset', `<select name="presetId">${state.presets.map(preset => `<option value="${preset.id}">${escapeHTML(preset.name)}</option>`).join('')}</select>`)}<button type="submit" class="button button-primary button-full">Save reminder ${icon('check', 15)}</button></form></section></div>`;
}

function renderSettings() {
  return `${pageIntro()}<div class="settings-layout"><section class="settings-column">${card('Appearance', `<div class="setting-row"><div><strong>Color mode</strong><span>Choose a calm light or dark ledger.</span></div><button class="switch ${state.settings.theme === 'dark' ? 'on' : ''}" data-action="toggle-theme" aria-label="Toggle color mode"><span></span></button></div><div class="setting-row"><div><strong>Hide balances</strong><span>Useful when reviewing your ledger in public.</span></div><button class="switch ${state.settings.privacy ? 'on' : ''}" data-action="toggle-privacy" aria-label="Toggle balance privacy"><span></span></button></div>`)}${card('Data protection', `<div class="backup-grid"><button class="backup-action" data-action="export-backup">${icon('download', 20)}<strong>Download backup</strong><span>Export every branch, transaction, and plan as JSON.</span></button><button class="backup-action" data-action="import-backup">${icon('upload', 20)}<strong>Restore backup</strong><span>Import a complete Savings Manager JSON file.</span></button></div><div class="last-backup">${icon('check', 15)} <span>${state.settings.lastBackupAt ? `Last backup ${dateTime(state.settings.lastBackupAt)}` : 'No backup downloaded yet'}</span></div><input id="backup-file" type="file" accept="application/json" hidden>`)}${cloudCard()}${card('Reset ledger', `<div class="callout callout-amber">${icon('info', 18)}<div><strong>Start over with an empty ledger</strong><span>This permanently erases every balance, transaction, plan and activity on this device and restores the default empty branches. Download a backup first if you may need your records.</span></div></div><button class="button button-danger-outline" data-action="reset-ledger">Erase all data</button>`)}</section><aside>${card('About this ledger', `<div class="about-list"><div><span>Storage</span><strong>IndexedDB · offline ready</strong></div><div><span>Currency</span><strong>PHP · Philippine peso</strong></div><div><span>Integrity</span><strong>Centavo-based calculations</strong></div><div><span>Scope</span><strong>Personal tracker, not a bank</strong></div></div>`)}${card('Activity log', `<div class="activity-mini">${state.activities.slice(0, 7).map(item => `<div><span class="activity-dot"></span><div><strong>${escapeHTML(item.message)}</strong><small>${dateTime(item.date)}</small></div></div>`).join('')}</div>`)}</aside></div>`;
}

function renderPage() {
  const renderer = { '/': renderDashboard, '/wallet': renderWallet, '/branches': renderBranches, '/deposit': renderDeposit, '/transfer': renderTransfer, '/withdraw': renderWithdraw, '/allocation': renderAllocation, '/goals': renderGoals, '/transactions': renderTransactions, '/reports': renderReports, '/planner': renderPlanner, '/settings': renderSettings }[currentRoute] || renderDashboard;
  document.querySelector('#content').innerHTML = renderer();
  const [eyebrow, title] = titleForRoute(currentRoute); document.querySelector('#page-eyebrow').textContent = eyebrow; document.querySelector('#page-title').textContent = title;
  document.querySelectorAll('[data-route]').forEach(item => item.classList.toggle('active', item.dataset.route === currentRoute));
  document.body.dataset.theme = state.settings.theme || 'light'; document.body.classList.toggle('privacy-mode', !!state.settings.privacy);
  if (currentRoute === '/deposit') updateDepositPreview();
}

function go(route) { currentRoute = route; if (location.hash !== `#${route}`) location.hash = `#${route}`; else renderPage(); document.querySelector('#sidebar').classList.remove('open'); }
function handleHash() { const route = location.hash.replace(/^#/, '') || '/'; currentRoute = routeMeta[route] ? route : '/'; renderPage(); }

function collectDepositAllocations(form) {
  const amountCents = cents(new FormData(form).get('amount')); const mode = new FormData(form).get('mode');
  if (mode === 'wallet') return [];
  const selected = activeBranches().filter(item => form.querySelector(`[data-participate="${item.id}"]`)?.checked);
  if (!selected.length) throw new Error('Select at least one branch.');
  if (mode === 'auto') {
    const percentages = selected.map(item => ({ ...item, percent: Number(form.querySelector(`[data-alloc-percent="${item.id}"]`)?.value || 0) }));
    const totalPercent = sum(percentages, item => item.percent); if (Math.abs(totalPercent - 100) > 0.001) throw new Error(`Selected percentages must add to exactly 100% (currently ${totalPercent}%).`);
    let distributed = 0; const allocations = percentages.map(item => { const exact = Math.floor((amountCents * item.percent) / 100); distributed += exact; return { branchId: item.id, amountCents: exact }; }); allocations[0].amountCents += amountCents - distributed; return allocations;
  }
  return selected.map(item => ({ branchId: item.id, amountCents: cents(form.querySelector(`[data-alloc-amount="${item.id}"]`)?.value || 0) })).filter(item => item.amountCents > 0);
}

// Redraws the branch rows when switching between percentage (auto) and exact-amount (manual) entry.
function syncDepositMode() {
  const form = document.querySelector('#deposit-form'); if (!form) return;
  const mode = form.querySelector('[name="mode"]:checked')?.value || 'auto';
  if (mode === 'wallet') return;
  const rowsMode = form.dataset.rowsMode || 'auto';
  if (rowsMode === mode) return;
  const unchecked = new Set([...form.querySelectorAll('[data-participate]')].filter(box => !box.checked).map(box => box.dataset.participate));
  form.querySelector('.allocation-list').innerHTML = allocationRows(mode);
  form.dataset.rowsMode = mode;
  unchecked.forEach(id => { const box = form.querySelector(`[data-participate="${id}"]`); if (box) box.checked = false; });
  if (mode === 'manual') {
    // Start from the saved split so the amounts only need small edits.
    const amountCents = cents(form.amount?.value); const chosen = activeBranches().filter(item => !unchecked.has(item.id));
    const weight = sum(chosen, item => item.allocationPercent);
    if (amountCents > 0 && chosen.length) {
      let given = 0; const parts = chosen.map(item => { const part = weight > 0 ? Math.floor(amountCents * item.allocationPercent / weight) : Math.floor(amountCents / chosen.length); given += part; return part; });
      parts[0] += amountCents - given;
      chosen.forEach((item, index) => { const input = form.querySelector(`[data-alloc-amount="${item.id}"]`); if (input) input.value = (parts[index] / 100).toFixed(2); });
    }
  }
}

function updateDepositPreview() {
  const form = document.querySelector('#deposit-form'); if (!form) return;
  const amountCents = cents(form.amount?.value); const mode = form.querySelector('[name="mode"]:checked')?.value || 'auto';
  form.querySelector('#distribution-controls').classList.toggle('hidden', mode === 'wallet');
  form.querySelectorAll('.mode-card').forEach(cardEl => cardEl.classList.toggle('selected', cardEl.querySelector('input')?.checked));
  const hint = form.querySelector('#allocation-hint'); if (hint) hint.textContent = mode === 'manual' ? 'Enter exact amounts; the total must equal your deposit.' : 'Percentages should add up to 100%.';
  let allocations = [];
  try { allocations = collectDepositAllocations(form); } catch { allocations = []; }
  const totalAllocated = sum(allocations, item => item.amountCents);
  const preview = form.querySelector('#deposit-preview'); const summary = form.querySelector('#summary-preview');
  if (mode === 'wallet') { summary.innerHTML = `<div class="summary-line"><span>Destination</span><strong>Main Wallet</strong></div><div class="summary-line total"><span>Wallet increases by</span><strong>${money(amountCents)}</strong></div>`; if (preview) preview.innerHTML = ''; return; }
  if (preview) preview.innerHTML = allocations.length ? `<div class="preview-top"><strong>Distribution preview</strong><span>${money(totalAllocated)} of ${money(amountCents)}</span></div><div class="preview-bars">${allocations.map(item => { const target = branch(item.branchId); return `<div><span>${branchDot(target)}${escapeHTML(target?.name || '')}</span><strong>${money(item.amountCents)}</strong></div>`; }).join('')}</div>` : `<span class="preview-placeholder">Add an amount and confirm your selected split.</span>`;
  if (summary) summary.innerHTML = `<div class="summary-line"><span>Deposit total</span><strong>${money(amountCents)}</strong></div><div class="summary-line"><span>Distributed</span><strong class="${totalAllocated === amountCents && amountCents ? 'text-success' : 'text-warning'}">${money(totalAllocated)}</strong></div><div class="summary-line total"><span>Difference</span><strong>${money(amountCents - totalAllocated)}</strong></div>`;
}

function branchModal(item = null) {
  const body = `<div class="modal-form-grid">${field('Branch name', `<input name="name" required value="${escapeHTML(item?.name || '')}" placeholder="e.g. Emergency Fund">`)}${field('Target amount', `<div class="input-prefix"><span>₱</span><input name="target" type="number" min="0" step="0.01" value="${item ? item.targetCents / 100 : ''}" placeholder="50000"></div>`)}${field('Description', `<textarea name="description" rows="3" placeholder="What is this money for?">${escapeHTML(item?.description || '')}</textarea>`)}${field('Default allocation', `<div class="input-suffix"><input name="allocationPercent" type="number" min="0" max="100" step="0.01" value="${item?.allocationPercent || 0}"><span>%</span></div>`)}${field('Branch color', `<input name="color" type="color" value="${item?.color || '#91a9ff'}" class="color-input">`)}${field('Icon', `<select name="icon"><option value="spark">Spark</option><option value="shield" ${item?.icon === 'shield' ? 'selected' : ''}>Shield</option><option value="heart" ${item?.icon === 'heart' ? 'selected' : ''}>Heart</option><option value="plane" ${item?.icon === 'plane' ? 'selected' : ''}>Travel</option><option value="home" ${item?.icon === 'home' ? 'selected' : ''}>Home</option></select>`)}</div>`;
  openModal({ title: item ? 'Edit branch account' : 'Create a branch account', eyebrow: item ? 'Branch details' : 'New destination', body, submitLabel: item ? 'Save changes' : 'Create branch', formId: 'branch-form' });
  document.querySelector('#branch-form').dataset.id = item?.id || '';
}

function goalModal(item) {
  const body = `${field('Branch', `<select name="branchId" required>${activeBranches().map(branchItem => `<option value="${branchItem.id}" ${branchItem.id === item?.id ? 'selected' : ''}>${escapeHTML(branchItem.name)}</option>`).join('')}</select>`)}${field('Target amount', `<div class="input-prefix"><span>₱</span><input name="target" type="number" min="0" step="0.01" value="${item ? item.targetCents / 100 : ''}" placeholder="50000" required></div>`)}${field('Contribution cadence', `<select name="cadence"><option>Monthly</option><option>Every payday</option><option>Weekly</option><option>Custom</option></select>`)}`;
  openModal({ title: item ? 'Update savings goal' : 'Add savings goal', eyebrow: 'Progress target', body, submitLabel: 'Save goal', formId: 'goal-form' });
}

function transactionModal(tx) {
  if (!tx) return;
  const reversible = tx.type === 'deposit' && tx.destination === 'Main Wallet';
  openModal({ title: typeLabel(tx.type), eyebrow: tx.reference, body: `<div class="detail-amount ${tx.type === 'withdrawal' ? 'amount-negative' : 'amount-positive'}">${tx.type === 'withdrawal' ? '−' : '+'}${money(tx.amountCents)}</div><div class="detail-grid"><div><span>Date and time</span><strong>${dateTime(tx.date)}</strong></div><div><span>Status</span><strong><span class="status-pill status-completed">${escapeHTML(tx.status)}</span></strong></div><div><span>From</span><strong>${escapeHTML(tx.source)}</strong></div><div><span>To</span><strong>${escapeHTML(tx.destination)}</strong></div><div><span>Previous balance</span><strong>${money(tx.previousBalance)}</strong></div><div><span>New balance</span><strong>${money(tx.newBalance)}</strong></div></div><div class="detail-note">${icon('info', 16)}<span>${escapeHTML(tx.description || 'No description added.')}</span></div>${reversible ? `<button class="button button-danger-outline button-full" data-action="reverse-transaction" data-id="${tx.id}">${icon('refresh', 15)} Reverse this wallet deposit</button>` : ''}` });
}

function validateBackupState(candidate) {
  if (!candidate || candidate.version !== 1 || !candidate.wallet || !Array.isArray(candidate.branches) || !Array.isArray(candidate.transactions) || !Array.isArray(candidate.activities) || !Array.isArray(candidate.presets) || !Array.isArray(candidate.plans) || !candidate.settings) throw new Error('This file is not a complete Savings Manager backup.');
  if (!Number.isInteger(candidate.wallet.balanceCents) || candidate.wallet.balanceCents < 0) throw new Error('The backup wallet balance is invalid.');
  const safeColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
  candidate.branches.forEach(item => { if (!item.id || !item.name || !['active', 'archived'].includes(item.status) || !Number.isInteger(item.balanceCents) || item.balanceCents < 0 || !Number.isInteger(item.targetCents) || item.targetCents < 0 || !safeColor(item.color)) throw new Error('The backup contains an invalid branch record.'); });
  candidate.transactions.forEach(item => { if (!item.id || !item.reference || !item.type || !Number.isInteger(item.amountCents) || item.amountCents <= 0 || !item.date) throw new Error('The backup contains an invalid transaction record.'); });
  if (!['light', 'dark'].includes(candidate.settings.theme) || typeof candidate.settings.privacy !== 'boolean') throw new Error('The backup settings are invalid.');
  return true;
}

async function handleAction(action, target) {
  try {
    if (action === 'close-modal') { const resolve = pendingConfirm; pendingConfirm = null; const choice = pendingChoice; pendingChoice = null; closeModal(); resolve?.(false); choice?.(null); return; }
    if (action === 'choice-local' || action === 'choice-remote' || action === 'choice-later') { const choice = pendingChoice; pendingChoice = null; closeModal(); choice?.(action === 'choice-local' ? 'local' : action === 'choice-remote' ? 'remote' : null); return; }
    if (action === 'sync-now') {
      if (!Sync.isSignedIn()) { toast('Sign in to cloud sync in Settings first.', 'info'); return go('/settings'); }
      if (!navigator.onLine) return toast('You are offline. Your data is saved on this device and will sync later.', 'info');
      const result = await Sync.syncNow({ manual: true });
      if (result.error) toast(result.error, 'error'); else if (result.pushed) toast('Synced to cloud.'); else if (result.pulled) { /* refreshAfterRemote already toasted */ } else if (result.upToDate) toast('Already up to date.', 'info');
      return;
    }
    if (action === 'cloud-signup') { const form = document.querySelector('#cloud-form'); if (!form.reportValidity()) return; const outcome = await Sync.signUp(Object.fromEntries(new FormData(form))); renderPage(); toast(outcome.signedIn ? 'Account created. Syncing…' : 'Account created. Check your email to confirm it, then sign in.', outcome.signedIn ? 'success' : 'info'); return; }
    if (action === 'cloud-signout') { if (!window.confirm('Sign out of cloud sync? Your data stays on this device.')) return; Sync.signOut(); renderPage(); toast('Signed out. Your ledger stays on this device.', 'info'); return; }
    if (action === 'toggle-autosync') { Sync.setAutoSync(!Sync.getStatus().autoSync); renderPage(); return; }
    if (action === 'accept-confirm' || action === 'reject-confirm') { const resolve = pendingConfirm; pendingConfirm = null; closeModal(); resolve?.(action === 'accept-confirm'); return; }
    if (action === 'toggle-sidebar') return document.querySelector('#sidebar').classList.toggle('open');
    if (action === 'toggle-theme') { await Finance.updateSettings({ theme: state.settings.theme === 'dark' ? 'light' : 'dark' }); state = Finance.getState(); renderPage(); return; }
    if (action === 'toggle-privacy') { await Finance.updateSettings({ privacy: !state.settings.privacy }); state = Finance.getState(); renderPage(); return; }
    if (action === 'go-deposit') return go('/deposit');
    if (action === 'go-transfer') return go('/transfer');
    if (action === 'go-withdraw') return go('/withdraw');
    if (action === 'go-branches') return go('/branches');
    if (action === 'go-transactions') return go('/transactions');
    if (action === 'go-allocation') return go('/allocation');
    if (action === 'view-branch') { txFilter = { ...txFilter, branch: target.dataset.id, search: '', type: 'all', start: '', end: '' }; return go('/transactions'); }
    if (action === 'focus-planner') { go('/planner'); setTimeout(() => document.querySelector('#planner-form-anchor')?.scrollIntoView({ behavior: 'smooth' }), 40); return; }
    if (action === 'open-profile') return toast('Local ledger profile · no login required', 'info');
    if (action === 'open-branch') return branchModal();
    if (action === 'edit-branch') return branchModal(branch(target.dataset.id));
    if (action === 'archive-branch' || action === 'reactivate-branch') { if (action === 'archive-branch' && !window.confirm('Archive this branch? Its balance and history will remain preserved.')) return; await Finance.toggleBranch(target.dataset.id, action === 'archive-branch'); state = Finance.getState(); renderPage(); toast(action === 'archive-branch' ? 'Branch archived; history preserved.' : 'Branch reactivated.'); return; }
    if (action === 'open-goal' || action === 'edit-goal') return goalModal(action === 'edit-goal' ? branch(target.dataset.id) : activeBranches()[0]);
    if (action === 'use-preset') { await Finance.usePreset(target.dataset.id); state = Finance.getState(); renderPage(); toast('Allocation preset applied.'); return; }
    if (action === 'toggle-plan') { await Finance.togglePlan(target.dataset.id); state = Finance.getState(); renderPage(); toast('Planner updated.'); return; }
    if (action === 'view-transaction') return transactionModal(state.transactions.find(tx => tx.id === target.dataset.id));
    if (action === 'reverse-transaction') { if (!window.confirm('Reverse this wallet deposit? The original transaction will stay in the ledger.')) return; await Finance.reverseTransaction(target.dataset.id); state = Finance.getState(); closeModal(); renderPage(); toast('Deposit reversed with a new audit record.'); return; }
    if (action === 'export-csv') { const rows = [['Transaction ID', 'Reference', 'Type', 'Source', 'Destination', 'Amount PHP', 'Date', 'Description', 'Status'], ...state.transactions.map(tx => [tx.id, tx.reference, typeLabel(tx.type), tx.source, tx.destination, (tx.amountCents / 100).toFixed(2), tx.date, tx.description, tx.status])]; download('savings-transactions.csv', toCSV(rows), 'text/csv'); toast('Transaction CSV downloaded.'); return; }
    if (action === 'export-backup') { const backup = JSON.stringify({ exportedAt: new Date().toISOString(), app: 'Personal Savings Manager', version: 1, state }, null, 2); download('savings-manager-backup.json', backup, 'application/json'); await Finance.updateSettings({ lastBackupAt: new Date().toISOString() }); state = Finance.getState(); renderPage(); toast('Complete ledger backup downloaded.'); return; }
    if (action === 'import-backup') return document.querySelector('#backup-file')?.click();
    if (action === 'reset-ledger') { if (!window.confirm(Sync.isSignedIn() ? 'Erase ALL data and start with an empty ledger? Cloud sync is on, so the cloud copy will be replaced with the empty ledger on the next sync. This cannot be undone.' : 'Erase ALL data on this device and start with an empty ledger? This cannot be undone.')) return; state = await Finance.resetLedger(); renderPage(); toast('Ledger reset.'); return; }
    if (action === 'save-allocation-preset') { const name = window.prompt('Name this allocation preset'); if (!name) return; const allocations = activeBranches().map(item => ({ branchId: item.id, percent: item.allocationPercent })); await Finance.saveAllocationSettings({ allocations, presetName: name }); state = Finance.getState(); renderPage(); toast('Allocation preset saved.'); return; }
  } catch (error) { toast(error.message || 'Something went wrong.', 'error'); }
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (target) { event.preventDefault(); handleAction(target.dataset.action, target); return; }
  if (event.target.matches?.('[data-backdrop-close]')) handleAction('close-modal', event.target);
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.querySelector('#modal-root')?.children.length) handleAction('close-modal', document.body); });

document.addEventListener('change', async event => {
  const target = event.target;
  if (target.matches('[name="mode"]')) { syncDepositMode(); updateDepositPreview(); }
  if (target.matches('[data-participate], [data-alloc-percent], [data-alloc-amount]')) updateDepositPreview();
  if (target.id === 'tx-type' || target.id === 'tx-branch' || target.id === 'tx-sort' || target.id === 'tx-start' || target.id === 'tx-end') { txFilter = { ...txFilter, type: document.querySelector('#tx-type').value, branch: document.querySelector('#tx-branch').value, sort: document.querySelector('#tx-sort').value, start: document.querySelector('#tx-start').value, end: document.querySelector('#tx-end').value }; renderPage(); }
  if (target.id === 'backup-file' && target.files?.[0]) { try { const imported = JSON.parse(await target.files[0].text()); validateBackupState(imported.state); if (!window.confirm(Sync.isSignedIn() ? 'Restore this backup and replace the current ledger? Cloud sync is on, so this will replace the cloud copy on the next sync.' : 'Restore this backup and replace the current local ledger?')) return; await saveState(imported.state); state = await Finance.init(); Sync.notifyChanged(); renderPage(); toast('Backup restored.'); } catch (error) { toast(error.message || 'Could not restore this backup.', 'error'); } }
  if (target.matches('select[name="sourceId"]')) { const item = branch(target.value); document.querySelector('#transfer-available')?.replaceChildren(document.createTextNode(`Available ${money(item?.balanceCents || 0)}`)); document.querySelector('#transfer-source-name')?.replaceChildren(document.createTextNode(item?.name || '—')); }
  if (target.matches('select[name="destinationId"]')) { const item = branch(target.value); document.querySelector('#transfer-destination-name')?.replaceChildren(document.createTextNode(item?.name || '—')); }
  if (target.matches('select[name="accountId"]')) { const item = target.value === 'wallet' ? state.wallet : branch(target.value); document.querySelector('#withdraw-balance')?.replaceChildren(icon('wallet', 18), Object.assign(document.createElement('span'), { innerHTML: `Available balance: <strong>${money(item?.balanceCents || 0)}</strong>` })); }
});

document.addEventListener('input', event => { if (event.target.matches('#deposit-form input')) updateDepositPreview(); if (event.target.id === 'tx-search' || event.target.id === 'tx-start' || event.target.id === 'tx-end') { txFilter = { ...txFilter, search: document.querySelector('#tx-search')?.value || '', start: document.querySelector('#tx-start')?.value || '', end: document.querySelector('#tx-end')?.value || '' }; renderPage(); const search = document.querySelector('#tx-search'); if (event.target.id === 'tx-search') { search?.focus(); search?.setSelectionRange(search.value.length, search.value.length); } } });

document.addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target;
  try {
    if (form.id === 'cloud-form') { await Sync.signIn(Object.fromEntries(new FormData(form))); renderPage(); toast('Signed in. Syncing…'); return; }
    if (form.id === 'deposit-form') { const data = new FormData(form); const mode = data.get('mode'); const allocations = collectDepositAllocations(form); const amountCents = cents(data.get('amount')); if (mode !== 'wallet') { const allocated = sum(allocations, item => item.amountCents); if (allocated !== amountCents) throw new Error(`Your split adds up to ${money(allocated)} but the deposit is ${money(amountCents)}. ${allocated < amountCents ? `${money(amountCents - allocated)} still to place.` : `${money(allocated - amountCents)} too much.`}`); } const destination = mode === 'wallet' ? 'Main Wallet' : allocations.map(item => branch(item.branchId)?.name).join(', '); const confirmed = await confirmAction('Confirm this deposit', `<div class="summary-line"><span>Amount</span><strong>${money(amountCents)}</strong></div><div class="summary-line"><span>Destination</span><strong>${escapeHTML(destination)}</strong></div><div class="summary-line total"><span>Mode</span><strong>${mode === 'auto' ? 'Automatic distribution' : mode === 'manual' ? 'Manual allocation' : 'Keep in wallet'}</strong></div>`); if (!confirmed) return; const result = await Finance.recordDeposit({ amount: data.get('amount'), mode, note: data.get('note'), date: data.get('date'), allocations }); state = Finance.getState(); toast(`Deposit recorded · ${result.reference}`); go('/transactions'); return; }
    if (form.id === 'transfer-form') { const data = new FormData(form); const amountCents = cents(data.get('amount')); const confirmed = await confirmAction('Confirm this transfer', `<div class="summary-line"><span>From</span><strong>${escapeHTML(branch(data.get('sourceId'))?.name || '—')}</strong></div><div class="summary-line"><span>To</span><strong>${escapeHTML(branch(data.get('destinationId'))?.name || '—')}</strong></div><div class="summary-line total"><span>Amount · overall savings</span><strong>${money(amountCents)} · unchanged</strong></div>`); if (!confirmed) return; const result = await Finance.recordTransfer(Object.fromEntries(data)); state = Finance.getState(); toast(`Transfer complete · ${result.reference}`); go('/transactions'); return; }
    if (form.id === 'withdraw-form') { const data = new FormData(form); const account = data.get('accountId') === 'wallet' ? state.wallet : branch(data.get('accountId')); const amountCents = cents(data.get('amount')); const confirmed = await confirmAction('Confirm this withdrawal', `<div class="summary-line"><span>From</span><strong>${escapeHTML(account?.name || '—')}</strong></div><div class="summary-line"><span>Available before</span><strong>${money(account?.balanceCents || 0)}</strong></div><div class="summary-line total"><span>Withdrawal</span><strong class="amount-negative">−${money(amountCents)}</strong></div>`); if (!confirmed) return; const result = await Finance.recordWithdrawal(Object.fromEntries(data)); state = Finance.getState(); toast(`Withdrawal recorded · ${result.reference}`); go('/transactions'); return; }
    if (form.id === 'branch-form') { const data = Object.fromEntries(new FormData(form)); await Finance.saveBranch({ ...data, id: form.dataset.id }); state = Finance.getState(); closeModal(); renderPage(); toast(form.dataset.id ? 'Branch updated.' : 'Branch created.'); return; }
    if (form.id === 'goal-form') { await Finance.saveGoal(Object.fromEntries(new FormData(form))); state = Finance.getState(); closeModal(); renderPage(); toast('Savings goal updated.'); return; }
    if (form.id === 'allocation-settings-form') { const allocations = [...form.querySelectorAll('[data-alloc-setting]')].map(input => ({ branchId: input.dataset.allocSetting, percent: Number(input.value) })); await Finance.saveAllocationSettings({ allocations }); state = Finance.getState(); renderPage(); toast('Allocation settings saved.'); return; }
    if (form.id === 'planner-form') { await Finance.savePlan(Object.fromEntries(new FormData(form))); state = Finance.getState(); renderPage(); toast('Savings reminder added.'); return; }
  } catch (error) { toast(error.message || 'Please review this form.', 'error'); }
});

// Supabase sends people back here after they click the confirmation email, with the result in the URL hash
// (#access_token=...&type=signup on success, #error=...&error_description=... on failure).
// Read it, tell the person what happened, and clean the address so the router is not confused.
function handleAuthRedirect() {
  const raw = location.hash.replace(/^#/, '');
  if (!raw || raw.startsWith('/') || !raw.includes('=')) return;
  const params = new URLSearchParams(raw);
  const failure = params.get('error_description') || params.get('error');
  const success = params.get('type') === 'signup' || params.get('type') === 'email_change' || params.has('access_token');
  if (!failure && !success) return;
  history.replaceState(null, '', `${location.pathname}${location.search}#/settings`);
  setTimeout(() => {
    if (failure) toast(`${failure.replace(/\+/g, ' ')}. Request a new confirmation email by creating the account again, or check Supabase -> Authentication -> Users.`, 'error');
    else toast('Email confirmed. You can sign in now.', 'success');
  }, 400);
}

async function init() { handleAuthRedirect(); state = await Finance.init(); Sync.subscribe(paintSync); Finance.onChange(Sync.notifyChanged); Sync.init({ getState: Finance.getState, applyRemote: Finance.applyRemote, validate: validateBackupState, onRemoteApplied: refreshAfterRemote, askConflict }); document.querySelectorAll('[data-icon]').forEach(item => item.innerHTML = icon(item.dataset.icon)); handleHash(); paintSync(Sync.getStatus()); const appPlugin = window.Capacitor?.Plugins?.App; appPlugin?.addListener?.('backButton', async ({ canGoBack }) => { if (location.hash && location.hash !== '#/') history.back(); else if (!canGoBack) await appPlugin.exitApp?.(); }); }
window.addEventListener('hashchange', handleHash);
init();
