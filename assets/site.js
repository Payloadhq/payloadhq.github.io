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
