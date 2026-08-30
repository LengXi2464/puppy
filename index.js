const dadInput = document.getElementById('dad');
const pupInput = document.getElementById('puppy');
const tipDom = document.getElementById('tipShow');

dadInput.oninput = ()=>{
    tipDom.innerText = `${dadInput.value} × ${pupInput.value}`;
}
pupInput.oninput = ()=>{
    tipDom.innerText = `${dadInput.value} × ${pupInput.value}`;
}

function saveInfo(){
    const dadName = dadInput.value.trim();
    const pupName = pupInput.value.trim();
    if(!dadName || !pupName){
        alert("昵称不能为空");
        return;
    }
    localStorage.setItem("puppyConfig", JSON.stringify({
        dad: dadName,
        puppy: pupName
    }));
    location.href = "home.html";
}

// 已保存过昵称时，回填现有配置，方便修改
const savedConfig = JSON.parse(localStorage.getItem("puppyConfig"));
if(savedConfig){
    dadInput.value = savedConfig.dad;
    pupInput.value = savedConfig.puppy;
    tipDom.innerText = `${savedConfig.dad} × ${savedConfig.puppy}`;
}

// 已经保存过昵称 → 自动跳首页；带 ?edit 参数时停留在本页（用于修改昵称）
if(localStorage.getItem("puppyConfig") && !location.search.includes("edit")){
    location.href = "home.html";
}

// ============= 打包全部打卡 → 1 个 zip → 图床 → TG 1 条下载链接 =============

function setExportStats(html, pct, sub){
    const s = document.getElementById("exportStats");
    const bar = document.getElementById("exportBar");
    const subEl = document.getElementById("exportSub");
    if(s) s.innerHTML = html;
    if(bar) bar.style.width = Math.max(0, Math.min(100, pct||0)) + "%";
    if(sub !== undefined && subEl) subEl.innerText = sub || "";
}

// 判断记录是不是视频（与 calendar.js 保持一致）
function isVideoRec(r){
    if(r.type) return r.type === "video";
    const url = typeof r.img === "string" ? r.img : "";
    return /\.(webm|mp4|mov|ogv|m4v)(\?|$)/i.test(url);
}

// 把一条记录里的 img(Blob or http URL) 解析成可用于下载的 Blob
async function fetchRecBlob(rec){
    const src = rec.img;
    if(src instanceof Blob) return src;
    if(typeof src === "string"){
        const r = await fetch(src, { mode: "cors" });
        if(!r.ok) throw new Error("fetch_failed_" + r.status);
        return await r.blob();
    }
    throw new Error("invalid_ref_type");
}

function extForRec(rec, blob){
    const t = (blob && blob.type) || "";
    if(isVideoRec(rec) || t.startsWith("video/")){
        if(/mp4|avc1|h264/i.test(t)) return ".mp4";
        return ".webm";
    }
    if(/png/i.test(t)) return ".png";
    if(/gif/i.test(t)) return ".gif";
    if(/webp/i.test(t)) return ".webp";
    if(/heic|heif/i.test(t)) return ".heic";
    const name = (rec.name || "").toLowerCase();
    if(/\.png$/.test(name)) return ".png";
    if(/\.gif$/.test(name)) return ".gif";
    if(/\.webp$/.test(name)) return ".webp";
    return ".jpg";
}

// 上传 zip 到 img.xkuro.org，返回下载链接（带上传进度）
async function uploadZipToHost(zipBlob, zipName, onProgress){
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "https://img.xkuro.org/upload");
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
        };
        xhr.onload = () => {
            try{
                const data = JSON.parse(xhr.responseText);
                if (data && data[0] && data[0].src) {
                    resolve("https://img.xkuro.org" + data[0].src);
                } else {
                    reject(new Error((data && data.error) || "图床上传返回格式异常"));
                }
            }catch(e){
                reject(new Error("图床上传响应解析失败：" + (xhr.responseText||"").slice(0,200)));
            }
        };
        xhr.onerror = () => reject(new Error("图床上传网络错误"));
        const fd = new FormData();
        fd.append("file", zipBlob, zipName);
        xhr.send(fd);
    });
}

// 用 TG Bot 发一条纯文本消息（无 50MB 限制）
async function sendTextToTG(text){
    const fd = new FormData();
    fd.append("text", text);
    const resp = await fetch("/api/send", { method: "POST", body: fd });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok) throw new Error((data && data.err) || (data && data.description) || `http ${resp.status}`);
    return data;
}

let exportRunning = false;

function closeExport(){
    if(exportRunning){
        if(!confirm("打包正在进行，确定要关闭吗？zip 可能还未上传到TG/图床")) return;
    }
    document.getElementById("exportModal").style.display = "none";
}

async function exportAllToTG(){
    if(exportRunning) return;
    const records = await dbGetAll();
    if(!records.length){ alert("还没有任何打卡记录～"); return; }
    if(!confirm(`确定要把本机 ${records.length} 条打卡内容（照片/视频）全部打包发到 TG 频道吗？\n永远只会生成 1 个 zip，大小仅受你浏览器内存限制。`)) return;

    document.getElementById("exportModal").style.display = "flex";
    exportRunning = true;
    const failArr = [];
    try{
        // 阶段 1：按日期分组，把每条记录的原始 Blob 拉回来（进度 0~50%）
        setExportStats(`开始处理 <b>${records.length}</b> 条记录，正在把原图/视频从图床或本地取回…`, 0, "");
        const byDate = {};
        let totalBytes = 0, downloaded = 0;
        for(let i = 0; i < records.length; i++){
            const r = records[i];
            try{
                const blob = await fetchRecBlob(r);
                totalBytes += blob.size;
                const d = r.date || "未知日期";
                (byDate[d] = byDate[d] || []).push({
                    idx: i + 1,
                    rec: r,
                    blob: blob,
                });
            }catch(e){
                failArr.push({ date: r.date, rec: `第${i+1}条`, err: String(e?.message || e) });
            }
            downloaded++;
            const pct = Math.round(downloaded / records.length * 50);
            setExportStats(
                `取回文件中… <b>${downloaded}/${records.length}</b> 条，合计 <b>${(totalBytes/1024/1024).toFixed(1)}MB</b><br>失败 ${failArr.length} 条将跳过。`,
                pct, ""
            );
        }

        // 拍平：按日期文件夹 / 文件
        const flatItems = [];
        const dateKeys = Object.keys(byDate).sort();
        for(const d of dateKeys){
            const folder = d.replace(/\//g, "-");
            byDate[d].forEach((entry, k) => {
                const ext = extForRec(entry.rec, entry.blob);
                const baseName = (entry.rec.name || `file_${entry.idx}`).replace(/\.[^.]+$/, "");
                flatItems.push({
                    folder,
                    name: `${String(k+1).padStart(3,"0")}_${baseName}${ext}`,
                    blob: entry.blob,
                    size: entry.blob.size,
                });
            });
        }

        if(!flatItems.length){
            throw new Error("没有成功拿到任何内容，打包终止。");
        }

        const dateTag = new Date().toISOString().slice(0,10);
        const zipName = `puppy_full_backup_${dateTag}.zip`;
        setExportStats(
            `文件全部就绪：<b>${flatItems.length}</b> 个文件，原始大小 <b>${(totalBytes/1024/1024).toFixed(1)}MB</b><br>正在生成 1 个 zip（${zipName}）…`,
            50, `0%`
        );
        document.getElementById("exportTitle").innerText = "打包中（1/1）";

        // 阶段 2：生成 1 个 zip（进度 50%~80%）
        const zip = new JSZip();
        const root = zip.folder(`puppy_full_${dateTag}`);
        const seen = new Set();
        for(const it of flatItems){
            if(!seen.has(it.folder)){ seen.add(it.folder); root.folder(it.folder); }
            root.file(it.folder + "/" + it.name, it.blob, { binary: true });
        }
        const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "STORE",
            compressionOptions: null,
        }, (meta) => {
            const overall = Math.round(50 + 30 * (meta.percent/100));
            setExportStats(
                `生成 zip 中… <b>${Math.round(meta.percent)}%</b> · ${meta.currentFile || ""}`,
                overall, `zip ${(zipBlob && zipBlob.size)?(zipBlob.size/1024/1024).toFixed(1)+"MB":""}`
            );
        });

        // 阶段 3：上传 zip 到图床（80%~95%）
        setExportStats(
            `zip 已生成：<b>${(zipBlob.size/1024/1024).toFixed(1)}MB</b><br>正在上传到你的图床…`,
            80, `↑ 0%`
        );
        const downloadURL = await uploadZipToHost(zipBlob, zipName, (loaded, total) => {
            const p = total ? loaded / total : 0;
            const bar = Math.round(80 + 15 * p);
            setExportStats(
                `zip 上传到图床中…`,
                bar,
                `↑ ${Math.round(p*100)}%  ${(loaded/1024/1024).toFixed(1)} / ${(total/1024/1024).toFixed(1)}MB`
            );
        });

        // 阶段 4：TG 发 1 条文字消息（95%~100%）
        setExportStats(`zip 已存到图床，正在在 TG 频道发 1 条通知…`, 95, "");
        const tgLines = [];
        tgLines.push(`🐶 全部打卡备份（${dateTag}）`);
        tgLines.push(`共 ${records.length} 条记录，${flatItems.length} 个文件，打包 ${(zipBlob.size/1024/1024).toFixed(1)}MB`);
        if(failArr.length) tgLines.push(`⚠️ ${failArr.length} 条记录打包失败。`);
        tgLines.push(`📥 下载：${downloadURL}`);
        await sendTextToTG(tgLines.join("\n"));

        const summaryHtml = [];
        summaryHtml.push(`✅ 全部完成！<br>· 共打包 <b>${flatItems.length}</b> 个文件（${records.length} 条记录中的可用部分）<br>· zip 大小 <b>${(zipBlob.size/1024/1024).toFixed(1)}MB</b><br>· TG 频道已收到 1 条消息（含下载链接）`);
        if(failArr.length){
            summaryHtml.push(`<br>❌ 打包失败 <b>${failArr.length}</b> 条：<br>` +
                failArr.slice(0,20).map(f => `· ${f.date||''} ${f.rec||''}：${f.err}`).join("<br>") +
                (failArr.length > 20 ? `<br>还有 ${failArr.length - 20} 条未显示…` : ""));
        }
        summaryHtml.push(`<br><a href="${downloadURL}" target="_blank" style="color:#f2c288;">📥 直接在浏览器下载这个 zip</a>`);
        setExportStats(summaryHtml.join(""), 100, "可以关闭窗口了～");
        document.getElementById("exportTitle").innerText = "全部备份完成（1 个 zip）";
    }catch(e){
        setExportStats(`❌ 流程异常：<b>${String(e?.message||e)}</b><br>可关掉窗口再试一次。`, 0, "");
    }finally{
        exportRunning = false;
    }
}
