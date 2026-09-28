/* Helpers shared by the three concepts. Landscape film (Surfshopsequence_v2, 14.39s):
     0–3.08s   wide: a board on the stands, a wall of boards behind (the quiver)
     3.08s     cut to the tail close-up
     ~4.5s     the mount drops into frame
     ~5.7s     the sensor follows
     ~7.7s     the mount lands on the tail
     ~8.3s     the sensor clicks into the mount; holds to the end
   Vertical film (Floatdown_vertical, 10.73s, 30fps) — used by A on portrait screens:
     0s tail close-up · ~1.1s mount drops in · ~2.1s sensor follows · ~4.75s seated; holds
   Chapters/steps change on the same moments in both: the snap starts when the
   sensor comes into frame, and the last beat when it's seated.
   Web encodes (scripts/encode_video.swift). */
var SB = (function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var portrait = matchMedia('(orientation: portrait)').matches;
  var src = '../../assets/video/sense-board-1600.mp4';
  var vertical = '../../assets/video/sense-board-vertical-608.mp4';

  // Calls fn(mediaTime) on every decoded frame (timeupdate only fires ~4x a second).
  function everyFrame(video, fn) {
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      var cb = function (now, meta) { fn(meta.mediaTime); video.requestVideoFrameCallback(cb); };
      video.requestVideoFrameCallback(cb);
    } else {
      video.addEventListener('timeupdate', function () { fn(video.currentTime); });
    }
  }
  // Runs onIn/onOut as `el` crosses `ratio` of itself on screen.
  function whenSeen(el, ratio, onIn, onOut) {
    new IntersectionObserver(function (e) {
      if (e[0].intersectionRatio >= ratio) onIn(); else if (onOut) onOut();
    }, { threshold: [0, ratio] }).observe(el);
  }
  // Seek, then run fn once the frame is there.
  function seek(video, t, fn) {
    var go = function () {
      video.addEventListener('seeked', function once() { video.removeEventListener('seeked', once); if (fn) fn(); });
      video.currentTime = t;
    };
    if (video.readyState >= 1) go(); else video.addEventListener('loadedmetadata', go, { once: true });
  }
  return { reduce: reduce, portrait: portrait, src: src, vertical: vertical, everyFrame: everyFrame, whenSeen: whenSeen, seek: seek };
})();
