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
  // token 没设置/没生效时，Telegram 同样返回 401，这里提前给出明确提示
  if (!env.TG_Bot_Token) {
    return corsJson({
      ok: false,
      webhook: hook,
      tg: { ok: false, error_code: 401, description: "环境变量 TG_Bot_Token 未设置或未生效（在 Pages 设置里添加后需重新部署）" },
    });
  }
  const tg = await fetch(
    `https://api.telegram.org/bot${env.TG_Bot_Token}/setWebhook?url=${encodeURIComponent(hook)}`
  );
  const data = await tg.json();
  return corsJson({ ok: data.ok, webhook: hook, tg: data });
}
