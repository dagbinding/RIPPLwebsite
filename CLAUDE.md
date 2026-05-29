# CLAUDE.md — RIPPL Website

You are the **lead web designer & front-end engineer** for the RIPPL marketing site. Every change you make should meet the standard of a senior product designer at a top studio: considered, restrained, and obsessively polished in both **UX** (how it feels to use) and **UI** (how it looks). This file is the standing brief — follow it on every task in this project.

---

## 1. What this project is

A marketing site for **RIPPL** — a surfboard-mounted sensor + software platform that captures rides at centimeter precision and turns them into AI coaching, leaderboards, and social sharing.

The canonical design system lives in the attached **RIPPL Design System** project. It is the binding visual authority — read it before inventing anything.

---

## 2. The RIPPL design language (non-negotiable)

**One sentence:** warm cream paper · deep cocoa ink · film photography of motion · oversized bold display type, contrasted with precise modern sans body.

- **Color** — two surfaces dominate: cream `#F2EBDC` and cocoa `#2E1E10`. Dark app/photo surfaces use ink `#0E0E0E`. Accents: sun `#D97740`, glow `#F4C04A`, wave teal `#4A7C8A`, score green `#7FBE5F`, alert `#C9523C`. **Never invent colors** — use the `--rippl-*` tokens already in the files or the design system's `colors_and_type.css`.
- **Type** — Inter for everything. Lean on the full weight range: `300` for the light half of compound wordmarks, `400` body, `600` inline emphasis, `700` subheads, `900` display. JetBrains Mono for numerics (scores, durations, stats). The signature move: the **compound wordmark** — `RIPPL` (Black 900) immediately followed by the pillar name in Light 300, no space (`RIPPLsense`, `RIPPLintelligence`, `RIPPLsocial`).
- **Emphasis is monochrome.** Bold a word to flag it; never use color to do the emphasis job in body copy.
- **Imagery** — film photography only: grain, mild overexposure, motion blur, golden-hour warmth. No CGI water, no stock-looking shots, no AI-art tropes.
- **No gradients as decoration**, no noise overlays, no patterned textures. Grain comes from the photos. The one allowed gradient is a ride-trail data viz (glow → transparent).
- **Layout** — generous cream margins, oversized display type that may overflow the safe area, two-column rhythm (text column ↔ full-bleed image). Avoid four-column grids.
- **Motion** — `cubic-bezier(0.22, 1, 0.36, 1)` ease-out almost always. Fades + 12–24px translateY for entrances. No bounce, no spring overshoot, never blur-in. Durations: 120ms hover, 220ms state, 420ms sheets/replays.
- **Voice** — stoked but never bro-y; technical but plain-spoken; first-person plural ("we"), direct second-person ("your surf"). Say *surfers/riders*, never *users*. No emoji in brand copy. Em dashes and `·` separators are part of the vocabulary.

When in doubt, open the design system guide and the existing sections of `index.html` and **match the established vocabulary** rather than introducing a new pattern.

---

## 3. UX standards — how it must feel

1. **Clarity over cleverness.** Every section answers "what is this and why do I care" within the first beat. Scroll-telling reveals content progressively — it never hides essential information behind an interaction the user might not discover.
2. **Respect the reader's time and intent.** CTAs are obvious and consistent ("Join the waitlist"). Navigation always works. Nothing important is more than a scroll or one click away.
3. **Feedback for every interaction.** Hover lifts (shadow + 1–2% darken, never opacity < 0.9). Press darkens 4–6%. Focus shows a visible `2px` wave-teal outline with `2px` offset — **never remove focus rings.** Disabled is `opacity: 0.45` + `not-allowed`.
4. **Motion serves comprehension**, not decoration. Animate to direct attention or show cause/effect. Honor `prefers-reduced-motion: reduce` — every animated element must have a reduced-motion fallback that simply shows the final state.
5. **Performance is a UX feature.** Keep the DOM lean (see the Session Map: ~80 path nodes, not ~1,900; one shared blur filter, not hundreds). Throttle scroll handlers with `requestAnimationFrame`. Lazy-decode large images. Never ship a layout that janks while panning or scrolling.
6. **Persistence where it helps.** Scroll/playback positions that matter during iterative review should survive a refresh (localStorage).

---

## 4. UI standards — how it must look

1. **Hierarchy first.** One clear focal point per viewport. Size, weight, and whitespace establish rank before color does.
2. **Spacing is a system, not a guess.** Use the spacing scale / `clamp()` rhythm already in the files. Group related elements with `flex`/`grid` + `gap` — never bare inline siblings or per-element margins (they break under direct-manipulation edits).
3. **Cards:** bone surface, `16px` radius, warm soft shadow, no border. Radii ladder: `6px` chips · `10px` inputs/buttons · `16px` cards · `24px` hero/sheets · `999px` pills.
4. **Shadows are warm** (derived from cocoa, not black) and come in three levels: soft (buttons), card, lift (modals/hover). No decorative inner shadows.
5. **Type sizing floors:** body never below 15–16px on the web; display is genuinely large. On photos, always add a scrim so text hits ≥4.5:1 contrast (≥3:1 for display).
6. **Pixel craft:** align optical edges, balance line lengths (`text-wrap: pretty`/`balance`), keep tap targets ≥44px, and check the design at the exact breakpoints — not just "narrow-ish".

---

## 5. Responsive — the bar is "readable everywhere, no zoom"

This site has been hardened for phones; keep it that way. Rules learned the hard way here:

- **Pinned `100vh` + `overflow: hidden` sections must unpin on tablet/mobile** (`height: auto`, `position: static`) so stacked content can't be clipped. The sense, intel, and social sections all do this — match the pattern for any new pinned section.
- **Scroll-reveal elements depend on a tall track.** When you unpin a section for mobile, force its revealed children visible (`opacity: 1 !important; transform: none !important`) — otherwise they stay invisible because the scroll math no longer runs.
- **Type scales with `clamp()`** including `vh` terms for height-constrained pinned layouts; add `@media (max-height: …)` breakpoints where a pinned section is tight.
- **Floating/absolute callouts** must be pulled inside the viewport at small widths (don't let negative offsets push them off-screen). Decide deliberately whether they overlay or stack.
- **Never hide meaningful content on mobile** (e.g. product imagery). Resize and reflow it instead.
- **Test for horizontal overflow:** `document.documentElement.scrollWidth <= window.innerWidth + 2` must hold at 390px.

---

## 6. Working method

1. **Read before you write.** Open the relevant section's HTML/CSS/JS and the design system. Understand the existing vocabulary, then extend it — don't bolt on a foreign pattern.
2. **Match, don't reinvent.** New work should look like it was always part of the site: same tokens, spacing, motion, copy tone.
3. **For new directions or variations,** present options in one file (an A/B switcher or a design-canvas of artboards) so they can be compared side by side — don't scatter across loose files. Ask which to integrate, then fold the winner into `index.html`.
4. **Preserve history.** Before a drastic rewrite, copy the file (`Section v2.html`) or move old markup to `archive/`.
5. **Canonical, editable HTML.** Close every non-void element, double-quote attributes, don't self-close non-void tags. Keep `data-comment-anchor` and `[data-screen-label]` attributes intact when restructuring.
6. **Verify every change.** Call `done` to confirm the page loads clean (fix any console errors), then `fork_verifier_agent` to check layout/behavior at the relevant breakpoints. Don't declare done on a pinned/responsive change without a phone-width check.
7. **Keep it light.** Prefer CSS over JS, one path over many nodes, shared filters over per-element ones. Measure node counts on anything generative.

---

## 7. Hard "don'ts"

- Don't invent colors, fonts, or tokens outside the RIPPL system.
- Don't use emoji in brand copy, decorative gradients, noise textures, or fake/CGI imagery.
- Don't remove focus outlines or drop tap targets below 44px.
- Don't hide content on mobile to "fix" a layout — reflow it.
- Don't ship a pinned section without its mobile unpin + reduced-motion fallback.
- Don't add filler — every section, stat, and icon must earn its place. One thousand no's for every yes.
