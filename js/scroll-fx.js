/* People of Spice — homepage scroll motion (GSAP + ScrollTrigger, loaded from cdnjs).
   Everything here is scrubbed to the scrollbar, so it plays backwards when you scroll up.
   - [data-split="fill"]  words brighten one by one as the paragraph passes through view
   - [data-split="rise"]  heading words rise out of a mask
   - [data-journey]       soil-to-table chapters: pinned scrollytelling on desktop,
                          arch images wiping open on smaller screens
   If GSAP doesn't load, or the visitor prefers reduced motion, the page stays static and
   fully readable: nothing is hidden until a tween takes hold of it. */
(() => {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.registerPlugin(ScrollTrigger);

  /* Wrap every word in <span class="split-w"><span>…</span></span>, keeping inline markup (<em>)
     and the spaces between words so lines still wrap and balance naturally. */
  const split = (el) => {
    const words = [];
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 1) return walk(child);
        if (child.nodeType !== 3) return;
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((chunk, i) => {
          if (!chunk) return;
          if (/^\s+$/.test(chunk)) return frag.append(chunk);
          // punctuation glued to the previous word (e.g. the comma after </em>) joins it, so it can't wrap alone
          if (i === 0 && words.length && child.previousSibling) {
            const glue = document.createElement("span");
            glue.className = "split-glue";
            glue.textContent = chunk;
            return words[words.length - 1].firstChild.append(glue);
          }
          const outer = document.createElement("span");
          const inner = document.createElement("span");
          outer.className = "split-w";
          inner.textContent = chunk;
          outer.append(inner);
          frag.append(outer);
          words.push(outer);
        });
        child.replaceWith(frag);
      });
    };
    walk(el);
    return words;
  };

  document.querySelectorAll('[data-split="fill"]').forEach((el) => {
    gsap.fromTo(split(el), { opacity: .16 }, {
      opacity: 1, ease: "none", stagger: .05,
      scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 48%", scrub: true },
    });
  });

  document.querySelectorAll('[data-split="rise"]').forEach((el) => {
    gsap.fromTo(split(el).map((w) => w.firstChild), { yPercent: 115, rotate: 5 }, {
      yPercent: 0, rotate: 0, ease: "power3.out", stagger: .08,
      scrollTrigger: { trigger: el, start: "top 94%", end: "top 62%", scrub: .7 },
    });
  });

  /* ---- Soil to table ---- */
  const section = document.querySelector("[data-journey]");
  if (section) {
    const chapters = gsap.utils.toArray("[data-chapter]", section);
    const imgs = chapters.map((c) => c.querySelector("img"));
    const parts = chapters.map((c) => c.querySelectorAll("[data-part]"));
    const n = chapters.length;

    gsap.matchMedia().add({ desktop: "(min-width: 900px)", mobile: "(max-width: 899px)" }, ({ conditions }) => {
      if (conditions.mobile) {
        chapters.forEach((c, i) => {
          gsap.fromTo(imgs[i], { clipPath: "inset(45% 0% 0% 0%)", scale: 1.25 }, {
            clipPath: "inset(0% 0% 0% 0%)", scale: 1, ease: "none",
            scrollTrigger: { trigger: c.querySelector(".journey__media"), start: "top 95%", end: "top 35%", scrub: .6 },
          });
          gsap.fromTo(parts[i], { autoAlpha: 0, y: 40 }, {
            autoAlpha: 1, y: 0, ease: "power2.out", stagger: .08,
            scrollTrigger: { trigger: c.querySelector(".journey__text"), start: "top 92%", end: "top 60%", scrub: .6 },
          });
        });
        return;
      }

      section.classList.add("is-pinned");
      const pin = section.querySelector("[data-journey-pin]");
      const labels = section.querySelectorAll("[data-progress-label]");
      const bar = section.querySelector("[data-progress-bar]");

      // Chapter one arrives as the stage scrolls into view
      gsap.fromTo(imgs[0], { clipPath: "inset(100% 0% 0% 0%)", scale: 1.25 }, {
        clipPath: "inset(0% 0% 0% 0%)", scale: 1, ease: "power2.out",
        scrollTrigger: { trigger: pin, start: "top 85%", end: "top 15%", scrub: .6 },
      });
      gsap.fromTo(parts[0], { autoAlpha: 0, y: 50 }, {
        autoAlpha: 1, y: 0, ease: "power3.out", stagger: .08,
        scrollTrigger: { trigger: pin, start: "top 70%", end: "top 20%", scrub: .6 },
      });

      // Then the stage pins and each scroll step wipes in the next chapter; every chapter
      // gets a resting stretch in the scrub so it can be read without snapping
      gsap.set(imgs.slice(1), { clipPath: "inset(100% 0% 0% 0%)" });
      parts.slice(1).forEach((p) => gsap.set(p, { autoAlpha: 0, y: 50 }));
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pin, pin: true, start: "top top", scrub: .8, invalidateOnRefresh: true,
          end: () => "+=" + innerHeight * (n - 1) * 1.3,
          onUpdate: (self) => {
            const on = Math.min(n - 1, Math.floor(self.progress * n));
            labels.forEach((l, i) => l.classList.toggle("is-on", i === on));
          },
        },
      });
      tl.addLabel("c0");
      for (let i = 1; i < n; i++) {
        const at = tl.duration() + .45;
        tl.to(parts[i - 1], { autoAlpha: 0, y: -40, stagger: .05, duration: .45, ease: "power2.in" }, at)
          .to(imgs[i - 1], { scale: .92, opacity: .35, duration: 1, ease: "power2.inOut" }, at)
          .fromTo(imgs[i], { clipPath: "inset(100% 0% 0% 0%)", scale: 1.25 }, { clipPath: "inset(0% 0% 0% 0%)", scale: 1, duration: 1, ease: "power2.inOut" }, at)
          .fromTo(parts[i], { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, stagger: .07, duration: .5, ease: "power3.out" }, at + .45)
          .to(bar, { scaleX: i / (n - 1), duration: 1, ease: "power2.inOut" }, at)
          .addLabel(`c${i}`);
      }
      tl.to({}, { duration: .45 }); // rest on the last chapter before the page moves on

      return () => section.classList.remove("is-pinned");
    });
  }

  // Layout settles once fonts and images arrive; re-measure the triggers then
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
})();
