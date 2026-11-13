# Maintaining the website

This project contains the Jekyll source for
[harshangrjn.github.io](https://harshangrjn.github.io). GitHub Actions builds the
source and publishes the generated site to the `gh-pages` branch.

Do not edit or commit `_site`, `vendor`, `node_modules`, or `.jekyll-cache`. Do
not edit the generated files on `gh-pages`; they are replaced on every
deployment.

## Recommended workflow

1. Pull the latest `master`.
2. Create a short-lived branch for the update.
3. Edit the Jekyll source and preview it locally when appropriate.
4. Commit and push the branch, then open a pull request into `master`.
5. Confirm that the pull-request build passes before merging.

Merging to `master` triggers the production deployment automatically.

## Where content lives

| To change | Edit |
| --- | --- |
| Homepage biography, appointments, and research introduction | `_pages/about.md` |
| Homepage research cards and page structure | `_layouts/home.liquid` |
| Recent homepage updates | `_data/updates.yml` |
| Research areas, tracks, descriptions, and ordering | `_data/research_areas.yml` |
| Publications and their research-area assignments | `_bibliography/papers.bib` |
| Software cards | `_data/software.yml` |
| Experience, education, honors, and service | `_data/experience.yml` |
| Current and former group members | `_data/group.yml` |
| Media coverage | `_data/media.yml` |
| Contact details and profile links | `_data/profiles.yml` |
| Music content | `_data/music.yml` and `_pages/music.html` |
| Main portrait | `assets/img/prof_pic.jpg` and `assets/img/prof_pic.webp` |
| Site-wide colors, typography, and spacing | `_sass/_custom.scss` |
| Research-map styling and behavior | `assets/css/research-draft.scss` and `assets/js/research-map.js` |
| Global metadata and Jekyll settings | `_config.yml` |

Page files are in `_pages/`; shared templates are in `_layouts/` and
`_includes/`. Publication cards are rendered by `_layouts/bib.liquid`.

## Publications

Add or update entries in `_bibliography/papers.bib`. A publication automatically
appears on the Publications page and in each research area named by its `areas`
field.

```bibtex
@article{lastname2027keyword,
  title    = {Paper Title},
  author   = {Lastname, F. and Nagarajan, Harsha and Other, A.},
  journal  = {Journal Name},
  year     = {2027},
  month    = mar,
  doi      = {10.xxxx/xxxxx},
  arxiv    = {2701.01234},
  abbr     = {JNL},
  pubtype  = {journal},
  areas    = {global, learning}
}
```

Current publication-area IDs are:

- `global` and `learning`: tracks within Optimization & Machine Learning
- `uncertainty`: Power Systems Optimization Under Uncertainty
- `resilience`: Resilient Power Transmission & Distribution Grids
- `networks`: Networks, Control & Robotics
- `quantum`: Quantum Computing
- `science`: Optimization & AI for Scientific Computing

Use multiple IDs when a paper belongs to more than one area. The optional
`featured` field controls Selected Publications on the Research page. It should
contain a comma-separated subset of the IDs in `areas`.

Useful optional link fields are `code`, `pdf`, `html`, `poster`, `slides`, and
`video`. For a local PDF placed in `pdf/`, use:

```bibtex
pdf = {/pdf/filename.pdf}
```

For a paper under review, use `pubtype = {review}` and a `status` field such as
`status = {Under review since March 2027}`. Once accepted, change `pubtype` to
the appropriate final type and remove `status`.

Custom website fields such as `areas`, `featured`, `pubtype`, and `status` are
hidden from the BibTeX copied by visitors.

## Other routine updates

- Add recent news at the top of `_data/updates.yml`; the homepage displays the
  newest items up to the limit in `_pages/about.md`.
- Keep entries in `_data/experience.yml` and `_data/media.yml` in display order,
  generally newest first.
- Move group members between the `current` and `former` sections of
  `_data/group.yml` when their status changes.
- Add software in `_data/software.yml`; use `featured: true` when it should also
  appear on the homepage.
- When adding a new research-area ID, update `_data/research_areas.yml`, the
  relevant publication tags, and the matching color definitions in
  `_sass/_custom.scss`.

## Local preview

The deployment workflow uses Ruby 3.3, Node 20, and the dependencies locked in
`Gemfile.lock` and `package-lock.json`.

For the first local setup:

```bash
bundle config set --local path vendor/bundle
bundle install
npm ci
```

To preview:

```bash
bundle exec jekyll serve --livereload
```

Open <http://127.0.0.1:4000>. Restart the server after changing `_config.yml`.
To verify a production build, run:

```bash
JEKYLL_ENV=production bundle exec jekyll build
```

## Publishing

`.github/workflows/deploy.yml` runs for pull requests and for pushes to
`master` or `main`.

- On a pull request, it installs dependencies and builds the site but skips
  deployment.
- After a merge to `master`, it builds `_site` and publishes that output to
  `gh-pages`.
- GitHub Pages should be configured to serve the root of the `gh-pages` branch.

If a build fails, the current live site remains unchanged. Check the
repository's Actions tab for the failing step.

Legacy URLs under `/publication/`, `/post/`, `/talk/`, `/categories/`, `/tags/`,
and `/publication_types/` are preserved by redirects in `_pages/legacy/`.

Private working documents listed in `.gitignore` must remain outside version
control.
