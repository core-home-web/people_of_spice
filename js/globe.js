/* World of Spice — dependency-free orthographic globe.
 * Land is a pre-baked dot grid (data/globe-dots.js); pins are real <button>s laid over the canvas.
 * Mobile: swipe the rail to fly between spices, tap the active card for the detail sheet.
 * Desktop: explorer list on the left, detail panel on the right, globe centred in between. */
(() => {
  const root = document.querySelector("[data-wos]");
  if (!root) return;

  const data = JSON.parse(document.getElementById("wos-data").textContent);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mqDesktop = matchMedia("(min-width: 1024px)");
  const mqLandscape = matchMedia("(orientation: landscape) and (max-height: 540px) and (max-width: 1023px)");
  const $ = (s) => root.querySelector(s);

  const stage = $("[data-stage]"), canvas = $("[data-canvas]"), ctx = canvas.getContext("2d");
  const pinsEl = $("[data-pins]"), rail = $("[data-rail]"), panel = $(".wos-panel"), intro = $(".wos-intro");
  const detail = $("[data-detail]"), detailBody = $("[data-detail-body]");
  const regionChip = $("[data-region-chip]"), header = document.querySelector("[data-header]");

  const RAD = Math.PI / 180;
  const HEAT = ["No heat", "Mild", "Warm", "Medium", "Hot", "Fiery"];
  const regions = Object.fromEntries(data.regions.map((r) => [r.id, r]));
  const collections = Object.fromEntries(data.collections.map((c) => [c.id, c]));
  const products = data.products;
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>',
    chile: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.4 7.1c2.1 1.6 2.3 4.7.7 7.4-2.3 3.8-7.6 7.3-13.3 7.5-.9 0-1.2-1-.4-1.5 4.7-3 6.6-5.8 7.9-9.8.8-2.5 2.9-4.6 5.1-3.6Z"/><path d="M16.8 7.2c.3-1.6 1.2-3 2.8-3.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    serves: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 13h16a8 8 0 0 1-16 0Z"/><path d="M12 5v3M8 6l1 2M16 6l-1 2"/></svg>',
    arrow: '<svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  };
  const heatHTML = (n, sm) => `<span class="heat${sm ? " heat--sm" : ""}" data-level="${n}" role="img" aria-label="Heat: ${HEAT[n]}"><span class="heat__chiles">${[1, 2, 3, 4, 5].map((i) => ICON.chile.replace("<svg", `<svg class="heat__chile${i <= n ? " is-on" : ""}"`)).join("")}</span><span class="heat__label">${HEAT[n]}</span></span>`;

  /* ---------------------------------------------------------------- state */
  const view = { lon: 20, lat: 24, zoom: 1 };
  const geo = { cx: 0, cy: 0, R: 0 }, geoTarget = { cx: 0, cy: 0, R0: 0 };
  let W = 0, H = 0, dpr = 1;
  let filter = { collection: "all", region: null };
  let list = products.slice();
  let active = null, isOpen = false;
  let spinning = !reduceMotion, lastInteract = performance.now();
  let flight = null, dragging = false;
  const vel = { lon: 0, lat: 0 };

  /* ---------------------------------------------------------------- dots */
  let dots = new Float32Array(0);
  function decodeDots() {
    if (!window.POS_DOTS) return;
    const bin = atob(window.POS_DOTS), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const a = new Int16Array(bytes.buffer), n = a.length / 2;
    dots = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const lon = (a[2 * i] / 10) * RAD, lat = (a[2 * i + 1] / 10) * RAD, cl = Math.cos(lat);
      dots[3 * i] = cl * Math.sin(lon); dots[3 * i + 1] = Math.sin(lat); dots[3 * i + 2] = cl * Math.cos(lon);
    }
  }
  const unit = (lon, lat) => { const cl = Math.cos(lat * RAD); return [cl * Math.sin(lon * RAD), Math.sin(lat * RAD), cl * Math.cos(lon * RAD)]; };

  /* Rotate a unit vector so (view.lon, view.lat) faces the viewer. Returns [x, y, z]; z > 0 is the near side. */
  let rot = { sl: 0, cl: 1, sp: 0, cp: 1 };
  const setRot = () => { rot = { sl: Math.sin(view.lon * RAD), cl: Math.cos(view.lon * RAD), sp: Math.sin(view.lat * RAD), cp: Math.cos(view.lat * RAD) }; };
  const project = (x, y, z) => {
    const x1 = x * rot.cl - z * rot.sl, z1 = x * rot.sl + z * rot.cl;
    return [x1, y * rot.cp - z1 * rot.sp, y * rot.sp + z1 * rot.cp];
  };

  /* ---------------------------------------------------------------- layout */
  const mode = () => (mqDesktop.matches ? "desktop" : mqLandscape.matches ? "landscape" : "mobile");
  function measure() {
    W = stage.clientWidth; H = stage.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const headerH = header ? header.offsetHeight : 64;
    let top = headerH, bottom = H, left = 0, right = W;
    const m = mode();
    if (m === "desktop") {
      left = panel.offsetLeft + panel.offsetWidth;
      right = isOpen ? detail.offsetLeft : W;
      top = root.classList.contains("has-explored") ? headerH + 8 : intro.offsetTop + intro.offsetHeight;
      bottom = H - 56;
    } else if (m === "landscape") {
      right = isOpen ? detail.offsetLeft : panel.offsetLeft;
      top = headerH * 0.6;
    } else {
      top = isOpen || root.classList.contains("has-explored") ? headerH : intro.offsetTop + intro.offsetHeight + 4;
      bottom = isOpen ? detail.offsetTop : panel.offsetTop + 24;
    }
    root.style.setProperty("--stage-right", `${Math.max(0, W - right)}px`);
    geoTarget.cx = (left + right) / 2; geoTarget.cy = (top + bottom) / 2;
    geoTarget.R0 = Math.max(60, Math.min(right - left, bottom - top) / 2 * (m === "mobile" ? 0.94 : 0.86));
    if (!geo.R) { geo.cx = geoTarget.cx; geo.cy = geoTarget.cy; geo.R = geoTarget.R0 * view.zoom; }
  }

  /* ---------------------------------------------------------------- pins */
  const pinEls = {};
  function buildPins() {
    for (const r of data.regions) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "pin"; b.dataset.region = r.id;
      b.style.setProperty("--delay", `${(Math.random() * 2.8).toFixed(2)}s`);
      b.innerHTML = `<span class="pin__dot"><span class="pin__inner"></span></span><span class="pin__count"></span><span class="pin__label">${esc(r.name)}</span>`;
      b.addEventListener("click", () => onPin(r.id));
      pinsEl.appendChild(b);
      pinEls[r.id] = { el: b, v: unit(r.lng, r.lat), x: 0, y: 0, z: 0, count: 0, members: [] };
    }
  }
  function regionCounts() {
    const c = {};
    for (const p of products) if (filter.collection === "all" || p.collection === filter.collection) c[p.region] = (c[p.region] || 0) + 1;
    return c;
  }
  let counts = {};
  function layoutPins() {
    const vis = [];
    for (const id in pinEls) {
      const pin = pinEls[id];
      const [x, y, z] = project(...pin.v);
      pin.x = geo.cx + x * geo.R; pin.y = geo.cy - y * geo.R; pin.z = z;
      pin.members = [];
      if (z > 0.04 && counts[id]) vis.push(pin);
      else pin.el.hidden = true;
    }
    // Greedy screen-space clustering so Europe doesn't become a pile of dots.
    const activeRegion = active && byId[active].region;
    vis.sort((a, b) => (b.el.dataset.region === activeRegion) - (a.el.dataset.region === activeRegion) || counts[b.el.dataset.region] - counts[a.el.dataset.region]);
    const anchors = [];
    const gap = mode() === "desktop" ? 38 : 36;
    for (const pin of vis) {
      const host = anchors.find((a) => a.el.dataset.region !== activeRegion && Math.hypot(a.x - pin.x, a.y - pin.y) < gap);
      if (host && pin.el.dataset.region !== activeRegion) { host.members.push(pin); pin.el.hidden = true; }
      else { anchors.push(pin); pin.members = [pin]; }
    }
    for (const pin of anchors) {
      const id = pin.el.dataset.region, el = pin.el;
      const cluster = pin.members.length > 1;
      const n = pin.members.reduce((s, m) => s + counts[m.el.dataset.region], 0);
      el.hidden = false;
      el.classList.toggle("is-cluster", cluster);
      el.classList.toggle("is-active", id === activeRegion && !cluster);
      el.classList.toggle("is-dim", !!filter.region && id !== filter.region);
      el.querySelector(".pin__count").textContent = !cluster && n > 1 ? n : "";
      el.querySelector(".pin__inner").textContent = cluster ? n : "";
      el.querySelector(".pin__label").textContent = cluster ? `${pin.members.length} regions` : regions[id].name;
      el.setAttribute("aria-label", cluster ? `${pin.members.length} regions, ${n} spices — zoom in` : `${regions[id].name}: ${counts[id]} spice${counts[id] > 1 ? "s" : ""}`);
      el.style.transform = `translate3d(${pin.x.toFixed(1)}px, ${pin.y.toFixed(1)}px, 0)`;
      el.style.opacity = Math.min(1, (pin.z - 0.04) / 0.18).toFixed(2);
      el.dataset.members = pin.members.map((m) => m.el.dataset.region).join(",");
    }
  }
  function onPin(id) {
    interact();
    const members = (pinEls[id].el.dataset.members || id).split(",");
    if (members.length > 1) {
      const vs = members.map((m) => regions[m]);
      const lat = vs.reduce((s, r) => s + r.lat, 0) / vs.length, lng = vs.reduce((s, r) => s + r.lng, 0) / vs.length;
      flyTo(lng, lat, Math.min(4, Math.max(view.zoom * 1.9, 2.2)));
      return;
    }
    selectRegion(id);
  }

  /* ---------------------------------------------------------------- drawing */
  function draw() {
    const { cx, cy, R } = geo;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // atmosphere
    let g = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.22);
    g.addColorStop(0, "rgba(214,178,106,0.22)"); g.addColorStop(0.4, "rgba(214,178,106,0.06)"); g.addColorStop(1, "rgba(214,178,106,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2); ctx.fill();
    // ocean
    g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, "#164a35"); g.addColorStop(0.6, "#0a2f20"); g.addColorStop(1, "#03190f");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // graticule
    ctx.strokeStyle = "rgba(248,221,175,0.07)"; ctx.lineWidth = 1; ctx.beginPath();
    const line = (pts) => {
      let pen = false;
      for (const [lon, lat] of pts) {
        const [x, y, z] = project(...unit(lon, lat));
        if (z > 0) { const px = cx + x * R, py = cy - y * R; pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py); pen = true; } else pen = false;
      }
    };
    for (let lon = -180; lon < 180; lon += 30) line(Array.from({ length: 61 }, (_, i) => [lon, -90 + i * 3]));
    for (let lat = -60; lat <= 60; lat += 30) line(Array.from({ length: 121 }, (_, i) => [-180 + i * 3, lat]));
    ctx.stroke();

    // land dots, bucketed by depth so we only change fillStyle a handful of times
    const base = Math.max(0.7, Math.min(2.1, R / 230));
    const act = active ? byId[active] : null;
    const glowV = act ? unit(regions[act.region].lng, regions[act.region].lat) : null;
    const glowCos = Math.cos(10 * RAD);
    const buckets = [[], [], [], []], glow = [];
    for (let i = 0; i < dots.length; i += 3) {
      const [x, y, z] = project(dots[i], dots[i + 1], dots[i + 2]);
      if (z <= 0.02) continue;
      const px = cx + x * R, py = cy - y * R;
      if (px < -4 || py < -4 || px > W + 4 || py > H + 4) continue;
      const s = base * (0.55 + 0.6 * z);
      if (glowV && dots[i] * glowV[0] + dots[i + 1] * glowV[1] + dots[i + 2] * glowV[2] > glowCos) glow.push(px, py, s * 1.25);
      else buckets[Math.min(3, (z * 4) | 0)].push(px, py, s);
    }
    const alphas = [0.22, 0.4, 0.6, 0.85];
    buckets.forEach((b, k) => {
      ctx.fillStyle = `rgba(248,221,175,${alphas[k]})`; ctx.beginPath();
      for (let i = 0; i < b.length; i += 3) { ctx.moveTo(b[i] + b[i + 2], b[i + 1]); ctx.arc(b[i], b[i + 1], b[i + 2], 0, Math.PI * 2); }
      ctx.fill();
    });
    if (glow.length) {
      ctx.fillStyle = act.color; ctx.shadowColor = act.color; ctx.shadowBlur = 8; ctx.beginPath();
      for (let i = 0; i < glow.length; i += 3) { ctx.moveTo(glow[i] + glow[i + 2], glow[i + 1]); ctx.arc(glow[i], glow[i + 1], glow[i + 2], 0, Math.PI * 2); }
      ctx.fill(); ctx.shadowBlur = 0;
    }

    // rim light
    g = ctx.createRadialGradient(cx, cy, R * 0.75, cx, cy, R);
    g.addColorStop(0, "rgba(0,26,13,0)"); g.addColorStop(1, "rgba(0,26,13,0.55)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(248,221,175,0.22)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  }

  /* ---------------------------------------------------------------- motion loop */
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const wrap = (d) => ((d + 540) % 360) - 180;
  function flyTo(lon, lat, zoom = view.zoom, dur = 1200) {
    if (reduceMotion) dur = 1;
    flight = { from: { ...view }, to: { lon: view.lon + wrap(lon - view.lon), lat: Math.max(-55, Math.min(70, lat)), zoom }, t0: performance.now(), dur };
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    if (flight) {
      const t = Math.min(1, (now - flight.t0) / flight.dur), e = ease(t);
      view.lon = flight.from.lon + (flight.to.lon - flight.from.lon) * e;
      view.lat = flight.from.lat + (flight.to.lat - flight.from.lat) * e;
      view.zoom = flight.from.zoom + (flight.to.zoom - flight.from.zoom) * e;
      if (t === 1) flight = null;
    } else if (!dragging) {
      if (Math.abs(vel.lon) + Math.abs(vel.lat) > 0.002) {
        view.lon += vel.lon * dt; view.lat = clampLat(view.lat + vel.lat * dt);
        vel.lon *= 0.94; vel.lat *= 0.94;
      } else if (spinning && !active && now - lastInteract > 2500) {
        view.lon += 0.0045 * dt;
      }
    }
    const k = reduceMotion ? 1 : 0.14;
    geo.cx += (geoTarget.cx - geo.cx) * k; geo.cy += (geoTarget.cy - geo.cy) * k;
    geo.R += (geoTarget.R0 * view.zoom - geo.R) * k;
    setRot(); draw(); layoutPins();
    requestAnimationFrame(frame);
  }
  const clampLat = (v) => Math.max(-55, Math.min(70, v));

  /* ---------------------------------------------------------------- gestures */
  const pointers = new Map();
  let pinch = null, moved = 0;
  const interact = () => { lastInteract = performance.now(); root.classList.add("has-interacted"); };
  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".pin")) return;
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    dragging = true; flight = null; moved = 0; vel.lon = vel.lat = 0;
    stage.classList.add("is-dragging"); interact();
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom }; }
  });
  stage.addEventListener("pointermove", (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const now = performance.now(), dx = e.clientX - p.x, dy = e.clientY - p.y, dt = Math.max(1, now - p.t);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: now });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      view.zoom = Math.max(0.8, Math.min(4, pinch.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)));
      return;
    }
    moved += Math.abs(dx) + Math.abs(dy);
    const f = 1 / (geo.R * RAD);
    view.lon -= dx * f; view.lat = clampLat(view.lat + dy * f);
    vel.lon = (-dx * f) / dt; vel.lat = (dy * f) / dt;
  });
  const end = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) { dragging = false; stage.classList.remove("is-dragging"); interact(); }
  };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  stage.addEventListener("wheel", (e) => {
    e.preventDefault(); interact(); flight = null;
    view.zoom = Math.max(0.8, Math.min(4, view.zoom * Math.exp(-e.deltaY * 0.0015)));
  }, { passive: false });

  root.querySelectorAll("[data-zoom]").forEach((b) => b.addEventListener("click", () => {
    interact(); flyTo(view.lon, view.lat, Math.max(0.8, Math.min(4, view.zoom * (b.dataset.zoom === "in" ? 1.5 : 1 / 1.5))), 500);
  }));
  const spinBtn = $("[data-spin]");
  spinBtn.setAttribute("aria-pressed", String(spinning));
  spinBtn.addEventListener("click", () => { spinning = !spinning; spinBtn.setAttribute("aria-pressed", String(spinning)); if (spinning) { active = null; lastInteract = 0; highlightRail(); } });

  /* ---------------------------------------------------------------- rail */
  const horizontalRail = () => getComputedStyle(rail).flexDirection === "row";
  function renderRail() {
    list = products.filter((p) => (filter.collection === "all" || p.collection === filter.collection) && (!filter.region || p.region === filter.region));
    rail.innerHTML = list.length ? list.map((p) => `
      <li><button class="wos-card" type="button" data-id="${p.id}" style="--accent:${p.color}" aria-label="${esc(p.name)} — ${esc(regions[p.region].name)}">
        <span class="wos-card__img${p.photo ? " is-photo" : ""}"><img src="${p.image}" alt="" loading="lazy" decoding="async"></span>
        <span class="wos-card__name">${esc(p.name)}</span>
        <span class="wos-card__meta"><span>${esc(regions[p.region].name)}</span>${p.heat ? heatHTML(p.heat, true) : ""}</span>
      </button></li>`).join("") : `<li class="wos-empty">No spices in this collection yet.</li>`;
    counts = regionCounts();
    highlightRail();
  }
  function highlightRail() {
    const cur = active || (horizontalRail() ? list[0]?.id : null);
    rail.querySelectorAll(".wos-card").forEach((c) => {
      const on = c.dataset.id === cur;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-current", on ? "true" : "false");
    });
  }
  let railLock = 0;
  function scrollRailTo(id, smooth = true) {
    const card = rail.querySelector(`[data-id="${id}"]`);
    if (!card) return;
    railLock = performance.now() + 700;
    card.parentElement.scrollIntoView({ behavior: smooth && !reduceMotion ? "smooth" : "auto", inline: "center", block: "nearest" });
  }
  rail.addEventListener("click", (e) => {
    const card = e.target.closest(".wos-card");
    if (!card) return;
    interact();
    const id = card.dataset.id;
    if (!horizontalRail() || id === active) openDetail(id);
    else { activate(id); scrollRailTo(id); }
  });
  let railTimer;
  rail.addEventListener("scroll", () => {
    if (!horizontalRail() || performance.now() < railLock) return;
    clearTimeout(railTimer);
    railTimer = setTimeout(() => {
      const mid = rail.getBoundingClientRect().left + rail.clientWidth / 2;
      let best = null, dist = Infinity;
      rail.querySelectorAll(".wos-card").forEach((c) => {
        const b = c.getBoundingClientRect(), d = Math.abs(b.left + b.width / 2 - mid);
        if (d < dist) { dist = d; best = c; }
      });
      if (best && best.dataset.id !== active) { interact(); activate(best.dataset.id); }
    }, 110);
  }, { passive: true });

  root.querySelectorAll("[data-collection-chips] .chip").forEach((chip, _, all) => chip.addEventListener("click", () => {
    interact();
    all.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    filter.collection = chip.dataset.value;
    renderRail();
    rail.scrollTo({ left: 0, top: 0 });
    if (active && !list.some((p) => p.id === active)) { active = null; highlightRail(); }
    if (list[0] && horizontalRail()) activate(list[0].id, { fly: true });
  }));

  function selectRegion(id) {
    filter.region = id;
    regionChip.classList.add("is-on");
    regionChip.querySelector("[data-region-name]").textContent = `${regions[id].name} · ${counts[id] || 0}`;
    renderRail();
    rail.scrollTo({ left: 0, top: 0 });
    const first = list[0];
    if (!first) return;
    if (list.length === 1 || mode() === "desktop") openDetail(first.id);
    else activate(first.id);
  }
  $("[data-region-clear]").addEventListener("click", () => {
    filter.region = null; regionChip.classList.remove("is-on");
    const keep = active;
    renderRail();
    if (keep) scrollRailTo(keep, false);
  });

  /* ---------------------------------------------------------------- selection + detail */
  function activate(id, { fly = true } = {}) {
    const p = byId[id];
    if (!p) return;
    active = id;
    if (!root.classList.contains("has-explored")) { root.classList.add("has-explored"); requestAnimationFrame(measure); }
    highlightRail();
    if (fly) {
      const r = regions[p.region];
      flyTo(r.lng, r.lat, Math.max(view.zoom, mode() === "mobile" ? 1.35 : 1.5));
    }
    if (isOpen) renderDetail(p);
  }

  function renderDetail(p) {
    const r = regions[p.region], rec = p.recipe;
    detail.style.setProperty("--accent", p.color);
    const media = rec.image
      ? `<div class="d-recipe__media"><img src="${rec.image}" alt="${esc(rec.title)}" loading="lazy"></div>`
      : `<div class="d-recipe__media${p.photo ? " is-photo-jar" : ""}"><img class="is-jar" src="${p.image}" alt="" loading="lazy"></div>`;
    detailBody.innerHTML = `
      <div class="d-head">
        <div class="d-jar${p.photo ? " is-photo" : ""}"><img src="${p.image}" alt="${esc(p.name)}"></div>
        <div>
          <div class="d-coll">${esc(collections[p.collection].name)}${p.isNew ? " · New" : ""}</div>
          <h2 class="d-name">${esc(p.name)}</h2>
          <p class="d-tagline">${esc(p.tagline)}</p>
          <p class="d-origin">${ICON.pin}<span>${esc(p.origin)} · ${esc(r.name)}</span></p>
        </div>
      </div>
      <div class="d-row">${heatHTML(p.heat)}<ul class="tags">${p.notes.map((n) => `<li class="tag tag--note">${esc(n)}</li>`).join("")}</ul></div>
      <p class="d-story">${esc(p.story)}</p>
      <div class="d-section"><h3>In the jar <span>${p.ingredients.length}</span></h3><ul class="tags">${p.ingredients.map((i) => `<li class="tag" style="--accent:${p.color}">${esc(i)}</li>`).join("")}</ul></div>
      <div class="d-section">
        <h3>Cook it</h3>
        <article class="d-recipe">
          ${media}
          <div class="d-recipe__body">
            <h4>${esc(rec.title)}</h4>
            <div class="d-recipe__facts"><span>${ICON.clock}${esc(rec.time)}</span><span>${ICON.serves}Serves ${esc(rec.serves)}</span></div>
            <p style="color:var(--text-muted);font-size:.92rem">${esc(rec.summary)}</p>
            <details><summary>Ingredients · ${rec.ingredients.length}</summary><ul>${rec.ingredients.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></details>
            <details><summary>Method · ${rec.steps.length} steps</summary><ol>${rec.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></details>
          </div>
        </article>
      </div>
      <div class="d-ctas">
        <a class="btn" href="recipes/${rec.id}.html">Full recipe ${ICON.arrow}</a>
        <a class="btn btn--ghost" href="spices/${p.id}.html">About the spice</a>
      </div>
      <div class="d-section"><h3>About ${esc(r.name)}</h3><p class="d-story" style="margin:0">${esc(r.story)}</p></div>`;
    detail.querySelector(".wos-detail__scroll").scrollTop = 0;
  }

  function openDetail(id) {
    const p = byId[id];
    if (!p) return;
    const wasOpen = isOpen;
    isOpen = true;
    root.classList.add("is-detail-open");
    activate(id);
    renderDetail(p);
    history.replaceState(null, "", `#${id}`);
    if (!wasOpen) detail.focus({ preventScroll: true });
    requestAnimationFrame(measure);
    setTimeout(measure, 650);
  }
  function closeDetail() {
    if (!isOpen) return;
    isOpen = false;
    root.classList.remove("is-detail-open");
    detail.style.removeProperty("--drag");
    history.replaceState(null, "", location.pathname);
    requestAnimationFrame(measure);
    setTimeout(measure, 650);
    const card = rail.querySelector(`[data-id="${active}"]`);
    card?.focus({ preventScroll: true });
  }
  function step(dir) {
    if (!list.length) return;
    const i = list.findIndex((p) => p.id === active);
    const next = list[(i + dir + list.length) % list.length];
    openDetail(next.id);
    scrollRailTo(next.id);
  }
  $("[data-close]").addEventListener("click", closeDetail);
  root.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => step(+b.dataset.step)));
  addEventListener("keydown", (e) => {
    if (document.body.classList.contains("menu-open")) return;
    if (e.key === "Escape") closeDetail();
    if (isOpen && !e.target.closest("input, textarea") && (e.key === "ArrowRight" || e.key === "ArrowLeft")) step(e.key === "ArrowRight" ? 1 : -1);
  });

  // Drag the sheet down to dismiss (mobile)
  const grab = $("[data-grab]");
  let sheetY = null;
  grab.addEventListener("pointerdown", (e) => { sheetY = e.clientY; grab.setPointerCapture(e.pointerId); detail.classList.add("is-dragging"); });
  grab.addEventListener("pointermove", (e) => { if (sheetY != null) detail.style.setProperty("--drag", `${Math.max(0, e.clientY - sheetY)}px`); });
  const release = (e) => {
    if (sheetY == null) return;
    const dy = e.clientY - sheetY;
    sheetY = null; detail.classList.remove("is-dragging"); detail.style.removeProperty("--drag");
    if (dy > 90) closeDetail();
  };
  grab.addEventListener("pointerup", release);
  grab.addEventListener("pointercancel", release);

  /* ---------------------------------------------------------------- boot */
  decodeDots();
  buildPins();
  renderRail();
  measure();
  new ResizeObserver(measure).observe(stage);
  [mqDesktop, mqLandscape].forEach((mq) => mq.addEventListener("change", () => { measure(); highlightRail(); }));

  const hash = decodeURIComponent(location.hash.slice(1));
  if (byId[hash]) {
    const r = regions[byId[hash].region];
    view.lon = r.lng; view.lat = clampLat(r.lat);
    setTimeout(() => { openDetail(hash); scrollRailTo(hash, false); }, 60);
  } else if (regions[hash]) {
    view.lon = regions[hash].lng; view.lat = regions[hash].lat;
    setTimeout(() => selectRegion(hash), 60);
  }
  addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (byId[id] && id !== active) { openDetail(id); scrollRailTo(id); }
    else if (regions[id]) selectRegion(id);
  });
  requestAnimationFrame((t) => { last = t; root.classList.add("is-ready"); frame(t); });
})();
