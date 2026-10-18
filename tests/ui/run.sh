#!/usr/bin/env bash
# Runs the UI tests (tests/ui/*.spec.js) with Playwright fetched by npx: nothing is installed in the repo, and there is
# no package.json. CI runs this on every push and pull request (.github/workflows/site.yml). Locally it needs Node,
# Python 3 and Playwright's Chromium (`tests/ui/run.sh install` downloads it once).
#
#   tests/ui/run.sh                 run every UI test
#   tests/ui/run.sh -g "404"        any other arguments go to `playwright test`
#   tests/ui/run.sh install [...]   download Playwright's Chromium (CI adds --with-deps)
#
# PLAYWRIGHT_VERSION picks another Playwright release, e.g. one matching a Chromium already on the machine.
set -euo pipefail

version="${PLAYWRIGHT_VERSION:-1.64.1}"
cd "$(dirname "$0")/../.."

package="@playwright/test@$version"
if [ "${1:-}" = install ]; then
  shift
  exec npx -y -p "$package" playwright install "$@" chromium
fi

# The test files import @playwright/test; NODE_PATH lets them find the copy npx fetched.
modules=$(npx -y -p "$package" -c 'dirname "$(dirname "$(command -v playwright)")"')
NODE_PATH="$modules" exec npx -y -p "$package" playwright test -c tests/ui "$@"
