// OMNI-KEY Gate — выдаёт ОДНОРАЗОВУЮ ссылку в закрытый канал Alpha владельцу пасса GatePass.
// Как проверяется: 1) кошелёк подписывает сообщение (бесплатно, это НЕ транзакция),
// 2) Worker восстанавливает адрес из подписи, 3) читает GatePass.accessLevel(адрес) из блокчейна,
// 4) если уровень >= 1 — просит Telegram создать ссылку на 1 вход, действует 24 часа.
// Секреты (BOT_TOKEN, CHAT_ID) хранятся только в Cloudflare. В код они не записываются.
import { verifyMessage } from "ethers";

const GATEPASS = "0x289E3BD13a0d5919eAb7D063930027287937B7aD";
const SEL_ACCESS_LEVEL = "0x2f259a00"; // accessLevel(address)
const ORIGIN = "https://omni-key-kinetix.github.io";
const RPCS = [
  "https://bsc-rpc.publicnode.com",
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
];
const MAX_ISSUES = 2;        // сколько раз можно получить ссылку на один кошелёк (потеряли — 2-я)
const LINK_TTL = 24 * 3600;  // жизнь ссылки, секунды
const SIG_WINDOW = 600;      // подпись действительна 10 минут

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
const SIG_RE = /^0x[0-9a-fA-F]{130}$/;

function cors(req) {
  const o = req.headers.get("Origin");
  const h = {
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (o === ORIGIN) {
    h["Access-Control-Allow-Origin"] = ORIGIN;
    h["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return h;
}
const J = (req, status, obj) => new Response(JSON.stringify(obj), { status, headers: cors(req) });

async function rpcCall(to, data) {
  let last;
  for (const url of RPCS) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }),
      });
      const j = await r.json();
      if (j && typeof j.result === "string" && j.result.startsWith("0x")) return j.result;
      last = j && j.error ? j.error.message : "bad rpc";
    } catch (e) { last = String(e); }
  }
  throw new Error("rpc_failed: " + last);
}

async function accessLevel(addr) {
  const data = SEL_ACCESS_LEVEL + addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const res = await rpcCall(GATEPASS, data);
  return Number(BigInt(res));
}

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export function claimMessage(addr, time) {
  return `OMNI-KEY Alpha access\nWallet: ${addr.toLowerCase()}\nTime: ${time}`;
}

async function handleClaim(req, env) {
  if (!env.BOT_TOKEN || !env.CHAT_ID || !env.GATE_KV) return J(req, 503, { error: "not_configured" });
  if (req.headers.get("Origin") !== ORIGIN) return J(req, 403, { error: "origin" });
  let body;
  try {
    const txt = await req.text();
    if (txt.length > 2000) return J(req, 413, { error: "too_big" });
    body = JSON.parse(txt);
  } catch { return J(req, 400, { error: "bad_json" }); }

  const address = String(body.address || "");
  const time = Number(body.time);
  const signature = String(body.signature || "");
  if (!ADDR_RE.test(address) || !SIG_RE.test(signature) || !Number.isInteger(time)) return J(req, 400, { error: "bad_input" });
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - time) > SIG_WINDOW) return J(req, 400, { error: "expired_signature" });

  let signer;
  try { signer = verifyMessage(claimMessage(address, time), signature); } catch { return J(req, 400, { error: "bad_signature" }); }
  if (signer.toLowerCase() !== address.toLowerCase()) return J(req, 403, { error: "signature_mismatch" });

  let level;
  try { level = await accessLevel(address); } catch { return J(req, 502, { error: "chain_unavailable" }); }
  if (level < 1) return J(req, 403, { error: "no_pass" });

  const key = "c:" + address.toLowerCase();
  const prev = await env.GATE_KV.get(key, "json");
  const n = prev && Number.isInteger(prev.n) ? prev.n : 0;
  if (n >= MAX_ISSUES) return J(req, 409, { error: "limit_reached" });
  if (prev && prev.link) { try { await tg(env, "revokeChatInviteLink", { chat_id: env.CHAT_ID, invite_link: prev.link }); } catch {} }

  const exp = now + LINK_TTL;
  const r = await tg(env, "createChatInviteLink", {
    chat_id: env.CHAT_ID, member_limit: 1, expire_date: exp, name: ("pass " + address.slice(0, 8) + " L" + level).slice(0, 32),
  });
  const link = r && r.ok && r.result && r.result.invite_link;
  if (typeof link !== "string" || !/^https:\/\/t\.me\/\+[A-Za-z0-9_-]+$/.test(link)) return J(req, 502, { error: "telegram_failed" });

  await env.GATE_KV.put(key, JSON.stringify({ n: n + 1, link, t: now, level }));
  return J(req, 200, { link, expires: exp, level, issued: n + 1, max: MAX_ISSUES });
}

// Помощник при настройке: показывает id каналов, где бот получил сообщение. Секретов не раскрывает.
async function handleChatIds(req, env) {
  if (!env.BOT_TOKEN) return J(req, 503, { error: "not_configured" });
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getUpdates?allowed_updates=${encodeURIComponent('["channel_post","my_chat_member"]')}`);
  const j = await r.json();
  const seen = {};
  for (const u of (j.result || [])) {
    const c = (u.channel_post && u.channel_post.chat) || (u.my_chat_member && u.my_chat_member.chat);
    if (c) seen[c.id] = { id: c.id, title: c.title, type: c.type };
  }
  return J(req, 200, { ok: j.ok === true, chats: Object.values(seen) });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
    if (url.pathname === "/health") return J(req, 200, { ok: true, configured: !!(env.BOT_TOKEN && env.CHAT_ID && env.GATE_KV) });
    if (url.pathname === "/chat-ids" && req.method === "GET") return handleChatIds(req, env);
    if (url.pathname === "/claim" && req.method === "POST") return handleClaim(req, env);
    return J(req, 404, { error: "not_found" });
  },
};
