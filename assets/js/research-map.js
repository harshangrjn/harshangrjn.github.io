/*
 * Interactive publication intersection maps for the Home and Research pages.
 * Placements are deterministic and derived from the bibliography's existing
 * area tags plus conservative title keywords. No coordinates are stored.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var source = document.getElementById("research-map-source");
  var mapElements = Array.prototype.slice.call(document.querySelectorAll('[data-research-map="overview"]'));

  if (!source || !mapElements.length) return;

  var pillarColors = {
    optimization: "var(--map-optimization)",
    power: "var(--map-power)",
    quantum: "var(--map-quantum)",
    networks: "var(--map-networks)",
  };

  var powerTerms = /\bpower\b|electric|energy|grid|microgrid|transmission|distribution|unit commitment|optimal power flow|\bacopf\b|\bopf\b|geomagnetic|renewable|storage arbitrage|load delivery|black start/;
  var quantumTerms = /\bquantum\b|\bqubo\b|\bising\b/;
  var networkTerms = /\buav\b|\brobot|\bvehicle|space object|air transportation|manufacturing network|algebraic connectivity|disturbance propagation|string stability|trajectory planning/;
  var optimizationTerms = /\boptimi[sz]|nonconvex|mixed-integer|\bmilp\b|\bminlp\b|relaxation|partitioning|stochastic|robust|chance-constrained|bilevel|branch-and-bound/;

  var overviewConfig = {
    width: 720,
    height: 650,
    radius: 168,
    dotRadius: 6.2,
    fields: [
      {
        key: "optimization",
        label: "Optimization & ML",
        x: 360,
        y: 300,
        r: 190,
        lx: 360,
        ly: 85,
      },
      {
        key: "power",
        label: "Power systems",
        sublabel: "planning · operations",
        sublabel2: "resilience",
        x: 210,
        y: 300,
        r: 165,
        lx: 123,
        ly: 510,
      },
      { key: "quantum", label: "Quantum", x: 510, y: 300, r: 165, lx: 595, ly: 510 },
      { key: "networks", label: "Networks & Control", x: 360, y: 475, r: 115, lx: 360, ly: 625 },
    ],
  };

  var papers = Array.prototype.slice
    .call(source.querySelectorAll(".research-map-entry"))
    .map(function (entry) {
      var areas = (entry.dataset.areas || "").split(",").filter(Boolean);
      var paper = {
        key: entry.dataset.key,
        title: cleanTitle(entry.dataset.title || ""),
        year: entry.dataset.year || "",
        areas: areas,
        url: entry.dataset.url,
      };
      paper.overviewScores = scoreOverview(paper);
      return paper;
    })
    .filter(function (paper) {
      return paper.areas.length && maxScore(paper.overviewScores) > 0;
    });

  mapElements.forEach(function (map) {
    var mapped = papers
      .map(function (paper) {
        return { paper: paper, scores: paper.overviewScores };
      })
      .filter(function (item) {
        return maxScore(item.scores) > 0;
      });

    drawMap(map, overviewConfig, mapped);
  });

  function scoreOverview(paper) {
    var scores = { optimization: 0, power: 0, quantum: 0, networks: 0 };
    var title = paper.title.toLowerCase();
    var has = function (area) {
      return paper.areas.indexOf(area) !== -1;
    };

    // "Computational grids" in this scientific-computing paper are numerical
    // meshes, not electric grids; keep it out of the overview map.
    if (paper.key === "nagarajan2010enforcing") return scores;

    if (has("global")) scores.optimization = 1;
    if (has("learning")) scores.optimization = Math.max(scores.optimization, 0.9);
    if (has("uncertainty")) {
      scores.optimization = Math.max(scores.optimization, 0.62);
      scores.power = Math.max(scores.power, 0.9);
    }
    if (has("resilience")) {
      scores.optimization = Math.max(scores.optimization, 0.28);
      scores.power = 1;
      scores.networks = Math.max(scores.networks, 0.2);
    }
    if (has("quantum")) {
      scores.optimization = Math.max(scores.optimization, 0.68);
      scores.quantum = 1;
    }
    if (has("networks")) {
      scores.optimization = Math.max(scores.optimization, 0.55);
      scores.networks = 1;
    }
    if (has("science") && has("learning")) scores.optimization = Math.max(scores.optimization, 0.62);

    if (matches(title, powerTerms)) scores.power = Math.max(scores.power, 0.95);
    if (matches(title, quantumTerms)) scores.quantum = Math.max(scores.quantum, 0.95);
    if (matches(title, networkTerms)) scores.networks = Math.max(scores.networks, 0.85);
    if (matches(title, optimizationTerms)) scores.optimization = Math.max(scores.optimization, 0.82);
    if (scores.power >= 0.5) scores.optimization = Math.max(scores.optimization, 0.62);

    return scores;
  }

  function drawMap(map, config, mapped) {
    var svg = map.querySelector("svg");
    var tooltip = map.querySelector(".research-map-tooltip");
    var fieldLayer = svgEl("g", { class: "research-map-fields" });
    var dotLayer = svgEl("g", { class: "research-map-dots" });
    var pinnedLink = null;
    var fieldCounts = {};

    function pinTooltip(link, paper, focusCard) {
      if (pinnedLink && pinnedLink !== link) {
        pinnedLink.classList.remove("is-pinned");
        pinnedLink.setAttribute("aria-expanded", "false");
      }
      pinnedLink = link;
      link.classList.add("is-pinned");
      link.setAttribute("aria-expanded", "true");
      showTooltip(map, tooltip, link, paper, true);
      if (focusCard) tooltip.querySelector(".research-map-tooltip-link").focus();
    }

    function unpinTooltip(restoreFocus) {
      if (!pinnedLink) return;
      var previousLink = pinnedLink;
      var focusWasInTooltip = tooltip.contains(document.activeElement);
      pinnedLink.classList.remove("is-pinned");
      pinnedLink.setAttribute("aria-expanded", "false");
      pinnedLink = null;
      hideTooltip(tooltip);
      if (restoreFocus && focusWasInTooltip) previousLink.focus();
    }

    config.fields.forEach(function (field) {
      var color = pillarColors[field.key];
      var labelX = field.lx;
      var labelY = field.ly;
      var circle = svgEl("circle", {
        class: "research-map-field research-map-field--" + field.key,
        cx: field.x,
        cy: field.y,
        r: field.r || config.radius,
        "data-field": field.key,
      });
      circle.style.setProperty("--field-color", color);
      fieldLayer.appendChild(circle);

      var label = svgEl("text", {
        class: "research-map-field-label research-map-field-label--" + field.key,
        x: labelX,
        y: labelY,
        "text-anchor": "middle",
        "data-field": field.key,
      });
      label.style.setProperty("--field-color", color);
      label.textContent = field.label;
      fieldLayer.appendChild(label);

      // Paper count shown inline after each overview label, e.g. "Quantum · 6",
      // in a slightly smaller size so "Power systems · 44" clears the green circle.
      var fieldCount = svgEl("tspan", { class: "research-map-field-count" });
      label.appendChild(fieldCount);
      fieldCounts[field.key] = fieldCount;

      if (field.sublabel) {
        var sublabel = svgEl("text", {
          class: "research-map-field-sublabel research-map-field-sublabel--" + field.key,
          x: labelX,
          y: labelY + 24,
          "text-anchor": "middle",
          "data-field": field.key,
        });
        sublabel.style.setProperty("--field-color", color);
        if (field.sublabel2) {
          var sublabelLine1 = svgEl("tspan", { x: labelX, dy: "0" });
          var sublabelLine2 = svgEl("tspan", { x: labelX, dy: "1.2em" });
          sublabelLine1.textContent = field.sublabel;
          sublabelLine2.textContent = field.sublabel2;
          sublabel.append(sublabelLine1, sublabelLine2);
        } else {
          sublabel.textContent = field.sublabel;
        }
        fieldLayer.appendChild(sublabel);
      }
    });

    var points = placePoints(mapped, config);

    points.forEach(function (point) {
      var dominant = point.scores.quantum >= 0.5 ? "quantum" : dominantField(point.scores);
      var link = svgEl("a", {
        class: "research-map-dot-link",
        href: point.paper.url,
        tabindex: "0",
        "aria-label": "Show details for " + point.paper.title + " (" + point.paper.year + ")",
        "aria-expanded": "false",
        "data-fields": scoreKeys(point.scores).join(" "),
        "data-year": point.paper.year,
      });
      var title = svgEl("title");
      title.textContent = point.paper.title + " (" + point.paper.year + ")";
      var isHomeOverview = map.classList.contains("research-map--home");
      var hitTarget = svgEl("circle", {
        class: "research-map-dot-hit",
        cx: point.x.toFixed(2),
        cy: point.y.toFixed(2),
        r: isHomeOverview ? config.dotRadius + 5.8 : config.dotRadius + 4,
      });
      var dot = svgEl("circle", {
        class: "research-map-dot",
        cx: point.x.toFixed(2),
        cy: point.y.toFixed(2),
        r: isHomeOverview ? config.dotRadius + 1.1 : config.dotRadius,
      });
      link.style.setProperty("--dot-color", pillarColors[dominant]);
      link.appendChild(title);
      link.appendChild(hitTarget);
      link.appendChild(dot);
      dotLayer.appendChild(link);

      link.addEventListener("pointerenter", function () {
        if (!pinnedLink) showTooltip(map, tooltip, link, point.paper, false);
      });
      link.addEventListener("pointerleave", function () {
        if (!pinnedLink && document.activeElement !== link) hideTooltip(tooltip);
      });
      link.addEventListener("focus", function () {
        if (!pinnedLink) showTooltip(map, tooltip, link, point.paper, false);
      });
      link.addEventListener("blur", function () {
        if (!pinnedLink) hideTooltip(tooltip);
      });
      link.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        pinTooltip(link, point.paper, event.detail === 0);
      });
      link.addEventListener("keydown", function (event) {
        if (event.key === " ") {
          event.preventDefault();
          pinTooltip(link, point.paper, true);
        }
      });
    });

    svg.appendChild(fieldLayer);
    svg.appendChild(dotLayer);

    setupYearSlider(map, points, fieldCounts, function (link) {
      if (pinnedLink === link) unpinTooltip(false);
      else if (!pinnedLink) hideTooltip(tooltip);
    });

    tooltip.addEventListener("click", function (event) {
      event.stopPropagation();
    });
    document.addEventListener("click", function () {
      unpinTooltip(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") unpinTooltip(true);
    });
  }

  function placePoints(mapped, config) {
    var fieldByKey = {};
    config.fields.forEach(function (field) {
      fieldByKey[field.key] = field;
    });

    var points = mapped.map(function (item) {
      var keys = scoreKeys(item.scores);
      var base = overviewAnchor(keys, item.scores);
      var baseX = base.x;
      var baseY = base.y;
      var angle = seeded(item.paper.key + "-angle") * Math.PI * 2;
      var spreadLimit = keys.length > 1 ? 34 : 42;
      var spread = 8 + seeded(item.paper.key + "-radius") * spreadLimit;
      return {
        paper: item.paper,
        scores: item.scores,
        baseX: baseX,
        baseY: baseY,
        x: baseX + Math.cos(angle) * spread,
        y: baseY + Math.sin(angle) * spread,
      };
    });

    var minimum = config.dotRadius * 2 + 10;
    for (var iteration = 0; iteration < 220; iteration++) {
      separatePoints(points, minimum);
      points.forEach(function (point) {
        point.x += (point.baseX - point.x) * 0.012;
        point.y += (point.baseY - point.y) * 0.012;
        constrainToFields(point, fieldByKey, config);
        separateFromFieldBoundaries(point, fieldByKey, config);
        point.x = clamp(point.x, 34, config.width - 34);
        point.y = clamp(point.y, 42, config.height - 42);
      });
    }

    for (var pass = 0; pass < 80; pass++) {
      separatePoints(points, minimum);
      points.forEach(function (point) {
        constrainToFields(point, fieldByKey, config);
        separateFromFieldBoundaries(point, fieldByKey, config);
      });
    }
    separatePoints(points, minimum);

    return points;
  }

  function separatePoints(points, minimum) {
    for (var i = 0; i < points.length; i++) {
      for (var j = i + 1; j < points.length; j++) {
        var dx = points[j].x - points[i].x;
        var dy = points[j].y - points[i].y;
        var distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
        if (distance < minimum) {
          var push = (minimum - distance) * 0.52;
          var ux = dx / distance;
          var uy = dy / distance;
          points[i].x -= ux * push;
          points[i].y -= uy * push;
          points[j].x += ux * push;
          points[j].y += uy * push;
        }
      }
    }
  }

  function overviewAnchor(keys, scores) {
    var memberships = keys.filter(function (key) {
      return scores[key] >= 0.5;
    });
    if (!memberships.length) memberships = [dominantField(scores)];
    var anchors = {
      optimization: { x: 360, y: 195 },
      power: { x: 145, y: 300 },
      quantum: { x: 600, y: 300 },
      networks: { x: 360, y: 525 },
      "optimization|power": { x: 270, y: 275 },
      "optimization|quantum": { x: 450, y: 275 },
      "optimization|networks": { x: 360, y: 455 },
      "power|networks": { x: 280, y: 410 },
      "quantum|networks": { x: 440, y: 410 },
      "optimization|power|quantum": { x: 360, y: 315 },
      "optimization|power|networks": { x: 290, y: 405 },
      "optimization|quantum|networks": { x: 430, y: 405 },
      "optimization|power|quantum|networks": { x: 360, y: 365 },
    };
    return anchors[memberships.join("|")] || { x: 360, y: 330 };
  }

  function constrainToFields(point, fieldByKey, config) {
    scoreKeys(point.scores)
      .filter(function (key) {
        return point.scores[key] >= 0.5;
      })
      .forEach(function (key) {
        var field = fieldByKey[key];
        var radius = (field.r || config.radius) - config.dotRadius - 9;
        var dx = point.x - field.x;
        var dy = point.y - field.y;
        var distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
        if (distance > radius) {
          point.x = field.x + (dx / distance) * radius;
          point.y = field.y + (dy / distance) * radius;
        }
      });
  }

  function separateFromFieldBoundaries(point, fieldByKey, config) {
    Object.keys(fieldByKey).forEach(function (key) {
      var field = fieldByKey[key];
      var radius = field.r || config.radius;
      var dx = point.x - field.x;
      var dy = point.y - field.y;
      var distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
      var margin = config.dotRadius + 10;
      if (Math.abs(distance - radius) >= margin) return;

      var isMember = point.scores[key] >= 0.5;
      var target = isMember ? radius - margin : radius + margin;
      point.x = field.x + (dx / distance) * target;
      point.y = field.y + (dy / distance) * target;
    });
  }

  // Year slider: dots keep the positions computed above for the full set of
  // papers; the slider only hides papers published after the chosen year.
  function setupYearSlider(map, points, fieldCounts, onHide) {
    var years = points
      .map(function (point) {
        return parseInt(point.paper.year, 10);
      })
      .filter(function (year) {
        return !isNaN(year);
      });
    if (!years.length) return;

    var minYear = Math.min.apply(null, years);
    var maxYear = Math.max(new Date().getFullYear(), Math.max.apply(null, years));
    var links = Array.prototype.slice.call(map.querySelectorAll(".research-map-dot-link"));
    var mapId = (map.querySelector(".research-map-svg title") || {}).id || "research-map";
    var inputId = mapId.replace(/-title$/, "") + "-year";

    var control = document.createElement("div");
    control.className = "research-map-years";
    var label = document.createElement("label");
    label.className = "research-map-years__label";
    label.setAttribute("for", inputId);
    label.textContent = "Publications";
    var input = document.createElement("input");
    input.type = "range";
    input.id = inputId;
    input.className = "research-map-years__input";
    input.min = String(minYear);
    input.max = String(maxYear);
    input.step = "1";
    input.value = String(maxYear);
    var output = document.createElement("output");
    output.className = "research-map-years__output";
    output.setAttribute("for", inputId);
    output.setAttribute("aria-live", "polite");
    control.append(label, input, output);
    map.insertAdjacentElement("afterend", control);

    function update() {
      var through = parseInt(input.value, 10);
      var counts = {};
      Object.keys(fieldCounts).forEach(function (key) {
        counts[key] = 0;
      });

      points.forEach(function (point, index) {
        var link = links[index];
        var year = parseInt(point.paper.year, 10);
        var hidden = !isNaN(year) && year > through;
        if (hidden && !link.classList.contains("is-year-hidden")) onHide(link);
        link.classList.toggle("is-year-hidden", hidden);
        link.setAttribute("tabindex", hidden ? "-1" : "0");
        if (hidden) link.setAttribute("aria-hidden", "true");
        else link.removeAttribute("aria-hidden");
        if (hidden) return;
        Object.keys(counts).forEach(function (key) {
          if (point.scores[key] < 0.5) return;
          // Optimization & ML counts only papers outside every application circle.
          var inApplication = Object.keys(point.scores).some(function (other) {
            return other !== "optimization" && point.scores[other] >= 0.5;
          });
          if (key === "optimization" && inApplication) return;
          counts[key] += 1;
        });
      });

      Object.keys(fieldCounts).forEach(function (key) {
        fieldCounts[key].textContent = "\u2009·\u2009" + counts[key];
      });
      var text = "Through " + through;
      output.textContent = text;
      input.setAttribute("aria-valuetext", text);
    }

    // Year hint: hovering shows the exact year under the pointer, and clicking
    // or dragging selects that same year, so what you see is what you get.
    var hint = document.createElement("span");
    hint.className = "research-map-years__hint";
    hint.setAttribute("aria-hidden", "true");
    hint.hidden = true;
    control.appendChild(hint);
    var thumbInset = 8;
    var dragging = false;
    var dragYear = null;

    function yearAt(clientX) {
      var rect = input.getBoundingClientRect();
      var ratio = (clientX - rect.left - thumbInset) / Math.max(1, rect.width - 2 * thumbInset);
      ratio = Math.min(1, Math.max(0, ratio));
      return minYear + Math.round(ratio * (maxYear - minYear));
    }

    function showHint(year) {
      var rect = input.getBoundingClientRect();
      var box = control.getBoundingClientRect();
      var ratio = (year - minYear) / Math.max(1, maxYear - minYear);
      hint.textContent = String(year);
      hint.style.left = rect.left - box.left + thumbInset + ratio * (rect.width - 2 * thumbInset) + "px";
      hint.style.top = rect.top - box.top + "px";
      hint.hidden = false;
    }

    function selectYear(year) {
      dragYear = year;
      if (input.value !== String(year)) {
        input.value = String(year);
        update();
      }
    }

    input.addEventListener("pointermove", function (event) {
      var year = yearAt(event.clientX);
      showHint(year);
      if (dragging) selectYear(year);
    });
    input.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) return;
      event.preventDefault();
      dragging = true;
      input.setPointerCapture(event.pointerId);
      input.focus();
      var year = yearAt(event.clientX);
      selectYear(year);
      showHint(year);
    });
    function endDrag(event) {
      dragging = false;
      dragYear = null;
      var rect = input.getBoundingClientRect();
      var inside =
        event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (event.pointerType !== "mouse" || !inside) hint.hidden = true;
    }
    input.addEventListener("pointerup", endDrag);
    input.addEventListener("pointercancel", endDrag);
    input.addEventListener("pointerleave", function () {
      if (!dragging) hint.hidden = true;
    });

    input.addEventListener("input", function () {
      // Keep the pointer-selected year if the browser's own drag disagrees.
      if (dragging && dragYear !== null) input.value = String(dragYear);
      else hint.hidden = true;
      update();
    });
    update();
  }

  function showTooltip(map, tooltip, link, paper, isPinned) {
    var mapRect = map.getBoundingClientRect();
    var dotRect = link.getBoundingClientRect();
    var title = document.createElement("strong");
    var meta = document.createElement("span");
    tooltip.style.setProperty("--tooltip-color", link.style.getPropertyValue("--dot-color"));
    title.textContent = paper.title;
    meta.textContent = paper.year + (isPinned ? " · View publication" : " · Select dot for details");
    tooltip.classList.toggle("is-pinned", isPinned);
    if (isPinned) {
      var publicationLink = document.createElement("a");
      publicationLink.className = "research-map-tooltip-link";
      publicationLink.href = paper.url;
      publicationLink.setAttribute("aria-label", "View " + paper.title);
      publicationLink.append(title, meta);
      tooltip.replaceChildren(publicationLink);
    } else {
      tooltip.replaceChildren(title, meta);
    }
    tooltip.hidden = false;
    tooltip.style.left = clamp(dotRect.left + dotRect.width / 2 - mapRect.left, 138, mapRect.width - 138) + "px";
    tooltip.style.top = dotRect.top + dotRect.height / 2 - mapRect.top + "px";
  }

  function hideTooltip(tooltip) {
    tooltip.classList.remove("is-pinned");
    tooltip.hidden = true;
  }

  function dominantField(scores) {
    return Object.keys(scores).reduce(function (best, key) {
      return scores[key] > scores[best] ? key : best;
    });
  }

  function scoreKeys(scores) {
    return Object.keys(scores).filter(function (key) {
      return scores[key] > 0;
    });
  }

  function maxScore(scores) {
    return Object.keys(scores).reduce(function (max, key) {
      return Math.max(max, scores[key]);
    }, 0);
  }

  function cleanTitle(title) {
    return title.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  }

  function matches(text, expression) {
    return expression.test(text);
  }

  function seeded(value) {
    var hash = 2166136261;
    for (var i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function svgEl(name, attributes) {
    var element = document.createElementNS(NS, name);
    Object.keys(attributes || {}).forEach(function (key) {
      element.setAttribute(key, attributes[key]);
    });
    return element;
  }

})();
