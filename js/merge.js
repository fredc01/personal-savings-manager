// Three-way merge of two versions of the ledger that both changed since their last common copy ("base").
//  - Balances are merged as amounts, not overwritten:  merged = cloud + (this device now - this device at last sync)
//    so a 500 deposit on one device and a 1,000 deposit on another become 1,500.
//  - Transactions and activity entries are combined by id, so nothing is lost or duplicated.
//  - Branches, presets and plans are merged by id, field by field. If both devices edited the same field, this device wins.
//  - Anything deleted on one side (and untouched on the other) stays deleted.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function mergeRecord(base, local, remote, skip = []) {
  const out = { ...remote };
  new Set([...Object.keys(local), ...Object.keys(remote)]).forEach(key => {
    if (skip.includes(key) || same(local[key], base?.[key])) return;
    if (local[key] === undefined) delete out[key]; else out[key] = local[key];
  });
  return out;
}

function mergeById(base, local, remote, mergeFn) {
  const index = list => new Map((list || []).map(item => [item.id, item]));
  const B = index(base); const L = index(local); const R = index(remote);
  const out = [];
  new Set([...R.keys(), ...L.keys()]).forEach(id => {
    if (L.has(id) && R.has(id)) out.push(mergeFn(B.get(id) || null, L.get(id), R.get(id)));
    else if (L.has(id)) { if (!B.has(id)) out.push(L.get(id)); }      // added here (if it was in base, the cloud deleted it)
    else if (!B.has(id)) out.push(R.get(id));                         // added in the cloud (if it was in base, it was deleted here)
  });
  return out;
}

const byDateDesc = (a, b) => String(b.date).localeCompare(String(a.date));

export function mergeLedgers(base, local, remote) {
  const balance = (b, l, r) => (r?.balanceCents || 0) + ((l?.balanceCents || 0) - (b?.balanceCents || 0));
  const branches = mergeById(base.branches, local.branches, remote.branches, (b, l, r) => ({ ...mergeRecord(b, l, r, ['balanceCents']), balanceCents: balance(b, l, r) }));
  return {
    version: 1,
    wallet: { ...remote.wallet, balanceCents: balance(base.wallet, local.wallet, remote.wallet) },
    branches,
    transactions: mergeById(base.transactions, local.transactions, remote.transactions, (b, l, r) => mergeRecord(b, l, r)).sort(byDateDesc).slice(0, 500),
    activities: mergeById(base.activities, local.activities, remote.activities, (b, l, r) => mergeRecord(b, l, r)).sort(byDateDesc).slice(0, 80),
    presets: mergeById(base.presets, local.presets, remote.presets, (b, l, r) => mergeRecord(b, l, r)),
    plans: mergeById(base.plans, local.plans, remote.plans, (b, l, r) => mergeRecord(b, l, r))
  };
}

// ---------- Combining when there is no saved base ----------
// Used when the person asks for "Combine both" and this device has no record of its last sync.
// The cloud copy is the starting point; the transactions that exist only on this device are added to it
// and their effect on each balance is applied. Throws if the effect of a transaction cannot be worked out.
const WALLET = 'Main Wallet';
function effectsOf(tx) {
  const a = tx.amountCents;
  switch (tx.type) {
    case 'deposit': return tx.destination === WALLET ? [[WALLET, a]] : []; // a distributed deposit is carried by its distribution legs
    case 'automatic_distribution': return [[tx.destination, a]];
    case 'transfer': return [[tx.source, -a], [tx.destination, a]];
    case 'withdrawal': return [[tx.source, -a]];
    case 'deposit_reversal': return [[WALLET, -a]];
    default: throw new Error(`unknown transaction type "${tx.type}"`);
  }
}
const unionById = (first, second) => { const seen = new Set(first.map(item => item.id)); return [...first, ...second.filter(item => !seen.has(item.id))]; };

export function combineByTransactions(local, remote) {
  const remoteIds = new Set(remote.transactions.map(tx => tx.id));
  const remoteReversed = new Set(remote.transactions.filter(tx => tx.type === 'deposit_reversal').map(tx => tx.reverses));
  // A deposit reversed on both devices must only be taken off once.
  const localOnly = local.transactions.filter(tx => !remoteIds.has(tx.id) && !(tx.type === 'deposit_reversal' && remoteReversed.has(tx.reverses)));
  const localById = new Map(local.transactions.map(tx => [tx.id, tx]));

  const branches = remote.branches.map(item => ({ ...item }));
  const known = new Set(branches.map(item => item.id));
  local.branches.filter(item => !known.has(item.id)).forEach(item => branches.push({ ...item, balanceCents: 0 }));
  const wallet = { ...remote.wallet };
  const accountNamed = name => { const found = branches.filter(item => item.name === name); if (found.length !== 1) throw new Error(`cannot find the account "${name}" on both devices`); return found[0]; };
  localOnly.forEach(tx => effectsOf(tx).forEach(([name, delta]) => { if (name === WALLET) wallet.balanceCents += delta; else accountNamed(name).balanceCents += delta; }));

  const remoteTransactions = remote.transactions.map(tx => { const mine = localById.get(tx.id); return mine && mine.status !== 'completed' && tx.status === 'completed' ? { ...tx, status: mine.status } : tx; });
  return {
    version: 1,
    wallet,
    branches,
    transactions: [...remoteTransactions, ...localOnly].sort(byDateDesc).slice(0, 500),
    activities: unionById(remote.activities, local.activities).sort(byDateDesc).slice(0, 80),
    presets: unionById(remote.presets, local.presets),
    plans: unionById(remote.plans, local.plans)
  };
}
