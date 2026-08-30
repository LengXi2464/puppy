// 读取昵称配置（无配置时回落到 Kuro/Puppy，避免脚本第一行报错导致日历完全不渲染）
let config = null;
try { config = JSON.parse(localStorage.getItem("puppyConfig") || "null"); } catch(e) {}
if (!config) config = { dad: "Kuro", puppy: "Puppy" };
const sloganEl = document.getElementById("sloganText");
if (sloganEl) sloganEl.innerText = `我是${config.dad}爸爸的小狗${config.puppy}`;

// db.js 里的辅助函数（imgURL）来自 db.js，它的调用点要确认函数已挂载
// 兜底：如果 db.js 没加载或 imgURL/dbGetAll 不存在，就给一个不中断渲染的默认值
function safeImgURL(ref){
    if (typeof imgURL === "function") return imgURL(ref);
    return (typeof ref === "string") ? ref : "#";
}
function safeDbGetAll(){
    if (typeof dbGetAll === "function") return dbGetAll();
    return Promise.resolve([]);
}

// 判断记录是不是视频（老记录没有 type 字段 → 按图片处理，向后兼容）
function isVideoRec(r){
    if(r.type) return r.type === "video";
    // 兜底：没 type 但 URL 有常见视频后缀也认为是视频
    const url = typeof r.img === "string" ? r.img : "";
    return /\.(webm|mp4|mov|ogv|m4v)(\?|$)/i.test(url);
}

// 预览弹窗：支持一条或多条记录（多记录时显示横向滚动缩略图条 + 当前大图）
function openPreview(records){
    if(!records) return;
    const list = Array.isArray(records) ? records : [records];
    let idx = 0;

    const wrap = document.createElement("div");
    wrap.className = "preview-mask";
    wrap.onclick = e => { if(e.target===wrap) wrap.remove(); };
    const inner = document.createElement("div");
    inner.className = "preview-box";
    const close = document.createElement("button");
    close.className = "preview-close";
    close.innerText = "×";
    close.onclick = () => wrap.remove();
    inner.appendChild(close);

    const stage = document.createElement("div");
    stage.className = "preview-stage";

    const strip = document.createElement("div");
    strip.className = "preview-strip";

    function show(i){
        idx = (i + list.length) % list.length;
        stage.innerHTML = "";
        const r = list[idx];
        const url = safeImgURL(r.img);
        if(isVideoRec(r)){
            const v = document.createElement("video");
            v.controls = true; v.playsInline = true; v.preload = "auto"; v.src = url;
            stage.appendChild(v);
        }else{
            const img = document.createElement("img");
            img.src = url;
            stage.appendChild(img);
        }
        // strip 选中态
        strip.querySelectorAll(".strip-item").forEach((el, k) => {
            el.classList.toggle("active", k === idx);
        });
        strip.scrollTo({ left: strip.children[idx]?.offsetLeft - 12, behavior: "smooth" });
    }

    list.forEach((r, i) => {
        const it = document.createElement("div");
        it.className = "strip-item";
        if(isVideoRec(r)){
            it.classList.add("strip-video");
            const ico = document.createElement("div");
            ico.className = "strip-play"; it.appendChild(ico);
        }else{
            it.style.backgroundImage = `url(${safeImgURL(r.img)})`;
        }
        it.onclick = () => show(i);
        strip.appendChild(it);
    });

    // 左右切换按钮（当有多张时才显示）
    if(list.length > 1){
        const prev = document.createElement("button");
        prev.className = "preview-nav";
        prev.style.left = "10px";
        prev.innerText = "‹";
        prev.onclick = () => show(idx - 1);
        const next = document.createElement("button");
        next.className = "preview-nav";
        next.style.right = "10px";
        next.innerText = "›";
        next.onclick = () => show(idx + 1);
        inner.appendChild(prev); inner.appendChild(next);
    }

    inner.appendChild(stage);
    inner.appendChild(strip);
    wrap.appendChild(inner);
    document.body.appendChild(wrap);
    show(0);
}

// 简易日历渲染（当月日期）
async function renderCalendar(){
    let records = [];
    try { records = await safeDbGetAll(); } catch (e) { records = []; }
    const box = document.getElementById("calendarBox");
    if (!box) return;
    box.innerHTML = "";
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year,month,1).getDay();
    const totalDays = new Date(year,month+1,0).getDate();

    // 填充前面空白格子
    for(let i=0;i<firstDay;i++){
        const div = document.createElement("div");
        div.className = "day-cell";
        box.appendChild(div);
    }
    // 填充日期
    for(let d=1;d<=totalDays;d++){
        const div = document.createElement("div");
        div.className = "day-cell";
        div.innerText = d;
        const dateStr = `${year}/${month+1}/${d}`;
        const dayRecords = records.filter(r=>r.date === dateStr);
        if(dayRecords.length){
            const first = dayRecords[0];
            if(isVideoRec(first)){
                div.classList.add("has-video");
                const icon = document.createElement("div");
                icon.className = "play-icon";
                div.appendChild(icon);
            }else{
                div.classList.add("has-img");
                div.style.backgroundImage = `url(${safeImgURL(first.img)})`;
            }
            if(dayRecords.length > 1){
                const badge = document.createElement("div");
                badge.className = "cell-badge";
                badge.innerText = `+${dayRecords.length}`;
                div.appendChild(badge);
            }
            div.style.cursor = "pointer";
            div.onclick = () => openPreview(dayRecords);
        }
        box.appendChild(div);
    }
}
// 启动渲染，任何报错都不让页面白屏
renderCalendar().catch((e) => {
    const box = document.getElementById("calendarBox");
    if (box) box.innerText = "日历加载失败：" + String(e?.message || e) + "（可刷新重试）";
});
