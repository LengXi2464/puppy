// Pages Functions: POST /api/send-file
// 前端把 zip/任意文件 Blob 直接传到这里 → Worker 用 TG Bot sendDocument 发到 TG 频道/群组
// body: multipart/form-data; 字段名必须为 "file"（<input type=file>或 new FormData().append("file", blob, "xxx.zip")）
//       可选字段: "caption" 附带文字说明

function corsJson(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(JSON.stringify(data), { ...init, headers });
}

const TG_FILE_LIMIT = 48 * 1024 * 1024; // Telegram Bot API 单文件约 50MB，留点余量 48MB

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return corsJson("ok", { status: 204 });
  if (request.method !== "POST") return corsJson({ ok: false, err: "method" }, { status: 405 });

  try {
    const fd = await request.formData();
    const file = fd.get("file");
    const caption = (fd.get("caption") || "").toString().slice(0, 1000);
    if (!file || !(file instanceof File)) {
      return corsJson({ ok: false, err: "missing field 'file'" }, { status: 400 });
    }
    const size = file.size;
    const name = file.name || "upload.zip";

    // 单文件硬性限制（官方 bot HTTP API 上限约 50MB）
    if (size > TG_FILE_LIMIT) {
      return corsJson({
        ok: false,
        err: `file_too_large: ${Math.round(size/1024/1024)}MB > limit ~50MB. 需要分段打包再发。`,
        limitMB: Math.round(TG_FILE_LIMIT/1024/1024),
      }, { status: 413 });
    }

    // 把 file 包进新 FormData，转给 TG sendDocument
    const tgFd = new FormData();
    tgFd.append("chat_id", env.TG_Chat_ID);
    tgFd.append("document", file, name);
    if (caption) tgFd.append("caption", caption);

    const resp = await fetch(`https://api.telegram.org/bot${env.TG_Bot_Token}/sendDocument`, {
      method: "POST",
      body: tgFd,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok) {
      return corsJson({
        ok: false,
        err: (data && data.description) || `telegram http ${resp.status}`,
        tg: data,
      }, { status: 502 });
    }

    return corsJson({ ok: true, size, name, tg: {
      file_id: data.result.document?.file_id,
      file_name: data.result.document?.file_name,
      message_id: data.result.message_id,
    }});
  } catch (e) {
    return corsJson({ ok: false, err: String(e?.message || e) }, { status: 500 });
  }
}
