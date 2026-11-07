/* The Book Keeper Front Door: season.js V1.0 · Part 1 of 1
   Loaded in the <head> so the season is set before the page paints.
   Winter (January and February) swaps the painting and turns on snowfall.
   Preview: add ?season=winter or ?season=summer to the address. */

(function () {
  "use strict";

  /* Settings */
  var WINTER_MONTHS = [0, 1];   /* January and February (months count from 0) */
  var FLAKE_COUNT = 60;

  var root = document.documentElement;

  /* Choose the season: a preview in the address wins, otherwise the visitor's own calendar */
  function chooseSeason() {
    var preview = new URLSearchParams(window.location.search).get("season");
    if (preview === "winter" || preview === "summer") {
      return preview;
    }
    return WINTER_MONTHS.indexOf(new Date().getMonth()) !== -1 ? "winter" : "summer";
  }

  /* A random number between min and max, to one decimal place */
  function random(min, max) {
    return Math.round((min + Math.random() * (max - min)) * 10) / 10;
  }

  /* Create the snowflakes inside the .snow layer */
  function buildSnow() {
    var layer = document.querySelector(".snow");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!layer || reducedMotion) {
      return;
    }

    var flakes = document.createDocumentFragment();

    for (var i = 0; i < FLAKE_COUNT; i++) {
      var flake = document.createElement("span");
      var size = random(2, 6);
      var depth = (size - 2) / 4;   /* 0 = small and far away, 1 = large and near */

      flake.style.setProperty("--x", random(0, 100) + "%");
      flake.style.setProperty("--size", size + "px");
      flake.style.setProperty("--dur", (20 - depth * 8 + random(0, 4)) + "s");
      flake.style.setProperty("--delay", -random(0, 24) + "s");
      flake.style.setProperty("--drift", random(-40, 40) + "px");
      flake.style.setProperty("--flake-opacity", 0.35 + depth * 0.55);

      flakes.appendChild(flake);
    }

    layer.appendChild(flakes);
  }

  var season = chooseSeason();
  root.setAttribute("data-season", season);

  if (season === "winter") {
    document.addEventListener("DOMContentLoaded", buildSnow);
  }
})();
