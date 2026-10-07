/* The desert: dunes, mesas, sky, rocks, blowing sand, and the time of day that ties them together.
   Sand, rock and sky textures come from Maze101 (coast sand / tinted desert sand, the desert rock
   pack, aerial rocks, and the CloudedSunGlow HDRI). */
import * as THREE from "three";
import { makeNoise, smoothstep, smootherstep, lerp, rng } from "./noise.js";

const N = makeNoise(11);
const N2 = makeNoise(29);
export const WIND = 0.42;                       // dune crest orientation, radians
const WIND_DIR = new THREE.Vector2(Math.cos(WIND), Math.sin(WIND));
const TILE = 5;                                 // metres per sand texture repeat

function fbm(x, z, oct = 4) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) { s += a * N(x * f, z * f); f *= 2.03; a *= 0.5; }
  return s;
}

export const GB_YAW = -0.3;                     // the Game Boy's facing, shared with gameboy.js

/* Sand drifted up against the Game Boy: deep behind and at the sides, shallow at the front
   so the buttons stay above the sand. */
function drift(x, z) {
  const c = Math.cos(GB_YAW), s = Math.sin(GB_YAW);
  const lx = x * c - z * s, lz = x * s + z * c;
  const qx = Math.abs(lx) - 3.05, qz = Math.abs(lz) - 1.2;
  const sd = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
  const front = smoothstep(-0.8, 1.0, lz);        // 1 at and in front of the face (lz = 1.2)
  const amp = lerp(2.7, 0.7, front);
  const reach = lerp(7.5, 3.6, front);
  const k = 1 - smoothstep(0, reach, Math.max(sd, 0));
  return amp * k * k * (0.85 + 0.15 * N(x * 0.6, z * 0.6));
}

/* Height of the desert floor at (x, z). The Game Boy stands at the origin. */
export function groundHeight(x, z) {
  return groundBase(x, z) + drift(x, z);
}

/* The floor without the drift: what the Game Boy is planted in. */
export function groundBase(x, z) {
  const d = Math.hypot(x, z);
  const wx = x + 38 * N(x * 0.0032 + 11.3, z * 0.0032 - 4.1);
  const wz = z + 38 * N(x * 0.0032 - 7.7, z * 0.0032 + 9.2);
  const ca = Math.cos(WIND), sa = Math.sin(WIND);
  const along = wx * ca + wz * sa, across = -wx * sa + wz * ca;

  // transverse dunes: long windward slope, short steep slip face
  let ph = along / 64 + 0.45 * N(across * 0.005, 1.7);
  let t = ph - Math.floor(ph);
  let prof = t < 0.72 ? smootherstep(t / 0.72) : 1 - smootherstep((t - 0.72) / 0.28);
  const amp = 3.5 + 5.5 * (0.5 + 0.5 * N(x * 0.004 + 3, z * 0.004 + 8));
  let h = Math.pow(Math.max(prof, 0), 1.35) * amp;

  // a smaller crossing set
  ph = (along * 0.55 + across * 0.83) / 23 + 0.6 * N(x * 0.012, z * 0.012);
  t = ph - Math.floor(ph);
  prof = t < 0.7 ? smootherstep(t / 0.7) : 1 - smootherstep((t - 0.7) / 0.3);
  h += prof * 1.3 * (0.5 + 0.5 * N2(x * 0.01, z * 0.01));

  h += 7 * fbm(x * 0.0021 + 20, z * 0.0021 - 3, 3);

  // calm ground around the Game Boy, with a drift of sand at its foot
  const calm = smoothstep(12, 80, d);
  const base = 1.1 * fbm(x * 0.016, z * 0.016, 2) + 0.6;
  h = lerp(base, h, calm);
  h += 1.5 * Math.exp(-(d * d) / (2 * 9.5 * 9.5));

  // far mesas, terraced
  const far = smoothstep(230, 440, d);
  if (far > 0) {
    const n = fbm(x * 0.0026 + 40, z * 0.0026 - 12, 4);
    const m = smoothstep(-0.06, 0.1, n);
    let mh = m * (58 + 46 * N(x * 0.0011, z * 0.0011));
    const st = 15, k = mh / st, fl = Math.floor(k);
    mh = (fl + smoothstep(0.5, 1, k - fl)) * st;
    h += far * mh;
  }
  return h;
}

/* ------------------------------------------------------------------ time of day
   0 = golden afternoon (hero), 0.5 = sunset, 1 = blue night (inside the Game Boy). */
const C = h => new THREE.Color(h);
const TOD = [
  { t: 0.0, zenith: C("#1f4fd8"), mid: C("#4d8ff0"), horizon: C("#a9cdf2"), fog: C("#b7cbe6"), glow: C("#fff1d6"),
    key: C("#fff0dc"), keyI: 4.4, hemiS: C("#7fa8f0"), hemiG: C("#d9773d"), hemiI: 0.6, env: 0.35,
    elev: 28, stars: 0, sand: 1, fogD: 0.0009, ink: [255, 255, 255], inkGlow: [10, 30, 90, 0.38] },
  { t: 0.5, zenith: C("#1d3f99"), mid: C("#8f8fc4"), horizon: C("#f39f6e"), fog: C("#d7957a"), glow: C("#ff8f4f"),
    key: C("#ff9e62"), keyI: 3.0, hemiS: C("#a08cb4"), hemiG: C("#9b684b"), hemiI: 0.45, env: 0.28,
    elev: 3, stars: 0.12, sand: 0.8, fogD: 0.0026, ink: [255, 244, 232], inkGlow: [60, 20, 10, 0.5] },
  { t: 1.0, zenith: C("#040915"), mid: C("#0d1832"), horizon: C("#1b2843"), fog: C("#161f35"), glow: C("#000000"),
    key: C("#8fa9e0"), keyI: 0.42, hemiS: C("#2b3d66"), hemiG: C("#1b1612"), hemiI: 0.42, env: 0.1,
    elev: -9, stars: 1, sand: 0.5, fogD: 0.0032, ink: [244, 246, 255], inkGlow: [0, 0, 0, 0.55] }
];
const SUN_AZ = THREE.MathUtils.degToRad(-62);     // front-left of the Game Boy: lit face, long shadow behind
const MOON_DIR = new THREE.Vector3(0.55, 0.62, -0.56).normalize();

function sampleTod(t) {
  t = Math.min(1, Math.max(0, t));
  const i = t < 0.5 ? 0 : 1;
  const a = TOD[i], b = TOD[i + 1];
  const k = (t - a.t) / (b.t - a.t);
  const o = {};
  for (const key in a) {
    if (key === "t") continue;
    const va = a[key], vb = b[key];
    if (va instanceof THREE.Color) o[key] = va.clone().lerp(vb, k);
    else if (Array.isArray(va)) o[key] = va.map((v, j) => lerp(v, vb[j], k));
    else o[key] = lerp(va, vb, k);
  }
  return o;
}

/* Tileable 3D value-noise fbm, 64^3, shared by the clouds and the wind. */
function makeNoise3D(S = 64) {
  const R = rng(77);
  const oct = [[4, 0.5], [8, 0.26], [16, 0.14], [32, 0.08]];
  const lat = oct.map(([f]) => { const g = new Float32Array(f * f * f); for (let i = 0; i < g.length; i++) g[i] = R(); return g; });
  const sm = t => t * t * (3 - 2 * t);
  const out = new Float32Array(S * S * S);
  let mn = Infinity, mx = -Infinity;
  for (let z = 0; z < S; z++) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0;
    for (let o = 0; o < oct.length; o++) {
      const [f, a] = oct[o], g = lat[o];
      const fx = x / S * f, fy = y / S * f, fz = z / S * f;
      const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
      const tx = sm(fx - ix), ty = sm(fy - iy), tz = sm(fz - iz);
      const x0 = ix % f, x1 = (ix + 1) % f, y0 = iy % f, y1 = (iy + 1) % f, z0 = iz % f, z1 = (iz + 1) % f;
      const L = (i, j, k) => g[(k * f + j) * f + i];
      const c00 = L(x0, y0, z0) + (L(x1, y0, z0) - L(x0, y0, z0)) * tx;
      const c10 = L(x0, y1, z0) + (L(x1, y1, z0) - L(x0, y1, z0)) * tx;
      const c01 = L(x0, y0, z1) + (L(x1, y0, z1) - L(x0, y0, z1)) * tx;
      const c11 = L(x0, y1, z1) + (L(x1, y1, z1) - L(x0, y1, z1)) * tx;
      const c0 = c00 + (c10 - c00) * ty, c1 = c01 + (c11 - c01) * ty;
      v += a * (c0 + (c1 - c0) * tz);
    }
    const i = (z * S + y) * S + x;
    out[i] = v; if (v < mn) mn = v; if (v > mx) mx = v;
  }
  const data = new Uint8Array(S * S * S);
  for (let i = 0; i < data.length; i++) data[i] = Math.round((out[i] - mn) / (mx - mn) * 255);
  const t = new THREE.Data3DTexture(data, S, S, S);
  t.format = THREE.RedFormat; t.type = THREE.UnsignedByteType;
  t.wrapS = t.wrapT = t.wrapR = THREE.RepeatWrapping;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.unpackAlignment = 1;
  t.needsUpdate = true;
  return t;
}

/* ------------------------------------------------------------------ GLSL helpers */
const GLSL_NOISE = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1,0)), u.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), u.x), u.y);
}`;

/* ------------------------------------------------------------------ build */
export function createWorld({ scene, renderer, textures }) {
  const world = { update: null, uniforms: {} };
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const noise3 = makeNoise3D();

  // ---- sky dome
  const skyU = {
    uZenith: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() },
    uMoonDir: { value: MOON_DIR.clone() }, uStars: { value: 0 }, uTime: { value: 0 },
    uNoise3: { value: noise3 }, uCloudOff: { value: new THREE.Vector2() },
    uCloudLit: { value: new THREE.Color() }, uCloudShade: { value: new THREE.Color() }, uCover: { value: 0.47 }
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(3000, 48, 24),
    new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: /* glsl */`
        varying vec3 vDir;
        void main(){
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vDir = wp.xyz - cameraPosition;
          gl_Position = projectionMatrix * viewMatrix * wp;
          gl_Position.z = gl_Position.w;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uZenith, uMid, uHorizon, uGlow, uSunDir, uMoonDir;
        uniform float uStars, uTime, uCover;
        uniform sampler3D uNoise3; uniform vec2 uCloudOff; uniform vec3 uCloudLit, uCloudShade;
        varying vec3 vDir;
        ${GLSL_NOISE}
        float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }

        // ---- volumetric cumulus: a slab between CL0 and CL1 metres, raymarched
        const float CL0 = 430.0, CL1 = 820.0;
        float cloudDensity(vec3 p){
          float hf = (p.y - CL0) / (CL1 - CL0);
          vec3 q = vec3(p.x * 0.00042 + uCloudOff.x, p.z * 0.00042 + uCloudOff.y, hf * 0.32);
          float base = texture(uNoise3, q).r;
          float prof = smoothstep(0.0, 0.14, hf) * (1.0 - smoothstep(0.35, 1.0, hf));   // flat base, round tops
          float dd = base - (1.0 - uCover) - (1.0 - prof) * 0.3;
          if (dd <= 0.0) return 0.0;
          float det = texture(uNoise3, q * vec3(4.7, 4.7, 3.0) + vec3(0.0, 0.0, uTime * 0.004)).r;
          dd -= (1.0 - det) * 0.12;
          return max(dd, 0.0) * 4.0;
        }
        vec4 clouds(vec3 ro, vec3 rd){
          if (rd.y < 0.015) return vec4(0.0);
          float t0 = (CL0 - ro.y) / rd.y, t1 = (CL1 - ro.y) / rd.y;
          float tMax = 14000.0;
          if (t0 > tMax) return vec4(0.0);
          t1 = min(t1, t0 + 2600.0);
          const int STEPS = 18;
          float dt = (t1 - t0) / float(STEPS);
          float T = 1.0; vec3 L = vec3(0.0);
          float j = hash12(gl_FragCoord.xy + fract(uTime) * 61.0);
          for (int i = 0; i < STEPS; i++) {
            vec3 p = ro + rd * (t0 + (float(i) + j) * dt);
            float dens = cloudDensity(p);
            if (dens > 0.001) {
              float ld = cloudDensity(p + uSunDir * 90.0) + cloudDensity(p + uSunDir * 220.0) * 0.6;
              float lit = exp(-ld * 1.6) * (1.0 - exp(-dens * 2.0) * 0.5);          // beer + powder
              float hf = (p.y - CL0) / (CL1 - CL0);
              vec3 c = mix(uCloudShade, uCloudLit, clamp(lit + hf * 0.25, 0.0, 1.0));
              float a = 1.0 - exp(-dens * dt * 0.0045);
              L += T * a * c; T *= 1.0 - a;
              if (T < 0.02) break;
            }
          }
          float fade = 1.0 - smoothstep(3500.0, tMax, t0);
          L = mix(uHorizon * (1.0 - T), L, fade);
          return vec4(L, (1.0 - T) * mix(0.55, 1.0, fade));
        }
        void main(){
          vec3 d = normalize(vDir);
          float y = d.y;
          float up = max(y, 0.0);
          // three stops so blue and peach never meet as grey
          vec3 col = mix(mix(uHorizon, uMid, smoothstep(0.0, 0.16, up)), uZenith, pow(smoothstep(0.04, 0.7, up), 0.7));
          col = mix(col, uHorizon, pow(1.0 - up, 22.0));          // haze band
          float sd = max(dot(d, uSunDir), 0.0);
          float sideGlow = pow(sd, 4.0) * pow(1.0 - up, 3.0);
          col += uGlow * (sideGlow * 0.55 + pow(sd, 48.0) * 0.6 + pow(sd, 900.0) * 5.0);
          col += uGlow * smoothstep(0.99955, 0.99975, sd) * 18.0;  // the sun disc
          // thin high cloud streaks, lit by the glow
          vec2 cp = d.xz / (up + 0.18) * 1.6;
          float cl = vnoise(cp * vec2(1.0, 4.0) + vec2(uTime * 0.004, 0.0)) * vnoise(cp * 2.3 + 7.0);
          cl = smoothstep(0.22, 0.62, cl) * smoothstep(0.02, 0.25, up) * (1.0 - smoothstep(0.55, 0.9, up));
          col = mix(col, mix(uMid, uGlow, 0.35) * 1.08, cl * 0.12 * (1.0 - uStars * 0.8));
          vec4 vc = clouds(cameraPosition, d);
          col = col * (1.0 - vc.a) + vc.rgb;
          // stars and moon
          if (uStars > 0.001) {
            vec3 p = d * 260.0; vec3 c = floor(p); float h = hash13(c);
            vec3 f = fract(p) - 0.5 - (vec3(hash13(c + 1.7), hash13(c + 3.1), hash13(c + 5.3)) - 0.5) * 0.6;
            float star = step(0.992, h) * smoothstep(0.24, 0.0, length(f)) * (0.5 + 1.5 * step(0.998, h));
            float tw = 0.65 + 0.35 * sin(uTime * (1.5 + h * 3.0) + h * 70.0);
            float band = smoothstep(0.55, 0.0, abs(dot(d, normalize(vec3(0.3, 0.55, 0.78)))));
            col += vec3(0.85, 0.9, 1.0) * star * tw * uStars * smoothstep(0.0, 0.12, y) * (1.0 + h * 1.5);
            col += vec3(0.25, 0.3, 0.45) * band * vnoise(d.xy * 40.0 + d.z * 13.0) * 0.06 * uStars;
            float md = max(dot(d, uMoonDir), 0.0);
            col += vec3(0.75, 0.82, 1.0) * (smoothstep(0.99975, 0.9999, md) * 4.0 + pow(md, 300.0) * 0.25 + pow(md, 12.0) * 0.04) * uStars;
          }
          gl_FragColor = vec4(col, 1.0);
        }`
    })
  );
  sky.frustumCulled = false;
  sky.renderOrder = 1000;          // after the opaque scene, so the cloud raymarch only runs where sky is visible
  scene.add(sky);

  // ---- terrain
  const SEG = 380, R = 1100;
  const geo = new THREE.PlaneGeometry(2, 2, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const remap = s => R * (0.11 * s + 0.89 * s * s * s);
  for (let i = 0; i < pos.count; i++) {
    const x = remap(pos.getX(i)), z = remap(pos.getZ(i));
    pos.setXYZ(i, x, groundHeight(x, z), z);
    uv.setXY(i, x / TILE, z / TILE);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  for (const k of ["sandColor", "sandNormal", "cliffColor"]) {
    const t = textures[k];
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAniso;
  }
  const sandU = {
    uTime: { value: 0 },
    uWindDir: { value: WIND_DIR },
    uSandMean: { value: textures.sandMean.clone() },
    uCliff: { value: textures.cliffColor },
    uGlint: { value: new THREE.Color(0, 0, 0) },
    uGBInv: { value: new THREE.Matrix4() },
    uWet: { value: 0 }
  };
  world.uniforms.sand = sandU;
  const sandMat = new THREE.MeshStandardMaterial({
    map: textures.sandColor, normalMap: textures.sandNormal, normalScale: new THREE.Vector2(6, 6),
    roughness: 0.96, metalness: 0, color: new THREE.Color(1, 1, 1)
  });
  sandMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, sandU);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vW; varying vec3 vNW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz; vNW = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vW; varying vec3 vNW;
        uniform float uTime; uniform vec2 uWindDir; uniform vec3 uSandMean; uniform sampler2D uCliff;
        uniform vec3 uGlint; uniform mat4 uGBInv;
        const mat2 TROT1 = mat2(0.5, 0.8660254, -0.8660254, 0.5);      // 60 degrees
        const mat2 TROT2 = mat2(-0.6427876, 0.7660444, -0.7660444, -0.6427876); // 130 degrees
        ${GLSL_NOISE}`)
      .replace("#include <map_fragment>", /* glsl */`
        float camD = length(vW - cameraPosition);
        // anti-tiling: three rotated, rescaled copies of the texture, blended by slow world noise
        vec2 uvT0 = vMapUv;
        vec2 uvT1 = TROT1 * vMapUv * 0.83 + vec2(0.37, 0.11);
        vec2 uvT2 = TROT2 * vMapUv * 1.21 + vec2(0.71, 0.53);
        float wT1 = smoothstep(0.3, 0.7, vnoise(vW.xz * 0.041));
        float wT2 = smoothstep(0.35, 0.75, vnoise(vW.xz * 0.029 + 9.1));
        vec3 sA = mix(mix(texture2D(map, uvT0).rgb, texture2D(map, uvT1).rgb, wT1), texture2D(map, uvT2).rgb, wT2 * 0.8);
        vec3 sB = texture2D(map, TROT1 * vMapUv * 0.137 + vec2(0.31, 0.77)).rgb;
        vec3 s = mix(sA, (sA + sB) * 0.5, smoothstep(20.0, 120.0, camD));
        s = mix(s, uSandMean, smoothstep(50.0, 240.0, camD) * 0.8);
        s /= max(uSandMean, vec3(0.02));                       // texture as detail around 1.0
        float m = vnoise(vW.xz * 0.017) * 0.6 + vnoise(vW.xz * 0.071) * 0.4;
        vec3 tint = mix(vec3(1.0, 0.27, 0.05), vec3(0.88, 0.20, 0.035), m);
        float slope = 1.0 - vNW.y;
        tint = mix(tint, vec3(0.78, 0.17, 0.03), smoothstep(0.06, 0.32, slope) * 0.75);
        tint = mix(tint, vec3(1.0, 0.40, 0.12), smoothstep(0.6, 1.0, vnoise(vW.xz * 0.004)) * 0.4);
        // mesas: grey-violet rock
        float rockM = smoothstep(0.35, 0.6, slope) * smoothstep(10.0, 26.0, vW.y);
        vec3 rkSrc = texture2D(uCliff, vec2(vW.x + vW.z, vW.y * 1.6) * 0.012).rgb;
        vec3 rk = vec3(dot(rkSrc, vec3(0.33))) * vec3(0.78, 0.74, 0.86) * 0.55;
        vec3 albedo = mix(s * tint, rk, rockM);
        // drifting sand sheets
        vec2 perp = vec2(-uWindDir.y, uWindDir.x);
        float streak = vnoise(vec2(dot(vW.xz, uWindDir) * 0.25 - uTime * 2.4, dot(vW.xz, perp) * 1.6));
        streak = smoothstep(0.62, 0.95, streak) * (1.0 - smoothstep(30.0, 90.0, camD));
        albedo *= 1.0 + streak * 0.22;
        // contact shade at the Game Boy's foot
        vec3 gl = (uGBInv * vec4(vW, 1.0)).xyz;
        vec2 q = abs(gl.xz) - vec2(3.0, 1.15);
        float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
        albedo *= 1.0 - 0.42 * exp(-max(sd, 0.0) * 1.15);
        diffuseColor.rgb *= albedo;
      `)
      .replace("#include <normal_fragment_maps>", /* glsl */`
        {
          // same three layers as the albedo; each sample's xy is rotated back into the base tangent frame
          vec3 nA = texture2D(normalMap, uvT0).xyz * 2.0 - 1.0;
          vec3 nB = texture2D(normalMap, uvT1).xyz * 2.0 - 1.0; nB.xy = transpose(TROT1) * nB.xy;
          vec3 nC = texture2D(normalMap, uvT2).xyz * 2.0 - 1.0; nC.xy = transpose(TROT2) * nC.xy;
          vec3 mapN = mix(mix(nA, nB, wT1), nC, wT2 * 0.8);
          // far away the 5 m tile reads as a grid: hand over to a ~45 m sample and ease off
          float farN = smoothstep(22.0, 100.0, camD);
          vec3 nF = texture2D(normalMap, TROT2 * vMapUv * 0.11 + vec2(0.13, 0.42)).xyz * 2.0 - 1.0; nF.xy = transpose(TROT2) * nF.xy;
          mapN = mix(mapN, nF, farN);
          mapN.xy *= normalScale * (1.0 + 0.6 * abs(wT1 - 0.5) + 0.6 * abs(wT2 - 0.5)) * mix(1.0, 0.4, farN);
          mapN.xy *= 0.75 + 0.5 * vnoise(vW.xz * 0.013 - 4.0);                              // patches of rougher and smoother sand
          normal = normalize(tbn * mapN);
        }
        {
          float rFade = (1.0 - smoothstep(10.0, 46.0, camD)) * (1.0 - smoothstep(0.1, 0.28, slope));
          rFade *= smoothstep(0.2, 0.7, vnoise(vW.xz * 0.09 + 3.0));      // ripples come in patches
          if (rFade > 0.001) {
            vec2 p = vW.xz;
            float warp = vnoise(p * 0.11) * 4.0 + vnoise(p * 0.47) * 1.1;
            float k = dot(p, uWindDir) * 11.0 + warp * 2.2;
            float dk = cos(k) + 0.38 * cos(2.0 * k + 0.6);
            vec2 g = uWindDir * dk * 0.07 * rFade;
            normal = normalize(normal + (viewMatrix * vec4(-g.x, 0.0, -g.y, 0.0)).xyz);
          }
        }`)
      .replace("#include <emissivemap_fragment>", /* glsl */`
        #include <emissivemap_fragment>
        {
          vec2 gc = floor(vW.xz * 42.0);
          float gh = hash12(gc);
          float glint = step(0.982, gh) * (1.0 - smoothstep(3.0, 26.0, camD));
          vec3 vd = normalize(vW - cameraPosition);
          float tw = pow(max(0.0, sin(dot(vd, vec3(41.0, 57.0, 29.0)) + gh * 90.0)), 24.0);
          totalEmissiveRadiance += uGlint * glint * tw;
        }`);
  };
  const terrain = new THREE.Mesh(geo, sandMat);
  terrain.receiveShadow = true;
  scene.add(terrain);
  world.terrain = terrain;

  // ---- rocks: Maze101's scanned cliff rock, recoloured to sandstone and reused at every scale
  {
    let geo = null;
    textures.cliffGltf.scene.traverse(o => { if (o.isMesh && !geo) geo = o.geometry; });
    for (const k of ["cliffRockColor", "cliffRockNormal"]) { textures[k].flipY = false; textures[k].anisotropy = maxAniso; textures[k].needsUpdate = true; }
    const rockMat = new THREE.MeshStandardMaterial({
      map: textures.cliffRockColor, normalMap: textures.cliffRockNormal, roughness: 0.9, metalness: 0
    });
    rockMat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vNW2;")
        .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\nvNW2 = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vNW2;")
        .replace("#include <map_fragment>", /* glsl */`
          vec3 src = texture2D(map, vMapUv).rgb;
          float l = dot(src, vec3(0.3, 0.55, 0.15));
          vec3 stone = mix(vec3(0.025, 0.022, 0.032), vec3(0.24, 0.23, 0.27), smoothstep(0.0, 0.32, l)) * (0.6 + l * 1.3);
          stone = mix(stone, vec3(0.85, 0.33, 0.11), smoothstep(0.6, 0.92, vNW2.y) * 0.65);   // orange sand settled on top
          diffuseColor.rgb *= stone;`);
    };
    const R0 = rng(4);
    const list = [
      // x, z, scale, yaw, pitch, sink (fraction of 42 m height)
      [-44, -30, 0.5, 0.6, 0.0, 0.08], [38, -62, 0.62, 2.4, 0.05, 0.1], [86, -16, 0.46, 1.3, 0.08, 0.1],
      [56, -38, 0.24, 1.1, 0.15, 0.1], [104, -2, 0.2, 4.0, 0.2, 0.1],
      [-98, -112, 0.95, 4.1, 0.0, 0.1], [128, -150, 0.85, 1.7, 0.1, 0.12], [-170, 30, 0.7, 3.0, 0.0, 0.1],
      [-13, 1.5, 0.085, 0.4, 1.5, 0.3], [11.5, -4.5, 0.07, 2.2, 1.35, 0.32], [18, 13, 0.05, 1.0, 1.6, 0.3],
      [-22, -14, 0.11, 5.2, 1.2, 0.25]
    ];
    while (list.length < 46) {
      const a = R0() * Math.PI * 2, d = 34 + R0() * 230;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (z > 4 && x > -40 && x < 18) continue;               // keep the hero view clear
      list.push([x, z, 0.03 + R0() * R0() * 0.18, R0() * 6.3, 1.0 + R0() * 0.6, 0.25 + R0() * 0.1]);
    }
    const im = new THREE.InstancedMesh(geo, rockMat, list.length);
    const o = new THREE.Object3D();
    list.forEach(([x, z, s, ry, rx, sink], i) => {
      o.rotation.set(rx, ry, 0, "YXZ");
      o.scale.setScalar(s);
      o.position.set(x, groundHeight(x, z) - sink * 42 * s * (rx > 0.6 ? 0.55 : 1), z);
      o.updateMatrix();
      im.setMatrixAt(i, o.matrix);
    });
    im.castShadow = im.receiveShadow = true;
    scene.add(im);
  }

  // ---- height texture for the particles (400 m square around the origin)
  const HS = 256, HW = 400;
  const hdata = new Uint16Array(HS * HS);
  for (let j = 0; j < HS; j++) for (let i = 0; i < HS; i++) {
    const x = (i / (HS - 1) - 0.5) * HW, z = (j / (HS - 1) - 0.5) * HW;
    hdata[j * HS + i] = THREE.DataUtils.toHalfFloat(groundHeight(x, z));
  }
  const htex = new THREE.DataTexture(hdata, HS, HS, THREE.RedFormat, THREE.HalfFloatType);
  htex.minFilter = htex.magFilter = THREE.LinearFilter;
  htex.needsUpdate = true;

  // ---- blowing sand: low, fast, many
  const partU = {
    uTime: { value: 0 }, uHeight: { value: htex }, uWind: { value: WIND_DIR.clone().multiplyScalar(7.5) },
    uColor: { value: new THREE.Color("#f3c99b") }, uOpacity: { value: 0.55 }, uScale: { value: 1 }
  };
  const SAND_N = 5200;
  const seeds = new Float32Array(SAND_N * 4);
  const R1 = rng(9);
  for (let i = 0; i < SAND_N; i++) {
    seeds[i * 4 + 0] = (R1() - 0.5) * 180;
    seeds[i * 4 + 1] = (R1() - 0.5) * 180;
    seeds[i * 4 + 2] = Math.pow(R1(), 2.6) * 3.2 + 0.03;
    seeds[i * 4 + 3] = 0.55 + R1() * 0.9;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SAND_N * 3), 3));
  pg.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  pg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 400);
  const sandPts = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...partU },
    transparent: true, depthWrite: false, fog: true,
    vertexShader: /* glsl */`
      attribute vec4 aSeed;
      uniform float uTime, uScale; uniform sampler2D uHeight; uniform vec2 uWind;
      varying float vA;
      #include <fog_pars_vertex>
      void main(){
        vec2 xz = aSeed.xy + uWind * uTime * aSeed.w;
        xz += vec2(sin(uTime * 0.9 + aSeed.y), cos(uTime * 1.1 + aSeed.x)) * 0.6;
        xz = mod(xz + 90.0, 180.0) - 90.0;
        float g = texture2D(uHeight, xz / 400.0 + 0.5).r;
        float hop = abs(sin(uTime * (1.2 + aSeed.w) + aSeed.x * 3.1)) * 0.35 * (1.0 - aSeed.z / 3.3);
        vec3 p = vec3(xz.x, g + aSeed.z + hop, xz.y);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float edge = max(abs(xz.x), abs(xz.y));
        vA = (1.0 - smoothstep(70.0, 90.0, edge)) * smoothstep(1.5, 6.0, -mvPosition.z);
        gl_PointSize = uScale * (0.5 + fract(aSeed.x * 13.17)) * 60.0 / -mvPosition.z;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity;
      varying float vA;
      #include <fog_pars_fragment>
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA * uOpacity;
        gl_FragColor = vec4(uColor, a);
        #include <fog_fragment>
      }`
  }));
  sandPts.frustumCulled = false;
  scene.add(sandPts);

  // ---- volumetric wind: stacked terrain-hugging slices of streaming sand haze
  const windU = {
    uTime: { value: 0 }, uNoise3: { value: noise3 }, uWindDir: { value: WIND_DIR },
    uColor: { value: new THREE.Color("#f0b07a") }, uOpacity: { value: 0.2 },
    uStart: { value: 42 },    // metres from the camera before any wind haze appears
    uClear: { value: 16 }     // radius around the Game Boy kept clear
  };
  {
    const WR = 175, WSEG = 140;
    const wg = new THREE.PlaneGeometry(WR * 2, WR * 2, WSEG, WSEG);
    wg.rotateX(-Math.PI / 2);
    const wp = wg.attributes.position;
    for (let i = 0; i < wp.count; i++) wp.setY(i, groundHeight(wp.getX(i), wp.getZ(i)));
    wg.computeBoundingSphere();
    const LAYERS = 8;
    for (let l = 0; l < LAYERS; l++) {
      const k = l / (LAYERS - 1);
      const m = new THREE.Mesh(wg, new THREE.ShaderMaterial({
        uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...windU, uLayer: { value: k } },
        transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
        vertexShader: /* glsl */`
          uniform float uLayer;
          varying vec3 vW;
          #include <fog_pars_vertex>
          void main(){
            vec3 p = position; p.y += 0.12 + uLayer * uLayer * 4.2;
            vec4 wp = modelMatrix * vec4(p, 1.0);
            vW = wp.xyz;
            vec4 mvPosition = viewMatrix * wp;
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: /* glsl */`
          uniform float uTime, uLayer, uOpacity, uStart, uClear; uniform vec3 uColor; uniform vec2 uWindDir;
          uniform sampler3D uNoise3;
          varying vec3 vW;
          #include <fog_pars_fragment>
          void main(){
            vec2 a = vec2(dot(vW.xz, uWindDir), dot(vW.xz, vec2(-uWindDir.y, uWindDir.x)));
            float n1 = texture(uNoise3, vec3(a.x * 0.010 - uTime * 0.075, a.y * 0.034, uLayer * 0.22 + uTime * 0.015)).r;
            float n2 = texture(uNoise3, vec3(a.x * 0.028 - uTime * 0.30, a.y * 0.15, uLayer * 0.4 + 0.37)).r;
            float n3 = texture(uNoise3, vec3(a.x * 0.07 - uTime * 0.85, a.y * 0.42, uLayer * 0.6 + 0.71)).r;
            float d = smoothstep(0.42, 0.8, n1 * 0.6 + n2 * 0.45 + n3 * 0.15);
            d *= (1.0 - uLayer * 0.82);                                          // thins out with height
            float camD = length(vW - cameraPosition);
            // starts only far from the camera, and never around the Game Boy
            d *= smoothstep(uStart, uStart + 28.0, camD);
            d *= smoothstep(uClear, uClear + 16.0, length(vW.xz));
            d *= 1.0 - smoothstep(110.0, 170.0, length(vW.xz));
            gl_FragColor = vec4(uColor * (0.9 + n3 * 0.25), d * uOpacity);
            #include <fog_fragment>
          }`
      }));
      m.frustumCulled = false;
      m.renderOrder = 5 + l;
      scene.add(m);
    }
  }

  // ---- floating dust motes near the camera path (soft bokeh)
  const MOTE_N = 220;
  const ms = new Float32Array(MOTE_N * 4);
  for (let i = 0; i < MOTE_N; i++) {
    ms[i * 4] = -30 + R1() * 46; ms[i * 4 + 1] = 1 + R1() * 13; ms[i * 4 + 2] = -6 + R1() * 46; ms[i * 4 + 3] = R1();
  }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MOTE_N * 3), 3));
  mg.setAttribute("aSeed", new THREE.BufferAttribute(ms, 4));
  const moteU = { uTime: { value: 0 }, uColor: { value: new THREE.Color("#ffe4bf") }, uOpacity: { value: 0.5 } };
  const motes = new THREE.Points(mg, new THREE.ShaderMaterial({
    uniforms: moteU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aSeed; uniform float uTime; varying float vA;
      void main(){
        vec3 p = aSeed.xyz;
        p.x += mod(uTime * (0.4 + aSeed.w * 0.6) + aSeed.w * 46.0, 46.0) - 23.0 + 8.0;
        p.y += sin(uTime * 0.5 + aSeed.w * 20.0) * 0.6;
        p.z += cos(uTime * 0.35 + aSeed.w * 12.0) * 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float z = -mv.z;
        vA = smoothstep(0.8, 3.0, z) * (1.0 - smoothstep(18.0, 40.0, z));
        gl_PointSize = (2.0 + aSeed.w * 5.0) * 70.0 / z;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.15, d) * 0.12 + smoothstep(0.5, 0.0, d) * 0.1;
        gl_FragColor = vec4(uColor * a * vA * uOpacity, 1.0);
      }`
  }));
  motes.frustumCulled = false;
  scene.add(motes);

  // ---- lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera;
  sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 260;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.04;
  key.shadow.radius = 3;
  scene.add(key, key.target);

  scene.fog = new THREE.FogExp2(0xffffff, 0.002);

  const sunDir = new THREE.Vector3();
  const tmpC = new THREE.Color();
  const tmp = new THREE.Vector3();
  let last = null;

  world.update = (tod, time, focus) => {
    const s = sampleTod(tod);
    last = s;
    const el = THREE.MathUtils.degToRad(s.elev);
    sunDir.set(Math.sin(SUN_AZ) * Math.cos(el), Math.sin(el), Math.cos(SUN_AZ) * Math.cos(el)).normalize();

    skyU.uZenith.value.copy(s.zenith);
    skyU.uHorizon.value.copy(s.horizon);
    skyU.uMid.value.copy(s.mid);
    skyU.uGlow.value.copy(s.glow);
    skyU.uSunDir.value.copy(sunDir);
    skyU.uStars.value = s.stars;
    skyU.uTime.value = time;

    scene.fog.color.copy(s.fog);
    scene.fog.density = s.fogD;

    // key light: the sun, handing over to the moon after sunset
    const moonK = smoothstep(0.62, 0.86, tod);
    const sunFade = 1 - smoothstep(0.5, 0.7, tod);
    tmp.copy(sunDir).lerp(MOON_DIR, moonK).normalize();
    key.color.copy(s.key);
    key.intensity = s.keyI * Math.max(sunFade, moonK) ;
    key.position.copy(focus).addScaledVector(tmp, 120);
    key.target.position.copy(focus);

    hemi.color.copy(s.hemiS);
    hemi.groundColor.copy(s.hemiG);
    hemi.intensity = s.hemiI;
    scene.environmentIntensity = s.env;

    sandU.uTime.value = time;
    skyU.uCloudOff.value.set(time * 0.0016, time * 0.0007);
    skyU.uCloudLit.value.copy(s.key).multiplyScalar(1.25 * Math.max(sunFade, 0.15));
    skyU.uCloudShade.value.copy(s.mid).lerp(s.zenith, 0.35).multiplyScalar(0.8);
    windU.uTime.value = time;
    windU.uColor.value.set("#ffc79a").multiply(tmpC.copy(s.key).multiplyScalar(0.7 + 0.5 * sunFade));
    windU.uOpacity.value = lerp(0.3, 0.18, tod);
    sandU.uGlint.value.copy(s.key).multiplyScalar(2.2 * sunFade);
    partU.uTime.value = time;
    partU.uColor.value.set("#f2a46c").lerp(s.key, 0.25).multiplyScalar(s.sand);
    partU.uOpacity.value = lerp(0.5, 0.22, tod);
    moteU.uTime.value = time;
    moteU.uColor.value.copy(s.glow).lerp(s.key, 0.5);
    moteU.uOpacity.value = 1 - smoothstep(0.4, 0.8, tod);
    return s;
  };
  world.tod = () => last;
  world.setPixelScale = k => { partU.uScale.value = k; };
  return world;
}
