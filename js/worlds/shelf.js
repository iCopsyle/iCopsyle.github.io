/* Every game as a cartridge on a slow carousel, like a console's game library: the selected
   game's art fills the background, cartridges stand on a glossy floor that mirrors them, the
   front one sits in a spotlight and turns to follow the mouse. Scroll, drag, arrows or a click
   choose; clicking the front cartridge opens it. */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import { NOISE } from "./common.js";

const TAU = Math.PI * 2;

export function createShelf({ renderer, cartKit, games, images }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  const time = { value: 0 };
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  scene.environmentIntensity = 0.5;

  const N = games.length, R = 11, FLOOR = -2.75;

  // ---- each game's art as a texture, for the backdrop
  const covers = games.map(g => {
    const img = images[g.cover];
    if (!img) return null;
    const t = new THREE.Texture(img);
    t.colorSpace = THREE.SRGBColorSpace;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.needsUpdate = true;
    t.userData.aspect = img.width / img.height;
    return t;
  });
  const avg = games.map(g => {
    const img = images[g.cover];
    const c = new THREE.Color(0.2, 0.4, 0.8);
    if (!img) return c;
    const cv = document.createElement("canvas"); cv.width = cv.height = 1;
    const x = cv.getContext("2d"); x.drawImage(img, 0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data;
    return c.setRGB(d[0] / 255, d[1] / 255, d[2] / 255, THREE.SRGBColorSpace);
  });

  // ---- sky: the selected game's art, blurred, over a sky-blue night gradient
  const skyU = {
    uTime: time, uRes: { value: new THREE.Vector2(1, 1) },
    uA: { value: covers[0] }, uB: { value: covers[0] }, uAspA: { value: 1.6 }, uAspB: { value: 1.6 }, uMix: { value: 1 },
    uTint: { value: new THREE.Color() }
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vDir = wp.xyz - cameraPosition;
      gl_Position = projectionMatrix * viewMatrix * wp; gl_Position.z = gl_Position.w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uMix, uAspA, uAspB; uniform vec2 uRes; uniform sampler2D uA, uB; uniform vec3 uTint;
      varying vec3 vDir;
      ${NOISE}
      vec3 art(sampler2D t, float ia, vec2 uv){
        float sa = uRes.x / uRes.y;
        vec2 s = sa > ia ? vec2(1.0, ia / sa) : vec2(sa / ia, 1.0);
        uv = (uv - 0.5) * s * 0.92 + 0.5;
        return (textureLod(t, uv, 5.5).rgb + textureLod(t, uv + vec2(0.01, 0.0), 6.5).rgb) * 0.5;
      }
      void main(){
        vec3 d = normalize(vDir);
        vec2 uv = gl_FragCoord.xy / uRes;
        vec3 a = mix(art(uB, uAspB, uv), art(uA, uAspA, uv), uMix);
        vec3 grad = mix(vec3(0.03, 0.08, 0.2), vec3(0.006, 0.012, 0.04), smoothstep(-0.1, 0.6, d.y));
        vec3 col = mix(grad, a * 0.8 + uTint * 0.05, 0.82);
        // a dark band where the floor meets the sky, and a soft vignette
        col *= mix(0.35, 1.0, smoothstep(-0.12, 0.08, d.y));
        vec2 v = uv - 0.5; col *= 1.0 - dot(v, v) * 1.1;
        col += vec3(0.6, 0.8, 1.0) * smoothstep(0.6, 0.9, fbm(d.xz / (abs(d.y) + 0.3) * 2.0 + uTime * 0.01)) * 0.02;
        gl_FragColor = vec4(col, 1.0);
      }`
  }));
  sky.renderOrder = 1000; sky.frustumCulled = false;
  const fbSize = new THREE.Vector2();
  sky.onBeforeRender = (r) => {                       // gl_FragCoord is in the current target's pixels
    const rt = r.getRenderTarget();
    if (rt) skyU.uRes.value.set(rt.width, rt.height);
    else { r.getDrawingBufferSize(fbSize); skyU.uRes.value.copy(fbSize); }
  };
  scene.add(sky);

  // ---- a glossy floor that mirrors the cartridges
  const floor = new Reflector(new THREE.CircleGeometry(60, 64), {
    textureWidth: 1024, textureHeight: 1024, clipBias: 0.003,
    shader: {
      name: "ShelfFloor",
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTint: { value: new THREE.Color() } },
      vertexShader: /* glsl */`
        uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
        void main(){ vUv = textureMatrix * vec4(position, 1.0); vW = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform vec3 color, uTint; uniform sampler2D tDiffuse; varying vec4 vUv; varying vec3 vW;
        ${NOISE}
        void main(){
          vec4 pu = vUv;
          pu.xy += (vec2(vnoise(vW.xz * 2.0), vnoise(vW.xz * 2.0 + 9.0)) - 0.5) * 0.012 * pu.w;   // a little ripple: lacquer, not glass
          vec3 refl = texture2DProj(tDiffuse, pu).rgb;
          float r = length(vW.xz - vec2(0.0, ${R.toFixed(1)}));
          float fade = 1.0 - smoothstep(4.0, 30.0, r);
          vec3 base = vec3(0.012, 0.016, 0.03) + uTint * 0.02;
          gl_FragColor = vec4(base + refl * 0.42 * fade, 1.0);
        }`
    }
  });
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR;
  scene.add(floor);

  // the pool of light under the front cartridge
  const poolTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), new THREE.MeshBasicMaterial({
    map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(0.6, 0.8, 1.0)
  }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, FLOOR + 0.02, R + 1.6);
  scene.add(pool);

  // ---- light
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x0b1430, 0.7); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(4, 7, 9); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8ecdf7, 2.4); rim.position.set(-6, 3, -8); scene.add(rim);
  const spot = new THREE.SpotLight(0xffffff, 260, 40, 0.42, 0.75, 1.6);
  spot.position.set(0, 11, R + 7);
  spot.target.position.set(0, 0, R + 1.6);
  scene.add(spot, spot.target);

  // ---- the carousel
  const ring = new THREE.Group();
  scene.add(ring);
  const carts = games.map((g, i) => {
    const m = new THREE.Mesh(cartKit.geometry, cartKit.material({ img: images[g.cover], title: g.title }));
    m.scale.setScalar(68);
    const holder = new THREE.Group();
    const a = (i / N) * TAU;
    holder.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    holder.rotation.y = a;
    const pivot = new THREE.Group();                 // tilt and inspect around the cartridge's centre
    m.rotation.y = Math.PI;                          // label (model -Z) outward
    pivot.add(m);
    holder.add(pivot);
    ring.add(holder);
    m.userData.index = i;
    return { m, pivot, holder, ph: Math.random() * 6, focus: 0 };
  });

  // floating square "pixels"
  const PN = 420, ps = new Float32Array(PN * 4);
  for (let i = 0; i < PN; i++) { ps[i * 4] = (Math.random() - 0.5) * 60; ps[i * 4 + 1] = Math.random(); ps[i * 4 + 2] = (Math.random() - 0.5) * 60; ps[i * 4 + 3] = Math.random(); }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PN * 3), 3));
  pg.setAttribute("aSeed", new THREE.BufferAttribute(ps, 4));
  const pixels = new THREE.Points(pg, new THREE.ShaderMaterial({
    uniforms: { uTime: time, uScale: { value: 1 }, uTint: skyU.uTint }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec4 aSeed; uniform float uTime, uScale; varying float vA;
      void main(){ float t = fract(aSeed.y + uTime * (0.008 + aSeed.w * 0.016)); vec3 p = vec3(aSeed.x, t * 22.0 - 3.0, aSeed.z);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; vA = sin(t * 3.14159) * (0.3 + aSeed.w * 0.7);
        gl_PointSize = uScale * (2.0 + aSeed.w * 4.0) * 30.0 / -mv.z; }`,
    fragmentShader: `uniform vec3 uTint; varying float vA; void main(){ gl_FragColor = vec4(mix(vec3(0.55, 0.8, 1.0), uTint * 1.6 + 0.2, 0.5) * vA * 0.7, 1.0); }`
  }));
  pixels.frustumCulled = false;
  scene.add(pixels);

  // ---- state
  let shown = -1, ringAngle = 0, vel = 0, dragging = false;
  const tint = new THREE.Color();
  const nearest = () => ((Math.round(-ringAngle / (TAU / N)) % N) + N) % N;

  function setBackdrop(i) {
    if (i === shown || !covers[i]) return;
    skyU.uB.value = skyU.uA.value; skyU.uAspB.value = skyU.uAspA.value;
    skyU.uA.value = covers[i]; skyU.uAspA.value = covers[i].userData.aspect;
    skyU.uMix.value = shown === -1 ? 1 : 0;
    shown = i;
  }

  function update(k, t, dt, mouse = { x: 0, y: 0 }, selected = 0) {
    time.value = t;
    setBackdrop(selected);
    skyU.uMix.value = Math.min(1, skyU.uMix.value + dt * 2.2);
    tint.lerp(avg[selected], 1 - Math.exp(-dt * 4));
    skyU.uTint.value.copy(tint);
    floor.material.uniforms.uTint.value.copy(tint);
    pool.material.color.copy(tint).lerp(new THREE.Color(0.7, 0.85, 1.0), 0.6);
    rim.color.copy(tint).lerp(new THREE.Color("#8ecdf7"), 0.5);

    // the ring: follows the selection, or your hand while dragging, with a little inertia after
    if (dragging) {
      ringAngle += vel; vel *= 0.55;
    } else {
      const target = -(selected / N) * TAU;
      let diff = target - ringAngle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      ringAngle += diff * (1 - Math.exp(-dt * 6));
    }
    ring.rotation.y = ringAngle;

    carts.forEach((c, i) => {
      // how close this cartridge is to the front, from the ring's actual angle (so drags look right)
      let a = Math.atan2(Math.sin(ringAngle + (i / N) * TAU), Math.cos(ringAngle + (i / N) * TAU));
      const f = Math.max(0, 1 - Math.abs(a) / (TAU / N));
      const isSel = i === selected ? 1 : 0;
      c.focus += (Math.max(f, isSel * f) - c.focus) * (1 - Math.exp(-dt * 8));
      const s = 68 * (1 + c.focus * 0.22);
      c.m.scale.setScalar(s);
      c.holder.position.setLength(R + c.focus * 1.8);
      c.holder.position.y = Math.sin(t * 1.1 + c.ph) * 0.12 * (1 - c.focus) + c.focus * 0.25;
      // the front one turns to follow the mouse; the rest sway gently
      c.pivot.rotation.set(
        THREE.MathUtils.lerp(Math.sin(t * 0.7 + c.ph) * 0.05, mouse.y * 0.28, c.focus),
        THREE.MathUtils.lerp(0, mouse.x * 0.45 + Math.sin(t * 0.5) * 0.06, c.focus),
        Math.sin(t * 0.6 + c.ph) * 0.03 * (1 - c.focus));
      c.m.material.color.setScalar(THREE.MathUtils.lerp(0.42, 1.0, c.focus));
    });

    camera.position.set(mouse.x * 0.7, 1.5 - mouse.y * 0.35 + Math.sin(t * 0.5) * 0.08, R + 17 - k * 1.2);
    camera.lookAt(0, 0.35, R - 3);
  }

  const ray = new THREE.Raycaster();
  return {
    scene, camera, update, lcdFov: 62, exposure: 1.0,
    bloom: { strength: 0.4, threshold: 0.95, radius: 0.5 },
    setPixelScale(s) { pixels.material.uniforms.uScale.value = s; },
    pick(ndc) {
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObjects(carts.map(c => c.m), false)[0];
      return h ? { kind: "cart", index: h.object.userData.index } : null;
    },
    // drag to spin; returns the cartridge it settles on when released
    dragStart() { dragging = true; vel = 0; },
    drag(dxPx) { vel += dxPx * 0.0035; },
    // a flick carries on: settle on where the spin was heading, and let the ring glide there
    dragEnd() { dragging = false; ringAngle += vel * 4; vel = 0; return nearest(); },
    get dragging() { return dragging; },
    liveIndex: () => nearest()
  };
}
