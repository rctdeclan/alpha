import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

test('command input: filtering, advance, pointer choice, rapid keys, dismiss and parse', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createElement, act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
  const root = createRoot(document.getElementById('root'));
  try {
    const { default: CommandBar } = await server.ssrLoadModule('/CommandBar.jsx');
    await act(async () => root.render(createElement(CommandBar)));
    const input = document.querySelector('input');
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set;
    const fill = async value => act(async () => {
      input.focus();
      setter.call(input, value);
      input.setSelectionRange(value.length, value.length);
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    const key = key => input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    const columns = () => [...document.querySelectorAll('[role="listbox"]')];
    await fill('mo');
    assert.equal(columns().length, 1);
    assert.equal(document.querySelector('.chosen').textContent, 'move');
    await act(async () => key(' '));
    assert.equal(input.value, 'move ');
    assert.equal(columns().length, 2);
    await act(async () => { key('ArrowDown'); key('Tab'); });
    assert.equal(input.value, 'move P2 ');
    assert.equal(columns().length, 3);

    await fill('insert P3 C1');
    const option = [...columns()[1].querySelectorAll('[role="option"]')].find(el => el.textContent === 'P4');
    await act(async () => option.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true, cancelable: true })));
    assert.equal(input.value, 'insert P4 C1');
    assert.equal(input.selectionStart, 9);
    // No intervening render wait between events: caret-only advancement must
    // commit before the next key chooses an option in the next column.
    await act(async () => { key('Tab'); key('ArrowDown'); });
    assert.equal(input.value, 'insert P4 C2');
    assert.equal(input.selectionStart, 12);
    await act(async () => key('Enter'));
    assert.equal(document.querySelector('output').textContent, 'insert P4 C2 — not implemented');
    assert.equal(columns().length, 0);

    await fill('move P2');
    assert.equal(columns().length, 2);
    await act(async () => key('Escape'));
    assert.equal(input.value, 'move P2');
    assert.equal(columns().length, 0);
    await fill('ordinary typed text');
    await act(async () => key('Enter'));
    assert.equal(input.value, 'ordinary typed text');
    assert.match(document.querySelector('output').textContent, /not implemented/);
  } finally {
    await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    delete globalThis.window;
    delete globalThis.document;
  }
});
