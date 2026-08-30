// 读取昵称配置（无配置时回落到 Kuro/Puppy，避免 null 抛错导致整页功能无法用）
let cfg;
try { cfg = JSON.parse(localStorage.getItem("puppyConfig") || "null"); } catch(e) {}
if (!cfg) cfg = { dad: "Kuro", puppy: "Puppy" };
const dadName = cfg.dad;
const pupName = cfg.puppy;
const slogan = document.getElementById("slogan");
if (slogan) slogan.innerText = `我是${dadName}爸爸的小狗${pupName}`;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let stream = null;
let capturedBlob = null;      // 拍照/录像后的成品 Blob
let capturedType = "image";  // 'image' 或 'video'
let mediaRecorder = null;
let recChunks = [];
let recTimer = null;
let recStartTs = 0;
let posterURL = null;
let posterMode = "puppy"; // 海报风格：puppy小狗版 / dad爸爸版
let dayCount = 1;

// 当前镜头：user 前置 / environment 后置
let curFacing = "user";

// 当前模式 photo/video
let curMode = "photo";

// —— 打开指定摄像头（前置 or 后置）——
async function openCamera(facing){
    if (!facing) facing = curFacing;
    // 先停掉旧的流，避免摄像头被占用
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
    // 授权成功后才展示相机框，避免权限被拒时留下黑屏
    stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: true,
    });
    document.getElementById("cameraWrap").style.display = "block";
    video.srcObject = stream;
    // 镜像：前置才开，后置关掉（防止上下左右文字反了）
    video.style.transform = facing === "user" ? "scaleX(-1)" : "none";
    // 更新按钮文字，让用户一眼看到现在是哪个镜头
    curFacing = facing;
    const btn = document.getElementById("btnCameraSwitch");
    if (btn) btn.innerText = facing === "user" ? "前置" : "后置";
    // 更新副标题，让用户知道当前用的是哪个镜头
    const sub = document.getElementById("subDesc");
    if (sub) sub.innerText = facing === "user"
        ? "吐舌头拍几张，选最好看的一张再打卡·将用前置摄像头"
        : "吐舌头拍几张，选最好看的一张再打卡·将用后置摄像头";
}

// —— 首页「打开相机」入口：统一捕获错误，避免静默无反应 ——
async function startCamera(){
    try{
        await openCamera();
    }catch(e){
        alert("无法打开摄像头：" + String(e?.message || e) + "\n请检查是否已授权相机权限，且页面通过 HTTPS 访问。");
    }
}

// —— 前/后镜头切换：点一次换一次 ——
async function switchCamera(){
    // 录像中切换会丢失当前录制，先问用户
    if (mediaRecorder && mediaRecorder.state === "recording") {
        if (!confirm("切换摄像头会停止正在录制的视频并丢弃，确定？")) return;
        stopRecording(true, true);
    }
    const prev = curFacing;
    const next = curFacing === "user" ? "environment" : "user";
    try {
        await openCamera(next);
    } catch (e) {
        alert("切换失败：" + String(e?.message || e) + "\n（可能是设备没有对应摄像头，或权限被拒）");
        // 切换失败时旧流已被停掉，尝试恢复原镜头，避免黑屏卡死
        try{ await openCamera(prev); }catch(e2){}
    }
}

// —— 拍照模式 vs 录像模式 切换 ——
function setMode(mode){
    if(mediaRecorder && mediaRecorder.state === "recording"){
        if(!confirm("切换模式会停止正在录制的视频，确定？")) return;
        stopRecording(true, true); // 丢弃当前录制
    }
    curMode = mode;
    document.getElementById("modePhoto").classList.toggle("active", mode==="photo");
    document.getElementById("modeVideo").classList.toggle("active", mode==="video");
    const btn = document.getElementById("btnCapture");
    const tip = document.getElementById("cameraTip");
    if(mode === "photo"){
        btn.innerText = "拍照";
        btn.classList.remove("recording");
        tip.innerText = "准备拍照";
        document.getElementById("recIndicator").style.display = "none";
    }else{
        btn.innerText = "开始录制";
        btn.classList.add("recording");
        tip.innerText = "录制一段短视频打卡（会录进声音）";
    }
    // 清空上一次的拍摄成果
    capturedBlob = null;
}

// —— 中间按钮点击（拍照 / 开始·停止录制） ——
function onCaptureClick(){
    if(curMode === "photo"){
        takePicture();
    }else{
        if(!mediaRecorder || mediaRecorder.state !== "recording"){
            startRecording();
        }else{
            stopRecording(false);
        }
    }
}

// —— 拍照：保留设备原始分辨率，JPEG 高质量；前置镜像后置正常 ——
function takePicture(){
    if(!video.videoWidth || !video.videoHeight){
        alert("相机还没准备好，稍等一下再拍～");
        return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    // 先重置 transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (curFacing === "user") {
        // 前置：和预览镜像一致（用户看到的自己）
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(blob => {
        capturedBlob = blob;
        capturedType = "image";
        alert("拍照完成，可以打卡！");
    }, "image/jpeg", 0.98);
}

// —— 开始录制视频：优先 MP4(H.264/AAC)，浏览器不支持时回落 WebM，不人为限制码率 ——
let selectedVideoMime = "";
let recDiscard = false; // onstop 是异步的：丢弃时用标志位阻止 onstop 回写 capturedBlob
function startRecording(){
    if(!stream){alert("摄像头未打开");return;}
    recChunks = [];
    recDiscard = false;
    // 优先 MP4（Safari 17.4+ / 未来的 Chrome 支持），不支持则回落 WebM 家族
    const candidates = [
        "video/mp4;codecs=avc1.64001f,mp4a.40.2",   // H.264 High + AAC LC
        "video/mp4;codecs=h264,aac",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
    ];
    selectedVideoMime = "";
    for(const c of candidates){
        if(MediaRecorder.isTypeSupported(c)){ selectedVideoMime = c; break; }
    }
    try{
        mediaRecorder = selectedVideoMime
            ? new MediaRecorder(stream, {mimeType: selectedVideoMime})
            : new MediaRecorder(stream);
    }catch(e){
        mediaRecorder = new MediaRecorder(stream);
    }
    mediaRecorder.ondataavailable = e => { if(e.data.size>0) recChunks.push(e.data); };
    mediaRecorder.onstop = () => {
        if(recDiscard){ recChunks = []; return; } // 已丢弃：不生成成品
        const type = (recChunks[0] && recChunks[0].type) || selectedVideoMime || "";
        capturedBlob = new Blob(recChunks, {type: type || "video/webm"});
        capturedType = "video";
        recChunks = [];
    };
    mediaRecorder.start();
    recStartTs = Date.now();
    document.getElementById("recIndicator").style.display = "flex";
    document.getElementById("recTimer").innerText = "00:00";
    recTimer = setInterval(()=>{
        const sec = Math.floor((Date.now()-recStartTs)/1000);
        const mm = String(Math.floor(sec/60)).padStart(2,"0");
        const ss = String(sec%60).padStart(2,"0");
        document.getElementById("recTimer").innerText = `${mm}:${ss}`;
    },500);
    const btn = document.getElementById("btnCapture");
    btn.innerText = "停止录制";
    // 麦克风不可用时明确提示，避免录完才发现没声音
    const hasAudio = stream.getAudioTracks && stream.getAudioTracks().length > 0;
    document.getElementById("cameraTip").innerText = hasAudio
        ? "录制中…（含声音）再次点击停止"
        : "录制中…（未检测到麦克风，视频将没有声音）";
}

// —— 停止录制（discard=丢弃；silent=不弹「录像完成」提示，供打卡流程静默调用） ——
function stopRecording(discard, silent){
    if(!mediaRecorder || mediaRecorder.state==="inactive") return;
    recDiscard = !!discard; // 必须在 stop() 之前设置，onstop 会异步触发
    mediaRecorder.stop();
    clearInterval(recTimer);
    recTimer = null;
    document.getElementById("recIndicator").style.display = "none";
    const btn = document.getElementById("btnCapture");
    if(discard){
        capturedBlob = null;
        capturedType = "video";
    }else if(!silent){
        alert("录像完成，可以打卡！");
    }
    btn.innerText = "开始录制";
    btn.classList.add("recording");
    document.getElementById("cameraTip").innerText = "录制一段短视频打卡（会录进声音）";
}

// 上传到图床，成功返回链接，失败返回null（回落本地存储）
// 图片/视频都走这里，图床 Kuro-Image（Telegraph改版）两种都支持
function a0_0x5df5(_0x3ff881,_0x40d47b){_0x3ff881=_0x3ff881-0x16a;const _0x1ce6fe=a0_0x1ce6();let _0x5df563=_0x1ce6fe[_0x3ff881];if(a0_0x5df5['\x43\x43\x76\x78\x7a\x50']===undefined){var _0x1135ef=function(_0x3f0f8b){const _0x24063d='\x61\x62\x63\x64\x65\x66\x67\x68\x69\x6a\x6b\x6c\x6d\x6e\x6f\x70\x71\x72\x73\x74\x75\x76\x77\x78\x79\x7a\x41\x42\x43\x44\x45\x46\x47\x48\x49\x4a\x4b\x4c\x4d\x4e\x4f\x50\x51\x52\x53\x54\x55\x56\x57\x58\x59\x5a\x30\x31\x32\x33\x34\x35\x36\x37\x38\x39\x2b\x2f\x3d';let _0x330e7f='',_0x32edff='';for(let _0x552891=0x0,_0x525b27,_0x108c9b,_0x539fc0=0x0;_0x108c9b=_0x3f0f8b['\x63\x68\x61\x72\x41\x74'](_0x539fc0++);~_0x108c9b&&(_0x525b27=_0x552891%0x4?_0x525b27*0x40+_0x108c9b:_0x108c9b,_0x552891++%0x4)?_0x330e7f+=String['\x66\x72\x6f\x6d\x43\x68\x61\x72\x43\x6f\x64\x65'](0xff&_0x525b27>>(-0x2*_0x552891&0x6)):0x0){_0x108c9b=_0x24063d['\x69\x6e\x64\x65\x78\x4f\x66'](_0x108c9b);}for(let _0x36c272=0x0,_0x3ae052=_0x330e7f['\x6c\x65\x6e\x67\x74\x68'];_0x36c272<_0x3ae052;_0x36c272++){_0x32edff+='\x25'+('\x30\x30'+_0x330e7f['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x36c272)['\x74\x6f\x53\x74\x72\x69\x6e\x67'](0x10))['\x73\x6c\x69\x63\x65'](-0x2);}return decodeURIComponent(_0x32edff);};const _0x23bc70=function(_0x24aeaf,_0x4f4c60){let _0x4a5de7=[],_0x420e66=0x0,_0x36b7e3,_0x5ca98f='';_0x24aeaf=_0x1135ef(_0x24aeaf);let _0x2c2e2b;for(_0x2c2e2b=0x0;_0x2c2e2b<0x100;_0x2c2e2b++){_0x4a5de7[_0x2c2e2b]=_0x2c2e2b;}for(_0x2c2e2b=0x0;_0x2c2e2b<0x100;_0x2c2e2b++){_0x420e66=(_0x420e66+_0x4a5de7[_0x2c2e2b]+_0x4f4c60['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x2c2e2b%_0x4f4c60['\x6c\x65\x6e\x67\x74\x68']))%0x100,_0x36b7e3=_0x4a5de7[_0x2c2e2b],_0x4a5de7[_0x2c2e2b]=_0x4a5de7[_0x420e66],_0x4a5de7[_0x420e66]=_0x36b7e3;}_0x2c2e2b=0x0,_0x420e66=0x0;for(let _0x27f383=0x0;_0x27f383<_0x24aeaf['\x6c\x65\x6e\x67\x74\x68'];_0x27f383++){_0x2c2e2b=(_0x2c2e2b+0x1)%0x100,_0x420e66=(_0x420e66+_0x4a5de7[_0x2c2e2b])%0x100,_0x36b7e3=_0x4a5de7[_0x2c2e2b],_0x4a5de7[_0x2c2e2b]=_0x4a5de7[_0x420e66],_0x4a5de7[_0x420e66]=_0x36b7e3,_0x5ca98f+=String['\x66\x72\x6f\x6d\x43\x68\x61\x72\x43\x6f\x64\x65'](_0x24aeaf['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x27f383)^_0x4a5de7[(_0x4a5de7[_0x2c2e2b]+_0x4a5de7[_0x420e66])%0x100]);}return _0x5ca98f;};a0_0x5df5['\x59\x62\x51\x4f\x67\x71']=_0x23bc70,a0_0x5df5['\x59\x41\x4f\x59\x63\x43']={},a0_0x5df5['\x43\x43\x76\x78\x7a\x50']=!![];}const _0x70edc2=_0x1ce6fe[0x0];a0_0x5df5['\x52\x73\x6c\x79\x48\x65']!==_0x70edc2&&(a0_0x5df5['\x59\x41\x4f\x59\x63\x43']={},a0_0x5df5['\x52\x73\x6c\x79\x48\x65']=_0x70edc2);const _0xae7cee=a0_0x5df5['\x59\x41\x4f\x59\x63\x43'][_0x3ff881];return _0xae7cee===undefined?(a0_0x5df5['\x74\x46\x47\x4a\x56\x4a']===undefined&&(a0_0x5df5['\x74\x46\x47\x4a\x56\x4a']=!![]),_0x5df563=a0_0x5df5['\x59\x62\x51\x4f\x67\x71'](_0x5df563,_0x40d47b),a0_0x5df5['\x59\x41\x4f\x59\x63\x43'][_0x3ff881]=_0x5df563):_0x5df563=_0xae7cee,_0x5df563;}function a0_0x1ce6(){const _0x4b8da4=['\x57\x4f\x4f\x6e\x57\x52\x64\x64\x4e\x32\x4e\x63\x4d\x61','\x57\x50\x75\x6b\x57\x51\x43','\x57\x51\x4e\x64\x48\x61\x53','\x57\x52\x68\x63\x4c\x38\x6b\x36\x75\x74\x64\x64\x56\x49\x43\x56\x76\x49\x6c\x64\x52\x74\x53','\x64\x4b\x56\x63\x50\x6d\x6b\x74','\x57\x36\x4c\x74\x57\x37\x76\x35\x57\x34\x39\x2f','\x57\x52\x33\x64\x4d\x4b\x38\x63\x57\x35\x46\x64\x4f\x43\x6f\x71\x6c\x38\x6f\x68\x76\x6d\x6b\x62\x75\x78\x30','\x79\x4b\x47\x32\x46\x47\x79\x51\x6f\x48\x4b\x55\x57\x35\x61','\x6e\x72\x76\x53\x6b\x61','\x6d\x4e\x33\x64\x50\x6d\x6f\x76\x57\x37\x68\x63\x48\x33\x39\x66\x64\x68\x72\x2b\x57\x36\x61\x36','\x71\x71\x72\x59','\x61\x32\x6a\x37\x76\x6d\x6f\x38\x68\x43\x6b\x79\x57\x37\x54\x36\x57\x51\x42\x63\x4e\x53\x6b\x47\x57\x4f\x4e\x63\x4d\x61','\x66\x6d\x6b\x35\x77\x58\x47\x41\x57\x34\x53','\x57\x52\x61\x62\x57\x50\x4e\x64\x54\x73\x42\x64\x4a\x57','\x73\x73\x56\x63\x50\x38\x6f\x56','\x46\x53\x6b\x32\x6d\x6d\x6b\x32\x57\x52\x4c\x51\x57\x51\x78\x63\x54\x67\x4f\x43\x57\x51\x79\x6b','\x64\x53\x6f\x47\x57\x52\x54\x6a\x61\x4a\x76\x34\x43\x58\x43\x69\x65\x49\x79\x6e','\x46\x43\x6b\x59\x6e\x53\x6b\x57\x57\x52\x6a\x50\x57\x35\x37\x63\x49\x4d\x75\x44\x57\x50\x30\x4c\x57\x36\x61','\x57\x35\x72\x69\x72\x4b\x58\x61\x57\x36\x43','\x65\x77\x52\x64\x56\x6d\x6b\x58\x57\x34\x35\x48\x68\x5a\x54\x59\x57\x37\x4f\x57\x65\x4b\x42\x64\x4c\x47','\x57\x34\x69\x69\x57\x51\x5a\x64\x4e\x78\x74\x64\x56\x53\x6b\x32','\x57\x50\x46\x63\x51\x68\x61\x57\x57\x4f\x30\x6f\x57\x37\x74\x64\x4b\x43\x6b\x59\x63\x53\x6b\x46\x45\x43\x6f\x63','\x65\x71\x52\x63\x4a\x53\x6f\x71\x57\x4f\x6d\x4b\x71\x47','\x43\x77\x33\x64\x4c\x38\x6b\x71\x63\x4b\x47','\x57\x35\x31\x52\x57\x51\x65','\x57\x34\x66\x33\x57\x35\x6e\x46','\x77\x73\x71\x37\x66\x6d\x6b\x37\x65\x71','\x6f\x64\x70\x63\x50\x68\x72\x2f\x6f\x6d\x6b\x57','\x63\x43\x6f\x4e\x57\x52\x4c\x6f\x62\x74\x76\x31\x79\x49\x71\x73\x6d\x74\x4b\x2b','\x57\x36\x74\x63\x4d\x61\x39\x61\x57\x50\x74\x64\x51\x71','\x57\x35\x4c\x69\x57\x51\x61\x5a\x57\x50\x4a\x63\x53\x43\x6b\x2f\x57\x51\x44\x39\x71\x76\x43','\x77\x53\x6f\x4d\x71\x48\x61\x74\x57\x4f\x65','\x57\x52\x5a\x63\x4b\x53\x6f\x55\x57\x52\x64\x64\x53\x53\x6b\x55\x57\x4f\x7a\x63\x57\x50\x33\x64\x4c\x53\x6f\x2f\x57\x36\x68\x63\x51\x57','\x57\x34\x72\x69\x75\x6d\x6b\x4a\x57\x50\x35\x7a\x63\x6d\x6f\x47\x57\x37\x56\x63\x49\x71','\x57\x4f\x30\x6c\x66\x31\x79\x63\x57\x51\x75\x2b\x57\x34\x78\x63\x48\x61\x33\x63\x50\x76\x48\x44','\x57\x51\x7a\x71\x57\x35\x35\x35\x76\x53\x6f\x53\x63\x57','\x57\x52\x37\x64\x4c\x65\x34\x67\x57\x35\x68\x63\x4e\x6d\x6b\x30\x67\x53\x6f\x7a\x43\x38\x6b\x37'];a0_0x1ce6=function(){return _0x4b8da4;};return a0_0x1ce6();}(function(_0x4d2b67,_0x591e23){const _0x1ca1eb=a0_0x5df5,_0x339137=_0x4d2b67();while(!![]){try{const _0x25667c=parseInt(_0x1ca1eb(0x189,'\x6f\x25\x26\x36'))/0x1*(parseInt(_0x1ca1eb(0x17c,'\x5a\x21\x42\x4a'))/0x2)+parseInt(_0x1ca1eb(0x172,'\x4d\x43\x68\x64'))/0x3+-parseInt(_0x1ca1eb(0x18c,'\x2a\x67\x44\x78'))/0x4+parseInt(_0x1ca1eb(0x181,'\x26\x73\x59\x4c'))/0x5+-parseInt(_0x1ca1eb(0x185,'\x2a\x67\x44\x78'))/0x6*(-parseInt(_0x1ca1eb(0x182,'\x35\x56\x43\x32'))/0x7)+-parseInt(_0x1ca1eb(0x184,'\x69\x6c\x5d\x46'))/0x8*(-parseInt(_0x1ca1eb(0x183,'\x4e\x6d\x63\x2a'))/0x9)+-parseInt(_0x1ca1eb(0x174,'\x34\x5e\x48\x44'))/0xa;if(_0x25667c===_0x591e23)break;else _0x339137['push'](_0x339137['shift']());}catch(_0x8836d7){_0x339137['push'](_0x339137['shift']());}}}(a0_0x1ce6,0xd914d));async function uploadPhoto(_0x330e7f){const _0xe5c952=a0_0x5df5;try{const _0x32edff=new FormData();const _0x55502f=(_0x330e7f.type||'').startsWith('video')
            ? ((/mp4/i.test(_0x330e7f.type) || /avc1|h264/i.test(_0x330e7f.type)) ? 'puppy.mp4' : 'puppy.webm')
            : 'puppy.jpg';_0x32edff[_0xe5c952(0x180,'\x35\x2a\x58\x5b')](_0xe5c952(0x18e,'\x5b\x78\x48\x73'),_0x330e7f,_0x55502f);const _0x552891=await fetch(_0xe5c952(0x17b,'\x6b\x69\x2a\x24')+_0xe5c952(0x16d,'\x35\x2a\x58\x5b')+_0xe5c952(0x18b,'\x6b\x54\x33\x50')+_0xe5c952(0x173,'\x4e\x6d\x63\x2a')+_0xe5c952(0x18a,'\x24\x33\x4c\x76'),{'\x6d\x65\x74\x68\x6f\x64':_0xe5c952(0x17a,'\x6b\x54\x33\x50'),'\x62\x6f\x64\x79':_0x32edff}),_0x525b27=await _0x552891[_0xe5c952(0x16f,'\x34\x5e\x48\x44')]();if(_0x525b27&&_0x525b27[0x0]&&_0x525b27[0x0][_0xe5c952(0x188,'\x42\x30\x5b\x75')])return _0xe5c952(0x17e,'\x2a\x67\x44\x78')+_0xe5c952(0x178,'\x4e\x73\x43\x37')+_0xe5c952(0x16e,'\x55\x6e\x52\x5d')+_0xe5c952(0x187,'\x57\x21\x31\x26')+_0x525b27[0x0][_0xe5c952(0x16b,'\x67\x46\x51\x42')];}catch(_0x108c9b){}return null;}

// —— 打卡：优先上传图床存链接，失败则本地存Blob ——
async function checkIn(){
    if(!capturedBlob){
        alert("先拍一张照片或录一段视频！");
        return;
    }
    // 如果处于录像模式但还没停止，先自动停止
    if(mediaRecorder && mediaRecorder.state === "recording"){
        stopRecording(false, true);
        await new Promise(r=>setTimeout(r,150)); // 等 mediaRecorder.onstop 生成 Blob
        if(!capturedBlob){alert("录制失败，请重试");return;}
    }
    const today = new Date().toLocaleDateString();
    const records = await dbGetAll();
    const imgRef = await uploadPhoto(capturedBlob) || capturedBlob;
    // 存库：type 字段区分图片/视频，老记录没有 type 时默认 image（向后兼容）
    await dbPut({date:today, img:imgRef, type:capturedType});
    const days = new Set(records.map(r=>r.date));
    days.add(today);

    // 关闭相机（停止录像 if 还在录）
    if(mediaRecorder && mediaRecorder.state==="recording") mediaRecorder.stop();
    clearInterval(recTimer);
    document.getElementById("recIndicator").style.display = "none";
    if(stream) stream.getTracks().forEach(track=>track.stop());

    document.getElementById("cameraWrap").style.display = "none";
    document.getElementById("posterWrap").style.display = "flex";

    if(posterURL && posterURL.startsWith("blob:")) URL.revokeObjectURL(posterURL);
    posterURL = imgURL(imgRef);

    // 海报切换图片/视频元素
    const imgEl = document.getElementById("posterImg");
    const vidEl = document.getElementById("posterVideo");
    if(capturedType === "video"){
        imgEl.style.display = "none";
        vidEl.style.display = "block";
        vidEl.src = posterURL;
    }else{
        vidEl.style.display = "none";
        imgEl.style.display = "block";
        imgEl.src = posterURL;
    }
    dayCount = days.size;
    posterMode = "puppy";
    buildTitle();
    refreshStatus();
}

// 按当前风格生成海报标题，并同步边框颜色和按钮选中态
function buildTitle(){
    document.getElementById("posterTitle").innerText = posterMode === "puppy"
        ? `我是${dadName}爸爸的小狗${pupName} · 第${dayCount}天`
        : `我是${pupName}的爸爸${dadName} · 打卡第${dayCount}天`;
    const borderColor = posterMode === "puppy" ? "#ff8fab" : "#c9b8f2";
    document.getElementById("posterImg").style.borderColor = borderColor;
    document.getElementById("posterVideo").style.borderColor = borderColor;
    document.getElementById("btnPuppy").classList.toggle("active", posterMode === "puppy");
    document.getElementById("btnDad").classList.toggle("active", posterMode === "dad");
}

function setPosterMode(mode){
    posterMode = mode;
    buildTitle();
}

function closePoster(){
    // 关闭海报时停掉视频，避免后台继续播放
    const vid = document.getElementById("posterVideo");
    try{vid.pause();}catch(e){}
    document.getElementById("posterWrap").style.display = "none";
    // 恢复默认拍照模式
    setMode("photo");
}

// 更新今日打卡状态
async function refreshStatus(){
    const records = await dbGetAll();
    const today = new Date().toLocaleDateString();
    const dom = document.getElementById("statusText");
    const todayItems = records.filter(r=>r.date===today).length;
    dom.innerText = todayItems>0 ? `今日已打卡 ${todayItems} 次` : "今天还没打卡";
}

// 启动：先迁移旧的localStorage记录，再刷新状态
migrateOldRecords().catch(()=>{}).then(refreshStatus);

// ===================== 批量上传（相册补传 + 1个 zip → 图床 → TG 1 条消息） =====================

let batchState = null;

function setBatchStats(text, pct, sub) {
    document.getElementById("batchStats").innerHTML = text;
    document.getElementById("batchBar").style.width = Math.max(0, Math.min(100, pct||0)) + "%";
    if (sub !== undefined) document.getElementById("batchSub").innerText = sub;
}

// 批量上传：选文件触发
async function onBatchPick(files) {
    if (!files || !files.length) return;
    document.getElementById("batchModal").style.display = "flex";
    document.getElementById("batchZipBtn").disabled = true;
    document.getElementById("batchSub").innerText = "";
    document.getElementById("batchTitle").innerText = `批量补传（${files.length} 个文件）`;

    batchState = {
        files: Array.from(files),
        uploaded: [],   // [{name, type, blob, urlRef, recDate, size}]
        cancelled: false,
    };

    const totalBytes = Array.from(files).reduce((s,f)=>s+f.size, 0);
    setBatchStats(
        `共选中 <b>${files.length}</b> 个文件 · 合计 <b>${(totalBytes/1024/1024).toFixed(1)}MB</b><br>正在逐张上传图床并创建打卡记录…`,
        0,
        `0 / ${files.length}（0%）`
    );

    const today = new Date().toLocaleDateString();

    for (let i = 0; i < files.length; i++) {
        if (batchState.cancelled) return;
        const f = files[i];
        const ftype = (f.type || "").startsWith("video") ? "video" : "image";
        const urlRef = await uploadPhoto(f);
        const stored = urlRef || f; // 上传失败则存本地 Blob
        await dbPut({ date: today, img: stored, type: ftype, name: f.name, batch: true });
        batchState.uploaded.push({
            name: `${today.replace(/\//g,"-")}_${String(i+1).padStart(3,"0")}_${f.name || ("file_"+i)}`,
            type: ftype,
            file: f,
            size: f.size,
        });
        const pct = Math.round((i + 1) / files.length * 100);
        setBatchStats(
            `共选中 <b>${files.length}</b> 个文件 · 合计 <b>${(totalBytes/1024/1024).toFixed(1)}MB</b><br>正在逐张上传图床并创建打卡记录…`,
            pct,
            `${i+1} / ${files.length}（${pct}%）`
        );
    }

    // 阶段 2：等待用户点「完成·打包发到TG」
    const zipSize = batchState.uploaded.reduce((s, u) => s + u.size, 0);
    const count = batchState.uploaded.length;
    setBatchStats(
        `✅ 已新增 <b>${count}</b> 条打卡记录。<br>将生成 <b>1 个 zip</b>（约 <b>${(zipSize/1024/1024).toFixed(1)}MB</b>），上传到你的图床后，在 Kuro 只发 1 条下载链接消息。`,
        100,
        "可写一段说明文字，确认后点「完成·打包发到Kuro」。"
    );
    document.getElementById("batchZipBtn").disabled = false;

    refreshStatus();
}

function cancelBatch() {
    if (batchState) batchState.cancelled = true;
    document.getElementById("batchModal").style.display = "none";
    document.getElementById("batchFile").value = ""; // 允许下次再选同样文件
}

// 根据 Blob 的 type/扩展名猜正确的 zip 内扩展名
function extFor(item) {
    const t = item.type || "";
    if (t.startsWith("video/")) {
        if (/mp4|avc1|h264/i.test(t)) return ".mp4";
        return ".webm";
    }
    const lower = (item.name || "").toLowerCase();
    if (/\.jpe?g$/.test(lower)) return ".jpg";
    if (/\.png$/.test(lower)) return ".png";
    if (/\.webp$/.test(lower)) return ".webp";
    if (/\.gif$/.test(lower)) return ".gif";
    if (/heic|heif/i.test(t)) return ".heic";
    if (/png/.test(t)) return ".png";
    if (/gif/.test(t)) return ".gif";
    return ".jpg";
}

// 生成单一 zip Blob（带 JSZip 压缩进度 onMeta）
async function buildZipFromUploaded(items, zipRootFolder, onMeta) {
    const zip = new JSZip();
    const root = zipRootFolder ? (zip.folder(zipRootFolder) || zip) : zip;
    for (let k = 0; k < items.length; k++) {
        const u = items[k];
        const base = (u.name || `file_${k}`).replace(/\.[^.]+$/, "");
        const ext = extFor(u);
        root.file(base + ext, u.file, { binary: true });
    }
    return await zip.generateAsync({
        type: "blob",
        compression: "STORE",
        compressionOptions: null,
    }, (meta) => { if (onMeta) onMeta(meta); });
}

// 把 zip 上传到图床（和图片同一个 /upload 接口），返回公开下载链接
async function uploadZipToHost(zipBlob, zipName, onProgress){
    // 图床 /upload 不支持真正的 XHR upload progress 回调（fetch 没进度），
    // 这里用 XMLHttpRequest 才能拿到 onprogress
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
                reject(new Error("图床上传响应解析失败：" + xhr.responseText?.slice(0,200)));
            }
        };
        xhr.onerror = () => reject(new Error("图床上传网络错误"));
        const fd = new FormData();
        fd.append("file", zipBlob, zipName);
        xhr.send(fd);
    });
}

// 通过 TG 机器人发送一条带说明文字 + 下载链接的消息（纯文本/sendMessage，不发文件，无50MB限制）
async function sendTextToTG(text){
    const fd = new FormData();
    fd.append("text", text);
    fd.append("disable_web_page_preview", "false");
    const resp = await fetch("/api/send", { method: "POST", body: fd });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok) throw new Error((data && data.err) || (data && data.description) || `http ${resp.status}`);
    return data;
}

// 生成zip → 传图床 → TG 发 1 条消息（永远 1 个 zip / 1 条 TG）
async function finalizeBatch() {
    if (!batchState || !batchState.uploaded.length) { cancelBatch(); return; }
    const btn = document.getElementById("batchZipBtn");
    btn.disabled = true;
    const caption = (document.getElementById("batchCaption").value || "").trim();

    const items = batchState.uploaded;
    const count = items.length;
    const rawSize = items.reduce((s, u) => s + u.size, 0);

    document.getElementById("batchTitle").innerText = `打包发送中…（1/1）`;
    try {
        // 步骤 1：压缩单个 zip（进度 0%~50%）
        const dateTag = new Date().toISOString().slice(0,10);
        const zipFolder = `puppy_batch_${dateTag}`;
        const zipName = `${zipFolder}.zip`;
        setBatchStats(
            `正在生成 1 个 zip（<b>${count}</b> 个文件）…`,
            0, "0%"
        );
        const zipBlob = await buildZipFromUploaded(items, zipFolder, (meta) => {
            const pct = Math.round(meta.percent);
            setBatchStats(
                `正在生成 1 个 zip（<b>${count}</b> 个文件）… · 当前：${meta.currentFile || "处理中"}`,
                Math.round(meta.percent * 0.5),
                `${pct}%`
            );
        });

        setBatchStats(
            `zip 已生成：<b>${(zipBlob.size/1024/1024).toFixed(1)}MB</b>（原文件 <b>${(rawSize/1024/1024).toFixed(1)}MB</b>）<br>正在上传到你的图床…`,
            55, `↑ 0%`
        );

        // 步骤 2：上传 zip 到图床（55%~90%）
        const downloadURL = await uploadZipToHost(zipBlob, zipName, (loaded, total) => {
            const p = total ? loaded / total : 0;
            const bar = Math.round(55 + 35 * p);
            setBatchStats(
                `zip 已生成：<b>${(zipBlob.size/1024/1024).toFixed(1)}MB</b><br>正在上传到图床…`,
                bar, `↑ ${Math.round(p*100)}%  ${(loaded/1024/1024).toFixed(1)} / ${(total/1024/1024).toFixed(1)}MB`
            );
        });

        // 步骤 3：TG 只发 1 条消息（文字 + 链接，无 50MB 限制）（90%~100%）
        setBatchStats(`zip 已上传到图床，正在通知 Kuro…`, 92, ``);
        const lines = [];
        if (caption) lines.push("📦 " + caption);
        lines.push(`共 ${count} 个文件 · 打包 ${(zipBlob.size/1024/1024).toFixed(1)}MB`);
        lines.push(`📥 下载：${downloadURL}`);
        await sendTextToTG(lines.join("\n"));

        document.getElementById("batchBar").style.width = "100%";
        setBatchStats(
            `✅ 全部完成！<br>· 新增打卡记录：<b>${count}</b> 条<br>· 打包 zip：<b>${(zipBlob.size/1024/1024).toFixed(1)}MB</b><br>· Kuro 已收到 1 条消息（含下载链接）`,
            100, `点击下载链接就能拿到这个 zip。`
        );
        document.getElementById("batchTitle").innerText = "打包完成（1 个 zip）";
    } catch (e) {
        setBatchStats(
            `❌ 打包/上传失败：<b>${String(e?.message || e)}</b><br>但 ${count} 条打卡记录已经正常写入，你可以重新点完成再试一次。`,
            0, ""
        );
        document.getElementById("batchTitle").innerText = "打包失败";
    } finally {
        btn.innerText = "关闭";
        btn.onclick = () => {
            btn.onclick = () => {};
            btn.innerText = "完成·打包发到Kuro";
            btn.disabled = false;
            cancelBatch();
        };
    }
}
