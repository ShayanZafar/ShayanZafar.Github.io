// Playwright configuration for the UI tests: a real Chromium drives the site as served by `python3 -m http.server`,
// the same way the résumé PDF build serves it. Run with tests/ui/run.sh (Playwright via npx, nothing installed in the
// repo). Test tooling only: never deployed (the Site workflow leaves tests/ out).

import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = 4173;

export default {
  testDir: '.',
  testMatch: '*.spec.js',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 30_000,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || join(tmpdir(), 'site-ui-tests'),
  use: {
    browserName: 'chromium',
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
    cwd: '../..',
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'ignore',
  },
};
