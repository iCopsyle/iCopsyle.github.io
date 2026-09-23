/* Hero reel: one fullscreen quad, two textures, a noise-dissolve transition that
   sweeps in the reading direction with a sky-blue edge. Raw WebGL, no library.
   Returns null when WebGL or texture upload is unavailable (for example on file://,
   where browsers refuse local images as textures); the page then keeps its CSS crossfade. */
window.createReel = function (canvas, sources) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: "high-performance" });
  if (!gl) return null;

  const vs = `attribute vec2 p; varying vec2 v; void main(){ v = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
  const fs = `
precision highp float;
varying vec2 v;
uniform sampler2D t0, t1;
uniform vec2 res, img, mouse;
uniform float prog, time, dir, zoom;

float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for(int i = 0; i < 5; i++){ s += a * n(p); p *= 2.03; a *= .5; } return s; }

vec2 cover(vec2 uv){
  float rs = res.x / res.y, ri = img.x / img.y;
  vec2 sc = rs > ri ? vec2(1., ri / rs) : vec2(rs / ri, 1.);
  return (uv - .5) * sc + .5;
}
vec3 tex(sampler2D t, vec2 uv, float split){
  uv = clamp(uv, .001, .999);
  return vec3(texture2D(t, uv + vec2(split, 0.)).r, texture2D(t, uv).g, texture2D(t, uv - vec2(split, 0.)).b);
}
void main(){
  vec2 uv = v; uv.y = 1. - uv.y;
  vec2 par = (mouse - .5) * vec2(.022, .016);
  float z = 1. / (1. + zoom);
  vec2 base = (cover(uv) - .5) * z + .5 - par;

  float nz = fbm(uv * vec2(3.2, 2.4) + time * .05);
  float sweep = dir > 0. ? uv.x : 1. - uv.x;
  float m = sweep * .62 + nz * .38;
  float p = prog * 1.36 - .18;
  float mask = smoothstep(p - .07, p + .07, m);          // 1 = old frame still showing
  float active = sin(prog * 3.14159);
  vec2 warp = (vec2(nz, fbm(uv * 2.7 + 7.)) - .5) * .09 * active;
  float split = .0045 * active;

  vec3 a = tex(t0, base + warp * (1. - mask), split);
  vec3 b = tex(t1, base - warp * mask, split);
  vec3 col = mix(b, a, mask);

  float edge = smoothstep(.06, 0., abs(m - p)) * active;
  col += vec3(.56, .80, .97) * edge * 1.1;

  vec2 q = uv - .5; col *= 1. - dot(q, q) * .55;          // soft vignette
  col += (h(uv * res + time) - .5) * .025;                // grain, kills banding
  gl_FragColor = vec4(col, 1.);
}`;

  function sh(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const prog = gl.createProgram();
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ["t0", "t1", "res", "img", "mouse", "prog", "time", "dir", "zoom"].forEach(k => (U[k] = gl.getUniformLocation(prog, k)));
  gl.uniform1i(U.t0, 0);
  gl.uniform1i(U.t1, 1);

  const textures = [];
  function upload(img) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);   // throws SecurityError on file://
    return t;
  }
  try {
    sources.forEach(img => textures.push(upload(img)));
  } catch (e) {
    return null;
  }

  let from = 0, to = 0, t0 = 0, dur = 1500, running = false, raf = 0, dpr = Math.min(devicePixelRatio || 1, 1.6);
  const mouse = { x: .5, y: .5, tx: .5, ty: .5 };
  let direction = 1, zoom = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.res, canvas.width, canvas.height);
  }
  const ease = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  function frame(now) {
    raf = running ? requestAnimationFrame(frame) : 0;
    const p = t0 ? Math.min(1, (now - t0) / dur) : 1;
    if (p >= 1 && t0) { from = to; t0 = 0; }
    mouse.x += (mouse.tx - mouse.x) * .06; mouse.y += (mouse.ty - mouse.y) * .06;
    zoom += ((t0 ? .05 : 0) - zoom) * .04;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, textures[from]);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, textures[t0 ? to : from]);
    const im = sources[from];
    gl.uniform2f(U.img, im.naturalWidth || 1920, im.naturalHeight || 1080);
    gl.uniform2f(U.mouse, mouse.x, mouse.y);
    gl.uniform1f(U.prog, t0 ? ease(p) : 0);
    gl.uniform1f(U.time, now * .001);
    gl.uniform1f(U.dir, direction);
    gl.uniform1f(U.zoom, zoom);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize();
  addEventListener("resize", resize);
  return {
    show(i, dirSign) {
      if (i === to && t0) return;
      if (t0) from = to;                 // interrupting: settle on the frame we were heading to
      to = i; direction = dirSign || 1; t0 = performance.now();
    },
    pointer(x, y) { mouse.tx = x; mouse.ty = y; },
    play() { if (!running) { running = true; raf = requestAnimationFrame(frame); } },
    pause() { running = false; cancelAnimationFrame(raf); raf = 0; }
  };
};
