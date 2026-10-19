#!/usr/bin/env node
/**
 * People of Spice — static page builder.
 *
 * content/*.json is the CMS (it mirrors the Airtable tables described in
 * docs/REDESIGN_PLAN.md). This script renders it into plain HTML so the site
 * keeps deploying to Cloudflare Pages with no build step on the server:
 *
 *   shop.html                 The Spice Rack (all products, filterable)
 *   spices/<id>.html          One page per spice
 *   recipes.html              Recipe index (filterable)
 *   recipes/<id>.html         One page per recipe (legacy URLs kept)
 *   index.html                Homepage (hero film, story, globe teaser, new shelves, recipes)
 *   world-of-spice.html       Interactive globe (catalog inlined)
 *   data/globe-dots.js        Land dot-grid for the globe
 *   images/globe-teaser.svg   Still frame of the globe for the homepage
 *
 * Run:  npm run build
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const write = (p, s) => {
  fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, p), s);
};

const SITE = "https://peopleofspice.com";
const GA_ID = "G-35LQYB32YH";

/* ------------------------------------------------------------------ content */
const collections = read("content/collections.json");
const regions = read("content/regions.json");
const labelColors = read("content/label-colors.json");
const recipes = read("content/recipes.json");
const products = read("content/products.json").map((p) => ({
  ...p,
  image: p.image || `images/products/${p.id}.webp`,
  color: p.color || labelColors[p.id] || "#d6b26a",
  isNew: p.collection !== "signature",
}));

const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
const P = byId(products), R = byId(recipes), G = byId(regions), C = byId(collections);
const recipeFor = (p) => R[p.recipe];
const productFor = (r) => P[r.product];

const CONTINENT = {
  americas: ["mexico", "new-england", "american-south", "texas", "california", "argentina"],
  europe: ["scandinavia", "british-isles", "france", "spain", "italy", "germany", "hungary", "greece"],
  "middle-east-africa": ["levant", "morocco"],
  asia: ["sichuan", "thailand", "vietnam", "punjab", "india", "sri-lanka"],
};
const continentOf = (regionId) => Object.keys(CONTINENT).find((k) => CONTINENT[k].includes(regionId));

/* ------------------------------------------------------------------ helpers */
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const minutes = (m) => (m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);
const total = (r) => r.prep + r.cook + (r.rest || 0);
const iso = (m) => `PT${Math.floor(m / 60) ? Math.floor(m / 60) + "H" : ""}${m % 60 ? (m % 60) + "M" : ""}` || "PT0M";
const HEAT_WORDS = ["No heat", "Mild", "Warm", "Medium", "Hot", "Fiery"];

const ICON = {
  pin: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  serves: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 13h16a8 8 0 0 1-16 0Z"/><path d="M12 5v3M8 6l1 2M16 6l-1 2"/></svg>',
  chile: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.4 7.1c2.1 1.6 2.3 4.7.7 7.4-2.3 3.8-7.6 7.3-13.3 7.5-.9 0-1.2-1-.4-1.5 4.7-3 6.6-5.8 7.9-9.8.8-2.5 2.9-4.6 5.1-3.6Z"/><path d="M16.8 7.2c.3-1.6 1.2-3 2.8-3.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  arrow: '<svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  globe: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>',
};

const heat = (level, size = "") =>
  `<span class="heat${size ? " heat--" + size : ""}" data-level="${level}" role="img" aria-label="Heat: ${HEAT_WORDS[level]} (${level} of 5)">` +
  `<span class="heat__chiles">${[1, 2, 3, 4, 5].map((i) => ICON.chile.replace("<svg", `<svg class="heat__chile${i <= level ? " is-on" : ""}"`)).join("")}</span>` +
  `<span class="heat__label">${HEAT_WORDS[level]}</span></span>`;

const jar = (p, r, { eager = false, vt = false, cls = "" } = {}) =>
  `<div class="jar${p.photo ? " jar--photo" : ""}${cls ? " " + cls : ""}"${vt ? ` style="view-transition-name: jar-${p.id}"` : ""}>` +
  `<img src="${r}${p.image}" alt="${esc(p.name)} ${p.photo ? "canister" : "glass jar"}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></div>`;

const recipeMedia = (rec, r, eager = false) => {
  const p = productFor(rec);
  return rec.image
    ? `<img src="${r}${rec.image}" alt="${esc(rec.title)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`
    : jar(p, r, { eager });
};

/* ------------------------------------------------------------------ layout */
const NAV = [
  ["index.html", "Home"],
  ["world-of-spice.html", "World of Spice"],
  ["shop.html", "Spice Rack"],
  ["recipes.html", "Recipes"],
  ["about.html", "Our Story"],
  ["contact-us.html", "Contact"],
];

function layout({ r = "", file, title, description, image = "images/People-of-Spice-Hero-Image.jpg", bodyClass = "", head = "", body, jsonld, scripts = "" }) {
  const url = `${SITE}/${file.replace(/index\.html$/, "")}`;
  const nav = NAV.map(([href, label]) => `<a href="${r}${href}"${href === file || (file.startsWith("spices/") && href === "shop.html") || (file.startsWith("recipes/") && href === "recipes.html") ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${SITE}/${image}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#001a0d">
  <link rel="icon" href="${r}images/favicon.webp" type="image/webp">
  <link rel="apple-touch-icon" href="${r}images/webclip.webp">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${r}css/pos.css">
  ${head}
  <script>document.documentElement.classList.add('js')</script>
  ${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head>
<body class="pos ${bodyClass}">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header" data-header>
    <div class="site-header__inner">
      <a class="brand" href="${r}index.html" aria-label="People of Spice home"><img src="${r}images/brand/pos-logo-cream.png" alt="People of Spice" width="635" height="221"></a>
      <nav class="nav" aria-label="Primary">${nav}</nav>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" data-menu-toggle><span>Menu</span><span class="menu-btn__bars" aria-hidden="true"></span></button>
    </div>
  </header>
  <div class="menu" id="menu" data-menu>
    <nav aria-label="Mobile"><ol>${NAV.map(([href, label]) => `<li><a href="${r}${href}">${label}</a></li>`).join("")}</ol></nav>
    <p class="menu__foot">Spices &amp; cooking traditions from every corner of the world.</p>
  </div>
${body}
  <script src="${r}js/pos.js" defer></script>
  ${scripts}
</body>
</html>
`;
}

const footer = (r) => `
  <footer class="site-footer">
    <div class="container">
      <div class="site-footer__grid">
        <div class="site-footer__brand">
          <img src="${r}images/brand/pos-logo-cream.png" alt="People of Spice" width="635" height="221" loading="lazy">
          <p>For thousands of years, civilisations around the globe have turned spice into ritual. We bring those traditions to one table.</p>
        </div>
        <nav aria-label="Explore"><h3>Explore</h3><a href="${r}world-of-spice.html">World of Spice</a><a href="${r}shop.html">Spice Rack</a><a href="${r}recipes.html">Recipes</a></nav>
        <nav aria-label="Company"><h3>Company</h3><a href="${r}about.html">Our Story</a><a href="${r}contact-us.html">Contact</a></nav>
        <nav aria-label="Legal"><h3>Legal</h3><a href="${r}privacy-policy.html">Privacy</a><a href="${r}licensing.html">Licensing</a></nav>
      </div>
      <div class="site-footer__legal"><span>© ${new Date().getFullYear()} People of Spice</span><span>Packed in Vietnam · No artificial fillers</span></div>
    </div>
  </footer>`;

const productCard = (p, r, i = 0) => {
  const reg = G[p.region];
  const search = [p.name, p.tagline, reg.name, p.origin, ...p.ingredients, ...p.notes].join(" ").toLowerCase();
  return `<a class="p-card reveal" style="--accent:${p.color};--i:${i % 4}" href="${r}spices/${p.id}.html" data-filter-item data-tags="${p.collection} heat-${p.heat}${p.isNew ? " new" : ""}" data-search="${esc(search)}">
      ${jar(p, r, { vt: true })}
      <div class="p-card__meta">
        <span class="p-card__coll">${esc(C[p.collection].name)}${p.isNew ? " · New" : ""}</span>
        <span class="p-card__name">${esc(p.name)}</span>
        <span class="p-card__tagline">${esc(p.tagline)}</span>
        <span class="p-card__row"><span class="p-card__origin">${ICON.pin}${esc(reg.name)}</span>${heat(p.heat, "sm")}</span>
      </div>
    </a>`;
};

const SWEET = /sugar|cookie|banana bread|cider|affogato|churro/i;
const recipeTags = (rec) => {
  const p = productFor(rec);
  return [continentOf(p.region), total(rec) <= 30 ? "quick" : "", p.heat >= 3 ? "spicy" : "", SWEET.test(rec.title) ? "sweet" : ""].filter(Boolean);
};

const recipeCard = (rec, r, i = 0) => {
  const p = productFor(rec);
  const reg = G[p.region];
  const tags = recipeTags(rec).join(" ");
  const search = [rec.title, p.name, reg.name, ...rec.ingredients].join(" ").toLowerCase();
  return `<a class="r-card reveal" style="--accent:${p.color};--i:${i % 3}" href="${r}recipes/${rec.id}.html" data-filter-item data-tags="${tags}" data-search="${esc(search)}">
      <div class="r-card__media">${recipeMedia(rec, r)}</div>
      <span class="r-card__region">${esc(reg.name)}</span>
      <div class="r-card__body">
        <span class="r-card__spice">${esc(p.name)}</span>
        <h3 class="r-card__title">${esc(rec.title)}</h3>
        <div class="r-card__facts"><span>${ICON.clock}${minutes(total(rec))}</span><span>${ICON.serves}Serves ${esc(rec.serves)}</span>${p.heat ? heat(p.heat, "sm") : ""}</div>
      </div>
    </a>`;
};

const featureRecipe = (rec, r, style = "") => {
  const reg = G[productFor(rec).region];
  return `<a class="feature-recipe reveal"${style ? ` style="${style}"` : ""} href="${r}recipes/${rec.id}.html">
          <div class="feature-recipe__media">${recipeMedia(rec, r)}</div>
          <div class="feature-recipe__body">
            <span class="r-card__spice">${esc(reg.name)} · ${minutes(total(rec))}</span>
            <h3>${esc(rec.title)}</h3>
            <p style="color:var(--text-muted)">${esc(rec.summary)}</p>
            <div class="r-card__facts"><span>${ICON.serves}Serves ${esc(rec.serves)}</span><span>${ICON.clock}Prep ${minutes(rec.prep)}</span><span>${rec.ingredients.length} ingredients</span></div>
            <span class="btn btn--sm" style="justify-self:start">View recipe ${ICON.arrow}</span>
          </div>
        </a>`;
};

const GREETINGS = ["Bon appétit", "Buen provecho", "召し上がれ", "Buon appetito", "Sahtein", "Guten Appetit", "Ăn ngon nhé", "Kali orexi"];
const marquee = () => `<div class="marquee" aria-hidden="true"><div class="marquee__track">${Array(2).fill(GREETINGS.map((w) => `<span>${w}</span>`).join("")).join("")}</div></div>`;

const chips = (items, label) =>
  `<div class="chips" role="group" aria-label="${esc(label)}" data-filter-chips>${items.map(([v, l, n], i) => `<button class="chip" type="button" data-value="${v}" aria-pressed="${i === 0}">${esc(l)}${n != null ? ` <span class="chip__count">${n}</span>` : ""}</button>`).join("")}</div>`;

const search = (placeholder) => `<label class="search"><span class="sr-only">${esc(placeholder)}</span>${ICON.search}<input type="search" placeholder="${esc(placeholder)}" data-filter-search></label>`;

/* ------------------------------------------------------------------ pages */
function shopPage() {
  const r = "";
  const ordered = collections.flatMap((c) => products.filter((p) => p.collection === c.id));
  const chipItems = [["all", "All", products.length], ["new", "New for 2026", products.filter((p) => p.isNew).length], ...collections.map((c) => [c.id, c.short, products.filter((p) => p.collection === c.id).length])];
  const body = `
  <main id="main">
    <section class="hero hero--arches">
      <div class="arches" aria-hidden="true">
        ${["l", "c", "r"].map((k) => `<div class="arch arch--${k}"><img class="arch__vista" src="images/AdobeStock_615585664-p-2000.jpeg" alt="" ${k === "c" ? 'fetchpriority="high"' : 'loading="lazy"'}>${k === "c" ? `
          <div class="arch__still">
            <div class="plinth plinth--front"></div><div class="plinth plinth--back"></div>
            <img class="still-jar still-jar--back" src="images/products/turmeric.webp" alt="">
            <span class="mound mound--back" style="--accent:${P.turmeric.color}"></span>
            <img class="still-jar still-jar--front" src="images/products/smoked-paprika.webp" alt="">
            <span class="mound mound--front" style="--accent:${P["smoked-paprika"].color}"></span>
          </div>` : ""}</div>`).join("")}
      </div>
      <div class="container stack" style="--stack:1rem">
        <span class="eyebrow reveal">The Spice Rack</span>
        <h1 class="reveal" style="--i:1">Every jar is a <em>passport</em></h1>
        <p class="lede reveal" style="--i:2">${products.length} blends, salts and single-origin spices from ${regions.length} corners of the world — packed in glass, with no artificial fillers.</p>
        <div class="reveal" style="--i:3"><a class="btn btn--ghost" href="world-of-spice.html">${ICON.globe} Explore them on the globe</a></div>
      </div>
    </section>
    ${marquee()}
    <section class="section" data-filter>
      <div class="container">
        <div class="toolbar"><div class="toolbar__row">${chips(chipItems, "Filter by collection")}${search("Search spices")}</div><p class="result-count" data-filter-count aria-live="polite"></p></div>
        <div class="grid">${ordered.map((p, i) => productCard(p, r, i)).join("")}</div>
        <p class="empty" data-filter-empty hidden>No spices match that — try another search.</p>
      </div>
    </section>
  </main>${footer(r)}`;
  return layout({
    r, file: "shop.html", title: "The Spice Rack — Global Spice Blends & Salts | People of Spice",
    description: `Shop ${products.length} People of Spice blends, specialty salts and pantry spices inspired by ${regions.length} cooking traditions around the world.`,
    body,
    jsonld: { "@context": "https://schema.org", "@type": "ItemList", itemListElement: ordered.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/spices/${p.id}.html`, name: p.name })) },
  });
}

function spicePage(p) {
  const r = "../";
  const reg = G[p.region], col = C[p.collection], rec = recipeFor(p);
  const sameCollection = products.filter((x) => x.collection === p.collection && x.id !== p.id);
  const sameRegion = products.filter((x) => x.region === p.region && x.id !== p.id && x.collection !== p.collection);
  const more = [...sameCollection, ...sameRegion];
  const body = `
  <main id="main" style="--accent:${p.color}">
    <section class="spice-hero">
      <div class="container">
        <ol class="crumbs reveal"><li><a href="../shop.html">Spice Rack</a></li><li><a href="../shop.html#${col.id}">${esc(col.name)}</a></li><li aria-current="page">${esc(p.name)}</li></ol>
        <div class="spice-hero__grid" style="margin-top:1.5rem">
          ${jar(p, r, { eager: true, vt: true })}
          <div class="stack" style="--stack:1.25rem">
            <span class="eyebrow reveal">${esc(col.name)}${p.isNew ? " · New for 2026" : ""}</span>
            <h1 class="reveal" style="--i:1">${esc(p.name)}</h1>
            <p class="spice-hero__tagline reveal" style="--i:2">${esc(p.tagline)}</p>
            <div class="reveal" style="--i:3">${heat(p.heat)}</div>
            <p class="lede reveal" style="--i:3">${esc(p.story)}</p>
            <dl class="facts reveal" style="--i:4">
              <div><dt>Inspired by</dt><dd><a href="../world-of-spice.html#${p.id}">${esc(p.origin)}</a></dd></div>
              <div><dt>Region</dt><dd>${esc(reg.name)}</dd></div>
              <div><dt>Format</dt><dd>${esc(p.photo ? "Signature canister" : col.format)}</dd></div>
              <div><dt>Item</dt><dd>#${esc(p.sku)}</dd></div>
            </dl>
            <div class="reveal" style="--i:5;display:flex;flex-wrap:wrap;gap:.6rem">
              <a class="btn" href="../recipes/${rec.id}.html">Cook ${esc(rec.title)} ${ICON.arrow}</a>
              <a class="btn btn--ghost" href="../world-of-spice.html#${p.id}">${ICON.globe} See it on the globe</a>
            </div>
          </div>
        </div>
      </div>
    </section>
    <section class="section" style="padding-top:1rem">
      <div class="container" style="display:grid;gap:2.5rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))">
        <div class="reveal"><h2 style="font-size:var(--step-2);margin-bottom:1rem">In the jar</h2><ul class="tags">${p.ingredients.map((x) => `<li class="tag">${esc(x)}</li>`).join("")}</ul></div>
        <div class="reveal" style="--i:1"><h2 style="font-size:var(--step-2);margin-bottom:1rem">Tastes</h2><ul class="tags">${p.notes.map((x) => `<li class="tag tag--note">${esc(x)}</li>`).join("")}</ul></div>
        <div class="reveal" style="--i:2"><h2 style="font-size:var(--step-2);margin-bottom:1rem">Pairs with</h2><ul class="tags">${p.pairsWith.map((x) => `<li class="tag" style="--accent:var(--tan)">${esc(x)}</li>`).join("")}</ul></div>
      </div>
    </section>
    <section class="section" style="padding-top:0">
      <div class="container">
        <span class="eyebrow reveal">Cook with it</span>
        ${featureRecipe(rec, r, "margin-top:1.25rem")}
      </div>
    </section>
    ${more.length ? `<section class="section" style="padding-top:0">
      <div class="container">
        <h2 class="reveal" style="font-size:var(--step-3);margin-bottom:1.5rem">More to explore</h2>
        <div class="rail">${more.map((x, i) => productCard(x, r, i)).join("")}</div>
      </div>
    </section>` : ""}
  </main>${footer(r)}`;
  return layout({
    r, file: `spices/${p.id}.html`, image: p.image,
    title: `${p.name} — ${p.tagline} | People of Spice`,
    description: `${p.name} by People of Spice. ${p.story}`.slice(0, 300),
    body,
    jsonld: {
      "@context": "https://schema.org", "@type": "Product", name: `People of Spice ${p.name}`, sku: p.sku, image: `${SITE}/${p.image}`,
      description: p.story, brand: { "@type": "Brand", name: "People of Spice" }, category: col.name,
    },
  });
}

function recipesIndex() {
  const r = "";
  const ordered = [...recipes.filter((x) => x.featured), ...recipes.filter((x) => !x.featured)];
  const count = (t) => recipes.filter((rec) => recipeTags(rec).includes(t)).length;
  const chipItems = [["all", "All", recipes.length], ["quick", "30 min or less", count("quick")], ["americas", "Americas", count("americas")], ["europe", "Europe", count("europe")], ["middle-east-africa", "Middle East & Africa", count("middle-east-africa")], ["asia", "Asia", count("asia")], ["spicy", "Bring the heat", count("spicy")], ["sweet", "Sweet", count("sweet")]];
  const body = `
  <main id="main">
    <section class="hero">
      <div class="hero__bg"><img src="images/recipe-hero-image-peopleofspice.webp" alt="" fetchpriority="high"></div>
      <div class="container stack" style="--stack:1rem">
        <span class="eyebrow reveal">Recipes</span>
        <h1 class="reveal" style="--i:1">Dinner, by way of <em>everywhere</em></h1>
        <p class="lede reveal" style="--i:2">${recipes.length} recipes — one for every jar — passed down from market stalls, home kitchens and grandmothers on five continents.</p>
      </div>
    </section>
    <section class="section" data-filter style="padding-top:2rem">
      <div class="container">
        <div class="toolbar"><div class="toolbar__row">${chips(chipItems, "Filter recipes")}${search("Search recipes or ingredients")}</div><p class="result-count" data-filter-count aria-live="polite"></p></div>
        <div class="grid grid--recipes">${ordered.map((rec, i) => recipeCard(rec, r, i)).join("")}</div>
        <p class="empty" data-filter-empty hidden>Nothing cooking with that search — try an ingredient like “lime”.</p>
      </div>
    </section>
  </main>${footer(r)}`;
  return layout({
    r, file: "recipes.html", image: "images/recipe-hero-image-peopleofspice.webp",
    title: "Global Recipes — One for Every Spice | People of Spice",
    description: "Authentic, easy recipes from Morocco to Mexico, Bangkok to Buenos Aires — each one built around a People of Spice blend.",
    body,
  });
}

function recipePage(rec) {
  const r = "../";
  const p = productFor(rec), reg = G[p.region];
  const others = recipes.filter((x) => x.id !== rec.id && (G[productFor(x).region].id === reg.id || productFor(x).collection === p.collection)).slice(0, 6);
  const fill = others.length < 3 ? recipes.filter((x) => x.featured && x.id !== rec.id && !others.includes(x)).slice(0, 3 - others.length) : [];
  const spiceWord = new RegExp(p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/^(Ground|Whole) /, ""), "i");
  const body = `
  <main id="main" style="--accent:${p.color}">
    <section class="recipe-hero">
      <div class="recipe-hero__media">${recipeMedia(rec, r, true)}</div>
      <div class="container recipe-hero__body">
        <ol class="crumbs reveal"><li><a href="../recipes.html">Recipes</a></li><li>${esc(reg.name)}</li></ol>
        <span class="eyebrow reveal">Made with ${esc(p.name)}</span>
        <h1 class="reveal" style="--i:1">${esc(rec.title)}</h1>
        <p class="lede reveal" style="--i:2">${esc(rec.summary)}</p>
        ${p.heat ? `<div class="reveal" style="--i:2">${heat(p.heat)}</div>` : ""}
        <dl class="recipe-stats reveal" style="--i:3">
          <div><dt>Serves</dt><dd>${esc(rec.serves)}</dd></div>
          <div><dt>Prep</dt><dd>${minutes(rec.prep)}</dd></div>
          <div><dt>Cook</dt><dd>${rec.cook ? minutes(rec.cook) : "No-cook"}</dd></div>
          <div><dt>Total</dt><dd>${minutes(total(rec))}</dd></div>
        </dl>
      </div>
    </section>
    <section class="section">
      <div class="container recipe-body">
        <aside class="recipe-aside">
          <div class="reveal">
            <h2>Ingredients</h2>
            <ul class="checklist" data-checklist="${rec.id}">${rec.ingredients.map((x, i) => `<li><label><input type="checkbox" data-i="${i}"><span${spiceWord.test(x) ? ' class="is-spice"' : ""}>${esc(x)}</span></label></li>`).join("")}</ul>
          </div>
          ${rec.equipment ? `<p class="equipment reveal"><strong style="color:var(--cream)">You'll need:</strong> ${rec.equipment.map(esc).join(", ")}</p>` : ""}
          <a class="spice-callout reveal" href="../spices/${p.id}.html">
            ${jar(p, r)}
            <span><small>The spice</small><strong>${esc(p.name)}</strong><small>${esc(p.tagline)} ${ICON.arrow}</small></span>
          </a>
        </aside>
        <div>
          <h2 class="reveal">Method</h2>
          <ol class="steps">${rec.steps.map((s, i) => `<li class="reveal" style="--i:${i % 3}">${esc(s)}</li>`).join("")}</ol>
          <div class="newsletter reveal" style="margin-top:3.5rem">
            <span class="eyebrow">Never miss a recipe</span>
            <h2>A new passport stamp, every week</h2>
            <p style="color:var(--text-muted)">Join the People of Spice table for new recipes and first dibs on new blends.</p>
            <form action="https://formsubmit.co/corehomeweb2@gmail.com" method="post" name="email-form" data-name="Email Form">
              <input type="hidden" name="Recipe" value="${esc(rec.title)}">
              <input type="hidden" name="_next" value="${SITE}/thank-you.html">
              <label class="sr-only" for="nl-email">Email address</label>
              <input id="nl-email" type="email" name="email" placeholder="you@kitchen.com" required autocomplete="email">
              <button class="btn" type="submit">Subscribe</button>
            </form>
          </div>
        </div>
      </div>
    </section>
    <section class="section" style="padding-top:0">
      <div class="container">
        <h2 class="reveal" style="font-size:var(--step-3);margin-bottom:1.5rem">Keep cooking</h2>
        <div class="grid grid--recipes">${[...others.slice(0, 3), ...fill].map((x, i) => recipeCard(x, r, i)).join("")}</div>
      </div>
    </section>
  </main>${footer(r)}`;
  return layout({
    r, file: `recipes/${rec.id}.html`, image: rec.image || p.image,
    title: `${rec.title} with ${p.name} | People of Spice`,
    description: rec.summary,
    body,
    scripts: `<script src="${r}js/form-handler.js" defer></script>`,
    jsonld: {
      "@context": "https://schema.org", "@type": "Recipe", name: rec.title, description: rec.summary,
      image: [`${SITE}/${rec.image || p.image}`], author: { "@type": "Organization", name: "People of Spice" },
      recipeCuisine: reg.name, recipeYield: rec.serves, prepTime: iso(rec.prep), cookTime: iso(rec.cook), totalTime: iso(total(rec)),
      recipeIngredient: rec.ingredients, recipeInstructions: rec.steps.map((text) => ({ "@type": "HowToStep", text })),
      keywords: [p.name, reg.name, ...p.notes].join(", "),
    },
  });
}

function globePage() {
  const r = "";
  const catalog = {
    regions: regions.map(({ id, name, places, lat, lng, story }) => ({ id, name, places, lat, lng, story })),
    collections: collections.map(({ id, name, short }) => ({ id, name, short })),
    products: products.map((p) => {
      const rec = recipeFor(p);
      return {
        id: p.id, name: p.name, tagline: p.tagline, collection: p.collection, region: p.region, origin: p.origin, heat: p.heat,
        notes: p.notes, ingredients: p.ingredients, story: p.story, image: p.image, photo: !!p.photo, color: p.color, isNew: p.isNew,
        recipe: { id: rec.id, title: rec.title, summary: rec.summary, image: rec.image || null, serves: rec.serves, time: minutes(total(rec)), ingredients: rec.ingredients, steps: rec.steps },
      };
    }),
  };
  const ic = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"${extra}>${d}</svg>`;
  const body = `
  <main id="main" class="wos" data-wos>
    <div class="wos-stage" data-stage aria-label="Interactive globe of spice origins. Use the spice list to browse with a keyboard.">
      <canvas data-canvas></canvas>
      <div class="wos-pins" data-pins></div>
      <p class="wos-loading" aria-hidden="true">Charting the spice routes…</p>
    </div>
    <div class="wos-intro">
      <span class="eyebrow">World of Spice</span>
      <h1>Travel the world, <em>one jar at a time</em></h1>
      <p>${products.length} spices pinned to the kitchens that inspired them. Spin the globe, tap a pin, and cook your way across ${regions.length} regions.</p>
    </div>
    <p class="wos-hint" aria-hidden="true">${ic('<path d="M7 11V6a2 2 0 1 1 4 0v5M11 10V4a2 2 0 1 1 4 0v6M15 10V6a2 2 0 1 1 4 0v8a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L3.5 14a2 2 0 0 1 3.5-2l0 .1"/>')} Drag to spin · Tap a pin</p>
    <div class="wos-controls">
      <button type="button" data-zoom="in" aria-label="Zoom in">${ic('<path d="M12 5v14M5 12h14"/>')}</button>
      <button type="button" data-zoom="out" aria-label="Zoom out">${ic('<path d="M5 12h14"/>')}</button>
      <button type="button" data-spin aria-pressed="true" aria-label="Auto-rotate globe">${ic('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>')}</button>
    </div>
    <aside class="wos-panel" aria-label="Spices">
      <div class="wos-panel__head"><h2>Spice atlas</h2><p>${products.length} spices · ${regions.length} regions</p></div>
      <div class="wos-region" data-region-chip>${ICON.pin}<span data-region-name></span><button type="button" data-region-clear aria-label="Show all regions">${ic('<path d="M6 6l12 12M18 6 6 18"/>')}</button></div>
      <div class="chips" role="group" aria-label="Filter by collection" data-collection-chips>
        <button class="chip" type="button" data-value="all" aria-pressed="true">All</button>${collections.map((c) => `<button class="chip" type="button" data-value="${c.id}" aria-pressed="false">${esc(c.short)}</button>`).join("")}
      </div>
      <ol class="wos-rail" data-rail aria-label="Spice list"></ol>
    </aside>
    <section class="wos-detail" data-detail aria-label="Spice details" tabindex="-1">
      <div class="wos-detail__grab" data-grab aria-hidden="true"></div>
      <div class="wos-detail__bar">
        <button type="button" data-step="-1" aria-label="Previous spice">${ic('<path d="M15 6l-6 6 6 6"/>')}</button>
        <button type="button" data-step="1" aria-label="Next spice">${ic('<path d="M9 6l6 6-6 6"/>')}</button>
        <button type="button" data-close aria-label="Close details">${ic('<path d="M6 6l12 12M18 6 6 18"/>')}</button>
      </div>
      <div class="wos-detail__scroll" data-detail-body></div>
    </section>
  </main>
  <script type="application/json" id="wos-data">${JSON.stringify(catalog).replace(/</g, "\\u003c")}</script>`;
  return layout({
    r, file: "world-of-spice.html", bodyClass: "page-globe", image: "images/products/zaatar.webp",
    title: "World of Spice — Explore Spices on the Globe | People of Spice",
    description: `Spin the globe to discover ${products.length} People of Spice blends, the cooking traditions behind them, their heat level, ingredients and a recipe for each.`,
    head: '<link rel="stylesheet" href="css/globe.css">',
    body,
    scripts: '<script src="data/globe-dots.js" defer></script><script src="js/globe.js" defer></script>',
  });
}

function homePage() {
  const r = "";
  const HERO = "videos/people_of_spice_ai_sequence-720p";
  const IG = "https://www.instagram.com/peopleofspice/";
  const fresh = collections.filter((c) => c.id !== "signature").flatMap((c) => products.filter((p) => p.collection === c.id));
  const shelfChips = [["all", "All new", fresh.length], ...collections.filter((c) => c.id !== "signature").map((c) => [c.id, c.short, products.filter((p) => p.collection === c.id).length])];
  const [lead, ...more] = recipes.filter((x) => x.featured);
  const busiest = [...regions].sort((a, b) => products.filter((p) => p.region === b.id).length - products.filter((p) => p.region === a.id).length).slice(0, 6);
  const ig = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>';
  const journey = [
    ["Grow", "In the field", "images/AdobeStock_377259178", "Freshly harvested turmeric root held in two hands", "We start with growers who know their soil, their climate and the exact moment each spice reaches its peak."],
    ["Source", "At the market", "images/AdobeStock_631181774", "A lantern-lit night market stall", "From the night markets of Bangkok to the souks of Tangier, every blend carries the story of where it comes from."],
    ["Create", "In the kitchen", "images/AdobeStock_601004060", "Rows of ground spices in wooden trays", "Balanced with a chef's precision and a home cook's heart, so simple ingredients taste like somewhere."],
  ];
  const featured = products.filter((p) => p.featured).sort((a, b) => a.featured - b.featured);
  const mosaic = [
    ["images/AdobeStock_492490915-p-800.jpeg", "A table spread with dishes for a shared feast"],
    ["images/ramen-bowl---people-of-spice-p-800.jpg", "Steaming noodle bowl lifted with chopsticks"],
    ["images/POS_world_of_spice-8-p-800.jpg", "Friends sharing dinner in the desert at sunset"],
    ["images/AdobeStock_639969282-p-800.webp", "A bowl of spiced rice held out to the camera"],
    ["images/POS_world_of_spice-9-p-800.jpg", "Pasta and wine on a vineyard table"],
    ["images/q8.jpg", "A chef finishing a plate"],
  ];
  const FLAVOURS = [["Smoky", "#b8708f"], ["Zesty", "#e39a5c"], ["Floral", "#a98bd0"], ["Fiery", "#e0745a"], ["Earthy", "#7fae86"]];
  /* First-visit intro: salt and spice gather into a turning globe, then we fly into it */
  const intro = `
  <div class="intro" data-intro aria-hidden="true">
    <canvas class="intro__grains" data-intro-grains></canvas>
    <div class="intro__globe" data-intro-globe>
      <div class="intro__window"></div>
      <svg class="intro__ring" viewBox="0 0 200 200"><circle cx="100" cy="100" r="99.5" pathLength="1"/><ellipse class="intro__equator" cx="100" cy="100" rx="99.5" ry="30" pathLength="1"/></svg>
    </div>
    <div class="intro__caption">
      ${FLAVOURS.map(([w, c]) => `<span class="intro__word" style="color:${c}">${w}</span>`).join("")}
      <img class="intro__logo" src="images/brand/pos-logo-cream.png" alt="" width="635" height="221">
    </div>
    <div class="intro__count"><span class="intro__num" data-intro-count>0</span><span class="intro__pct">%</span><span class="intro__label">Loading the spice routes</span></div>
  </div>`;
  const introBoot = "<script>(function(){var d=document.documentElement;try{if(sessionStorage.getItem('pos:intro'))return;sessionStorage.setItem('pos:intro','1')}catch(e){return}d.classList.add('pos-intro','pos-intro-hold');setTimeout(function(){d.classList.remove('pos-intro','pos-intro-hold')},10000)})()</script>";
  const body = `${intro}
  <main id="main">
    <section class="hero hero--home" data-hero aria-labelledby="hero-title">
      <div class="hero__bg">
        <video muted loop playsinline preload="none" poster="${HERO}-poster-00001.jpg" aria-hidden="true" data-hero-video>
          <source src="${HERO}-transcode.mp4" type="video/mp4">
          <source src="${HERO}-transcode.webm" type="video/webm">
        </video>
      </div>
      <div class="container stack" style="--stack:1rem">
        <span class="eyebrow reveal">People of Spice</span>
        <h1 id="hero-title"><span class="split-line"><span>Unique &amp;</span></span><span class="split-line" style="--i:1"><span><em>Authentic</em> Flavors</span></span></h1>
        <p class="lede reveal" style="--i:2">Savor the knowledge of having a world of spices in your home — ${products.length} blends from ${regions.length} kitchens, gathered at one table.</p>
        <div class="hero__ctas reveal" style="--i:3">
          <a class="btn" href="shop.html">Shop the Spice Rack ${ICON.arrow}</a>
          <a class="btn btn--ghost" href="world-of-spice.html">${ICON.globe} Travel the World of Spice</a>
        </div>
      </div>
      <button class="hero__toggle" type="button" aria-label="Pause background video" data-video-toggle>
        <svg class="i-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
        <svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z"/></svg>
      </button>
    </section>

    <section class="section story" id="story" aria-labelledby="story-title">
      <div class="container">
        <span class="eyebrow reveal">Introducing People of Spice</span>
        <h2 class="sr-only" id="story-title">Our story</h2>
        <p class="story__statement" data-split="fill">For thousands of years, civilizations around the globe have used spices to turn mealtimes into ritual — healing experiences for body and soul. We crave that same sense of <em>community</em>, <em>adventure</em> and <em>savoring</em> all of the world’s unique cuisines.</p>
        <p class="lede" data-split="fill">Our blends carry you from the food carts of Bangkok to a bayou-front kitchen in New Orleans, with equal parts comfort and excitement.</p>
        <a class="link-arrow reveal" href="about.html">Read our story ${ICON.arrow}</a>
      </div>
    </section>

    <section class="spot" id="blends" aria-labelledby="spot-title" data-spot style="--spot:${featured[0].color}">
      <div class="container">
        <div class="section-head">
          <div><span class="eyebrow reveal">Featured spices</span><h2 data-split="rise" id="spot-title">Meet the <em>blends</em></h2></div>
          <p class="reveal">Turn the dial to meet ${featured.length} of our ${products.length} spices, then open a jar to see where it comes from and what to cook with it.</p>
        </div>
        <div class="spot__layout">
          <div class="spot__stage" aria-hidden="true" data-spot-stage>${featured.map((p, i) => jar(p, r, { cls: `spot__jar${i ? "" : " is-active"}`, eager: !i })).join("")}</div>
          <div class="dial" data-dial>
            <button class="dial__btn" type="button" data-dial-step="-1" aria-label="Previous spice"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>
            <div class="dial__track" data-dial-track>${featured.map((p, i) => `
              <a class="dial__item${p.photo ? " dial__item--photo" : ""}" href="spices/${p.id}.html" style="--accent:${p.color}" data-dial-item${i ? "" : ' aria-current="true"'}><img src="${p.image}" alt="" loading="lazy" decoding="async"><span class="sr-only">${esc(p.name)}</span></a>`).join("")}
            </div>
            <button class="dial__btn" type="button" data-dial-step="1" aria-label="Next spice"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
            <p class="dial__count" aria-hidden="true"><span data-dial-index>01</span> / ${String(featured.length).padStart(2, "0")}</p>
          </div>
          <div class="spot__panels">${featured.map((p, i) => {
            const rec = recipeFor(p);
            return `
            <article class="spot__panel${i ? "" : " is-active"}" data-panel${i ? ' aria-hidden="true"' : ""}>
              <span class="spot__coll">${esc(C[p.collection].name)}${p.isNew ? " · New for 2026" : ""}</span>
              <h3 class="spot__name">${esc(p.name)}</h3>
              <p class="spot__tagline">${esc(p.tagline)}</p>
              <div class="spot__meta"><span class="spot__origin">${ICON.pin}${esc(p.origin)}</span>${heat(p.heat)}</div>
              <p class="spot__story">${esc(p.story)}</p>
              <ul class="tags">${p.notes.map((n) => `<li class="tag tag--note">${esc(n)}</li>`).join("")}</ul>
              <div class="spot__ctas">
                <a class="btn" href="spices/${p.id}.html">Discover ${esc(p.name)} ${ICON.arrow}</a>
                <a class="link-arrow" href="recipes/${rec.id}.html">Cook ${esc(rec.title)} ${ICON.arrow}</a>
                <a class="link-arrow" href="world-of-spice.html#${p.id}">${ICON.globe} Find it on the globe</a>
              </div>
            </article>`;
          }).join("")}
          </div>
        </div>
        <p class="sr-only" aria-live="polite" data-spot-live></p>
        <a class="link-arrow" href="shop.html">Browse all ${products.length} spices on the Spice Rack ${ICON.arrow}</a>
      </div>
    </section>

    <section class="journey" id="journey" aria-labelledby="journey-title" data-journey>
      <div class="container">
        <div class="journey__head"><span class="eyebrow reveal">From soil to table</span><h2 id="journey-title" data-split="rise">Every jar has a <em>journey</em></h2></div>
      </div>
      <div class="journey__pin" data-journey-pin>
        <div class="container journey__stage">
          <ol class="journey__chapters">${journey.map(([name, kicker, img, alt, text], i) => `
            <li class="journey__chapter" data-chapter>
              <figure class="journey__media"><img src="${img}-p-800.webp" srcset="${img}-p-800.webp 800w, ${img}-p-1080.webp 1080w" sizes="(min-width: 900px) 40vw, 90vw" alt="${esc(alt)}" loading="lazy" decoding="async"></figure>
              <div class="journey__text">
                <span class="journey__num" data-part aria-hidden="true">0${i + 1}</span>
                <span class="eyebrow eyebrow--plain" data-part>${kicker}</span>
                <h3 data-part>${name}</h3>
                <p data-part>${esc(text)}</p>
              </div>
            </li>`).join("")}
          </ol>
          <div class="journey__progress" aria-hidden="true">${journey.map(([name], i) => `<span data-progress-label${i ? "" : ' class="is-on"'}>${name}</span>`).join("")}<i data-progress-bar></i></div>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0" aria-labelledby="globe-title">
      <div class="container">
        <a class="globe-teaser reveal" href="world-of-spice.html">
          <div class="globe-teaser__art"><img src="images/globe-teaser.svg" alt="A globe dotted with gold pins over the Mediterranean, the Middle East and South Asia" width="600" height="600" loading="lazy" decoding="async"></div>
          <div class="globe-teaser__body">
            <span class="eyebrow">World of Spice</span>
            <h2 id="globe-title" data-split="rise">Where in the <em>world?</em></h2>
            <p class="lede">Every jar is pinned to the kitchen that inspired it. Spin the globe, tap a pin, and cook your way across ${regions.length} regions.</p>
            <ul class="tags">${busiest.map((g) => `<li class="tag">${esc(g.name)}</li>`).join("")}</ul>
            <dl class="globe-stats"><div><dt>Spices</dt><dd>${products.length}</dd></div><div><dt>Regions</dt><dd>${regions.length}</dd></div><div><dt>Recipes</dt><dd>${recipes.length}</dd></div></dl>
            <span class="btn">${ICON.globe} Spin the globe ${ICON.arrow}</span>
          </div>
        </a>
      </div>
    </section>

    <section class="section shelf" id="new" data-filter aria-labelledby="shelf-title">
      <div class="container">
        <div class="section-head">
          <div><span class="eyebrow reveal">New for 2026</span><h2 data-split="rise" id="shelf-title">Fresh on the <em>shelf</em></h2></div>
          <p class="reveal" style="--i:2">${fresh.length} new blends, salts and pantry spices across ${shelfChips.length - 1} collections — each in glass, with no artificial fillers.</p>
        </div>
        ${chips(shelfChips, "Filter new spices by collection")}
        <p class="result-count" data-filter-count aria-live="polite"></p>
        <div class="rail">${fresh.map((p, i) => productCard(p, r, i)).join("")}</div>
        <a class="link-arrow" href="shop.html">Browse all ${products.length} on the Spice Rack ${ICON.arrow}</a>
      </div>
    </section>

    <section class="section" style="padding-top:0" id="recipes" aria-labelledby="recipes-title">
      <div class="container">
        <div class="section-head">
          <div><span class="eyebrow reveal">Cook the world</span><h2 data-split="rise" id="recipes-title">Featured <em>recipes</em></h2></div>
          <a class="btn btn--ghost reveal" style="--i:2" href="recipes.html">All ${recipes.length} recipes ${ICON.arrow}</a>
        </div>
        ${featureRecipe(lead, r)}
        <div class="grid grid--recipes grid--four" style="margin-top:clamp(.75rem, .5rem + 1vw, 1.5rem)">${more.map((rec, i) => recipeCard(rec, r, i)).join("")}</div>
      </div>
    </section>

    ${marquee()}

    <section class="section connect" id="connect" aria-labelledby="connect-title">
      <div class="container">
        <div class="section-head">
          <div><span class="eyebrow reveal">Connect with us</span><h2 data-split="rise" id="connect-title">Inspired by <em>you</em>, always</h2></div>
          <a class="btn btn--ghost reveal" style="--i:2" href="${IG}" target="_blank" rel="noopener">${ig} @peopleofspice</a>
        </div>
        <ul class="ig-grid">${mosaic.map(([src, alt], i) => `<li class="reveal" style="--i:${i % 6}"><a href="${IG}" target="_blank" rel="noopener"><img src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async"><span class="sr-only"> — see more on Instagram</span></a></li>`).join("")}</ul>

        <div class="gift-card reveal" id="gift">
          <div class="stack" style="--stack:1rem">
            <span class="eyebrow">Send a gift</span>
            <h2 data-split="rise">Share the <em>table</em></h2>
            <p class="lede">Send a gift of spice to someone you love, or add a private chef’s menu for two, four or six. Tell us who it’s for and we’ll be in touch by email.</p>
          </div>
          <form class="form" action="https://formsubmit.co/corehomeweb2@gmail.com" method="POST" id="email-form-3" name="email-form-3">
            <input type="hidden" name="_subject" value="New Gift Request from People of Spice">
            <input type="hidden" name="_next" value="${SITE}/thank-you.html">
            <input type="text" name="_honey" tabindex="-1" autocomplete="off" hidden>
            <div class="form__row">
              <div class="field"><label for="gift-first">First name</label><input id="gift-first" name="First-Name" type="text" maxlength="256" autocomplete="given-name"></div>
              <div class="field"><label for="gift-last">Last name</label><input id="gift-last" name="Last-Name" type="text" maxlength="256" autocomplete="family-name" required></div>
            </div>
            <div class="field"><label for="gift-email">Email address</label><input id="gift-email" name="email" type="email" maxlength="256" autocomplete="email" required></div>
            <div class="field"><label for="gift-message">Message</label><textarea id="gift-message" name="Message" rows="4" maxlength="2000" required placeholder="Who is it for, and what are they cooking?"></textarea></div>
            <fieldset class="field">
              <legend>Requested chef service</legend>
              <div class="choice">${["Menu For 2", "Menu For 4", "Menu For 6"].map((v, i) => `<label><input type="radio" name="Requested-Service" value="${v}"${i ? "" : " checked"}><span>${v.replace("For", "for")}</span></label>`).join("")}</div>
            </fieldset>
            <button class="btn" type="submit">Send ${ICON.arrow}</button>
          </form>
        </div>
      </div>
    </section>
  </main>${footer(r)}`;
  return layout({
    r, file: "index.html", bodyClass: "page-home",
    title: "People of Spice | Authentic Global Spices for Home Cooking",
    description: `Discover ${products.length} authentic spice blends inspired by ${regions.length} cooking traditions. From Thai curry to Moroccan ras el hanout, bring the world's kitchens to your family table.`,
    head: `${introBoot}\n  <link rel="preload" as="image" href="${HERO}-poster-00001.jpg" fetchpriority="high">\n  <link rel="stylesheet" href="css/home.css">`,
    body,
    scripts: [
      '<script src="js/intro.js" defer></script>',
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>',
      '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>',
      '<script src="js/scroll-fx.js" defer></script>',
      '<script src="js/spotlight.js" defer></script>',
    ].join("\n  "),
    jsonld: {
      "@context": "https://schema.org", "@type": "Organization", name: "People of Spice", url: `${SITE}/`,
      logo: `${SITE}/images/brand/pos-logo-cream.png`, sameAs: [IG],
    },
  });
}

/* ------------------------------------------------------------------ globe dots */
function globeDots() {
  const topo = read("scripts/vendor/land-110m.json");
  const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map((arc) => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => [(x += dx) * sx + tx, (y += dy) * sy + ty]);
  });
  const ring = (ids) => ids.flatMap((i, k) => {
    const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
    return k ? a.slice(1) : a;
  });
  const polys = [];
  for (const g of topo.objects.land.geometries) {
    const list = g.type === "Polygon" ? [g.arcs] : g.arcs;
    for (const poly of list) {
      const rings = poly.map(ring);
      const xs = rings[0].map((p) => p[0]), ys = rings[0].map((p) => p[1]);
      polys.push({ rings, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
    }
  }
  const inRing = (x, y, rg) => {
    let c = false;
    for (let i = 0, j = rg.length - 1; i < rg.length; j = i++) {
      const [xi, yi] = rg[i], [xj, yj] = rg[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const onLand = (x, y) => polys.some(({ rings, box }) => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3] && rings.reduce((c, rg) => (inRing(x, y, rg) ? !c : c), false));
  const STEP = 1.45;
  const out = [];
  let row = 0;
  for (let lat = -56; lat <= 82; lat += STEP, row++) {
    const lonStep = STEP / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
    for (let lon = -180 + (row % 2) * lonStep / 2; lon < 180; lon += lonStep) {
      if (onLand(lon, lat)) out.push(Math.round(lon * 10), Math.round(lat * 10));
    }
  }
  const buf = Buffer.from(new Int16Array(out).buffer);
  write("data/globe-dots.js", `/* Generated by scripts/build.mjs from Natural Earth 1:110m land (public domain). [lon*10, lat*10] Int16 pairs. */\nwindow.POS_DOTS="${buf.toString("base64")}";\n`);
  return out;
}

/* Static, still frame of the globe for the homepage teaser: same dot grid, pinned regions,
   orthographic projection centred between the Mediterranean and India. */
function globeTeaser(dots) {
  const S = 600, R = 270, C = S / 2, lon0 = 32, lat0 = 22, rad = Math.PI / 180;
  const project = (lon, lat) => {
    const l = (lon - lon0) * rad, p = lat * rad, p0 = lat0 * rad;
    const depth = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
    return { x: C + R * Math.cos(p) * Math.sin(l), y: C - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)), depth };
  };
  const shades = [[0.08, 0.22], [0.35, 0.4], [0.6, 0.62], [1.01, 0.9]];
  const paths = shades.map(() => []);
  for (let i = 0; i < dots.length; i += 2) {
    const { x, y, depth } = project(dots[i] / 10, dots[i + 1] / 10);
    const band = shades.findIndex(([max]) => depth < max);
    if (depth > 0.02 && band >= 0) paths[band].push(`M${x.toFixed(1)} ${y.toFixed(1)}h0`);
  }
  const pins = regions.map((g) => project(g.lng, g.lat)).filter((p) => p.depth > 0.15);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
<defs>
<radialGradient id="glow"><stop offset="70%" stop-color="#d6b26a" stop-opacity=".22"/><stop offset="100%" stop-color="#d6b26a" stop-opacity="0"/></radialGradient>
<radialGradient id="sea" cx="38%" cy="32%"><stop offset="0%" stop-color="#184332"/><stop offset="65%" stop-color="#04251a"/><stop offset="100%" stop-color="#001a0d"/></radialGradient>
</defs>
<circle cx="${C}" cy="${C}" r="${C}" fill="url(#glow)"/>
<circle cx="${C}" cy="${C}" r="${R}" fill="url(#sea)" stroke="#f8ddaf" stroke-opacity=".18"/>
${paths.map((d, i) => `<path d="${d.join("")}" stroke="#f8ddaf" stroke-opacity="${shades[i][1]}" stroke-width="3.1" stroke-linecap="round"/>`).join("\n")}
${pins.map(({ x, y, depth }) => `<g opacity="${(0.45 + depth * 0.55).toFixed(2)}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="#d6b26a" fill-opacity=".22"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#d6b26a" stroke="#001a0d" stroke-width="1.5"/></g>`).join("\n")}
</svg>
`;
  write("images/globe-teaser.svg", svg);
}

/* ------------------------------------------------------------------ run */
write("shop.html", shopPage());
products.forEach((p) => write(`spices/${p.id}.html`, spicePage(p)));
write("recipes.html", recipesIndex());
recipes.forEach((rec) => write(`recipes/${rec.id}.html`, recipePage(rec)));
const dots = globeDots();
write("world-of-spice.html", globePage());
globeTeaser(dots);
write("index.html", homePage());
console.log(`Built home, shop, ${products.length} spice pages, recipe index, ${recipes.length} recipe pages, globe (${dots.length / 2} land dots).`);
