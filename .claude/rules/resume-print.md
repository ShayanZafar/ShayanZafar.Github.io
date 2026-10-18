---
paths:
  - "index.html"
  - "assets/css/styles.css"
  - "assets/js/main.js"
  - ".github/workflows/site.yml"
---

# The résumé PDF

- The print layout is the résumé: a change to `index.html`, the print styles or what `main.js` fills in
  (years of experience, the current year; Chrome runs it before printing) changes the PDF. It must
  keep the text the workflow looks for (name, section headings, dates, "T-SQL") and stay at 2 pages.
- Preview a change that touches the résumé in print preview too, besides the light, dark and phone-width
  previews in CLAUDE.md's definition of done.
