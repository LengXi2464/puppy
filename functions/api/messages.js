// Pages Functions: GET /api/messages  拉聊天记录（最近 200 条）
// 需要 Pages 绑定 KV：KV 命名空间名 PUPPY_CHAT，binding 名 PUPPY_CHAT
// 环境变量：TG_Bot_Token、TG_Chat_ID（你已经在 Pages 填了，直接用）

const KV_KEY_MSGS = "messages";
const MAX_MSGS = 200;

function corsJson(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  // Pages Functions 和前端同源，CORS 其实无所谓；但手机/PWA 跨域场景会用到
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsJson("ok", { status: 204 });
  if (request.method !== "GET") return corsJson({ ok: false, err: "method" }, { status: 405 });

  const KV = env.PUPPY_CHAT;
  if (!KV) return corsJson({ ok: false, err: "KV not bound" }, { status: 500 });
  const raw = await KV.get(KV_KEY_MSGS, "text");
  const list = raw ? JSON.parse(raw) : [];
  return corsJson({ ok: true, data: list });
}
