// Shared leaderboard protection: name cleaning, blocked words, simple rate limiting.

export function cleanName(raw) {
  return String(raw ?? "").normalize("NFKC").replace(/[^\p{L}\p{N} _.'\-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 14);
}

// Words blocked anywhere inside a name (distinctive enough not to hit normal words).
const ANYWHERE = ["fuck", "fuk", "fck", "shit", "sht", "bitch", "biatch", "cunt", "nigg", "niga", "nigr", "fagot", "faggot", "slut", "whore",
  "cocksuck", "pussy", "nazi", "hitler", "porn", "penis", "vagina", "dildo", "jizz", "tits", "titties", "boob", "twat", "wank", "bollock",
  "bastard", "retard", "molest", "chink", "kike", "tranny", "gook", "wetback", "beaner", "horny", "milf", "nude", "blowjob", "handjob",
  "asshole", "ashole", "arsehole", "piss", "douche", "skank", "rapist", "killyourself", "kilyourself", "suicide", "cumshot", "cumslut",
  "motherf", "pedophil", "paedo", "incest", "bestial", "orgasm", "erection", "boner", "clit", "scrotum", "testicle", "kkk", "isis",
  "heil", "whitepower", "siegheil", "jihad", "terrorist", "dumbass", "jackass", "dipshit", "bullshit", "goddamn", "sexy", "xxx"];
// Words blocked only as a whole word (they appear inside innocent words, e.g. "class", "raccoon", "grape").
const WHOLE = ["ass", "arse", "fag", "cock", "dick", "anal", "anus", "cum", "sex", "rape", "raped", "pedo", "spic", "dyke", "coon", "negro",
  "hoe", "hoes", "thot", "kys", "prick", "semen", "nazis", "slag", "tit", "jap", "gay", "homo", "lesbo", "die", "kill", "hate"];

const leet = s => s.toLowerCase().replace(/0/g, "o").replace(/[1!|]/g, "i").replace(/3/g, "e").replace(/4|@/g, "a").replace(/5|\$/g, "s").replace(/7/g, "t").replace(/8/g, "b");
const squash = s => s.replace(/(.)\1+/g, "$1");   // "fuuuck" → "fuck"

export function isRude(name) {
  const l = leet(name);
  const flat = l.replace(/[^a-z]/g, ""), sq = squash(flat);
  if (ANYWHERE.some(w => flat.includes(w) || sq.includes(w))) return true;
  const words = l.split(/[^a-z]+/).filter(Boolean);
  return words.some(w => WHOLE.includes(w) || WHOLE.includes(squash(w)));
}

// At most `max` actions per `secs` seconds from the same connection (IP is hashed, never stored).
export async function tooMany(kv, request, kind, max, secs) {
  try {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pupslope:" + ip)));
    const key = `rl:${kind}:` + [...h.slice(0, 8)].map(b => b.toString(16).padStart(2, "0")).join("");
    const n = +(await kv.get(key)) || 0;
    if (n >= max) return true;
    await kv.put(key, String(n + 1), { expirationTtl: Math.max(60, secs) });
  } catch {}
  return false;
}
