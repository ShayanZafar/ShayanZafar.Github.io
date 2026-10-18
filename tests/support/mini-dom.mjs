// A small stand-in for the browser's DOM, so the unit and integration tests can run the site's scripts with Node
// alone (no packages). It parses the site's own well-formed HTML and supports what the scripts use: selectors made of
// tags, ids, classes and attributes with descendant and child combinators, dataset, classList, textContent,
// closest, append and replaceChildren, a few reflected properties, and click listeners. Test tooling only: never
// deployed (the Site workflow leaves tests/ out).

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const RAW_TEXT = new Set(['script', 'style']);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const decode = (s) => s.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  return ENTITIES[e.toLowerCase()] ?? m;
});

const camel = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

class Text {
  constructor(data) {
    this.nodeType = 3;
    this.data = data;
    this.parentNode = null;
  }

  get textContent() { return this.data; }
}

class ClassList {
  constructor(el) { this.el = el; }
  #get() { return (this.el.getAttribute('class') || '').split(/\s+/).filter(Boolean); }
  #set(list) { this.el.setAttribute('class', list.join(' ')); }
  contains(name) { return this.#get().includes(name); }
  add(...names) { this.#set([...new Set([...this.#get(), ...names])]); }
  remove(...names) { this.#set(this.#get().filter((n) => !names.includes(n))); }
  toggle(name, force) {
    const on = force === undefined ? !this.contains(name) : Boolean(force);
    if (on) this.add(name); else this.remove(name);
    return on;
  }
}

const reflect = (prop, attr = prop) => ({
  get() { return this.getAttribute(attr) ?? ''; },
  set(v) { this.setAttribute(attr, String(v)); },
});

class Element {
  constructor(tagName, ownerDocument) {
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.localName = tagName.toLowerCase();
    this.attributes = new Map();
    this.childNodes = [];
    this.parentNode = null;
    this.ownerDocument = ownerDocument;
    this.listeners = {};
    this.classList = new ClassList(this);
    this.style = {};
    const el = this;
    this.dataset = new Proxy({}, {
      get: (_, key) => (typeof key === 'string' ? el.getAttribute(`data-${kebab(key)}`) ?? undefined : undefined),
      set: (_, key, value) => { el.setAttribute(`data-${kebab(key)}`, String(value)); return true; },
      has: (_, key) => el.hasAttribute(`data-${kebab(key)}`),
      ownKeys: () => [...el.attributes.keys()].filter((n) => n.startsWith('data-')).map((n) => camel(n.slice(5))),
      getOwnPropertyDescriptor: (_, key) => (el.hasAttribute(`data-${kebab(key)}`)
        ? { enumerable: true, configurable: true, value: el.getAttribute(`data-${kebab(key)}`) } : undefined),
    });
  }

  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  hasAttribute(name) { return this.attributes.has(name); }

  get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
  get parentElement() { return this.parentNode?.nodeType === 1 ? this.parentNode : null; }

  get textContent() { return this.childNodes.map((n) => n.textContent).join(''); }
  set textContent(value) { this.replaceChildren(String(value)); }

  get hidden() { return this.hasAttribute('hidden'); }
  set hidden(value) { if (value) this.setAttribute('hidden', ''); else this.removeAttribute('hidden'); }

  /** The part of href from "#", as on a link. */
  get hash() {
    const href = this.getAttribute('href') || '';
    const i = href.indexOf('#');
    return i < 0 || i === href.length - 1 ? '' : href.slice(i);
  }

  #adopt(nodes) {
    return nodes.map((n) => {
      const node = typeof n === 'string' ? new Text(n) : n;
      node.parentNode?.childNodes.splice(node.parentNode.childNodes.indexOf(node), 1);
      node.parentNode = this;
      return node;
    });
  }

  append(...nodes) { this.childNodes.push(...this.#adopt(nodes)); }
  replaceChildren(...nodes) {
    for (const n of this.childNodes) n.parentNode = null;
    this.childNodes = [];
    this.append(...nodes);
  }

  closest(selector) {
    const match = compile(selector);
    for (let el = this; el; el = el.parentElement) if (match(el)) return el;
    return null;
  }

  matches(selector) { return compile(selector)(this); }
  querySelectorAll(selector) { return descendants(this).filter(compile(selector)); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }

  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  dispatchEvent(event) {
    for (const fn of this.listeners[event.type] || []) fn.call(this, event);
    return true;
  }

  click() { this.dispatchEvent({ type: 'click', target: this, preventDefault() {} }); }
}

for (const [prop, attr] of [['id'], ['className', 'class'], ['href'], ['target'], ['rel'], ['title'], ['dateTime', 'datetime'], ['src']]) {
  Object.defineProperty(Element.prototype, prop, reflect(prop, attr));
}

const descendants = (root) => root.children.flatMap((el) => [el, ...descendants(el)]);

// Selectors: comma-separated lists of compound selectors (tag, *, #id, .class, [attr], [attr="v"], [attr^="v"])
// joined by descendant (space) or child (>) combinators.
const cache = new Map();
function compile(selector) {
  if (cache.has(selector)) return cache.get(selector);
  const groups = selector.split(',').map((group) => {
    const tokens = group.trim().replace(/\s*>\s*/g, ' > ').split(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/);
    const steps = [];
    let combinator = ' ';
    for (const token of tokens) {
      if (token === '>') { combinator = '>'; continue; }
      steps.push({ combinator, test: compound(token) });
      combinator = ' ';
    }
    return steps;
  });
  const matchSteps = (el, steps, i) => {
    if (!steps[i].test(el)) return false;
    if (i === 0) return true;
    if (steps[i].combinator === '>') return el.parentElement ? matchSteps(el.parentElement, steps, i - 1) : false;
    for (let up = el.parentElement; up; up = up.parentElement) if (matchSteps(up, steps, i - 1)) return true;
    return false;
  };
  const fn = (el) => groups.some((steps) => matchSteps(el, steps, steps.length - 1));
  cache.set(selector, fn);
  return fn;
}

function compound(token) {
  const parts = token.match(/^[a-z][\w-]*|^\*|#[\w-]+|\.[\w-]+|\[[^\]]+\]/gi) || [];
  if (parts.join('') !== token) throw new Error(`mini-dom: unsupported selector "${token}"`);
  const tests = parts.map((part) => {
    if (part === '*') return () => true;
    if (part[0] === '#') return (el) => el.getAttribute('id') === part.slice(1);
    if (part[0] === '.') return (el) => el.classList.contains(part.slice(1));
    if (part[0] === '[') {
      const m = part.match(/^\[([\w-]+)(?:([\^]?=)(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]$/);
      if (!m) throw new Error(`mini-dom: unsupported attribute selector "${part}"`);
      const [, name, op, dq, sq, bare] = m;
      const value = dq ?? sq ?? bare;
      if (!op) return (el) => el.hasAttribute(name);
      if (op === '=') return (el) => el.getAttribute(name) === value;
      return (el) => (el.getAttribute(name) ?? '').startsWith(value);
    }
    return (el) => el.localName === part.toLowerCase();
  });
  return (el) => tests.every((t) => t(el));
}

class Document {
  constructor() {
    this.nodeType = 9;
    this.childNodes = [];
    this.listeners = {};
  }

  get children() { return this.childNodes.filter((n) => n.nodeType === 1); }
  get documentElement() { return this.children[0] ?? null; }
  get body() { return this.querySelector('body'); }
  get head() { return this.querySelector('head'); }
  createElement(tag) { return new Element(tag, this); }
  createTextNode(data) { return new Text(data); }
  getElementById(id) { return this.querySelector(`[id="${id}"]`); }
  querySelectorAll(selector) { return descendants(this).filter(compile(selector)); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
}

/** Parses an HTML page (or fragment) into a Document. Comments and the doctype are dropped. */
export function parseHTML(html) {
  const doc = new Document();
  const stack = [doc];
  const top = () => stack[stack.length - 1];
  const add = (node) => {
    node.parentNode = top();
    top().childNodes.push(node);
  };
  let i = 0;
  while (i < html.length) {
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      i = end < 0 ? html.length : end + 3;
    } else if (html.startsWith('<!', i)) {
      i = html.indexOf('>', i) + 1;
    } else if (html.startsWith('</', i)) {
      const end = html.indexOf('>', i);
      const name = html.slice(i + 2, end).trim().toLowerCase();
      const at = stack.findLastIndex((n) => n.localName === name);
      if (at > 0) stack.length = at;
      i = end + 1;
    } else if (html[i] === '<' && /[a-z]/i.test(html[i + 1] ?? '')) {
      const tag = html.slice(i).match(/^<([a-z][\w-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/i);
      if (!tag) throw new Error(`mini-dom: can't parse the tag at ${html.slice(i, i + 60)}`);
      const [whole, rawName, rawAttrs, selfClosing] = tag;
      const el = new Element(rawName, doc);
      for (const a of rawAttrs.matchAll(/([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
        el.setAttribute(a[1].toLowerCase(), decode(a[2] ?? a[3] ?? a[4] ?? ''));
      }
      add(el);
      i += whole.length;
      if (RAW_TEXT.has(el.localName)) {
        const end = html.toLowerCase().indexOf(`</${el.localName}`, i);
        el.childNodes.push(Object.assign(new Text(html.slice(i, end)), { parentNode: el }));
        i = html.indexOf('>', end) + 1;
      } else if (!selfClosing && !VOID.has(el.localName)) {
        stack.push(el);
      }
    } else {
      const next = html.indexOf('<', i + 1);
      const end = next < 0 ? html.length : next;
      add(new Text(decode(html.slice(i, end))));
      i = end;
    }
  }
  return doc;
}

/** The text a reader sees in an element: its text with runs of whitespace collapsed. */
export const textOf = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
