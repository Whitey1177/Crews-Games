# Crew's Games

Three dog-themed games (Crew, Crew Jump, Crew's Adventure) with a global leaderboard, plus the iPhone app.

## What's inside
- `public/` – the website (home menu, the three games, privacy policy)
- `functions/api/scores.js` – the leaderboard (Cloudflare Pages Function, stores scores in Workers KV)
- `app/` – the iPhone app (Expo). See `app/README.md`.

## Hosting (Cloudflare Pages)
- Build command: *(none)* · Build output directory: `public` · Root directory: *(leave blank)*
- Leaderboard storage: Settings → Bindings → add **KV namespace**, variable name `SCORES`.
- Every push to `main` redeploys the site automatically.

## Leaderboard API
- `GET /api/scores?game=adventure-m` → top 10
- `POST /api/scores` with `{ "game": "adventure-m", "name": "Crew", "score": 1234 }`
Boards: `merge`, `jump`, `adventure`, `adventure-m`. Each name keeps its best score; the top 100 are stored.
