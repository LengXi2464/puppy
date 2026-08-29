const config = JSON.parse(localStorage.getItem("puppyConfig"));
document.getElementById("sloganText").innerText = `我是${config.dad}爸爸的小狗${config.puppy}`;

// 简易日历渲染（当月日期）
async function renderCalendar(){
    const records = await dbGetAll();
    const box = document.getElementById("calendarBox");
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
        const record = records.find(r=>r.date === dateStr);
        if(record){
            div.classList.add("has-img");
            div.style.backgroundImage = `url(${imgURL(record.img)})`;
        }
        box.appendChild(div);
    }
}
renderCalendar();
