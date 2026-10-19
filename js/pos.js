/* People of Spice — site-wide behaviour. No dependencies. */
(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  /* Header: solid after scrolling, tucks away on scroll down, returns on scroll up */
  const header = document.querySelector("[data-header]");
  if (header && !document.body.classList.contains("page-globe")) {
    let last = scrollY, ticking = false;
    const update = () => {
      const y = scrollY;
      header.classList.toggle("is-solid", y > 24);
      header.classList.toggle("is-hidden", y > 240 && y > last && !document.body.classList.contains("menu-open"));
      last = y; ticking = false;
    };
    addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();
  }

  /* Full-screen menu */
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  if (toggle && menu) {
    const setOpen = (open) => {
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.querySelector("span").textContent = open ? "Close" : "Menu";
      if (open) menu.querySelector("a")?.focus({ preventScroll: true });
    };
    toggle.addEventListener("click", () => setOpen(!document.body.classList.contains("menu-open")));
    addEventListener("keydown", (e) => { if (e.key === "Escape" && document.body.classList.contains("menu-open")) { setOpen(false); toggle.focus(); } });
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  }

  /* Scroll reveals */
  const reveals = document.querySelectorAll(".reveal, .split-line");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  }

  /* Home hero film: plays only when motion is welcome, pauses off-screen, and can be paused by hand */
  const hero = document.querySelector("[data-hero]");
  const film = hero?.querySelector("[data-hero-video]");
  if (hero && film) {
    const btn = hero.querySelector("[data-video-toggle]");
    let wanted = !reduceMotion && !navigator.connection?.saveData;
    let onScreen = true;
    const sync = () => {
      hero.classList.toggle("is-paused", !wanted);
      btn?.setAttribute("aria-label", wanted ? "Pause background video" : "Play background video");
      if (wanted && onScreen) {
        film.muted = true;
        film.play().catch((err) => { if (err.name === "NotAllowedError") { wanted = false; sync(); } });
      } else film.pause();
    };
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(hero);
    btn?.addEventListener("click", () => { wanted = !wanted; sync(); });
    sync();
  }

  /* Chip + search filtering for grids: [data-filter] > [data-filter-chips] / [data-filter-search] / [data-filter-item] */
  document.querySelectorAll("[data-filter]").forEach((root) => {
    const chips = [...root.querySelectorAll("[data-filter-chips] .chip")];
    const input = root.querySelector("[data-filter-search]");
    const items = [...root.querySelectorAll("[data-filter-item]")];
    const count = root.querySelector("[data-filter-count]");
    const empty = root.querySelector("[data-filter-empty]");
    let tag = "all";

    const apply = () => {
      const q = (input?.value || "").trim().toLowerCase();
      const run = () => {
        let shown = 0;
        for (const el of items) {
          const ok = (tag === "all" || el.dataset.tags.split(" ").includes(tag)) && (!q || el.dataset.search.includes(q));
          el.hidden = !ok;
          if (ok) { shown++; el.classList.add("is-in"); }
        }
        if (count) count.textContent = tag === "all" && !q ? "" : `${shown} of ${items.length}`;
        if (empty) empty.hidden = shown > 0;
      };
      if (document.startViewTransition && !reduceMotion && items.length < 80) {
        /* A skipped transition (hidden tab, rapid clicks) still runs `run`; only its promises reject */
        const vt = document.startViewTransition(run);
        vt.ready.catch(() => {});
        vt.finished.catch(() => {});
      } else run();
    };

    const select = (value, scroll) => {
      const chip = chips.find((c) => c.dataset.value === value) || chips[0];
      tag = chip.dataset.value;
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      if (scroll) chip.scrollIntoView({ inline: "center", block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
      apply();
    };

    chips.forEach((c) => c.addEventListener("click", () => {
      select(c.dataset.value, true);
      history.replaceState(null, "", c.dataset.value === "all" ? location.pathname : `#${c.dataset.value}`);
    }));
    let t;
    input?.addEventListener("input", () => { clearTimeout(t); t = setTimeout(apply, 120); });

    const fromHash = decodeURIComponent(location.hash.slice(1));
    if (fromHash && chips.some((c) => c.dataset.value === fromHash)) select(fromHash, true);
  });

  /* Recipe ingredient checklist remembers what you've prepped */
  document.querySelectorAll("[data-checklist]").forEach((list) => {
    const key = `pos:check:${list.dataset.checklist}`;
    const saved = new Set(store.get(key) || []);
    list.querySelectorAll("input").forEach((box) => {
      box.checked = saved.has(box.dataset.i);
      box.addEventListener("change", () => {
        box.checked ? saved.add(box.dataset.i) : saved.delete(box.dataset.i);
        store.set(key, [...saved]);
      });
    });
  });

  /* Subtle jar tilt on fine pointers */
  if (!reduceMotion && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".spice-hero .jar").forEach((el) => {
      const img = el.querySelector("img");
      el.addEventListener("pointermove", (e) => {
        const b = el.getBoundingClientRect();
        const x = (e.clientX - b.left) / b.width - 0.5, y = (e.clientY - b.top) / b.height - 0.5;
        img.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
      });
      el.addEventListener("pointerleave", () => { img.style.transform = ""; });
    });
  }
})();
