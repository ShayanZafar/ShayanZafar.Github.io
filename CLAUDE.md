# shayanzafar.github.io

Shayan Zafar Ahmad's personal site, live at https://shayanzafar.github.io/. A static site with no build
step and no dependencies: HTML, one stylesheet and a little JavaScript, served as they are by GitHub Pages.
`README.md` is the full guide (what each file is for, how editing, visit statistics and deployment work);
read it before changing anything.

## Where things are

- `index.html`: all the home page's content. `how-i-work/index.html`: the long-form page. `404.html`.
- `admin/index.html`: an unlisted page for the owner (GoatCounter dashboard link, the switch that stops
  counting their own visits).
- `assets/css/styles.css`: every style, including dark mode and the print layout the résumé PDF is made from.
- `assets/js/main.js`: small enhancements (years of experience, live GitHub commits and repo list).
- `scripts/check-site.mjs`: the site's checks. `.github/workflows/site.yml`: runs them, rebuilds the résumé
  PDF from the print layout and deploys only when they pass.

## Rules

- No build step, framework or npm package. What's in the repo is what gets served.
- No phone number or postal code anywhere public, including the PDF. Copy stays professional, with no
  placeholders; the banned phrases are in `scripts/check-site.mjs`.
- When `styles.css` or `main.js` changes, bump the `?v=` date on their links in every page, together.
- `admin/` stays unlisted: no page links to it, `noindex`, and no GoatCounter script. Every public page
  loads GoatCounter once and shows the footer notice; never turn on `allow_local`.
- A tracked link carries both `data-goatcounter-click` (lowercase-hyphenated) and `data-goatcounter-title`;
  reuse an existing name and title where one fits.
- The print layout is the résumé: a change to `index.html` or the print styles changes the PDF. It must
  keep the text the workflow looks for (name, section headings, dates, "T-SQL") and stay at 2 pages.
- Never commit secrets or personal contact details beyond what the page already shows.

## Definition of done

- `node scripts/check-site.mjs` passes. Show its last line in your summary. Add `--external` when you
  added or changed an external link.
- For a visible change, preview it (`python3 -m http.server 4173`, then http://localhost:4173) in light
  and dark, at phone width, and in print preview when the change touches the résumé.
- `README.md` matches the site: a new file, page, rule or click event goes in its tables and lists.
- A new site rule goes into `scripts/check-site.mjs` too, so it is checked rather than remembered.
- Never loosen or remove a check in `scripts/check-site.mjs` or `site.yml` without asking the user first.

## Commands

- `node scripts/check-site.mjs`: structure, links between pages, copy and privacy rules (what CI runs).
  `--external` adds every external link; `--external-only` checks only those.
- `python3 -m http.server 4173` (on Windows `py -3 -m http.server 4173`): local preview.
