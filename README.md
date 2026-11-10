# Personal Savings Manager

Personal Savings Manager is a responsive personal savings tracker and money allocation manager. It is not a bank or e-wallet and does not move real money through external banking networks.

## Run the web app

From the project root:

```bash
npm start
```

Open `http://localhost:3000`. The financial record is persisted in IndexedDB for offline use; a localStorage fallback is used only when IndexedDB is unavailable. The app starts with an empty ledger (five default branch accounts at ₱0). Everything can be erased from Settings & Backup → Erase all data.

## Package the same app for Android

The `app/` directory contains the Capacitor bridge configuration. It intentionally keeps the business logic in the root `js/` modules so the browser and Android builds use the same data structures and operation service.

```bash
cd app
npm install
npm run android:add       # first setup only; requires Android Studio/SDK
npm run android:build     # syncs the web app and builds android/app/build/outputs/apk/debug/app-debug.apk
```

For iterative development, run `npm run cap:sync` after changing the root web files, then open the generated Android project with `npm run android:open`. The shared controller registers the Capacitor App plugin back-button listener when running inside Android: it navigates back through hash routes and exits only from the root route. The current app uses the same business logic and data model inside the WebView.

## Included capabilities

The browser release includes the dashboard, wallet, branch CRUD/archive/reactivation, automatic/manual deposits with centavo rounding, transfers, withdrawals, goals, allocation presets, planner reminders, searchable/filterable transaction history with date range, CSV export, reports, theme/privacy controls, JSON backup/restore validation, and audit activity. Financial operations are serialized through `js/finance.js` and stored through `js/db.js`.

## Cloud sync (optional)

The app is offline-first. Connect your own Supabase project under Settings & backup → Cloud sync to sync automatically across devices whenever you are online. Setup is in [DEPLOY.md](DEPLOY.md#5-cloud-sync-with-supabase-optional).

## Deploy

See [DEPLOY.md](DEPLOY.md) for publishing to GitHub Pages and building the Android APK.
