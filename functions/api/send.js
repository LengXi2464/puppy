// Pages Functions: POST /api/send  前端发消息 -> Telegram 群组
// body: {text}

function corsJson(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(JSON.stringify(data), { ...init, headers });
}

const KV_KEY_MSGS = "messages";
const MAX_MSGS = 200;

async function pushMessage(KV, msg) {
  const raw = await KV.get(KV_KEY_MSGS, "text");
  const list = raw ? JSON.parse(raw) : [];
  list.push(msg);
  if (list.length > MAX_MSGS) list.splice(0, list.length - MAX_MSGS);
  await KV.put(KV_KEY_MSGS, JSON.stringify(list));
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsJson("ok", { status: 204 });
  if (request.method !== "POST") return corsJson({ ok: false, err: "method" }, { status: 405 });

  const KV = env.PUPPY_CHAT;
  if (!KV) return corsJson({ ok: false, err: "KV not bound. 在 Pages 设置里绑定 KV 命名空间，binding 名 PUPPY_CHAT" }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return corsJson({ ok: false, err: "bad json" }, { status: 400 }); }
  const text = (body.text || "").trim().slice(0, 4000);
  if (!text) return corsJson({ ok: false, err: "empty" }, { status: 400 });

  const tg = await fetch(`https://api.telegram.org/bot${env.TG_Bot_Token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TG_Chat_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const data = await tg.json();
  if (!data.ok) return corsJson({ ok: false, err: data.description, tg: data }, { status: 502 });

  const msg = {
    id: data.result.message_id,
    from: "puppy",
    who: "APP",
    text,
    ts: Math.floor(Date.now() / 1000),
  };
  await pushMessage(KV, msg);
  return corsJson({ ok: true, msg });
}
