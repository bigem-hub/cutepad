# Cutepad 🌸

**A cute, kawaii-themed notepad & study companion** — available as a **Windows desktop app** and a **companion website**, sharing one codebase so your notes, planner, streaks and settings match everywhere.

Pastel colors, rounded corners, a mascot named **Mochi** who cheers for you, pomodoro focus sessions, a draggable study planner, a growing study plant, ambient lo-fi/rain sounds, achievements, sticky notes floating on your desktop, and optional cloud sync.

**V2** adds a spaced-repetition flashcard system, a mood tracker, a template library, document annotation (PDF/image scribbling), deeper analytics, sticker/outfit rewards and an ambient beat — **V3** adds optional AI (summaries, quizzes, note→flashcards, schedule ideas, syllabus parsing), voice dictation + read-aloud, public note sharing, study groups with leaderboards, a soft Focus Guard and accessibility options (dyslexia typography, multi-language UI).

---

## ✨ Features

### 📝 Notepad
- Rich text notes (headings, lists, quotes, **highlight & text colors**) with an autosave editor
- Cute **sticker/emoji decorations** (kawaii, study, nature, moods sets)
- **Folder/notebook organization** with custom emoji icons + pastel colors
- **Tags + instant search** (title, body, tags)
- **Handwriting/drawing mode** with stylus pressure support and cute pens: pen, marker, ✨ glitter, 🌈 rainbow, eraser — with undo, PNG export, and per-note doodles
- Auto-save to local storage; export any note as **TXT / Markdown / HTML / PDF**
- **Sticky notes** that float on screen (and as always-on-top native windows in the desktop app)

### 🗓️ Study scheduling
- **Weekly planner** with drag-and-drop + resize time blocks (15-min snapping), subject color-coding
- **Monthly calendar view** with block dots & deadline markers
- **Pomodoro focus timer** (work / short / long breaks, auto-break, chimes) with kawaii animations, breathing ring and break self-care tips
- **Priority to-do list** with checkboxes that trigger a **confetti celebration** 🎉
- **Deadline countdowns** and **recurring study reminders** (desktop notifications)
- **Progress tracking**: streaks, completed sessions, study-hour totals
- **Growing plant companion** that levels up as you study (seed → sprout → 🌸 blooming)
- **Analytics dashboard**: 14-day bar chart, time per subject, 12-week heatmap, weekly trends, highlights, **completion rate, 30-day focus trend with moving average, weekday & hourly focus patterns, flashcard memory stats**

### 🧠 Study systems (V2)
- **Flashcards with spaced repetition** (SM-2): decks, a flip-card study flow (again/hard/good/easy with live interval previews), due-today queues and retention stats
- **Mood tracker**: log how you feel each day, a 30-day mood grid, mood × focus-time correlations and streaks
- **Template library**: Cornell notes, exam prep, weekly review, lecture, reading notes — one click from Notes
- **Document annotation**: import PDFs or images and scribble on them with pen/marker/highlighter/✨glitter/🌈rainbow/💡neon + eraser, with scroll-anchored strokes
- **Rewards**: 18 collectible stickers + 7 mascot outfits (bow, glasses, beret, scarf, headphones, crown, halo) unlocked through study milestones
- **Beats ambience**: an 84 BPM lo-fi step sequencer joins rain/ocean/café/campfire/lo-fi

### 🤖 AI & smart tools (V3)
- **Two engines, honestly labeled**: offline local heuristics by default, or bring your own OpenAI-compatible endpoint (base URL, key, model — key stays on your device)
- **Note → summary, quiz, or flashcards** from the Notes toolbar or the **Smart** page; **syllabus → planner** parser (paste a syllabus, get dated study blocks)
- **Schedule suggestions**: Smart page proposes study blocks from your deadlines and free time
- Everything also works **fully offline** — the local engine just does its best

### 🌐 Social, sharing & focus (V3)
- **Public note pages**: publish a note to a shareable link (`#/share/<slug>`) that anyone can read
- **Study groups**: create/join a 6-char group code, share daily minutes, leaderboard with 🥇🥈🥉, and publish/fetch your group's weekly schedule
- **Focus Guard**: during focus sessions, softly block distracting apps/sites — *nudge* (gentle toast), *shield* (covers the screen), or *snap* (pulls Cutepad forward)
- **Voice**: mic dictation while writing + read-aloud (TTS) with voice & speed controls

### ♿ Accessibility
- **Dyslexia-friendly typography** toggle (bolder, wider-spaced type)
- **Multi-language UI**: English, Español, 日本語 (navigation, shell & V2/V3 views; older views remain English)
- TTS voices/rate configurable; reduced-motion support retained

### 🌈 Extra cool stuff
- **Theme picker**: Pastel Dream, Hello Berry, Pastel Goth, Cottagecore, Space Kawaii, **Kawaii Night (dark mode)**
- **Customizable backgrounds**: solid, gradient, built-in patterns (dots, hearts, stars, sakura…), or your own uploaded image
- **Ambient sounds** generated live with Web Audio: rain, ocean, cozy café, campfire, lo-fi, plus a **lo-fi beats** track — with a mini player + volume
- **Achievement badges** (16), a **sticker book** (18) and **mascot outfits** (7) for study milestones
- **Study buddy mode**: pair with a friend using a 6-char code and compare daily minutes, streaks and totals — or form a **group** with a leaderboard
- **Mascot Mochi** reacts to your actions: celebrates completed tasks, encourages during focus, naps when you're idle
- **Kawaii night mode** + reduced-motion support
- Works **fully offline** (local-first), syncs when reconnected

---

## 🛠 Tech stack (and why)

| Layer | Choice | Rationale |
|---|---|---|
| Desktop app | **Electron + React + TypeScript + Vite** | One React codebase for desktop *and* web guarantees notes/schedule parity; Electron gives system tray, native notifications, frameless windows, always-on-top stickies, print-to-PDF and file dialogs. (.NET/WinUI was considered but would mean maintaining two full UIs.) |
| Website | **React + Vite** (same renderer package) | Responsive companion/sync hub; deploy `apps/web/dist` to any static host (Netlify, Vercel, GitHub Pages). |
| State | **zustand + persist** | Tiny, fast, auto-saves every change to `localStorage` (auto-save + offline by default). |
| Cloud sync | **Firebase Firestore** (built-in, default) + **Supabase** (optional) | Firestore: zero-config per-device backup via anonymous auth, one private doc per uid, security rules in `docs/firestore.rules`, no analytics SDK. Supabase kept for self-hosters and for publish/buddy/group features. |
| Backend-free core | `@cutepad/core` | Types, store, analytics, achievements, sync merge logic, Web-Audio ambience, exporters — all isomorphic and reusable. |
| Design system | `@cutepad/ui` | Pastel tokens, 6 themes, mascot SVG, confetti, modals, progress bars — shared by every view. |

**Data model:** local-first. Everything lives in `localStorage` (`cutepad-state`). Desktop additionally writes rotating JSON backups to `%APPDATA%/Cutepad/backups/` every few minutes (keeps the last 10 + `cutepad-latest.json`). Cloud sync is opt-in, conflict resolution is per-entity last-write-wins merged by `updatedAt`.

---

## 📦 Repo structure

```
cutepad/
├── packages/
│   ├── core/          # types, store, analytics, achievements, sync, SRS, templates,
│   │                  # rewards, mood, AI, syllabus parser, TTS, sounds, export
│   └── ui/            # themes, design-system CSS, mascot (+outfits), shared components
├── apps/
│   ├── web/           # React app = website + Electron renderer (+ src/i18n for en/es/ja/ne)
│   └── desktop/       # Electron main process, tray, stickies, PDF, backups, focus guard
├── android/           # Capacitor Android project (Gradle)
├── ios/               # Capacitor iOS project (Xcode, build on macOS)
├── scripts/           # procedural icon/splash generator (gen-mobile-icons.cjs)
├── docs/
│   └── setup-supabase.sql
└── README.md
```

---

## 🚀 Getting started

Prerequisites: **Node.js ≥ 20.19** (Node 22/24 recommended) and npm 10+.

```bash
npm install          # installs all workspaces (Electron included)

npm run dev          # ▶ website dev server → http://localhost:5173
npm run dev:desktop  # ▶ desktop app (Vite + Electron, hot reload)

npm run build        # build the website → apps/web/dist
npm run build:desktop# build renderer + Electron main (apps/desktop/dist)
npm run dist         # package a Windows NSIS installer → release/Cutepad Setup 0.1.2.exe
npm run build:mobile # build website + sync into android/ and ios/ (Capacitor)
npm run dist:android # full Android release build → android/.../app-release-unsigned.apk
npm run typecheck    # tsc across web + desktop
```

> First `npm install` downloads the Electron binary (~100 MB).

### Smoke test (developers)

```bash
cd apps/desktop
npm run build
CUTEPAD_SMOKE=1 npx electron .
```
Launches the app, cycles through every view, prints renderer errors and `CUTEPAD_SMOKE_OK`, then quits.

---

## 📱 Mobile apps (Android & iOS)

Cutepad runs on phones via **Capacitor 8** — the same React app in a native shell.
`isDesktop()`/`Capacitor.isNativePlatform()` hide desktop-only and web-only bits
(the Download-for-Windows button, Electron tray/focus-guard features).

### Install (Android)

1. Grab **Cutepad-0.1.2.apk** from the [GitHub release](https://github.com/bigem-hub/cutepad/releases/tag/v0.1.2).
2. On your phone: open the APK → allow "install from unknown sources" if asked.
3. min Android 7.0 (API 24), only the INTERNET permission, local-first like desktop.

### Build Android yourself (this machine is set up ✅)

```bash
npm run build:mobile          # website → android/app/src/main/assets/public
cd android
# Gradle needs JDK 21 (Android Studio's JBR works):
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
gradlew assembleRelease       # → app/build/outputs/apk/release/app-release-unsigned.apk
```

Sign it (keystore lives **outside** the repo — never commit it):

```bash
# keystore + password: %USERPROFILE%\.android\cutepad.keystore(.password.txt)
zipalign -f -p 4 app-release-unsigned.apk aligned.apk
apksigner sign --ks %USERPROFILE%\.android\cutepad.keystore --ks-key-alias cutepad aligned.apk
```

Icons/splashes are generated (no binary assets): `node scripts/gen-mobile-icons.cjs`.

### iOS (requires macOS + Xcode)

```bash
npm run build:mobile   # on Windows this prepares ios/ (already generated)
npm run open:ios       # opens Xcode on a Mac → run on device / archive
```
The `ios/` project + kawaii icons are committed; signing needs your Apple ID
team in Xcode. Can't be compiled on Windows — that's an Apple limitation, not a Cutepad one.

### Known mobile limitations

- File **export/download** (JSON/PDF) is unreliable in iOS WKWebView — use cloud sync or copy.
- TTS/speech-recognition depend on the OS webview (works on Android, iOS needs a native plugin).
- Focus Guard is desktop-only (tray/screenshot logic doesn't exist on mobile).

---

## ☁️ Optional cloud sync (website ↔ desktop)

### Built-in sync — Firebase Firestore (default provider)

One-time console setup (project `cutepad-aca8c`):

1. **Authentication → Sign-in method → Anonymous**: enable (per-device accounts, no email/password).
2. **Firestore Database → Create database** (production mode, choose a region).
3. **Firestore → Rules**: paste [`docs/firestore.rules`](docs/firestore.rules) → **Publish** (only the signed-in uid may read/write its own document).

Then in the app: **Settings → Cloud sync** → provider `firebase (built-in cloud)` → tick the consent checkbox. From that moment Firestore becomes the **primary save target**: the app loads your document at startup and pushes an updated copy ~2 seconds after every change (plus a 45 s safety tick and on reconnect). Local storage keeps working as an instant offline cache — if the network is down, changes merge in on the next successful save. Every device stores one private document under its own anonymous ID; data from before enabling sync merges in automatically.

> The SDK loads lazily only when Firebase sync is active — no analytics, no `getAnalytics`, no external scripts. Config lives in `packages/core/src/cloud.ts`.

### Alternative: your own Supabase project

1. Create a Supabase project and run [`docs/setup-supabase.sql`](docs/setup-supabase.sql) in the SQL editor.
2. In the app: **Settings → Cloud sync** → provider `Supabase`, paste:
   - **URL**: `https://<project-ref>.supabase.co`
   - **Anon key**: project anon key
   - **Owner**: any sync name (e.g. your email) — use the *same* owner on both devices
3. Press **Sync now** (or leave auto-sync on). Status pill in the sidebar shows `saved locally / syncing / synced`.

Everything keeps working offline; changes merge the next time you're online.

**Study buddy:** Settings → give yourself a display name → **Buddy** page → *Create pair code* → share the code → your friend joins it (sync must be configured on both sides).

**Study groups:** Buddy page → *Group* tab → create/join a group code → share your daily minutes, watch the leaderboard and publish your week's schedule (sync must be configured on every device).

**Public note sharing:** Notes → 🔗 *publish* → copy the link (`#/share/<slug>?s=…&k=…`).

---

## 🎨 Themes & customization

- **Themes**: Pastel Dream · Hello Berry · Pastel Goth · Cottagecore · Space Kawaii · Kawaii Night (dark)
- **Backgrounds**: solid swatches, gradients, patterns (polka, hearts, stars, grid, sakura, picnic), or upload your own image; dimmed automatically in dark mode
- **Mascot**: rename Mochi; moods — idle, cheer, study, sleep, sad, love, think; **dress-up** in unlocked outfits
- **Focus timer**: configurable work/short/long lengths, long-break cycle, auto-break, chime
- **Settings**: AI engine + endpoint, Focus Guard mode & blocklists, accessibility (dyslexia font, TTS voice/rate), language, sync, notifications, reduced-motion

---

## 📌 Notes & known limitations

- **Focus Guard is soft enforcement**: on the Windows desktop, Cutepad polls the foreground window during focus sessions and applies *nudge* / *shield* / *snap*; the website only detects tab/window blur. It does not modify the hosts file or hard-terminate other apps — and website blocking only affects links opened from Cutepad. Honest OS-level blocking would need a privileged service (future work).
- **AI defaults to local heuristics** (fast, offline, no API key). The optional cloud engine talks directly to whatever OpenAI-compatible endpoint *you* configure; your key lives in local storage on your device. Responses depend on the model you choose — no prompts are sent to us (there is no backend).
- **Localization is partial**: navigation, shell, dialogs and all V2/V3 views are translated (English, Español, 日本語, नेपाली — missing Nepali keys fall back to English); older V1 views still show English copy.
- **Share links embed your Supabase anon key** (`…?s=<url>&k=<anonKey>`) so recipients can fetch the published row — treat published notes as public, and rotate keys before any real deployment. Share/group tables are demo-open (RLS `using (true)`); tighten before shipping.
- **PDF viewing/annotation** uses Chromium's built-in PDF viewer in an iframe; annotation strokes are anchored to the scroll position you drew them at. If a PDF renders blank, re-install the PDF viewer support or use image export instead.
- **Voice dictation & TTS** depend on the browser/Electron speech support of your system; the mic button only appears where `SpeechRecognition` is available.
- **PDF export**: desktop uses Electron `printToPDF` with a save dialog; the website opens the browser print dialog (Save as PDF).
- Notifications on the website require permission (button in Settings → Notifications); the desktop app uses native notifications via the tray app.
- Closing the desktop window **hides to tray** (right-click tray → Quit to exit).
- Sync policies in `docs/setup-supabase.sql` are permissive for demo use — tighten them with `auth.uid()` before shipping publicly.
- Ambience is synthesized with Web Audio (no audio files needed, works offline).

## ⚖️ Legal & compliance

- **No tracking, no cookies, no analytics**: Cutepad ships zero analytics/ads SDKs, sets no cookies and uses no third-party embeds. Because there are no cookies, no cookie banner is required — the [Cookie Policy](apps/web/src/pages/LegalPages.tsx) says so explicitly.
- **Fonts self-hosted**: Fredoka + Nunito woff2 files live in `apps/web/public/fonts/` under the SIL Open Font License (`OFL-*.txt`); Google Fonts CDN was removed, so the app makes no requests to Google.
- **Content-Security-Policy** meta tag in `apps/web/index.html` (no remote scripts/styles/fonts; `object-src 'none'`).
- **Stored-XSS protection**: published note HTML is sanitized (`apps/web/src/lib/sanitize.ts`) before rendering on public share pages.
- **Consent gates** (data minimization): Sync, note publishing and buddy/group sharing each require an explicit opt-in checkbox (`Settings.legal`) before any data leaves the device; enforced in both UI and core sync functions.
- **Legal pages**: `/privacy`, `/terms`, `/cookies`, `/refunds` (bottom links + Settings → 📜 legal & privacy). Content is drafted against India's DPDP Act 2023 + DPDP Rules 2025 (consent notice, withdrawal, principal rights, breach duties, children <18 parental consent, storage limitation, cross-border disclosure, grievance contact) — **[ ] fill the operator details in `apps/web/src/legal/business.ts` before launch** (name/address/email placeholders are visible until then). Legal copy is fully localized (en/es/ja).
- **Accessibility**: contrast-corrected tokens, skip link, focus-trapped modals, keyboard-navigable tabs/segmented controls, labelled form controls, `aria-*` sweep across all views, alt text on images. Known gaps (drawing/drag surfaces are pointer-only) are listed in `docs/compliance-audit.md`.
- Full audit: [docs/compliance-audit.md](docs/compliance-audit.md).

## 💗 Credits

Made with React, Electron, zustand and a lot of pastel. Mascot Mochi drew most of the UI.
