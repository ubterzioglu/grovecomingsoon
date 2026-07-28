/* Canopy — a triangulated mesh that grows from the root of the page.
 *
 * The Grove mark is a tree drawn as a low-poly mesh, so the backdrop uses the
 * same vocabulary: jittered lattice points, connected into triangles, revealed
 * outward from a root point rather than faded in all at once. No dependencies.
 */

(function () {
  'use strict';

  var canvas = document.getElementById('canopy');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var still = motionQuery.matches;

  var GROW_MS = 2000;   // time for growth to sweep the whole mesh
  var DRAW_MS = 520;    // time a single edge takes to draw itself
  var PULSE_MS = 2300;  // lifetime of one travelling pulse
  var PULSE_GAP = 2600; // spacing between pulses
  var PULSE_MAX = 3;

  var W = 0, H = 0, dpr = 1;
  var nodes = [], edges = [];
  var rootX = 0, rootY = 0, spread = 1;
  var pulses = [], nextPulse = PULSE_GAP;
  var started = 0, frame = null, resizeTimer = null;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function build() {
    var cell = W < 640 ? 94 : W < 1100 ? 106 : 120;
    var cols = Math.ceil(W / cell) + 3;
    var rows = Math.ceil(H / cell) + 3;

    nodes = [];
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        nodes.push({
          bx: (i - 1) * cell + rand(-0.38, 0.38) * cell,
          by: (j - 1) * cell + rand(-0.38, 0.38) * cell,
          x: 0, y: 0,
          phase: rand(0, Math.PI * 2),
          amp: rand(2, 6),
          spd: rand(0.00013, 0.00034)
        });
      }
    }

    // Root the growth low on the page: beside the copy on wide screens,
    // centred beneath it on narrow ones.
    rootX = W < 860 ? W * 0.5 : W * 0.74;
    rootY = H * 1.04;

    edges = [];
    spread = 1;
    for (var jj = 0; jj < rows; jj++) {
      for (var ii = 0; ii < cols; ii++) {
        var a = jj * cols + ii;
        link(a, ii + 1, jj, cols, rows);
        link(a, ii, jj + 1, cols, rows);
        link(a, ii + 1, jj + 1, cols, rows);
      }
    }
    for (var e = 0; e < edges.length; e++) edges[e].t = edges[e].d / spread;
  }

  function link(a, bi, bj, cols, rows) {
    if (bi < 0 || bi >= cols || bj < 0 || bj >= rows) return;
    var b = bj * cols + bi;
    var na = nodes[a], nb = nodes[b];
    var mx = (na.bx + nb.bx) * 0.5;
    var my = (na.by + nb.by) * 0.5;
    var d = Math.hypot(mx - rootX, my - rootY);
    if (d > spread) spread = d;

    // Thin the mesh out over the left column, where the type sits. The veil
    // does the heavy lifting for contrast; this only softens the transition.
    var lateral = W < 860 ? 1 : Math.min(1, Math.max(0.14, (mx / W - 0.01) / 0.44));

    edges.push({ a: a, b: b, d: d, t: 0, fade: Math.pow(lateral, 1.35), seed: Math.random() });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function render(now) {
    frame = window.requestAnimationFrame(render);

    var elapsed = now - started;
    ctx.clearRect(0, 0, W, H);

    // Drift each vertex on its own slow orbit.
    var k, n;
    for (k = 0; k < nodes.length; k++) {
      n = nodes[k];
      if (still) {
        n.x = n.bx; n.y = n.by;
      } else {
        n.x = n.bx + Math.sin(now * n.spd + n.phase) * n.amp;
        n.y = n.by + Math.cos(now * n.spd * 0.82 + n.phase) * n.amp * 0.7;
      }
    }

    if (!still) {
      nextPulse -= 16.7;
      if (nextPulse <= 0 && pulses.length < PULSE_MAX && elapsed > GROW_MS * 0.55) {
        pulses.push({
          x: rootX + rand(-0.34, 0.22) * W,
          y: rand(0.18, 0.92) * H,
          born: now
        });
        nextPulse = PULSE_GAP * rand(0.7, 1.35);
      }
      for (k = pulses.length - 1; k >= 0; k--) {
        if (now - pulses[k].born > PULSE_MS) pulses.splice(k, 1);
      }
    }

    ctx.lineCap = 'round';

    for (var e = 0; e < edges.length; e++) {
      var edge = edges[e];

      // Growth: each edge starts once the wavefront reaches it.
      var p;
      if (still) {
        p = 1;
      } else {
        p = (elapsed - edge.t * GROW_MS - edge.seed * 140) / DRAW_MS;
        if (p <= 0) continue;
        if (p > 1) p = 1;
        p = 1 - Math.pow(1 - p, 3);
      }

      var na = nodes[edge.a], nb = nodes[edge.b];
      var mx = (na.x + nb.x) * 0.5, my = (na.y + nb.y) * 0.5;

      // Depth: nearer the root reads denser, like a canopy thinning outward.
      var depth = 1 - Math.min(1, edge.d / spread) * 0.52;
      var alpha = 0.32 * depth * edge.fade * p;
      var lift = 0;

      for (k = 0; k < pulses.length; k++) {
        var pu = pulses[k];
        var age = (now - pu.born) / PULSE_MS;
        var ring = age * Math.max(W, H) * 0.62;
        var gap = Math.abs(Math.hypot(mx - pu.x, my - pu.y) - ring);
        if (gap < 120) {
          lift += (1 - gap / 120) * (1 - age) * 0.55;
        }
      }

      if (alpha < 0.004 && lift < 0.004) continue;

      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(na.x + (nb.x - na.x) * p, na.y + (nb.y - na.y) * p);

      if (lift > 0.004) {
        var mix = Math.min(1, lift);
        ctx.strokeStyle = 'rgba(' +
          Math.round(73 + 54 * mix) + ',' +
          Math.round(180 + 41 * mix) + ',' +
          Math.round(177 + 40 * mix) + ',' +
          (alpha + lift * 0.5 * edge.fade).toFixed(3) + ')';
        ctx.lineWidth = 1 + mix * 0.5;
      } else {
        ctx.strokeStyle = 'rgba(73,180,177,' + alpha.toFixed(3) + ')';
        ctx.lineWidth = 1;
      }
      ctx.stroke();

      // Vertex dots, the way the mark shows its own corners.
      if (p > 0.98 && edge.seed > 0.72) {
        ctx.beginPath();
        ctx.arc(nb.x, nb.y, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(127,221,217,' + (alpha * 1.5).toFixed(3) + ')';
        ctx.fill();
      }
    }
  }

  function play() {
    if (frame === null) {
      started = performance.now() - (still ? GROW_MS + DRAW_MS : 0);
      frame = window.requestAnimationFrame(render);
    }
  }

  function pause() {
    if (frame !== null) {
      window.cancelAnimationFrame(frame);
      frame = null;
    }
  }

  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      var wasRunning = frame !== null;
      var age = performance.now() - started;
      pause();
      resize();
      started = performance.now() - age;
      if (wasRunning) play();
    }, 180);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      pause();
    } else {
      var age = performance.now() - started;
      started = performance.now() - age;
      play();
    }
  });

  // Honour a mid-session change to the motion preference.
  var onMotionChange = function (ev) {
    still = ev.matches;
    pulses = [];
    started = performance.now() - (still ? GROW_MS + DRAW_MS : 0);
  };
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
  else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);

  resize();
  play();
})();
