// Shared behaviour for the waitlist concepts. The forms are prototypes:
// submitting shows the success state but sends nothing anywhere.
(function () {
  var SHARE_URL = 'https://www.ripplsurf.com/waitlist';

  // Two frames so the entrance transition runs; the timeout covers tabs opened in the background.
  var ready = function () { document.documentElement.classList.add('is-ready'); };
  requestAnimationFrame(function () { requestAnimationFrame(ready); });
  setTimeout(ready, 150);

  // Swap one panel for the next and move focus to its heading.
  function show(from, to) {
    from.hidden = true;
    to.hidden = false;
    to.classList.add('swap-in');
    var h = to.querySelector('[tabindex="-1"]');
    if (h) h.focus();
  }

  document.querySelectorAll('form[data-waitlist]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var btn = form.querySelector('button[type="submit"]');
      var label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Joining…';
      setTimeout(function () {
        btn.disabled = false;
        btn.innerHTML = label;
        show(form.closest('[data-step]') || form, document.getElementById(form.dataset.waitlist));
      }, 500);
    });
  });

  // "Next" / "Skip" buttons inside multi-step success panels.
  document.querySelectorAll('[data-goto]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      show(b.closest('[data-step]'), document.getElementById(b.dataset.goto));
    });
  });

  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var done = function () {
        b.textContent = 'Link copied';
        setTimeout(function () { b.textContent = 'Copy link'; }, 2000);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(SHARE_URL).then(done, done);
      else done();
    });
  });

  document.querySelectorAll('[data-share]').forEach(function (b) {
    if (!navigator.share) { b.hidden = true; return; }
    b.addEventListener('click', function () {
      navigator.share({ title: 'RIPPL', text: 'Free surf sensor for the first testers — join the RIPPL waitlist.', url: SHARE_URL }).catch(function () {});
    });
  });
})();
