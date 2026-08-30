// Pages Functions: GET /api/setup  一键设置 Telegram Bot webhook
// 部署完 Pages 后，浏览器访问 https://你的Pages地址/api/setup  就能自动把 webhook 挂上

function corsJson(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const hook = `${url.origin}/api/webhook`;
  const tg = await fetch(
    `https://api.telegram.org/bot${env.TG_Bot_Token}/setWebhook?url=${encodeURIComponent(hook)}`
  );
  const data = await tg.json();
  return corsJson({ ok: data.ok, webhook: hook, tg: data });
}
