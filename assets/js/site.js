/*
 * Site behaviour: BibTeX toggles, publication search/filters, scroll reveal.
 * Everything here is progressive enhancement; pages are fully readable without it.
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- Cite / copy */

  document.addEventListener("click", function (event) {
    var toggle = event.target.closest(".pub-cite-toggle");
    if (toggle) {
      var box = toggle.closest(".pub").querySelector(".pub-bibtex");
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      box.hidden = open;
      return;
    }

    var copy = event.target.closest(".pub-copy");
    if (copy) {
      var text = copy.parentElement.querySelector("code").textContent;
      var done = function () {
        copy.textContent = "Copied";
        copy.classList.add("is-copied");
        setTimeout(function () {
          copy.textContent = "Copy BibTeX";
          copy.classList.remove("is-copied");
        }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      }
    }
  });

  /* ---------------------------------------------------------------- Publications filter */

  var timeline = document.getElementById("pub-timeline");
  if (timeline) {
    var input = document.getElementById("pub-search-input");
    var countEl = document.getElementById("pub-count");
    var emptyEl = document.getElementById("pub-empty");
    var resetEl = document.getElementById("pub-reset");
    var areaChips = Array.prototype.slice.call(document.querySelectorAll("[data-filter-area]"));
    var typeChips = Array.prototype.slice.call(document.querySelectorAll("[data-filter-type]"));
    var areaMembers = {};
    areaChips.forEach(function (chip) {
      var area = chip.getAttribute("data-filter-area");
      areaMembers[area] = (chip.getAttribute("data-filter-members") || area).split(",");
    });

    var items = Array.prototype.slice.call(timeline.querySelectorAll("ol.bibliography > li")).map(function (li) {
      var pub = li.querySelector(".pub");
      var text = ["pub-title", "pub-authors", "pub-venue", "pub-abbr", "pub-meta"]
        .map(function (cls) {
          var el = pub.querySelector("." + cls);
          return el ? el.textContent : "";
        })
        .join(" ");
      text += " " + (pub.dataset.searchAuthors || "");
      return {
        li: li,
        areas: (pub.dataset.areas || "").split(",").filter(Boolean),
        type: pub.dataset.type,
        text: normalize(text),
      };
    });

    var headings = Array.prototype.slice.call(timeline.querySelectorAll("h2.bibliography"));
    var state = { q: "", area: "all", type: "all" };

    function normalize(s) {
      return s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ");
    }

    function setPressed(chips, value, attr) {
      chips.forEach(function (chip) {
        var on = chip.getAttribute(attr) === value;
        chip.classList.toggle("is-active", on);
        chip.setAttribute("aria-pressed", String(on));
      });
    }

    function apply() {
      var terms = normalize(state.q).split(" ").filter(Boolean);
      var shown = 0;

      items.forEach(function (it) {
        var matchesArea =
          state.area === "all" ||
          (areaMembers[state.area] || [state.area]).some(function (area) {
            return it.areas.indexOf(area) !== -1;
          });
        var ok =
          matchesArea &&
          (state.type === "all" || it.type === state.type) &&
          terms.every(function (t) {
            return it.text.indexOf(t) !== -1;
          });
        it.li.classList.toggle("is-filtered-out", !ok);
        if (ok) shown++;
      });

      headings.forEach(function (h) {
        var list = h.nextElementSibling;
        while (list && !list.matches("ol.bibliography")) list = list.nextElementSibling;
        var visible = list && list.querySelector("li:not(.is-filtered-out)");
        h.classList.toggle("is-filtered-out", !visible);
        if (list) list.classList.toggle("is-filtered-out", !visible);
      });

      countEl.textContent = shown;
      emptyEl.hidden = shown !== 0;

      setPressed(areaChips, state.area, "data-filter-area");
      setPressed(typeChips, state.type, "data-filter-type");

      syncUrl();
    }

    function syncUrl() {
      var params = new URLSearchParams();
      if (state.q) params.set("q", state.q);
      if (state.area !== "all") params.set("area", state.area);
      if (state.type !== "all") params.set("type", state.type);
      var qs = params.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    }

    function readUrl() {
      var params = new URLSearchParams(location.search);
      state.q = params.get("q") || "";
      state.area = params.get("area") || "all";
      state.type = params.get("type") || "all";
      input.value = state.q;
    }

    var timer;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.q = input.value.trim();
        apply();
      }, 120);
    });

    areaChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var v = chip.getAttribute("data-filter-area");
        state.area = state.area === v && v !== "all" ? "all" : v;
        apply();
      });
    });

    typeChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var v = chip.getAttribute("data-filter-type");
        state.type = state.type === v && v !== "all" ? "all" : v;
        apply();
      });
    });

    resetEl.addEventListener("click", function () {
      state = { q: "", area: "all", type: "all" };
      input.value = "";
      apply();
      input.focus();
    });

    readUrl();
    apply();

    // Deep links such as /publications/#nagarajan2019adaptive
    var target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && target.classList.contains("pub")) {
      var li = target.closest("li");
      if (li && li.classList.contains("is-filtered-out")) {
        state = { q: "", area: "all", type: "all" };
        input.value = "";
        apply();
      }
      target.classList.add("is-target");
      var positionTargetCard = function () {
        // Run after the browser's native fragment jump and sticky headings settle.
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            var targetTop = target.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: Math.max(0, targetTop), behavior: "auto" });
          });
        });
      };

      if (document.readyState === "complete") {
        positionTargetCard();
      } else {
        window.addEventListener("load", positionTargetCard, { once: true });
      }
    }
  }

  /* ---------------------------------------------------------------- Scroll reveal */

  if (!reduceMotion && "IntersectionObserver" in window) {
    var pending = Array.prototype.slice.call(document.querySelectorAll(".reveal")).filter(function (el) {
      return el.getBoundingClientRect().top > window.innerHeight * 0.92;
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-in");
            entry.target.classList.remove("reveal-pending");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.04 }
    );

    pending.forEach(function (el) {
      el.classList.add("reveal-pending");
      observer.observe(el);
    });

    // The pending offset would shift the target after an in-page jump, so settle everything first.
    document.addEventListener("click", function (event) {
      var link = event.target.closest && event.target.closest('a[href^="#"]');
      if (!link) return;
      pending.forEach(function (el) {
        el.classList.remove("reveal-pending");
        observer.unobserve(el);
      });
      pending = [];
    });
  }
})();
