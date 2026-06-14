# Ritual — Habit & Learning Tracker (PWA)

A mobile-first Progressive Web App for tracking habits, tasks, goals, and a hierarchical learning path (Subjects → Levels → Courses → Lessons). Built with React, Vite, Tailwind CSS, and Dexie (IndexedDB). All data stays on-device.

## Tech stack
- React 19 + React Router (hash-based routing, works great on static hosts)
- Tailwind CSS with the design tokens from the Stitch/Figma export
- Dexie.js (IndexedDB) for local persistence — habits, tasks, goals, learning hierarchy, study sessions
- vite-plugin-pwa for installable PWA support (manifest + service worker)
- Web Notifications API for local reminders

## Local development

```bash
npm install
npm run dev
```

Open the printed local URL on your computer, or on your phone via the same Wi-Fi using the "Network" URL shown by Vite.

## Build for production

```bash
npm run build
npm run preview   # test the production build locally
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Go to vercel.com → New Project → import the repo.
3. Framework preset: Vite (auto-detected). Build command: `npm run build`. Output directory: `dist`.
4. Deploy. You'll get a `https://your-app.vercel.app` URL.

## Install on your phone (PWA)

- **Android (Chrome)**: open the Vercel URL → menu (⋮) → "Add to Home screen" / "Install app".
- **iOS (Safari)**: open the Vercel URL → Share button → "Add to Home Screen".

Once installed, it opens full-screen like a native app, with its own icon.

## Notifications

On first launch, the app asks for notification permission. Reminders rely on the
browser's Notification API:
- **Android**: works well as an installed PWA.
- **iOS**: requires iOS 16.4+ and the app must be installed via "Add to Home Screen" (notifications don't work in regular Safari tabs).

Notification preferences (habit reminders, task alerts, daily digest time) are in
Settings (bell icon on any screen).

## Data & storage

Everything is stored locally in IndexedDB via Dexie (`src/db/db.js`). There is
**no backend** — data does not sync between devices/browsers. If you clear your
browser data, your data is lost. On first run, the app seeds some example
habits, tasks, goals, and a sample English/Programming learning path so you can
see how everything works; feel free to delete the seed items.

## Project structure

```
src/
  db/db.js              Dexie schema + seed data
  utils/notifications.js  Notification helpers
  components/           Shared UI (TopAppBar, BottomNav, FAB)
  pages/
    Onboarding.jsx
    Dashboard.jsx
    Habits.jsx / AddEditHabit.jsx
    Tasks.jsx / AddEditTask.jsx
    Goals.jsx
    Learning.jsx / LessonDetail.jsx
    Stats.jsx
    NotificationSettings.jsx
```
