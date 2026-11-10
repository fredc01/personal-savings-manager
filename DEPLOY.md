# Deploying Personal Savings Manager

This guide covers:

1. Running and testing the app locally
2. Publishing the web app to **GitHub Pages**
3. Building the **Android app (APK)**, locally or automatically with GitHub Actions
4. Starting with real data
5. **Cloud sync with Supabase** (optional): sync across devices while staying offline-first

The app is a static site (HTML, CSS and JavaScript modules). There is no backend. All data is stored in the browser's IndexedDB on each device.

> **Important:** by default, data lives in the browser, so each device and browser has its own separate ledger. Use **Settings & Backup → Download backup** regularly. Clearing browser data or uninstalling the app erases the ledger. To keep one ledger across devices, set up the optional [cloud sync](#5-cloud-sync-with-supabase-optional).

---

## 1. Run it locally first

Opening `index.html` by double-clicking does **not** work (ES modules are blocked on `file://`). Use the local server:

```bash
npm start
```

Then open <http://localhost:3000>. You need [Node.js 22+](https://nodejs.org).

To test exactly what will be published:

```bash
npm run build          # creates the dist/ folder
npx serve dist         # or: python -m http.server 8080 --directory dist
```

> Because the app uses relative paths and hash routes (`#/wallet`), it works from a sub-path such as `https://USERNAME.github.io/REPO/` with no extra configuration.

---

## 2. Publish to GitHub Pages

### 2.1 Create the repository and push the code

1. Create a new repository on GitHub (for example `personal-savings-manager`). Public repos work on all plans. Private repos need a paid plan for Pages.
2. From the project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/personal-savings-manager.git
git push -u origin main
```

### 2.2 Turn on Pages with GitHub Actions

1. In the repository, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.

That's all. The included workflow `.github/workflows/pages.yml` runs on every push to `main`. It runs `npm run build` and publishes the `dist/` folder.

### 2.3 Check the deployment

1. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to turn green (about a minute).
2. Your site is live at:

```
https://USERNAME.github.io/personal-savings-manager/
```

You can also re-run it at any time from **Actions → Deploy to GitHub Pages → Run workflow**.

### 2.4 Install it like an app (optional)

Open the site on your phone or desktop browser and choose **Add to Home Screen** / **Install app**. It works offline after the first visit.

### 2.5 Updating the site

Commit and push to `main`. The new version deploys automatically. The service worker is network-first, so refreshing the page loads the new version when online.

### Troubleshooting Pages

| Problem | Fix |
| --- | --- |
| Workflow fails at "deploy-pages" with a permissions or environment error | Make sure **Settings → Pages → Source** is set to **GitHub Actions**. |
| 404 page | Wait for the workflow to finish; use the exact URL shown in the workflow summary. |
| Unstyled page / blank screen | Hard refresh (Ctrl+Shift+R). Confirm `dist/` contains `css/` and `js/` (run `npm run build` locally). |
| Old version still showing | Hard refresh, or in DevTools → Application → Service Workers → **Unregister**. |
| Data from before looks missing | Data is per-browser and per-site address. A new URL (or `localhost`) has its own empty ledger. Use **Restore backup** to move data. |

---

## 3. Build the Android app

The `app/` folder wraps the same web files in a [Capacitor](https://capacitorjs.com) Android project.

### Option A: Automatic build with GitHub Actions (no Android Studio needed)

The workflow `.github/workflows/android.yml` builds a debug APK.

1. Go to **Actions → Build Android APK → Run workflow**.
2. When it finishes, open the run and download the **savings-manager-debug-apk** artifact (a zip containing `app-debug.apk`).
3. Copy the APK to your phone and install it (allow "Install unknown apps" for your file manager or browser when asked).

To publish the APK as a downloadable **GitHub Release**, push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow builds the APK and attaches `app-debug.apk` to the release for that tag.

> This is a **debug-signed** APK, fine for personal use and testing. For the Play Store you need a release build signed with your own keystore (see Android's "Sign your app" docs).

### Option B: Build locally

Requirements: Node.js 22+, JDK 21, Android Studio (or the Android SDK command-line tools).

```bash
cd app
npm install
npm run android:add      # first time only: syncs web files and creates app/android
npm run android:build    # syncs web files and runs gradle assembleDebug
```

The APK is created at:

```
app/android/app/build/outputs/apk/debug/app-debug.apk
```

After changing any web files in the project root, run `npm run cap:sync` (inside `app/`) and rebuild. Use `npm run android:open` to open the project in Android Studio.

---

## 4. Starting with real data

The app now starts with an **empty ledger**: Main Wallet at ₱0, five default branch accounts (Emergency, Baby, Travel, House, Personal) at ₱0 with no targets, and no transactions or plans.

Suggested first steps:

1. **Branch accounts** → edit or archive the defaults, or add your own, and set targets in **Goals**.
2. **Deposit money** → record your current balances as opening deposits (put a note like "Opening balance").
3. **Settings & Backup** → download your first backup.

If your browser still holds the older sample ledger from a previous version, it is detected and replaced with the empty ledger on the next load. To wipe everything manually at any time, use **Settings & Backup → Erase all data**.

---

## 5. Cloud sync with Supabase (optional)

The app stays **offline-first**. Every entry is saved on your device immediately, with or without internet. If you connect a Supabase database, the app also keeps a copy of your ledger there and syncs it **automatically whenever you are online**. There is also a manual sync button.

### 5.1 Set up Supabase (about 5 minutes, free tier is enough)

1. Create an account and a **new project** at <https://supabase.com>. Pick any name and region, and save the database password.
2. Open **SQL Editor → New query**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates one private table, `ledgers`, protected by Row Level Security so each login can only read and write its own row.
3. Open **Authentication → Providers → Email**:
   - For a personal app, you can turn **Confirm email** off so your account works immediately. If you leave it on, you must click the link in the confirmation email before signing in.
4. Find your connection details in **Project Settings → API** (or the **Connect** button):
   - **Project URL**, like `https://abcd1234.supabase.co`
   - **anon / publishable key** (the public one)

> **Never use the `service_role` or `secret` key.** It bypasses all security. The app rejects it if you paste it by mistake. The anon/publishable key is designed to be public, and Row Level Security protects your data.

### 5.2 Connect the app

1. Open the app → **Settings & backup → Cloud sync**.
2. Paste the **Project URL** and **anon key** under *Supabase connection*.
3. Enter an email and password, then click **Create account** (first time) or **Sign in**.

Repeat on each device or browser where you want the same ledger. Sign in with the **same account**.

**Optional shortcut:** put the URL and anon key into `js/config.js`, commit and push. Every device then has them pre-filled, and you only need to sign in.

```js
export const SUPABASE_URL = 'https://abcd1234.supabase.co';
export const SUPABASE_ANON_KEY = 'your-public-anon-key';
```

Once you have created your own account, you can stop strangers from creating accounts on your project: **Authentication → Sign In / Providers → turn off "Allow new users to sign up"**.

### 5.3 How syncing works

| When | What happens |
| --- | --- |
| You add or change something | Saved on the device immediately. About 2.5 seconds later, if online, it is uploaded. |
| You open the app, return to the tab, or regain internet | The app checks the cloud and syncs. |
| App stays open | It re-checks every 2 minutes. |
| You tap the sync icon (top bar) or **Sync now** | Immediate sync with a result message. |
| You are offline | Nothing is lost. The status shows "Offline", and the changes upload when you are back online. |

The cloud icon in the top bar shows the state: green dot = up to date, amber = waiting or syncing, grey = offline, red = problem or needs a decision.

**What is synced:** balances, transactions, branches, goals, presets, planner and activity log. **Not synced:** color mode and balance privacy, which stay per device.

**Conflicts.** The cloud keeps a single copy of the ledger with a revision number. If you change data on two devices before they sync, the app does **not** guess or merge. It shows both totals and asks you to choose **Keep this device**, **Use cloud copy**, or **Decide later**. There is a button to download a backup of the device first. To avoid conflicts, let one device finish syncing (green dot) before editing on another.

**Setting up a second device.** Sign in on the new, empty device and it downloads your ledger automatically, with no prompt. If the new device already has entries of its own and the cloud also has data, you are asked which to keep.

### 5.4 Things to know

- **Erase all data** and **Restore backup** are changes like any other. With sync on, they replace the cloud copy on the next sync. The confirmation message says so.
- Signing out stops syncing but keeps all data on the device. The cloud copy stays in Supabase until you delete it there (**Table Editor → ledgers**).
- Your ledger is stored as JSON in your own Supabase project. You can read it in the dashboard, and Supabase staff can technically access project data. Do not use sync if that is a concern. The app works fully without it.
- Free Supabase projects are **paused after about a week of inactivity**. Your data is kept, and you can restore the project from the dashboard. Local data on your devices is unaffected.
- Keep downloading JSON backups. Sync is a convenience copy, not a replacement for backups.

### Troubleshooting sync

| Problem | Fix |
| --- | --- |
| "Could not reach Supabase" | Check the Project URL (must start with `https://` and end with `.supabase.co`) and your internet connection. If the project is paused, restore it in the Supabase dashboard. |
| "Invalid login credentials" | Wrong email or password, or the account is not confirmed yet. Check your email for the confirmation link. |
| "Email not confirmed" | Click the link in the confirmation email, or turn off **Confirm email** (step 5.1.3). |
| "Signups not allowed" | You turned off sign-ups before creating your account. Re-enable it, create the account, then turn it off again. |
| Red dot with "relation ... does not exist" or "permission denied" | `supabase/schema.sql` was not run, or failed partway. Run it again in the SQL Editor. |
| "Session expired" | Sign in again. Your local data is untouched. |
| Changes not appearing on another device | Wait for the green dot on the first device, then tap **Sync now** on the second one. |

---

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html`, `css/`, `js/` | The web app |
| `sw.js`, `manifest.json`, `icon.svg` | Offline support and install metadata |
| `js/sync.js`, `js/config.js` | Optional Supabase cloud sync and its default settings |
| `supabase/schema.sql` | Database table and security rules for cloud sync |
| `server.js` | Local dev server (`npm start`) |
| `scripts/build-web.mjs` | Builds the `dist/` folder for Pages (`npm run build`) |
| `app/` | Capacitor Android wrapper |
| `.github/workflows/pages.yml` | Deploys the web app to GitHub Pages |
| `.github/workflows/android.yml` | Builds the Android APK |
