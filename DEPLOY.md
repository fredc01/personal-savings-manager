# Deploying Personal Savings Manager

This guide covers three things:

1. Running and testing the app locally
2. Publishing the web app to **GitHub Pages**
3. Building the **Android app (APK)**, locally or automatically with GitHub Actions

The app is a static site (HTML, CSS and JavaScript modules). There is no backend. All data is stored in the browser's IndexedDB on each device.

> **Important:** because data lives in the browser, each device and browser has its own separate ledger. Use **Settings & Backup → Download backup** regularly. Clearing browser data or uninstalling the app erases the ledger.

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

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html`, `css/`, `js/` | The web app |
| `sw.js`, `manifest.json`, `icon.svg` | Offline support and install metadata |
| `server.js` | Local dev server (`npm start`) |
| `scripts/build-web.mjs` | Builds the `dist/` folder for Pages (`npm run build`) |
| `app/` | Capacitor Android wrapper |
| `.github/workflows/pages.yml` | Deploys the web app to GitHub Pages |
| `.github/workflows/android.yml` | Builds the Android APK |
