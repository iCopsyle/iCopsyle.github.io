/* All sound is synthesised: desert wind, the boot "ding", and button blips. Off until asked. */

export function createAudio() {
  let ctx = null, master = null, windGain = null, windFilter = null, lfo = null, on = false;

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // wind: brown-ish noise through a wandering band-pass
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass"; windFilter.frequency.value = 420; windFilter.Q.value = 0.7;
    windGain = ctx.createGain(); windGain.gain.value = 0.55;
    lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 260;
    lfo.connect(lfoAmt); lfoAmt.connect(windFilter.frequency);
    const gust = ctx.createOscillator(); gust.frequency.value = 0.13;
    const gustAmt = ctx.createGain(); gustAmt.gain.value = 0.22;
    gust.connect(gustAmt); gustAmt.connect(windGain.gain);
    src.connect(windFilter); windFilter.connect(windGain); windGain.connect(master);
    src.start(); lfo.start(); gust.start();
  }

  function tone(freq, start, dur, vol = 0.12, type = "square") {
    if (!ctx || !on) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(master);
    o.start(start); o.stop(start + dur + 0.02);
  }

  return {
    get on() { return on; },
    toggle() {
      if (!ctx) init();
      on = !on;
      if (ctx.state === "suspended") ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(on ? 0.9 : 0, ctx.currentTime + 0.6);
      return on;
    },
    /* wind softens as night falls */
    setNight(k) {
      if (!ctx) return;
      windGain.gain.setTargetAtTime(0.55 - k * 0.38, ctx.currentTime, 0.4);
      windFilter.Q.setTargetAtTime(0.7 + k * 0.8, ctx.currentTime, 0.4);
    },
    ding() {
      if (!ctx || !on) return;
      const t = ctx.currentTime + 0.02;
      tone(1046.5, t, 0.09, 0.09);
      tone(2093, t + 0.075, 0.9, 0.08);
    },
    blip(f = 880) {
      if (!ctx || !on) return;
      tone(f, ctx.currentTime + 0.005, 0.07, 0.06);
    },
    swap() {
      if (!ctx || !on) return;
      const t = ctx.currentTime + 0.005;
      tone(660, t, 0.05, 0.05); tone(990, t + 0.05, 0.08, 0.05);
    }
  };
}
