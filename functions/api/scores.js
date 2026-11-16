// Pup Slope leaderboard (Cloudflare Pages Function)
//   GET  /api/scores?game=<id>          → top 10
//   POST /api/scores {game, name, score, t} → submit (t = seconds ridden; each name keeps its best; top 100 kept)
// Scores are stored in Workers KV. The project needs a KV binding named SCORES
// (Cloudflare dashboard → your Pages project → Settings → Bindings → KV namespace).

const GAMES = { merge: 2_000_000, jump: 2_000_000, adventure: 20_000_000, "adventure-m": 200_000 }; // max believable value per board
export const DOGS = ["crew", "dixie", "winnie", "penny", "rufus", "scout", "gracie", "casey"];
for (const dog of [...DOGS, "duck"]) GAMES["adventure-m-" + dog] = 200_000; // Pup Slope: one distance board per dog
const KEEP = 100;
const MAX_MPS = 75;   // fastest believable riding speed in meters per second (with boosts), plus a little slack below
import { cleanName, isRude, tooMany } from "../../lib/guard.js";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const top10 = list => list.slice(0, 10).map(({ name, score }) => ({ name, score }));
const read = async (kv, game) => { try { return JSON.parse((await kv.get("board:" + game)) || "[]"); } catch { return []; } };

export async function onRequest({ request, env }) {
  const kv = env.SCORES;
  if (!kv) return json({ error: "Leaderboard storage isn't connected yet (add a KV binding named SCORES)." }, 503);
  const url = new URL(request.url);

  if (request.method === "GET") {
    const game = url.searchParams.get("game");
    if (!GAMES[game]) return json({ error: "Unknown game" }, 400);
    return json({ top: top10(await read(kv, game)) });
  }

  if (request.method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
    const game = body?.game;
    if (!GAMES[game]) return json({ error: "Unknown game" }, 400);
    const name = cleanName(body?.name);
    if (name.length < 1) return json({ error: "Please enter a name" }, 400);
    if (isRude(name)) return json({ error: "Please pick a different name" }, 400);
    try { if (JSON.parse((await kv.get("banned")) || "[]").includes(name.toLowerCase())) return json({ error: "Please pick a different name" }, 400); } catch {}
    const score = Math.floor(Number(body?.score));
    if (!Number.isFinite(score) || score < 0 || score > GAMES[game]) return json({ error: "That score doesn't look right" }, 400);
    if (game.startsWith("adventure-m-")) {   // distance can't be more than the time ridden allows
      const t = Number(body?.t);
      if (!Number.isFinite(t) || t <= 0 || score > MAX_MPS*t + 40) return json({ error: "That score doesn't look right" }, 400);
    }
    if (await tooMany(kv, request, "post", 8, 600)) return json({ error: "Too many posts. Try again in a few minutes." }, 429);

    const list = await read(kv, game);
    const key = name.toLowerCase();
    const i = list.findIndex(e => e.name.toLowerCase() === key);
    let improved = true;
    if (i >= 0) { if (score <= list[i].score) improved = false; else list.splice(i, 1); }
    if (improved) {
      list.push({ name, score, at: Date.now() });
      list.sort((a, b) => b.score - a.score || a.at - b.at);
      if (list.length > KEEP) list.length = KEEP;
      await kv.put("board:" + game, JSON.stringify(list));
    }
    const idx = list.findIndex(e => e.name.toLowerCase() === key);
    return json({ top: top10(list), rank: idx >= 0 ? idx + 1 : null, name, improved, best: idx >= 0 ? list[idx].score : score });
  }

  return json({ error: "Method not allowed" }, 405);
}
