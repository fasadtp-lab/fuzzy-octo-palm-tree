/* Покадровый рендер tour.html в headless-Chromium (WebGL на SwiftShader) и сборка mp4.
   Кадры идут в ffmpeg через stdin — на диске ничего не копится.
   node render.mjs                → полное видео video/tour-643.mp4
   node render.mjs --stills 10,300,900 → отдельные кадры для проверки  */
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname);
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const FFMPEG = path.join(DIR, "node_modules/@ffmpeg-installer/linux-x64/ffmpeg");
const W = 1280, H = 720, FPS = 30, PORT = 9333;
const stills = process.argv.includes("--stills")
  ? process.argv[process.argv.indexOf("--stills") + 1].split(",").map(Number) : null;

const chrome = spawn(CHROME, [
  "--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars",
  "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-gpu-compositing",
  "--allow-file-access-from-files", "--force-device-scale-factor=1",
  `--window-size=${W},${H}`, `--remote-debugging-port=${PORT}`, "about:blank"
], { stdio: ["ignore", "ignore", "pipe"] });
chrome.stderr.on("data", () => {});
process.on("exit", () => chrome.kill());

async function target() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await r.json();
      const page = list.find(t => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch (e) { }
    await sleep(500);
  }
  throw new Error("Chromium не поднялся");
}

const ws = new WebSocket(await target());
await new Promise(r => ws.addEventListener("open", r));
let id = 0; const waiting = new Map();
ws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
});
function cmd(method, params = {}) {
  const n = ++id;
  ws.send(JSON.stringify({ id: n, method, params }));
  return new Promise(res => waiting.set(n, m => {
    if (m.error) throw new Error(method + ": " + m.error.message);
    res(m.result);
  }));
}
async function evaluate(expr) {
  const r = await cmd("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(expr.slice(0, 40) + " → " + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

await cmd("Page.enable"); await cmd("Runtime.enable");
await cmd("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await cmd("Page.navigate", { url: "file://" + path.join(DIR, "tour.html") });
await sleep(2500);
await evaluate("document.fonts.ready.then(()=>1)");
console.log("страница загружена, собираю сцену…");
const t0 = Date.now();
await evaluate("window.__W=1280, window.__H=720, window.__AA=true, bootRender(), 1");
for (let i = 0; i < 120 && !(await evaluate("!!window.__ready")); i++) await sleep(500);
const total = await evaluate("window.__total");
console.log(`сцена готова за ${((Date.now() - t0) / 1000).toFixed(1)} с, кадров: ${total} (${(total / FPS).toFixed(0)} с)`);

async function shot() {
  const r = await cmd("Page.captureScreenshot", {
    format: "jpeg", quality: 93, captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: W, height: H, scale: 1 }
  });
  return Buffer.from(r.data, "base64");
}

if (stills) {
  mkdirSync(path.join(DIR, "stills"), { recursive: true });
  for (const f of stills) {
    await evaluate(`__frame(${f}), 1`);
    writeFileSync(path.join(DIR, "stills", `f${f}.jpg`), await shot());
    console.log("кадр", f, "сохранён");
  }
  ws.close(); chrome.kill(); process.exit(0);
}

const out = path.join(DIR, "tour-643.mp4");
const ff = spawn(FFMPEG, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
  "-vf", "crop=1272:712:4:4,scale=1280:720:flags=lanczos", "-an",
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-threads", "1",
  "-movflags", "+faststart", "-r", String(FPS), out], { stdio: ["pipe", "ignore", "pipe"] });
let ffErr = ""; ff.stderr.on("data", d => { ffErr += d; if (ffErr.length > 4000) ffErr = ffErr.slice(-2000); });

const start = Date.now();
for (let i = 0; i < total; i++) {
  await evaluate(`__frame(${i}), 1`);
  const buf = await shot();
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
  if (i % 60 === 0 || i === total - 1) {
    const el = (Date.now() - start) / 1000, fps = (i + 1) / el;
    console.log(`кадр ${i + 1}/${total} · ${fps.toFixed(1)} кадр/с · осталось ~${((total - i - 1) / fps / 60).toFixed(1)} мин`);
  }
}
ff.stdin.end();
await new Promise(r => ff.on("close", r));
console.log("готово:", out);
console.log(ffErr.split("\n").slice(-3).join("\n"));
ws.close(); chrome.kill(); process.exit(0);
