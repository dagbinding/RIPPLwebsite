# Handoff: RIPPL Site Loader

## Overview

This handoff describes a full-screen loading animation for the RIPPL marketing site. It displays the animated RIPPL brand mark while heavy assets (images, videos) load in the background, then fades out once the page is ready.

The reference design is self-contained in `RIPPL Loader Standalone.html` — open it in any browser to see the exact intended behaviour.

---

## About the Design Files

`RIPPL Loader Standalone.html` is a **high-fidelity design reference** built in plain HTML/SVG/JS — it is **not** production code to be shipped directly. Your task is to **recreate this design inside the existing site codebase**, using whatever framework, component model, and tooling is already in use. If no framework exists yet, plain HTML + vanilla JS is perfectly appropriate here (the design already is that).

---

## Fidelity

**High-fidelity.** The reference is pixel-complete with final colours, exact asset, spring physics parameters, and timing values. Recreate it faithfully. The only exception is the integration layer (how the loader mounts / unmounts) — that must be adapted to your site's lifecycle.

---

## What It Does

1. **On page load** — the loader overlays the entire viewport at `z-index: 9999`, cream background (`#F2EBDC`).
2. **After 1 second of idle** — the two RIPPL loops begin auto-animating: the left loop flips 180° clockwise, 200 ms later the right loop flips 180° counter-clockwise. Both have elastic spring physics with ~2 visible bounces.
3. **After 1.3 seconds** — both flip back in the same staggered order.
4. **The cycle repeats** indefinitely until dismissed.
5. **On hover** — the user can hover either loop individually to trigger/reverse the flip; idle animation pauses and resumes on mouse-out.
6. **When assets are ready** — the overlay fades out over 600 ms and is removed from the DOM.

---

## Implementation

### 1. The overlay element

Add this overlay as the first child of `<body>`:

```html
<div id="rippl-loader" style="
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #F2EBDC;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1);
">
  <!-- paste the SVG + script block from the reference here -->
</div>
```

### 2. Extract the animation from the reference

From `RIPPL Loader Standalone.html`, copy:
- The `<svg class="mark" ...>` element and its two `<g class="loop">` children
- The entire `<script>` block (spring physics + interaction + idle loop)
- The PNG image — it is base64-inlined in the standalone file; extract the data URI from the `href` attribute of either `<image>` element and keep it as-is

### 3. Dismiss on page ready

Add this script after the loader markup:

```js
function dismissLoader() {
  const loader = document.getElementById('rippl-loader');
  if (!loader) return;
  loader.style.opacity = '0';
  setTimeout(() => loader.remove(), 600);
}

// Dismiss when all assets (images, videos, fonts) are loaded
if (document.readyState === 'complete') {
  // Already loaded (e.g. cached page) — brief minimum display
  setTimeout(dismissLoader, 800);
} else {
  window.addEventListener('load', () => setTimeout(dismissLoader, 400));
}
```

The `setTimeout` ensures the loader shows for at least a brief moment even on fast connections — prevents a jarring flash.

### 4. Netlify-specific notes

- No server-side config needed — this is purely client-side.
- If you use Netlify's asset optimisation / JS bundling, make sure the loader script runs **before** your main bundle (it must be in `<head>` or early `<body>`, not deferred).
- If the site uses a SPA framework (React, Vue, Svelte, Astro), mount the loader in the root `index.html` outside the framework's mount point so it is visible before hydration completes.

---

## Design Tokens Used

| Property | Value |
|---|---|
| Background | `#F2EBDC` (RIPPL cream) |
| Mark colour | `#2E1E10` (RIPPL cocoa) — baked into the PNG |
| Overlay fade duration | `600ms` |
| Overlay easing | `cubic-bezier(0.22, 1, 0.36, 1)` (RIPPL ease-out) |
| Mark size | `300 × 300 px` (SVG, scales with viewport) |

---

## Spring Physics Parameters

These live in the `<script>` block. Do not change them unless intentional.

| Parameter | Value | Effect |
|---|---|---|
| `k` (stiffness) | `100` | Speed of the flip |
| `c` (damping) | `6.5` | Amount of bounce (ζ ≈ 0.325) |
| Flip angle — left loop | `+180°` (clockwise) | |
| Flip angle — right loop | `−180°` (counter-clockwise) | |
| Idle delay | `1000 ms` | Time before auto-animation starts |
| Stagger between loops | `200 ms` | |
| Hold time (upside-down) | `1300 ms` | Long enough for spring to settle |

---

## Assets

| Asset | Description | Location in standalone file |
|---|---|---|
| `Brown_tri.png` | RIPPL loop mark (PNG, transparent background, cocoa brown) | Base64 data-URI inlined into both `<image href="...">` elements |

To extract the PNG from the standalone file: open it in a browser → DevTools → Elements → find `<image href="data:image/png;base64,...">` → copy the data URI → paste into an `<img src="...">` tag or save via `fetch` + Blob.

---

## Files in This Package

| File | Purpose |
|---|---|
| `README.md` | This document |
| `RIPPL Loader Standalone.html` | Self-contained design reference — open in browser to preview |

---

## Questions?

Reference the live preview at `RIPPL Loader Standalone.html`. All timing, physics, and positioning values are documented above — no guesswork needed.
