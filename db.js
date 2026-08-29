// IndexedDB 存储打卡记录（容量远大于 localStorage，适合长期使用）
const DB_NAME = "puppyDB";
const STORE = "checkRecords";

function openDB(){
    return new Promise((resolve,reject)=>{
        const req = indexedDB.open(DB_NAME,1);
        req.onupgradeneeded = e=>{
            e.target.result.createObjectStore(STORE,{keyPath:"date"});
        };
        req.onsuccess = e=>resolve(e.target.result);
        req.onerror = ()=>reject(req.error);
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
