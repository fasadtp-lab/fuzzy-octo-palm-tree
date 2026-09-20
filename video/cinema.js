/* Кинематографический проход по квартире № 643 для рендера видео.
   Кадры считаются по номеру, а не по времени: рендер идёт медленнее реального
   времени, поэтому все анимации (движение камеры, двери, титры) привязаны к i/FPS. */
var FPS = 30, EYE = 1.56;
function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
function lerp(a, b, p) { return a + (b - a) * p; }

/* shot: длительность, откуда/куда идёт камера [x,z], куда смотрит [x,z,y], титр */
var SHOTS = [
  { d: 7.0, from: [2.78, 1.62], to: [2.62, 1.28], la: [2.05, 2.50, 1.30], lb: [4.05, 0.45, 1.35],
    title: "Прихожая", sub: "5,80 м² · оттоманка с полками и крючками" },
  { d: 6.0, from: [3.05, 1.55], to: [3.62, 2.55], la: [4.30, 3.10, 1.40], lb: [5.30, 3.80, 1.25],
    title: "", sub: "" },
  { d: 7.5, from: [4.20, 3.95], to: [4.45, 3.05], la: [5.80, 1.30, 1.40], lb: [5.95, 1.05, 1.35],
    title: "Кухня-гостиная", sub: "17,70 м² · окно 1830 мм на юг" },
  { d: 6.5, from: [4.62, 2.75], to: [4.80, 2.35], la: [6.05, 1.20, 1.20], lb: [6.20, 1.35, 1.10],
    title: "Белый гарнитур, тёмная столешница", sub: "1,47 + 1,93 м · фартук керамогранит" },
  { d: 6.5, from: [4.40, 4.30], to: [4.68, 3.90], la: [5.85, 3.50, 1.05], lb: [5.95, 3.35, 1.00],
    title: "Обеденная зона у кухни", sub: "стол 1100×700 · проход вдоль стены свободен" },
  { d: 7.5, from: [4.15, 4.80], to: [4.25, 5.25], la: [6.05, 5.20, 1.15], lb: [6.25, 5.75, 1.00],
    title: "Гостиная", sub: "диван 1,8 м · ТВ-зона напротив" },
  { d: 6.0, from: [4.22, 4.60], to: [4.12, 5.05], la: [4.95, 6.55, 1.75], lb: [5.55, 6.50, 1.40],
    title: "Тёмный ламинат, светлые телесные обои", sub: "потолок 2,70 м · белые оконные рамы" },
  { d: 7.5, from: [2.52, 2.15], to: [2.72, 3.35], la: [1.70, 4.60, 1.30], lb: [1.00, 5.35, 1.00],
    title: "Спальня", sub: "11,30 м² · окно 1570 мм", cut: true },
  { d: 7.0, from: [2.74, 5.55], to: [2.70, 4.75], la: [0.95, 3.60, 1.35], lb: [1.05, 3.10, 1.60],
    title: "Кровать 1600×2000", sub: "шкаф во всю стену · вход аркой без двери" },
  { d: 4.5, from: [2.88, 1.34], to: [2.32, 1.34], la: [0.35, 1.40, 1.35], lb: [0.30, 1.55, 1.20],
    title: "Санузел", sub: "4,50 м² · керамогранит, тёмная акцентная стена", cut: true },
  { d: 5.0, from: [1.62, 1.26], to: [1.44, 1.36], la: [0.55, 2.15, 1.05], lb: [0.38, 2.30, 0.90],
    title: "", sub: "" },
  { d: 8.0, from: [4.30, 5.05], to: [4.42, 3.45], la: [5.95, 2.70, 1.45], lb: [6.25, 1.30, 1.50],
    title: "Квартира № 643 · 39,30 м²", sub: "ул. Родины · КамаСтройИнвест", cut: true }
];
var TOTAL = SHOTS.reduce(function (s, x) { return s + x.d; }, 0);
var TOTAL_FRAMES = Math.round(TOTAL * FPS);

function shotAt(t) {
  var acc = 0;
  for (var i = 0; i < SHOTS.length; i++) {
    if (t < acc + SHOTS[i].d || i === SHOTS.length - 1) return { s: SHOTS[i], p: Math.min(1, (t - acc) / SHOTS[i].d), i: i };
    acc += SHOTS[i].d;
  }
}
function setTitle(s, p, t) {
  var box = document.getElementById("cap"), h = document.getElementById("capT"), sb = document.getElementById("capS");
  if (!s.title || t < 3.8) { box.style.opacity = 0; return; }
  var inn = Math.min(1, p / 0.10), out = Math.min(1, (1 - p) / 0.14);
  box.style.opacity = Math.min(inn, out).toFixed(3);
  if (h.textContent !== s.title) { h.textContent = s.title; sb.textContent = s.sub; }
}
function __frame(i) {
  var t = i / FPS, at = shotAt(t), s = at.s, p = ease(at.p);
  var px = lerp(s.from[0], s.to[0], p), pz = lerp(s.from[1], s.to[1], p);
  var lx = lerp(s.la[0], s.lb[0], p), lz = lerp(s.la[1], s.lb[1], p), ly = lerp(s.la[2], s.lb[2], p);
  P.x = px; P.z = pz;
  var yaw = Math.atan2(-(lx - px), -(lz - pz));
  var pitch = Math.atan2(ly - EYE, Math.max(0.35, Math.hypot(lx - px, lz - pz)));
  camera.position.set(px, EYE, pz);
  camera.rotation.set(pitch, yaw, 0, "YXZ");
  doorObjs.forEach(function (d) {
    var dist = Math.hypot(px - d.x, pz - d.z), tgt = dist < 1.95 ? d.open : 0;
    if (s.cut && at.p * s.d < 0.5) d.cur = tgt; else d.cur += (tgt - d.cur) * 0.10;
    d.g.rotation.y = d.base + d.cur;
  });
  setTitle(s, at.p, t);
  var intro = document.getElementById("intro");
  intro.style.opacity = t < 3.6 ? Math.min(1, Math.min(t / 0.5, (3.6 - t) / 0.9)).toFixed(3) : 0;
  var outro = document.getElementById("outro"), tEnd = TOTAL - t;
  outro.style.opacity = tEnd < 5.2 ? Math.min(1, Math.min((5.2 - tEnd) / 0.9, tEnd / 0.6)).toFixed(3) : 0;
  renderer.render(scene, camera);
}
function bootRender() {
  window.requestAnimationFrame = function () { };          // отключаем реальный цикл
  init();
  renderer.setPixelRatio(1);
  camera.fov = 90;                                          // широкий угол — стандарт для съёмки интерьеров
  var RW = window.__W || 1280, RH = window.__H || 720;
  renderer.setSize(RW, RH, false);
  camera.aspect = RW / RH; camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  sunLight.shadow.autoUpdate = false;                       // солнце статично — тень считаем один раз
  window.__total = TOTAL_FRAMES;
  window.__ready = true;
}
