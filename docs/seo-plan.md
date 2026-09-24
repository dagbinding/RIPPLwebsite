# RIPPL SEO plan

Living plan for ripplsurf.com SEO work. Branch: `seo`.
Source: SEO audit run 2026-09-24 against the live site (Netlify, `https://www.ripplsurf.com`, identical to `index.html` on `main`).

Tick items as they land (`- [x]`) and add the commit hash. Every change still follows `CLAUDE.md` — design system, responsive rules, verification at 390px.

---

## Baseline (2026-09-24)

| Check | Status |
|---|---|
| HTTPS, apex → www, brotli | Pass |
| `robots.txt`, `sitemap.xml` | 404 |
| Canonical tags | None — `/` and `/index.html` both 200 |
| Meta description / Open Graph / Twitter cards | None on any page |
| Favicon | 404 |
| Structured data | None |
| Dev/test pages publicly live | `surf_game.html`, `sense_test2.html`, `_intel_preview.html` (duplicate of home), `Session Map.html`, `CLAUDE.md`, `README.md`, `/uploads/` (63MB) |
| Homepage weight | ~10MB: hero bg 3.4MB, `IMG_7307.jpeg` 2.5MB, `watch-app.png` 2.2MB, `sensor-board-tail.png` 1.4MB, 6× OTF fonts ~1.3MB |
| Caching | `max-age=0` on all assets |
| Homepage indexable copy | 457 words; H1 contains no "surf" / "sensor" / "RIPPL" |
| Brand SERP ("RIPPL surf sensor") | ~5th, below patents and rip-current papers |

Competitors benchmarked: [Gone Surfing](https://gonesurfing.app/), [Dawn Patrol](https://www.dawnpatrol.cloud/app) — both have meta, canonical, robots, sitemap, schema, and guide content. RIPPL's differentiator: **board-mounted sensor, centimeter precision** vs watch-only trackers.

---

## Stage 1 — Quick wins (≈ half a day)

Goal: fix everything that's actively hurting indexing, sharing, and speed.

- [ ] **1.1 Head metadata** on `index.html` and `Tester Signup.html`
  - Unique `<title>` with keyword (home e.g. "RIPPL — Surf Sensor & AI Surf Coach"; signup e.g. "Join the RIPPL Surf Sensor Tester Program")
  - `<meta name="description">` 150–160 chars
  - `rel="canonical"` → `https://www.ripplsurf.com/…`
  - Open Graph + Twitter `summary_large_image`, with a 1200×630 share image (film photo + wordmark, per design system)
  - Favicon set (`favicon.ico`, 32px PNG, `apple-touch-icon`) + `theme-color`
- [ ] **1.2 Crawl control & cleanup**
  - Add `robots.txt` (disallow test pages, `/uploads/`) pointing to the sitemap
  - Add `sitemap.xml` (home + waitlist only)
  - Stop publishing dev files: move test pages to `archive/`, and set a Netlify publish dir / ignore so `CLAUDE.md`, `README.md`, `docs/`, `uploads/`, `archive/`, `hero-lab/` aren't served
- [ ] **1.3 Image weight**
  - Hero bg → AVIF/WebP ≤ ~300KB; PNG screenshots → WebP; right-size to max rendered width (2× DPR)
  - `width`/`height` on every `<img>`; `loading="lazy"` + `decoding="async"` below the fold; `fetchpriority="high"` on the LCP image
- [ ] **1.4 Fonts** — convert Inter OTFs to `woff2`, only load weights actually used, preload the 2–3 above-the-fold weights
- [ ] **1.5 Structured data** — JSON-LD `Organization`, `WebSite`, `Product` (RIPPLsense, pre-order/waitlist availability)
- [ ] **1.6 On-page fixes**
  - H1: keep the rotator, add a keyword-bearing line (visible or visually hidden) that says what RIPPL is
  - Descriptive `alt` on `IMG_7307.jpeg` and `P1040672_dg.jpeg` (×2)
  - Remove the Tweaks dev panel from production
  - Footer brand link `#` → `/`
- [ ] **1.7 Signup URL** — rename `Tester Signup.html` → `/waitlist`, 301 old URL(s), update all internal links + the PostHog `waitlist_cta_clicked` href check
- [ ] **1.8 Caching** — `netlify.toml` with long-lived `Cache-Control` on `/assets/*`, `/styles/fonts/*`
- [ ] **1.9 Loader vs LCP** — make sure the brand loader dismisses fast (or on first paint of hero) so it doesn't delay Largest Contentful Paint
- [ ] **1.10 Verify** — Lighthouse (mobile) before/after, Rich Results Test, OG preview check, 390px overflow check

**Done when:** Lighthouse SEO = 100, mobile performance meaningfully up, link previews render in iMessage/Slack/X, only intended URLs are crawlable.

---

## Stage 2 — Medium wins

Goal: give Google more real content to rank and win FAQ rich results.

- [ ] **2.1 FAQ section on the homepage**
  - Questions to answer (confirm facts with the team): what RIPPL is · how the sensor mounts / which boards · waterproofing & durability · battery life & charging · what it measures (and vs a watch) · does it need a phone in the water · Apple Watch / Android support · price & launch timing · how the tester program works · data & privacy
  - Design: matches site vocabulary (cream surface, Inter, accordion with 220ms ease-out, visible focus, reduced-motion fallback, readable at 390px)
  - Content visible in the DOM (not JS-injected) so it's indexable
- [ ] **2.2 `FAQPage` JSON-LD** mirroring the visible Q&A exactly
- [ ] **2.3 Signup page copy** — expand toward ~400 words: what testers get, who we're looking for, timeline
- [ ] **2.4 Search Console** — verify domain, submit sitemap, start tracking impressions/queries (baseline for Stage 3)

**Done when:** FAQ live and passing the Rich Results Test, Search Console collecting data.

---

## Stage 3 — Strategic wins (this quarter)

- [ ] **3.1 Comparison page** — "RIPPL vs watch surf trackers" (Apple Watch / Garmin apps): what a board sensor captures that a wrist can't. Targets *surf tracker*, *Apple Watch surf app vs sensor*, *Garmin surf tracking alternative*.
- [ ] **3.2 Pillar pages** — split into RIPPLsense, RIPPLintelligence, RIPPLsocial, each with its own title/meta/H1 and keyword cluster (*surfboard sensor* · *AI surf coach* · *surf leaderboard app*). Needs design.
- [ ] **3.3 Guides hub** — maneuver guides powered by RIPPL ride data (bottom turn, cutback, pop-up). Informational top-of-funnel; unique visuals via ride trails.
- [ ] **3.4 Digital PR / backlinks** — pitch surf media (American Surf Magazine, The Inertia, etc.), founder story, tester stories. Builds authority and fixes brand-SERP ambiguity (RIPPL vs "ripple"/"rip").
- [ ] **3.5 Real data** — connect Ahrefs or Similarweb (auth needed) + Search Console; replace the estimated keyword table below with real volume/difficulty and track rankings monthly.

---

## Target keywords (estimates — no volume data yet)

| Keyword | Difficulty | Opportunity | Intent | Where |
|---|---|---|---|---|
| surf sensor | Easy–mod | High | Commercial | Home |
| surfboard sensor | Easy | High | Commercial | Home / RIPPLsense |
| AI surf coach / surf coaching app | Moderate | High | Commercial | RIPPLintelligence |
| Apple Watch surf app vs sensor | Easy | High | Commercial | Comparison |
| RIPPL / RIPPLsense (brand) | Easy | High | Navigational | Home + schema |
| surf tracker | Hard | High | Commercial | Comparison |
| surf performance tracker | Easy–mod | High | Commercial | Home |
| surf session stats | Easy | Medium | Commercial | Feature page |
| surf wave count app | Moderate | Medium | Commercial | Comparison |
| surf leaderboard app | Easy | Medium | Commercial | RIPPLsocial |
| Garmin surf tracking alternative | Easy | Medium | Commercial | Comparison |
| surf beta tester / free surf sensor | Easy | Medium | Transactional | Waitlist |
| how to do a cutback / bottom turn | Moderate | Medium | Informational | Guides |
| how to improve at surfing | Hard | Medium | Informational | Guides |

---

## Log

| Date | Item | Commit | Notes |
|---|---|---|---|
| 2026-09-24 | Plan created | — | Audit baseline recorded |
