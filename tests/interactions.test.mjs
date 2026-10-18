import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';

// Exercise React handlers without a browser-control dependency. The SVG
// coordinate transform and pointer capture are the only geometry API stubs.
test('React: finish/start, independent selection, and local P/T edits', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.DOMPoint = class {
    constructor(x, y) { this.x = x; this.y = y; }
    matrixTransform(matrix) { return { x: this.x + matrix.e, y: this.y + matrix.f }; }
  };
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  const root = createRoot(document.getElementById('root'));
  try {
    const { default: DrawingSpace } = await server.ssrLoadModule('/DrawingSpace.jsx');
    await act(async () => root.render(createElement(DrawingSpace)));
    const surface = document.querySelector('svg');
    surface.getScreenCTM = () => ({ inverse: () => ({ e: -12, f: -12 }) });
    Object.defineProperty(surface, 'clientWidth', { value: 600 });
    Object.defineProperty(surface, 'clientHeight', { value: 500 });
    const captures = new Set();
    surface.setPointerCapture = id => captures.add(id);
    surface.hasPointerCapture = id => captures.has(id);
    surface.releasePointerCapture = id => captures.delete(id);

    async function pointer(target, type, u, v) {
      const event = new dom.window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: u + 12, clientY: v + 12 });
      Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } });
      await act(async () => target.dispatchEvent(event));
    }
    async function click(target, u, v) {
      await pointer(target, 'pointerdown', u, v);
      await pointer(surface, 'pointerup', u, v);
    }
    async function key(key) {
      await act(async () => surface.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true })));
    }
    const paths = () => Array.from(document.querySelectorAll('.drawing-curve'), p => ({ id: p.dataset.segmentId, d: p.getAttribute('d') }));
    const points = () => Array.from(document.querySelectorAll('circle'), p => [p.dataset.pointId, p.getAttribute('cx'), p.getAttribute('cy')]);
    const changed = before => paths().filter((p, i) => p.d !== before[i].d).map(p => p.id);

    for (const [u, v] of [[60,180],[140,100],[220,180],[300,120]]) await click(surface,u,v);
    const firstCurve = paths();
    await key('Enter');
    assert.equal(document.querySelectorAll('.trajectory').length, 0);
    assert.deepEqual(paths(), firstCurve);
    for (const [u, v] of [[60,380],[140,300],[220,380],[300,320]]) await click(surface,u,v);
    await key('Escape');
    assert.deepEqual(paths().slice(0, 3), firstCurve);
    assert.deepEqual([...new Set(Array.from(document.querySelectorAll('.drawing-curve'), p => p.dataset.curveId))], ['C1','C2']);
    assert.equal(paths().length, 6);
    assert.equal(points().length, 8);
    assert.equal(document.activeElement, surface);

    const geometry = { paths: paths(), points: points() };
    for (const id of ['C1','C2']) {
      const stroke = document.querySelector(`.curve-hit[data-curve-id="${id}"]`);
      await pointer(stroke,'pointerdown',95,id === 'C1' ? 140 : 340);
      await pointer(surface,'pointermove',110,250);
      await pointer(surface,'pointerup',110,250);
      assert.deepEqual({ paths: paths(), points: points() }, geometry, 'curve selection/drag must not change geometry');
      assert.equal(document.querySelectorAll('.trajectory').length,0);
      assert.deepEqual([...new Set(Array.from(document.querySelectorAll('.drawing-curve.selected'), p => p.dataset.curveId))], [id]);
    }

    const point = document.querySelector('[data-point-id="P2"]');
    let before = paths();
    await pointer(point,'pointerdown',140,100);
    await pointer(surface,'pointermove',155,120);
    await pointer(surface,'pointerup',155,120);
    assert.deepEqual(changed(before),['C1:P1-P2','C1:P2-P3']);
    assert.equal(point.getAttribute('cx'),'155');
    assert.equal(point.getAttribute('cy'),'120');
    assert.equal(document.querySelectorAll('.trajectory').length,1);

    before = paths();
    const positions = points();
    const line = document.querySelector('.trajectory-hit');
    const gripU = 155 + (Number(line.getAttribute('x2')) - 155) * 0.8;
    const gripV = 120 + (Number(line.getAttribute('y2')) - 120) * 0.8;
    await pointer(line,'pointerdown',gripU,gripV);
    await pointer(surface,'pointermove',155,150);
    await pointer(surface,'pointerup',155,150);
    assert.deepEqual(changed(before),['C1:P1-P2','C1:P2-P3']);
    assert.deepEqual(points(),positions);
    assert.equal(captures.size,0);

    // Editing a finished curve does not make it the destination for new points.
    before = paths();
    await click(surface,400,220);
    await click(surface,470,170);
    await key('Escape');
    assert.deepEqual(paths().slice(0,6),before);
    assert.equal(paths()[6].id,'C3:P9-P10');
    assert.equal(document.querySelectorAll('input,button,select').length,0);
  } finally {
    await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    delete globalThis.DOMPoint;
    delete globalThis.window;
    delete globalThis.document;
  }
});
