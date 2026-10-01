/* RIPPLiQ feedback overlays: the 2272 ride (rider points, board points and 14
   named joints per frame, 10 fps) and the few ways the overlays draw it.
   Exported by export_ride.py from ~/Projects/surf-motion-3d.

   IQ.load(url)                    -> Promise<ride>
   IQ.view(ride, o)                -> project(x, y, z) -> [sx, sy, depth]
   IQ.points(ctx, ride, t, view, o) draw the rider + board as points
   IQ.skeleton(ctx, ride, t, view, o) draw the joints and bones; returns the
                                   joints on screen, so labels can pin to them
   IQ.joints(ride, t)              the 14 joints at t, interpolated
   IQ.angle(J, a, b, c)            angle at b in degrees
   IQ.at(ride, series, t)          a per-frame series at t
   IQ.centreAt(ride, t)            the rider's centre at t

   Smooth by construction: the pose model rebuilds the body independently at
   10 fps, so every frame (points, joints, centre) is first smoothed over its
   neighbours (binomial 1-4-6-4-1, about 0.1 s each side), then played back
   through Catmull-Rom curves rather than straight lines between frames.
*/
var IQ = (function () {
  var NAMES = ['head', 'neck', 'l_shoulder', 'r_shoulder', 'l_elbow', 'r_elbow', 'l_wrist', 'r_wrist',
               'l_hip', 'r_hip', 'l_knee', 'r_knee', 'l_ankle', 'r_ankle'];
  var J = {}; NAMES.forEach(function (n, i) { J[n] = i; });
  var BONES = [['head', 'neck'], ['neck', 'l_shoulder'], ['neck', 'r_shoulder'],
               ['l_shoulder', 'l_elbow'], ['l_elbow', 'l_wrist'], ['r_shoulder', 'r_elbow'], ['r_elbow', 'r_wrist'],
               ['l_shoulder', 'l_hip'], ['r_shoulder', 'r_hip'], ['l_hip', 'r_hip'],
               ['l_hip', 'l_knee'], ['l_knee', 'l_ankle'], ['r_hip', 'r_knee'], ['r_knee', 'r_ankle']]
    .map(function (b) { return [J[b[0]], J[b[1]]]; });

  // Smooth a list of equal-length frames over time, ends clamped.
  var KERNEL = [1, 4, 6, 4, 1];
  function smoothFrames(frames) {
    var n = frames.length, len = frames[0].length, out = [];
    for (var f = 0; f < n; f++) {
      var o = new Float32Array(len), wsum = 0;
      for (var k = -2; k <= 2; k++) {
        var src = frames[Math.max(0, Math.min(n - 1, f + k))], w = KERNEL[k + 2]; wsum += w;
        for (var i = 0; i < len; i++) o[i] += src[i] * w;
      }
      for (i = 0; i < len; i++) o[i] /= wsum;
      out.push(o);
    }
    return out;
  }
  function cr(p0, p1, p2, p3, m) {
    var m2 = m * m, m3 = m2 * m;
    return 0.5 * (2 * p1 + (p2 - p0) * m + (2 * p0 - 5 * p1 + 4 * p2 - p3) * m2 + (3 * p1 - p0 - 3 * p2 + p3) * m3);
  }

  function rnd(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

  function load(url) {
    return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      return fetch(url.replace(/\.json$/, '.bin')).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
        var all = new Int16Array(buf), u = d.unit, per = d.n * 3, bper = d.outline * 3, off = d.frames * per;
        var total = d.n + d.outline, pts = [], skel = [];
        for (var f = 0; f < d.frames; f++) {
          var o = new Float32Array(total * 3), r = all.subarray(f * per, (f + 1) * per), b = all.subarray(off + f * bper, off + (f + 1) * bper);
          for (var i = 0; i < r.length; i++) o[i] = r[i] * u;
          for (i = 0; i < b.length; i++) o[r.length + i] = b[i] * u;
          pts.push(o);
          var s = new Float32Array(42);
          for (i = 0; i < 42; i++) s[i] = d.skeleton[f * 42 + i] * u;
          skel.push(s);
        }
        pts = smoothFrames(pts); skel = smoothFrames(skel);
        // Centre of the rider, averaged over the ride, and per frame.
        var c = [0, 0, 0], k = 0, centres = [];
        pts.forEach(function (fr) {
          var fc = [0, 0, 0];
          for (var i = 0; i < per; i += 3) { fc[0] += fr[i]; fc[1] += fr[i + 1]; fc[2] += fr[i + 2]; }
          fc = fc.map(function (v) { return v / d.n; });
          centres.push(fc); c[0] += fc[0]; c[1] += fc[1]; c[2] += fc[2]; k++;
        });
        c = c.map(function (v) { return v / k; });
        centres = smoothFrames(centres);
        // Which leg leads: the ankle further toward the nose (+x), over the ride.
        var lx = 0, rx = 0;
        skel.forEach(function (s) { lx += s[J.l_ankle * 3]; rx += s[J.r_ankle * 3]; });
        var front = rx > lx ? 'r' : 'l', back = front === 'r' ? 'l' : 'r';
        var order = []; for (var i = 0; i < total; i++) order.push(i);
        for (i = order.length - 1; i > 0; i--) { var j = Math.floor(rnd(i) * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
        return { fps: d.fps, frames: d.frames, duration: d.frames / d.fps, n: d.n, total: total,
                 pts: pts, skel: skel, centre: c, centres: centres, order: order,
                 roll: d.roll, pitch: d.pitch, height: d.height, speed: d.speed, turn: d.turn,
                 front: front, back: back };
      });
    });
  }

  // The four frames around t seconds and the blend, clamped (no looping:
  // overlays pick their moment): [before, a, b, after, m].
  function fr(ride, t) {
    var f = Math.max(0, Math.min(ride.frames - 1.001, t * ride.fps)), a = Math.floor(f);
    return [Math.max(0, a - 1), a, a + 1, Math.min(ride.frames - 1, a + 2), f - a];
  }
  function at(ride, series, t) { var q = fr(ride, t); return cr(series[q[0]], series[q[1]], series[q[2]], series[q[3]], q[4]); }
  function curve(list, q, len) {
    var P = list[q[0]], A = list[q[1]], B = list[q[2]], N = list[q[3]], o = new Float32Array(len);
    for (var i = 0; i < len; i++) o[i] = cr(P[i], A[i], B[i], N[i], q[4]);
    return o;
  }
  function joints(ride, t) { return curve(ride.skel, fr(ride, t), 42); }
  function centreAt(ride, t) { var c = curve(ride.centres, fr(ride, t), 3); return [c[0], c[1], c[2]]; }
  function angle(P, a, b, c) {
    var ux = P[a * 3] - P[b * 3], uy = P[a * 3 + 1] - P[b * 3 + 1], uz = P[a * 3 + 2] - P[b * 3 + 2];
    var vx = P[c * 3] - P[b * 3], vy = P[c * 3 + 1] - P[b * 3 + 1], vz = P[c * 3 + 2] - P[b * 3 + 2];
    var d = (ux * vx + uy * vy + uz * vz) / (Math.hypot(ux, uy, uz) * Math.hypot(vx, vy, vz));
    return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
  }

  // A camera: orbit az about the vertical, tilt el down, light perspective.
  // o: { cx, cy, scale, az, el, centre }
  function view(ride, o) {
    var az = o.az != null ? o.az : Math.PI + 0.35, el = o.el != null ? o.el : 0.18, dist = 5;
    var ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
    var C = o.centre || ride.centre, cx = o.cx, cy = o.cy, s = o.scale;
    return function (x, y, z) {
      x -= C[0]; y -= C[1]; z -= C[2];
      var x1 = x * ca - y * sa, y1 = x * sa + y * ca;
      var y2 = y1 * ce - z * se, z2 = y1 * se + z * ce;
      var p = dist / (dist + y2);
      return [cx + x1 * s * p, cy - z2 * s * p, y2];
    };
  }

  // o: { ink, alpha, size, density, board (alpha of board points) }
  function points(ctx, ride, t, project, o) {
    o = o || {};
    var q = fr(ride, t), P = ride.pts[q[0]], A = ride.pts[q[1]], B = ride.pts[q[2]], N = ride.pts[q[3]], m = q[4];
    var alpha = o.alpha != null ? o.alpha : 1, s = o.size || 1.6, board = o.board != null ? o.board : 0.7;
    var show = Math.round(ride.total * (o.density != null ? o.density : 1));
    ctx.fillStyle = o.ink || '#F2EBDC';
    for (var k = 0; k < show; k++) {
      var n = ride.order[k], j = n * 3;
      var p = project(cr(P[j], A[j], B[j], N[j], m), cr(P[j + 1], A[j + 1], B[j + 1], N[j + 1], m), cr(P[j + 2], A[j + 2], B[j + 2], N[j + 2], m));
      ctx.globalAlpha = alpha * (n >= ride.n ? board : 1) * (0.5 + 0.5 * Math.max(0, Math.min(1, 0.5 - p[2] * 0.5)));
      ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  // o: { color, width, alpha, dot, joints (override), halo }
  function skeleton(ctx, ride, t, project, o) {
    o = o || {};
    var P = o.joints || joints(ride, t), S = [];
    for (var i = 0; i < 14; i++) S.push(project(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
    ctx.save();
    ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    var passes = o.halo ? [[o.halo, (o.width || 2) + 3], [o.color || '#F2EBDC', o.width || 2]] : [[o.color || '#F2EBDC', o.width || 2]];
    passes.forEach(function (ps) {
      ctx.strokeStyle = ps[0]; ctx.lineWidth = ps[1];
      ctx.beginPath();
      BONES.forEach(function (b) { ctx.moveTo(S[b[0]][0], S[b[0]][1]); ctx.lineTo(S[b[1]][0], S[b[1]][1]); });
      ctx.stroke();
    });
    ctx.setLineDash([]);
    if (o.dot) {
      ctx.fillStyle = o.color || '#F2EBDC';
      for (i = 0; i < 14; i++) {
        var r = i === J.head ? o.dot * 2.2 : o.dot;
        if (o.halo) { ctx.fillStyle = o.halo; ctx.beginPath(); ctx.arc(S[i][0], S[i][1], r + 1.5, 0, 6.2832); ctx.fill(); ctx.fillStyle = o.color || '#F2EBDC'; }
        ctx.beginPath(); ctx.arc(S[i][0], S[i][1], r, 0, 6.2832); ctx.fill();
      }
    }
    ctx.restore();
    return S;
  }

  // Size a canvas to its box; returns { ctx, w, h } and keeps it current.
  // onSize (optional) runs after every resize: draw-once canvases redraw there.
  function surface(canvas, onSize) {
    var s = { ctx: canvas.getContext('2d'), w: 0, h: 0, dpr: 1 };
    function size() {
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.w = canvas.clientWidth; s.h = canvas.clientHeight;
      canvas.width = Math.round(s.w * s.dpr); canvas.height = Math.round(s.h * s.dpr);
      if (onSize && s.w && s.h) onSize(s);
    }
    s.clear = function () { s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0); s.ctx.clearRect(0, 0, s.w, s.h); };
    size();
    new ResizeObserver(size).observe(canvas);
    return s;
  }

  // One moment as a still (fall-still.json, from export_still.py): the points
  // already smoothed, the camera centre, and the board series for readouts.
  function loadStill(url) {
    return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      var pts = new Float32Array(d.pts.length);
      for (var i = 0; i < pts.length; i++) pts[i] = d.pts[i] * d.unit;
      d.pts = pts; d.duration = d.frames / d.fps;
      return d;
    });
  }
  // o: { ink, alpha, size, board (alpha of board points) }
  function drawStill(ctx, still, project, o) {
    o = o || {};
    var P = still.pts, s = o.size || 1.6, alpha = o.alpha != null ? o.alpha : 1, board = o.board != null ? o.board : 0.7;
    ctx.fillStyle = o.ink || '#F2EBDC';
    for (var k = 0; k < still.total; k++) {
      var j = k * 3, p = project(P[j], P[j + 1], P[j + 2]);
      ctx.globalAlpha = alpha * (k >= still.n ? board : 1) * (0.5 + 0.5 * Math.max(0, Math.min(1, 0.5 - p[2] * 0.5)));
      ctx.fillRect(p[0] - s / 2, p[1] - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  return { load: load, loadStill: loadStill, drawStill: drawStill, view: view, points: points, skeleton: skeleton, joints: joints, angle: angle, at: at, centreAt: centreAt,
           surface: surface, J: J, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches };
})();
