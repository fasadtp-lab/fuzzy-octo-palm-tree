import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
const DIR = path.dirname(new URL(import.meta.url).pathname);
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const PORT = 9444 + Number(process.argv[5] || 0);
const W = Number(process.argv[2]), H = Number(process.argv[3]), AA = process.argv[4] === "aa";
const chrome = spawn(CHROME, ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--hide-scrollbars",
  "--use-angle=swiftshader","--enable-unsafe-swiftshader","--disable-gpu-compositing","--allow-file-access-from-files",
  "--force-device-scale-factor=1",`--window-size=${W},${H}`,`--remote-debugging-port=${PORT}`,"about:blank"],{stdio:"ignore"});
process.on("exit",()=>chrome.kill());
let url;
for (let i=0;i<60 && !url;i++){ try{ const l=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  url=l.find(t=>t.type==="page")?.webSocketDebuggerUrl; }catch(e){} if(!url) await sleep(400); }
const ws=new WebSocket(url); await new Promise(r=>ws.addEventListener("open",r));
let id=0; const w=new Map();
ws.addEventListener("message",e=>{const m=JSON.parse(e.data); if(m.id&&w.has(m.id)){w.get(m.id)(m);w.delete(m.id);}});
const cmd=(method,params={})=>{const n=++id;ws.send(JSON.stringify({id:n,method,params}));return new Promise(r=>w.set(n,r));};
const ev=async x=>(await cmd("Runtime.evaluate",{expression:x,returnByValue:true,awaitPromise:true})).result?.value;
await cmd("Page.enable"); await cmd("Runtime.enable");
await cmd("Emulation.setDeviceMetricsOverride",{width:W,height:H,deviceScaleFactor:1,mobile:false});
await cmd("Page.navigate",{url:"file://"+path.join(DIR,"tour.html")}); await sleep(2200);
await ev(`window.__AA=${AA}, window.__W=${W}, window.__H=${H}, bootRender(), 1`);
for(let i=0;i<40&&!(await ev("!!window.__ready"));i++) await sleep(300);
const t0=Date.now();
for(let i=600;i<612;i++){ await ev(`__frame(${i}),1`); await cmd("Page.captureScreenshot",{format:"jpeg",quality:90,clip:{x:0,y:0,width:W,height:H,scale:1}}); }
const dt=(Date.now()-t0)/12;
console.log(`${W}x${H} aa=${AA}: ${dt.toFixed(0)} мс/кадр → 1900 кадров ≈ ${(dt*1900/60000).toFixed(0)} мин`);
process.exit(0);
