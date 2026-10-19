/* People of Spice — first-visit homepage intro. No dependencies.
   css/home.css runs the timeline from first paint; this file pours spice grains into
   the arch in step with it, lets any tap / click / key skip, and tidies up after. */
(() => {
  const html = document.documentElement;
  const root = document.querySelector("[data-intro]");
  if (!root || !html.classList.contains("pos-intro")) return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const OPEN = 1950; // ms on the CSS clock when the window opens (see .intro__window)
  const POUR = [250, 1200]; // ms window in which grains fall
  const SKIP_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"];
  let raf = 0, done = false;

  // The CSS clock: the root's intro-gone animation starts with the loader's first paint
  const clock = root.getAnimations().find((a) => a.animationName === "intro-gone");
  const now = () => (clock ? Number(clock.currentTime) || 0 : performance.now());

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
  setTimeout(release, Math.max(0, OPEN - now())); // hero text rises as the window opens
  setTimeout(finish, 3000); // hard stop; the head script also drops the classes at 4s

  if (reduceMotion) return;

  /* ---- Spice grains: a light particle stream that settles into a mound ---- */
  const canvas = root.querySelector("[data-intro-grains]");
  const ctx = canvas?.getContext("2d");
  if (!ctx || now() > POUR[1] - 300) return; // arrived too late to pour; the rest still plays

  const box = canvas.getBoundingClientRect();
  const W = box.width, H = box.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.scale(dpr, dpr);
  const pile = document.createElement("canvas");
  pile.width = canvas.width;
  pile.height = canvas.height;
  const pctx = pile.getContext("2d");
  pctx.scale(dpr, dpr);

  const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || (navigator.deviceMemory || 4) <= 2 || innerWidth < 600;
  const MAX = lowEnd ? 420 : 760;
  const PIGMENTS = ["#c2462b", "#cc6c24", "#7a5aa0", "#8a3b5e", "#2f6b3a", "#e09a3a"];
  const g = Math.max(1.9, W / 100); // grain size, CSS px
  const x0 = W * .05, base = H * .992, cols = Math.floor((W * .9) / g);
  const heights = new Uint16Array(cols);
  const STACK = g * .78;
  const falling = [];
  let spawned = 0, last = now();

  const settle = (x, colour) => {
    let c = Math.min(cols - 1, Math.max(0, Math.round((x - x0) / g)));
    // slide down the slope until the pile is stable (angle of repose ~ two grains per column)
    for (let guard = 0; guard < cols; guard++) {
      const l = c > 0 ? heights[c - 1] : Infinity, r = c < cols - 1 ? heights[c + 1] : Infinity;
      const low = Math.min(l, r);
      if (heights[c] - low < 2) break;
      c = l === r ? c + (Math.random() < .5 ? -1 : 1) : l < r ? c - 1 : c + 1;
    }
    heights[c]++;
    pctx.fillStyle = colour;
    pctx.fillRect(x0 + c * g + (Math.random() - .5) * g * .6, base - heights[c] * STACK, g, g);
  };

  const frame = () => {
    const t = now(), dt = Math.min(.05, (t - last) / 1000);
    last = t;
    if (t >= POUR[0] && t <= POUR[1]) {
      const due = Math.min(MAX, Math.round(((t - POUR[0]) / (POUR[1] - POUR[0])) * MAX));
      for (; spawned < due; spawned++) {
        falling.push({
          x: W / 2 + (Math.random() - .5) * W * .07, y: H * .05,
          vx: (Math.random() - .5) * W * .12, vy: H * (.1 + Math.random() * .25),
          c: PIGMENTS[(Math.random() * PIGMENTS.length) | 0],
        });
      }
    }
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(pile, 0, 0, W, H);
    for (let i = falling.length - 1; i >= 0; i--) {
      const p = falling[i];
      p.vy += H * 4.2 * dt;
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
    if (!done && t < OPEN + 300) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
})();
