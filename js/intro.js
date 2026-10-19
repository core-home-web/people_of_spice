/* People of Spice — first-visit homepage intro. No dependencies.
   css/home.css draws a thin gold globe outline from first paint; this file runs the rest.
   Salt and spice grains swirl in and settle onto a turning dot-globe (the same Natural Earth
   land grid as the World of Spice page) while a 0–100 counter follows real loading (hero
   poster, hero film, fonts, globe data, window load). At 100 the logo lands, then we fly
   into the globe: grains burst past the camera and the globe's disc opens onto the hero.
   Tap / click / key / wheel skips. */
(() => {
  const html = document.documentElement;
  const root = document.querySelector("[data-intro]");
  if (!root || !html.classList.contains("pos-intro")) return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FORM_START = 700;  // ms after first paint: the outline is mostly drawn
  const MIN_FORM = 2600;   // the counter can't reach 100 sooner than this after FORM_START
  const FORCE_BY = 6500;   // if loading stalls, ease to 100 by this time
  const FLY = 1000;        // each grain's flight onto the globe
  const LOGO_HOLD = 850;   // 100 → logo lands, last grains settle
  const OPEN = 1000;       // flying into the globe
  const SKIP_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];
  const clamp = (v) => Math.min(1, Math.max(0, v));
  let raf = 0, done = false;

  // Time since the loader's first paint, read from its CSS fallback animation before we cancel it
  const fallback = root.getAnimations().find((a) => a.animationName === "intro-gone");
  const elapsed0 = fallback ? Number(fallback.currentTime) || 0 : performance.now();
  const t0 = performance.now() - elapsed0;
  const now = () => performance.now() - t0;

  const release = () => html.classList.remove("pos-intro-hold");
  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    SKIP_EVENTS.forEach((t) => removeEventListener(t, skip, true));
    release();
    html.classList.remove("pos-intro");
  };
  const skip = () => {
    if (done || root.classList.contains("is-skipping")) return;
    root.classList.add("is-skipping");
    release();
    setTimeout(finish, 260);
  };
  SKIP_EVENTS.forEach((t) => addEventListener(t, skip, { capture: true, passive: true }));
  root.addEventListener("animationend", (e) => { if (e.target === root) finish(); });

  // Reduced motion, or we arrived after the CSS fallback started fading: let CSS finish it
  if (reduceMotion || elapsed0 > 3600) {
    const fade = root.getAnimations()[0];
    fade ? fade.finished.then(finish, finish) : finish();
    return;
  }
  root.classList.add("is-live");
  setTimeout(finish, 9500); // hard stop; the head script also drops the classes at 10s

  /* ---- Real loading progress ---- */
  const signals = [];
  const track = (promise) => {
    const s = { done: false };
    signals.push(s);
    Promise.resolve(promise).then(() => (s.done = true), () => (s.done = true));
    return promise;
  };
  const hero = document.querySelector("[data-hero]");
  const film = hero?.querySelector("[data-hero-video]");
  if (film?.poster) {
    const img = new Image();
    img.src = film.poster;
    track(img.decode());
  }
  if (film) {
    track(new Promise((ok) => {
      // pos.js runs first: if it chose not to play the film, don't wait for it
      if (hero.classList.contains("is-paused") || film.readyState >= 3) return ok();
      film.addEventListener("canplay", ok, { once: true });
      film.addEventListener("error", ok, { once: true });
    }));
  }
  track(document.fonts?.ready);
  track(document.readyState === "complete" ? null : new Promise((ok) => addEventListener("load", ok, { once: true })));
  const dotsReady = track(window.POS_DOTS ? Promise.resolve() : new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = "data/globe-dots.js";
    s.onload = ok;
    s.onerror = fail;
    document.head.append(s);
  }));
  const real = () => signals.filter((s) => s.done).length / signals.length;

  /* ---- Stage ---- */
  const num = root.querySelector("[data-intro-count]");
  const words = [...root.querySelectorAll(".intro__word")];
  const globeEl = root.querySelector("[data-intro-globe]");
  const canvas = root.querySelector("[data-intro-grains]");
  const ctx = canvas.getContext("2d");
  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 2 || innerWidth < 600;
  let VW = 0, VH = 0, cx = 0, cy = 0, R = 0, g = 2;
  const measure = () => {
    VW = innerWidth; VH = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, lowEnd ? 1.5 : 1.75);
    canvas.width = Math.round(VW * dpr);
    canvas.height = Math.round(VH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const b = globeEl.getBoundingClientRect();
    cx = b.left + b.width / 2; cy = b.top + b.height / 2; R = b.width / 2;
    g = Math.max(1.4, R / 95);
  };
  measure();
  addEventListener("resize", () => { if (!opening) measure(); });

  /* ---- Grains: land (spice) from the globe dot-grid, plus a dusting of salt over the sphere ---- */
  const SPICE = ["#c2462b", "#cc6c24", "#d6b26a", "#8a3b5e", "#7a5aa0", "#2f6b3a", "#e09a3a"];
  const SALT = SPICE.length; // colour index for salt
  const COLOURS = [...SPICE, "#efe6d6"];
  const LEVELS = [.07, .35, .65, .95];
  let N = 0, lon, cosLat, sinLat, colour, thr, sr, sa, swirl, launched;
  const build = () => {
    let land = [];
    try {
      const bin = atob(window.POS_DOTS);
      const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
      const pairs = new Int16Array(bytes.buffer);
      const step = lowEnd ? 2 : 1;
      for (let i = 0; i < pairs.length; i += 2 * step) land.push(pairs[i] / 10, pairs[i + 1] / 10);
    } catch { land = []; }
    const salt = land.length ? (lowEnd ? 500 : 1100) : 1800;
    N = land.length / 2 + salt;
    lon = new Float32Array(N); cosLat = new Float32Array(N); sinLat = new Float32Array(N);
    colour = new Uint8Array(N); thr = new Float32Array(N); sr = new Float32Array(N); sa = new Float32Array(N);
    swirl = new Float32Array(N); launched = new Float32Array(N).fill(-1);
    const rad = Math.PI / 180;
    for (let i = 0; i < N; i++) {
      const isLand = i < land.length / 2;
      const la = isLand ? land[i * 2 + 1] * rad : Math.asin(2 * Math.random() - 1);
      lon[i] = isLand ? land[i * 2] * rad : Math.random() * Math.PI * 2;
      cosLat[i] = Math.cos(la); sinLat[i] = Math.sin(la);
      colour[i] = isLand ? (Math.random() * SPICE.length) | 0 : SALT;
      thr[i] = isLand ? .1 + Math.random() * .86 : Math.random() * .55; // salt sketches the sphere first
      sr[i] = 1.25 + Math.random() * 1.9;
      sa[i] = Math.random() * Math.PI * 2;
      swirl[i] = (Math.random() - .5) * .9;
    }
  };
  dotsReady.then(build, build);

  /* ---- Loop ---- */
  const TILT = 20 * Math.PI / 180, cosT = Math.cos(TILT), sinT = Math.sin(TILT);
  let shown = 0, full = 0, word = -1, opening = 0, last = now();
  const frame = () => {
    const t = now(), dt = Math.min(.05, (t - last) / 1000);
    last = t;

    // The target never outruns the minimum formation time, never goes backwards, and is forced home by FORCE_BY
    const pace = clamp((t - FORM_START) / MIN_FORM);
    const force = clamp((t - FORM_START - MIN_FORM) / (FORCE_BY - FORM_START - MIN_FORM));
    const target = Math.min(pace, Math.max(real(), force));
    shown += Math.max(0, target - shown) * (1 - Math.exp(-dt * 10));
    if (target === 1 && 1 - shown < .004) shown = 1;
    num.textContent = Math.floor(shown * 100);

    if (t >= FORM_START) {
      const w = Math.min(words.length - 1, Math.floor(shown * words.length));
      if (w !== word) {
        words.forEach((el, i) => { el.classList.toggle("is-on", i === w); el.classList.toggle("is-past", i < w); });
        word = w;
      }
    }

    // Flying into the globe: everything scales past the camera together with the disc
    const u = opening ? clamp((t - opening) / OPEN) : 0;
    const zoom = 1 + (Math.hypot(VW, VH) / Math.max(R, 1) * 1.25 - 1) * Math.pow(u, 2.4);
    const fade = Math.pow(1 - u, 1.4);
    if (opening) globeEl.style.transform = `scale(${zoom})`;

    ctx.clearRect(0, 0, VW, VH);
    if (N) {
      const rot = -0.6 + t * .00021;
      const buckets = Array.from({ length: COLOURS.length * LEVELS.length }, () => new Path2D());
      for (let i = 0; i < N; i++) {
        if (launched[i] < 0) {
          if (shown < thr[i]) continue;
          launched[i] = t;
        }
        const dl = lon[i] + rot, cl = Math.cos(dl);
        const depth = sinT * sinLat[i] + cosT * cosLat[i] * cl;
        const isSalt = colour[i] === SALT;
        let x = cx + R * cosLat[i] * Math.sin(dl);
        let y = cy - R * (cosT * sinLat[i] - sinT * cosLat[i] * cl);
        let a = depth > 0 ? .3 + .7 * depth : isSalt ? 0 : .07;
        if (isSalt) a *= .55;
        const f = clamp((t - launched[i]) / FLY);
        if (f < 1) { // in flight: curve in from the dust around the globe
          const e = 1 - Math.pow(1 - f, 3);
          const sx = cx + R * sr[i] * Math.cos(sa[i]), sy = cy + R * sr[i] * Math.sin(sa[i]);
          const dx = x - sx, dy = y - sy, bend = swirl[i] * Math.sin(Math.PI * e);
          x = sx + dx * e - dy * bend;
          y = sy + dy * e + dx * bend;
          a = Math.max(a, .55) * Math.min(1, f * 4);
        }
        if (opening) {
          x = cx + (x - cx) * zoom;
          y = cy + (y - cy) * zoom;
          a *= fade;
        }
        if (a < .03 || x < -4 || y < -4 || x > VW + 4 || y > VH + 4) continue;
        const level = a < .2 ? 0 : a < .5 ? 1 : a < .8 ? 2 : 3;
        const s = (isSalt ? g * .75 : g) * (opening ? Math.min(zoom, 4) : 1);
        buckets[colour[i] * LEVELS.length + level].rect(x - s / 2, y - s / 2, s, s);
      }
      buckets.forEach((path, b) => {
        ctx.globalAlpha = LEVELS[b % LEVELS.length];
        ctx.fillStyle = COLOURS[(b / LEVELS.length) | 0];
        ctx.fill(path);
      });
      ctx.globalAlpha = 1;
    }

    if (shown === 1 && !full) {
      full = t;
      root.classList.add("is-full");
    }
    if (full && !opening && t - full >= LOGO_HOLD) {
      opening = t;
      root.classList.add("is-opening");
      release(); // hero text rises as we arrive
    }
    if (opening && u >= 1) return finish();
    if (!done) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
})();
