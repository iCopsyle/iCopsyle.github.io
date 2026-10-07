/* Post-processing: MSAA scene -> bloom -> tone map (OutputPass) -> film grade (grain, vignette,
   a little lens fringing), applied in display space so the grain reads like film. */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export function createPost(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.5, 0.65, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const grade = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.3 },
      uGrain: { value: 0.035 }, uCA: { value: 0.0035 }, uRes: { value: new THREE.Vector2(size.x, size.y) },
      uFade: { value: 0 }, uBlock: { value: 1 }, uGridAmt: { value: 0 },
      uFlash: { value: 0 }, uFlashCol: { value: new THREE.Vector3(1.0, 0.96, 0.9) }
    },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uTime, uVig, uGrain, uCA, uFade, uBlock, uGridAmt, uFlash; uniform vec2 uRes;
      uniform vec3 uFlashCol;
      varying vec2 vUv;
      float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      void main(){
        // Game Boy pixels: a mosaic anchored at the screen centre (so it lines up with the LCD
        // at the moment we pass through it), with the LCD's dark gaps between pixels
        vec2 uv = vUv;
        float grid = 1.0;
        if (uBlock > 1.01) {
          vec2 c = (gl_FragCoord.xy - uRes * 0.5) / uBlock;
          vec2 cell = floor(c);
          uv = ((cell + 0.5) * uBlock + uRes * 0.5) / uRes;
          vec2 f = fract(c);
          grid = smoothstep(0.0, 0.16, f.x) * smoothstep(1.0, 0.84, f.x) * smoothstep(0.0, 0.16, f.y) * smoothstep(1.0, 0.84, f.y);
        }
        vec2 d = uv - 0.5;
        float r2 = dot(d, d);
        vec2 off = d * r2 * uCA * 4.0;
        vec3 col = vec3(texture2D(tDiffuse, uv - off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv + off).b);
        col *= mix(1.0, mix(0.72, 1.0, grid), uGridAmt);
        col *= 1.0 - uVig * smoothstep(0.05, 0.55, r2 * 1.7);
        float n = hash(floor(vUv * uRes) + fract(uTime * 7.3) * 113.0) - 0.5;
        col += n * uGrain * (1.0 - dot(col, vec3(0.3)) * 0.6);
        // the meteor's whiteout; once the frame is in pixels, the white clears block by block
        // (the game's pixel wipe) instead of fading
        float flash = uFlash;
        if (uBlock > 1.01) flash = step(hash(floor((gl_FragCoord.xy - uRes * 0.5) / uBlock) + 0.37), uFlash);
        col = mix(col, uFlashCol, flash);
        col = mix(col, vec3(0.0), uFade);
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  composer.addPass(grade);

  return {
    composer, bloom, grade, renderPass,
    setSize(w, h, pr) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
      grade.uniforms.uRes.value.set(w * pr, h * pr);
    },
    render(dt) { composer.render(dt); }
  };
}
