// Unit tests for scripts/instruction-files.mjs, the pure parts of the check of Claude's instruction files.
// Run with `node --test` from the repo root (Node's built-in test runner, no packages).

import assert from 'node:assert/strict';
import test from 'node:test';
import { globToRegExp, instructionReport, rulePaths, splitFrontmatter, wordCount } from '../../scripts/instruction-files.mjs';

const limits = { claudeMd: 600, rule: 500 };
const words = (n) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
const rule = (paths, body = 'One rule.') => `---\npaths:\n${paths.map((p) => `  - "${p}"`).join('\n')}\n---\n\n${body}\n`;
const FILES = ['index.html', 'how-i-work/index.html', 'admin/index.html', 'assets/css/styles.css', '.github/workflows/site.yml'];

test('wordCount counts whitespace-separated words and leaves out HTML comments', () => {
  assert.equal(wordCount('# Title\n\n- `node scripts/check-site.mjs` passes.\t Done'), 7);
  assert.equal(wordCount('one <!-- a note\nfor people, over two lines --> two'), 2);
  assert.equal(wordCount('  \n '), 0);
});

test('splitFrontmatter separates the YAML between --- lines from the body', () => {
  assert.deepEqual(splitFrontmatter('---\npaths:\n  - "a"\n---\n\nBody\n'), { frontmatter: 'paths:\n  - "a"', body: '\nBody\n' });
  assert.deepEqual(splitFrontmatter('\uFEFF---\r\npaths: a\r\n---\r\nBody'), { frontmatter: 'paths: a', body: 'Body' });
  assert.deepEqual(splitFrontmatter('# No frontmatter\n---\n'), { frontmatter: null, body: '# No frontmatter\n---\n' });
});

test('rulePaths reads paths as a block list, a flow list or a comma-separated string', () => {
  assert.deepEqual(rulePaths('paths:\n  - "index.html"\n  - \'**/*.css\'  # styles\n  - docs/*.md\nother: x'), ['index.html', '**/*.css', 'docs/*.md']);
  assert.deepEqual(rulePaths('paths: ["src/*.{ts,tsx}", lib/*.ts]'), ['src/*.{ts,tsx}', 'lib/*.ts']);
  assert.deepEqual(rulePaths('paths: "src/*.{ts,tsx}, lib/*.ts"'), ['src/*.{ts,tsx}', 'lib/*.ts']);
  assert.deepEqual(rulePaths('paths: # the pages\n\n  - "**/*.html"'), ['**/*.html']);
});

test('rulePaths is empty without frontmatter, without paths, or with an empty list', () => {
  assert.deepEqual(rulePaths(null), []);
  assert.deepEqual(rulePaths('description: no paths here'), []);
  assert.deepEqual(rulePaths('paths:\nother: x'), []);
  assert.deepEqual(rulePaths('paths: []'), []);
});

test('globToRegExp matches like Claude Code\'s rule globs', () => {
  const cases = [
    ['**/*.html', 'index.html', true],
    ['**/*.html', 'admin/index.html', true],
    ['**/*.html', 'assets/css/styles.css', false],
    ['*.html', 'index.html', true],
    ['*.html', 'admin/index.html', false],
    ['admin/**', 'admin/index.html', true],
    ['admin/**', 'administrator/index.html', false],
    ['src/**/*.ts', 'src/a.ts', true],
    ['src/**/*.ts', 'src/x/y/a.ts', true],
    ['src/**/*.ts', 'lib/src/a.ts', false],
    ['**', 'any/file.txt', true],
    ['assets/*/styles.css', 'assets/css/styles.css', true],
    ['assets/*/styles.css', 'assets/css/old/styles.css', false],
    ['index.htm?', 'index.html', true],
    ['index.htm?', 'index.htm', false],
    ['src/*.{ts,tsx}', 'src/app.tsx', true],
    ['src/*.{ts,tsx}', 'src/app.js', false],
    ['{admin,how-i-work}/index.html', 'how-i-work/index.html', true],
    ['{admin,how-i-work}/index.html', 'index.html', false],
    ['photos/[ab].jpg', 'photos/a.jpg', true],
    ['photos/[!ab].jpg', 'photos/a.jpg', false],
    ['photos/[!ab].jpg', 'photos/c.jpg', true],
    ['photos \\[2024/*', 'photos [2024/a.jpg', true],
    ['.github/workflows/site.yml', '.github/workflows/site.yml', true],
    ['.github/workflows/site.yml', 'xgithub/workflows/site.yml', false],
    ['**/*.yml', '.github/workflows/site.yml', true],
    ['a+b(c).md', 'a+b(c).md', true],
  ];
  for (const [glob, path, expected] of cases) assert.equal(globToRegExp(glob).test(path), expected, `${glob} on ${path}`);
});

test('globToRegExp returns null for a glob it cannot read', () => {
  assert.equal(globToRegExp('photos [2024/**'), null);
  assert.equal(globToRegExp('src/*.{ts,tsx'), null);
});

test('instructionReport passes CLAUDE.md at its budget and fails it one word over', () => {
  assert.deepEqual(instructionReport({ claudeMd: words(600), rules: [], files: FILES, limits }),
    { problems: [], claudeMdWords: 600, ruleWords: [] });
  const over = instructionReport({ claudeMd: `${words(601)} <!-- comments are free -->`, rules: [], files: FILES, limits });
  assert.equal(over.claudeMdWords, 601);
  assert.equal(over.problems.length, 1);
  assert.equal(over.problems[0].file, 'CLAUDE.md');
  assert.match(over.problems[0].message, /601 words, over its budget of 600/);
});

test('instructionReport passes a rules file scoped to files in the repo', () => {
  const rules = [{ file: '.claude/rules/resume-print.md', text: rule(['index.html', 'assets/css/styles.css', '.github/workflows/site.yml']) }];
  assert.deepEqual(instructionReport({ claudeMd: null, rules, files: FILES, limits }), { problems: [], claudeMdWords: 0, ruleWords: [2] });
});

test('instructionReport fails a rules file without paths', () => {
  for (const text of ['# Loads every time\n\nA rule.\n', '---\ndescription: x\n---\nA rule.\n']) {
    const { problems } = instructionReport({ claudeMd: null, rules: [{ file: '.claude/rules/x.md', text }], files: FILES, limits });
    assert.equal(problems.length, 1);
    assert.match(problems[0].message, /has no paths/);
  }
});

test('instructionReport fails each glob that matches no file (a dead scope)', () => {
  const rules = [{ file: '.claude/rules/x.md', text: rule(['index.html', 'assets/js/*.ts', 'src/[oops/*']) }];
  const { problems } = instructionReport({ claudeMd: null, rules, files: FILES, limits });
  assert.deepEqual(problems.map((p) => p.message), [
    'paths glob "assets/js/*.ts" matches no file in the repo, so it never loads the rule',
    'paths glob "src/[oops/*" matches no file in the repo, so it never loads the rule',
  ]);
});

test('instructionReport fails a rules file over its word limit, not counting the frontmatter', () => {
  const atLimit = instructionReport({ claudeMd: null, rules: [{ file: '.claude/rules/x.md', text: rule(['index.html'], words(500)) }], files: FILES, limits });
  assert.deepEqual(atLimit.problems, []);
  const over = instructionReport({ claudeMd: null, rules: [{ file: '.claude/rules/x.md', text: rule(['index.html'], words(501)) }], files: FILES, limits });
  assert.deepEqual(over.ruleWords, [501]);
  assert.match(over.problems[0].message, /501 words, over the 500 a rules file may have/);
});
