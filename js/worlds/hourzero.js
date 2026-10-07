/* HourZero, rebuilt in 3D: a basalt road over a lava sea under a red sky, the game's attack
   drones, and the asteroid that is about to hit. Drone and asteroid come from the game's own
   project (Fast Paced Shooter); the sky light is its UnearthlyRed HDRI. */
import * as THREE from "three";
import { NOISE, fogShader } from "./common.js";

const LIN = (r, g, b) => new THREE.Color().setRGB(r, g, b);
const FOG = LIN(0.2, 0.018, 0.008);

export function createHourZero({ renderer, A }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 3000);
  scene.fog = new THREE.FogExp2(FOG.clone(), 0.0065);
  if (A.envRed) {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(A.envRed).texture;
    pm.dispose();
  }
  scene.environmentIntensity = 0.3;
  const time = { value: 0 };

  // ---- sky: the game's own skybox (SkySeries "UnearthlyRed"), hazed into the red fog at the
  //      horizon and set on fire around the incoming meteor
  const astDir = new THREE.Vector3(0, 0.3, -1).normalize();
  const skyTex = A.hzSky;
  skyTex.colorSpace = THREE.SRGBColorSpace;
  skyTex.generateMipmaps = false;               // no mip seam where the equirect wraps
  skyTex.minFilter = THREE.LinearFilter;
  // fog takes the skybox's own horizon colour, so the lava fades into the sky instead of a red wall
  const SKY_GAIN = 1.6;
  {
    const c = document.createElement("canvas"); c.width = 64; c.height = 4;
    const g = c.getContext("2d");
    const img = skyTex.image;
    g.drawImage(img, 0, img.height * 0.485, img.width, img.height * 0.03, 0, 0, 64, 4);
    const d = g.getImageData(0, 0, 64, 4).data;
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    const lin = x => { const s = x / n / 255; const l = s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); return l / Math.max(1 - l, 0.04) * SKY_GAIN; };
    FOG.setRGB(lin(r), lin(gg), lin(b));
  }
  const skyU = { uTime: time, uAst: { value: astDir }, uHeat: { value: 0.4 }, uFog: { value: FOG }, uSky: { value: skyTex } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 48, 24), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vDir = wp.xyz - cameraPosition;
      gl_Position = projectionMatrix * viewMatrix * wp; gl_Position.z = gl_Position.w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uHeat; uniform vec3 uAst, uFog; uniform sampler2D uSky; varying vec3 vDir;
      const float SKY_GAIN = ${SKY_GAIN.toFixed(2)};
      void main(){
        vec3 d = normalize(vDir);
        // equirectangular lookup, rotated so the planet hangs to the left of the road
        float u = atan(d.z, d.x) / 6.2831853 + 0.5 + 0.13;
        float v = asin(clamp(d.y, -1.0, 1.0)) / 3.1415927 + 0.5;
        vec3 sky = texture2D(uSky, vec2(u, v)).rgb;
        sky = sky / max(1.0 - sky, 0.04) * SKY_GAIN;                     // undo the roll-off baked into the file
        // the whole skybox shows, its own horizon included; only a thin haze where the lava meets it
        vec3 col = mix(sky, uFog, (1.0 - smoothstep(0.0, 0.05, abs(d.y))) * 0.5);
        float a = max(dot(d, uAst), 0.0);
        col += vec3(1.0, 0.22, 0.03) * pow(a, 24.0) * uHeat * 0.45;
        col += vec3(1.0, 0.45, 0.1) * pow(a, 120.0) * 0.8 * uHeat;
        gl_FragColor = vec4(col, 1.0);
      }`
  }));
  sky.renderOrder = 1000;
  sky.frustumCulled = false;
  scene.add(sky);

  // ---- the lava sea
  const lavaU = { uTime: time };
  const lava = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 1, 1).rotateX(-Math.PI / 2), fogShader({
    uniforms: lavaU,
    vertexShader: /* glsl */`
      varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    // A straight port of the game's "Fast Paced Shooter/Lava" shader with Lava.mat's values:
    // domain-warped gradient-noise fBm, crust plates over molten channels, hot seams.
    fragmentShader: /* glsl */`
      uniform float uTime, uGlow; uniform vec3 uLightDir, uLightCol, uAmbient; varying vec3 vW;
      #include <fog_pars_fragment>
      const vec3 CRUST = vec3(0.035, 0.018, 0.015), MID = vec3(0.95, 0.2, 0.02), HOT = vec3(5.0, 1.25, 0.15);
      const float EMISSION = 8.0, NOISE_SCALE = 0.2, WARP = 2.6, CRUST_T = 0.5, CRUST_SOFT = 0.095, SEAM_GLOW = 0.6,
                  MOTTLE = 0.45, FLOW_SPEED = 0.035, DETAIL_SPEED = 0.09, MORPH = 0.2, ADVECT = 1.2,
                  PULSE_SPEED = 0.7, PULSE_AMT = 0.16, BUMP = 1.2, SMOOTH = 60.0, SPEC = 0.22, CREVICE = 0.65;
      vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return -1.0 + 2.0 * fract(sin(p) * 43758.5453123); }
      float gnoise(vec2 p){
        vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(dot(hash2(i), f), dot(hash2(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
                   mix(dot(hash2(i + vec2(0, 1)), f - vec2(0, 1)), dot(hash2(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
      }
      float fbm4(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += gnoise(p) * a; p *= 2.03; a *= 0.5; } return s; }
      float fbm3(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += gnoise(p) * a; p *= 2.03; a *= 0.5; } return s; }
      void main(){
        float t = uTime;
        vec2 dir = normalize(vec2(1.0, 0.35));
        vec2 p = vW.xz * NOISE_SCALE;
        vec2 flow = dir * FLOW_SPEED * t, drift = dir * DETAIL_SPEED * t;
        float morph = t * MORPH;
        vec2 q = vec2(fbm4(p + flow + vec2(0.0, morph)), fbm4(p + flow + vec2(5.2, 1.3 - morph)));
        float v = fbm4(p + WARP * q + vec2(1.7, 9.2)) * 0.5 + 0.5;
        float detail = fbm3(p * 3.1 + q * ADVECT - drift) * 0.5 + 0.5;
        float shaped = v + (detail - 0.5) * 0.22;
        float crust = smoothstep(CRUST_T - CRUST_SOFT, CRUST_T + CRUST_SOFT, shaped);
        float heat = clamp((1.0 - crust) * (1.0 + sin(t * PULSE_SPEED + v * 12.0) * PULSE_AMT), 0.0, 1.0);
        float seam = 4.0 * crust * (1.0 - crust);
        // relief from the same height field, via screen-space derivatives
        float height = shaped + detail * 0.35;
        vec3 gN = vec3(0.0, 1.0, 0.0);
        vec3 dpdx = dFdx(vW), dpdy = dFdy(vW);
        vec3 r1 = cross(dpdy, gN), r2 = cross(gN, dpdx);
        float det = dot(dpdx, r1);
        vec3 grad = (dFdx(height) * r1 + dFdy(height) * r2) / (abs(det) + 1e-6);
        vec3 n = normalize(gN - BUMP * grad);
        vec3 V = normalize(cameraPosition - vW);
        vec3 col = mix(CRUST, MID, smoothstep(0.0, 0.45, heat));
        col = mix(col, HOT, smoothstep(0.72, 1.0, heat));
        vec3 emissive = col * EMISSION * (heat * heat * 0.9 + seam * SEAM_GLOW * 0.35);
        float ao = mix(1.0, clamp(0.35 + shaped, 0.0, 1.0), CREVICE);
        vec3 crustBase = CRUST * mix(1.0 - MOTTLE, 1.0 + MOTTLE, detail);
        float ndl = max(dot(n, uLightDir), 0.0);
        vec3 lit = crustBase * (uAmbient + uLightCol * ndl) * ao;
        lit += uLightCol * pow(max(dot(n, normalize(uLightDir + V)), 0.0), SMOOTH) * SPEC * crust * ao;
        float reliefGlow = clamp(0.55 + 0.45 * dot(n, gN), 0.0, 1.0);
        gl_FragColor = vec4(lit + emissive * reliefGlow * uGlow, 1.0);
        #include <fog_fragment>
      }`
  }));
  lavaU.uGlow = { value: 0.11 };              // the game's EMISSION 8 is tuned for its own tonemapper
  lavaU.uLightDir = { value: new THREE.Vector3(0.3, 0.5, -0.8).normalize() };
  lavaU.uLightCol = { value: new THREE.Color(1.0, 0.45, 0.22) };
  lavaU.uAmbient = { value: new THREE.Color(0.35, 0.06, 0.03) };
  Object.assign(lava.material.uniforms, { uGlow: lavaU.uGlow, uLightDir: lavaU.uLightDir, uLightCol: lavaU.uLightCol, uAmbient: lavaU.uAmbient });
  scene.add(lava);

  // ---- the road: the game's cobblestone ground, with its glowing floor tiles
  const ROAD_W = 9, ROAD_L = 300;             // runs out to the foot of the far ridge
  // the game's ground material (Tiles092 cobblestone, Ground.mat: smoothness 0.231)
  for (const k of ["hzGroundColor", "hzGroundNormal", "hzGroundRough"]) {
    A[k].wrapS = A[k].wrapT = THREE.RepeatWrapping;
    A[k].repeat.set(ROAD_W / 3.2, ROAD_L / 3.2);
    A[k].anisotropy = 8;
  }
  const road = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W, 1.4, ROAD_L), new THREE.MeshStandardMaterial({
    map: A.hzGroundColor, normalMap: A.hzGroundNormal, roughnessMap: A.hzGroundRough,
    roughness: 1, metalness: 0, color: new THREE.Color(0.95, 0.72, 0.68)
  }));
  road.position.set(0, -0.2, -ROAD_L / 2 + 40);
  road.receiveShadow = true;
  road.material.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vW;")
      .replace("#include <emissivemap_fragment>", /* glsl */`
        #include <emissivemap_fragment>
        {
          // the glowing floor tiles down the centre line, as in the game
          float top = step(0.45, vW.y);          // road surface sits at y = 0.5
          float z = mod(vW.z, 16.0) - 8.0;
          float tile = (1.0 - smoothstep(1.1, 1.18, abs(vW.x))) * (1.0 - smoothstep(0.55, 0.62, abs(z))) * top;
          totalEmissiveRadiance += vec3(1.0, 0.62, 0.18) * tile * 3.2;
        }`);
  };
  scene.add(road);

  // ---- drones, with the eye recoloured to the game's red
  const droneMats = {};
  const prep = (t, srgb) => { t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true; return t; };
  const mk = set => {
    if (droneMats[set]) return droneMats[set];
    const m = new THREE.MeshStandardMaterial({
      map: prep(A[`drone_${set}_color`], true), normalMap: prep(A[`drone_${set}_normal`], false),
      roughnessMap: prep(A[`drone_${set}_orm`], false), metalnessMap: A[`drone_${set}_orm`],
      roughness: 1, metalness: 1, envMapIntensity: 1.2
    });
    if (A[`drone_${set}_emissive`]) {
      m.emissiveMap = prep(A[`drone_${set}_emissive`], true);
      m.emissive = new THREE.Color(1.0, 0.12, 0.05);
      m.emissiveIntensity = 9;
      m.onBeforeCompile = sh => {
        sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", `
          #ifdef USE_EMISSIVEMAP
            vec3 ec = texture2D(emissiveMap, vEmissiveMapUv).rgb;
            totalEmissiveRadiance *= vec3(max(ec.r, max(ec.g, ec.b)));
          #endif`);
      };
    }
    return (droneMats[set] = m);
  };
  const droneProto = A.drone.scene;
  droneProto.traverse(o => {
    if (!o.isMesh) return;
    const n = o.material.name || "";
    o.material = mk(n.startsWith("Body") ? "body" : n.startsWith("Wing") ? "wing" : "inner");
    o.castShadow = true;
  });
  const drones = [
    { home: new THREE.Vector3(3.2, 4.2, -13), s: 1.0, ph: 0 },
    { home: new THREE.Vector3(-9, 9, -48), s: 1.3, ph: 1.7 },
    { home: new THREE.Vector3(10, 12, -82), s: 1.5, ph: 3.1 },
    { home: new THREE.Vector3(-5, 7, -118), s: 1.2, ph: 4.4 },
    { home: new THREE.Vector3(7, 15, -160), s: 1.8, ph: 5.2 }
  ].map(d => {
    const g = droneProto.clone(true);
    g.scale.setScalar(d.s);
    scene.add(g);
    const light = new THREE.PointLight(0xff2a10, 30, 22, 2);
    g.add(light); light.position.set(0, 0, 1.6);
    return { ...d, g, light, look: new THREE.Quaternion() };
  });

  // ---- the asteroid that is about to hit
  const astMat = new THREE.MeshStandardMaterial({
    map: Object.assign(A.astColor, { colorSpace: THREE.SRGBColorSpace }),
    normalMap: A.astNormal, emissiveMap: Object.assign(A.astEmissive, { colorSpace: THREE.SRGBColorSpace }),
    emissive: new THREE.Color(1.0, 0.45, 0.12), emissiveIntensity: 5, roughness: 0.9, fog: false
  });
  let astGeo = null;
  A.asteroid.scene.traverse(o => { if (o.isMesh && !astGeo) astGeo = o.geometry; });
  const asteroid = new THREE.Mesh(astGeo, astMat);
  scene.add(asteroid);
  const astLight = new THREE.DirectionalLight(0xff7a30, 2.4);
  scene.add(astLight, astLight.target);

  // ---- embers rising off the lava
  const EN = 1800;
  const es = new Float32Array(EN * 4);
  for (let i = 0; i < EN; i++) { es[i * 4] = (Math.random() - 0.5) * 80; es[i * 4 + 1] = Math.random(); es[i * 4 + 2] = 20 - Math.random() * 220; es[i * 4 + 3] = Math.random(); }
  const eg = new THREE.BufferGeometry();
  eg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(EN * 3), 3));
  eg.setAttribute("aSeed", new THREE.BufferAttribute(es, 4));
  const embers = new THREE.Points(eg, new THREE.ShaderMaterial({
    uniforms: { uTime: time, uScale: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aSeed; uniform float uTime, uScale; varying float vA;
      void main(){
        float t = fract(aSeed.y + uTime * (0.04 + aSeed.w * 0.05));
        vec3 p = vec3(aSeed.x + sin(uTime * 0.7 + aSeed.w * 30.0) * 1.5, t * 26.0, aSeed.z + cos(uTime * 0.5 + aSeed.x) * 1.5);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = sin(t * 3.14159) * (0.6 + 0.4 * sin(uTime * 9.0 + aSeed.w * 50.0));
        gl_PointSize = uScale * (1.5 + aSeed.w * 3.0) * 40.0 / -mv.z;
      }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.45, 0.1) * 3.0 * smoothstep(0.5, 0.0, d) * vA, 1.0); }`
  }));
  embers.frustumCulled = false;
  scene.add(embers);

  // ---- light
  scene.add(new THREE.HemisphereLight(0x3a0804, 0x8a1a06, 0.7));

  // ---- the walk down the road, the clock running out, and the meteor landing.
  // Meteor.cs: a straight line from where it starts to overhead the player, positioned by how
  // much of the clock is spent, scale 1 -> 2.5. MeteorImpact.cs: camera shake 1.6, FOV thrown
  // out 20 degrees, 7 stops of exposure ramped in squared over 0.22 s, a warm white
  // (1, 0.96, 0.90) on top, held, then a pixel wipe into the next scene.
  const IMPACT_AT = 0.88;                                   // the clock reads 00 here
  const RISE = 0.035;                                       // scroll it takes to blow out
  const METEOR_START = new THREE.Vector3(120, 170, -620);
  const BASE_SCALE = 30;
  const tgt = new THREE.Vector3(), roadTgt = new THREE.Vector3(), end = new THREE.Vector3(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  const fx = { exposure: 0.9, fovOffset: 0, flash: 0 };
  function update(k, t, dt, mouse = { x: 0, y: 0 }) {
    time.value = t;
    const spent = Math.min(1, k / IMPACT_AT);
    const bright = Math.pow(THREE.MathUtils.clamp((k - IMPACT_AT) / RISE, 0, 1), 2);
    const z = 6 - Math.min(k, IMPACT_AT) / IMPACT_AT * 86;   // frozen in place once it lands

    // the meteor
    end.set(0, 2.4, z).add(new THREE.Vector3(0, 92, -64));
    const meteorPos = asteroid.position;
    meteorPos.copy(METEOR_START).lerp(end, Math.pow(spent, 1.35));
    asteroid.scale.setScalar(BASE_SCALE * THREE.MathUtils.lerp(1, 2.5, spent));
    asteroid.rotation.set(t * 0.14, t * 0.24, t * 0.09);       // Meteor.cs spin (8, 14, 5) deg/s

    // camera: walks, then is drawn up to the sky as it arrives; rumble builds, then the hit
    const lookUp = THREE.MathUtils.smoothstep(spent, 0.45, 1.0);
    const rumble = THREE.MathUtils.smoothstep(spent, 0.6, 1.0) * 0.12 + bright * 1.6 * 0.35;
    camera.position.set(
      Math.sin(k * 5.0) * 0.8 + mouse.x * 0.6 + (Math.random() - 0.5) * rumble,
      2.4 + Math.sin(t * 1.3) * 0.05 - mouse.y * 0.3 + (Math.random() - 0.5) * rumble,
      z);
    roadTgt.set(Math.sin(k * 5.0 + 0.6) * 0.5, 3.0, z - 30);
    tgt.copy(roadTgt).lerp(meteorPos, lookUp * 0.8);
    camera.lookAt(tgt);

    astDir.copy(meteorPos).sub(camera.position).normalize();
    skyU.uHeat.value = 0.3 + spent * 1.1;
    astMat.emissiveIntensity = 1.6 + spent * 3.0;
    astLight.position.copy(meteorPos);
    astLight.target.position.set(0, 0, z - 20);
    astLight.intensity = 0.8 + spent * 2.4;
    lavaU.uGlow.value = 0.11 + spent * 0.1;
    scene.fog.color.copy(FOG).lerp(LIN(0.3, 0.07, 0.015), spent * spent * 0.6);   // the sky heats as it nears

    fx.exposure = 0.9 * Math.pow(2, 7 * bright);
    fx.fovOffset = 20 * bright;
    fx.flash = bright;

    // drones hover, bob and turn to watch the camera; the first one rises out of the way
    drones.forEach((d, i) => {
      const lift = i === 0 ? THREE.MathUtils.smoothstep(k, 0.08, 0.3) : 0;
      d.g.position.copy(d.home);
      d.g.position.x += Math.sin(t * 0.6 + d.ph) * 1.2 + lift * 8;
      d.g.position.y += Math.sin(t * 1.4 + d.ph) * 0.45 + lift * 10;
      d.g.position.z += Math.cos(t * 0.4 + d.ph) * 1.0;
      m4.lookAt(camera.position, d.g.position, THREE.Object3D.DEFAULT_UP);   // +Z (the eye) toward the camera
      q.setFromRotationMatrix(m4);
      d.look.slerp(q, 1 - Math.exp(-dt * 2.5));
      d.g.quaternion.copy(d.look);
      d.g.rotateZ(Math.sin(t * 0.9 + d.ph) * 0.12);
      d.light.intensity = 26 + Math.sin(t * 6 + d.ph) * 6;
    });
  }

  return {
    scene, camera, update, lcdFov: 62, IMPACT_AT,
    get exposure() { return fx.exposure; },
    get fovOffset() { return fx.fovOffset; },
    get flash() { return fx.flash; },
    bloom: { strength: 0.45, threshold: 0.95, radius: 0.45 },
    setPixelScale(s) { embers.material.uniforms.uScale.value = s; }
  };
}
