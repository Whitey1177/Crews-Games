// Leaderboard admin (only for you). Protected by the ADMIN_KEY secret set in Cloudflare:
//   Pages project → Settings → Variables and Secrets → Add → type "Secret", name ADMIN_KEY.
//   GET  /api/admin                                   → every dog's board (all entries) + banned names
//   POST /api/admin {action:"delete", game, name, ban} → remove a name (and optionally ban it)
//   POST /api/admin {action:"unban", name}            → allow a banned name again
//   POST /api/admin {action:"dismiss", game, name}    → clear a player report without removing the name
// Send the key in the "x-admin-key" header.
import { DOGS } from "./scores.js";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function keyOk(given, real) {
  if (!real || real.length < 8 || !given) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(given)), crypto.subtle.digest("SHA-256", enc.encode(real))]);
  const x = new Uint8Array(a), y = new Uint8Array(b); let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}
const readList = async (kv, key) => { try { return JSON.parse((await kv.get(key)) || "[]"); } catch { return []; } };

export async function onRequest({ request, env }) {
  const kv = env.SCORES;
  if (!kv) return json({ error: "Leaderboard storage isn't connected (KV binding SCORES)." }, 503);
  if (!env.ADMIN_KEY) return json({ error: "No admin password set yet. Add a secret named ADMIN_KEY in Cloudflare (at least 8 characters)." }, 503);
  if (!(await keyOk(request.headers.get("x-admin-key"), env.ADMIN_KEY))) { await sleep(800); return json({ error: "Wrong password" }, 401); }

  if (request.method === "GET") {
    const boards = {};
    await Promise.all(DOGS.map(async d => { boards[d] = await readList(kv, "board:adventure-m-" + d); }));
    return json({ boards, banned: await readList(kv, "banned"), reports: await readList(kv, "reports") });
  }

  if (request.method === "POST") {
    let body; try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
    const name = String(body?.name || "").toLowerCase();
    if (!name) return json({ error: "Missing name" }, 400);
    const banned = await readList(kv, "banned");

    if (body.action === "delete") {
      const game = String(body.game || "");
      if (!DOGS.some(d => game === "adventure-m-" + d)) return json({ error: "Unknown board" }, 400);
      const list = await readList(kv, "board:" + game);
      const left = list.filter(e => e.name.toLowerCase() !== name);
      if (left.length !== list.length) await kv.put("board:" + game, JSON.stringify(left));
      if (body.ban && !banned.includes(name)) { banned.push(name); await kv.put("banned", JSON.stringify(banned)); }
      const reports = (await readList(kv, "reports")).filter(r => !(r.game === game && r.name.toLowerCase() === name));
      await kv.put("reports", JSON.stringify(reports));
      return json({ ok: true, removed: list.length - left.length, banned, reports });
    }
    if (body.action === "dismiss") {
      const reports = (await readList(kv, "reports")).filter(r => !(r.game === String(body.game) && r.name.toLowerCase() === name));
      await kv.put("reports", JSON.stringify(reports));
      return json({ ok: true, reports });
    }
    if (body.action === "unban") {
      const left = banned.filter(n => n !== name);
      await kv.put("banned", JSON.stringify(left));
      return json({ ok: true, banned: left });
    }
    return json({ error: "Unknown action" }, 400);
  }
  return json({ error: "Method not allowed" }, 405);
}
