// Pages Functions: POST /api/webhook  Telegram Bot 的回调
// 群组里出现新消息时，Telegram 主动 POST 过来，写入 KV

function corsJson(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*");
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
  if (request.method !== "POST") return corsJson({ ok: false, err: "method" }, { status: 405 });

  const KV = env.PUPPY_CHAT;
  if (!KV) return corsJson({ ok: false, err: "KV not bound" }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return corsJson({ ok: false }); }
  const upd = body.message || body.channel_post || body.edited_message || body.edited_channel_post;
  if (upd && upd.chat && String(upd.chat.id) === String(env.TG_Chat_ID) && upd.text) {
    const msg = {
      id: upd.message_id,
      from: "telegram",
      who: upd.from?.first_name || upd.sender_chat?.title || "群成员",
      text: upd.text,
      ts: upd.date || Math.floor(Date.now() / 1000),
    };
    await pushMessage(KV, msg);
  }
  return corsJson({ ok: true });
}
