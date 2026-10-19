/* People of Spice — "Meet the blends" spotlight. No dependencies.
   A dial of jars scrolls horizontally (swipe, trackpad, drag, arrow keys, buttons); the jar
   nearest the middle is "on stage": its still life, story, notes and links show above, and
   the section glows in its label colour. Clicking a jar centres it; clicking the centred
   jar opens its spice page. Without this script the first spice shows and every jar in the
   dial is a plain link to its page. */
(() => {
  const root = document.querySelector("[data-spot]");
  if (!root) return;
  const track = root.querySelector("[data-dial-track]");
  const items = [...root.querySelectorAll("[data-dial-item]")];
  const panels = [...root.querySelectorAll("[data-panel]")];
  const jars = [...root.querySelectorAll(".spot__jar")];
  const index = root.querySelector("[data-dial-index]");
  const live = root.querySelector("[data-spot-live]");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!track || !items.length) return;

  let active = 0, announce = 0;
  const activate = (i) => {
    if (i === active) return;
    [panels, jars].forEach((list) => {
      list[active]?.classList.remove("is-active");
      list[i]?.classList.add("is-active");
    });
    panels[active]?.setAttribute("aria-hidden", "true");
    panels[i]?.removeAttribute("aria-hidden");
    items[active].removeAttribute("aria-current");
    items[i].setAttribute("aria-current", "true");
    root.style.setProperty("--spot", items[i].style.getPropertyValue("--accent"));
    index.textContent = String(i + 1).padStart(2, "0");
    active = i;
    items.forEach((el, k) => (el.tabIndex = k === i ? 0 : -1)); // one tab stop; arrows move within the dial
    clearTimeout(announce); // tell screen readers once the dial settles, not on every jar it passes
    announce = setTimeout(() => {
      const p = panels[active];
      live.textContent = `${p.querySelector(".spot__name").textContent}, ${p.querySelector(".spot__tagline").textContent}`;
    }, 450);
  };

  const centreOf = (el) => el.offsetLeft + el.offsetWidth / 2;
  let gliding = null; // while we scroll to a jar, keep it on stage instead of every jar it passes
  const goTo = (i, smooth = true) => {
    const n = Math.max(0, Math.min(items.length - 1, i));
    clearTimeout(gliding);
    gliding = setTimeout(() => (gliding = null), smooth && !reduceMotion ? 700 : 50);
    track.scrollTo({ left: centreOf(items[n]) - track.clientWidth / 2, behavior: smooth && !reduceMotion ? "smooth" : "auto" });
    activate(n);
  };
  track.addEventListener("scrollend", () => { clearTimeout(gliding); gliding = null; shape(); });

  // Shape the dial into a shallow arc around the middle and pick the jar closest to it
  let queued = false;
  const shape = () => {
    queued = false;
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0, bestD = Infinity;
    items.forEach((el, i) => {
      const d = (centreOf(el) - mid) / el.offsetWidth;
      const a = Math.min(Math.abs(d), 4);
      el.style.transform = `translateY(${(a * a * 5).toFixed(1)}px) scale(${(1.12 - a * .12).toFixed(3)})`;
      el.style.opacity = (1 - a * .2).toFixed(2);
      if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
    });
    if (!gliding) activate(best);
  };
  track.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(shape); } }, { passive: true });

  // Mouse drag (touch and trackpads already scroll natively)
  let drag = null, dragged = false;
  track.addEventListener("dragstart", (e) => e.preventDefault());
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag = { x: e.clientX, left: track.scrollLeft };
    dragged = false;
  });
  addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!dragged && Math.abs(dx) > 4) { dragged = true; track.style.scrollSnapType = "none"; }
    if (dragged) track.scrollLeft = drag.left - dx;
  });
  addEventListener("pointerup", () => {
    if (!drag) return;
    drag = null;
    if (!dragged) return;
    track.style.scrollSnapType = "";
    goTo(active);
    setTimeout(() => (dragged = false), 0); // swallow the click that ends a drag
  });

  items.forEach((el, i) => {
    el.addEventListener("click", (e) => {
      if (dragged) return e.preventDefault(); // the end of a drag isn't a click
      if (i !== active) { e.preventDefault(); goTo(i); } // otherwise: the centred jar opens its page
    });
  });
  root.querySelectorAll("[data-dial-step]").forEach((btn) => btn.addEventListener("click", () => goTo(active + Number(btn.dataset.dialStep))));
  track.addEventListener("keydown", (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const n = Math.max(0, Math.min(items.length - 1, active + (Number.isFinite(step) ? step : step > 0 ? items.length : -items.length)));
    goTo(n);
    items[n].focus({ preventScroll: true });
  });


  // A gentle tilt of the jar under a fine pointer
  if (!reduceMotion && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const stage = root.querySelector("[data-spot-stage]");
    stage?.addEventListener("pointermove", (e) => {
      const b = stage.getBoundingClientRect();
      const x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
      const img = jars[active]?.querySelector("img");
      if (img) img.style.transform = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 8}deg) translateY(-6px)`;
    });
    stage?.addEventListener("pointerleave", () => jars.forEach((j) => { const img = j.querySelector("img"); if (img) img.style.transform = ""; }));
  }

  root.classList.add("is-ready");
  addEventListener("resize", () => goTo(active, false));
  items.forEach((el, k) => (el.tabIndex = k ? -1 : 0));
  goTo(0, false);
  shape();
})();
