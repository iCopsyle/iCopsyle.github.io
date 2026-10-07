/* Insert Game Name Here, rebuilt in 3D: green sky, pink void, a white grid corridor that
   assembles itself tile by tile as you walk, and the game's narrator face (its own sprites,
   from the Zanga26 project) watching you from the end of it. */
import * as THREE from "three";
import { NOISE } from "./common.js";

const GREEN = new THREE.Color("#0b6a12"), PINK = new THREE.Color("#c4789e");

export function createIGNH({ A }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 3000);
  const time = { value: 0 };

  // ---- sky: flat green with the game's film grain
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({
    uniforms: { uTime: time, uCol: { value: GREEN } }, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vDir; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vDir = wp.xyz - cameraPosition;
      gl_Position = projectionMatrix * viewMatrix * wp; gl_Position.z = gl_Position.w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uCol; varying vec3 vDir;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir);
        vec3 col = uCol * (0.82 + 0.18 * smoothstep(0.6, 0.0, d.y));
        col *= 0.94 + 0.12 * hash12(floor(gl_FragCoord.xy) + fract(uTime * 13.0) * 97.0);
        gl_FragColor = vec4(col, 1.0);
      }`
  }));
  sky.renderOrder = 1000; sky.frustumCulled = false;
  scene.add(sky);

  // ---- the pink void floor
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uTime: time, uCol: { value: PINK } },
    vertexShader: `varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uCol; varying vec3 vW;
      ${NOISE}
      void main(){
        float d = length(vW.xz - cameraPosition.xz);
        vec3 col = uCol * mix(0.32, 1.0, smoothstep(2.0, 26.0, d));      // darker underfoot, like the game
        col *= 0.92 + 0.14 * hash12(floor(gl_FragCoord.xy) + fract(uTime * 11.0) * 71.0);
        gl_FragColor = vec4(col, 1.0);
      }`
  }));
  ground.position.y = -0.02;
  scene.add(ground);

  // ---- the corridor: 1 m grid tiles that fly in from the sky and lock into place ahead of you
  const gridTex = A.gridNumbered;
  gridTex.colorSpace = THREE.SRGBColorSpace;
  gridTex.anisotropy = 8;
  const COLS = 6, ROWS = 168, START = 8;     // ends short of the face, fully built by the end of the walk
  // The narrator builds the corridor for you. Every tile not yet placed waits in a slow orbit
  // around the face; as you walk, tiles peel off the orbit and stream down in arcs - a river of
  // glowing tiles - to lock into place just ahead of you, flashing as they land.
  const FACE_POS = new THREE.Vector3(0, 11, -190);
  const assembleU = { uCamZ: { value: 0 }, uTime: time, uFace: { value: FACE_POS } };
  // the grid texture is white lines on transparency: use its alpha as a line mask over a base colour
  const GRID_FRAG = (base, line) => `
    #ifdef USE_MAP
      float gridA = texture2D(map, vMapUv).a;
      diffuseColor.rgb *= mix(${base}, ${line}, gridA);
    #else
      float gridA = 1.0;
    #endif`;
  const GLOW = "vec3(0.78, 1.0, 0.86)";
  const assemble = (mat, gridColors) => {
    mat.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vFly; varying float vPulse;")
        .replace("#include <map_fragment>", gridColors ? GRID_FRAG(...gridColors) : "#include <map_fragment>\nfloat gridA = 1.0;")
        .replace("#include <color_fragment>", `#include <color_fragment>
          // in flight: the grid lines burn bright; on landing: a flash that fades as you approach
          float flying = smoothstep(0.0, 0.04, vFly) * (1.0 - smoothstep(0.9, 1.0, vFly) * 0.55);
          diffuseColor.rgb = mix(diffuseColor.rgb, ${GLOW} * (0.55 + gridA * 2.2), flying * 0.85);
          diffuseColor.rgb += ${GLOW} * vPulse * (0.6 + gridA * 2.5);`);
      Object.assign(sh.uniforms, assembleU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", `#include <common>
          attribute vec3 aTile; uniform float uCamZ, uTime; uniform vec3 uFace;
          varying float vFly; varying float vPulse;
          mat3 rotXZ(float a, float b){ float ca = cos(a), sa = sin(a), cb = cos(b), sb = sin(b);
            return mat3(cb, 0.0, -sb, 0.0, 1.0, 0.0, sb, 0.0, cb) * mat3(1.0, 0.0, 0.0, 0.0, ca, sa, 0.0, -sa, ca); }`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          float rnd = aTile.z;
          float ahead = (uCamZ - 20.0) - aTile.y;              // metres past the build line (>0: not placed yet)
          float land = rnd * 9.0;                              // tiles land a little raggedly
          float a = clamp((ahead - land) / 52.0, 0.0, 1.0);    // 0 placed ... 1 waiting in orbit
          float e = a * a * (3.0 - 2.0 * a);
          // the orbit around the narrator
          float th = rnd * 43.98 + uTime * (0.22 + rnd * 0.18);
          float rr = 14.0 + fract(rnd * 13.7) * 12.0;         // a ring around the face, clear of it
          vec3 orbit = uFace + vec3(cos(th) * rr, sin(th) * rr * 0.62, sin(th * 2.0) * 1.5 - 7.0);
          vec3 slot = vec3(aTile.x, 0.04, aTile.y);
          // two rivers that swing wide around the face (a quadratic curve through a side point)
          float side = rnd < 0.5 ? -1.0 : 1.0;
          vec3 ctrl = vec3(side * (20.0 + fract(rnd * 7.3) * 16.0), 4.0 + fract(rnd * 3.7) * 10.0, mix(slot.z, orbit.z, 0.6));
          vec3 path = (1.0 - e) * (1.0 - e) * slot + 2.0 * (1.0 - e) * e * ctrl + e * e * orbit;
          transformed = rotXZ(e * (rnd - 0.5) * 14.0 + uTime * e * 1.4, e * (rnd * 2.0 - 1.0) * 9.0) * (transformed * (1.0 - e * 0.45));
          transformed += path - slot;                          // instanceMatrix already places the slot
          vFly = a;
          vPulse = (1.0 - smoothstep(0.0, 5.0, land - ahead)) * step(ahead, land);   // just landed
        `);
    };
    return mat;
  };
  const tileGeo = new THREE.BoxGeometry(1.0, 0.08, 1.0);
  const tiles = new THREE.InstancedMesh(tileGeo, assemble(new THREE.MeshBasicMaterial({ map: gridTex, color: new THREE.Color(1, 1, 1) }), ["vec3(0.86)", "vec3(0.42)"]), COLS * ROWS);
  const aTile = new Float32Array(COLS * ROWS * 3);
  const o = new THREE.Object3D();
  let i = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x = c - (COLS - 1) / 2, z = START - r;
    o.position.set(x, 0.04, z); o.updateMatrix();
    tiles.setMatrixAt(i, o.matrix);
    aTile.set([x, z, Math.random()], i * 3);
    i++;
  }
  tiles.geometry.setAttribute("aTile", new THREE.InstancedBufferAttribute(aTile, 3));
  tiles.frustumCulled = false;
  scene.add(tiles);
  // black edge lines, also assembled
  const edgeGeo = new THREE.BoxGeometry(0.07, 0.1, 1);
  const edges = new THREE.InstancedMesh(edgeGeo, assemble(new THREE.MeshBasicMaterial({ color: 0x050505 })), ROWS * 2);
  const aEdge = new Float32Array(ROWS * 2 * 3);
  i = 0;
  for (let r = 0; r < ROWS; r++) for (const s of [-1, 1]) {
    const x = s * (COLS / 2 + 0.02), z = START - r;
    o.position.set(x, 0.05, z); o.updateMatrix();
    edges.setMatrixAt(i, o.matrix);
    aEdge.set([x, z, Math.random()], i * 3);
    i++;
  }
  edges.geometry.setAttribute("aTile", new THREE.InstancedBufferAttribute(aEdge, 3));
  edges.frustumCulled = false;
  scene.add(edges);

  // sparks thrown up where tiles lock in, riding the build front
  const SN = 700, ss = new Float32Array(SN * 4);
  for (let s = 0; s < SN; s++) { ss[s * 4] = (Math.random() - 0.5) * COLS; ss[s * 4 + 1] = Math.random(); ss[s * 4 + 2] = Math.random() * 9; ss[s * 4 + 3] = Math.random(); }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SN * 3), 3));
  sg.setAttribute("aSeed", new THREE.BufferAttribute(ss, 4));
  const sparkU = { uTime: time, uCamZ: assembleU.uCamZ, uScale: { value: 1 }, uOn: { value: 1 } };
  const sparks = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: sparkU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aSeed; uniform float uTime, uCamZ, uScale; varying float vA;
      void main(){
        float life = fract(aSeed.y + uTime * (0.55 + aSeed.w * 0.6));
        vec3 p = vec3(aSeed.x + (aSeed.w - 0.5) * life * 2.5, 0.1 + life * (1.2 + aSeed.w * 2.8) - life * life * 1.6,
                      uCamZ - 20.0 - aSeed.z + life * (aSeed.w - 0.5) * 1.5);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = (1.0 - life) * smoothstep(0.0, 0.08, life);
        gl_PointSize = uScale * (1.5 + aSeed.w * 2.5) * 30.0 / -mv.z;
      }`,
    fragmentShader: `uniform float uOn; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5);
      gl_FragColor = vec4(vec3(0.8, 1.0, 0.88) * 2.4 * smoothstep(0.5, 0.0, d) * vA * uOn, 1.0); }`
  }));
  sparks.frustumCulled = false;
  scene.add(sparks);

  // ---- floating prototype blocks (the grid-material look the game was built in)
  const blockCols = ["#ff8a3d", "#5b7cfa", "#9b5de5", "#f6d743", "#2ec4b6"];
  const blocks = [];
  for (let b = 0; b < 12; b++) {
    const t = gridTex.clone(); t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const s = 1 + Math.random() * 2.2;
    t.repeat.set(Math.round(s), Math.round(s));
    const bm = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(blockCols[b % blockCols.length]) });
    bm.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", GRID_FRAG("vec3(1.0)", "vec3(0.55)")); };
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), bm);
    const side = b % 2 ? 1 : -1;
    m.position.set(side * (6 + Math.random() * 10), 2 + Math.random() * 7, -10 - b * 12 - Math.random() * 6);
    m.userData = { base: m.position.clone(), spin: (Math.random() - 0.5) * 0.6, ph: Math.random() * 6 };
    scene.add(m); blocks.push(m);
  }

  // ---- the pressable button from the game, waiting halfway down the corridor
  const button = new THREE.Group();
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.9, 32), new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.5 }));
  housing.position.y = 0.45;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 32), new THREE.MeshStandardMaterial({ color: 0xe8283f, roughness: 0.35, emissive: 0xe8283f, emissiveIntensity: 0.25 }));
  cap.position.y = 0.98;
  button.add(housing, cap);
  button.position.set(2.2, 0.08, -38);
  scene.add(button);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc4789e, 1.6));
  const dl = new THREE.DirectionalLight(0xffffff, 1.5); dl.position.set(3, 8, 4); scene.add(dl);
  let capPress = 0;

  // ---- the narrator: composed from the game's 64x64 face sprites
  const S = A.faceSprites;
  const faceCv = document.createElement("canvas"); faceCv.width = faceCv.height = 64;
  const fg = faceCv.getContext("2d");
  const faceTex = new THREE.CanvasTexture(faceCv);
  faceTex.magFilter = THREE.NearestFilter; faceTex.minFilter = THREE.LinearFilter; faceTex.generateMipmaps = false;
  faceTex.colorSpace = THREE.SRGBColorSpace;
  const FACE = 15;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(FACE, FACE), new THREE.MeshBasicMaterial({
    map: faceTex, transparent: true, color: new THREE.Color(1.0, 1.0, 1.0), fog: false, depthWrite: false
  }));
  face.position.set(0, 11, -190);
  scene.add(face);

  let blinkAt = 2, blinkT = -1, talking = false, mouthF = 0, lastDraw = -1;
  const look = new THREE.Vector2();
  function drawFace(t, talk) {
    // blink
    if (t > blinkAt && blinkT < 0) blinkT = t;
    let eye = "open";
    if (blinkT >= 0) {
      const b = t - blinkT;
      eye = b < 0.05 ? "half" : b < 0.15 ? "closed" : b < 0.2 ? "half" : "open";
      if (b > 0.2) { blinkT = -1; blinkAt = t + 2.2 + Math.random() * 2.8; }
    }
    const mouth = talk ? ["mouth_1", "mouth_2", "mouth_0", "mouth_2", "mouth_1"][Math.floor(t * 9) % 5] : "mouth_0";
    const key = eye + mouth + Math.round(look.x * 2) + Math.round(look.y * 2);
    if (key === lastDraw) return;
    lastDraw = key;
    fg.clearRect(0, 0, 64, 64);
    fg.imageSmoothingEnabled = false;
    const dx = Math.round(look.x * 2), dy = Math.round(look.y * 1);
    for (const s of ["l", "r"]) {
      fg.drawImage(S[`eye_${s}_${eye}`], 0, 0);
      if (eye !== "closed") fg.drawImage(S[`brow_${s}`], 0, talk ? -1 : 0);
      if (eye === "open") fg.drawImage(S[`pupil_${s}`], dx, dy);
    }
    fg.drawImage(S[mouth], 0, 0);
    faceTex.needsUpdate = true;
  }

  // ---- the walk
  const tgt = new THREE.Vector3();
  function update(k, t, dt, mouse = { x: 0, y: 0 }, speaking = false) {
    time.value = t;
    const z = 6 - k * 150;
    const step = Math.sin(k * 160) * 0.035;
    camera.position.set(mouse.x * 0.5, 1.75 + step - mouse.y * 0.25, z);
    const up = THREE.MathUtils.smoothstep(k, 0.6, 1.0);
    tgt.set(0, 1.9 + up * 7.5, z - 40);
    camera.lookAt(tgt);
    assembleU.uCamZ.value = z;

    // the face follows you with its eyes
    look.set(THREE.MathUtils.clamp(-camera.position.x * 0.6 + Math.sin(t * 0.4) * 0.6, -1, 1), Math.sin(t * 0.3) * 0.5);
    drawFace(t, speaking);
    face.position.y = 11 + Math.sin(t * 0.8) * 0.3;
    // the sparks stop once the last tile is down
    sparkU.uOn.value = 1 - THREE.MathUtils.smoothstep(-(z - 20), 150, 162);

    blocks.forEach(b => {
      const u = b.userData;
      b.rotation.set(t * u.spin, t * u.spin * 1.3, 0);
      b.position.y = u.base.y + Math.sin(t * 0.7 + u.ph) * 0.4;
    });
    capPress += ((capPress > 0.5 ? 0 : 0) - capPress) * (1 - Math.exp(-dt * 8));
    cap.position.y = 0.98 - capPress * 0.12;
  }

  const ray = new THREE.Raycaster();
  return {
    scene, camera, update, lcdFov: 62, exposure: 1.0,
    bloom: { strength: 0.85, threshold: 0.9, radius: 0.55 },
    setPixelScale(s) { sparkU.uScale.value = s; },
    pick(ndc) {
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects([housing, cap], false).length ? { kind: "button" } : null;
    },
    pressButton() { capPress = 1; }
  };
}
