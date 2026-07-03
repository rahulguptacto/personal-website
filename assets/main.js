/* Rahul Gupta — personal site. Hand-built, no frameworks. */
(function () {
  "use strict";

  var d = document;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- header scroll state ---------- */
  var header = d.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- mobile menu ---------- */
  var menuBtn = d.querySelector(".menu-btn");
  var nav = d.querySelector(".site-nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") nav.classList.remove("open");
    });
  }

  /* ---------- active section nav (index only) ---------- */
  var sections = d.querySelectorAll("main section[id]");
  var navLinks = d.querySelectorAll('.site-nav a[href^="#"]');
  if (sections.length && navLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    navLinks.forEach(function (a) {
      byId[a.getAttribute("href").slice(1)] = a;
    });
    var sectionObs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && byId[en.target.id]) {
            navLinks.forEach(function (a) {
              a.removeAttribute("aria-current");
            });
            byId[en.target.id].setAttribute("aria-current", "true");
          }
        });
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    sections.forEach(function (s) {
      sectionObs.observe(s);
    });
  }

  /* ---------- counting proof bar ---------- */
  var stats = d.querySelectorAll("[data-count]");
  if (stats.length && !reduced && "IntersectionObserver" in window) {
    var ease = function (t) {
      return 1 - Math.pow(2, -10 * t);
    };
    var runCount = function (el) {
      var from = parseFloat(el.getAttribute("data-from") || "0");
      var to = parseFloat(el.getAttribute("data-count"));
      var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
      var dur = 1300;
      var start = null;
      var fmt = function (v) {
        return dec ? v.toFixed(dec) : Math.round(v).toLocaleString("en-US");
      };
      var step = function (ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        el.textContent = fmt(from + (to - from) * ease(p));
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = fmt(to);
      };
      requestAnimationFrame(step);
    };
    var statObs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            runCount(en.target);
            statObs.unobserve(en.target);
          }
        });
      },
      { threshold: 0.5 },
    );
    stats.forEach(function (s) {
      statObs.observe(s);
    });
  }

  /* ---------- spotlight cards ---------- */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    var raf = null;
    d.addEventListener("pointermove", function (e) {
      var card = e.target.closest ? e.target.closest(".card") : null;
      if (!card) return;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", e.clientX - r.left + "px");
        card.style.setProperty("--my", e.clientY - r.top + "px");
        raf = null;
      });
    });
  }

  /* ---------- magnetic primary CTA ---------- */
  if (
    !reduced &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ) {
    d.querySelectorAll("[data-magnetic]").forEach(function (btn) {
      var strength = 5;
      btn.style.transition =
        "transform .2s cubic-bezier(.22,1,.36,1), background .25s, box-shadow .25s, border-color .25s";
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = ((e.clientX - r.left) / r.width - 0.5) * 2 * strength;
        var y = ((e.clientY - r.top) / r.height - 0.5) * 2 * strength;
        btn.style.transform = "translate(" + x + "px," + y + "px)";
      });
      btn.addEventListener("pointerleave", function () {
        btn.style.transform = "translate(0,0)";
      });
    });
  }

  /* ---------- project filters ---------- */
  var filterBtns = d.querySelectorAll(".filter-btn");
  if (filterBtns.length) {
    var cards = d.querySelectorAll(".card[data-domain]");
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        var f = btn.getAttribute("data-filter");
        cards.forEach(function (c) {
          var show =
            f === "all" ||
            (c.getAttribute("data-domain") || "").split(" ").indexOf(f) !== -1;
          c.classList.toggle("hidden", !show);
        });
      });
    });
  }

  /* ---------- footer year ---------- */
  var yr = d.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- the governed lattice ---------- */
  var canvas = d.getElementById("lattice");
  if (
    canvas &&
    !reduced &&
    !(navigator.connection && navigator.connection.saveData)
  ) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0,
      H = 0,
      nodes = [],
      running = false,
      rafId = null;
    var mouse = { x: -9999, y: -9999 };
    var SPACING = 96;
    var LINK = 118;
    var LINK2 = LINK * LINK;
    var pulse = { i: -1, t: 0 };

    function build() {
      var rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = [];
      var cols = Math.ceil(W / SPACING) + 1;
      var rows = Math.ceil(H / SPACING) + 1;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          if (nodes.length >= 220) break;
          nodes.push({
            ox: c * SPACING + (r % 2 ? SPACING / 2 : 0),
            oy: r * SPACING,
            x: 0,
            y: 0,
            ph: Math.random() * Math.PI * 2,
            sp: 0.25 + Math.random() * 0.35,
            amp: 7 + Math.random() * 9,
          });
        }
      }
    }

    function tick(ts) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      var t = ts / 1000;

      /* correction pulse: a node "gets reviewed" every few seconds */
      if (pulse.i === -1 && Math.random() < 0.008 && nodes.length) {
        pulse.i = Math.floor(Math.random() * nodes.length);
        pulse.t = ts;
      }

      var i, n;
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        n.x = n.ox + Math.cos(t * n.sp + n.ph) * n.amp;
        n.y = n.oy + Math.sin(t * n.sp * 0.9 + n.ph) * n.amp;
        /* gentle pointer influence — the human hand in the loop */
        var dx = mouse.x - n.x;
        var dy = mouse.y - n.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 19600) {
          var f = (1 - Math.sqrt(d2) / 140) * 14;
          n.x -= (dx / Math.sqrt(d2 + 0.001)) * f;
          n.y -= (dy / Math.sqrt(d2 + 0.001)) * f;
        }
      }

      /* links */
      ctx.lineWidth = 1;
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        for (var j = i + 1; j < nodes.length; j++) {
          var m = nodes[j];
          var ddx = n.x - m.x;
          if (ddx > LINK || ddx < -LINK) continue;
          var ddy = n.y - m.y;
          var dd = ddx * ddx + ddy * ddy;
          if (dd < LINK2) {
            var a = (1 - dd / LINK2) * 0.13;
            ctx.strokeStyle = "rgba(0,102,255," + a + ")";
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      }

      /* nodes */
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        ctx.fillStyle = "rgba(0,102,255,0.38)";
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      /* the teal correction pulse */
      if (pulse.i >= 0) {
        var pn = nodes[pulse.i];
        var age = (ts - pulse.t) / 1400;
        if (age >= 1 || !pn) {
          pulse.i = -1;
        } else {
          var rr = 3 + age * 26;
          ctx.strokeStyle = "rgba(0,212,170," + 0.5 * (1 - age) + ")";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(pn.x, pn.y, rr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "rgba(0,212,170," + 0.9 * (1 - age * 0.6) + ")";
          ctx.beginPath();
          ctx.arc(pn.x, pn.y, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    function start() {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(tick);
      }
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    }

    var hero = canvas.parentElement;
    hero.addEventListener(
      "pointermove",
      function (e) {
        var r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      },
      { passive: true },
    );
    hero.addEventListener("pointerleave", function () {
      mouse.x = -9999;
      mouse.y = -9999;
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (en) {
          en[0].isIntersecting ? start() : stop();
        },
        { threshold: 0.05 },
      ).observe(canvas);
    } else {
      start();
    }
    d.addEventListener("visibilitychange", function () {
      d.hidden ? stop() : start();
    });

    var rsz = null;
    window.addEventListener("resize", function () {
      clearTimeout(rsz);
      rsz = setTimeout(build, 180);
    });

    build();
  }
})();
