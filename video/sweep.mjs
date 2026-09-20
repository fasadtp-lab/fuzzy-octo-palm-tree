// Обзор всей квартиры: одна загрузка страницы, много ракурсов подряд.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
const W = 640, H = 360, PORT = 9800 + Math.floor(Math.random() * 150);
const chrome = spawn("/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--hide-scrollbars","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader","--disable-gpu-compositing","--allow-file-access-from-files",
   `--window-size=${W},${H}`,`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
process.on("exit", () => chrome.kill());
let t; for (let i = 0; i < 60 && !t; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    t = l.find(x => x.type === "page")?.webSocketDebuggerUrl; } catch (e) { } if (!t) await sleep(400); }
const ws = new WebSocket(t); await new Promise(r => ws.addEventListener("open", r));
let id = 0; const wait = new Map(); const errors = [];
ws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); return; }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
const cmd = (m, p = {}) => { const n = ++id; ws.send(JSON.stringify({ id: n, method: m, params: p })); return new Promise(r => wait.set(n, r)); };
const ev = async x => (await cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true })).result?.result?.value;
await cmd("Page.enable"); await cmd("Runtime.enable");
await cmd("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cmd("Page.navigate", { url: "file:///home/user/fuzzy-octo-palm-tree/docs/index.html" });
await sleep(4000);
await ev('document.getElementById("go").click(), document.getElementById("passport").hidden = true, document.getElementById("tools").hidden = true, document.getElementById("keys").hidden = true, document.getElementById("mapwrap").hidden = true, 1');
await sleep(2000);
mkdirSync("sweep", { recursive: true });
async function shot(name, x, z, yaw, pitch) {
  await ev(`P.x=${x}, P.z=${z}, P.yaw=${yaw}, P.pitch=${pitch || -0.03}, 1`);
  await sleep(700);
  const r = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 88, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
  writeFileSync(`sweep/${name}.jpg`, Buffer.from(r.result.data, "base64"));
}
await ev("setEvening(true), 1"); await sleep(1500);
await shot("evening-living", 4.60, 4.25, Math.PI * 0.75, -0.05);
await shot("evening-bed", 2.60, 4.50, Math.PI * 1.3, -0.05);
await shot("evening-hall", 2.90, 1.55, Math.PI * 0.2, -0.05);
await ev("setEvening(false), 1");
console.log("кадров снято: 3 · исключений:", errors.length, errors.slice(0, 3).join(" | "));
process.exit(0);
