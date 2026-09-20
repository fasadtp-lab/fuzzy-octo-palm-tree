// Проверка тач-управления: джойстик двигает игрока, свайп поворачивает камеру.
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
const PORT = 9950 + Math.floor(Math.random() * 40), W = 390, H = 844;
const chrome = spawn("/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--hide-scrollbars","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader","--disable-gpu-compositing","--allow-file-access-from-files",
   `--window-size=${W},${H}`,`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
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
await cmd("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: true });
await cmd("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await cmd("Page.navigate", { url: "file:///home/user/fuzzy-octo-palm-tree/docs/index.html" });
await sleep(4200);
await ev('document.getElementById("go").click(), 1'); await sleep(1200);
console.log("тач-режим включён:", await ev('document.body.classList.contains("touch")'));
console.log("джойстик виден:", await ev('!!document.getElementById("stick") && getComputedStyle(document.getElementById("touch")).display !== "none"'));

const before = await ev('JSON.stringify({x:+P.x.toFixed(3), z:+P.z.toFixed(3), yaw:+P.yaw.toFixed(3)})');
const stick = await ev('(function(){var r=document.getElementById("stick").getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2});})()');
const s = JSON.parse(stick);
const touch = (type, x, y) => cmd("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
await touch("touchStart", s.x, s.y);
for (let i = 1; i <= 8; i++) { await touch("touchMove", s.x, s.y - i * 6); await sleep(120); }
await sleep(600);
await touch("touchEnd", s.x, s.y - 48);
const afterMove = await ev('JSON.stringify({x:+P.x.toFixed(3), z:+P.z.toFixed(3)})');
// свайп по правой половине — поворот камеры
await touch("touchStart", W - 60, 400);
for (let i = 1; i <= 6; i++) { await touch("touchMove", W - 60 - i * 12, 400); await sleep(90); }
await touch("touchEnd", W - 132, 400);
const afterLook = await ev('+P.yaw.toFixed(3)');
const b = JSON.parse(before), m = JSON.parse(afterMove);
const moved = Math.hypot(m.x - b.x, m.z - b.z);
console.log("до:", before);
console.log("после джойстика:", afterMove, "— смещение", moved.toFixed(2), "м:", moved > 0.15 ? "ХОДЬБА РАБОТАЕТ" : "НЕ ДВИГАЕТСЯ");
console.log("поворот свайпом:", Math.abs(afterLook - b.yaw).toFixed(3), "рад:", Math.abs(afterLook - b.yaw) > 0.05 ? "РАБОТАЕТ" : "НЕ РАБОТАЕТ");
console.log("подсказка показана и гаснет:", await ev('(function(){var t=document.getElementById("tip");return t.hidden ? "уже скрыта" : "видна, прозрачность " + (t.style.opacity||"1");})()'));
process.exit(0);
