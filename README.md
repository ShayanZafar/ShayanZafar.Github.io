# shayanzafar.github.io

Personal website of **Shayan Zafar Ahmad**, Senior Software Engineering Manager, live at
**https://shayanzafar.github.io/**.

A fast, dependency-free static site (HTML, CSS, and a little JavaScript) hosted free on GitHub Pages.
No build step: what's in this repo is exactly what gets served.

It's meant to complement LinkedIn, not repeat it: how I lead, what I build (pulled from GitHub), and a compact
career summary. The full résumé lives in the downloadable PDF.

## What's here

| Path | Purpose |
| --- | --- |
| `index.html` | All page content: about and *Now*, how I lead, career, projects, contact. Skills and education are print-only (they appear in the PDF) |
| `assets/css/styles.css` | Styles, including automatic dark mode and the print/PDF résumé layout |
| `assets/js/main.js` | Small enhancements: auto-updating "years of experience", career highlight toggles, active nav link, live GitHub commits and repo list |
| `assets/img/shayan-zafar-ahmad.jpg` | Portrait used in the hero (600×600, face-centred crop, metadata stripped) |
| `assets/img/projects/` | ThirteenF screenshots (light and dark), cropped from the ThirteenF repo's `design/screens/png/` |
| `assets/img/og-image.png` | Link-preview image shown when the URL is shared on LinkedIn, Slack, etc. (1200×627) |
| `assets/Shayan_Zafar_Ahmad_Resume.pdf` | Downloadable résumé, generated from the page's print layout |
| `favicon.svg`, `apple-touch-icon.png` | Browser tab and home-screen icons |
| `404.html` | Custom "page not found" page |
| `.nojekyll` | Tells GitHub Pages to serve files as-is (skip Jekyll) |

## Editing

All content lives in `index.html`. The "14 years" / "7 years" figures update themselves each year via
`data-years-since="YYYY-MM"`, so they don't need manual edits.

After changing experience or skills, regenerate the résumé PDF (below) so the download matches the page.

**Now section:** update the two lines and the "Updated" month in the About section when your focus changes.

**Live GitHub activity:** the Projects section lists ThirteenF's latest commits. `main.js` fetches them from the public
GitHub API in each visitor's browser (`data-gh-commits="owner/repo"`), skipping merge commits. The commits written
into `index.html` are a fallback snapshot, shown if the API is slow, blocked or rate-limited, so refresh them
occasionally. To feature another repo, copy the project card and change the `data-gh-*` attributes.

**New repos appear automatically:** under Projects, "More on GitHub" lists your own public repos, fetched live, so a
new repo shows up on the next page load after you push to it. The rules:

- Forks and archived repos are never shown. Neither is anything in `data-gh-exclude` (this site, the featured
  ThirteenF card, and CImg, which is a copy of an open-source library).
- A repo appears if it was pushed to in the last 12 months (`data-gh-days`), up to six (`data-gh-max`).
- Add the GitHub topic `portfolio` to show an older repo, or `hide-from-site` to keep one off. Topics are under
  **About ⚙** on the repo's GitHub page.
- A repo's description, language, stars and homepage ("Live site") come straight from GitHub, so fill those in.

The section stays hidden while no repo qualifies. ThirteenF's "In active development" label switches to "Side
project" automatically after 90 days without commits.

**Caching:** GitHub Pages lets browsers cache files for 10 minutes. When you change `styles.css` or `main.js`,
bump the `?v=` date on their links in `index.html` so returning visitors don't get new HTML with old CSS.

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
