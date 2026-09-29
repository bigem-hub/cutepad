# Cutepad — legal, privacy & accessibility audit

_Last reviewed: 27 September 2026. Scope: entire repo (web + desktop + packages)._

## 1. Tracking, cookies & third parties — CLEAN

| Check | Result |
| --- | --- |
| Analytics / ads / telemetry SDKs | **None.** Grep for analytics, gtag, ga(, mixpanel, sentry, posthog, hotjar, segment, pixel, beacon → no matches in source. |
| Cookies | **None.** `document.cookie` never used; no cookie libraries. → No cookie banner required (stated openly in `/cookies`). |
| Third-party embeds / iframes | **None.** Only iframe is the local/self PDF viewer (Chromium built-in, `sandbox`-style, local blob/file URLs). |
| Remote font CDNs | **Removed.** Google Fonts links replaced with self-hosted `./fonts/fonts.css` (woff2 + OFL license files in `apps/web/public/fonts/`). |
| Hardcoded external requests | **Optional only.** All network I/O goes to the user's own configured Supabase URL (`fetch` in `packages/core/src/sync.ts`), the user-configured AI endpoint (`packages/core/src/ai.ts`), or — if the user opts into built-in cloud sync — the Cutepad Firebase project (Google Cloud, `packages/core/src/cloud.ts`). Discord Rich Presence (desktop, optional) connects to Discord. Nothing runs without user action/consent. |
| Image/font/asset copyright | All artwork is inline SVG or emoji — **no third-party image assets**. Fonts: Fredoka + Nunito, SIL OFL 1.1, license texts shipped (`OFL-Fredoka.txt`, `OFL-Nunito.txt`). |
| Fake reviews / testimonials / claims | **None found.** No testimonial markup, star ratings, user counts or “doctor approved”-style claims anywhere. Feature copy describes only implemented behavior. |

## 2. Content-Security-Policy

`apps/web/index.html` ships a restrictive meta CSP:

- `default-src 'self'`; `script-src 'self'` (**`'unsafe-inline'` removed** — the app ships no inline scripts; verified by smoke run); `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: blob:`; `font-src 'self' data:`; `connect-src 'self' https: http://localhost:* ws://localhost:*` (user Supabase + AI endpoints + Firebase + dev server); `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`.
- Residual risk: `'unsafe-inline'` in `style-src` remains (inline style attributes used throughout); React `dangerouslySetInnerHTML` still exists for published notes — mitigated by sanitizer, §3.

## 3. Stored XSS on public share pages — FIXED

- `SharePage.tsx` renders published note HTML via `dangerouslySetInnerHTML` → **was a stored-XSS vector** (publish path is open by demo RLS).
- Fix: `apps/web/src/lib/sanitize.ts` (`sanitizeNoteHtml`) — DOM-walk allowlist: strips `script`/`iframe`/`object`/`embed`, strips all `on*` handlers and `javascript:`/`data:`-script URIs, unwraps unknown tags, forces `rel="noopener noreferrer nofollow"` on external links. Applied before render.

## 4. Data minimization & consent (DPDP-aligned)

- **Local-first default**: without the user opting into cloud sync (Supabase or built-in Firebase), nothing leaves the device — no account required, zero telemetry. Accounts (email/password) are optional and only exist to back up the user's own data to their own account.
- **Consent timestamps** (`Settings.legal` in `packages/core/src/types.ts`, epoch-ms timestamps, null = not given):
  - `sync` — cloud sync of the full workspace (checkbox in Settings, gates the *Sync now* button and `performSync()` in `packages/core/src/sync.ts`; built-in Firebase or self-hosted Supabase).
  - `publish` — publishing an individual note to a public share link (checkbox in the Notes header; enforced again inside `publishNote()`).
  - `share` — buddy/group presence + leaderboard stats + published week schedule (checkbox in Buddy view; enforced inside `pushBuddyPresence`/`pushGroupPresence`/`pushGroupSchedule` and the view-level `syncOnce`/`shareStats`/`publishWeek`).
  - `age` — one-time age / parental-consent acknowledgment shown on first launch (modal in `App.tsx`; not a transfer consent, recorded so the notice was shown).
- Withdrawal: unchecking stops further transfers; **in-app deletion of the synced copy**: Settings → Cloud sync → “delete synced backup” (`deleteCloudBackup()` in `packages/core/src/sync.ts`) erases the remote backup and withdraws `sync` consent. Local device data is untouched by design.
- Only fields actually needed are sent (name/streak/minutes for sharing; full notes only when sync/publish opted in).

## 5. India — DPDP Act 2023 & DPDP Rules 2025

Research summary (Rules notified 13 Nov 2025, G.S.R. 846(E), phased commencement; core obligations phase in through 2026–2027):

| DPDP requirement | Cutepad status |
| --- | --- |
| Consent notice, plain language, per purpose | ✅ Consent checkboxes + privacy notice links at every transfer point. |
| Consent withdrawable, as easy as giving | ✅ Uncheck to stop; symmetric UI. |
| Data Principal rights (access/correct/erase/nominate), 90-day response | ⚠️ Privacy Policy states the rights + contact; in-app export exists (JSON/Markdown/PDF); **no in-app erase-request flow** (local erase = clearing app data; synced rows need the operator to act — manual process). |
| Storage limitation | ✅ No analytics data collected; user controls deletion locally. |
| Breach notification (principals + Board, without delay) | ⚠️ Stated in policy; applies to the built-in Firebase backup (operator) and realistically to the user's own Supabase project (self-hosted responsibility). |
| Children <18 — verifiable parental consent | ✅ First-launch age / parental-consent acknowledgment modal (`App.tsx`, recorded as `Settings.legal.age`); policy states the app is not directed at children and consent must come from a parent. |
| Cross-border disclosure | ✅ Disclosed: only to the user's configured Supabase region / AI endpoint / built-in Google Cloud (Firebase) region. |
| DPO / grievance contact published | ✅ `apps/web/src/legal/business.ts` filled (operator name, contact email, country; address “available on request by email”) and rendered on all 4 legal pages. |
| Significant data fiduciary duties | ℹ️ Not applicable at this scale (no SD fiduciary designation expected for a local-first app). |

Related: **no dark patterns** (no pre-ticked boxes, no forced account, no bundled consent), **no behavioral monitoring/targeted advertising** (therefore no consent-exemption basis needed).

## 6. Accessibility (WCAG 2.2 AA pass)

Fixed:

- **Contrast**: `--fg-muted` lightened to `#75658a`; per-theme `--link` tokens (all ≥4.5:1); `--active-grad` / `--active-fg` replace low-contrast white-on-pastel active states (nav, segmented, tool toggles, checkboxes); `--danger-strong` for destructive text; buttons/chips/`::selection`/`.zzz` adjusted.
- **Keyboard**: skip link (`Skip to main content`, first tab stop) → `#main-content`; Modal focus trap + restore + `aria-labelledby`; Tabs arrow/Home/End roving tabindex; Segmented `role="group"` + `aria-pressed`; visible focus retained (native outlines kept).
- **Names/roles**: aria-labels on every icon-only button; `aria-hidden` on decorative emoji; `role="heading" aria-level` on view titles; form controls labelled (`htmlFor`/`aria-label`); images `alt`; canvases `role="img"` + labels; `role="status"` on transient messages; `role="alert"`-worthy errors surfaced as status text; charts `role="img"` with summary labels; MoodFace/FlipCard/plant/mascot labelled.
- **Notices**: `MoodFace` emoji buttons expose names; window controls labelled; consent checkboxes explicitly labelled.

Known gaps (accepted for now, attribute-only scope):

1. **Partially pointer-only surfaces**: note-list selection and opening a planner block are now keyboard-operable (title button / Enter on focused block), but planner block **drag & resize**, the sticky drag handle, and drawing/annotation canvases remain pointer-only (WCAG 2.1.1). Text/button fallbacks exist (Edit dialogs, undo/clear/save on drawing tools).
2. Charts as `role="img"`: individual per-bar axis text not announced (summary label instead).
3. `aria-valuetext` on range sliders skipped (needs value formatting logic).
4. English-only `aria-label`s (app locale switches visible copy only).
5. AnalyticsView / configured BuddyView headings are visually hidden (`sr-only` h1) rather than visible page titles.
6. ~~Legal pages English-only~~ — now fully localized (en/es/ja) via `apps/web/src/i18n/legal.ts`; `aria-label`s remain English-only.

## 7. Remaining risks / TODO before public launch

_Reviewed 27 September 2026 — all actionable items completed; residual notes below._

| # | Risk | Severity | Action | Status |
| --- | --- | --- | --- | --- |
| 1 | `apps/web/src/legal/business.ts` contained `[INSERT: …]` operator details (shown on all 4 legal pages) | **Blocker** | Fill operator name, postal address, monitored email. | ✅ **Done** — filled (operator, monitored email, country; address on request by email); renders on all 4 legal pages. |
| 2 | Supabase share/group tables use demo-open RLS (`using (true)`); share links embed the **anon key** in the URL | High | Tighten policies with `auth.uid()`/secret-free share tokens; rotate keys. | 🟡 **Documented** — `docs/setup-supabase.sql` ships prominent warnings + anon-key rotation guidance; Supabase is the self-hosted/legacy path, built-in Firebase (per-uid security rules, `docs/firestore.rules`) is the recommended default. Full `auth.uid()` tightening ships only if Supabase Auth is added. |
| 3 | Optional AI provider key stored in **plaintext localStorage** | Medium | OS keychain integration for the AI key; document that the device itself must be protected. | ✅ **Done (desktop)** — key encrypted at rest via Electron `safeStorage` (OS keychain) in the persist storage adapter (`packages/core/src/store.ts`, `enc:v1:` prefix); undecryptable ciphertext is dropped so the user re-enters the key. Web has no keychain → plaintext localStorage there (documented limitation — protect the device/profile). |
| 4 | No authentication/accounts — synced data ownership depends on setup | Medium | Documented; add Supabase Auth if hosted sharing ships. | 🟡 **Addressed (optional accounts)** — optional email/password accounts now ship (Firebase Auth: `firebaseSignUp`/`firebaseLogin` in `packages/core/src/cloud.ts`; guest sessions link into the account so device data follows the user; `remember me` honored at boot via `useAuthBootstrap` in `apps/web/src/hooks.ts`). Local-first remains the default — no account is required and nothing leaves the device without sync consent. Supabase Auth still required if self-hosted sharing ships. |
| 5 | No age gate despite <18 parental-consent rule | Medium | Add a minimal age/parental-consent acknowledgment at first launch. | ✅ **Done** — one-time “quick check 🌸” modal on first launch (`App.tsx`), recorded as `Settings.legal.age` (epoch ms); shown once until acknowledged. |
| 6 | No in-app “delete my synced data / withdraw” button | Medium | Ship a data-deletion flow. | ✅ **Done** — Settings → Cloud sync → “delete synced backup” (confirm modal) deletes the remote Firestore/Supabase backup (`deleteCloudBackup()`), withdraws `sync` consent and stops syncing; local data kept. |
| 7 | Older V1 view copy still English-only | Low | Finish es/ja for V1 stat labels. | ✅ **Done** — dashboard (stat cards, daily goal, mood/smart/garden/week/blocks/deadlines copy) localized en/es/ja via `apps/web/src/i18n/views/dashboard.ts`. |
| 8 | CSP `script-src 'unsafe-inline'` | Low | Move to nonce/hash once build pipeline allows. | ✅ **Done** — `'unsafe-inline'` removed from `script-src` in `apps/web/index.html` (app ships no inline scripts; hash/nonce unnecessary); verified by smoke run. `style-src` still allows inline styles (inline style attributes). |
| 9 | Web Speech API may route audio through OS/browser vendor speech service | Low | Disclosed in Privacy Policy; disable the mic button if unacceptable. | ✅ **Disclosed** — no change needed. |
| 10 | Published notes are world-readable by design (public table) | Info | Already disclosed in policy + share UI. | ✅ **Disclosed** — no change needed. |

## 8. Verification commands

```powershell
npm run typecheck   # tsc web + desktop
npm run build       # vite + electron-builder config sanity
$env:CUTEPAD_SMOKE='1'; npm run dev:desktop   # 13-route smoke → CUTEPAD_SMOKE_OK
```
