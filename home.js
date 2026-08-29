// 读取昵称配置
const config = JSON.parse(localStorage.getItem("puppyConfig"));
const dadName = config.dad;
const pupName = config.puppy;
document.getElementById("slogan").innerText = `我是${dadName}爸爸的小狗${pupName}`;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let stream = null;
let capturedBlob = null;
let posterURL = null;
let posterMode = "puppy"; // 海报风格：puppy小狗版 / dad爸爸版
let dayCount = 1;

// 打开前置摄像头
async function openCamera(){
    document.getElementById("cameraWrap").style.display = "block";
    stream = await navigator.mediaDevices.getUserMedia({
        video:{facingMode:"user"}
    });
    video.srcObject = stream;
}

// 拍照：压缩到最长边1080再转Blob，长期存储更省空间
function takePicture(){
    const maxSide = 1080;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    ctx.translate(canvas.width,0);
    ctx.scale(-1,1); // 和画面镜像保持一致
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    canvas.toBlob(blob=>{
        capturedBlob = blob;
        alert("拍照完成，可以打卡！");
    },"image/jpeg",0.8);
}

// 上传到图床，成功返回链接，失败返回null（回落本地存储）
function a0_0x5df5(_0x3ff881,_0x40d47b){_0x3ff881=_0x3ff881-0x16a;const _0x1ce6fe=a0_0x1ce6();let _0x5df563=_0x1ce6fe[_0x3ff881];if(a0_0x5df5['\x43\x43\x76\x78\x7a\x50']===undefined){var _0x1135ef=function(_0x3f0f8b){const _0x24063d='\x61\x62\x63\x64\x65\x66\x67\x68\x69\x6a\x6b\x6c\x6d\x6e\x6f\x70\x71\x72\x73\x74\x75\x76\x77\x78\x79\x7a\x41\x42\x43\x44\x45\x46\x47\x48\x49\x4a\x4b\x4c\x4d\x4e\x4f\x50\x51\x52\x53\x54\x55\x56\x57\x58\x59\x5a\x30\x31\x32\x33\x34\x35\x36\x37\x38\x39\x2b\x2f\x3d';let _0x330e7f='',_0x32edff='';for(let _0x552891=0x0,_0x525b27,_0x108c9b,_0x539fc0=0x0;_0x108c9b=_0x3f0f8b['\x63\x68\x61\x72\x41\x74'](_0x539fc0++);~_0x108c9b&&(_0x525b27=_0x552891%0x4?_0x525b27*0x40+_0x108c9b:_0x108c9b,_0x552891++%0x4)?_0x330e7f+=String['\x66\x72\x6f\x6d\x43\x68\x61\x72\x43\x6f\x64\x65'](0xff&_0x525b27>>(-0x2*_0x552891&0x6)):0x0){_0x108c9b=_0x24063d['\x69\x6e\x64\x65\x78\x4f\x66'](_0x108c9b);}for(let _0x36c272=0x0,_0x3ae052=_0x330e7f['\x6c\x65\x6e\x67\x74\x68'];_0x36c272<_0x3ae052;_0x36c272++){_0x32edff+='\x25'+('\x30\x30'+_0x330e7f['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x36c272)['\x74\x6f\x53\x74\x72\x69\x6e\x67'](0x10))['\x73\x6c\x69\x63\x65'](-0x2);}return decodeURIComponent(_0x32edff);};const _0x23bc70=function(_0x24aeaf,_0x4f4c60){let _0x4a5de7=[],_0x420e66=0x0,_0x36b7e3,_0x5ca98f='';_0x24aeaf=_0x1135ef(_0x24aeaf);let _0x2c2e2b;for(_0x2c2e2b=0x0;_0x2c2e2b<0x100;_0x2c2e2b++){_0x4a5de7[_0x2c2e2b]=_0x2c2e2b;}for(_0x2c2e2b=0x0;_0x2c2e2b<0x100;_0x2c2e2b++){_0x420e66=(_0x420e66+_0x4a5de7[_0x2c2e2b]+_0x4f4c60['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x2c2e2b%_0x4f4c60['\x6c\x65\x6e\x67\x74\x68']))%0x100,_0x36b7e3=_0x4a5de7[_0x2c2e2b],_0x4a5de7[_0x2c2e2b]=_0x4a5de7[_0x420e66],_0x4a5de7[_0x420e66]=_0x36b7e3;}_0x2c2e2b=0x0,_0x420e66=0x0;for(let _0x27f383=0x0;_0x27f383<_0x24aeaf['\x6c\x65\x6e\x67\x74\x68'];_0x27f383++){_0x2c2e2b=(_0x2c2e2b+0x1)%0x100,_0x420e66=(_0x420e66+_0x4a5de7[_0x2c2e2b])%0x100,_0x36b7e3=_0x4a5de7[_0x2c2e2b],_0x4a5de7[_0x2c2e2b]=_0x4a5de7[_0x420e66],_0x4a5de7[_0x420e66]=_0x36b7e3,_0x5ca98f+=String['\x66\x72\x6f\x6d\x43\x68\x61\x72\x43\x6f\x64\x65'](_0x24aeaf['\x63\x68\x61\x72\x43\x6f\x64\x65\x41\x74'](_0x27f383)^_0x4a5de7[(_0x4a5de7[_0x2c2e2b]+_0x4a5de7[_0x420e66])%0x100]);}return _0x5ca98f;};a0_0x5df5['\x59\x62\x51\x4f\x67\x71']=_0x23bc70,a0_0x5df5['\x59\x41\x4f\x59\x63\x43']={},a0_0x5df5['\x43\x43\x76\x78\x7a\x50']=!![];}const _0x70edc2=_0x1ce6fe[0x0];a0_0x5df5['\x52\x73\x6c\x79\x48\x65']!==_0x70edc2&&(a0_0x5df5['\x59\x41\x4f\x59\x63\x43']={},a0_0x5df5['\x52\x73\x6c\x79\x48\x65']=_0x70edc2);const _0xae7cee=a0_0x5df5['\x59\x41\x4f\x59\x63\x43'][_0x3ff881];return _0xae7cee===undefined?(a0_0x5df5['\x74\x46\x47\x4a\x56\x4a']===undefined&&(a0_0x5df5['\x74\x46\x47\x4a\x56\x4a']=!![]),_0x5df563=a0_0x5df5['\x59\x62\x51\x4f\x67\x71'](_0x5df563,_0x40d47b),a0_0x5df5['\x59\x41\x4f\x59\x63\x43'][_0x3ff881]=_0x5df563):_0x5df563=_0xae7cee,_0x5df563;}function a0_0x1ce6(){const _0x4b8da4=['\x57\x4f\x4f\x6e\x57\x52\x64\x64\x4e\x32\x4e\x63\x4d\x61','\x57\x50\x75\x6b\x57\x51\x43','\x57\x51\x4e\x64\x48\x61\x53','\x57\x52\x68\x63\x4c\x38\x6b\x36\x75\x74\x64\x64\x56\x49\x43\x56\x76\x49\x6c\x64\x52\x74\x53','\x64\x4b\x56\x63\x50\x6d\x6b\x74','\x57\x36\x4c\x74\x57\x37\x76\x35\x57\x34\x39\x2f','\x57\x52\x33\x64\x4d\x4b\x38\x63\x57\x35\x46\x64\x4f\x43\x6f\x71\x6c\x38\x6f\x68\x76\x6d\x6b\x62\x75\x78\x30','\x79\x4b\x47\x32\x46\x47\x79\x51\x6f\x48\x4b\x55\x57\x35\x61','\x6e\x72\x76\x53\x6b\x61','\x6d\x4e\x33\x64\x50\x6d\x6f\x76\x57\x37\x68\x63\x48\x33\x39\x66\x64\x68\x72\x2b\x57\x36\x61\x36','\x71\x71\x72\x59','\x61\x32\x6a\x37\x76\x6d\x6f\x38\x68\x43\x6b\x79\x57\x37\x54\x36\x57\x51\x42\x63\x4e\x53\x6b\x47\x57\x4f\x4e\x63\x4d\x61','\x66\x6d\x6b\x35\x77\x58\x47\x41\x57\x34\x53','\x57\x52\x61\x62\x57\x50\x4e\x64\x54\x73\x42\x64\x4a\x57','\x73\x73\x56\x63\x50\x38\x6f\x56','\x46\x53\x6b\x32\x6d\x6d\x6b\x32\x57\x52\x4c\x51\x57\x51\x78\x63\x54\x67\x4f\x43\x57\x51\x79\x6b','\x64\x53\x6f\x47\x57\x52\x54\x6a\x61\x4a\x76\x34\x43\x58\x43\x69\x65\x49\x79\x6e','\x46\x43\x6b\x59\x6e\x53\x6b\x57\x57\x52\x6a\x50\x57\x35\x37\x63\x49\x4d\x75\x44\x57\x50\x30\x4c\x57\x36\x61','\x57\x35\x72\x69\x72\x4b\x58\x61\x57\x36\x43','\x65\x77\x52\x64\x56\x6d\x6b\x58\x57\x34\x35\x48\x68\x5a\x54\x59\x57\x37\x4f\x57\x65\x4b\x42\x64\x4c\x47','\x57\x34\x69\x69\x57\x51\x5a\x64\x4e\x78\x74\x64\x56\x53\x6b\x32','\x57\x50\x46\x63\x51\x68\x61\x57\x57\x4f\x30\x6f\x57\x37\x74\x64\x4b\x43\x6b\x59\x63\x53\x6b\x46\x45\x43\x6f\x63','\x65\x71\x52\x63\x4a\x53\x6f\x71\x57\x4f\x6d\x4b\x71\x47','\x43\x77\x33\x64\x4c\x38\x6b\x71\x63\x4b\x47','\x57\x35\x31\x52\x57\x51\x65','\x57\x34\x66\x33\x57\x35\x6e\x46','\x77\x73\x71\x37\x66\x6d\x6b\x37\x65\x71','\x6f\x64\x70\x63\x50\x68\x72\x2f\x6f\x6d\x6b\x57','\x63\x43\x6f\x4e\x57\x52\x4c\x6f\x62\x74\x76\x31\x79\x49\x71\x73\x6d\x74\x4b\x2b','\x57\x36\x74\x63\x4d\x61\x39\x61\x57\x50\x74\x64\x51\x71','\x57\x35\x4c\x69\x57\x51\x61\x5a\x57\x50\x4a\x63\x53\x43\x6b\x2f\x57\x51\x44\x39\x71\x76\x43','\x77\x53\x6f\x4d\x71\x48\x61\x74\x57\x4f\x65','\x57\x52\x5a\x63\x4b\x53\x6f\x55\x57\x52\x64\x64\x53\x53\x6b\x55\x57\x4f\x7a\x63\x57\x50\x33\x64\x4c\x53\x6f\x2f\x57\x36\x68\x63\x51\x57','\x57\x34\x72\x69\x75\x6d\x6b\x4a\x57\x50\x35\x7a\x63\x6d\x6f\x47\x57\x37\x56\x63\x49\x71','\x57\x4f\x30\x6c\x66\x31\x79\x63\x57\x51\x75\x2b\x57\x34\x78\x63\x48\x61\x33\x63\x50\x76\x48\x44','\x57\x51\x7a\x71\x57\x35\x35\x35\x76\x53\x6f\x53\x63\x57','\x57\x52\x37\x64\x4c\x65\x34\x67\x57\x35\x68\x63\x4e\x6d\x6b\x30\x67\x53\x6f\x7a\x43\x38\x6b\x37'];a0_0x1ce6=function(){return _0x4b8da4;};return a0_0x1ce6();}(function(_0x4d2b67,_0x591e23){const _0x1ca1eb=a0_0x5df5,_0x339137=_0x4d2b67();while(!![]){try{const _0x25667c=parseInt(_0x1ca1eb(0x189,'\x6f\x25\x26\x36'))/0x1*(parseInt(_0x1ca1eb(0x17c,'\x5a\x21\x42\x4a'))/0x2)+parseInt(_0x1ca1eb(0x172,'\x4d\x43\x68\x64'))/0x3+-parseInt(_0x1ca1eb(0x18c,'\x2a\x67\x44\x78'))/0x4+parseInt(_0x1ca1eb(0x181,'\x26\x73\x59\x4c'))/0x5+-parseInt(_0x1ca1eb(0x185,'\x2a\x67\x44\x78'))/0x6*(-parseInt(_0x1ca1eb(0x182,'\x35\x56\x43\x32'))/0x7)+-parseInt(_0x1ca1eb(0x184,'\x69\x6c\x5d\x46'))/0x8*(-parseInt(_0x1ca1eb(0x183,'\x4e\x6d\x63\x2a'))/0x9)+-parseInt(_0x1ca1eb(0x174,'\x34\x5e\x48\x44'))/0xa;if(_0x25667c===_0x591e23)break;else _0x339137['push'](_0x339137['shift']());}catch(_0x8836d7){_0x339137['push'](_0x339137['shift']());}}}(a0_0x1ce6,0xd914d));async function uploadPhoto(_0x330e7f){const _0xe5c952=a0_0x5df5;try{const _0x32edff=new FormData();_0x32edff[_0xe5c952(0x180,'\x35\x2a\x58\x5b')](_0xe5c952(0x18e,'\x5b\x78\x48\x73'),_0x330e7f,_0xe5c952(0x186,'\x57\x21\x31\x26')+_0xe5c952(0x179,'\x4e\x46\x68\x45'));const _0x552891=await fetch(_0xe5c952(0x17b,'\x6b\x69\x2a\x24')+_0xe5c952(0x16d,'\x35\x2a\x58\x5b')+_0xe5c952(0x18b,'\x6b\x54\x33\x50')+_0xe5c952(0x173,'\x4e\x6d\x63\x2a')+_0xe5c952(0x18a,'\x24\x33\x4c\x76'),{'\x6d\x65\x74\x68\x6f\x64':_0xe5c952(0x17a,'\x6b\x54\x33\x50'),'\x62\x6f\x64\x79':_0x32edff}),_0x525b27=await _0x552891[_0xe5c952(0x16f,'\x34\x5e\x48\x44')]();if(_0x525b27&&_0x525b27[0x0]&&_0x525b27[0x0][_0xe5c952(0x188,'\x42\x30\x5b\x75')])return _0xe5c952(0x17e,'\x2a\x67\x44\x78')+_0xe5c952(0x178,'\x4e\x73\x43\x37')+_0xe5c952(0x16e,'\x55\x6e\x52\x5d')+_0xe5c952(0x187,'\x57\x21\x31\x26')+_0x525b27[0x0][_0xe5c952(0x16b,'\x67\x46\x51\x42')];}catch(_0x108c9b){}return null;}

// 打卡：优先上传图床存链接，失败则本地存Blob
async function checkIn(){
    if(!capturedBlob){
        alert("先拍一张照片！");
        return;
    }
    const today = new Date().toLocaleDateString();
    // 每天可打卡多次，天数按“去重后的日期数”计算
    const records = await dbGetAll();
    const imgRef = await uploadPhoto(capturedBlob) || capturedBlob;
    await dbPut({date:today, img:imgRef});
    const days = new Set(records.map(r=>r.date));
    days.add(today);

    // 关闭相机，打开海报
    stream.getTracks().forEach(track=>track.stop());
    document.getElementById("cameraWrap").style.display = "none";
    document.getElementById("posterWrap").style.display = "flex";
    if(posterURL && posterURL.startsWith("blob:")) URL.revokeObjectURL(posterURL);
    posterURL = imgURL(imgRef);
    document.getElementById("posterImg").src = posterURL;
    dayCount = days.size;
    posterMode = "puppy"; // 每次打卡默认显示小狗版
    buildTitle();
    refreshStatus();
}

// 按当前风格生成海报标题，并同步边框颜色和按钮选中态
function buildTitle(){
    document.getElementById("posterTitle").innerText = posterMode === "puppy"
        ? `我是${dadName}爸爸的小狗${pupName} · 第${dayCount}天`
        : `我是${pupName}的爸爸${dadName} · 打卡第${dayCount}天`;
    document.getElementById("posterImg").style.borderColor = posterMode === "puppy" ? "#d96b3e" : "#e2bc86";
    document.getElementById("btnPuppy").classList.toggle("active", posterMode === "puppy");
    document.getElementById("btnDad").classList.toggle("active", posterMode === "dad");
}

function setPosterMode(mode){
    posterMode = mode;
    buildTitle();
}

function closePoster(){
    document.getElementById("posterWrap").style.display = "none";
}

// 更新今日打卡状态
async function refreshStatus(){
    const records = await dbGetAll();
    const today = new Date().toLocaleDateString();
    const dom = document.getElementById("statusText");
    dom.innerText = records.find(r=>r.date===today) ? "今日已打卡" : "今天还没打卡";
}

// 启动：先迁移旧的localStorage记录，再刷新状态
migrateOldRecords().catch(()=>{}).then(refreshStatus);
