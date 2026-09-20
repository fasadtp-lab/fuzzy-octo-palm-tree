# Собирает docs/ — автономную версию 3D-тура для GitHub Pages.
# Открывается по обычной ссылке в любом браузере: аккаунт не нужен,
# внешних зависимостей нет (three.js и шрифты лежат рядом/вшиты).
import base64, pathlib, re, shutil, sys

here = pathlib.Path(__file__).parent
root = here.parent
docs = root / "docs"
docs.mkdir(exist_ok=True)
src = (here / "index.html").read_text(encoding="utf-8")

# python3 build-public.py [https://ваш-домен.ру/папка/] — адрес нужен только
# для og-тегов (превью ссылки в мессенджерах). Без аргумента ставим
# относительные пути: большинство мессенджеров их разбирает само.
SITE = sys.argv[1] if len(sys.argv) > 1 else ""
if SITE and not SITE.endswith("/"):
    SITE += "/"

# three.js подключаем локально вместо CDN
src = re.sub(r"/\* -+ загрузка three\.js.*?\n\}\)\(\);\n", "", src, flags=re.S)
src = src.replace('<canvas id="scene"></canvas>', '<canvas id="scene"></canvas>', 1)

def font(pkg, name, weight, family):
    f = root / "video" / "node_modules" / "@fontsource" / pkg / "files" / name
    return ("@font-face{font-family:'%s';font-style:normal;font-weight:%d;font-display:swap;"
            "src:url(data:font/woff2;base64,%s) format('woff2')}"
            % (family, weight, base64.b64encode(f.read_bytes()).decode()))

fonts = "".join([
    font("manrope", "manrope-cyrillic-400-normal.woff2", 400, "Manrope"),
    font("manrope", "manrope-cyrillic-500-normal.woff2", 500, "Manrope"),
    font("manrope", "manrope-cyrillic-600-normal.woff2", 600, "Manrope"),
    font("manrope", "manrope-cyrillic-700-normal.woff2", 700, "Manrope"),
    font("unbounded", "unbounded-cyrillic-500-normal.woff2", 500, "Unbounded"),
    font("unbounded", "unbounded-cyrillic-600-normal.woff2", 600, "Unbounded"),
])

# ссылку на Google Fonts убираем — шрифты вшиты
src = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>\n', "", src)

HEAD = """<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#2E5B4F">
<meta name="description" content="3D-тур по квартире № 643, 39,30 м², ул. Родины, Казань. Прогулка от первого лица по квартире с готовым ремонтом — с компьютера или телефона.">
<meta property="og:type" content="website">
<meta property="og:title" content="Квартира № 643 — 3D-тур с ремонтом">
<meta property="og:description" content="1-комнатная, 39,30 м², ул. Родины. Пройдитесь по квартире от первого лица прямо в браузере.">
<meta property="og:image" content="SITE_URLposter.jpg">
OG_URL
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#127968;</text></svg>">
<style>
FONTS
*{box-sizing:border-box}
html,body{height:100%;margin:0;overscroll-behavior:none;-webkit-tap-highlight-color:transparent}
body{font:14px/1.5 Manrope,-apple-system,"Segoe UI",Roboto,sans-serif;background:#F6F1EA;color:#241B14;
  touch-action:none;-webkit-text-size-adjust:100%}
img{max-width:100%}
[hidden]{display:none!important}
:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
</style>
""".replace("OG_URL", '<meta property="og:url" content="%s">' % SITE if SITE else "")\
       .replace("SITE_URL", SITE).replace("FONTS", fonts)

TAIL = """
<script src="three.min.js"></script>
<script>
(function () {                                   // запуск + мелочи, нужные только публичной версии
  function boot() { try { init(); } catch (e) {
    var el = document.getElementById("load");
    if (el) el.textContent = "Браузер не смог запустить 3D (" + e.message + "). Попробуйте Chrome или Safari посвежее.";
  } }
  if (!window.THREE) {
    var el = document.getElementById("load");
    if (el) el.textContent = "Не удалось загрузить 3D-библиотеку. Обновите страницу.";
    return;
  }
  boot();
  if (window.__noWebGL) {                        // 3D не запустится — предлагаем видеообзор
    var go = document.getElementById("go");
    if (go) {
      go.disabled = false; go.style.opacity = 1; go.style.cursor = "pointer";
      go.textContent = "Смотреть видеообзор, 1:19";
      go.addEventListener("click", function () { window.open("video.mp4", "_blank", "noopener"); });
    }
  }
  // кнопка «поделиться» — на телефоне открывает системное меню отправки
  var tools = document.getElementById("tools");
  if (tools && navigator.share && /^https?:$/.test(location.protocol)) {
    var b = document.createElement("button");
    b.className = "tbtn"; b.type = "button"; b.textContent = "Поделиться ссылкой";
    b.addEventListener("click", function () {
      navigator.share({ title: "Квартира № 643 — 3D-тур", text: "1-комнатная, 39,30 м², ул. Родины", url: location.href })
        .catch(function () { });
    });
    tools.appendChild(b);
  }
  // полноэкранный режим есть не везде (например, Safari на iPhone) — прячем кнопку
  if (!document.documentElement.requestFullscreen) {
    var f = document.getElementById("btnFull"); if (f) f.hidden = true;
  }
})();
</script>
</body>
</html>
"""

video = root / "video" / "tour-643.mp4"
if video.exists() and video.stat().st_size > 1_000_000:
    shutil.copy(video, docs / "video.mp4")
VIDEO_BTN = """
<script>
(function () {
  var tools = document.getElementById("tools");
  if (!tools) return;
  var a = document.createElement("button");
  a.className = "tbtn"; a.type = "button"; a.textContent = "Видеообзор, 1:19";
  a.addEventListener("click", function () { window.open("video.mp4", "_blank", "noopener"); });
  tools.appendChild(a);
})();
</script>
""" if (docs / "video.mp4").exists() else ""
(docs / "index.html").write_text(HEAD + src + VIDEO_BTN + TAIL, encoding="utf-8")
shutil.copy(root / "video" / "node_modules" / "three" / "build" / "three.min.js", docs / "three.min.js")
poster = root / "video" / "poster-643.jpg"
if poster.exists():
    shutil.copy(poster, docs / "poster.jpg")
(docs / ".nojekyll").write_text("", encoding="utf-8")
(docs / ".htaccess").write_text("""# Сжатие: three.min.js уезжает 160 КБ вместо 633 КБ
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain application/javascript application/json image/svg+xml
</IfModule>
# Кэш: повторные открытия тура не тянут библиотеку заново
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType application/javascript "access plus 30 days"
  ExpiresByType image/jpeg "access plus 30 days"
  ExpiresByType video/mp4 "access plus 30 days"
  ExpiresByType text/html "access plus 10 minutes"
</IfModule>
AddType video/mp4 .mp4
AddDefaultCharset UTF-8
DirectoryIndex index.html
""", encoding="utf-8")
print("docs/index.html", (docs / "index.html").stat().st_size, "байт")

# --- версия одним файлом: three.js вшит внутрь, ничего рядом не нужно.
# Открывается двойным кликом и работает без интернета и без хостинга.
three = (root / "video" / "node_modules" / "three" / "build" / "three.min.js").read_text(encoding="utf-8")
single = (HEAD + src + TAIL
          .replace('<script src="three.min.js"></script>', "<script>" + three + "</script>"))
out = root / "dist" / "kvartira-643-3d-tour.html"
out.parent.mkdir(exist_ok=True)
out.write_text(single, encoding="utf-8")
print("dist/kvartira-643-3d-tour.html", out.stat().st_size, "байт")

# --- архив сайта: собираем здесь же, иначе он отстаёт от docs/
import zipfile
zp = root / "dist" / "kvartira-643-site.zip"
with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
    for f in ["index.html", "three.min.js", "video.mp4", "poster.jpg", ".htaccess"]:
        if (docs / f).exists():
            z.write(docs / f, f)
print("dist/kvartira-643-site.zip", zp.stat().st_size, "байт")
