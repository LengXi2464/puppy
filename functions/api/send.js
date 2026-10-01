// Pages Functions: POST /api/send  发送文字消息到 Telegram（批量补传 zip 下载链接通知用）
// body 支持两种：application/json {text} 或 multipart/form-data 字段 text

function corsJson(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsJson("ok", { status: 204 });
  if (request.method !== "POST") return corsJson({ ok: false, err: "method" }, { status: 405 });

  // 兼容 JSON 和 FormData 两种请求体
  let text = "";
  const ct = request.headers.get("Content-Type") || "";
  try {
    if (ct.includes("application/json")) {
      const body = await request.json();
      text = body.text || "";
    } else if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
      const fd = await request.formData();
      text = (fd.get("text") || "").toString();
    }
  } catch { return corsJson({ ok: false, err: "bad body" }, { status: 400 }); }

  text = text.trim().slice(0, 4000);
  if (!text) return corsJson({ ok: false, err: "empty" }, { status: 400 });

  const tg = await fetch(`https://api.telegram.org/bot${env.TG_Bot_Token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TG_Chat_ID,
      text,
      disable_web_page_preview: false,
    }),
  });
  const data = await tg.json();
  if (!data.ok) return corsJson({ ok: false, err: data.description, tg: data }, { status: 502 });

  return corsJson({ ok: true, msg_id: data.result.message_id });
}
