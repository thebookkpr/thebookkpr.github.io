/* PROJECT: Book Keeper — Website (The Book Keeper)
   FILE: js/audio.js · V1.1 · Part 1 of 1
   LOCATION: thebookkpr.github.io/js/audio.js
   V1.1: Sound no longer starts on any random tap. It starts when
         scene.js calls wake() (a lantern tap, the door, or the Enter
         link) or when the visitor turns it on in the menu. A visitor
         who switched sound off in the menu stays quiet. Lantern wake
         fades in quickly so the first chime is heard. The switch now
         lives inside the menu panel.
   V1.0: New beginning. Sound for the front door, built from the Sound
         Design Specification. Everything is made in the browser, so no
         sound files are needed.
         Layer I   Environmental foundation: soft wind and leaf air.
         Layer II  Living place: rare far-off birds, leaf rustles and
                   a page turning somewhere inside.
         Layer III Interactive: warm lantern tones, a layered door
                   resonance, a soft tap chime (no clicks, no beeps).
         Layer IV  Discovery: the moth's faint shimmer and chime.
         Used by scene.js through window.BookKeeperAudio:
         wake(), tap(), lantern(i), door(), moth(), isOn(). */

(function () {
  "use strict";

  var AC = window.AudioContext || window.webkitAudioContext;
  var btn = document.querySelector(".sound-toggle");

  var KEY = "bookkeeper-sound";
  var LEVEL = 0.5;                       // master volume when on
  var SCALE = [293.66, 329.63, 369.99, 440, 493.88, 587.33]; // D major pentatonic

  var ctx = null, master = null, bus = null, noiseBuf = null;
  var on = false, ambienceRunning = false, rareTimer = null, lastTap = 0;
  var declined = false;                  // true only after the visitor switched sound off

  /* ---------- Saved choice: if they turned sound off, it stays off ---------- */
  try { if (window.localStorage.getItem(KEY) === "off") declined = true; } catch (e) {}
  function save(v) { try { window.localStorage.setItem(KEY, v); } catch (e) {} }

  /* ---------- The switch inside the menu ---------- */
  function showButton() {
    if (!btn) return;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Turn sound off" : "Turn sound on");
    btn.textContent = on ? "Sound on" : "Sound off";
  }
  if (!AC && btn) btn.style.display = "none";

  /* ---------- Build the soundscape's room, once ---------- */
  function build() {
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);

    // Warm room: a short, soft reverb made from fading noise
    var len = Math.floor(ctx.sampleRate * 2.6);
    var imp = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = imp.getChannelData(c);
      for (var i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      }
    }
    var verb = ctx.createConvolver();
    verb.buffer = imp;
    var wet = ctx.createGain();
    wet.gain.value = 0.35;
    verb.connect(wet);
    wet.connect(master);

    bus = ctx.createGain();            // tones go here: dry plus room
    bus.connect(master);
    bus.connect(verb);

    // Three seconds of noise, reused for wind, leaves and paper
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    var n = noiseBuf.getChannelData(0);
    for (var j = 0; j < n.length; j++) n[j] = Math.random() * 2 - 1;
  }

  function slow(freq, depth, target) {   // a very slow breathing movement
    var lfo = ctx.createOscillator();
    var amt = ctx.createGain();
    lfo.frequency.value = freq;
    amt.gain.value = depth;
    lfo.connect(amt);
    amt.connect(target);
    lfo.start();
  }

  /* ---------- Layer I: wind and leaf air, nearly invisible ---------- */
  function startAmbience() {
    if (ambienceRunning) return;
    ambienceRunning = true;

    var wind = ctx.createBufferSource();
    wind.buffer = noiseBuf; wind.loop = true;
    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 520;
    var wg = ctx.createGain();
    wg.gain.value = 0.05;
    wind.connect(lp); lp.connect(wg); wg.connect(master);
    slow(0.06, 0.02, wg.gain);
    slow(0.05, 160, lp.frequency);
    wind.start();

    var air = ctx.createBufferSource();
    air.buffer = noiseBuf; air.loop = true;
    var bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 3000; bp.Q.value = 0.7;
    var ag = ctx.createGain();
    ag.gain.value = 0.008;
    air.connect(bp); bp.connect(ag); ag.connect(master);
    slow(0.11, 0.006, ag.gain);
    air.start(0, 1.1);
  }

  /* ---------- A soft bell: slow attack, warm overtones, long fade ---------- */
  function bell(freq, peak, attack, decay, delay) {
    var t = ctx.currentTime + (delay || 0);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(bus);
    [[1, 1], [2, 0.25], [2.76, 0.07]].forEach(function (p) {
      var o = ctx.createOscillator();
      var pg = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq * p[0];
      pg.gain.value = p[1];
      o.connect(pg); pg.connect(g);
      o.start(t);
      o.stop(t + attack + decay + 0.1);
    });
  }

  /* ---------- Layer II: rare signs of life, far away ---------- */
  function chirp() {                    // two soft far-off bird notes
    var t0 = ctx.currentTime;
    for (var k = 0; k < 2; k++) {
      var t = t0 + k * 0.22;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(2300, t);
      o.frequency.linearRampToValueAtTime(2900, t + 0.14);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.012, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(bus);
      o.start(t); o.stop(t + 0.25);
    }
  }

  function swell(type, f1, f2, peak, rise, fall) {   // leaves, or paper
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = f1;
    var chain = f;
    if (f2) {
      var f_b = ctx.createBiquadFilter();
      f_b.type = "lowpass"; f_b.frequency.value = f2;
      f.connect(f_b); chain = f_b;
    }
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + rise);
    g.gain.exponentialRampToValueAtTime(0.0001, t + rise + fall);
    src.connect(f); chain.connect(g); g.connect(bus);
    src.start(t, Math.random() * 1.2, rise + fall + 0.1);
  }

  function rustle()   { swell("bandpass", 2400, 0, 0.02, 0.5, 0.9); }
  function pageTurn() { swell("highpass", 1800, 5000, 0.012, 0.12, 0.4); }

  function scheduleRare() {
    window.clearTimeout(rareTimer);
    rareTimer = window.setTimeout(function () {
      if (!on || !ctx) return;
      var r = Math.random();
      if (r < 0.4) chirp(); else if (r < 0.8) rustle(); else pageTurn();
      scheduleRare();
    }, 9000 + Math.random() * 15000);
  }

  /* ---------- Layer III and IV: sounds scene.js asks for ---------- */
  function ready() { return on && ctx && bus; }

  function lantern(i) {                 // warm, one note higher each time
    if (!ready()) return;
    bell(SCALE[(i || 0) % SCALE.length], 0.09, 0.06, 2.6);
  }

  function tap() {                      // a soft tonal accent, never a click
    if (!ready()) return;
    var now = Date.now();
    if (now - lastTap < 220) return;
    lastTap = now;
    bell(SCALE[Math.floor(Math.random() * SCALE.length)] * 2, 0.045, 0.03, 1.1);
  }

  function door() {                     // the house resonates, layer by layer
    if (!ready()) return;
    [146.83, 220, 293.66, 369.99].forEach(function (f, i) {
      bell(f, 0.1, 0.35, 3.5, i * 0.25);
    });
  }

  function moth() {                     // barely there: a shimmer and a faraway chime
    if (!ready()) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1500, t);
    o.frequency.linearRampToValueAtTime(1900, t + 5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.006, t + 2);
    g.gain.linearRampToValueAtTime(0.0001, t + 5);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + 5.2);
    bell(880, 0.025, 0.4, 3, 1.2);
  }

  /* ---------- On and off: slow fades, never abrupt ---------- */
  function start(quick) {
    if (!AC || on) return;
    if (!ctx) build();
    on = true; declined = false;
    if (ctx.state === "suspended") ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    // From a lantern or the door the first chime must be heard, so fade in faster
    master.gain.setTargetAtTime(LEVEL, ctx.currentTime, quick ? 0.25 : 1.2);
    startAmbience();
    scheduleRare();
    save("on");
    showButton();
  }

  function stop() {
    if (!ctx || !on) return;
    on = false; declined = true;
    window.clearTimeout(rareTimer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    window.setTimeout(function () {
      if (!on && ctx && ctx.state === "running") ctx.suspend();
    }, 2500);
    save("off");
    showButton();
  }

  function toggle() { if (on) stop(); else start(false); }

  /* A lantern, the door, or the Enter link wakes the sound.
     If the visitor switched sound off in the menu, it stays off. */
  function wake() {
    if (!AC || on || declined) return;
    start(true);
  }

  if (btn) btn.addEventListener("click", toggle);

  /* ---------- Quiet when the page is not in view ---------- */
  document.addEventListener("visibilitychange", function () {
    if (!ctx || !on) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  showButton();

  window.BookKeeperAudio = {
    start: function () { start(false); }, stop: stop, toggle: toggle, wake: wake,
    isOn: function () { return on; },
    tap: tap, lantern: lantern, door: door, moth: moth
  };
})();
