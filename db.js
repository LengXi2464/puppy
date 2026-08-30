// IndexedDB 存储打卡记录（容量远大于 localStorage，适合长期使用）
// v2：主键改为自增 id，date 只作普通字段——修复旧版同一天多次打卡互相覆盖导致丢数据的 bug
const DB_NAME = "puppyDB";
const STORE = "checkRecords";
const DB_VERSION = 2;

function openDB(){
    return new Promise((resolve,reject)=>{
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e=>{
            const db = e.target.result;
            const tx = e.target.transaction;
            if (db.objectStoreNames.contains(STORE)) {
                // 旧库主键是 date：同一天 put 会覆盖前一条 → 读取全部后重建为自增 id
                const getAllReq = tx.objectStore(STORE).getAll();
                getAllReq.onsuccess = ()=>{
                    const records = getAllReq.result || [];
                    db.deleteObjectStore(STORE);
                    const s = db.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});
                    s.createIndex("date","date");
                    for(const r of records){ s.put(r); }
                };
            } else {
                const s = db.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});
                s.createIndex("date","date");
            }
        };
        req.onsuccess = e=>resolve(e.target.result);
        req.onerror = ()=>reject(req.error);
        req.onblocked = ()=>reject(new Error("数据库被其他标签页占用，请关闭其他本站页面后刷新"));
    });
}

async function dbGetAll(){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
        const req = db.transaction(STORE,"readonly").objectStore(STORE).getAll();
        req.onsuccess = ()=>{ db.close(); resolve(req.result||[]); };
        req.onerror = ()=>reject(req.error);
    });
}

async function dbPut(record){
    const db = await openDB();
    return new Promise((resolve,reject)=>{
        const tx = db.transaction(STORE,"readwrite");
        tx.objectStore(STORE).put(record);
        tx.oncomplete = ()=>{ db.close(); resolve(); };
        tx.onerror = ()=>reject(tx.error);
    });
}

// 旧 base64 数据转 Blob
function base64ToBlob(dataURL){
    const [head, data] = dataURL.split(",");
    const mime = head.match(/:(.*?);/)[1];
    const bin = atob(data);
    const arr = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr],{type:mime});
}

// 兼容两种记录：远程链接字符串 / 本地Blob
function imgURL(img){
    return typeof img === "string" ? img : URL.createObjectURL(img);
}

// 一次性迁移：localStorage 旧记录 → IndexedDB
async function migrateOldRecords(){
    const old = JSON.parse(localStorage.getItem("checkRecords")||"null");
    if(!old) return;
    for(const r of old){
        await dbPut({date:r.date, img:base64ToBlob(r.img)});
    }
    localStorage.removeItem("checkRecords");
}
