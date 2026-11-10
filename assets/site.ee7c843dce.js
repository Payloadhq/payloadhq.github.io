// Payload — progressive enhancement: gentle reveal on scroll.
(function () {
  var els = document.querySelectorAll(".rv");
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach(function (e) { e.classList.add("on"); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add("on"); io.unobserve(en.target); }
    });
  }, { threshold: 0.12 });
  els.forEach(function (e) { io.observe(e); });
})();

/* Payload — featured products showcase (homepage): gentle auto-cycle with
   accessible controls; pauses on hover/focus; honors reduced motion. */
(function () {
  var root = document.querySelector("[data-showcase]");
  if (!root) return;
  var slides = Array.prototype.slice.call(root.querySelectorAll(".sc-slide"));
  var dots = Array.prototype.slice.call(root.querySelectorAll(".sc-dot"));
  var prev = root.querySelector(".sc-prev");
  var next = root.querySelector(".sc-next");
  if (slides.length < 2) return;
  var i = 0, timer = null;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function go(n) {
    slides[i].classList.remove("active");
    slides[i].setAttribute("aria-hidden", "true");
    if (dots[i]) dots[i].removeAttribute("aria-current");
    i = (n + slides.length) % slides.length;
    slides[i].classList.add("active");
    slides[i].removeAttribute("aria-hidden");
    if (dots[i]) dots[i].setAttribute("aria-current", "true");
  }
  function play() { if (reduce || timer) return; timer = setInterval(function () { go(i + 1); }, 6500); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  if (prev) prev.addEventListener("click", function () { stop(); go(i - 1); play(); });
  if (next) next.addEventListener("click", function () { stop(); go(i + 1); play(); });
  dots.forEach(function (d, di) { d.addEventListener("click", function () { stop(); go(di); play(); }); });
  root.addEventListener("pointerenter", stop);
  root.addEventListener("pointerleave", play);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", play);
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else play(); });
  play();
})();
