#!/usr/bin/env node
/**
 * People of Spice — Open Graph / social card generator.
 *
 * Renders a 1200×630 card for every page into images/og/<slug>.jpg using headless Chrome
 * and the site's own CSS (so spice cards show the real jar still life). The cards are
 * committed, so deploys don't need Chrome; re-run this after content changes:
 *
 *   npm run og                 all cards
 *   npm run og -- spice-zaatar only the named slugs
 *
 * Needs Google Chrome (CHROME=/path/to/chrome to override) and network access for fonts.
 * scripts/build.mjs picks a page's card up by slug and falls back to images/og/default.jpg.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const OUT = path.join(ROOT, "images/og");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 1200, H = 630;

/* ---- content (same defaults as scripts/build.mjs) ---- */
const collections = read("content/collections.json");
const regions = read("content/regions.json");
const labelColors = read("content/label-colors.json");
const recipes = read("content/recipes.json");
const products = read("content/products.json").map((p) => ({
  ...p, image: p.image || `images/products/${p.id}.webp`, color: p.color || labelColors[p.id] || "#d6b26a", isNew: p.collection !== "signature",
}));
const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
const P = byId(products), G = byId(regions), C = byId(collections);
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const minutes = (m) => (m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);
const HEAT = ["No heat", "Mild", "Warm", "Medium", "Hot", "Fiery"];

/* ---- cards ---- */
const page = (slug, photo, eyebrow, title, sub, fit = "cover") => ({ slug, kind: "page", photo, eyebrow, title, sub, fit });
const cards = [
  page("home", "videos/people_of_spice_ai_sequence-720p-poster-00001.jpg", "People of Spice", "Unique &amp; <em>Authentic</em> Flavors", `${products.length} spice blends from ${regions.length} cooking traditions, gathered at one table`),
  page("about", "images/People-of-Spice-Hero-Image-p-1600.jpg", "Our story", "It began with a <em>simple question</em>", "From the family table to the markets where spices come from"),
  page("shop", "images/AdobeStock_611173560-p-1600.webp", "The Spice Rack", "Every jar is a <em>passport</em>", `${products.length} blends, salts and single-origin spices — packed in glass`),
  page("recipes", "images/recipe-hero-image-peopleofspice.webp", "Recipes", "Dinner, by way of <em>everywhere</em>", `${recipes.length} recipes — one for every jar`),
  page("world-of-spice", "images/globe-teaser.svg", "World of Spice", "Travel the world, <em>one jar at a time</em>", `Spin the globe: ${products.length} spices pinned to ${regions.length} kitchens`, "contain"),
  page("contact", "images/AdobeStock_662866143-p-1600.webp", "Contact", "Let’s talk <em>spice</em>", "Questions, wholesale and press — we’d love to hear from you"),
  page("default", "images/AdobeStock_601004060-p-1600.webp", "People of Spice", "Spices from <em>every corner</em> of the world", "Authentic blends and the recipes that go with them"),
  ...products.map((p) => ({ slug: `spice-${p.id}`, kind: "spice", p })),
  ...recipes.map((rec) => ({ slug: `recipe-${rec.id}`, kind: "recipe", rec, p: P[rec.product] })),
];

const jar = (p) => `<div class="jar${p.photo ? " jar--photo" : ""}" style="--accent:${p.color}"><img src="${p.image}" alt=""></div>`;

const body = (c) => {
  if (c.kind === "page") return `
    <div class="photo photo--${c.fit}"><img src="${c.photo}" alt=""></div>
    <div class="copy"><span class="eyebrow">${c.eyebrow}</span><h1>${c.title}</h1><p>${c.sub}</p></div>`;
  if (c.kind === "spice") {
    const p = c.p;
    return `
    <div class="glow" style="--accent:${p.color}"></div>
    <div class="still">${jar(p)}</div>
    <div class="copy copy--narrow"><span class="eyebrow">${esc(C[p.collection].name)}${p.isNew ? " · New for 2026" : ""}</span><h1>${esc(p.name)}</h1>
      <p class="tagline">${esc(p.tagline)}</p><p class="og-facts">${esc(G[p.region].name)} · ${HEAT[p.heat]} · ${p.notes.map(esc).join(" · ")}</p></div>`;
  }
  const { rec, p } = c;
  const total = rec.prep + rec.cook + (rec.rest || 0);
  return `
    ${rec.image ? `<div class="photo"><img src="${rec.image}" alt=""></div>` : `<div class="glow" style="--accent:${p.color}"></div><div class="still">${jar(p)}</div>`}
    <div class="copy${rec.image ? "" : " copy--narrow"}"><span class="eyebrow">Recipe · ${esc(G[p.region].name)}</span><h1>${esc(rec.title)}</h1>
      <p class="og-facts">Made with ${esc(p.name)} · ${minutes(total)} · Serves ${esc(rec.serves)}</p></div>`;
};

const html = (c) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<base href="${new URL(`file://${ROOT}/`).href}">
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&family=Playfair+Display:ital,wght@0,500;0,600;1,400;1,500&display=block" rel="stylesheet">
<link rel="stylesheet" href="css/pos.css">
<style>
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #020805; }
  .card { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; isolation: isolate; font-family: var(--font-body); color: var(--cream); }
  .card::after { content: ""; position: absolute; inset: 22px; border: 1px solid rgba(214,178,106,.35); border-radius: 18px; z-index: 5; pointer-events: none; }
  .noise { position: absolute; inset: 0; z-index: 4; background: url("images/noise.png"); opacity: .08; mix-blend-mode: overlay; }
  .photo { position: absolute; inset: 0 0 0 30%; z-index: 0; }
  .photo img { width: 100%; height: 100%; object-fit: cover; }
  .photo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, #020805 0%, rgba(2,8,5,.82) 22%, rgba(2,8,5,.25) 60%, rgba(2,8,5,.35) 100%), linear-gradient(0deg, rgba(2,8,5,.7), transparent 45%); }
  .photo--contain { inset: 0 0 0 46%; }
  .photo--contain img { object-fit: contain; padding: 40px; }
  .photo--contain::after { background: linear-gradient(90deg, #020805, transparent 30%); }
  .glow { position: absolute; inset: 0; background: radial-gradient(42% 70% at 76% 50%, color-mix(in oklab, var(--accent) 34%, transparent), transparent 70%), radial-gradient(60% 50% at 10% 100%, rgba(24,67,50,.5), transparent 70%); }
  .still { position: absolute; right: 86px; top: 50%; translate: 0 -50%; width: 384px; z-index: 1; }
  .still .jar { border: 1px solid var(--line); box-shadow: 0 30px 80px -30px rgba(0,0,0,.9); }
  .copy { position: absolute; left: 76px; top: 0; bottom: 0; width: 640px; z-index: 2; display: flex; flex-direction: column; justify-content: center; gap: 18px; padding-block: 120px 70px; }
  .copy--narrow { width: 610px; }
  .eyebrow { font-size: 17px; letter-spacing: .24em; }
  .eyebrow::before { width: 34px; }
  h1 { font-family: var(--font-display); font-weight: 500; font-size: 76px; line-height: 1.02; letter-spacing: -.01em; margin: 0; text-wrap: balance; }
  h1 em { font-style: italic; color: var(--tan); font-weight: 400; }
  p { margin: 0; font-size: 24px; line-height: 1.4; font-weight: 300; color: rgba(255,245,232,.78); max-width: 30em; }
  .tagline { font-family: var(--font-display); font-style: italic; font-size: 32px; color: var(--tan); font-weight: 400; }
  .og-facts { font-size: 20px; letter-spacing: .02em; color: rgba(255,245,232,.66); }
  .logo { position: absolute; left: 76px; top: 58px; width: 150px; z-index: 3; }
  .url { position: absolute; right: 64px; bottom: 50px; z-index: 3; font-size: 15px; letter-spacing: .22em; text-transform: uppercase; color: rgba(255,245,232,.6); }
</style></head><body>
<div class="card">${body(c)}
  <img class="logo" src="images/brand/pos-logo-cream.png" alt="">
  <span class="url">peopleofspice.com</span>
  <div class="noise"></div>
</div>
<script>
  // Shrink long titles until the copy fits the card
  addEventListener("load", () => document.fonts.ready.then(() => {
    const h1 = document.querySelector("h1"), copy = document.querySelector(".copy");
    let size = 76;
    while ((copy.scrollHeight > copy.clientHeight || h1.offsetHeight > 270) && size > 40) h1.style.fontSize = (size -= 2) + "px";
    document.body.dataset.ready = "1";
  }));
</script>
</body></html>`;

/* ---- render ---- */
const only = process.argv.slice(2);
const todo = only.length ? cards.filter((c) => only.includes(c.slug)) : cards;
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pos-og-"));
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${tmp}/profile`, "--no-first-run", "--hide-scrollbars", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
try {
  let url;
  for (let i = 0; i < 60 && !url; i++) {
    await sleep(200);
    try { url = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page")?.webSocketDebuggerUrl; } catch {}
  }
  if (!url) throw new Error(`Couldn't start Chrome at ${CHROME}`);
  ws = new WebSocket(url);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });

  for (const [n, c] of todo.entries()) {
    const file = path.join(tmp, `${c.slug}.html`);
    fs.writeFileSync(file, html(c));
    await send("Page.navigate", { url: `file://${file}` });
    for (let i = 0; i < 100; i++) {
      await sleep(80);
      const r = await send("Runtime.evaluate", { expression: `document.body?.dataset.ready === "1" && [...document.images].every((im) => im.complete)`, returnByValue: true });
      if (r.result?.result?.value) break;
    }
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
    fs.writeFileSync(path.join(OUT, `${c.slug}.jpg`), Buffer.from(shot.result.data, "base64"));
    process.stdout.write(`\r${n + 1}/${todo.length} ${c.slug}`.padEnd(70));
  }
  console.log(`\nWrote ${todo.length} cards to images/og/`);
} finally {
  ws?.close();
  chrome.kill();
  setTimeout(() => fs.rmSync(tmp, { recursive: true, force: true }), 500);
}
