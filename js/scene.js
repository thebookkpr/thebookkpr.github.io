/* PROJECT: Book Keeper — Website (The Book Keeper)
   FILE: js/scene.js · V1.1 · Part 1 of 1
   LOCATION: thebookkpr.github.io/js/scene.js
   V1.1: Title and lore appear 5 seconds after load, leave after
         20 seconds, and leave on any tap. A moth crosses the scene
         every 20 seconds. Every tap makes a small golden magic. Calls
         the quiet sounds in js/audio.js when it is present.
   V1.0: New beginning. Touch is attention, not command.
         - Tap near a lantern: it brightens and nearby lanterns answer
           one after another, then the light settles back.
         - Tap the round green door: the glow awakens, the lanterns
           light in a path toward it, and the page gently leads into
           /stories/.
         Works with css/effects.css (.is-lit, .is-awake, .is-flying)
         and css/base.css (.is-shown, .is-leaving). */

(function () {
  "use strict";

  var art = document.querySelector(".scene-art");
  if (!art) return;

  var door = art.querySelector(".door-link");
  var doorGlow = art.querySelector(".door-glow");
  var moth = art.querySelector(".moth");
  var header = document.querySelector(".threshold-header");
  var magicLayer = document.querySelector(".tap-magic");
  var lanterns = Array.prototype.slice.call(art.querySelectorAll(".lantern"));

  var TITLE_DELAY_MS = 5000;     // title appears 5 seconds after the page
  var TITLE_STAY_MS = 20000;     // and leaves 20 seconds after it appears
  var MOTH_EVERY_MS = 20000;     // a moth passes every 20 seconds
  var MOTH_FLIGHT_MS = 14000;    // matches --t-moth in variables.css
  var STAGGER_MS = 350;          // light travels, it does not appear at once
  var LINGER_MS = 6000;          // the visitor leaves a gentle mark (3 to 15 s)
  var ENTER_DELAY_MS = 1600;
  var MAX_BURSTS = 12;
  var MAGIC_LIFE_MS = 1800;      // a little longer than --t-tap

  var timers = [];
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Quiet sounds: audio.js may be missing or switched off, so always ask politely */
  function sound(name, arg) {
    var a = window.BookKeeperAudio;
    if (a && typeof a[name] === "function") {
      try { a[name](arg); } catch (err) { /* silence is fine */ }
    }
  }

  function later(fn, ms) {
    timers.push(window.setTimeout(fn, ms));
  }

  /* ---------- Title: 5 seconds in, 20 seconds out, or any tap ---------- */
  var titleShowTimer = null;
  var titleHideTimer = null;
  var titleDone = false;

  function showTitle() {
    if (titleDone || !header) return;
    header.classList.add("is-shown");
    titleHideTimer = window.setTimeout(hideTitle, TITLE_STAY_MS);
  }

  function hideTitle() {
    if (titleDone) return;
    titleDone = true;
    window.clearTimeout(titleShowTimer);
    window.clearTimeout(titleHideTimer);
    if (!header) return;
    header.classList.remove("is-shown");
    header.classList.add("is-leaving");
  }

  if (header) {
    titleShowTimer = window.setTimeout(showTitle, TITLE_DELAY_MS);
  }

  /* ---------- Lanterns: light travels from the touch ---------- */
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

  function lightFrom(point, limit) {
    var list = visibleLanterns()
      .map(function (el) { return { el: el, d: distance(centerOf(el), point) }; })
      .sort(function (a, b) { return a.d - b.d; });

    if (typeof limit === "number") list = list.slice(0, limit);

    list.forEach(function (item, i) {
      later(function () {
        item.el.classList.add("is-lit");
        sound("lantern", i);
      }, i * STAGGER_MS);
      later(function () { item.el.classList.remove("is-lit"); },
            i * STAGGER_MS + LINGER_MS);
    });
    return list.length * STAGGER_MS;
  }

  /* ---------- Tap magic: a soft ring and a few drifting lights ---------- */
  function makeMagic(x, y) {
    if (!magicLayer) return;

    while (magicLayer.childNodes.length >= MAX_BURSTS) {
      magicLayer.removeChild(magicLayer.firstChild);
    }

    var burst = document.createElement("div");
    burst.className = "magic-burst";
    burst.style.left = x + "px";
    burst.style.top = y + "px";

    var ring = document.createElement("div");
    ring.className = "magic-ring";
    burst.appendChild(ring);

    var count = 6;
    for (var i = 0; i < count; i++) {
      var spark = document.createElement("div");
      spark.className = "magic-spark";
      var angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
      var reach = 26 + Math.random() * 38;
      spark.style.setProperty("--dx", Math.round(Math.cos(angle) * reach) + "px");
      spark.style.setProperty("--dy", Math.round(Math.sin(angle) * reach - 16) + "px"); // rises a little
      spark.style.animationDelay = Math.round(Math.random() * 180) + "ms";
      burst.appendChild(spark);
    }

    magicLayer.appendChild(burst);
    window.setTimeout(function () {
      if (burst.parentNode) burst.parentNode.removeChild(burst);
    }, MAGIC_LIFE_MS);
  }

  /* ---------- One touch anywhere: acknowledge, soften the title ---------- */
  document.addEventListener("pointerdown", function (e) {
    makeMagic(e.clientX, e.clientY);
    sound("tap");
    hideTitle();
  });

  /* Tap near a lantern: it notices, and the others answer */
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

  /* ---------- The door: awaken, light the way, then step through ---------- */
  if (door) {
    door.addEventListener("click", function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button > 0) return;

      var href = door.getAttribute("href");
      if (reduceMotion) return;          // follow the link at once

      e.preventDefault();
      if (doorGlow) doorGlow.classList.add("is-awake");
      sound("door");
      lightFrom(centerOf(door));

      later(function () { window.location.href = href; }, ENTER_DELAY_MS);
    });
  }

  /* ---------- The moth: a tiny light passing by every 20 seconds ---------- */
  var mothFlying = false;

  function sendMoth() {
    if (!moth || mothFlying || reduceMotion || document.hidden) return;
    mothFlying = true;
    moth.classList.add("is-flying");
    sound("moth");

    function land() {
      moth.removeEventListener("animationend", onEnd);
      moth.classList.remove("is-flying");
      mothFlying = false;
    }
    function onEnd(e) {
      if (e.target === moth) land();
    }
    moth.addEventListener("animationend", onEnd);
    window.setTimeout(function () { if (mothFlying) land(); }, MOTH_FLIGHT_MS + 1000);
  }

  if (moth && !reduceMotion) {
    window.setInterval(sendMoth, MOTH_EVERY_MS);
  }

  /* ---------- Returning with the Back button: the world is calm again ---------- */
  window.addEventListener("pageshow", function () {
    timers.forEach(window.clearTimeout);
    timers = [];
    if (doorGlow) doorGlow.classList.remove("is-awake");
    lanterns.forEach(function (el) { el.classList.remove("is-lit"); });
  });
})();
