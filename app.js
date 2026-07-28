const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor("#03040a");
    tg.setBackgroundColor("#03040a");
    tg.setBottomBarColor?.("#03040a");
    tg.disableVerticalSwipes?.();
  } catch {}
}
const TEST_KEY = "ARBI-7777-PULSE";
const form = document.getElementById("accessForm");
const input = document.getElementById("accessKey");
const message = document.getElementById("message");
const verifyOverlay = document.getElementById("verifyOverlay");
const verifyTitle = document.getElementById("verifyTitle");
const verifySubtitle = document.getElementById("verifySubtitle");
const progressBar = document.getElementById("progressBar");
const progressValue = document.getElementById("progressValue");
const successOverlay = document.getElementById("successOverlay");
document.getElementById("returnButton").onclick = () => successOverlay.classList.remove("show");
document.getElementById("helpButton").onclick = () => {
  tg?.HapticFeedback?.impactOccurred("light");
  if (tg?.showPopup) tg.showPopup({title:"Підтримка",message:"Пізніше ця кнопка відкриватиме чат із менеджером.",buttons:[{type:"ok",text:"Добре"}]});
  else alert("Пізніше ця кнопка відкриватиме чат із менеджером.");
};
input.addEventListener("input",()=>{input.value=input.value.toUpperCase();message.textContent=""});
form.addEventListener("submit",e=>{
  e.preventDefault();
  const key=input.value.trim().toUpperCase();
  if(!key){message.textContent="Введіть ключ";tg?.HapticFeedback?.notificationOccurred("error");return}
  if(key!==TEST_KEY){message.textContent=`Тестовий ключ: ${TEST_KEY}`;tg?.HapticFeedback?.notificationOccurred("error");return}
  message.textContent="";tg?.HapticFeedback?.impactOccurred("medium");startVerification();
});
function startVerification(){
  verifyOverlay.classList.add("show");progressBar.style.width="0%";progressValue.textContent="0%";
  let value=0;
  const timer=setInterval(()=>{
    value+=Math.floor(Math.random()*10)+6;if(value>100)value=100;
    progressBar.style.width=`${value}%`;progressValue.textContent=`${value}%`;
    if(value>=34)verifySubtitle.textContent="З'єднання із сервером...";
    if(value>=68)verifySubtitle.textContent="Підтвердження доступу...";
    if(value===100){
      clearInterval(timer);verifyTitle.textContent="Ключ підтверджено";verifySubtitle.textContent="Доступ активовано";
      tg?.HapticFeedback?.notificationOccurred("success");
      setTimeout(()=>{verifyOverlay.classList.remove("show");successOverlay.classList.add("show")},650);
    }
  },185);
}
const canvas=document.getElementById("particles"),ctx=canvas.getContext("2d");let particles=[];
function resize(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;canvas.style.width=innerWidth+"px";canvas.style.height=innerHeight+"px";ctx.setTransform(dpr,0,0,dpr,0,0);particles=Array.from({length:36},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*1.6+.3,s:Math.random()*.18+.04,p:Math.random()*6.28,g:Math.random()>.72}))}
function animate(t=0){ctx.clearRect(0,0,innerWidth,innerHeight);for(const p of particles){p.y-=p.s;p.x+=Math.sin(t*.00035+p.p)*.04;if(p.y<-8){p.y=innerHeight+8;p.x=Math.random()*innerWidth}const a=.14+(Math.sin(t*.001+p.p)+1)*.12;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=p.g?`rgba(246,188,40,${a})`:`rgba(150,43,245,${a})`;ctx.fill()}requestAnimationFrame(animate)}
resize();addEventListener("resize",resize);requestAnimationFrame(animate);
