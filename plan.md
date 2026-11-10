# Personal Savings Manager — Implementation Plan

## Scope

Deliver a working browser-first personal savings tracker that is suitable for Capacitor packaging later. The first release prioritizes the required financial flows over decorative content: dashboard, wallet deposits, branch accounts, allocation settings, branch transfers, withdrawals, goals, recurring reminders, transaction history, analytics, and backup/restore. It is explicitly a tracker and allocation manager, not a bank or e-wallet.

## Implementation approach

- Use a framework-free HTML/CSS/JavaScript app so the web build stays small and can be wrapped by Capacitor without changing the business logic.
- Use a hash-based single-page navigation shell with a desktop sidebar and mobile bottom navigation. Routes are represented in `public/manus-routes.json` for preview/deployment metadata.
- Keep all state changes inside `js/finance.js`. Deposits, distributions, transfers, withdrawals, branch edits, goals, plans, and reversals update balances and append auditable transaction/activity records before persistence.
- Use IndexedDB (`js/db.js`) for the durable local record, with a localStorage fallback only if IndexedDB is unavailable. Store the whole normalized state as one record in this first release; the service boundary allows a managed backend sync adapter to be added without changing the UI.
- Use integer centavo math for all calculations. Automatic allocation computes floors then assigns any remainder to the selected remainder branch so the distributed total equals the source deposit exactly.
- Keep the UI data-driven: `js/app.js` renders route content from current state and delegates user events to the finance service. `js/ui.js` owns reusable icons, formatting, charts, tables, modals, toasts, and dialogs.
- Use CSS variables and responsive layout tokens for light/dark mode, a deep navy / soft blue / mint palette, rounded cards, subtle shadows, and a calm ledger-like visual language. Charts are rendered with accessible inline SVG/CSS rather than a dependency.
- Start from a clean empty ledger, with a reset action in Settings to erase all local data.

## Project structure

```text
savings/
├── index.html                 # app shell and modal/toast anchors
├── server.js                  # dependency-free static preview server
├── package.json               # start command for Preview
├── app.config.ts              # project logo metadata placeholder
├── public/manus-routes.json   # declared SPA routes
├── css/style.css              # design system, layout, components, responsive rules
├── js/db.js                   # IndexedDB persistence with fallback
├── js/utils.js                # IDs, formatting, escaping, CSV, date helpers
├── js/ui.js                   # icons, SVG charts, modal and toast primitives
├── js/finance.js              # normalized state and atomic financial operations
└── js/app.js                  # navigation, route renderers, event delegation
```

## Design direction

**Alternative styles (low-confidence options):** Quiet wealth / editorial fintech (0.06); Neo-bank command center (0.04); Warm personal ledger (0.03). Chosen: Quiet wealth / editorial fintech.

- **Design Movement:** quiet-luxury fintech with editorial hierarchy and ledger clarity.
- **Core Principles:** calm over noisy; every number has context; actions feel deliberate; data stays legible at mobile widths.
- **Color Philosophy:** deep navy anchors trust; soft blue is the navigational cool; mint and green signal progress without feeling gamified; warm amber marks attention rather than danger. Light gray surfaces keep dense financial information breathable.
- **Layout Paradigm:** an anchored left rail plus a wide “current position” canvas; primary numbers sit in a hero ledger band while activity and allocation use offset cards and long horizontal tracks rather than a generic centered dashboard grid.
- **Signature Elements:** a thin mint “growth rail” on key cards, pill-shaped transaction direction badges, and small branch color dots that act as a visual index across charts, lists, and forms.
- **Interaction Philosophy:** every irreversible action previews the balance impact and asks for confirmation; filters and view changes are immediate; success feedback is concise and tied to the resulting reference.
- **Animation:** 180–240ms ease-out fades and slide-ins, subtle count/rail transitions only for balance changes, no looping motion.
- **Typography System:** system sans stack for dependable Android rendering, with strong numeric weight contrast; uppercase eyebrow labels at 11px and sentence-case action labels.
- **Brand Essence:** a calm command center for turning everyday income into named, visible progress; composed, transparent, encouraging.
- **Brand Voice:** precise and quietly motivating. Examples: “Give every peso a place to go.” and “Your money map is current.”
- **Wordmark & Logo:** a compact “S/” monogram made from two parallel ledger strokes, represented in-app by a navy square with a mint split-line mark.
- **Signature Brand Color:** `#62D4B5`, an ownable mint that means movement from deposit to progress.

## Delivery workflow

1. Implement the local-first functional release and route manifest.
2. Start the Preview server on port 3000 and verify route manifest and core pages.
3. Run source-level checks and a read-only requirements review.
4. Commit the project to the managed repository so the checkpoint is recoverable.
5. Keep Capacitor packaging as the next integration step; this release already avoids browser-only business logic and uses a responsive shell suitable for wrapping.
