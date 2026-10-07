/* What the Game Boy's LCD shows: a 320x288 canvas (twice the original 160x144), drawn every
   frame, and an LCD shader with a pixel grid, an unlit "off" glass and a bit of reflection. */
import * as THREE from "three";

export const W = 320, H = 288;
const DMG = ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"];
const FONT = n => `${n}px "Press Start 2P", monospace`;
const BOOT_LEN = 3.3;

const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/* 4x4 Bayer masks for the dissolves, one per threshold level. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayerPatterns(g) {
  return Array.from({ length: 17 }, (_, lvl) => {
    const c = document.createElement("canvas");
    c.width = c.height = 4 * 2;            // 2px cells so the dither reads on the LCD grid
    const x = c.getContext("2d");
    x.fillStyle = "#000";
    BAYER.forEach((b, i) => { if (b < lvl) x.fillRect((i % 4) * 2, Math.floor(i / 4) * 2, 2, 2); });
    return g.createPattern(c, "repeat");
  });
}

export function createScreen({ featured, library, images, onDing }) {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");

  const tmp = document.createElement("canvas"); tmp.width = W; tmp.height = H;
  const tg = tmp.getContext("2d");
  const low = document.createElement("canvas");
  const lg = low.getContext("2d");
  const pats = bayerPatterns(tg);
  const seam = document.createElement("canvas"); seam.width = W; seam.height = 6;
  const sg = seam.getContext("2d");

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;

  const uniforms = {
    uTex: { value: tex }, uRes: { value: new THREE.Vector2(W, H) },
    uPower: { value: 0 }, uGlow: { value: 1.4 }, uFlash: { value: 0 },
    uRect: { value: new THREE.Vector4(0.046, 0.046, 0.956, 0.952) },
    uOff: { value: new THREE.Color("#2f3a25") }, uRefl: { value: new THREE.Color("#ffffff") },
    uTime: { value: 0 }, uWorld: { value: null }, uWorldMix: { value: 0 }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vWN; varying vec3 vWP;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uTex; uniform vec2 uRes; uniform vec4 uRect;
      uniform float uPower, uGlow, uFlash, uTime, uWorldMix; uniform vec3 uOff, uRefl;
      uniform sampler2D uWorld;
      varying vec2 vUv; varying vec3 vWN; varying vec3 vWP;
      void main(){
        vec2 q = vec2(vUv.x, 1.0 - vUv.y);
        vec2 c = (q - uRect.xy) / (uRect.zw - uRect.xy);
        float inside = step(0.0, c.x) * step(c.x, 1.0) * step(0.0, c.y) * step(c.y, 1.0);
        vec3 tex = texture2D(uTex, clamp(c, 0.0, 1.0)).rgb;
        if (uWorldMix > 0.001) {
          vec3 w = texture2D(uWorld, clamp(c, 0.0, 1.0)).rgb;         // a live world, rendered at 320x288
          w = w / (1.0 + w * 0.45);
          tex = mix(tex, w, uWorldMix);
        }
        vec2 px = c * uRes;
        vec2 f = fract(px);
        float aa = fwidth(px.x);
        float gx = smoothstep(0.0, 0.16 + aa, f.x) * smoothstep(1.0, 0.84 - aa, f.x);
        float gy = smoothstep(0.0, 0.16 + aa, f.y) * smoothstep(1.0, 0.84 - aa, f.y);
        float grid = mix(gx * gy, 1.0, smoothstep(0.3, 0.85, aa));
        vec3 lit = tex * mix(0.72, 1.0, grid) * uGlow + uFlash;
        vec3 col = mix(uOff * mix(0.9, 1.0, grid), lit, uPower);
        vec2 e = min(c, 1.0 - c);
        col *= mix(0.5, 1.0, smoothstep(0.0, 0.05, min(e.x, e.y)));
        col = mix(vec3(0.012, 0.014, 0.016), col, inside);
        vec3 V = normalize(cameraPosition - vWP);
        float fres = pow(1.0 - max(dot(normalize(vWN), V), 0.0), 5.0);
        float band = exp(-pow((q.x * 0.75 + q.y - 1.18) / 0.09, 2.0));
        col += uRefl * (0.018 + fres * 0.45 + band * 0.035);
        gl_FragColor = vec4(col, 1.0);
      }`
  });

  // ------------------------------------------------------------------ state
  let powered = false, bootStart = -1, dinged = false;
  let page = "off", pageStart = 0, game = -1, libSel = 0;
  let shot = 0, shotStart = 0, prevShot = -1;
  const avg = new THREE.Color(0, 0, 0);
  const one = document.createElement("canvas"); one.width = one.height = 1;
  const og = one.getContext("2d", { willReadFrequently: true });
  let frame = 0;

  const text = (s, x, y, size, color, align = "left", shadow) => {
    g.font = FONT(size);
    g.textAlign = align;
    g.textBaseline = "top";
    if (shadow) { g.fillStyle = shadow; g.fillText(s, x + size / 8 * 2, y + size / 8 * 2); }
    g.fillStyle = color;
    g.fillText(s, x, y);
  };

  /* a circle in 2px LCD rows */
  function disc(cx, cy, r, color) {
    g.fillStyle = color;
    for (let y = -r; y < r; y += 2) {
      const w = Math.round(Math.sqrt(Math.max(0, r * r - (y + 1) * (y + 1))) / 2) * 2;
      g.fillRect(cx - w, cy + y, w * 2, 2);
    }
  }

  // ------------------------------------------------------------------ pages
  function drawBoot(t) {
    g.fillStyle = DMG[3]; g.fillRect(0, 0, W, H);
    const land = 1.75;
    const k = Math.min(1, Math.max(0, (t - 0.25) / (land - 0.25)));
    const y = Math.round((-30 + (110 + 30) * k) / 2) * 2;
    text("OMAR", W / 2, y, 24, DMG[0], "center");
    text("ALABDAN", W / 2, y + 32, 16, DMG[0], "center");
    if (t > land) text("iCopsyle", W / 2, y + 60, 8, DMG[1], "center");
    if (t > land + 0.05 && !dinged) { dinged = true; onDing && onDing(); }
  }

  function drawDesert(t) {
    // posterised sky
    const bands = ["#5d9bd3", "#7cb2dd", "#a2c6dc", "#cfd2c6", "#f0cfa8", "#f6b886"];
    const bh = 22;
    g.fillStyle = "#e9b27a"; g.fillRect(0, 0, W, H);
    bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * bh, W, i === bands.length - 1 ? 40 : bh + 1); });
    // dithered seams between bands
    bands.forEach((c, i) => {
      if (!i) return;
      sg.clearRect(0, 0, W, 6); sg.fillStyle = c; sg.fillRect(0, 0, W, 6);
      sg.globalCompositeOperation = "destination-in"; sg.fillStyle = pats[8]; sg.fillRect(0, 0, W, 6);
      sg.globalCompositeOperation = "source-over";
      g.drawImage(seam, 0, i * bh - 6);
    });
    disc(236, 112, 18, "#fff1c9");
    // mesas
    g.fillStyle = "#c98762";
    const mesa = [[0, 128], [20, 128], [24, 112], [62, 112], [68, 128], [150, 128], [156, 118], [186, 118], [190, 128], [270, 128], [274, 106], [300, 106], [306, 128], [320, 128], [320, 140], [0, 140]];
    g.beginPath(); mesa.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.fill();
    // dunes
    const dune = (base, amp, len, ph, color) => {
      g.fillStyle = color;
      for (let x = 0; x < W; x += 2) {
        const y = Math.round((base + Math.sin(x / len + ph) * amp + Math.sin(x / (len * 0.43) + ph * 1.7) * amp * 0.35) / 2) * 2;
        g.fillRect(x, y, 2, H - y);
      }
    };
    dune(146, 7, 38, 0.6, "#e9b27a");
    dune(178, 10, 52, 2.1, "#dd9a5c");
    dune(222, 12, 70, 4.0, "#cf8547");
    // tiny Game Boy on the near dune
    const gx = 84, gy = 186;
    g.fillStyle = "#3a2414"; g.fillRect(gx - 1, gy - 1, 14, 22);
    g.fillStyle = "#d9d5cf"; g.fillRect(gx, gy, 12, 20);
    g.fillStyle = "#6b6f78"; g.fillRect(gx + 2, gy + 2, 8, 7);
    g.fillStyle = (Math.floor(t * 2) % 2) ? "#9bbc0f" : "#8bac0f"; g.fillRect(gx + 3, gy + 3, 6, 5);
    g.fillStyle = "#9b2050"; g.fillRect(gx + 8, gy + 12, 2, 2);
    g.fillStyle = "#222"; g.fillRect(gx + 2, gy + 12, 3, 1); g.fillRect(gx + 3, gy + 11, 1, 3);
    // blowing sand
    g.fillStyle = "rgba(255,236,200,.85)";
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(((i * 53 + t * (40 + (i % 5) * 9)) % (W + 20)) - 10);
      const y = 150 + ((i * 37) % 110) + Math.round(Math.sin(t * 2 + i) * 2);
      g.fillRect(x - (x % 2), y - (y % 2), 2, 2);
    }
  }

  function drawHome(t) {
    drawDesert(t);
    text("OMAR", W / 2, 26, 32, "#ffffff", "center", "#3a2414");
    text("ALABDAN", W / 2, 66, 16, "#ffffff", "center", "#3a2414");
    text("GAME DESIGNER", W / 2, 92, 8, "#3a2414", "center");
    if (Math.floor(t * 1.8) % 2 === 0) text("PRESS START", W / 2, 252, 8, "#fff7e6", "center", "#3a2414");
    text("© 2026 iCopsyle", W / 2, 270, 8, "#7a4a2a", "center");
  }

  function coverDraw(ctx, img, dw, dh, pan) {
    const ir = img.width / img.height, r = dw / dh;
    if (ir > r) {
      const sw = img.height * r;
      ctx.drawImage(img, (img.width - sw) * pan, 0, sw, img.height, 0, 0, dw, dh);
    } else {
      const sh = img.width / r;
      ctx.drawImage(img, 0, (img.height - sh) * pan, img.width, sh, 0, 0, dw, dh);
    }
  }

  function drawShot(ctx, gi, si, t, block) {
    const img = images[featured[gi].shots[si]];
    if (!img) { ctx.fillStyle = "#111"; ctx.fillRect(0, 0, W, H); return; }
    const pan = 0.5 + 0.5 * Math.sin(t * 0.22 - Math.PI / 2);
    if (block > 1) {
      low.width = Math.max(1, Math.round(W / block)); low.height = Math.max(1, Math.round(H / block));
      lg.imageSmoothingEnabled = true;
      coverDraw(lg, img, low.width, low.height, pan);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(low, 0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
    } else {
      ctx.imageSmoothingEnabled = true;
      coverDraw(ctx, img, W, H, pan);
    }
  }

  function drawGame(t, now) {
    const f = featured[game];
    const into = ease(t / 0.7);
    const block = Math.max(1, Math.round(28 * (1 - into)));
    const n = f.shots.length;
    const st = now - shotStart;
    if (st > 3.4) { prevShot = shot; shot = (shot + 1) % n; shotStart = now; }
    drawShot(g, game, shot, t, block);
    const tt = now - shotStart;
    if (prevShot >= 0 && tt < 0.5) {
      // Bayer dissolve from the previous screenshot
      tg.clearRect(0, 0, W, H);
      drawShot(tg, game, prevShot, t, 1);
      tg.globalCompositeOperation = "destination-out";
      tg.fillStyle = pats[Math.min(16, Math.floor(tt / 0.5 * 17))];
      tg.fillRect(0, 0, W, H);
      tg.globalCompositeOperation = "source-over";
      g.drawImage(tmp, 0, 0);
    }
    // UI chrome, in the pixel font
    g.fillStyle = "rgba(6,8,14,.78)";
    g.fillRect(0, H - 34, W, 34);
    g.fillStyle = f.accent; g.fillRect(0, H - 34, W, 2);
    const title = f.title.toUpperCase();
    text(title.length > 22 ? title.slice(0, 21) + "…" : title, 10, H - 23, 8, "#ffffff");
    if (Math.floor(now * 1.6) % 2 === 0) text("A▶PLAY", W - 10, H - 23, 8, f.accent, "right");
    g.fillStyle = "rgba(6,8,14,.78)"; g.fillRect(8, 8, 46, 16);
    text(String(game + 1).padStart(2, "0") + "/" + String(featured.length).padStart(2, "0"), 12, 12, 8, "#ffffff");
    // shot pips
    for (let i = 0; i < n; i++) { g.fillStyle = i === shot ? "#ffffff" : "rgba(255,255,255,.35)"; g.fillRect(W - 12 - (n - i) * 8, 12, 4, 4); }
  }

  function wrap(s, max) {
    const words = s.split(" "), out = []; let line = "";
    for (const w of words) { if ((line + " " + w).trim().length > max) { out.push(line.trim()); line = w; } else line += " " + w; }
    if (line.trim()) out.push(line.trim());
    return out;
  }

  function drawLibrary(t, now) {
    g.fillStyle = "#0c1222"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#121b33";
    for (let y = 0; y < H; y += 8) for (let x = (y / 8) % 2 ? 8 : 0; x < W; x += 16) g.fillRect(x, y, 8, 8);
    text("ALL PROJECTS", 11, 8, 8, "#8ecdf7");
    text(String(library.length), W - 11, 8, 8, "#ffffff", "right");
    const cw = 70, ch = 44, gap = 6, x0 = 11, y0 = 24;
    const intro = ease(t / 0.6);
    for (let i = 0; i < 12; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const x = x0 + col * (cw + gap);
      let y = y0 + row * (ch + gap) + Math.round((1 - intro) * (20 + i * 4) / 2) * 2;
      const it = library[i];
      if (!it) {
        g.fillStyle = "#1b2647"; g.fillRect(x, y, cw, ch);
        text("MORE", x + cw / 2, y + 12, 8, "#5b6c9a", "center");
        text("ON ITCH", x + cw / 2, y + 24, 8, "#5b6c9a", "center");
        continue;
      }
      const sel = i === libSel;
      if (sel) y -= 2;
      const img = images[it.thumb];
      g.fillStyle = "#000"; g.fillRect(x, y, cw, ch);
      if (img) { g.imageSmoothingEnabled = true; g.save(); g.translate(x, y); coverDraw(g, img, cw, ch, 0.5); g.restore(); }
      if (!sel) { g.fillStyle = "rgba(8,12,24,.45)"; g.fillRect(x, y, cw, ch); }
      if (sel && Math.floor(now * 3) % 2 === 0) {
        g.fillStyle = "#ffffff";
        g.fillRect(x - 2, y - 2, cw + 4, 2); g.fillRect(x - 2, y + ch, cw + 4, 2);
        g.fillRect(x - 2, y, 2, ch); g.fillRect(x + cw, y, 2, ch);
      }
    }
    const it = library[libSel];
    if (it) {
      const yb = 182;
      g.fillStyle = "#8ecdf7"; g.fillRect(11, yb, 4, 8);
      text(it.title.toUpperCase().slice(0, 34), 20, yb, 8, "#ffffff");
      text([it.genre, it.year].filter(Boolean).join(" · ").toUpperCase(), 11, yb + 16, 8, "#6f7fa8");
      wrap(it.tagline, 36).slice(0, 3).forEach((l, i) => text(l, 11, yb + 36 + i * 13, 8, "#d8deef"));
      if (Math.floor(now * 1.6) % 2 === 0) text("A▶PLAY", W - 11, H - 16, 8, "#8ecdf7", "right");
    }
  }

  function drawEnd(t, now) {
    g.fillStyle = "#070b18"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      const x = (i * 97) % W, y = (i * 61) % 200;
      if (Math.sin(now * 2 + i) > -0.3) { g.fillStyle = i % 7 ? "#5d6d9a" : "#ffffff"; g.fillRect(x - (x % 2), y - (y % 2), 2, 2); }
    }
    disc(256, 46, 12, "#f3f0e2");
    disc(263, 41, 11, "#070b18");
    drawDuneNight();
    const k = ease(t / 0.8);
    text("THANKS FOR", W / 2, 70 + Math.round((1 - k) * 10), 16, "#ffffff", "center");
    text("PLAYING!", W / 2, 96 + Math.round((1 - k) * 14), 16, "#ffffff", "center");
    // heart
    const hx = W / 2 - 7, hy = 128;
    const hp = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"];
    g.fillStyle = "#ff5a7a";
    hp.forEach((r, j) => [...r].forEach((c, i) => c === "1" && g.fillRect(hx + i * 2, hy + j * 2, 2, 2)));
    if (Math.floor(now * 1.6) % 2 === 0) text("▼ SAY HELLO ▼", W / 2, 158, 8, "#8ecdf7", "center");
    text("OMAR.ABDAN800", W / 2, 254, 8, "#ffffff", "center");
    text("@GMAIL.COM", W / 2, 268, 8, "#ffffff", "center");
  }
  function drawDuneNight() {
    g.fillStyle = "#18233f";
    for (let x = 0; x < W; x += 2) { const y = Math.round((206 + Math.sin(x / 40) * 8 + Math.sin(x / 17) * 3) / 2) * 2; g.fillRect(x, y, 2, H - y); }
    g.fillStyle = "#0f1730";
    for (let x = 0; x < W; x += 2) { const y = Math.round((232 + Math.sin(x / 55 + 2) * 9) / 2) * 2; g.fillRect(x, y, 2, H - y); }
  }

  // ------------------------------------------------------------------ frame
  let lastFrame = null;
  function draw(view, now) {
    uniforms.uTime.value = now;
    // power
    if (view.power && !powered) { powered = true; bootStart = now; dinged = false; }
    if (!view.power && powered) { powered = false; bootStart = -1; page = "off"; game = -1; }
    const bootT = powered ? now - bootStart : 0;
    uniforms.uPower.value += ((powered ? 1 : 0) - uniforms.uPower.value) * (powered ? 0.25 : 0.08);
    uniforms.uFlash.value = powered ? Math.max(0, 0.35 - bootT * 1.4) : 0;
    if (!powered && uniforms.uPower.value < 0.01) return;

    let want = "boot";
    if (powered && bootT >= BOOT_LEN) want = view.page;
    if (want !== page || (want === "game" && view.game !== game)) {
      lastFrame = page !== "boot" && page !== "off" ? snapshot() : null;
      page = want; pageStart = now;
      if (page === "game") { game = view.game; shot = 0; prevShot = -1; shotStart = now; }
    }
    if (view.libSel !== undefined) libSel = view.libSel;
    const t = now - pageStart;

    if (page === "boot") {
      drawBoot(bootT);
      // hand-off to colour: dither from the DMG frame into the home page
      if (bootT > BOOT_LEN - 0.6) {
        tg.clearRect(0, 0, W, H); tg.drawImage(cv, 0, 0);
        drawHome(now);
        const k = (bootT - (BOOT_LEN - 0.6)) / 0.6;
        tg.globalCompositeOperation = "destination-out";
        tg.fillStyle = pats[Math.min(16, Math.floor(k * 17))]; tg.fillRect(0, 0, W, H);
        tg.globalCompositeOperation = "source-over";
        g.drawImage(tmp, 0, 0);
      }
    } else if (page === "home") drawHome(now);
    else if (page === "game") drawGame(t, now);
    else if (page === "library") drawLibrary(t, now);
    else if (page === "end") drawEnd(t, now);

    // page-to-page dither wipe (except into games, which resolve from a mosaic)
    if (lastFrame && t < 0.45 && page !== "game") {
      tg.clearRect(0, 0, W, H); tg.drawImage(lastFrame, 0, 0);
      tg.globalCompositeOperation = "destination-out";
      tg.fillStyle = pats[Math.min(16, Math.floor(t / 0.45 * 17))]; tg.fillRect(0, 0, W, H);
      tg.globalCompositeOperation = "source-over";
      g.drawImage(tmp, 0, 0);
    }
    tex.needsUpdate = true;

    if (frame++ % 6 === 0) {
      og.drawImage(cv, 0, 0, 1, 1);
      const d = og.getImageData(0, 0, 1, 1).data;
      avg.setRGB(d[0] / 255, d[1] / 255, d[2] / 255, THREE.SRGBColorSpace);
    }
  }
  const snapC = document.createElement("canvas"); snapC.width = W; snapC.height = H;
  function snapshot() { snapC.getContext("2d").drawImage(cv, 0, 0); return snapC; }

  return {
    material, uniforms, draw, avgColor: avg,
    get booted() { return powered && uniforms.uPower.value > 0.5; },
    get page() { return page; }
  };
}
