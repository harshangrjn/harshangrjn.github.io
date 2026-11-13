/*
 * Interactive publication intersection maps for the Home and Research pages.
 * Placements are deterministic and derived from the bibliography's existing
 * area tags plus conservative title keywords. No coordinates are stored.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var source = document.getElementById("research-map-source");
  var mapElements = Array.prototype.slice.call(document.querySelectorAll("[data-research-map]"));

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
  var globalTerms = /\bglobal|nonconvex|relaxation|convex hull|multilinear|branch-and-bound|partitioning|bound tightening|polyhedral|piecewise convex|mccormick/;
  var uncertaintyTerms = /\buncertain|stochastic|chance-constrained|adversarial|\bn-[1k]\b|failure|disruption|geomagnetic|security|robust (optimization|planning|partitioning|operation|renewable|load)/;
  var learningTerms = /\blearn|machine learning|neural|reinforcement|agentic|\bai\b|semi-markov/;
  var operationsTerms = /\boperation|planning|dispatch|commitment|switching|optimal power flow|\bacopf\b|\bopf\b|pricing|arbitrage|design|reconfiguration|topology|load delivery|power loss|optimality|relaxation|formulation/;
  var resilienceTerms = /\bresilien|microgrid|restoration|black start|load delivery|load restoration|disruption|failure|security-constrained|off-grid/;
  var designTerms = /\bdesign|synthesi|maximi[sz]ing|connectivity|topology|graph|network|configuration|expansion/;
  var controlTerms = /\bcontrol|stability|disturbance|dynamic|natural frequenc|string stability|propagation/;
  var autonomyTerms = /\buav\b|\brobot|vehicle|trajectory|space object|air transportation|localization/;

  var overviewConfig = {
    width: 720,
    height: 650,
    radius: 168,
    dotRadius: 6.2,
    fields: [
      {
        key: "optimization",
        label: "Optimization & Machine Learning",
        x: 360,
        y: 300,
        r: 190,
        lx: 360,
        ly: 85,
      },
      { key: "power", label: "Power systems", sublabel: "planning · operations · resilience", x: 210, y: 325, r: 165, lx: 125, ly: 510 },
      { key: "quantum", label: "Quantum computing", x: 510, y: 325, r: 165, lx: 595, ly: 510 },
      { key: "networks", label: "Networks & Control", x: 360, y: 475, r: 115, lx: 360, ly: 625 },
    ],
  };

  var detailConfigs = {
    optimization: detailConfig([
      ["global", "Deterministic global optimization", ""],
      ["uncertainty", "Optimization under uncertainty", "stochastic · robust"],
      ["learning", "ML-accelerated optimization", ""],
    ]),
    power: detailConfig([
      ["operations", "Operations & planning", ""],
      ["uncertainty", "Under uncertainty", ""],
      ["resilience", "Resilience", ""],
    ]),
    quantum: detailConfig([
      ["circuits", "Quantum circuit optimization", ""],
      ["hybrid", "Hybrid quantum–classical", ""],
      ["formulations", "QUBO formulations & benchmarks", ""],
    ]),
    networks: detailConfig([
      ["design", "Network design", ""],
      ["control", "Dynamics & Control", ""],
      ["autonomy", "Robotics & autonomy", ""],
    ]),
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
    var kind = map.dataset.researchMap;
    var isOverview = kind === "overview";
    var config = isOverview ? overviewConfig : detailConfigs[kind];
    if (!config) return;

    var mapped = papers
      .map(function (paper) {
        var scores = isOverview ? paper.overviewScores : scoreDetail(kind, paper);
        return { paper: paper, scores: scores };
      })
      .filter(function (item) {
        return maxScore(item.scores) > 0;
      });

    drawMap(map, config, mapped, isOverview);

    var count = document.querySelector('[data-map-count="' + kind + '"]');
    if (count) count.textContent = String(mapped.length);
  });

  setupOverviewFilters();

  function detailConfig(fields) {
    var positions = [
      { x: 360, y: 205, lx: 360, ly: 20 },
      { x: 247, y: 345, lx: 175, ly: 515 },
      { x: 473, y: 345, lx: 545, ly: 515 },
    ];
    return {
      width: 720,
      height: 560,
      radius: 145,
      dotRadius: 6,
      fields: fields.map(function (field, index) {
        return {
          key: field[0],
          label: field[1],
          sublabel: field[2],
          x: positions[index].x,
          y: positions[index].y,
          lx: positions[index].lx,
          ly: positions[index].ly,
        };
      }),
    };
  }

  function scoreOverview(paper) {
    var scores = { optimization: 0, power: 0, quantum: 0, networks: 0 };
    var title = paper.title.toLowerCase();
    var has = function (area) {
      return paper.areas.indexOf(area) !== -1;
    };

    // "Computational grids" in this scientific-computing paper are numerical
    // meshes, not electric grids; keep it in the detailed Science thread only.
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

  function scoreDetail(kind, paper) {
    var title = paper.title.toLowerCase();
    var has = function (area) {
      return paper.areas.indexOf(area) !== -1;
    };
    var scores;

    if (kind === "optimization") {
      scores = { global: 0, uncertainty: 0, learning: 0 };
      if (has("global")) scores.global = 1;
      if (has("uncertainty")) scores.uncertainty = 1;
      if (has("learning")) scores.learning = 1;
      if (matches(title, globalTerms)) scores.global = Math.max(scores.global, 0.88);
      if (matches(title, uncertaintyTerms)) scores.uncertainty = Math.max(scores.uncertainty, 0.88);
      if (matches(title, learningTerms)) scores.learning = Math.max(scores.learning, 0.9);
      return scores;
    }

    if (kind === "power") {
      scores = { operations: 0, uncertainty: 0, resilience: 0 };
      if (paper.overviewScores.power < 0.5) return scores;
      if (matches(title, operationsTerms)) scores.operations = 0.92;
      if (has("uncertainty") || matches(title, uncertaintyTerms)) scores.uncertainty = has("uncertainty") ? 1 : 0.82;
      if (has("resilience") || matches(title, resilienceTerms)) scores.resilience = has("resilience") ? 1 : 0.84;
      return scores;
    }

    if (kind === "quantum") {
      scores = { circuits: 0, hybrid: 0, formulations: 0 };
      if (paper.overviewScores.quantum < 0.5) return scores;
      if (matches(title, /\bcircuit|compil|synthesis/)) scores.circuits = 1;
      if (matches(title, /\bhybrid|accelerated classical|unit commitment|power systems/)) scores.hybrid = 1;
      if (matches(title, /\bqubo|ising|integer programming|reformulation|processing unit|hardware|benchmark|quantumcircuitopt/)) scores.formulations = 1;
      if (maxScore(scores) === 0) scores.formulations = 0.65;
      return scores;
    }

    scores = { design: 0, control: 0, autonomy: 0 };
    if (paper.overviewScores.networks < 0.5) return scores;
    if (matches(title, designTerms)) scores.design = 0.95;
    if (matches(title, controlTerms)) scores.control = 0.95;
    if (matches(title, autonomyTerms)) scores.autonomy = 1;
    if (maxScore(scores) === 0) scores.design = 0.6;
    return scores;
  }

  function drawMap(map, config, mapped, isOverview) {
    var svg = map.querySelector("svg");
    var tooltip = map.querySelector(".research-map-tooltip");
    var fieldLayer = svgEl("g", { class: "research-map-fields" });
    var dotLayer = svgEl("g", { class: "research-map-dots" });
    var pinnedLink = null;

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

    config.fields.forEach(function (field, index) {
      var color = isOverview ? pillarColors[field.key] : detailColor(map.dataset.researchMap, index);
      var labelX = field.lx;
      var labelY = field.ly;
      if (isOverview && map.classList.contains("research-map--home")) {
        if (field.key === "power") labelX = 75;
        if (field.key === "quantum") {
          labelX = 618;
          labelY = 525;
        }
      }
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

      if (field.label2) {
        var label2 = svgEl("text", {
          class: "research-map-field-label research-map-field-label--" + field.key,
          x: labelX,
          y: labelY + 25,
          "text-anchor": "middle",
          "data-field": field.key,
        });
        label2.style.setProperty("--field-color", color);
        label2.textContent = field.label2;
        fieldLayer.appendChild(label2);
      }

      if (field.sublabel) {
        var sublabel = svgEl("text", {
          class: "research-map-field-sublabel research-map-field-sublabel--" + field.key,
          x: labelX,
          y: labelY + 24,
          "text-anchor": "middle",
          "data-field": field.key,
        });
        sublabel.style.setProperty("--field-color", color);
        sublabel.textContent = field.sublabel;
        fieldLayer.appendChild(sublabel);
      }
    });

    var points = placePoints(mapped, config, isOverview);

    points.forEach(function (point) {
      var dominant =
        isOverview && point.scores.quantum >= 0.5
          ? "quantum"
          : dominantField(point.scores);
      var link = svgEl("a", {
        class: "research-map-dot-link",
        href: point.paper.url,
        tabindex: "0",
        "aria-label": "Show details for " + point.paper.title + " (" + point.paper.year + ")",
        "aria-expanded": "false",
        "data-fields": scoreKeys(point.scores).join(" "),
      });
      var title = svgEl("title");
      title.textContent = point.paper.title + " (" + point.paper.year + ")";
      var isHomeOverview = isOverview && map.classList.contains("research-map--home");
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
      dot.style.setProperty(
        "--dot-color",
        isOverview
          ? pillarColors[dominant]
          : pillarColors[map.dataset.researchMap]
      );
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

  function placePoints(mapped, config, isOverview) {
    var fieldByKey = {};
    config.fields.forEach(function (field) {
      fieldByKey[field.key] = field;
    });

    var points = mapped.map(function (item) {
      var keys = scoreKeys(item.scores);
      var total = keys.reduce(function (sum, key) {
        return sum + item.scores[key];
      }, 0);
      var base = isOverview ? overviewAnchor(keys, item.scores) : null;
      var baseX = base
        ? base.x
        : keys.reduce(function (sum, key) {
            return sum + fieldByKey[key].x * item.scores[key];
          }, 0) / total;
      var baseY = base
        ? base.y
        : keys.reduce(function (sum, key) {
            return sum + fieldByKey[key].y * item.scores[key];
          }, 0) / total;
      var angle = seeded(item.paper.key + "-angle") * Math.PI * 2;
      var spreadLimit = keys.length > 1 ? 28 : config.dotRadius < 6 ? 36 : 31;
      if (isOverview) spreadLimit = keys.length > 1 ? 34 : 42;
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

    var minimum = config.dotRadius * 2 + (isOverview ? 10 : 5);
    for (var iteration = 0; iteration < 220; iteration++) {
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
      points.forEach(function (point) {
        point.x += (point.baseX - point.x) * 0.012;
        point.y += (point.baseY - point.y) * 0.012;
        constrainToFields(point, fieldByKey, config);
        separateFromFieldBoundaries(point, fieldByKey, config);
        point.x = clamp(point.x, 34, config.width - 34);
        point.y = clamp(point.y, 42, config.height - 42);
      });
    }

    for (var pass = 0; pass < 6; pass++) {
      points.forEach(function (point) {
        constrainToFields(point, fieldByKey, config);
        separateFromFieldBoundaries(point, fieldByKey, config);
      });
    }

    return points;
  }

  function overviewAnchor(keys, scores) {
    var memberships = keys.filter(function (key) {
      return scores[key] >= 0.5;
    });
    if (!memberships.length) memberships = [dominantField(scores)];
    var anchors = {
      optimization: { x: 360, y: 195 },
      power: { x: 145, y: 330 },
      quantum: { x: 600, y: 330 },
      networks: { x: 360, y: 525 },
      "optimization|power": { x: 270, y: 290 },
      "optimization|quantum": { x: 450, y: 290 },
      "optimization|networks": { x: 360, y: 455 },
      "power|networks": { x: 285, y: 430 },
      "quantum|networks": { x: 435, y: 430 },
      "optimization|power|quantum": { x: 360, y: 325 },
      "optimization|power|networks": { x: 290, y: 420 },
      "optimization|quantum|networks": { x: 430, y: 420 },
      "optimization|power|quantum|networks": { x: 360, y: 410 },
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
      var margin = config.dotRadius + (config === overviewConfig ? 10 : 9);
      if (Math.abs(distance - radius) >= margin) return;

      var isMember = point.scores[key] >= 0.5;
      var target = isMember ? radius - margin : radius + margin;
      point.x = field.x + (dx / distance) * target;
      point.y = field.y + (dy / distance) * target;
    });
  }

  function setupOverviewFilters() {
    var map = document.querySelector('[data-research-map="overview"]');
    if (!map) return;
    var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-map-filter]"));
    var active = "";

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var requested = button.dataset.mapFilter;
        active = active === requested ? "" : requested;

        buttons.forEach(function (item) {
          item.setAttribute("aria-pressed", String(item.dataset.mapFilter === active));
        });
        map.classList.toggle("is-filtered", Boolean(active));

        Array.prototype.slice.call(map.querySelectorAll(".research-map-dot-link")).forEach(function (link) {
          var fields = (link.dataset.fields || "").split(" ");
          link.classList.toggle("is-match", !active || fields.indexOf(active) !== -1);
        });
        Array.prototype.slice.call(map.querySelectorAll("[data-field]")).forEach(function (field) {
          field.classList.toggle("is-match", !active || field.dataset.field === active);
        });
      });
    });
  }

  function showTooltip(map, tooltip, link, paper, isPinned) {
    var mapRect = map.getBoundingClientRect();
    var dotRect = link.getBoundingClientRect();
    var title = document.createElement("strong");
    var meta = document.createElement("span");
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

  function detailColor(kind, index) {
    var base = pillarColors[kind] || pillarColors.optimization;
    var mixes = [
      base,
      "color-mix(in srgb, " + base + " 74%, var(--hn-gold))",
      "color-mix(in srgb, " + base + " 72%, var(--hn-accent))",
    ];
    return mixes[Math.max(0, index)] || base;
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
