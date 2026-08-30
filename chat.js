// 聊天页逻辑
const statusDom = document.getElementById("connStatus");
const listDom   = document.getElementById("chatList");
const formDom   = document.getElementById("chatForm");
const inputDom  = document.getElementById("chatText");

let lastId = 0;
let pollingTimer = null;
let lastPollTs = 0;

function setStatus(text, ok) {
    statusDom.textContent = text;
    statusDom.style.color = ok === true ? "#8fd18f" : ok === false ? "#e47a7a" : "";
}

// 防呆：没填 endpoint 就报错
if (!CHAT_ENDPOINT) {
    setStatus("请先在 chat.html 第 28 行填好 Worker 地址（CHAT_ENDPOINT）", false);
}

function fmtTime(ts) {
    const d = new Date(ts * 1000);
    return `${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function renderMsgs(msgs) {
    listDom.innerHTML = "";
    if (!msgs.length) {
        const p = document.createElement("div");
        p.className = "msg-empty";
        p.textContent = "还没有消息～说第一句话吧🐶";
        listDom.appendChild(p);
        return;
    }
    for (const m of msgs) {
        const isMe = m.from === "puppy";
        const el = document.createElement("div");
        el.className = "msg " + (isMe ? "me" : "them");
        el.textContent = m.text;
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.innerHTML = `<span>${escapeHtml(m.who || (isMe ? "APP" : "群"))}</span><span>${fmtTime(m.ts)}</span>`;
        el.appendChild(meta);
        listDom.appendChild(el);
    }
    listDom.scrollTop = listDom.scrollHeight;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

async function fetchMsgs() {
    if (!CHAT_ENDPOINT) return;
    try {
        const r = await fetch(CHAT_ENDPOINT + "/messages?_=" + Date.now());
        const j = await r.json();
        if (j.ok) {
            renderMsgs(j.data || []);
            setStatus("已连接 · 自动刷新中", true);
            if (j.data && j.data.length) {
                const last = j.data[j.data.length - 1];
                if (last.id) lastId = last.id;
            }
            lastPollTs = Date.now();
        } else {
            setStatus("拉消息失败：" + (j.err || "unknown"), false);
        }
    } catch (e) {
        setStatus("网络错误，稍后会自动重试", false);
    }
}

async function sendMsg(e) {
    e.preventDefault();
    if (!CHAT_ENDPOINT) { alert("请先在 chat.html 第 28 行填 CHAT_ENDPOINT"); return; }
    const text = inputDom.value.trim();
    if (!text) return;
    inputDom.value = "";
    const btn = formDom.querySelector("button");
    btn.disabled = true;
    try {
        const r = await fetch(CHAT_ENDPOINT + "/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        const j = await r.json();
        if (!j.ok) {
            alert("发送失败：" + (j.err || "unknown"));
            inputDom.value = text; // 恢复
        }
    } catch (err) {
        alert("发送失败：" + err.message);
        inputDom.value = text;
    } finally {
        btn.disabled = false;
        fetchMsgs();
    }
}

// 启动：第一次拉 + 每 6 秒轮询
fetchMsgs();
pollingTimer = setInterval(() => {
    // 如果用户正在输入/可能在看，保持刷新
    fetchMsgs();
}, 6000);

// 页面从后台切回前台 → 立刻拉一次
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) fetchMsgs();
});
