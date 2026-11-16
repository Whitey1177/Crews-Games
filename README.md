# Crew's Games

Three dog-themed games (Crew Merge, Crew Jump, Crew's Adventure) with an online leaderboard.

## What's inside
- `public/` – the website (home menu + the three games)
- `netlify/functions/scores.mjs` – the leaderboard (stores scores in Netlify Blobs)
- `netlify.toml` – tells Netlify where things are
- `package.json` – lists the one library the leaderboard needs (`@netlify/blobs`)

## Deploy
1. In Netlify, create a new project and upload this folder (or the zip).
2. After it deploys, open Project → Functions. You should see `scores`.
3. Play a game, type a name at Game Over and tap Post.

If `scores` doesn't show up under Functions, connect the project to a GitHub repo instead
(Netlify → Add new project → Import from Git). Netlify then installs `@netlify/blobs` and
builds the function automatically on every update.

## Leaderboard API
- `GET /.netlify/functions/scores?game=adventure` → top 10
- `POST /.netlify/functions/scores` with `{ "game": "adventure", "name": "Crew", "score": 1234 }`
Games: `merge`, `jump`, `adventure`. Each name keeps its best score; the top 100 are stored.
