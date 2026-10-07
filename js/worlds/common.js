/* Shared bits for the worlds inside the Game Boy. */
import * as THREE from "three";

export const NOISE = /* glsl */`
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1,0)), u.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.02 + 17.3; a *= 0.5; } return s; }
// distance to the nearest Voronoi edge, and the cell id
vec3 voronoi(vec2 x){
  vec2 n = floor(x), f = fract(x), mg, mr; float md = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j)); vec2 o = hash22(n + g); vec2 r = g + o - f; float d = dot(r, r);
    if (d < md) { md = d; mr = r; mg = g; }
  }
  md = 8.0;
  for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
    vec2 g = mg + vec2(float(i), float(j)); vec2 o = hash22(n + g); vec2 r = g + o - f;
    if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
  }
  return vec3(md, n + mg);
}`;

/* A ShaderMaterial that takes scene fog. */
export function fogShader(opts) {
  return new THREE.ShaderMaterial({
    ...opts,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...opts.uniforms },
    fog: true
  });
}

/* Fullscreen-cover FOV: what the camera's vertical FOV must be so that its view matches the LCD
   render (aspect 10:9, vertical FOV `lcdFov`) once the LCD covers the viewport. */
export const LCD_ASPECT = 320 / 288;
export function coverFov(lcdFov, aspect) {
  if (aspect < LCD_ASPECT) return lcdFov;
  const t = Math.tan(THREE.MathUtils.degToRad(lcdFov) / 2) * LCD_ASPECT / aspect;
  return THREE.MathUtils.radToDeg(Math.atan(t) * 2);
}
