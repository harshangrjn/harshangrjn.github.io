---
layout: home
title: Home
permalink: /
description: Harsha Nagarajan — Staff Scientist at Los Alamos National Laboratory working on global optimization, optimization under uncertainty, and learning-accelerated optimization for energy systems and quantum computing.

# Current appointments shown under the name
roles:
  - title: Staff Scientist
    org: Los Alamos National Laboratory
    url: https://www.lanl.gov

# One-sentence lead-in for the research-area cards
research_intro: >
  My research develops mathematical programming formulations and optimization algorithms for
  large-scale nonlinear and discrete decision-making problems. Data shape the optimization
  strategy: parametric problems solved repeatedly with changing inputs generate data that support
  learning-accelerated methods, while uncertain operating conditions call for stochastic and robust
  optimization that hedges against them, and for bilevel models when disruptions are strategic.
  This methodological core connects applications in power systems, networks and control, and
  quantum computing.

# How many items from _data/updates.yml to show
updates_limit: 7
---
{%- assign current_graduate_group = site.data.group.current | where: 'heading', 'Graduate Researchers' | first -%}
{%- assign former_graduate_group = site.data.group.former | where: 'heading', 'Graduate Researchers' | first -%}
{%- assign graduate_researcher_count = current_graduate_group.people.size | plus: former_graduate_group.people.size -%}

I am a Staff Scientist in the [Applied Mathematics and Plasma Physics group (T-5)](https://www.lanl.gov/engage/organizations/aldsct/theoretical/ampp) of the Theoretical Division at [Los Alamos National Laboratory](https://www.lanl.gov) and a member of the [Advanced Network Science Initiative](https://lanl-ansi.github.io).

My research develops theory, algorithms, and open-source software for large-scale **mixed-integer and nonlinear programming**, including **global optimization** of nonconvex programs, **optimization under uncertainty**, and **learning-accelerated optimization**, with applications in power systems, networks and control, and quantum computing.

I have led and co-led externally funded, multidisciplinary research programs with national laboratories and industry partners, and I have mentored 3 postdoctoral researchers and {{ graduate_researcher_count }} graduate researchers. Before my staff appointment, I was a postdoctoral researcher at the [Center for Nonlinear Studies](https://cnls.lanl.gov) at Los Alamos National Laboratory; more about my background is available [here]({{ '/experience/' | relative_url }}).

If you would like to work with talented researchers in a collaborative environment, feel free to contact me.
