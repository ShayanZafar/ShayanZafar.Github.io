---
paths:
  - "**/*.html"
---

# Visit statistics (GoatCounter)

- `admin/` stays unlisted: no page links to it, `noindex`, and no GoatCounter script. Every public page
  loads GoatCounter once and shows the footer notice; never turn on `allow_local`.
- A tracked link carries both `data-goatcounter-click` (lowercase-hyphenated) and `data-goatcounter-title`;
  reuse an existing name and title where one fits.
