/* The Game Boy: materials, its own cartridge, the clickable buttons, and the featured-game
   cartridges half-buried in the sand around it. Geometry comes from assets/models/gameboy.glb
   (exported from the Sketchfab model in Blender: Y-up, metres, front facing +Z). */
import * as THREE from "three";
import { groundHeight, groundBase, GB_YAW } from "./world.js";

export const GB_SCALE = 68;            // 14.8 cm tall -> about 10 m: a monument
const SINK = 0.55;                      // below the undrifted floor; the drift (world.js) buries it further
const YAW = GB_YAW, TILT = -0.11;

const BUTTONS = ["Btn_A", "Btn_B", "Btn_DPad", "Btn_SelectStart"];
// The source model has A and B swapped: its "a_low" sits in the B position (left, lower).
const SWAP = { Btn_A: "Btn_B", Btn_B: "Btn_A" };

export function createGameBoy({ scene, textures, gltf, screenMaterial, maxAniso }) {
  const prep = (t, srgb) => {
    t.flipY = false;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = maxAniso;
    t.needsUpdate = true;
    return t;
  };
  const plastic = (set, extra = {}) => new THREE.MeshPhysicalMaterial({
    map: prep(textures[`gb_${set}_color`], true),
    normalMap: prep(textures[`gb_${set}_normal`], false),
    aoMap: prep(textures[`gb_${set}_orm`], false),
    roughnessMap: textures[`gb_${set}_orm`], metalnessMap: textures[`gb_${set}_orm`],
    roughness: 1, metalness: 1, aoMapIntensity: 0.9,
    clearcoat: 0.18, clearcoatRoughness: 0.55,
    ...extra
  });
  const mats = {
    Main: plastic("main"),
    External: plastic("ext", {
      emissiveMap: prep(textures.gb_ext_emissive, true), emissive: new THREE.Color("#ff2a1a"), emissiveIntensity: 0
    }),
    Black: new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.55 })
  };
  const cartBase = {
    color: prep(textures.gb_cart_color, true),
    normal: prep(textures.gb_cart_normal, false),
    orm: prep(textures.gb_cart_orm, false)
  };
  const cartMat = labelTex => new THREE.MeshPhysicalMaterial({
    map: labelTex, normalMap: cartBase.normal, roughnessMap: cartBase.orm, metalnessMap: cartBase.orm,
    roughness: 1, metalness: 1, clearcoat: 0.1, clearcoatRoughness: 0.6
  });

  const root = new THREE.Group();
  root.name = "GameBoy";
  const model = gltf.scene;
  model.scale.setScalar(GB_SCALE);
  root.add(model);

  const buttons = {};
  let screen = null, cartGeo = null;
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const mn = o.material && o.material.name;
    if (o.name === "Screen") {
      o.material = screenMaterial;
      o.castShadow = false;
      screen = o;
    } else if (mn === "Main") o.material = mats.Main;
    else if (mn === "External") o.material = mats.External;
    else if (mn === "Black Screen") o.material = mats.Black;
    else if (mn === "Cartridge") {
      o.material = cartMat(makeLabel(cartBase.color.image, { title: "OMAR ALABDAN", own: true }));
      cartGeo = o.geometry;
    }
    if (BUTTONS.includes(o.name)) {
      o.geometry.computeBoundingBox();
      buttons[o.name] = { mesh: o, rest: o.position.clone(), press: 0, target: 0,
        center: o.geometry.boundingBox.getCenter(new THREE.Vector3()) };
    }
  });

  const baseY = groundBase(0, 0);
  root.position.set(0, baseY - SINK + 0.074 * GB_SCALE, 0);
  root.rotation.set(TILT, YAW, 0, "YXZ");
  scene.add(root);
  root.updateMatrixWorld(true);

  // ---- screen frame in world space
  screen.geometry.computeBoundingBox();
  const bb = screen.geometry.boundingBox;
  const toW = v => v.applyMatrix4(screen.matrixWorld);
  const c = toW(bb.getCenter(new THREE.Vector3()));
  const right = toW(new THREE.Vector3(bb.max.x, (bb.min.y + bb.max.y) / 2, bb.max.z)).sub(c);
  const up = toW(new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y, bb.max.z)).sub(c);
  const screenInfo = {
    center: c,
    right: right.clone().normalize(),
    up: up.clone().normalize(),
    normal: new THREE.Vector3().crossVectors(right, up).normalize(),
    width: right.length() * 2,
    height: up.length() * 2
  };

  // ---- the centre of mass for the camera to admire
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());

  // ---- for the sand's contact shading
  const footInv = new THREE.Matrix4().makeRotationY(YAW).setPosition(0, baseY, 0).invert();

  // ---- featured-game cartridges lying in the sand
  const props = [];
  if (cartGeo) {
    const g = cartGeo.clone();
    g.computeBoundingBox();
    const cc = g.boundingBox.getCenter(new THREE.Vector3());
    g.translate(-cc.x, -cc.y, -cc.z);
    // In the GB's own frame (x right, z toward the viewer): lx, lz, lean above horizontal, bury depth, roll
    const spots = [
      [-8.6, 5.2, 0.5, 0.75, 0.06],
      [7.6, 3.4, 0.78, 1.0, -0.05],
      [14.5, 10.5, 0.3, 0.45, 0.1]
    ];
    const viewer = { x: -11, z: 30 };
    const HALF = 0.0643 * GB_SCALE / 2;
    props.push(...spots.map(([lx, lz, lean, bury, roll], i) => {
      const x = lx * Math.cos(YAW) + lz * Math.sin(YAW);
      const z = -lx * Math.sin(YAW) + lz * Math.cos(YAW);
      const vx = viewer.x * Math.cos(YAW) + viewer.z * Math.sin(YAW);
      const vz = -viewer.x * Math.sin(YAW) + viewer.z * Math.cos(YAW);
      const m = new THREE.Mesh(g, null);
      m.scale.setScalar(GB_SCALE);
      // label faces -Z in the model: flip it upright, lean it back, then turn it toward the viewer
      m.rotation.set(Math.PI / 2 + lean, Math.atan2(vx - x, vz - z), Math.PI + roll, "YXZ");
      m.position.set(x, groundHeight(x, z) + HALF * Math.sin(lean) - bury, z);
      m.castShadow = m.receiveShadow = true;
      m.userData.slot = i;
      scene.add(m);
      return m;
    }));
  }
  const setCartLabels = covers => {
    props.forEach((m, i) => {
      const cv = covers[i];
      if (!cv) return;
      m.material = cartMat(makeLabel(cartBase.color.image, cv));
    });
  };

  // ---- interaction
  const pickables = [...Object.values(buttons).map(b => b.mesh), screen];
  const raycaster = new THREE.Raycaster();
  const local = new THREE.Vector3();
  function pick(ndc, camera) {
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    if (!hit) return null;
    const name = SWAP[hit.object.name] || hit.object.name;
    if (name === "Screen") return { name: "Screen", point: hit.point, uv: hit.uv };
    if (name === "Btn_DPad") {
      local.copy(hit.point);
      hit.object.worldToLocal(local);
      const d = local.sub(buttons.Btn_DPad.center);
      const dir = Math.abs(d.x) > Math.abs(d.y) ? (d.x > 0 ? "right" : "left") : (d.y > 0 ? "up" : "down");
      return { name, dir };
    }
    if (name === "Btn_SelectStart") {
      local.copy(hit.point);
      hit.object.worldToLocal(local);
      return { name, which: local.x > buttons.Btn_SelectStart.center.x ? "start" : "select" };
    }
    return { name };
  }
  function press(name) {
    const b = buttons[SWAP[name] || name];
    if (b) { b.target = 1; clearTimeout(b.t); b.t = setTimeout(() => (b.target = 0), 140); }
  }

  function update(dt, { led }) {
    mats.External.emissiveIntensity = led * 5;
    for (const b of Object.values(buttons)) {
      b.press += (b.target - b.press) * (1 - Math.exp(-dt * 30));
      b.mesh.position.z = b.rest.z - b.press * 0.0011;
    }
  }

  const cartKit = {
    geometry: props[0] ? props[0].geometry : null,
    material: info => cartMat(makeLabel(cartBase.color.image, info))
  };
  return { root, model, center, screen, screenInfo, footInv, props, setCartLabels, pick, press, update, buttons, cartKit };
}

/* Paint a game's art onto the cartridge label region of the cartridge texture.
   Label art sits at roughly (65..580, 300..885) of the 2000px texture. */
export function makeLabel(baseImg, { img, title, own }) {
  const S = 1024;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const g = cv.getContext("2d");
  g.drawImage(baseImg, 0, 0, S, S);
  const k = S / 2000;
  const x = 64 * k, y = 300 * k, w = 518 * k, h = 588 * k;
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (own) {
    const gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, "#8ecdf7"); gr.addColorStop(0.62, "#f6d3a6"); gr.addColorStop(1, "#d99357");
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = "#b9763f";
    g.beginPath(); g.moveTo(x, y + h * 0.8);
    g.quadraticCurveTo(x + w * 0.35, y + h * 0.62, x + w * 0.7, y + h * 0.76);
    g.quadraticCurveTo(x + w * 0.88, y + h * 0.82, x + w, y + h * 0.72); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.fill();
    g.fillStyle = "#3a2414";
    g.font = `${Math.round(w * 0.085)}px "Press Start 2P", monospace`;
    g.textAlign = "center";
    g.fillText("OMAR", x + w / 2, y + h * 0.28);
    g.fillText("ALABDAN", x + w / 2, y + h * 0.4);
  } else if (img) {
    const ir = img.width / img.height, r = w / h;
    let sw = img.width, sh = img.height, sx = 0, sy = 0;
    if (ir > r) { sw = img.height * r; sx = (img.width - sw) / 2; } else { sh = img.width / r; sy = (img.height - sh) / 2; }
    g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    g.fillStyle = "rgba(8,10,16,.82)";
    g.fillRect(x, y + h - 46, w, 46);
    g.fillStyle = "#fff";
    g.font = `13px "Press Start 2P", monospace`;
    g.textAlign = "center";
    g.fillText(title.toUpperCase(), x + w / 2, y + h - 18, w - 16);
  }
  g.restore();
  const t = new THREE.CanvasTexture(cv);
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
