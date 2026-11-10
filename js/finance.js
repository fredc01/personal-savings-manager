import { loadState, saveState, clearState } from './db.js';
import { uid, ref, cents, monthKey, dateTime, sum } from './utils.js';

let state;
let busy = false;

const now = () => new Date().toISOString();

function branch(id, name, description, color, iconName, balance, target, allocationPercent) {
  return { id, name, description, color, icon: iconName, balanceCents: balance, targetCents: target, allocationPercent, status: 'active', createdAt: now() };
}

function transaction(type, amountCents, source, destination, description, previousBalance, newBalance, extra = {}) {
  return { id: uid('txn'), reference: ref(type === 'transfer' ? 'TRF' : type.slice(0, 3).toUpperCase()), type, amountCents, source, destination, description, previousBalance, newBalance, date: now(), status: 'completed', ...extra };
}

export function seedState() {
  const branches = [
    branch('emergency', 'Emergency Fund', 'A calm buffer for unexpected turns.', '#62d4b5', 'shield', 0, 0, 35),
    branch('baby', 'Baby Savings', 'A gentle head start for the next chapter.', '#91a9ff', 'heart', 0, 0, 20),
    branch('travel', 'Travel Fund', 'Room for a change of scenery.', '#ffb86b', 'plane', 0, 0, 15),
    branch('house', 'House Savings', 'Long-term progress, one deposit at a time.', '#d49cff', 'home', 0, 0, 20),
    branch('personal', 'Personal Savings', 'Flexible savings for near-term choices.', '#f58aa6', 'spark', 0, 0, 10)
  ];
  return {
    version: 1,
    wallet: { id: 'wallet', name: 'Main Wallet', balanceCents: 0 },
    branches,
    transactions: [],
    activities: [
      { id: uid('act'), type: 'system', message: 'Ledger created', date: now() }
    ],
    presets: [
      { id: 'balanced', name: 'Balanced Savings', description: 'A steady split across every active branch.', allocations: { emergency: 35, baby: 20, travel: 15, house: 20, personal: 10 } },
      { id: 'emergency-priority', name: 'Emergency Priority', description: 'Build the safety net faster.', allocations: { emergency: 55, baby: 15, travel: 10, house: 10, personal: 10 } },
      { id: 'travel', name: 'Travel Savings', description: 'A little more room for the next trip.', allocations: { emergency: 25, baby: 10, travel: 35, house: 20, personal: 10 } }
    ],
    plans: [],
    settings: { theme: 'light', privacy: false, lastBackupAt: null, selectedPresetId: 'balanced' }
  };
}

function addActivity(message, type = 'system') { state.activities.unshift({ id: uid('act'), type, message, date: now() }); state.activities = state.activities.slice(0, 80); }
function addTransaction(tx) { state.transactions.unshift(tx); state.transactions = state.transactions.slice(0, 500); }
function activeBranches() { return state.branches.filter(item => item.status === 'active'); }
function persist() { return saveState(state); }
function assertAmount(amountCents) { if (!Number.isInteger(amountCents) || amountCents <= 0) throw new Error('Enter an amount greater than zero.'); }
async function commit(mutator) {
  if (busy) throw new Error('Another ledger update is being processed.');
  busy = true;
  try { const result = await mutator(); await persist(); return result; } finally { busy = false; }
}

// Older builds saved a seeded sample ledger; discard it so only real records remain.
function isLegacySample(saved) { return !!saved && (saved.demoData === true || (Array.isArray(saved.transactions) && saved.transactions.some(tx => tx && tx.demo === true))); }
export async function init() { state = await loadState(); if (!state || !state.version || isLegacySample(state)) { state = seedState(); await clearState(); await persist(); } delete state.demoData; return state; }
export function getState() { return state; }
export async function resetLedger() { state = seedState(); await clearState(); await persist(); return state; }
export function findBranch(id) { return state.branches.find(item => item.id === id); }
export function accountName(id) { if (id === 'wallet' || id === 'Main Wallet') return 'Main Wallet'; if (id === 'external' || id === 'External') return 'External'; return findBranch(id)?.name || id || '—'; }

export function summary() {
  const totalSavings = state.wallet.balanceCents + sum(state.branches, b => b.balanceCents);
  const deposits = sum(state.transactions.filter(tx => tx.type === 'deposit'), tx => tx.amountCents);
  const withdrawals = sum(state.transactions.filter(tx => tx.type === 'withdrawal'), tx => tx.amountCents);
  const transfers = state.transactions.filter(tx => tx.type === 'transfer').length;
  const month = monthKey();
  const monthlyDeposits = sum(state.transactions.filter(tx => tx.type === 'deposit' && monthKey(tx.date) === month), tx => tx.amountCents);
  const monthlyWithdrawals = sum(state.transactions.filter(tx => tx.type === 'withdrawal' && monthKey(tx.date) === month), tx => tx.amountCents);
  return { totalSavings, deposits, withdrawals, transfers, branchCount: state.branches.length, activeBranchCount: activeBranches().length, monthlyDeposits, monthlyWithdrawals, monthlyNet: monthlyDeposits - monthlyWithdrawals };
}

export async function recordDeposit({ amount, mode, note, allocations = [], date = now() }) {
  const amountCents = cents(amount); assertAmount(amountCents);
  return commit(async () => {
    const dateValue = new Date(date).toISOString();
    if (mode === 'wallet') {
      const previous = state.wallet.balanceCents;
      state.wallet.balanceCents += amountCents;
      addTransaction({ ...transaction('deposit', amountCents, 'External', 'Main Wallet', note || 'Manual wallet deposit', previous, state.wallet.balanceCents), date: dateValue });
      addActivity(`Deposited ${amountCents / 100} into Main Wallet`, 'deposit');
      return { reference: state.transactions[0].reference };
    }
    if (!allocations.length) throw new Error('Select at least one branch for this distribution.');
    const total = sum(allocations, item => item.amountCents);
    if (total !== amountCents) throw new Error('Your allocation must equal the full deposit amount.');
    allocations.forEach(item => {
      const target = findBranch(item.branchId);
      if (!target || target.status !== 'active') throw new Error('One selected branch is no longer active.');
      if (!Number.isInteger(item.amountCents) || item.amountCents <= 0) throw new Error('Every selected branch must receive a positive amount.');
    });
    const depositRef = ref('DEP');
    addTransaction({ ...transaction('deposit', amountCents, 'External', 'Savings branches', note || 'Deposit for distribution', 0, amountCents, { allocationReference: depositRef }), reference: depositRef, date: dateValue });
    allocations.forEach(item => {
      const target = findBranch(item.branchId);
      const previous = target.balanceCents; target.balanceCents += item.amountCents;
      addTransaction({ ...transaction('automatic_distribution', item.amountCents, 'External deposit', target.name, note || 'Automatic distribution', previous, target.balanceCents, { allocationReference: depositRef }), date: dateValue });
    });
    addActivity(`Distributed ${amountCents / 100} across ${allocations.length} branches`, 'deposit');
    return { reference: depositRef };
  });
}

export async function recordTransfer({ sourceId, destinationId, amount, note }) {
  const amountCents = cents(amount); assertAmount(amountCents);
  if (!sourceId || !destinationId || sourceId === destinationId) throw new Error('Choose two different branch accounts.');
  return commit(async () => {
    const source = findBranch(sourceId); const destination = findBranch(destinationId);
    if (!source || !destination || source.status !== 'active' || destination.status !== 'active') throw new Error('Both branch accounts must be active.');
    if (source.balanceCents < amountCents) throw new Error('The source branch does not have enough available balance.');
    const transferReference = ref('TRF');
    const previousSource = source.balanceCents; const previousDestination = destination.balanceCents;
    source.balanceCents -= amountCents; destination.balanceCents += amountCents;
    addTransaction(transaction('transfer', amountCents, source.name, destination.name, note || 'Branch-to-branch transfer', previousSource, source.balanceCents, { transferReference, pairedAccountBalance: { account: destination.name, previous: previousDestination, next: destination.balanceCents } }));
    addActivity(`Transferred ${amountCents / 100} from ${source.name} to ${destination.name}`, 'transfer');
    return { reference: transferReference };
  });
}

export async function recordWithdrawal({ accountId, amount, note, date }) {
  const amountCents = cents(amount); assertAmount(amountCents);
  return commit(async () => {
    const account = accountId === 'wallet' ? state.wallet : findBranch(accountId);
    if (!account) throw new Error('Choose an account.');
    if (account.balanceCents < amountCents) throw new Error('The selected account does not have enough available balance.');
    const previous = account.balanceCents; account.balanceCents -= amountCents;
    const withdrawal = transaction('withdrawal', amountCents, account.name, 'External', note || 'Manual withdrawal', previous, account.balanceCents);
    withdrawal.date = date ? new Date(date).toISOString() : now();
    addTransaction(withdrawal);
    addActivity(`Withdrew ${amountCents / 100} from ${account.name}`, 'withdrawal');
    return { reference: state.transactions[0].reference };
  });
}

export async function saveBranch(payload) {
  return commit(async () => {
    const allocationPercent = Number(payload.allocationPercent || 0);
    if (!payload.name?.trim()) throw new Error('Give the branch a name.');
    if (allocationPercent < 0 || allocationPercent > 100) throw new Error('Allocation must be between 0% and 100%.');
    if (payload.id) {
      const current = findBranch(payload.id); if (!current) throw new Error('Branch not found.');
      Object.assign(current, { name: payload.name.trim(), description: payload.description?.trim() || '', color: payload.color, icon: payload.icon, targetCents: cents(payload.target), allocationPercent });
      addActivity(`Updated ${current.name}`, 'branch');
    } else {
      const newBranch = branch(uid('branch'), payload.name.trim(), payload.description?.trim() || '', payload.color || '#91a9ff', payload.icon || 'spark', 0, cents(payload.target), allocationPercent);
      state.branches.push(newBranch); addActivity(`Created ${newBranch.name}`, 'branch');
    }
  });
}

export async function toggleBranch(id, archived) {
  return commit(async () => { const item = findBranch(id); if (!item) throw new Error('Branch not found.'); item.status = archived ? 'archived' : 'active'; addActivity(`${archived ? 'Archived' : 'Reactivated'} ${item.name}`, 'branch'); });
}

export async function saveGoal({ branchId, target, cadence }) {
  return commit(async () => { const branch = findBranch(branchId); if (!branch) throw new Error('Choose a branch.'); branch.targetCents = cents(target); branch.goalCadence = cadence || 'Monthly'; addActivity(`Updated goal for ${branch.name}`, 'goal'); });
}

export async function saveAllocationSettings({ allocations, presetName }) {
  return commit(async () => {
    const total = sum(allocations, item => Number(item.percent)); if (total !== 100) throw new Error('Active allocation percentages must add up to exactly 100%.');
    allocations.forEach(item => { const branch = findBranch(item.branchId); if (branch) branch.allocationPercent = Number(item.percent); });
    state.settings.selectedPresetId = 'custom';
    if (presetName?.trim()) state.presets.push({ id: uid('preset'), name: presetName.trim(), description: 'Saved from Allocation Settings.', allocations: Object.fromEntries(allocations.map(item => [item.branchId, Number(item.percent)])) });
    addActivity('Updated automatic allocation settings', 'settings');
  });
}

export async function usePreset(presetId) {
  return commit(async () => { const preset = state.presets.find(item => item.id === presetId); if (!preset) throw new Error('Preset not found.'); Object.entries(preset.allocations).forEach(([id, value]) => { const branch = findBranch(id); if (branch) branch.allocationPercent = value; }); state.settings.selectedPresetId = presetId; addActivity(`Applied ${preset.name} allocation preset`, 'settings'); });
}

export async function savePlan({ name, amount, cadence, nextDate, presetId }) {
  return commit(async () => { const amountCents = cents(amount); assertAmount(amountCents); state.plans.push({ id: uid('plan'), name: name.trim() || 'Savings contribution', amountCents, cadence, nextDate: new Date(nextDate).toISOString(), presetId, active: true }); addActivity(`Created recurring plan: ${name || 'Savings contribution'}`, 'planner'); });
}

export async function togglePlan(id) { return commit(async () => { const plan = state.plans.find(item => item.id === id); if (plan) plan.active = !plan.active; }); }
export async function updateSettings(patch) { return commit(async () => { Object.assign(state.settings, patch); }); }

export async function reverseTransaction(transactionId) {
  return commit(async () => {
    const original = state.transactions.find(item => item.id === transactionId);
    if (!original || original.type !== 'deposit' || original.destination !== 'Main Wallet') throw new Error('Only a wallet deposit can be reversed here. Distributed deposits should be corrected with a balancing withdrawal.');
    if (state.transactions.some(item => item.type === 'deposit_reversal' && item.reverses === original.id)) throw new Error('This wallet deposit has already been reversed.');
    if (state.wallet.balanceCents < original.amountCents) throw new Error('The wallet no longer has enough balance for this reversal.');
    const previous = state.wallet.balanceCents; state.wallet.balanceCents -= original.amountCents;
    original.status = 'reversed';
    addTransaction(transaction('deposit_reversal', original.amountCents, 'Main Wallet', 'External', `Reversal of ${original.reference}`, previous, state.wallet.balanceCents, { reverses: original.id }));
    addActivity(`Reversed deposit ${original.reference}`, 'reversal');
  });
}
