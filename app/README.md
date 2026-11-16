# Pup Slope — iPhone app (Expo)

This folder is the App Store version. It packs the games from `../public` inside the app.

- `config.js` — set `SITE_URL` to your website address (needed for the leaderboard).
- `games.js` — the games, generated from `../public` by `node scripts/sync-games.js`.
- `app.json` — app name, icon, bundle ID.
- Build on expo.dev → your project → Builds → build from GitHub, base directory `app`.
