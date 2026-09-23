/* Omar Alabdan — V3. One scroll loop drives every scroll-linked effect by writing
   CSS custom properties; everything else is event-driven. No framework. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ITCH = slug => `https://icopsyle.itch.io/${slug}`;

  const FEATURED = ["hourzero", "insert-game-name-here", "ticking-grains"];
  const GLOW = { "hourzero": "#ff4b1f", "insert-game-name-here": "#ea93b6", "ticking-grains": "#f2b134" };
  const GALLERY = { "hourzero": 4, "insert-game-name-here": 2, "ticking-grains": 4 };
  const byslug = Object.fromEntries(window.GAMES.map(g => [g.slug, g]));
  const featured = FEATURED.map(s => byslug[s]);
  const others = window.GAMES.filter(g => !FEATURED.includes(g.slug));
  const PIXEL_THUMB = new Set(["memory", "many-doors-one-room", "clockracer"]);

  let lang = root.lang === "ar" ? "ar" : "en";
  const T = k => (window.I18N[lang] && window.I18N[lang][k]) || window.I18N.en[k] || k;
  const W = s => (lang === "ar" && window.WORDS_AR[s]) || s;
  const gameText = (g, field) => (lang === "ar" && window.GAMES_AR[g.slug] && window.GAMES_AR[g.slug][field]) || g[field];

  const ICON = {
    ne: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>',
    mouse: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 3v7"/><path class="l" d="M11.2 3.1A5.9 5.9 0 0 0 6.1 9v1H11.2z"/></svg>'
  };

  /* ================= split text ================= */
  function split(el) {
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    let i = 0;
    const words = text.split(/\s+/);
    el.innerHTML = words.map(w => {
      if (lang === "ar") return `<span class="w" aria-hidden="true"><span class="c"><span style="--i:${i++}">${esc(w)}</span></span></span>`;
      return `<span class="w" aria-hidden="true">${[...w].map(ch => `<span class="c"><span style="--i:${i++}">${esc(ch)}</span></span>`).join("")}</span>`;
    }).join(" ");
  }

  /* ================= static strings ================= */
  function applyStrings() {
    document.title = T("meta.title");
    $$("[data-i18n]").forEach(el => { el.textContent = T(el.dataset.i18n); });
    $$("[data-i18n-aria]").forEach(el => el.setAttribute("aria-label", T(el.dataset.i18nAria)));
    $$("[data-split]").forEach(split);
  }

  /* ================= featured: character-select row ================= */
  function keyCaps(k) { return `<span class="kgrp" dir="ltr">${keyCapsInner(k)}</span>`; }   // a physical key cluster reads left-to-right in both languages
  function keyCapsInner(k) {
    if (k === "LMB") return `<span class="kc" title="Left mouse button">${ICON.mouse}</span>`;
    if (k === "WASD") return [..."WASD"].map(c => `<span class="kc">${c}</span>`).join("");
    return k.split(" ").map(c => `<span class="kc">${esc(c)}</span>`).join("");
  }
  let activePick = 0, scrubbing = null;
  const stacked = () => innerWidth <= 860;
  function buildPicks() {
    $("#select").innerHTML = featured.map((g, n) => {
      const count = GALLERY[g.slug];
      const imgs = Array.from({ length: count }, (_, i) =>
        `<img src="assets/img/${g.slug}-${i + 1}.jpg" alt="${i ? "" : esc(g.title) + " screenshot"}" width="1280" height="720" loading="lazy" decoding="async"${i ? "" : ' class="is-on"'}>`).join("");
      const meta = [
        [T("meta.year"), g.year], [T("meta.genre"), W(g.genre)], [T("meta.platform"), W(g.platform)],
        g.rating && [T("meta.rating"), `${g.rating[0].toFixed(1)} / 5`]
      ].filter(Boolean);
      return `<article class="pick${n === activePick ? " is-active" : ""}" data-n="${n}" style="--g:${GLOW[g.slug]}">
        <div class="pick-media">${imgs}</div>
        <div class="pick-glow"></div><div class="pick-shade"></div>
        <div class="pick-scrub" aria-hidden="true">${Array.from({ length: count }, (_, i) => `<i${i ? "" : ' class="is-on"'}></i>`).join("")}</div>
        <span class="pick-hint" aria-hidden="true">${esc(T(stacked() ? "feat.tap" : "feat.scrub"))}</span>
        <div class="pick-content">
          <p class="pick-no">0${n + 1}</p>
          <h3 class="pick-title"><button type="button" class="pick-btn" aria-expanded="${n === activePick}">${esc(g.title)}</button></h3>
          <div class="pick-more"><div>
            <p class="pick-tag">${esc(gameText(g, "tagline"))}</p>
            <p class="pick-blurb">${esc(gameText(g, "blurb"))}</p>
            <dl class="pick-meta">${meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
            <ul class="keys" aria-label="${esc(T("feat.controls"))}">${g.controls.map(([k, what]) => `<li>${keyCaps(k)}<span>${esc(W(what))}</span></li>`).join("")}</ul>
            <a class="btn btn-sky" href="${ITCH(g.slug)}" target="_blank" rel="noopener" data-magnetic><span>${esc(T("feat.playOn"))}</span>${ICON.ne}</a>
          </div></div>
        </div>
      </article>`;
    }).join("");
  }
  function setShot(pick, k) {
    const imgs = $$(".pick-media img", pick), bars = $$(".pick-scrub i", pick);
    k = (k + imgs.length) % imgs.length;
    if ((pick._k ?? 0) === k) return;
    pick._k = k;
    imgs.forEach((im, i) => im.classList.toggle("is-on", i === k));
    bars.forEach((b, i) => b.classList.toggle("is-on", i === k));
  }
  function activate(n) {
    if (stacked() || n === activePick) return;
    activePick = n;
    $$(".pick").forEach((p, i) => { p.classList.toggle("is-active", i === n); $(".pick-btn", p).setAttribute("aria-expanded", i === n); });
  }
  const sel = $("#select");
  sel.addEventListener("pointerover", e => { const p = e.target.closest(".pick"); if (p && finePointer) activate(+p.dataset.n); });
  sel.addEventListener("focusin", e => { const p = e.target.closest(".pick"); if (p) activate(+p.dataset.n); });
  sel.addEventListener("click", e => {
    const p = e.target.closest(".pick");
    if (!p) return;
    if (e.target.closest(".pick-btn")) activate(+p.dataset.n);
    else if (e.target.closest(".pick-media") && (stacked() || !finePointer)) setShot(p, (p._k ?? 0) + 1);   // tap to flip on touch
  });
  // sliding the pointer across the open panel flips through its screenshots
  sel.addEventListener("pointermove", e => {
    const p = e.target.closest(".pick.is-active");
    if (!p || stacked() || !finePointer) { scrubbing = null; return; }
    scrubbing = p;
    const r = p.getBoundingClientRect();
    let f = clamp((e.clientX - r.left) / r.width, 0, .999);
    if (lang === "ar") f = .999 - f;
    setShot(p, Math.floor(f * $$(".pick-media img", p).length));
  });
  sel.addEventListener("pointerleave", () => (scrubbing = null));
  // left alone, the open panel (every card on phones) flips on its own
  setInterval(() => {
    if (document.hidden || reduced) return;
    const r = sel.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    $$(".pick").forEach(p => { if ((stacked() || p.classList.contains("is-active")) && p !== scrubbing) setShot(p, (p._k ?? 0) + 1); });
  }, 2800);
  const selObs = new IntersectionObserver(es => { if (es[0].isIntersecting) { sel.classList.add("is-in"); selObs.disconnect(); } }, { threshold: .12 });
  selObs.observe(sel);

  /* ================= projects ================= */
  function buildProjects() {
    const rows = others.map(g => ({ g, off: false })).concat(window.OFF_DIAL.map(g => ({ g, off: true })));
    $("#projList").innerHTML = rows.map(({ g, off }) => {
      const year = off ? "—" : g.approx ? "~" + g.year : g.year;
      const thumb = off && !g.cover ? "" : `assets/img/thumb-${g.slug}.jpg`;
      const status = "";
      const line = !off ? gameText(g, "tagline") : !g.cover ? T("proj.noArt") : g.note === "In development" ? T("status.dev") : T("status.released");
      const title = lang === "ar" && g.titleAr ? g.titleAr : g.title;
      const genre = off ? W(g.platform) : W(g.genre);
      return `<li><a class="row" href="${ITCH(g.slug)}" target="_blank" rel="noopener"
          data-thumb="${thumb}" data-title="${esc(title)}" data-pixel="${PIXEL_THUMB.has(g.slug) ? 1 : ""}">
        <span class="row-year">${year}</span>
        ${thumb ? `<img class="row-thumb${PIXEL_THUMB.has(g.slug) ? " pixel" : ""}" src="${thumb}" alt="" loading="lazy" decoding="async">` : `<span class="row-thumb" style="background:linear-gradient(135deg,var(--sky-deep),var(--sky))"></span>`}
        <span class="row-title">${esc(title)}${status}<span class="row-sub">${esc(genre)} · ${year}</span></span>
        <span class="row-jam" dir="auto">${esc(line)}</span>
        <span class="row-genre">${esc(genre)}</span>
        <span class="row-go">${ICON.ne}</span>
      </a></li>`;
    }).join("");
    $("#cAll").textContent = rows.length;
    observeRows();
  }

  // floating preview with velocity lean
  const pv = $("#projPreview"), ppInner = $("#ppInner");
  const pvs = { x: 0, y: 0, tx: 0, ty: 0, on: false, cur: "" };
  $("#projList").addEventListener("pointermove", e => {
    pvs.tx = e.clientX; pvs.ty = e.clientY;
    const row = e.target.closest(".row");
    if (row && row.dataset.title !== pvs.cur) {
      pvs.cur = row.dataset.title;
      const el = row.dataset.thumb
        ? Object.assign(new Image(), { src: row.dataset.thumb, alt: "", className: row.dataset.pixel ? "pixel" : "" })
        : Object.assign(document.createElement("div"), { className: "pp-type", innerHTML: `${esc(row.dataset.title)}<small>${esc(T("proj.noArt"))}</small>` });
      ppInner.appendChild(el);
      while (ppInner.children.length > 2) ppInner.firstElementChild.remove();
      if (!pvs.on) { pvs.x = pvs.tx; pvs.y = pvs.ty; }
    }
    pvs.on = !!row;
    pv.classList.toggle("is-on", pvs.on);
  });
  $("#projList").addEventListener("pointerleave", () => { pvs.on = false; pvs.cur = ""; pv.classList.remove("is-on"); });

  /* ================= reveal on view ================= */
  const splitObs = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("is-in"); splitObs.unobserve(e.target); }
  }), { rootMargin: "0px 0px -12% 0px" });
  const rowObs = new IntersectionObserver(es => {
    let k = 0;
    es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      setTimeout(() => el.classList.add("is-in"), (k++) * 70);
      rowObs.unobserve(el);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  function observeSplits() { $$("[data-split]").forEach(el => { if (el.closest(".hero")) return; el.classList.contains("is-in") || splitObs.observe(el); }); }
  function observeRows() { $$(".row").forEach(r => rowObs.observe(r)); }

  /* ================= statement word-by-word ================= */
  let words = [];
  function buildStatement() {
    const el = $("#statement");
    const keys = lang === "ar" ? ["ميكانيكيات", "ممتعة", "وصقلٌ", "تُنشر"] : ["mechanics", "polish", "shipping"];
    el.innerHTML = T("about.statement").split(/\s+/).map(w =>
      `<span class="sw${keys.some(k => w.replace(/[.,:،]/g, "").startsWith(k) || w.includes(k)) ? " is-key" : ""}">${esc(w)}</span>`).join(" ");
    words = $$(".sw", el);
  }

  /* ================= hero reel ================= */
  const frames = $$("#reelFrames img");
  let cur = 0, reel = null, cycleStart = performance.now(), paused = false, pausedAt = 0;
  const CYCLE = 6500;
  function setNow(i, dirSign) {
    const prev = cur;
    cur = (i + featured.length) % featured.length;
    if (reel) reel.show(cur, dirSign * (lang === "ar" ? -1 : 1));
    frames.forEach((f, k) => f.classList.toggle("is-on", k === cur));
    const t = $("#nowTitle");
    if (prev !== cur || !t.textContent) {
      t.classList.remove("is-in"); t.classList.add("is-out");
      setTimeout(() => { t.textContent = featured[cur].title; t.classList.remove("is-out"); t.classList.add("is-in"); }, 330);
    }
    $("#nowPlay").href = ITCH(featured[cur].slug);
    cycleStart = performance.now();
  }
  $("#now").addEventListener("pointerenter", () => { paused = true; pausedAt = performance.now(); });
  $("#now").addEventListener("pointerleave", () => { paused = false; cycleStart += performance.now() - pausedAt; });

  function startReel() {
    const imgs = frames.map(f => f.decode ? f.decode().then(() => f).catch(() => f) : Promise.resolve(f));
    Promise.all(imgs).then(list => {
      if (reduced) return;
      reel = window.createReel && window.createReel($("#reelGL"), list);
      if (reel) { $("#reel").classList.add("gl"); reel.play(); }
    });
  }

  /* ================= smooth scroll ================= */
  let lenis = null;
  function scrollToEl(target) {
    const el = typeof target === "string" ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.5 });
    else el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-scroll-to]");
    if (!a) return;
    e.preventDefault();
    scrollToEl(a.getAttribute("href"));
  });

  /* ================= the scroll loop ================= */
  const hero = $("#top"), contactEl = $("#contact"), nav = $("#nav"), statement = $("#statement");
  let vh = innerHeight, lastY = scrollY, velocity = 0, navHidden = false;
  let pos = { st: [0, 0], contact: 0, secs: [] };
  const docTop = el => el.getBoundingClientRect().top + scrollY;

  function measure() {
    vh = innerHeight;
    pos = {
      st: [docTop(statement), statement.offsetHeight],
      contact: docTop(contactEl),
      secs: ["featured", "projects", "about", "contact"].map(id => { const el = document.getElementById(id); const t = docTop(el); return [id, t, t + el.offsetHeight]; })
    };
  }

  function onScroll(y) {
    velocity = y - lastY; lastY = y;

    // hero: shrink and fade as it leaves
    const hp = clamp(y / (vh * .9));
    hero.style.setProperty("--hp", hp.toFixed(4));
    if (reel) (hp < 1 ? reel.play() : reel.pause());

    // nav: solid after the top, hides going down, returns going up
    nav.classList.toggle("is-solid", y > 40);
    if (Math.abs(velocity) > 4 && y > vh * .6) {
      const hide = velocity > 0;
      if (hide !== navHidden) { navHidden = hide; nav.classList.toggle("is-hidden", hide); }
    } else if (y < vh * .6 && navHidden) { navHidden = false; nav.classList.remove("is-hidden"); }

    // statement lights up word by word
    const sTop = pos.st[0] - y;
    if (sTop < vh && sTop + pos.st[1] > 0) {
      const sp = clamp((vh * .85 - sTop) / (pos.st[1] + vh * .35));
      const lit = Math.round(sp * words.length);
      words.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
    }

    let current = null;
    for (const [id, t, b] of pos.secs) if (t - y < vh * .45 && b - y > vh * .45) current = id;
    if (current !== navCurrent) { navCurrent = current; setNavCurrent(current); }
  }

  let navCurrent;
  function setNavCurrent(id) {
    const links = $$(".nav-links a");
    const a = id && links.find(l => l.getAttribute("href") === "#" + id);
    links.forEach(l => l.classList.toggle("is-current", l === a));
    const pill = $("#navPill");
    if (!a) { pill.style.setProperty("--o", 0); return; }
    const pr = pill.parentElement.getBoundingClientRect(), r = a.getBoundingClientRect();
    pill.style.setProperty("--x", `${r.left - pr.left}px`);
    pill.style.setProperty("--w", `${r.width}px`);
    pill.style.setProperty("--o", 1);
  }

  /* ================= pointer: reel parallax + magnetic buttons ================= */
  const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  let magnet = null;
  addEventListener("pointermove", e => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    if (reel) reel.pointer(e.clientX / innerWidth, e.clientY / innerHeight);
    if (!finePointer || reduced) return;
    const m = e.target.closest && e.target.closest("[data-magnetic]");
    if (magnet && magnet !== m) { magnet.style.transform = ""; magnet = null; }
    if (m) {
      magnet = m;
      const r = m.getBoundingClientRect();
      m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
    }
  }, { passive: true });

  /* ================= per-frame animation ================= */
  function tick(now) {
    requestAnimationFrame(tick);
    if (lenis) lenis.raf(now);

    // project preview trails the pointer and leans with its speed
    if (pvs.on || Math.abs(pvs.tx - pvs.x) > .5) {
      const vx = pvs.tx - pvs.x;
      pvs.x += vx * .14; pvs.y += (pvs.ty - pvs.y) * .14;
      const side = lang === "ar" ? -420 : 40;
      pv.style.transform = `translate3d(${pvs.x + side}px, ${pvs.y - 120}px, 0) rotate(${clamp(vx * .06, -9, 9)}deg)`;
    }

    // hero reel auto-advance
    if (!paused && !document.hidden && !reduced && now - cycleStart >= CYCLE) setNow(cur + 1, 1);
  }

  /* ================= clouds ================= */
  function cloudSprite(rgb) {                                 // one soft cloud, drawn once per tint
    const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d");
    [[140, 150, 90], [230, 120, 110], [330, 145, 95], [260, 175, 100], [190, 175, 80], [390, 170, 70]].forEach(([x, y, r]) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${rgb},.85)`); gr.addColorStop(.6, `rgba(${rgb},.35)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    });
    return c;
  }
  function clouds(cv, opt) {
    const cx = cv.getContext("2d"), sprite = cloudSprite(opt.rgb);
    let w = 0, h = 0, on = !!opt.always, raf = 0, mx = 0, last = 0;
    const r = (a, b) => a + Math.random() * (b - a);
    const list = Array.from({ length: opt.count }, (_, i) => ({ x: Math.random() * 1.4, y: Math.random(), s: r(...opt.size), v: r(.004, .012), a: r(...opt.alpha), d: .3 + i / opt.count }));
    function paint(t) {
      cx.clearRect(0, 0, w, h);
      mx += ((pointer.x / innerWidth - .5) - mx) * .05;
      const sy = opt.scroll ? scrollY * opt.scroll : 0;
      for (const c of list) {
        const cw = 512 * c.s * (w / 1400 + .4), ch = cw / 2, span = h + ch;
        const x = ((c.x + t * .001 * c.v * (reduced ? 0 : 1)) % 1.4) - .2;
        const y = (((c.y * span - sy * c.d) % span) + span) % span - ch / 2;
        cx.globalAlpha = c.a;
        cx.drawImage(sprite, x * w - mx * 50 * c.d, y - ch / 2, cw, ch);
      }
    }
    function draw(t) {
      raf = on ? requestAnimationFrame(draw) : 0;
      if (t - last < opt.frame) return;                        // clouds are slow; cap the frame rate
      last = t;
      paint(t);
    }
    function size() { w = cv.clientWidth; h = cv.clientHeight; cv.width = Math.round(w * opt.res); cv.height = Math.round(h * opt.res); cx.setTransform(opt.res, 0, 0, opt.res, 0, 0); paint(performance.now()); }
    size(); addEventListener("resize", size);
    const start = () => { if (!raf) raf = requestAnimationFrame(draw); };
    if (opt.always) start();
    else new IntersectionObserver(es => { on = es[0].isIntersecting; if (on) start(); }).observe(cv);
  }

  /* ================= copy email + clocks ================= */
  $("#copyMail").addEventListener("click", async () => {
    const b = $("#copyMail"), s = $("span", b);
    try { await navigator.clipboard.writeText("omar.abdan800@gmail.com"); s.textContent = T("contact.copied"); }
    catch { getSelection().selectAllChildren($(".mail")); }
    b.classList.add("is-done");
    setTimeout(() => { s.textContent = T("contact.copy"); b.classList.remove("is-done"); }, 2200);
  });
  const pad = n => String(n).padStart(2, "0");
  const clock = () => { const d = new Date(); $("#footTime").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  clock(); setInterval(clock, 15000);

  /* ================= language ================= */
  function render() {
    applyStrings();
    if (root.classList.contains("is-ready")) $(".hero-name").classList.add("is-in");
    buildPicks();
    buildProjects();
    buildStatement();
    $("#nowTitle").textContent = featured[cur].title;
    observeSplits();
    navCurrent = undefined;
    measure();
    onScroll(scrollY);
  }
  function setLang(next) {
    if (next === lang) return;
    const swap = () => {
      lang = next;
      root.lang = next; root.dir = next === "ar" ? "rtl" : "ltr";
      try { localStorage.setItem("lang", next); } catch (e) {}
      render();
      $$("[data-split]").forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add("is-in"); });
    };
    if (reduced) return swap();
    const wipe = $("#wipe");
    wipe.classList.remove("is-leave"); wipe.offsetWidth; wipe.classList.add("is-cover");
    setTimeout(() => {
      swap();
      requestAnimationFrame(() => { wipe.classList.remove("is-cover"); wipe.classList.add("is-leave"); });
      setTimeout(() => wipe.classList.remove("is-leave"), 650);
    }, 520);
  }
  $("#langBtn").addEventListener("click", () => setLang(lang === "ar" ? "en" : "ar"));

  /* ================= boot ================= */
  render();
  setNow(0, 1);
  if (window.Lenis && !reduced) {
    lenis = new window.Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    lenis.on("scroll", ({ scroll }) => onScroll(scroll));
  } else addEventListener("scroll", () => onScroll(scrollY), { passive: true });
  addEventListener("resize", () => { measure(); onScroll(scrollY); });
  if (document.fonts) document.fonts.ready.then(() => { measure(); onScroll(scrollY); });
  addEventListener("load", measure);
  requestAnimationFrame(tick);
  clouds($("#sky"), { rgb: "142,205,247", alpha: [.05, .13], count: 11, size: [.9, 2.3], res: .5, frame: 33, scroll: .12, always: true });
  clouds($("#clouds"), { rgb: "201,232,255", alpha: [.10, .30], count: 9, size: [.7, 1.9], res: Math.min(devicePixelRatio || 1, 1.25), frame: 16 });

  // intro: the reel opens from a framed window, then the name rises
  const heroName = $(".hero-name");
  const reveal = () => { root.classList.add("is-ready"); setTimeout(() => heroName.classList.add("is-in"), root.classList.contains("is-intro") ? 450 : 50); };
  if (root.classList.contains("is-intro") && !reduced) {
    Promise.race([frames[0].decode ? frames[0].decode().catch(() => {}) : Promise.resolve(), new Promise(r => setTimeout(r, 1200))])
      .then(() => requestAnimationFrame(reveal));
    try { sessionStorage.setItem("seen", "1"); } catch (e) {}
  } else reveal();
  startReel();
})();
