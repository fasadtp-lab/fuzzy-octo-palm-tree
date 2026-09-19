// Скриншот произвольной страницы в headless-Chromium: node shot-page.mjs <url> <W> <H> <out> [clickSelector]
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
const [url, W, H, out, click] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5], process.argv[6]];
const PORT = 9555 + Math.floor(Math.random() * 300);
const chrome = spawn("/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--hide-scrollbars","--use-angle=swiftshader",
   "--enable-unsafe-swiftshader","--disable-gpu-compositing","--allow-file-access-from-files",
   `--window-size=${W},${H}`,`--remote-debugging-port=${PORT}`,"about:blank"], { stdio: "ignore" });
process.on("exit", () => chrome.kill());
let ws0;
for (let i = 0; i < 60 && !ws0; i++) {
  try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    ws0 = l.find(t => t.type === "page")?.webSocketDebuggerUrl; } catch (e) { }
  if (!ws0) await sleep(400);
}
const ws = new WebSocket(ws0); await new Promise(r => ws.addEventListener("open", r));
let id = 0; const w = new Map();
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && w.has(m.id)) { w.get(m.id)(m); w.delete(m.id); } });
const cmd = (method, params = {}) => { const n = ++id; ws.send(JSON.stringify({ id: n, method, params })); return new Promise(r => w.set(n, r)); };
const ev = async x => (await cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true })).result?.value;
await cmd("Page.enable"); await cmd("Runtime.enable");
await cmd("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: W < 500 });
if (W < 500) await cmd("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await cmd("Page.navigate", { url });
await sleep(3500);
if (click) { await ev(`document.querySelector("${click}")?.click(), 1`); await sleep(2500); }
const r = await cmd("Page.captureScreenshot", { format: "jpeg", quality: 92, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
writeFileSync(out, Buffer.from(r.result.data, "base64"));
console.log("сохранено:", out, await ev("({w:innerWidth,h:innerHeight,three:!!window.THREE,ready:!!window.renderer})") && JSON.stringify(await ev("({three:!!window.THREE,touch:document.body.className})")));
process.exit(0);
