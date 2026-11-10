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
