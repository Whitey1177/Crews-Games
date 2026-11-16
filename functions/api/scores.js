// Crew's Games leaderboard (Cloudflare Pages Function)
//   GET  /api/scores?game=<id>          → top 10
//   POST /api/scores {game, name, score} → submit (each name keeps its best; top 100 kept)
// Scores are stored in Workers KV. The project needs a KV binding named SCORES
// (Cloudflare dashboard → your Pages project → Settings → Bindings → KV namespace).

const GAMES = { merge: 2_000_000, jump: 2_000_000, adventure: 20_000_000, "adventure-m": 200_000 }; // max believable value per board
const KEEP = 100;
const BLOCK = ["fuck", "shit", "bitch", "cunt", "nigg", "fag", "slut", "whore", "cock", "pussy", "rape", "nazi"];

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export function cleanName(raw) {
  return String(raw ?? "").normalize("NFKC").replace(/[^\p{L}\p{N} _.'\-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 14);
}
export function isRude(name) {
  const flat = name.toLowerCase().replace(/0/g, "o").replace(/[1!|]/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/\$/g, "s").replace(/[^a-z]/g, "");
  return BLOCK.some(w => flat.includes(w));
}
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
    const score = Math.floor(Number(body?.score));
    if (!Number.isFinite(score) || score < 0 || score > GAMES[game]) return json({ error: "That score doesn't look right" }, 400);

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
