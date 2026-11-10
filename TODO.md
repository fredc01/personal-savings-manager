# Savings Manager TODO

## 1. Responsive application shell and navigation
- [x] Provide a modern responsive shell with a desktop sidebar, mobile bottom navigation, a More/Settings area, light/dark mode, readable typography, rounded cards, subtle shadows, consistent spacing, and a navy/soft-blue/green/orange/off-white visual system.
- [x] Keep the main pages accessible: Dashboard, Main Wallet, Branch Accounts, Deposit Money, Transfer Money, Withdraw Money, Allocation Settings, Savings Goals, Transaction History, Reports and Analytics, Recurring Deposit Planner, and Settings and Backup.
- [x] Serve a route manifest for the SPA and support web preview on port 3000.

## 2. Persistent financial data layer and integrity rules
- [x] Store the normalized ledger in IndexedDB for offline persistence, with a clearly isolated fallback for browsers without IndexedDB.
- [x] Process financial operations through one service layer using integer centavo calculations, no negative balances, duplicate-submit protection, audit/activity records, and history-preserving corrections.
- [x] Preserve archived branches and historical transactions.

## 3. Dashboard and financial overview
- [x] Show total savings balance, total deposited, total withdrawn, branch count, total transfers, monthly progress, recent transactions, savings distribution by branch, monthly deposit summary, and savings-goal progress.
- [x] Use summary cards, progress bars, allocation visualization, and responsive inline charts with current state data.

## 4. Main wallet and deposits
- [x] Show main wallet balance and deposit history; accept amount, note, date/time, and deposit mode.
- [x] Support keeping a deposit in the wallet, automatically distributing it, and manually specifying branch amounts.
- [x] Preview distributions before confirmation; require exact 100% for full automatic allocation; support selected branches, saved configuration, custom amounts, and centavo remainder assignment.
- [x] Record deposits, allocation legs, statuses, previous/new balances, and references; allow correction through a reversal rather than deleting history.

## 5. Branch accounts and goals
- [x] Create, edit, archive/reactivate, and view branch accounts with ID, name, description, icon, color, balance, target, allocation percentage, creation date, and status.
- [x] Show individual branch history, percentage of total savings, target progress, and remaining amount.
- [x] Create/update savings goals and show current savings, target, remaining, completion percentage, and contribution cadence.

## 6. Transfers and withdrawals
- [x] Transfer funds between distinct branches only after validating source balance and showing a confirmation summary; record a unique transfer reference and both ledger sides without changing total savings.
- [x] Withdraw from a branch or the main wallet with sufficient-balance validation, notes, timestamps, confirmation, and history.

## 7. Transactions, reports, and planner
- [x] Search, filter, sort, and inspect transaction history by type, branch, and date; include IDs, references, source/destination, amount, timestamp, description, balances, and status.
- [x] Export transaction history as CSV.
- [x] Show monthly deposit/withdrawal trends, branch comparison, highest/lowest funded branch, and goal completion.
- [x] Support recurring deposit reminders/plans as planned transactions only; do not claim to move real external money.
- [x] Support allocation presets and switching presets before deposits.

## 8. Backup, privacy, and mobile-readiness
- [x] Export/import complete JSON backup, show last backup date, reset ledger, and keep local persistence across refresh/reopen.
- [x] Provide optional balance privacy, confirmation prompts for important actions, mobile-friendly input behavior, and an Android-ready responsive shell with shared business logic.
- [x] Add Capacitor 8 configuration, shared web asset sync, and Android APK build instructions; native splash/icon assets and generated Android project remain environment-specific follow-up work.
- [ ] Add managed backend synchronization, authenticated multi-device access, secure PIN/biometric APIs, and push notifications when those external capabilities are enabled.
