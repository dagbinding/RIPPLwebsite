/* ============================================================
   RIPPL site loader — self-injecting, shared across all pages.

   Usage: place as the FIRST child of <body> on any page:
     <script src="assets/loader.js"></script>

   It injects a full-screen cream overlay with the animated
   twin-loop RIPPL mark, then fades out once the page is ready.
   ============================================================ */
(function () {
  if (document.getElementById('rippl-loader')) return; // guard against double-include

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Styles ── */
  var style = document.createElement('style');
  style.textContent =
    '#rippl-loader{position:fixed;inset:0;z-index:9999;background:#F2EBDC;display:flex;align-items:center;justify-content:center;transition:opacity .6s cubic-bezier(.22,1,.36,1)}' +
    '#rippl-loader.is-dismissed{opacity:0;pointer-events:none}' +
    '#rippl-loader .loader-mark{width:clamp(180px,36vw,300px);height:clamp(180px,36vw,300px);display:block;overflow:visible;user-select:none}' +
    '#rippl-loader .loader-loop{cursor:pointer}' +
    '@media (prefers-reduced-motion:reduce){#rippl-loader .loader-loop{cursor:default}}';
  document.head.appendChild(style);

  /* ── Overlay markup — inserted as first child of body, no flash ── */
  var loader = document.createElement('div');
  loader.id = 'rippl-loader';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-label', 'Loading RIPPL');
  loader.innerHTML =
    '<svg class="loader-mark" viewBox="-150 -150 300 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<g class="loader-loop" id="loader-loop-left">' +
        '<circle r="78" fill="transparent" stroke="none"></circle>' +
        '<image href="assets/loader-loop.png" x="-80" y="-80" width="160" height="160" preserveAspectRatio="xMidYMid meet"></image>' +
      '</g>' +
      '<g class="loader-loop" id="loader-loop-right">' +
        '<circle r="78" fill="transparent" stroke="none"></circle>' +
        '<image href="assets/loader-loop.png" x="-80" y="-80" width="160" height="160" preserveAspectRatio="xMidYMid meet"></image>' +
      '</g>' +
    '</svg>';
  var body = document.body;
  body.insertBefore(loader, body.firstChild);

  /* ── Spring physics — underdamped harmonic oscillator (k=100, c=6.5) ── */
  function mkSpring(k, c) { return { k: k, c: c, pos: 0, vel: 0, target: 0 }; }
  function stepSpring(sp, dt) {
    var a = -sp.k * (sp.pos - sp.target) - sp.c * sp.vel;
    sp.vel += a * dt;
    sp.pos += sp.vel * dt;
  }
  function atRest(sp, tol) {
    return Math.abs(sp.pos - sp.target) < tol && Math.abs(sp.vel) < tol;
  }

  /* ── Loop descriptors — centre + base rotation + flip direction ── */
  var LOOPS = [
    { cx: -33, cy: -6, initAngle: 0,   flipAngle: 180,  g: loader.querySelector('#loader-loop-left'),  sp: mkSpring(100, 6.5), hovered: false },
    { cx:  28, cy: 26, initAngle: 180, flipAngle: -180, g: loader.querySelector('#loader-loop-right'), sp: mkSpring(100, 6.5), hovered: false }
  ];

  function applyTransforms() {
    LOOPS.forEach(function (loop) {
      var angle = loop.initAngle + loop.sp.pos;
      loop.g.setAttribute('transform', 'translate(' + loop.cx + ' ' + loop.cy + ') rotate(' + angle.toFixed(3) + ')');
    });
  }
  applyTransforms();

  /* ── Animation loop ── */
  var TOL = 0.06, raf = null, lastT = null;
  function tick(now) {
    var dt = lastT !== null ? Math.min((now - lastT) / 1000, 0.05) : 0.016;
    lastT = now;
    LOOPS.forEach(function (loop) { stepSpring(loop.sp, dt); });
    applyTransforms();
    if (LOOPS.every(function (loop) { return atRest(loop.sp, TOL); })) {
      LOOPS.forEach(function (loop) { loop.sp.pos = loop.sp.target; loop.sp.vel = 0; });
      applyTransforms();
      raf = null; lastT = null;
    } else {
      raf = requestAnimationFrame(tick);
    }
  }
  function startAnim() { if (!raf) { lastT = null; raf = requestAnimationFrame(tick); } }

  /* ── Idle animation — stagger-flip out, hold, flip back, repeat ── */
  var STAGGER = 200, POST_FLIP = 1300;
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var idleSeqId = 0, idleTimer = null;

  function cancelIdle() { idleSeqId++; clearTimeout(idleTimer); idleTimer = null; }
  function scheduleIdle() {
    if (reduceMotion) return;
    if (LOOPS.some(function (l) { return l.hovered; })) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { runIdleLoop(++idleSeqId); }, 1000);
  }
  async function runIdleLoop(seqId) {
    var ok = function () { return seqId === idleSeqId && LOOPS.every(function (l) { return !l.hovered; }); };
    while (true) {
      if (!ok()) break;
      LOOPS[0].sp.target = LOOPS[0].flipAngle; startAnim();
      await sleep(STAGGER);
      if (!ok()) break;
      LOOPS[1].sp.target = LOOPS[1].flipAngle; startAnim();
      await sleep(POST_FLIP);
      if (!ok()) break;
      LOOPS[0].sp.target = 0; startAnim();
      await sleep(STAGGER);
      if (!ok()) break;
      LOOPS[1].sp.target = 0; startAnim();
      await sleep(POST_FLIP);
    }
  }

  /* ── Interaction — hover (and touch toggle) per loop ── */
  if (!reduceMotion) {
    LOOPS.forEach(function (loop) {
      loop.g.addEventListener('mouseenter', function () {
        loop.hovered = true; cancelIdle();
        loop.sp.target = loop.flipAngle; startAnim();
      });
      loop.g.addEventListener('mouseleave', function () {
        loop.hovered = false;
        LOOPS.forEach(function (l) { if (!l.hovered) l.sp.target = 0; });
        startAnim(); scheduleIdle();
      });
      loop.g.addEventListener('touchstart', function (e) {
        e.preventDefault();
        loop.hovered = true; cancelIdle();
        loop.sp.target = Math.abs(loop.sp.target) > 90 ? 0 : loop.flipAngle; startAnim();
      }, { passive: false });
      loop.g.addEventListener('touchend', function () {
        loop.hovered = false; scheduleIdle();
      });
    });
    scheduleIdle();
  }

  /* ── Dismiss on page ready (held ~2s extra so the mark is seen) ── */
  function dismissLoader() {
    cancelIdle();
    loader.classList.add('is-dismissed');
    setTimeout(function () { if (loader.parentNode) loader.remove(); }, 600);
  }
  if (document.readyState === 'complete') {
    setTimeout(dismissLoader, 2400);
  } else {
    window.addEventListener('load', function () { setTimeout(dismissLoader, 2000); });
  }
})();
