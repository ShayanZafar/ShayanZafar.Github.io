// The pure parts of check-site.mjs's check of Claude's instruction files (check-site.mjs does the reading), kept
// apart so tests/unit/instruction-files.test.mjs can test them without running every check. No dependencies.
//
// Claude Code loads CLAUDE.md with every request. A .claude/rules/ file loads only when Claude reads, writes or
// edits a file that one of the globs in its `paths` frontmatter matches; without `paths` it loads with every
// request too. So each rules file needs `paths`, and each of its globs must match a file in the repo.

/** Whitespace-separated words, leaving out HTML comments (Claude Code strips them before loading the file). */
export const wordCount = (text) => text.replace(/<!--[\s\S]*?-->/g, ' ').split(/\s+/).filter(Boolean).length;

/** The YAML frontmatter between `---` lines at the top of a file (null when there is none), and the rest. */
export function splitFrontmatter(text) {
  const s = text.replace(/^﻿/, '');
  const m = s.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  return m ? { frontmatter: m[1], body: s.slice(m[0].length) } : { frontmatter: null, body: s };
}

/** Splits on the commas that aren't inside {braces}, so "src/*.{ts,tsx}, lib/*.ts" gives two globs. */
const splitOnTopLevelCommas = (s) => {
  const parts = [''];
  let depth = 0;
  for (const c of s) {
    if (c === '{') depth++;
    if (c === '}' && depth > 0) depth--;
    if (c === ',' && depth === 0) parts.push('');
    else parts[parts.length - 1] += c;
  }
  return parts;
};

/** A YAML scalar without its quotes or a trailing comment. */
const unquote = (s) => {
  const quoted = s.trim().match(/^(['"])(.*?)\1\s*(?:#.*)?$/);
  return quoted ? quoted[2] : s.replace(/\s+#.*$/, '').trim();
};

/**
 * The globs in the frontmatter's `paths`, which Claude Code takes as a YAML list (block or [flow]) or as a
 * comma-separated string. Empty when there is no `paths`.
 */
export function rulePaths(frontmatter) {
  if (!frontmatter) return [];
  const lines = frontmatter.split(/\r?\n/);
  const at = lines.findIndex((line) => /^paths\s*:/.test(line));
  if (at === -1) return [];
  const value = lines[at].replace(/^paths\s*:\s*/, '').trim();
  if (value.startsWith('[')) return splitOnTopLevelCommas(value.replace(/^\[|\]\s*$/g, '')).map(unquote).filter(Boolean);
  if (value && !value.startsWith('#')) return splitOnTopLevelCommas(unquote(value)).map((s) => s.trim()).filter(Boolean);
  const globs = [];
  for (const line of lines.slice(at + 1)) {
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item) globs.push(unquote(item[1]));
    else if (!/^\s*(#.*)?$/.test(line)) break;
  }
  return globs.filter(Boolean);
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/**
 * A glob as a RegExp over repo-relative paths with forward slashes: `**` as a whole segment for any number of
 * folders (none included), `*` and `?` within one name, `{a,b}` for either, `[abc]` or `[!abc]` for one
 * character, and `\` before a character to take it literally. `*` matches names that start with a dot too.
 * Returns null for a glob that can't be read (an unclosed `[` or `{`): Claude Code matches nothing with it.
 */
export function globToRegExp(glob) {
  let re = '';
  let braces = 0;
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    const wholeSegment = (i === 0 || glob[i - 1] === '/') && (glob[i + 2] === '/' || i + 2 === glob.length);
    if (c === '\\' && i + 1 < glob.length) {
      re += escapeRegExp(glob[++i]);
    } else if (c === '*' && glob[i + 1] === '*' && wholeSegment) {
      re += glob[i + 2] === '/' ? '(?:[^/]*/)*' : '.*'; // "**/": any number of folders; a final "**": everything below
      i += 2;
    } else if (c === '*') {
      re += '[^/]*';
      while (glob[i + 1] === '*') i++;
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '[') {
      const end = glob.indexOf(']', i + 2);
      if (end === -1) return null;
      const set = glob.slice(i + 1, end);
      const negated = /^[!^]/.test(set);
      re += `(?!/)[${negated ? '^' : ''}${set.slice(negated ? 1 : 0).replace(/[\\\]]/g, '\\$&')}]`;
      i = end;
    } else if (c === '{') {
      braces++;
      re += '(?:';
    } else if (c === ',' && braces > 0) {
      re += '|';
    } else if (c === '}' && braces > 0) {
      braces--;
      re += ')';
    } else {
      re += escapeRegExp(c);
    }
  }
  return braces ? null : new RegExp(`^${re}$`);
}

/**
 * Checks Claude's instruction files. Takes CLAUDE.md's text (null when there is none), the rules files as
 * [{ file, text }], every file in the repo (relative, with forward slashes: what the globs are matched against)
 * and the most words each may have ({ claudeMd, rule }). Returns the problems as [{ file, message }] and the
 * word counts, for the summary line.
 */
export function instructionReport({ claudeMd, rules, files, limits }) {
  const problems = [];
  const claudeMdWords = claudeMd === null ? 0 : wordCount(claudeMd);
  if (claudeMdWords > limits.claudeMd) {
    problems.push({ file: 'CLAUDE.md', message: `is ${claudeMdWords} words, over its budget of ${limits.claudeMd}: move what matters for one area to a .claude/rules/ file scoped with paths, or trim it` });
  }
  const ruleWords = [];
  for (const { file, text } of rules) {
    const { frontmatter, body } = splitFrontmatter(text);
    const globs = rulePaths(frontmatter);
    if (!globs.length) {
      problems.push({ file, message: 'has no paths, so it would load with every request like CLAUDE.md: list the files it is for under paths: in its frontmatter, or move it into CLAUDE.md' });
    }
    for (const glob of globs) {
      const re = globToRegExp(glob);
      if (!re || !files.some((f) => re.test(f))) problems.push({ file, message: `paths glob "${glob}" matches no file in the repo, so it never loads the rule` });
    }
    const words = wordCount(body);
    ruleWords.push(words);
    if (words > limits.rule) problems.push({ file, message: `is ${words} words, over the ${limits.rule} a rules file may have: split it by area, or trim it` });
  }
  return { problems, claudeMdWords, ruleWords };
}
