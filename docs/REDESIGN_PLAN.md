# People of Spice — 2026 Website Redesign

**Goal:** turn peopleofspice.com from a Webflow template export into an immersive, mobile-first site that feels like the brand promise: *spices and cooking traditions from all over the world, brought to one table.*

This doc has three parts:
1. **Audit:** the current site's pages, sections, colours, type, motion, and problems.
2. **Plan:** the new design system, sitemap, page designs, CMS model, and roadmap.
3. **What shipped in Phase 1:** this branch.

---

## 1. Audit of the current site

### 1.1 Stack
| | |
|---|---|
| Origin | Webflow export of the *"Roulete"* free template, committed as static HTML |
| Hosting | Cloudflare Pages (`wrangler pages deploy .`), Pages Function at `functions/api/airtable.js` |
| JS | `js/peopleofspice.js`, **1.95 MB** (Webflow runtime + IX2 interactions), plus jQuery 3.5, Swiper 10, Materialize 1.0 |
| CSS | `css/peopleofspice.css`, **228 KB**, plus `components.css` and `normalize.css` |
| Fonts | **11 Google families** loaded through WebFont.js (Bitter, Montserrat, Oswald, Inconsolata, Droid Serif, Droid Sans, Open Sans, Ubuntu, Lato, Playfair Display, Raleway). Only Playfair Display and Raleway are really used. |
| Forms | FormSubmit email, mirrored to Airtable by `js/form-handler.js` |
| Analytics | GA4 `G-35LQYB32YH` |

### 1.2 Pages and sections
| Page | Sections | Notes |
|---|---|---|
| `index.html` (Home) | Hero video (*"Unique & Authentic Flavors / Savor the Knowledge…"*) → *Introducing* → *Decades of Culinary* → 5-tile service grid (World of Spice, Our Spice Rack, Signature Recipes, Find Stores, Yachting Chef) → *Embark on a journey of flavor* → *Explore Select Recipes* sticky stack (Thai Green Curry, Moroccan Lamb Tagine, Grilled Chicken Kebabs) → *Enjoy / Bon appétit / Buen provecho / 召し上がれ…* greeting ticker → *Our Spices* slider (Manqual, Ras El Hanout, K-Town BBQ) → *Embark on a Journey* → *Connect with us* (Instagram) → *Send a Gift* and *Requested Chef Service* modals → footer | 69 Webflow interactions; sticky scroll-jacking; one hero video streams from `uploads-ssl.webflow.com` |
| `world-of-spice.html` | Full-screen dark slider with *"Let's travel"* marquee, 5 product cards, *Cook With It* links | Content duplicated twice in the DOM; no map, despite the name |
| `shop.html` (Spice Rack) | Market hero → *OUR SPICES* → product grid of the 5 signature canisters → subscribe | Hidden template blocks still link to `ryeriver.webflow.io` **beer products** |
| `recipes.html` | *Authentic Recipes* hero → *10 Minute Magic* → *Latest recipes* → *Most popular recipes* | Static lists |
| `recipes/*.html` (5) | Spice label → title → summary → stats (Servings / Prep / Cook / Ingredients / Total) → Equipment → Ingredients → Instructions → Other recipes → *Never miss a recipe* form | **Bugs:** *Fiesta Guacamole* shows the kebab instructions; *Spicy Beef Stir Fry* is titled "Moroccan Lamb Tagine"; the copy says *"Join thousands of Company subscribers"* |
| `about.html` | *Our story* | |
| `contact-us.html` | *Have questions? Reach out…* form | |
| `checkout.html`, `paypal-checkout.html`, `order-confirmation.html`, `thank-you.html` | Template commerce/thank-you shells | No live commerce |
| `detail_product.html`, `detail_recipe.html`, `detail_category.html`, `detail_sku.html`, `detail_globe-points.html` | Webflow CMS template pages with *"Heading 1 / Heading 2"* placeholder copy | Leftovers, not linked |
| `style-guide.html`, `licensing.html`, `changelog.html`, `airtable-test.html`, `test-airtable.html`, `videos.html`, `401/404` | Template and utility pages | Footer links to `slashmint.com`, `goodmeat.co/privacy`, and a third-party Twitter account |

### 1.3 Colours in use
| Token (current CSS) | Hex | Role |
|---|---|---|
| `--body` | `#001a0d` | Near-black forest green, page background |
| `--white` | `#fff5e8` | Warm cream text |
| `--tan` | `#f8ddaf` | Accent text, italics |
| `--white-smoke` | `#fff9` | Muted text |
| — | `#c1ae8e`, `#dba574` | Antique gold accents |
| — | `#7e3d5d` | Manqual sumac/purple |
| — | `#3898ec` | Webflow default link blue (template leftover) |

The **2026 label system** (from *PEOPLE OF SPICE – SPICES – ON PO – 5.6.2026*) adds a black label field, a gold-foil cartouche, botanical illustration, and **one colour per SKU**. Those colours are now extracted automatically into `content/label-colors.json`.

### 1.4 Type
- **Playfair Display** for headlines. It matches the high-contrast serif of the logo and labels, so we keep it.
- **Raleway** for body copy. It's thin at small sizes and doesn't match the labels' humanist-geometric tagline face (Avenir-like).

### 1.5 What feels "clunky / outdated"
1. **Scroll-jacking and sticky stacks** fight the thumb on mobile. Sections pin and swap instead of flowing.
2. **Heavy runtime:** about 2.3 MB of JS and CSS before any imagery, and 11 font families. Slow first paint on phones.
3. **No product or recipe system.** Five hand-built recipe pages with copy-paste bugs; product info lives only in sliders.
4. **"World of Spice" has no world in it.** The page that should be the brand's signature moment is a carousel.
5. **Template residue:** beer and coffee products, Slashmint credits, placeholder CMS pages, and a Webflow-hosted video.
6. **Motion vocabulary from ~2019:** fade-in-on-scroll everything, generic easing, and no shared-element continuity between pages.

---

## 2. The plan

### 2.1 Brand voice → design principles
| Voice | Principle | How it shows up |
|---|---|---|
| *"Every jar is a passport"* | **Place first** | Every spice has an origin region, a place name, and a pin on the globe |
| Playful taglines (*"A Little Naughty, Very Nice"*, *"Zest with a Zap"*) | **Let the labels talk** | Label taglines are the headline under every product name |
| Market-stall abundance | **Immersive, not cluttered** | Dark, warm canvas; one hero object per view; detail on demand (sheets, `<details>`) |
| Cooking traditions | **Cook-ready** | One recipe per jar, with a checklist, steps, and Recipe schema |

### 2.2 Design system (`css/pos.css`)
**Colour.** One dominant colour (forest), one text colour (cream), one accent (gold foil), and per-spice label colours used only as glows and highlights.

| Token | Hex | Use |
|---|---|---|
| `--forest-950` | `#001a0d` | Canvas (unchanged brand green) |
| `--forest-900 / 800 / 700` | `#04251a` `#0c3324` `#184332` | Surfaces, ocean, cards |
| `--cream` | `#fff5e8` | Text |
| `--tan` | `#f8ddaf` | Italic emphasis |
| `--gold` | `#d6b26a` | Label foil: eyebrows, pins, primary button |
| `--paprika` | `#c2462b` | Heat meter, hot accents |
| `--accent` (per spice) | from label | Jar glow, globe region glow, tag dots |

**Type.** Playfair Display (display, with italic emphasis) and **Jost** (body; a geometric humanist face close to the label tagline font). That's 2 families instead of 11, with a fluid `clamp()` scale from `--step--1` to `--step-5`.

**Components.** Header (solid on scroll, hides on scroll-down), full-screen circular-reveal menu, buttons, filter chips, ingredient tags, 5-chile heat meter, jar art, product card, recipe card, feature recipe, checklist, numbered steps, newsletter, footer.

**Motion.** Expo-out easing (`cubic-bezier(.16,1,.3,1)`) everywhere.
- Staggered reveals via `--i`.
- **Cross-document View Transitions**: the jar morphs from the grid card into the spice page hero.
- View-transition re-flow when filters change.
- Hero image settle.
- Greeting marquee.
- Pointer-tilt jars on desktop.
- All of it disabled under `prefers-reduced-motion`.

**Art direction: moody with vibrant popping colour** (reference: Behance *The Spice Trade*, used as mood only)
- **The arch is the signature shape.** It echoes the label cartouche and appears in jar frames, the Spice Rack hero, and the detail panels.
- **Jar still life.** Every product sits on a stone plinth, in a mound of its own spice, framed by a lit arched window, on a **deep pigment field made from its label colour**: sumac, verde, saffron violet, chili red. The forest-green base keeps the pages moody, and the pigments supply the pops.
- **Light and texture.** Diagonal window-light shafts, floor shadows, vignettes, and visible film grain.
- **Spice pages** turn the whole hero into that spice's pigment field.
- **The Spice Rack hero** is a stone wall with three arched windows onto one desert vista, with jars on plinths in the centre arch.
- **Photography to commission:** jars half-buried in mounds of their own spice, saturated pigment backdrops, market and harvest scenes (Marrakech souk, saffron crocus, sun-dried chiles), and hard window light.

### 2.3 Sitemap
```
/                       Home (Phase 2 rebuild)
/world-of-spice         ★ Interactive globe: every spice pinned to its tradition
/shop  (Spice Rack)     All products, filter by collection / New for 2026 / search
/spices/<slug>          Spice page: jar, tagline, heat, origin, in-the-jar, pairs-with, recipe
/recipes                Recipe index, filter by region / quick / spicy / sweet / search
/recipes/<slug>         Recipe: hero, stats, ingredient checklist, method, the spice, newsletter
/about                  Our Story (Phase 2)
/contact-us             Contact (Phase 2 restyle, keep Airtable wiring)
/where-to-buy           Store finder (Phase 3, replaces the "Find Stores" tile)
```

### 2.4 World of Spice globe
**Concept.** A dotted-grain globe (land drawn as thousands of "spice grains") floating in the brand's forest green. **22 region pins** stand in for 44 spices; pins cluster when they crowd and break apart as you zoom. Picking a spice lights up its region in that jar's label colour.

| | Mobile (first) | Tablet / landscape phone | Desktop |
|---|---|---|---|
| Globe | Top 60% of the screen, drag to spin, pinch to zoom | Left side | Centred between the two panels, re-centres as panels open |
| Browse | Collection chips and a **swipe rail** of jars at the thumb. Swiping flies the globe to each spice. | Vertical rail on the right | Floating glass "Spice atlas" list on the left |
| Detail | Bottom **sheet** (drag down to dismiss), with the globe shrunk above it | Side sheet | Floating panel on the right |
| Per spice | Jar, collection, name, label tagline, origin, **heat (0–5 chiles)**, flavour notes, **"In the jar" ingredient tags**, story, **recipe card** with expandable ingredients and method, CTAs to the full recipe and the spice page | same | same |

Deep links: `/world-of-spice#zaatar` opens a spice and `#italy` opens a region. Spice pages link back with *"See it on the globe."*

Tech: no dependencies.
- Hand-rolled orthographic projection on `<canvas>`.
- Land dots pre-baked from Natural Earth 1:110m at build time (`data/globe-dots.js`, 28 KB).
- Pins are real `<button>`s with labels.
- Keyboard: arrow keys step through spices; Esc closes.

### 2.5 CMS model
`content/*.json` is the source of truth today, and it maps 1:1 to Airtable tables (the site already has an Airtable integration). Phase 2 can have `scripts/build.mjs` read from Airtable instead of JSON, with no template changes.

| Table | Key fields |
|---|---|
| **Products** | `id`, `sku`, `name`, `collection→`, `region→`, `origin`, `tagline`, `heat (0–5)`, `notes[]`, `ingredients[]`, `story`, `pairsWith[]`, `recipe→`, `image`, `color` |
| **Recipes** | `id`, `title`, `product→`, `serves`, `prep`, `cook`, `rest`, `summary`, `image`, `equipment[]`, `ingredients[]`, `steps[]`, `featured` |
| **Regions** | `id`, `name`, `places`, `lat`, `lng`, `story` |
| **Collections** | `id`, `name`, `short`, `format`, `blurb` |

Workflow: edit the content, run `npm run build`, commit. Cloudflare Pages deploys the static output.

New product photography goes in `images/products/<slug>.webp` and overrides the deck renders. `scripts/extract-deck-jars.py` regenerates the renders and label colours from any future line-review deck.

### 2.6 Roadmap
| Phase | Scope |
|---|---|
| **1 · This PR** | Design system, motion layer, globe page, Spice Rack, 44 spice pages, recipe index, 44 recipe pages, CMS JSON, build and image scripts |
| **2 · Home + story** | Rebuild `index.html` on the new system: a slow-pan hero using the existing *people_of_spice_ai_sequence* video; a "Where in the world?" globe teaser; new-for-2026 collection shelves; featured recipes; greeting marquee; IG. Rebuild About and Contact. Remove jQuery, Swiper, Materialize, and the Webflow runtime site-wide. |
| **3 · Commerce & reach** | Where-to-buy / retailer links per SKU, gift sets, Airtable-driven build, sitemap.xml, OG images per spice, newsletter double opt-in |
| **Clean-up** | Delete template leftovers (`detail_*.html`, beer and coffee assets, Slashmint credits, `airtable-test.html`, `test-airtable.html`, `style-guide.html`) and self-host the Webflow-hosted hero video |

### 2.7 Open items for the brand team
1. **Ingredient statements.** Blend ingredient lists on the site are drafted from each flavour profile. They **must be replaced with the label-approved ingredient and allergen statements** before launch (e.g. Caesar-Style lists Parmesan, which is a milk allergen).
2. **Product photography.** The 2026 jars are rendered from the deck label art on an empty jar. Eight SKUs use the deck's filled-jar photos. Drop final photos into `images/products/` and rebuild.
3. **Recipe photography.** Five recipes have photos, plus the existing salmon and noodle-bowl shots. The rest use jar art until we shoot them.
4. **Origins.** The regions are the *culinary tradition* each blend is inspired by, not where the spice was grown. Packing origin is Vietnam, per the deck. Confirm the stories (e.g. Læsø smoked salt, Tijuana Caesar) with the brand.
5. **Heat levels.** These are first-pass 0–5 ratings; product development should confirm them.
6. **Where to buy.** Retailers and prices for each SKU (Phase 3).

---

## 3. What shipped in Phase 1 (this branch)
- `css/pos.css`, `css/globe.css`, `js/pos.js`, `js/globe.js`: new design system, motion, and globe
- `content/` (the CMS) and `scripts/build.mjs`, which generate `shop.html`, `spices/*.html`, `recipes.html`, `recipes/*.html`, `world-of-spice.html`, and `data/globe-dots.js`
- `scripts/extract-deck-jars.py`, which produced `images/products/*.webp` (39 SKUs) and `content/label-colors.json` from the 5.6.2026 deck
- `images/brand/pos-logo-cream.png`: crisp cream logo from the deck artwork, replacing the 222 px PNG
- Fixed the copy bugs in the five legacy recipes; their URLs are unchanged
