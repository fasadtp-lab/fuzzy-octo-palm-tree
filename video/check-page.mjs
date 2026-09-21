// Диагностика страницы тура в headless-Chromium: ошибки консоли, статистика
// рендера и прогон интерактива (телепорты, свет, карта, ресайз, тач-режим).
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const url = process.argv[2], PORT = 9700 + Math.floor(Math.random() * 200);
const chrome = spawn("/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--hide-scrollbars","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader","--disable-gpu-compositing","--allow-file-access-from-files",
   "--window-size=1280,720",`--remote-debugging-port=${PORT}`, ...(process.env.NOWEBGL ? ["--disable-3d-apis"] : []), "about:blank"], { stdio: "ignore" });
process.on("exit", () => chrome.kill());
let target;
for (let i = 0; i < 60 && !target; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = l.find(t => t.type === "page")?.webSocketDebuggerUrl; } catch (e) { }
  if (!target) await sleep(400);
}
const ws = new WebSocket(target); await new Promise(r => ws.addEventListener("open", r));
let id = 0; const wait = new Map(); const problems = [];
ws.addEventListener("message", e => {
  const m = JSON.parse(e.data);
  if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); return; }
  if (m.method === "Runtime.exceptionThrown") {
    const d = m.params.exceptionDetails;
    problems.push("ИСКЛЮЧЕНИЕ: " + (d.exception?.description || d.text));
  }
  if (m.method === "Runtime.consoleAPICalled" && ["error", "warning", "assert"].includes(m.params.type))
    problems.push("консоль " + m.params.type + ": " + m.params.args.map(a => a.value ?? a.description).join(" ").slice(0, 200));
  if (m.method === "Log.entryAdded" && ["error", "warning"].includes(m.params.entry.level))
    problems.push("лог " + m.params.entry.level + ": " + m.params.entry.text.slice(0, 200));
});
const cmd = (method, params = {}) => { const n = ++id; ws.send(JSON.stringify({ id: n, method, params })); return new Promise(r => wait.set(n, r)); };
const ev = async x => {
  const r = await cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) problems.push("ошибка в " + x.slice(0, 60) + ": " + r.result.exceptionDetails.exception?.description);
  return r.result?.result?.value;
};
await cmd("Page.enable"); await cmd("Runtime.enable"); await cmd("Log.enable");
await cmd("Page.navigate", { url }); await sleep(4000);
await ev('document.getElementById("go").click(), 1');
await sleep(2500);

console.log("=== СТАТИСТИКА СЦЕНЫ ===");
console.log(await ev(`(function(){
  var info = renderer.info;
  return "объектов в сцене: " + scene.children.length +
    " · геометрий: " + info.memory.geometries + " · текстур: " + info.memory.textures +
    " · вызовов отрисовки: " + info.render.calls + " · треугольников: " + info.render.triangles +
    "\\nугол обзора: " + camera.fov + "° · тени: " + renderer.shadowMap.enabled +
    " · препятствий: " + SOLIDS.length + " · дверных полотен: " + doorObjs.length;
})()`));

console.log("\\n=== ПРОГОН ИНТЕРАКТИВА ===");
const steps = [
  ['телепорт: прихожая', 'goTo(ROOMS[0]), 1'],
  ['телепорт: санузел', 'goTo(ROOMS[1]), 1'],
  ['телепорт: кухня-гостиная', 'goTo(ROOMS[2]), 1'],
  ['телепорт: спальня', 'goTo(ROOMS[3]), 1'],
  ['вечерний свет', 'setEvening(true), 1'],
  ['дневной свет', 'setEvening(false), 1'],
  ['скрыть план', 'toggleMap(), 1'],
  ['показать план', 'toggleMap(), 1'],
  ['присесть', 'P.crouch = true, 1'],
  ['встать', 'P.crouch = false, 1'],
  ['ходьба сквозь стены', '(function(){var hits=0;for(var i=0;i<400;i++){var a=i/400*6.283;var nx=P.x+Math.cos(a)*3,nz=P.z+Math.sin(a)*3;if(!blocked(nx,nz)&&(nx<0.1||nx>6.42||nz<0.1||nz>6.47))hits++;}return hits;})()'],
  ['мини-карта рисуется', '(function(){var c=document.getElementById("map"),g=c.getContext("2d");var d=g.getImageData(0,0,c.width,c.height).data;var n=0;for(var i=3;i<d.length;i+=4)if(d[i]>0)n++;return n>2000?"да, пикселей "+n:"ПУСТАЯ КАРТА";})()'],
];
for (const [name, code] of steps) {
  const r = await ev(code);
  await sleep(420);
  console.log(" •", name, r === 1 ? "ок" : "→ " + r);
}
await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await ev('window.dispatchEvent(new Event("resize")), 1'); await sleep(1500);
console.log(" • мобильный ресайз:", await ev('renderer.domElement.width + "×" + renderer.domElement.height + " · камера " + camera.aspect.toFixed(2)'));
await sleep(800);
console.log("\\n=== ОШИБКИ И ПРЕДУПРЕЖДЕНИЯ: " + problems.length + " ===");
[...new Set(problems)].slice(0, 20).forEach(p => console.log(" !", p));
process.exit(0);
