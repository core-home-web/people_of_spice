/* People of Spice — first-visit homepage intro. No dependencies.
   css/home.css draws the arch from first paint; this file runs the rest: a 0–100 counter
   that follows real loading (hero poster, hero film, fonts, window load), spice grains
   that pour in step with it and settle into a mound that is full at 100, flavour words
   that track it, then the logo and the arch opening. Tap / click / key / wheel skips. */
(() => {
  const html = document.documentElement;
  const root = document.querySelector("[data-intro]");
  if (!root || !html.classList.contains("pos-intro")) return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const POUR_START = 800;   // ms after first paint: the arch is nearly drawn
  const MIN_POUR = 2400;    // the counter can't reach 100 sooner than this after POUR_START
  const FORCE_BY = 6500;    // if loading stalls, ease to 100 by this time
  const LOGO_HOLD = 650;    // 100 → logo lands, mound finishes settling
  const OPEN = 900;         // the arch opening (matches .intro.is-opening in css/home.css)
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

  // Reduced motion: the CSS still frame fades out by itself. Arrived after the CSS
  // fallback already started fading: let it finish.
  if (reduceMotion || elapsed0 > 3600) {
    const fade = root.getAnimations()[0];
    fade ? fade.finished.then(finish, finish) : finish();
    return;
  }
  root.classList.add("is-live");
  setTimeout(finish, 9000); // hard stop; the head script also drops the classes at 10s

  /* ---- Real loading progress ---- */
  const signals = [];
  const track = (promise) => {
    const s = { done: false };
    signals.push(s);
    Promise.resolve(promise).then(() => (s.done = true), () => (s.done = true));
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
  const real = () => signals.filter((s) => s.done).length / signals.length;

  /* ---- Counter, words, grains ---- */
  const num = root.querySelector("[data-intro-count]");
  const words = [...root.querySelectorAll(".intro__word")];
  const canvas = root.querySelector("[data-intro-grains]");
  const ctx = canvas?.getContext("2d");

  let W = 0, H = 0, pile = null, pctx = null;
  if (ctx) {
    const box = canvas.getBoundingClientRect();
    W = box.width; H = box.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.scale(dpr, dpr);
    pile = document.createElement("canvas");
    pile.width = canvas.width;
    pile.height = canvas.height;
    pctx = pile.getContext("2d");
    pctx.scale(dpr, dpr);
  }
  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 2 || innerWidth < 600;
  const MAX = lowEnd ? 600 : 1100;
  const PIGMENTS = ["#c2462b", "#cc6c24", "#7a5aa0", "#8a3b5e", "#2f6b3a", "#e09a3a"];
  const g = Math.max(1.9, W / 100); // grain size, CSS px
  const x0 = W * .05, base = H * .992, cols = Math.max(3, Math.floor((W * .9) / g));
  const heights = new Uint16Array(cols);
  const STACK = g * .78;
  const falling = [];
  let spawned = 0;

  const settle = (x, colour) => {
    let c = Math.min(cols - 1, Math.max(0, Math.round((x - x0) / g)));
    // slide down the slope until the pile is stable (angle of repose ~ two grains per column)
    for (let guard = 0; guard < cols; guard++) {
      const l = c > 0 ? heights[c - 1] : Infinity, r = c < cols - 1 ? heights[c + 1] : Infinity;
      if (heights[c] - Math.min(l, r) < 2) break;
      c = l === r ? c + (Math.random() < .5 ? -1 : 1) : l < r ? c - 1 : c + 1;
    }
    heights[c]++;
    pctx.fillStyle = colour;
    pctx.fillRect(x0 + c * g + (Math.random() - .5) * g * .6, base - heights[c] * STACK, g, g);
  };

  let shown = 0, full = 0, word = -1, last = now();
  const frame = () => {
    const t = now(), dt = Math.min(.05, (t - last) / 1000);
    last = t;

    // The target never outruns the minimum pour, never goes backwards, and is forced home by FORCE_BY
    const pace = clamp((t - POUR_START) / MIN_POUR);
    const force = clamp((t - POUR_START - MIN_POUR) / (FORCE_BY - POUR_START - MIN_POUR));
    const target = Math.min(pace, Math.max(real(), force));
    shown += Math.max(0, target - shown) * (1 - Math.exp(-dt * 10));
    if (target === 1 && 1 - shown < .004) shown = 1;
    num.textContent = Math.floor(shown * 100);

    if (t >= POUR_START) {
      const w = Math.min(words.length - 1, Math.floor(shown * words.length));
      if (w !== word) {
        words.forEach((el, i) => { el.classList.toggle("is-on", i === w); el.classList.toggle("is-past", i < w); });
        word = w;
      }
    }

    if (ctx) {
      for (const due = Math.round(shown * MAX); spawned < due; spawned++) {
        falling.push({
          x: W / 2 + (Math.random() - .5) * W * .035, y: H * .05,
          vx: (Math.random() - .5) * W * .05, vy: H * (.12 + Math.random() * .12),
          c: PIGMENTS[(Math.random() * PIGMENTS.length) | 0],
        });
      }
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(pile, 0, 0, W, H);
      for (let i = falling.length - 1; i >= 0; i--) {
        const p = falling[i];
        p.vy += H * 3.6 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const c = Math.min(cols - 1, Math.max(0, Math.round((p.x - x0) / g)));
        if (p.y >= base - heights[c] * STACK - g) {
          settle(p.x, p.c);
          falling.splice(i, 1);
          continue;
        }
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, g * .8, g * 1.5);
      }
    }

    if (shown === 1 && !full) {
      full = t;
      root.classList.add("is-full");
    }
    if (full && t - full >= LOGO_HOLD) {
      root.classList.add("is-opening");
      release(); // hero text rises as the window opens
      setTimeout(finish, OPEN + 100);
      return;
    }
    if (!done) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
})();
