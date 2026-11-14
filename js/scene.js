/* PROJECT: Book Keeper — Website (The Book Keeper)
   FILE: js/scene.js · V1.0 · Part 1 of 1
   LOCATION: thebookkpr.github.io/js/scene.js
   V1.0: New beginning. Touch is attention, not command.
         - Tap near a lantern: it brightens and nearby lanterns answer
           one after another, then the light settles back.
         - Tap the round green door: the glow awakens, the lanterns
           light in a path toward it, and the page gently leads into
           /stories/.
         Works with css/effects.css (.is-lit, .is-awake). */

(function () {
  "use strict";

  var art = document.querySelector(".scene-art");
  if (!art) return;

  var door = art.querySelector(".door-link");
  var doorGlow = art.querySelector(".door-glow");
  var lanterns = Array.prototype.slice.call(art.querySelectorAll(".lantern"));

  var STAGGER_MS = 350;     // light travels, it does not appear at once
  var LINGER_MS = 6000;     // the visitor leaves a gentle mark (3 to 15 s)
  var ENTER_DELAY_MS = 1600;
  var timers = [];

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Only lanterns that are actually shown on this layout */
  function visibleLanterns() {
    return lanterns.filter(function (el) {
      return el.offsetParent !== null;
    });
  }

  function centerOf(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function distance(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function later(fn, ms) {
    timers.push(window.setTimeout(fn, ms));
  }

  /* Light lanterns in order of closeness to a point, one after another */
  function lightFrom(point, limit) {
    var list = visibleLanterns()
      .map(function (el) { return { el: el, d: distance(centerOf(el), point) }; })
      .sort(function (a, b) { return a.d - b.d; });

    if (typeof limit === "number") list = list.slice(0, limit);

    list.forEach(function (item, i) {
      later(function () { item.el.classList.add("is-lit"); }, i * STAGGER_MS);
      later(function () { item.el.classList.remove("is-lit"); },
            i * STAGGER_MS + LINGER_MS);
    });
    return list.length * STAGGER_MS;
  }

  /* Tap anywhere on the painting: the nearest lantern notices, others answer */
  art.addEventListener("pointerdown", function (e) {
    if (door && door.contains(e.target)) return;
    var nearest = null, best = Infinity, p = { x: e.clientX, y: e.clientY };

    visibleLanterns().forEach(function (el) {
      var d = distance(centerOf(el), p);
      if (d < best) { best = d; nearest = el; }
    });

    if (nearest && best < nearest.getBoundingClientRect().width * 0.9) {
      lightFrom(centerOf(nearest), 3);
    }
  });

  /* The door: awaken, light the way, then step through */
  if (door) {
    door.addEventListener("click", function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button > 0) return;

      var href = door.getAttribute("href");
      if (reduceMotion) return;          // follow the link at once

      e.preventDefault();
      if (doorGlow) doorGlow.classList.add("is-awake");
      lightFrom(centerOf(door));

      later(function () { window.location.href = href; }, ENTER_DELAY_MS);
    });
  }

  /* Returning with the Back button: the world is calm again */
  window.addEventListener("pageshow", function () {
    timers.forEach(window.clearTimeout);
    timers = [];
    if (doorGlow) doorGlow.classList.remove("is-awake");
    lanterns.forEach(function (el) { el.classList.remove("is-lit"); });
  });
})();
