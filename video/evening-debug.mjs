import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const PORT = 9900 + Math.floor(Math.random() * 90);
const chrome = spawn("/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--hide-scrollbars","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader","--disable-gpu-compositing","--allow-file-access-from-files",
   "--window-size=640,360",`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
process.on("exit", () => chrome.kill());
let t; for (let i = 0; i < 60 && !t; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    t = l.find(x => x.type === "page")?.webSocketDebuggerUrl; } catch (e) { } if (!t) await sleep(400); }
const ws = new WebSocket(t); await new Promise(r => ws.addEventListener("open", r));
let id = 0; const wait = new Map();
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } });
const cmd = (m, p = {}) => { const n = ++id; ws.send(JSON.stringify({ id: n, method: m, params: p })); return new Promise(r => wait.set(n, r)); };
const ev = async x => (await cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value;
await cmd("Page.enable"); await cmd("Runtime.enable");
await cmd("Page.navigate", { url: "file:///home/user/fuzzy-octo-palm-tree/docs/index.html" });
await sleep(4000); await ev('document.getElementById("go").click(), ["passport","tools","keys","mapwrap"].forEach(function(i){document.getElementById(i).hidden=true;}), 1'); await sleep(1500);
await ev('P.x=4.6,P.z=4.25,P.yaw=Math.PI*0.75,P.pitch=-0.05,1'); await sleep(600);

const probe = `(function(){
  var envN = 0, envSum = 0;
  scene.traverse(function(o){ var m=o.material; if(m && "envMapIntensity" in m){ envN++; envSum += m.envMapIntensity; } });
  return "солнце " + sunLight.intensity.toFixed(2) + " · полусфера " + hemi.intensity.toFixed(2) +
    " · общий " + ambient.intensity.toFixed(2) + " · подсветка " + fillLight.intensity.toFixed(2) +
    " · экспозиция " + renderer.toneMappingExposure.toFixed(2) +
    " · светильников вкл " + lampLights.filter(function(l){return l.intensity>0;}).length +
    " (сумма " + lampLights.reduce(function(a,l){return a+l.intensity;},0).toFixed(2) + ")" +
    " · env у " + envN + " материалов, средняя " + (envSum/Math.max(1,envN)).toFixed(2) +
    " · карта окружения " + (scene.environment ? "есть" : "нет") +
    " · legacyLights " + ("useLegacyLights" in renderer ? renderer.useLegacyLights : "нет свойства");
})()`;
import { writeFileSync } from "node:fs";
async function grab(name) {    // сохраняем кадр, яркость померим ffmpeg
  const r = await cmd("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 640, height: 360, scale: 1 } });
  writeFileSync(name, Buffer.from(r.result.data, "base64"));
  return name;
}
console.log("ДЕНЬ:   ", await ev(probe));
await grab("sweep/lum-day.png");
await ev("setEvening(true), 1"); await sleep(1200);
console.log("\nВЕЧЕР:  ", await ev(probe));
await grab("sweep/lum-eve.png");
process.exit(0);
