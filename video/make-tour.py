# Собирает video/tour.html: та же сцена, что в 3d-tour/index.html, но с кинематографичным
# оверлеем, локальным three.js и без интерфейса — для покадрового рендера видео.
import base64, pathlib, re
here = pathlib.Path(__file__).parent
src = (here.parent / "3d-tour" / "index.html").read_text(encoding="utf-8")

# 1. убираем загрузчик CDN — three.js подключаем локально
src = re.sub(r"/\* -+ загрузка three\.js.*?\n\}\)\(\);\n", "", src, flags=re.S)

# в рендере MSAA отключается флагом — софтверный WebGL на нём сильно проседает
src = src.replace("antialias: true", "antialias: window.__AA !== false")

def font(pkg, name, weight, family, style="normal"):
    p = here / "node_modules" / "@fontsource" / pkg / "files" / name
    b64 = base64.b64encode(p.read_bytes()).decode()
    return ("@font-face{font-family:'%s';font-style:%s;font-weight:%d;font-display:block;"
            "src:url(data:font/woff2;base64,%s) format('woff2')}" % (family, style, weight, b64))

fonts = "".join([
    font("manrope", "manrope-cyrillic-400-normal.woff2", 400, "Manrope"),
    font("manrope", "manrope-cyrillic-500-normal.woff2", 500, "Manrope"),
    font("manrope", "manrope-cyrillic-600-normal.woff2", 600, "Manrope"),
    font("manrope", "manrope-cyrillic-700-normal.woff2", 700, "Manrope"),
    font("unbounded", "unbounded-cyrillic-500-normal.woff2", 500, "Unbounded"),
    font("unbounded", "unbounded-cyrillic-600-normal.woff2", 600, "Unbounded"),
])

overlay = """
<style>
""" + fonts + """
#passport,#tools,#mapwrap,#keys,#dot,#touch,#start{display:none!important}
body{background:#000}
#scene{width:1280px;height:720px;inset:0}
.cin{position:fixed;font-family:'Manrope',sans-serif;z-index:30;pointer-events:none}
#vig{position:fixed;inset:0;z-index:25;pointer-events:none;
  background:radial-gradient(120% 95% at 50% 45%,rgba(0,0,0,0) 45%,rgba(20,12,6,.38) 100%)}
#plate{top:26px;left:30px;display:flex;align-items:center;gap:10px;
  background:rgba(20,15,11,.55);border:1px solid rgba(255,244,230,.22);border-radius:10px;
  padding:7px 12px;backdrop-filter:blur(6px)}
#plate b{font-family:'Unbounded',sans-serif;font-weight:500;font-size:13px;color:#FBF5EC;letter-spacing:.01em}
#plate span{font-size:12px;font-weight:600;color:#E0CDB6;letter-spacing:.06em;text-transform:uppercase}
#scrim{position:fixed;left:0;right:0;bottom:0;height:34%;z-index:26;pointer-events:none;
  background:linear-gradient(0deg,rgba(18,12,7,.72) 0%,rgba(18,12,7,.34) 45%,rgba(18,12,7,0) 100%)}
#cap{left:30px;bottom:34px;opacity:0;max-width:640px;border-left:3px solid #C98B5E;padding:2px 0 2px 16px}
#capT{font-family:'Unbounded',sans-serif;font-weight:600;font-size:30px;line-height:1.14;color:#FFF9F1;
  margin:0;text-shadow:0 3px 22px rgba(0,0,0,.72)}
#capS{margin:7px 0 0;font-size:16px;font-weight:500;color:#F0DFC9;text-shadow:0 2px 14px rgba(0,0,0,.8)}
.card{position:fixed;inset:0;display:flex;flex-direction:column;justify-content:center;
  padding:0 96px;opacity:0;z-index:35;background:linear-gradient(90deg,rgba(24,16,10,.92) 0%,rgba(24,16,10,.72) 55%,rgba(24,16,10,.35) 100%)}
.card .eye{font-size:13px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#D9A273;margin:0 0 18px}
.card h1{font-family:'Unbounded',sans-serif;font-weight:600;font-size:56px;line-height:1.06;color:#FFF8EF;margin:0;letter-spacing:-.01em}
.card h2{font-family:'Unbounded',sans-serif;font-weight:500;font-size:34px;line-height:1.14;color:#FFF8EF;margin:0 0 22px}
.card p{font-size:20px;font-weight:500;color:#EBDAC3;margin:20px 0 0;max-width:620px;line-height:1.5}
#outro ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px 40px;max-width:760px}
#outro li{display:flex;align-items:center;gap:12px;font-size:18px;font-weight:600;color:#F3E6D4}
#outro i{width:18px;height:18px;border-radius:5px;border:1px solid rgba(255,255,255,.35);flex:0 0 auto}
#outro .foot{margin-top:30px;font-size:17px;color:#D4BFA4;font-weight:500}
</style>
<div id="vig"></div>
<div id="scrim"></div>
<div class="cin" id="plate"><b>№ 643</b><span>39,30 м²</span></div>
<div class="cin" id="cap"><p id="capT"></p><p id="capS"></p></div>
<div class="card" id="intro">
  <p class="eye">КамаСтройИнвест · Казань</p>
  <h1>Квартира № 643</h1>
  <p>1-комнатная, 39,30 м², ул. Родины. Видеообзор с готовым ремонтом: светлые телесные обои, тёмный ламинат, белые двери, бежевый керамогранит.</p>
</div>
<div class="card" id="outro">
  <h2>Что уже сделано в квартире</h2>
  <ul>
    <li><i style="background:#E8D6C6"></i>Светлые телесные обои</li>
    <li><i style="background:#3B2A21"></i>Тёмный ламинат, 33 класс</li>
    <li><i style="background:#F5F4F1"></i>Белые двери и оконные рамы</li>
    <li><i style="background:#D9C7AF"></i>Керамогранит бежевый 600×600</li>
    <li><i style="background:#FBFBF8"></i>Белый кухонный гарнитур</li>
    <li><i style="background:#C4566B"></i>Акценты живыми цветами</li>
  </ul>
  <p class="foot">Прихожая 5,80 · санузел 4,50 · кухня-гостиная 17,70 · спальня 11,30 · потолок 2,70 м</p>
</div>
"""

src = src.replace("<canvas id=\"scene\"></canvas>", "<script src=\"three.min.js\"></script>\n<canvas id=\"scene\"></canvas>", 1)
src = src.replace("</script>", "</script>\n" + overlay + "\n<script src=\"cinema.js\"></script>", 1)
(here / "tour.html").write_text(src, encoding="utf-8")
print("tour.html", len(src))
