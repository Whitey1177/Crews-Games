// Players can report an offensive leaderboard name. Reports show up on the admin page.
//   POST /api/report {game, name}
import { DOGS } from "./scores.js";
import { tooMany } from "../../lib/guard.js";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const kv = env.SCORES;
  if (!kv) return json({ error: "Not available" }, 503);
  let body; try { body = await request.json(); } catch { return json({ error: "Bad request" }, 400); }
  const game = String(body?.game || ""), name = String(body?.name || "").slice(0, 20);
  if (!DOGS.some(d => game === "adventure-m-" + d) || !name) return json({ error: "Bad request" }, 400);
  if (await tooMany(kv, request, "report", 10, 600)) return json({ ok: true });   // quietly ignore report spam
  let list = []; try { list = JSON.parse((await kv.get("reports")) || "[]"); } catch {}
  const r = list.find(x => x.game === game && x.name.toLowerCase() === name.toLowerCase());
  if (r){ r.n = (r.n || 1) + 1; r.at = Date.now(); } else list.unshift({ game, name, n: 1, at: Date.now() });
  if (list.length > 200) list.length = 200;
  await kv.put("reports", JSON.stringify(list));
  return json({ ok: true });
}
