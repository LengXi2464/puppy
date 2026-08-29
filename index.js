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
