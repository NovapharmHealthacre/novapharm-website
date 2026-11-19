import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../assets/js/novapharm.js', import.meta.url), 'utf8');

function runPage({ reduced = false, saveData = false, observer = 'available', legacy = false, count = 2 } = {}) {
  const nodes = Array.from({ length: count }, () => {
    const classes = new Set();
    return { classList: { add: value => classes.add(value), contains: value => classes.has(value) } };
  });
  const preferenceListeners = [];
  const preference = { matches: reduced };
  if (legacy) preference.addListener = listener => preferenceListeners.push(listener);
  else preference.addEventListener = (event, listener) => {
    assert.equal(event, 'change');
    preferenceListeners.push(listener);
  };
  const documentElement = { dataset: {} };
  const year = { textContent: '' };
  const observers = [];
  class Observer {
    constructor(callback) {
      if (observer === 'constructor-failure') throw new Error('Observer unavailable');
      this.callback = callback;
      this.observed = new Set();
      this.disconnected = false;
      observers.push(this);
    }
    observe(node) {
      if (observer === 'observe-failure' && this.observed.size === 1) throw new Error('Cannot observe');
      this.observed.add(node);
    }
    unobserve(node) { this.observed.delete(node); }
    disconnect() { this.disconnected = true; this.observed.clear(); }
  }
  const window = {
    matchMedia: () => preference,
    location: { pathname: '/', search: '' }
  };
  if (observer !== 'absent') window.IntersectionObserver = Observer;
  let error;
  try {
    runInNewContext(source, {
      window,
      IntersectionObserver: window.IntersectionObserver,
      navigator: { connection: { saveData } },
      document: {
        documentElement,
        querySelector: () => null,
        querySelectorAll: selector => selector === '[data-reveal]' ? nodes : selector === '[data-year]' ? [year] : []
      }
    }, { timeout: 1000 });
  } catch (failure) { error = failure; }
  return {
    nodes, observers, documentElement, year, error,
    setReduced(value) {
      preference.matches = value;
      preferenceListeners.forEach(listener => listener({ matches: value }));
    }
  };
}

function assertVisibleFallback(page) {
  assert.equal(page.error, undefined, 'Optional motion cannot interrupt the shared site script');
  assert.equal(page.documentElement.dataset.motion, undefined, 'No reveal-hiding CSS remains enabled');
  assert.ok(page.nodes.every(node => node.classList.contains('is-visible')), 'Every reveal node stays readable');
  assert.equal(page.year.textContent, String(new Date().getFullYear()), 'Subsequent site behaviour still runs');
}

test('ordinary reveal observes content once and exposes intersecting nodes', () => {
  const page = runPage();
  assert.equal(page.error, undefined);
  assert.equal(page.documentElement.dataset.motion, 'ready');
  assert.equal(page.observers.length, 1);
  const [observer] = page.observers;
  assert.equal(observer.observed.size, 2);
  observer.callback([{ target: page.nodes[0], isIntersecting: false }], observer);
  assert.equal(page.nodes[0].classList.contains('is-visible'), false);
  observer.callback([{ target: page.nodes[0], isIntersecting: true }], observer);
  assert.equal(page.nodes[0].classList.contains('is-visible'), true);
  assert.equal(observer.observed.has(page.nodes[0]), false);
  assert.equal(observer.observed.has(page.nodes[1]), true);
});

test('Reduce Motion at load exposes content without creating an observer', () => {
  const page = runPage({ reduced: true });
  assertVisibleFallback(page);
  assert.equal(page.observers.length, 0);
});

test('Save Data at load exposes content without creating an observer', () => {
  const page = runPage({ saveData: true });
  assertVisibleFallback(page);
  assert.equal(page.observers.length, 0);
});

for (const observer of ['absent', 'constructor-failure', 'observe-failure']) {
  test(`optional motion fails visibly safe when observer support is ${observer}`, () => {
    const page = runPage({ observer });
    assertVisibleFallback(page);
    assert.ok(page.observers.every(instance => instance.disconnected), 'Partially registered observers are disconnected');
  });
}

test('enabling Reduce Motion during a visit disconnects reveals and never re-hides content', () => {
  const page = runPage();
  page.setReduced(true);
  assertVisibleFallback(page);
  assert.ok(page.observers.every(observer => observer.disconnected));
  page.setReduced(false);
  assertVisibleFallback(page);
  assert.equal(page.observers.length, 1, 'Preference changes do not replay decorative reveals');
});

test('legacy preference-change listeners also expose all content', () => {
  const page = runPage({ legacy: true });
  page.setReduced(true);
  assertVisibleFallback(page);
  assert.ok(page.observers.every(observer => observer.disconnected));
});

test('pages without reveal content do not enable motion or allocate an observer', () => {
  const page = runPage({ count: 0 });
  assertVisibleFallback(page);
  assert.equal(page.observers.length, 0);
});
