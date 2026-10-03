# shayanzafar.github.io

Personal website of **Shayan Zafar Ahmad**, Senior Software Engineering Manager, live at
**https://shayanzafar.github.io/**.

A fast, dependency-free static site (HTML, CSS, and a little JavaScript) hosted free on GitHub Pages.
No build step: what's in this repo is exactly what gets served.

## What's here

| Path | Purpose |
| --- | --- |
| `index.html` | All page content: about, expertise, experience, skills, education, contact |
| `assets/css/styles.css` | Styles, including automatic dark mode and the print/PDF résumé layout |
| `assets/js/main.js` | Small enhancements: auto-updating "years of experience", "show more" toggles, active nav link |
| `assets/img/shayan-zafar-ahmad.jpg` | Portrait used in the hero (600×600, face-centred crop, metadata stripped) |
| `assets/img/og-image.png` | Link-preview image shown when the URL is shared on LinkedIn, Slack, etc. (1200×627) |
| `assets/Shayan_Zafar_Ahmad_Resume.pdf` | Downloadable résumé, generated from the page's print layout |
| `favicon.svg`, `apple-touch-icon.png` | Browser tab and home-screen icons |
| `404.html` | Custom "page not found" page |
| `.nojekyll` | Tells GitHub Pages to serve files as-is (skip Jekyll) |

## Editing

All content lives in `index.html`. The "14 years" / "7 years" figures update themselves each year via
`data-years-since="YYYY-MM"`, so they don't need manual edits.

After changing experience or skills, regenerate the résumé PDF (below) so the download matches the page.

## Preview locally

```bash
py -3 -m http.server 4173
```

Then open http://localhost:4173.

## Regenerate the résumé PDF

The PDF is the page's print layout. With the local preview running, either print the page from Chrome
(**Save as PDF**, Letter, margins *Default*, headers and footers off) to `assets/Shayan_Zafar_Ahmad_Resume.pdf`,
or run headless Chrome:

```bash
"/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" --headless=new --no-pdf-header-footer --print-to-pdf=assets/Shayan_Zafar_Ahmad_Resume.pdf http://localhost:4173/
```

## Deploying

GitHub Pages publishes the `master` branch automatically: push and the site updates in about a minute.
(One-time setup: **Settings → Pages → Build and deployment → Deploy from a branch → `master` / `(root)`**.)

## Sharing on LinkedIn

LinkedIn caches link previews. After changing the title, description, or `og-image.png`, refresh the cache
with the [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).
