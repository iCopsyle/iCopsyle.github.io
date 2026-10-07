/* Desert Game Boy portfolio: loading, the scroll timeline, the dive into the screen,
   the worlds inside it, and the UI. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { createWorld, groundHeight } from "./world.js";
import { createGameBoy } from "./gameboy.js";
import { createScreen } from "./screen.js";
import { createAudio } from "./audio.js";
import { createPost } from "./post.js";
import { createHourZero } from "./worlds/hourzero.js";
import { createIGNH } from "./worlds/ignh.js";
import { createShelf } from "./worlds/shelf.js";
import { LCD_ASPECT, coverFov } from "./worlds/common.js";
import { FEATURED, LIBRARY } from "./data.js";
import { t, getLang, setLang, gameText, applyDocLang } from "./i18n.js";
import { clamp, lerp, smoothstep, damp, easeInOut } from "./noise.js";

window.__siteStarted = true;                     // tells the loader's watchdog the scripts arrived
const $ = s => document.querySelector(s);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ the timeline
   Progress p runs 0..1 over the page height. */
const SEG = {
  hero: [0, 0.04], approach: [0.04, 0.17], dive: [0.17, 0.24],
  hz: [0.24, 0.43], ignh: [0.43, 0.62], shelf: [0.62, 0.8],
  exit: [0.8, 0.865], pull: [0.865, 0.95], contact: [0.95, 1]
};
const POWER_AT = 0.07;            // the Game Boy switches on
const LCD_WORLD = [0.115, 0.15];  // the screen fades from its title page to the live HourZero world
const RESOLVE = 0.035;            // after the dive, pixels sharpen into full 3D over this much scroll
const SWITCH = 0.013;             // half-width of the pixel switch between worlds
const local = (p, [a, b]) => clamp((p - a) / (b - a));
const ANCHOR = {
  hero: 0, games: SEG.hz[0] + 0.06, ignh: SEG.ignh[0] + 0.06, library: SEG.shelf[0] + 0.03, contact: 1
};
const SHOWN = [FEATURED[0], FEATURED[1]];        // the two games with their own worlds
const ALL = [...FEATURED, ...LIBRARY].map(g => ({ ...g, cover: g.shots ? g.shots[0] : g.thumb }));

/* ------------------------------------------------------------------ renderer */
const canvas = $("#gl");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
} catch (e) {
  $("#loader .loader-line span").textContent = "// This site needs WebGL. Every game is on icopsyle.itch.io";
  throw e;
}
const PR = () => Math.min(window.devicePixelRatio || 1, innerWidth < 900 ? 1.5 : 1.75);
renderer.setPixelRatio(PR());
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, Math.max(1, innerWidth) / Math.max(1, innerHeight), 0.1, 5000);
const post = createPost(renderer, scene, camera);
const audio = createAudio();
// the Game Boy screen renders the world inside it at its own resolution
const lcdRT = new THREE.WebGLRenderTarget(320, 288, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });

/* ------------------------------------------------------------------ loading */
const manager = new THREE.LoadingManager();
const pctEl = $("#loadPct"), barEl = $("#loadBar");
let shownPct = 0;
manager.onProgress = (_, loaded, total) => {
  const k = loaded / Math.max(total, 1);
  shownPct = Math.max(shownPct, k);
  pctEl.textContent = String(Math.round(shownPct * 100)).padStart(3, "0") + "%";
  barEl.style.transform = `scaleX(${shownPct})`;
};
const texLoader = new THREE.TextureLoader(manager);
const imgLoader = new THREE.ImageLoader(manager);
const draco = new DRACOLoader(manager);
draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/");
const gltfLoader = new GLTFLoader(manager);
gltfLoader.setDRACOLoader(draco);
const hdrLoader = new RGBELoader(manager);

const tex = (url, srgb, flip = true) => new Promise(res => texLoader.load(url, t => {
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.flipY = flip;
  res(t);
}, undefined, () => res(new THREE.Texture())));
const img = url => new Promise(res => imgLoader.load(url, res, undefined, () => res(null)));
const gltf = url => new Promise((res, rej) => gltfLoader.load(url, res, undefined, rej));
const hdr = url => new Promise(res => hdrLoader.load(url, res, undefined, () => res(null)));

const T = "assets/tex/", HZ = "assets/models/hz/", IG = "assets/models/ignh/";
const FACE_SPRITES = ["eye_l_open", "eye_r_open", "eye_l_half", "eye_r_half", "eye_l_closed", "eye_r_closed",
  "pupil_l", "pupil_r", "brow_l", "brow_r", "mouth_0", "mouth_1", "mouth_2"];

async function loadAll() {
  const jobs = {
    gb: gltf("assets/models/gameboy.glb"),
    cliffGltf: gltf("assets/models/cliff.glb"),
    cliffRockColor: tex(T + "cliff_rock_color.webp", true, false),
    cliffRockNormal: tex(T + "cliff_rock_normal.webp", false, false),
    env: hdr(T + "env_sunglow.hdr"),
    sandColor: tex(T + "sand_fine_color.webp", true),
    sandNormal: tex(T + "sand_normal.webp", false),
    cliffColor: tex(T + "cliff_color.webp", true),
    gb_ext_emissive: tex(T + "gb_ext_emissive.webp", true, false),
    // HourZero
    drone: gltf(HZ + "drone.glb"),
    asteroid: gltf(HZ + "asteroid.glb"),
    astColor: tex(HZ + "asteroid_color.webp", true, false),
    astNormal: tex(HZ + "asteroid_normal.webp", false, false),
    astEmissive: tex(HZ + "asteroid_emissive.webp", true, false),
    envRed: hdr(HZ + "env_red.hdr"),
    hzSky: tex(HZ + "sky_unearthlyred.webp", true),
    hzGroundColor: tex(HZ + "ground_color.webp", true),
    hzGroundNormal: tex(HZ + "ground_normal.webp", false),
    hzGroundRough: tex(HZ + "ground_rough.webp", false),
    // Insert Game Name Here
    gridNumbered: tex(IG + "grid_numbered.png", true)
  };
  for (const s of ["main", "ext", "cart"]) {
    jobs[`gb_${s}_color`] = tex(T + `gb_${s}_color.webp`, true, false);
    jobs[`gb_${s}_normal`] = tex(T + `gb_${s}_normal.webp`, false, false);
    jobs[`gb_${s}_orm`] = tex(T + `gb_${s}_orm.webp`, false, false);
  }
  for (const s of ["body", "inner", "wing"]) {
    jobs[`drone_${s}_color`] = tex(HZ + `drone_${s}_color.webp`, true, false);
    jobs[`drone_${s}_normal`] = tex(HZ + `drone_${s}_normal.webp`, false, false);
    jobs[`drone_${s}_orm`] = tex(HZ + `drone_${s}_orm.webp`, false, false);
  }
  jobs.drone_body_emissive = tex(HZ + "drone_body_emissive.webp", true, false);
  jobs.drone_inner_emissive = tex(HZ + "drone_inner_emissive.webp", true, false);

  const urls = new Set();
  FEATURED.forEach(f => f.shots.forEach(s => urls.add(s)));
  LIBRARY.forEach(l => urls.add(l.thumb));
  const imgJobs = [...urls].map(u => img(u).then(i => [u, i]));
  const faceJobs = FACE_SPRITES.map(n => img(IG + n + ".png").then(i => [n, i]));
  const fonts = document.fonts ? Promise.all([
    document.fonts.load('16px "Press Start 2P"'), document.fonts.load('900 40px "Unbounded"'), document.fonts.load('12px "JetBrains Mono"'),
    document.fonts.load('700 40px "Readex Pro"', "عمر")
  ]).catch(() => {}) : Promise.resolve();

  const keys = Object.keys(jobs);
  const vals = await Promise.all(keys.map(k => jobs[k]));
  const out = Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
  out.images = Object.fromEntries(await Promise.all(imgJobs));
  out.faceSprites = Object.fromEntries(await Promise.all(faceJobs));
  await fonts;
  return out;
}

/* ------------------------------------------------------------------ build */
let world, gb, screen, rig, worlds;
const screenLight = new THREE.PointLight(0xffffff, 0, 34, 1.6);

function averageColor(image) {
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const g = c.getContext("2d");
  g.drawImage(image, 0, 0, 1, 1);
  const d = g.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(d[0] / 255, d[1] / 255, d[2] / 255, THREE.SRGBColorSpace);
}

function build(A) {
  if (A.env) {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(A.env).texture;
    scene.environmentRotation.y = Math.PI;
    A.env.dispose(); pm.dispose();
  }
  A.sandMean = averageColor(A.sandColor.image);
  world = createWorld({ scene, renderer, textures: A });

  screen = createScreen({ featured: FEATURED, library: LIBRARY, images: A.images, onDing: () => audio.ding() });
  screen.uniforms.uWorld.value = lcdRT.texture;
  gb = createGameBoy({ scene, textures: A, gltf: A.gb, screenMaterial: screen.material, maxAniso: renderer.capabilities.getMaxAnisotropy() });
  gb.setCartLabels(FEATURED.map(f => ({ img: A.images[f.shots[0]], title: f.title })));
  world.uniforms.sand.uGBInv.value.copy(gb.footInv);

  const S = gb.screenInfo;
  screenLight.position.copy(S.center).addScaledVector(S.normal, 1.4);
  scene.add(screenLight);

  worlds = {
    hz: createHourZero({ renderer, A }),
    ignh: createIGNH({ A }),
    shelf: createShelf({ renderer, cartKit: gb.cartKit, games: ALL, images: A.images })
  };
  rig = makeRig();
}

/* ------------------------------------------------------------------ desert camera rig */
function makeRig() {
  const S = gb.screenInfo;
  const c = gb.center.clone();
  const yaw = gb.root.rotation.y;
  const around = (ang, dist, h) => {
    const x = c.x + Math.sin(ang) * dist, z = c.z + Math.cos(ang) * dist;
    return new THREE.Vector3(x, Math.max(groundHeight(x, z) + 1.6, h), z);
  };
  const lcdW = S.width * 0.91, lcdH = S.height * 0.906;

  function framed() {
    const vt = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const wide = camera.aspect >= 1.05 && innerWidth > 900;
    let d = (lcdH / (wide ? 0.54 : 0.46)) / (2 * vt);
    if (!wide) d = Math.max(d, (lcdW / 0.84) / (2 * vt * camera.aspect));
    const visH = 2 * d * vt;
    const pos = S.center.clone().addScaledVector(S.normal, d);
    const target = S.center.clone();
    if (!wide) { pos.addScaledVector(S.up, -visH * 0.17); target.addScaledVector(S.up, -visH * 0.17); }
    return { pos, target, d, wide };
  }
  // where the LCD exactly covers the viewport (a hair of overscan so no bezel shows)
  const OVERSCAN = 0.985;
  function cover() {
    const vt = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const byWidth = camera.aspect >= lcdW / lcdH;
    const d = (byWidth ? lcdW / (2 * vt * camera.aspect) : lcdH / (2 * vt)) * OVERSCAN;
    return { pos: S.center.clone().addScaledVector(S.normal, d), target: S.center.clone(), d, byWidth };
  }

  const heroTarget = c.clone().add(new THREE.Vector3(0, -0.6, 0));
  const endTarget = c.clone().addScaledVector(S.right, -7).add(new THREE.Vector3(0, 3.2, 0));
  let path = null, pullPath = null, F = null, C = null;

  function rebuild() {
    F = framed(); C = cover();
    const narrow = !F.wide;
    const hero = around(yaw - 0.55, narrow ? 40 : 33, c.y - 0.4);
    const mid1 = around(yaw - 0.38, 22, c.y + 1.2);
    const mid2 = F.pos.clone().addScaledVector(S.normal, 6).addScaledVector(S.right, -1.2).add(new THREE.Vector3(0, 0.6, 0));
    path = new THREE.CatmullRomCurve3([hero, mid1, mid2, F.pos], false, "centripetal");
    const out1 = F.pos.clone().addScaledVector(S.normal, 10).add(new THREE.Vector3(0, 2.5, 0));
    const end = around(yaw + 0.42, narrow ? 64 : 46, c.y + 9);
    pullPath = new THREE.CatmullRomCurve3([F.pos, out1, end], false, "centripetal");
    // the mosaic block (device px) that matches one LCD pixel when the LCD covers the screen
    const pr = renderer.getPixelRatio();
    rig.cutBlock = C.byWidth ? innerWidth * pr / (320 * OVERSCAN) : innerHeight * pr / (288 * OVERSCAN);
  }

  const pos = new THREE.Vector3(), target = new THREE.Vector3();
  const rig = { pos, target, rebuild, framedness: 0, cutBlock: 4 };
  rig.eval = p => {
    if (p <= SEG.approach[0]) {
      pos.copy(path.getPointAt(0)); target.copy(heroTarget); rig.framedness = 0;
    } else if (p < SEG.dive[0]) {
      const k = easeInOut(local(p, SEG.approach));
      pos.copy(path.getPointAt(k));
      target.copy(heroTarget).lerp(F.target, smoothstep(0.1, 0.85, k));
      rig.framedness = smoothstep(0.7, 1, k);
    } else if (p < SEG.exit[0]) {
      // the dive: straight into the LCD until it fills the view
      const k = Math.pow(local(p, SEG.dive), 1.6);
      pos.copy(F.pos).lerp(C.pos, k);
      target.copy(F.target).lerp(C.target, k);
      rig.framedness = 1;
    } else if (p < SEG.pull[0]) {
      const k = easeInOut(local(p, SEG.exit));
      pos.copy(C.pos).lerp(F.pos, k);
      target.copy(C.target).lerp(F.target, k);
      rig.framedness = 1;
    } else {
      const k = easeInOut(local(p, [SEG.pull[0], SEG.contact[0] + 0.03]));
      pos.copy(pullPath.getPointAt(k));
      target.copy(F.target).lerp(endTarget, smoothstep(0, 0.9, k));
      rig.framedness = 1 - smoothstep(0, 0.4, k);
    }
    return rig;
  };
  rebuild();
  return rig;
}

/* ------------------------------------------------------------------ scroll + state */
let pTarget = 0, p = 0;
const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
const readScroll = () => { pTarget = clamp(scrollY / maxScroll()); };
addEventListener("scroll", readScroll, { passive: true });
function goTo(v) { window.scrollTo({ top: v * maxScroll(), behavior: REDUCED ? "auto" : "smooth" }); }

/* Which world (if any) we are inside at progress q, and how far through it. */
function phaseAt(q) {
  if (q < SEG.dive[1]) return { inside: null };
  if (q >= SEG.exit[0]) return { inside: null };
  if (q < SEG.hz[1]) return { inside: "hz", k: local(q, SEG.hz) };
  if (q < SEG.ignh[1]) return { inside: "ignh", k: local(q, SEG.ignh) };
  return { inside: "shelf", k: local(q, SEG.shelf) };
}

/* shelf selection: scroll walks the ring; hover, clicks and arrows override until the scroll moves on */
let selOverride = null, selScroll = 0;
function shelfIndex(q) {
  const i = clamp(Math.round(local(q, [SEG.shelf[0] + 0.01, SEG.shelf[1] - 0.025]) * (ALL.length - 1)), 0, ALL.length - 1);
  if (i !== selScroll) { selScroll = i; selOverride = null; }
  return selOverride ?? i;
}

/* ------------------------------------------------------------------ DOM: panels */
const gamePanel = $("#gamePanel"), libPanel = $("#libPanel"), contactPanel = $("#contactPanel");
let shownGame = -1;
function fillGame(i) {
  const f = SHOWN[i], tx = gameText(f);
  $("#gIdx").textContent = String(i + 1).padStart(2, "0");
  $("#gOf").textContent = `/ ${String(SHOWN.length).padStart(2, "0")} · ${t("featured")}`;
  $("#gTitle").textContent = f.title;
  $("#gMeta").textContent = [tx.genre, f.year, tx.platform].join(" · ");
  $("#gTag").textContent = tx.tagline;
  $("#gBlurb").textContent = tx.blurb;
  $("#gKeys").innerHTML = tx.controls.map(([k, v]) => `<li><span>${v}</span><kbd>${k}</kbd></li>`).join("");
  $("#gPlay").href = f.href;
  const m = $("#gPlayM"); if (m) m.href = f.href;
}
function showGame(i) {
  if (i === shownGame) return;
  if (shownGame === -1) { fillGame(i); shownGame = i; return; }
  shownGame = i;
  gamePanel.classList.add("is-swap");
  setTimeout(() => { fillGame(i); gamePanel.classList.remove("is-swap"); }, 230);
}

const libList = $("#libList");
function buildLibList() {
  libList.innerHTML = ALL.map((g, i) =>
    `<li style="transition-delay:${i * 0.025}s"><a href="${g.href}" target="_blank" rel="noopener" data-i="${i}"><span dir="ltr">${g.title}</span><small>${g.year || "—"}</small></a></li>`
  ).join("");
}
buildLibList();
libList.addEventListener("pointerover", e => {
  const a = e.target.closest("a[data-i]");
  if (a) { const i = +a.dataset.i; if (i !== selOverride) selOverride = i; }
});
let shownLib = -1;
const showLibQuiet = i => showLib(i, true);
function showLib(i, quiet = false) {
  if (i === shownLib) return;
  if (shownLib !== -1 && !quiet) audio.blip(980 + (i % 4) * 60);
  shownLib = i;
  $("#libCount").textContent = `${String(i + 1).padStart(2, "0")} / ${ALL.length}`;
  const li = libList.querySelectorAll("li")[i];      // keep the selection in view inside the list only
  if (li && libList.scrollHeight > libList.clientHeight) libList.scrollTo({ top: li.offsetTop - libList.clientHeight / 2, behavior: "smooth" });
  libList.querySelectorAll("a").forEach((a, j) => a.classList.toggle("is-sel", j === i));
  const g = ALL[i], tx = gameText(g);
  $("#libTitle").textContent = g.title;
  $("#libMeta").textContent = [tx.genre, g.year].filter(Boolean).join(" · ");
  $("#libTag").textContent = tx.tagline;
  $("#libPlay").href = g.href;
}

/* mobile play button lives on the left column */
{
  const side = $("#gamePanel .side-l");
  const a = document.createElement("a");
  a.className = "play play-m"; a.id = "gPlayM"; a.target = "_blank"; a.rel = "noopener"; a.href = "#";
  a.innerHTML = '<span data-i18n="play">Play on itch.io</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  a.style.marginTop = "16px";
  side.appendChild(a);
}

/* HourZero's clock and the narrator */
const hzTimer = $("#hzTimer"), hzTime = $("#hzTime"), narr = $("#narr");
const NARRATION = [
  [0.14, 0.38, "narr.1"],
  [0.42, 0.72, "narr.2"],
  [0.78, 1.0, "narr.3"]
];
let narrLine = "", narrStart = 0, speaking = false;
function narrate(k, time) {
  const key = (NARRATION.find(([a, b]) => k >= a && k < b) || [])[2];
  const line = key ? t(key) : "";
  if (line !== narrLine) { narrLine = line; narrStart = time; }
  const n = Math.min(line.length, Math.floor((time - narrStart) * 26));
  const shown = line.slice(0, n);
  if (narr.textContent !== shown) { narr.textContent = shown; if (n > 0 && line[n - 1] !== " ") audio.blip(520 + (n % 3) * 90); }
  speaking = n < line.length && line.length > 0;
  return line.length > 0;
}

/* nav */
document.querySelectorAll("[data-go]").forEach(a => a.addEventListener("click", e => {
  e.preventDefault();
  const k = a.dataset.go;
  goTo(k === "0" ? 0 : ANCHOR[k]);
}));
const navLinks = [...document.querySelectorAll(".nav a")];

/* sound */
$("#soundBtn").addEventListener("click", () => {
  const on = audio.toggle();
  $("#soundBtn").setAttribute("aria-pressed", String(on));
  $("#soundState").textContent = on ? t("on") : t("off");
  if (on) audio.blip(990);
});

/* copy email */
$("#copyBtn").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText("omar.abdan800@gmail.com"); } catch (e) {}
  $("#copyBtn").textContent = t("copied");
  setTimeout(() => ($("#copyBtn").textContent = t("copy")), 1600);
});

/* language: Arabic by default, English on request; everything re-renders in place */
function refreshLanguage() {
  applyDocLang();
  $("#soundState").textContent = audio.on ? t("on") : t("off");
  buildLibList();
  const g = shownGame, l = shownLib;
  shownGame = -1; shownLib = -1;
  if (g >= 0) fillGame(g), (shownGame = g);
  if (l >= 0) showLibQuiet(l);
  narrLine = ""; narr.textContent = "";
}
$("#langBtn").addEventListener("click", () => {
  setLang(getLang() === "ar" ? "en" : "ar");
  refreshLanguage();
  audio.blip(1046);
});
refreshLanguage();

/* ------------------------------------------------------------------ controls */
const STOPS = () => [ANCHOR.hero, ANCHOR.games, ANCHOR.ignh, ANCHOR.library, ANCHOR.contact];
function step(dir) {
  const stops = STOPS();
  let cur = 0;
  for (let i = 0; i < stops.length; i++) if (pTarget >= stops[i] - 0.02) cur = i;
  goTo(stops[clamp(cur + dir, 0, stops.length - 1)]);
}
function act(btn, extra = {}) {
  if (btn === "Btn_A" || btn === "Screen") { audio.blip(1320); return pTarget < SEG.exit[0] ? goTo(ANCHOR.games) : (location.href = "mailto:omar.abdan800@gmail.com"); }
  if (btn === "Btn_B") { audio.blip(660); return step(-1); }
  if (btn === "Btn_SelectStart") { audio.blip(extra.which === "start" ? 1046 : 784); return goTo(extra.which === "start" ? ANCHOR.games : ANCHOR.library); }
  if (btn === "Btn_DPad") { audio.blip(880); return step(extra.dir === "right" || extra.dir === "down" ? 1 : -1); }
}

const ndc = new THREE.Vector2();
const propRay = new THREE.Raycaster();
function pickAt(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  const ph = phaseAt(p);
  if (ph.inside) { const w = worlds[ph.inside]; return w.pick ? w.pick(ndc) : null; }
  const hit = gb.pick(ndc, camera);
  if (hit) return hit;
  propRay.setFromCamera(ndc, camera);
  const h = propRay.intersectObjects(gb.props, false)[0];
  return h ? { name: "Cart", slot: h.object.userData.slot } : null;
}
canvas.addEventListener("pointermove", e => {
  if (!gb || e.pointerType === "touch" || dragX !== null) return;
  const h = pickAt(e);
  canvas.classList.toggle("is-hover", !!h);
});
canvas.addEventListener("pointerleave", () => canvas.classList.remove("is-hover"));
let downAt = null;
// drag (or swipe) the cartridge ring
let dragX = null, dragMoved = 0;
canvas.addEventListener("pointerdown", e => {
  downAt = [e.clientX, e.clientY];
  if (gb && phaseAt(pTarget).inside === "shelf") { dragX = e.clientX; dragMoved = 0; worlds.shelf.dragStart(); canvas.classList.add("is-drag"); }
});
addEventListener("pointermove", e => {
  if (dragX === null) return;
  const dx = e.clientX - dragX;
  dragX = e.clientX; dragMoved += Math.abs(dx);
  worlds.shelf.drag(dx);
});
addEventListener("pointerup", () => {
  if (dragX === null) return;
  dragX = null;
  canvas.classList.remove("is-drag");
  const i = worlds.shelf.dragEnd();
  if (dragMoved > 8) selOverride = i;
});
canvas.addEventListener("click", e => {
  if (!gb || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;
  const h = pickAt(e);
  if (!h) return;
  if (h.kind === "button") { worlds.ignh.pressButton(); audio.blip(1320); return window.open(SHOWN[1].href, "_blank", "noopener"); }
  if (h.kind === "cart") {
    audio.blip(1320);
    if (shelfIndex(pTarget) === h.index) return window.open(ALL[h.index].href, "_blank", "noopener");
    selOverride = h.index; return;
  }
  if (h.name === "Cart") { audio.blip(1046); return goTo(h.slot === 1 ? ANCHOR.ignh : ANCHOR.games); }
  gb.press(h.name);
  act(h.name, h);
});
addEventListener("keydown", e => {
  if (!gb || e.target.closest("input, textarea")) return;
  const ph = phaseAt(pTarget);
  if (ph.inside === "shelf" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    e.preventDefault();
    selOverride = clamp(shelfIndex(pTarget) + (e.key === "ArrowRight" ? 1 : -1), 0, ALL.length - 1);
    audio.blip(880); return;
  }
  if (e.key === "ArrowRight") { e.preventDefault(); gb.press("Btn_DPad"); act("Btn_DPad", { dir: "right" }); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); gb.press("Btn_DPad"); act("Btn_DPad", { dir: "left" }); }
});

/* mouse parallax */
const mouse = new THREE.Vector2(), mouseS = new THREE.Vector2();
addEventListener("pointermove", e => {
  if (e.pointerType === "touch") return;
  mouse.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
}, { passive: true });

/* ------------------------------------------------------------------ resize */
// A tab opened in the background can report a 0x0 viewport; never build a camera from that.
const VW = () => Math.max(1, innerWidth), VH = () => Math.max(1, innerHeight);
let sizedW = 0, sizedH = 0;
function resize() {
  const w = VW(), h = VH(), pr = PR();
  sizedW = innerWidth; sizedH = innerHeight;
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 48 : 35;
  camera.updateProjectionMatrix();
  post.setSize(w, h, pr);
  if (world) world.setPixelScale(pr);
  if (worlds) Object.values(worlds).forEach(wd => wd.setPixelScale && wd.setPixelScale(pr));
  if (rig) rig.rebuild();
}
addEventListener("resize", resize);

/* ------------------------------------------------------------------ rendering a world */
const ZERO = { x: 0, y: 0 };
let roll = 0, rollV = 0, lastMouseX = 0;
function poseWorld(w, k, time, dt, forLCD, extra) {
  w.update(k, time, dt, forLCD ? ZERO : mouseS, extra);
  if (!forLCD) w.camera.rotateZ(roll);              // lean with the mouse
  w.camera.fov = (forLCD ? w.lcdFov : coverFov(w.lcdFov, VW() / VH())) + (w.fovOffset || 0);
  w.camera.aspect = forLCD ? LCD_ASPECT : VW() / VH();
  w.camera.updateProjectionMatrix();
}
function renderToLCD(w, k, time, dt, extra) {
  poseWorld(w, k, time, dt, true, extra);
  // particle sizes are in screen pixels: shrink them to the LCD's 320 px
  if (w.setPixelScale) w.setPixelScale(lcdRT.height / (innerHeight * renderer.getPixelRatio()) * renderer.getPixelRatio());
  renderer.setRenderTarget(lcdRT);
  renderer.render(w.scene, w.camera);
  renderer.setRenderTarget(null);
  if (w.setPixelScale) w.setPixelScale(renderer.getPixelRatio());
}

/* ------------------------------------------------------------------ loop */
const root = document.documentElement.style;
const clock = new THREE.Clock();
let introK = 0, started = false;
const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), tmpV = new THREE.Vector3();
const WHITE = new THREE.Color(1, 1, 1);

function frame() {
  requestAnimationFrame(frame);
  if (innerWidth !== sizedW || innerHeight !== sizedH) resize();   // catches size changes no event reported
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;

  p = damp(p, pTarget, REDUCED ? 20 : 3.4, dt);
  if (Math.abs(p - pTarget) < 1e-5) p = pTarget;
  introK = started ? Math.min(1, introK + dt / 3.4) : 0;
  const intro = 1 - Math.pow(1 - introK, 3);
  mouseS.x = damp(mouseS.x, mouse.x, 2.5, dt);
  mouseS.y = damp(mouseS.y, mouse.y, 2.5, dt);
  // the camera leans: a little toward where the mouse is, more while it is moving
  const mVel = (mouse.x - lastMouseX) / Math.max(dt, 1e-3);
  lastMouseX = mouse.x;
  rollV = damp(rollV, clamp(-mVel * 0.018, -0.06, 0.06), 5, dt);
  roll = REDUCED ? 0 : -mouseS.x * 0.035 + rollV;

  const ph = phaseAt(p);
  const pr = renderer.getPixelRatio();
  let block = 1, gridAmt = 0, flash = 0;

  if (ph.inside) {
    // ---------------------------------------------------------- inside the Game Boy
    const w = worlds[ph.inside];
    let extra;
    if (ph.inside === "shelf") { extra = w.dragging ? w.liveIndex() : shelfIndex(p); showLib(extra); }
    if (ph.inside === "ignh") extra = speaking;
    poseWorld(w, ph.k, time, dt, false, extra);
    post.renderPass.scene = w.scene;
    post.renderPass.camera = w.camera;
    renderer.toneMappingExposure = w.exposure;
    post.bloom.strength = w.bloom.strength; post.bloom.threshold = w.bloom.threshold; post.bloom.radius = w.bloom.radius;

    // pixels: sharpen after the dive, burst between worlds, gather again before the exit
    const resolve = 1 - smoothstep(SEG.dive[1], SEG.dive[1] + RESOLVE, p);
    const exitIn = smoothstep(SEG.exit[0] - RESOLVE * 0.6, SEG.exit[0], p);
    const toLCD = Math.max(resolve, exitIn);
    block = lerp(1, rig.cutBlock, Math.pow(toLCD, 2.2));
    gridAmt = toLCD;
    // HourZero ends in the meteor's whiteout (its own exposure + flash); the white then clears
    // block by block over Insert Game Name Here, like the game's pixel wipe
    if (ph.inside === "hz") flash = w.flash || 0;
    if (ph.inside === "ignh") {
      const s = 1 - smoothstep(0, 0.03, p - SEG.ignh[0]);
      flash = smoothstep(0.4, 1, s);                    // the white is gone while the pixels are still big
      if (s > 0) block = Math.max(block, lerp(1, 40 * pr, Math.pow(s, 1.2)));
    }
    // into the shelf: a quick burst of big pixels
    {
      const s = 1 - smoothstep(0, SWITCH, Math.abs(p - SEG.shelf[0]));
      if (s > 0) block = Math.max(block, lerp(1, 64 * pr, Math.pow(s, 1.5)));
    }
  } else {
    // ---------------------------------------------------------- the desert
    post.renderPass.scene = scene;
    post.renderPass.camera = camera;
    const tod = 0.3 * smoothstep(SEG.pull[0], 1, p);
    world.update(tod, time, gb.center);

    rig.eval(p);
    camPos.copy(rig.pos);
    camTgt.copy(rig.target);
    if (intro < 1) camPos.add(tmpV.set(-4, 7, 16).multiplyScalar(1 - intro));
    const diving = p > SEG.dive[0] && p < SEG.pull[0];
    const par = REDUCED || diving ? 0 : lerp(1.0, 0.12, rig.framedness);
    tmpV.set(1, 0, 0).applyQuaternion(camera.quaternion);
    camPos.addScaledVector(tmpV, mouseS.x * 0.9 * par);
    camPos.y += -mouseS.y * 0.5 * par + Math.sin(time * 0.35) * 0.06 * par;
    camera.position.copy(camPos);
    camera.lookAt(camTgt);
    camera.rotateZ(roll * (diving ? 0.25 : 1));

    // what the screen shows: boot, its title page, then the world we are about to enter
    const before = p < SEG.exit[0];
    const worldMix = before ? smoothstep(LCD_WORLD[0], LCD_WORLD[1], p) : 1 - smoothstep(SEG.exit[0] + 0.02, SEG.exit[0] + 0.035, p);
    screen.uniforms.uWorldMix.value = worldMix;
    if (worldMix > 0.001) {
      if (before) renderToLCD(worlds.hz, 0, time, dt);
      else renderToLCD(worlds.shelf, 1, time, dt, shelfIndex(p));
    }
    screen.draw({ power: pTarget > POWER_AT && p > POWER_AT, page: before ? "home" : "end", game: 0, libSel: 0 }, time);
    gb.update(dt, { led: screen.uniforms.uPower.value * (1 - 0.75 * rig.framedness) });
    const pw = screen.uniforms.uPower.value;
    screenLight.color.copy(screen.avgColor).lerp(WHITE, 0.25);
    screenLight.intensity = pw * lerp(6, 40, tod) * (1 - 0.55 * rig.framedness);
    screen.uniforms.uGlow.value = 1.05;
    screen.uniforms.uRefl.value.copy(world.tod().horizon).multiplyScalar(lerp(1, 0.25, rig.framedness));

    post.bloom.strength = lerp(0.35, 0.75, tod) * (1 - 0.45 * rig.framedness);
    post.bloom.threshold = lerp(0.95, 0.8, tod) + 0.12 * rig.framedness;
    post.bloom.radius = lerp(0.65, 0.45, rig.framedness);
    renderer.toneMappingExposure = lerp(1.0, 1.12, tod);
    audio.setNight(tod);
  }

  post.grade.uniforms.uBlock.value = block;
  post.grade.uniforms.uFlash.value = flash;
  post.grade.uniforms.uGridAmt.value = block > 1.5 ? gridAmt : 0;
  post.grade.uniforms.uTime.value = time;
  post.grade.uniforms.uVig.value = ph.inside ? 0.3 : lerp(0.26, 0.34, rig.framedness);
  post.grade.uniforms.uGrain.value = REDUCED ? 0 : 0.035;
  post.grade.uniforms.uFade.value = 1 - smoothstep(0, 0.3, introK);

  updateUI(ph, time);
  post.render(dt);
}

/* ------------------------------------------------------------------ UI per frame */
function updateUI(ph, time) {
  root.setProperty("--hero", (1 - smoothstep(0.0, 0.03, p)).toFixed(3));
  if (!ph.inside) {
    const s = world.tod();
    root.setProperty("--glow", `rgba(${s.inkGlow.slice(0, 3).map(Math.round).join(",")},${s.inkGlow[3].toFixed(2)})`);
  } else root.setProperty("--glow", "rgba(0,0,0,.55)");
  root.setProperty("--screen-w", Math.round(innerWidth * 0.42) + "px");

  const k = ph.k ?? 0;
  const gameIdx = ph.inside === "hz" ? 0 : ph.inside === "ignh" ? 1 : -1;
  const panelOn = gameIdx === 0 ? k > 0.07 && k < worlds.hz.IMPACT_AT - 0.03 : gameIdx === 1 && k > 0.14 && k < 0.95;
  gamePanel.classList.toggle("is-on", panelOn);
  if (gameIdx >= 0) showGame(gameIdx);

  // HourZero's 15-second clock runs down as you walk
  const impactAt = worlds.hz.IMPACT_AT;
  const hzOn = ph.inside === "hz" && k > 0.04 && k < impactAt + 0.015;
  hzTimer.classList.toggle("is-on", hzOn);
  if (ph.inside === "hz") {
    const secs = Math.max(0, Math.ceil(15 * (1 - k / impactAt)));
    const txt = String(secs).padStart(2, "0");
    if (hzTime.textContent !== txt) hzTime.textContent = txt;
    hzTimer.classList.toggle("is-low", secs <= 5);
  }
  // the narrator speaks
  narr.classList.toggle("is-on", ph.inside === "ignh" && narrate(k, time));
  if (ph.inside !== "ignh") { narrLine = ""; speaking = false; }

  libPanel.classList.toggle("is-on", ph.inside === "shelf" && k > 0.04 && k < 0.97);
  contactPanel.classList.toggle("is-on", p > SEG.contact[0] - 0.035);

  const hint = p < SEG.approach[0] ? t("hint.power")
    : p < SEG.dive[0] ? t("hint.keep")
    : p < SEG.dive[1] ? t("hint.in")
    : ph.inside === "hz" ? t("hint.hz")
    : ph.inside === "ignh" ? t("hint.ignh")
    : ph.inside === "shelf" ? t("hint.shelf")
    : "";
  const hintEl = $("#hintText");
  if (hintEl.textContent !== hint) hintEl.textContent = hint;
  $("#hint").style.opacity = hint ? 1 : 0;
  const activeNav = ph.inside === "hz" || ph.inside === "ignh" ? 0 : ph.inside === "shelf" ? 1 : p > SEG.contact[0] - 0.035 ? 2 : -1;
  navLinks.forEach((a, i) => a.classList.toggle("is-on", i === activeNav));
}

/* ------------------------------------------------------------------ go */
loadAll().then(A => {
  build(A);
  resize();
  readScroll();
  p = pTarget;
  renderer.compile(scene, camera);
  for (const w of Object.values(worlds)) renderer.compile(w.scene, w.camera);
  requestAnimationFrame(() => {
    $("#loader").classList.add("is-done");
    document.body.classList.remove("is-loading");
    started = true;
  });
  frame();
}).catch(err => {
  console.error(err);
  $("#loader .loader-line span").textContent = "// Something went wrong loading the scene";
});
