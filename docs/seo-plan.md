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

- [x] **1.1 Head metadata** on `index.html` and `Tester Signup.html`
  - Titles: "RIPPL — Surfboard Sensor & AI Surf Coach" · "Join the RIPPL Tester Program — Free Surf Sensor"
  - Descriptions (154 / 151 chars), canonical URLs (signup canonical is `/tester%20signup` until 1.7)
  - Open Graph + Twitter `summary_large_image` → `assets/og-image.jpg` (1200×630, 135KB). Cropped from `assets/follow_hd_corrected.jpg`, white wordmark bottom-left over a cocoa scrim; wordmark contrast 4.5:1 mean, 3.0:1 on brightest spray
  - Icons: `favicon.ico` (16/32/48), `assets/icons/icon-192.png`, `assets/icons/apple-touch-icon.png` — cream twin-loop mark on cocoa. `theme-color` #2E1E10
  - After merge: check previews with the LinkedIn Post Inspector / an iMessage or Slack paste (caches may need a refresh)
- [x] **1.2 Crawl control & cleanup**
  - `robots.txt` (allow all, points to sitemap). Removed pages are *not* disallowed, so Google can see they 404 and drop them
  - `sitemap.xml` (home + signup; update the signup URL in 1.7)
  - `netlify.toml` now builds with `scripts/build.py` and publishes `dist/`: only the two pages, `assets/`, `styles/`, robots, sitemap, and any `uploads/` files a page references. Test pages stay in the repo but are no longer served; `_intel_preview.html` 301s to `/`
  - Build fails if a page references a repo file the allowlist left out. When adding a new page or root file, add it to `PAGES` / `ROOT_FILES` in `scripts/build.py`
  - Local preview of exactly what ships: launch config `rippl-dist` (port 8733)
  - Found: `styles/colors_and_type.css` declares 17 font files that aren't in the repo. No live impact — neither page loads that stylesheet (both inline their own `@font-face`). Fold into 1.4
- [x] **1.3 Image weight** — homepage first load ~10MB → ~590KB (desktop, 2× screen)
  - `scripts/optimize_images.py` generates `assets/img/` from the untouched originals (WebP for photos, resized PNG for the logo and loader mark). Swapping a photo = edit `SOURCES`, rerun, commit
  - Hero: `image-set()` 2400w / 3200w by pixel density, preloaded with `fetchpriority="high"` (it's the LCP element)
  - Social film-edit photos: `srcset` + `sizes="(orientation: portrait) 150vh, 100vw"` so portrait phones get enough pixels for `object-fit: cover`
  - `width`/`height` on every `<img>`; `loading="lazy"` + `decoding="async"` below the fold. Logo rules that only set a height now also set `width: auto` (otherwise the attribute width wins)
  - Loader mark 1293px → 320px
  - Verified at 1920×1080 and 375×812: all rendered sizes identical to before, no 404s, no horizontal overflow
  - Not done: AVIF (would shave another ~30–40% but needs `image-set(type())` fallbacks). The original full-size files are still copied into `dist/`, which makes the deploy bigger but nothing downloads them
- [x] **1.4 Fonts** — 6 Inter OTFs 1.3MB → Latin-subset WOFF2 171KB (`scripts/subset_fonts.py`, needs `pip install fonttools brotli`)
  - First-screen weights preloaded: home 900/300/600, signup 900/400
  - `.bento__h` 800 → 900 (800 was never loaded, so it already rendered as 900 — no visual change)
  - Left alone: `styles/colors_and_type.css` still declares 17 missing fonts. It's the design system's copy and no page loads it — fix at source in the design system project
- [x] **1.5 Structured data** — JSON-LD `Organization` (logo, description, `sameAs` Instagram + TikTok) and `WebSite` on the homepage
  - `Product` deliberately left out: without a price, reviews or ratings Google reports it as an error in Search Console. Added to Stage 3 (3.6)
- [x] **1.6 On-page fixes**
  - H1 now starts with visually hidden text "RIPPL, the surfboard sensor and AI surf coach:" — design unchanged, read by screen readers and search engines
  - Alt text on the two distinct social photos; the repeated third photo stays `alt=""`
  - Tweaks panel (Claude Design editing leftover) removed — grain default was already 0.28 in CSS, so no visual change
  - Footer logo `#` → `/`; waitlist page home links `index.html` → `/` (avoids a duplicate `/index.html` URL)
- [x] **1.7 Signup URL** — `Tester Signup.html` → `waitlist.html`, served at `/waitlist` (canonical, OG URL, sitemap, internal links updated). 301s from `/Tester%20Signup.html`, `/Tester%20Signup`, `/tester%20signup(.html)`. PostHog `waitlist_cta_clicked` now matches `/waitlist` (verified firing). Page paths in PostHog change from `/Tester%20Signup.html` to `/waitlist` from deploy day
  - Local preview now uses `scripts/serve.py` (clean URLs like Netlify)
- [x] **1.8 Caching** — `netlify.toml` headers: `/assets/img/*` + `/assets/icons/*` 7 days (+1 day stale-while-revalidate), `/styles/fonts/*` 1 year immutable. HTML left on Netlify's revalidate default. Names aren't content-hashed: rename an image if a change must show immediately
- [x] **1.9 Loader vs LCP** — the loader used to wait for the full `load` event (every image + the Tally iframe) plus 2s. Now it lifts when fonts + preloaded hero images are ready, minimum 1.2s on screen, hard cap 4s. Uses `onload`, not `decode()` (decode stalls in background tabs). Signup hero bg is now preloaded too
- [x] **1.10 Verify** (2026-09-24, Lighthouse 12, mobile)
  - Deploy preview (`deploy-preview-1--idyllic-pixie-34b71f.netlify.app`): build publishes only `dist/`; test pages, `CLAUDE.md`, `docs/`, `uploads/`, `scripts/`, `.claude/` all 404; old signup URLs + `_intel_preview.html` 301 correctly; cache headers applied; brotli on
  - Real throttling (devtools, median of 3), live vs new build — homepage: **LCP 5.3s → 2.2s**, perf 80 → 92, page weight 12.5MB → 1.4MB. On a throttled phone the live site is still showing the loader at ~9s; the new build shows the page
  - Scores, live → new: SEO 91 → 100 (both pages), best practices 96 → 100, accessibility 95 / 100 unchanged
  - Caveat: Lighthouse's *simulated* throttling (what PageSpeed Insights shows) estimates homepage LCP ~6s, charging the wordmark for every image that starts downloading early. Scratch experiments (wordmark `fetchpriority`, dropping the CTA background) only moved it to 5.9s. Google ranks on real-user CrUX data, not this lab estimate; re-check PSI on production after merge
  - Deploy previews carry `x-robots-tag: noindex` and Netlify's feedback toolbar (~1.5MB), so don't read SEO/perf scores off preview links
- [ ] **1.11 Follow-ups** (non-blocking)
  - Homepage accessibility 95: `aria-required-children` — an element with an ARIA role is missing required child roles (pre-existing)
  - Simulated LCP: lazy-load the CTA background (IntersectionObserver), keep portrait phones on `hero-2400` instead of `hero-3200`, check whether the social section's lazy images start too early on mobile
  - After merge: run PageSpeed Insights on production and compare with CrUX once it has data

**Done when:** Lighthouse SEO = 100, mobile performance meaningfully up, link previews render in iMessage/Slack/X, only intended URLs are crawlable.

---

## Stage 2 — Medium wins

Goal: give Google more real content to rank and win FAQ rich results.

- [x] **2.1 FAQ section on the homepage** (branch `faq`) — 14 questions, between RIPPLsocial and the tester CTA. Option A (editorial two-column, sticky intro) chosen over B (numbered list); both kept in `archive/faq-options.html`
  - Copy confirmed with Dylan 2026-09-24: fits any board (a mount per board) · records with no phone in the water, watch optional for live feedback · works at any break and in wave pools · every level · multi-session battery (charging tech not public yet) · social sharing on the roadmap · "tester program starting soon" · pricing not announced, testers free
  - Left out on purpose: supported phones/watches (not decided), data/privacy (until there's a policy to link)
  - Native `<details>`: indexable, keyboard-accessible, no JS. Height animates where `::details-content` + `interpolate-size` are supported, instant elsewhere; reduced-motion honoured
  - Verified 1440 / 375 / 320px: no horizontal overflow, tap targets ≥ 78px, teal focus ring, Enter toggles
- [x] **2.2 `FAQPage` JSON-LD** — generated at build time by `scripts/build.py` from the visible FAQ (`<!-- build:faq-jsonld -->` placeholder), so markup and copy can't drift. Note: Google only shows FAQ rich results for government/health sites since 2023 — the markup is for Bing/AI assistants; the SEO value is the indexable copy itself
- [ ] **2.3 Signup page copy** — expand toward ~400 words: what testers get, who we're looking for, timeline
- [x] **2.4 Search Console** — Domain property `ripplsurf.com` (auto-verified via the existing Google Workspace TXT record), sitemap submitted 2026-09-24. `/` and `/waitlist` indexing requested

**Done when:** FAQ live and passing the Rich Results Test, Search Console collecting data.

---

## Stage 3 — Strategic wins (this quarter)

- [ ] **3.1 Comparison page** — "RIPPL vs watch surf trackers" (Apple Watch / Garmin apps): what a board sensor captures that a wrist can't. Targets *surf tracker*, *Apple Watch surf app vs sensor*, *Garmin surf tracking alternative*.
- [ ] **3.2 Pillar pages** — split into RIPPLsense, RIPPLintelligence, RIPPLsocial, each with its own title/meta/H1 and keyword cluster (*surfboard sensor* · *AI surf coach* · *surf leaderboard app*). Needs design.
- [ ] **3.3 Guides hub** — maneuver guides powered by RIPPL ride data (bottom turn, cutback, pop-up). Informational top-of-funnel; unique visuals via ride trails.
- [ ] **3.4 Digital PR / backlinks** — pitch surf media (American Surf Magazine, The Inertia, etc.), founder story, tester stories. Builds authority and fixes brand-SERP ambiguity (RIPPL vs "ripple"/"rip").
- [ ] **3.5 Real data** — connect Ahrefs or Similarweb (auth needed) + Search Console; replace the estimated keyword table below with real volume/difficulty and track rankings monthly.
- [ ] **3.6 Product markup** — when RIPPLsense has a price and orders open: add `Product` JSON-LD with an `Offer` (`price`, `priceCurrency`, `availability: PreOrder`). Unlocks price/availability in results and Merchant listings.

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
| 2026-09-24 | Plan created | 5730fa3 | Audit baseline recorded |
| 2026-09-24 | 1.2 Crawl control & cleanup | 70fedef | Takes effect once merged to `main` (pushing `main` deploys live) |
| 2026-09-24 | 1.1 Head metadata | 6bb7eb2 | Share image from the hero photo |
| 2026-09-24 | 1.3 Image weight | 992db8e | ~10MB → ~590KB first load |
| 2026-09-24 | 1.4 Fonts · 1.8 Caching · 1.9 Loader | 0d500f6 | Fonts 1.3MB → 171KB; loader lifts at ~1.2s |
| 2026-09-24 | 1.5 Schema · 1.6 On-page · 1.7 /waitlist | ce8d183 | Site now edited in Claude Code only (no more Claude Design exports) |
| 2026-09-24 | PostHog only on ripplsurf.com | 9159ee5 | Local + preview traffic no longer tracked |
| 2026-09-24 | 1.10 Verify | ac5bfc3 | LCP 5.3s → 2.2s (real throttling); SEO 100 |
| 2026-09-24 | Stage 1 live | c147cb2 | PR #1 merged to main |
| 2026-09-24 | 2.4 Search Console | — | Auto-verified; sitemap submitted |
| 2026-09-24 | 2.1 FAQ · 2.2 FAQPage | see git log | Branch `faq`; also fixes `posthog.capture` errors on non-production hosts |
