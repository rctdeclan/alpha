import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrawing, addPoint, selectPoint, movePoint } from '../drawing.mjs';

test('points retain only Sheet-local 2D coordinates, including fractional positions', () => {
  const drawing = createDrawing();
  const input = { u: 12.25, v: -7.5, x: 100, y: 200, z: 300 };
  const point = addPoint(drawing, input);
  input.u = 999;
  assert.deepEqual(point, { id: 'P1', sheet: 'sheet-1', position: { u: 12.25, v: -7.5 } });
  assert.equal(drawing.selectedPointId, 'P1');
});

test('selecting and moving one point preserves its identity, Sheet, and all other points', () => {
  const drawing = createDrawing();
  const first = addPoint(drawing, { u: 10, v: 20 });
  const second = addPoint(drawing, { u: 40, v: 50 });
  const savedSecond = structuredClone(second);
  selectPoint(drawing, first.id);
  movePoint(drawing, first.id, { u: 75.5, v: 90, z: 123 });
  assert.equal(drawing.points.length, 2);
  assert.equal(drawing.selectedPointId, first.id);
  assert.deepEqual(first, { id: 'P1', sheet: 'sheet-1', position: { u: 75.5, v: 90 } });
  assert.deepEqual(second, savedSecond);
});

test('invalid positions or unknown selections cannot corrupt the drawing', () => {
  const drawing = createDrawing();
  const first = addPoint(drawing, { u: 10, v: 20 });
  const saved = structuredClone(drawing);
  assert.throws(() => addPoint(drawing, { x: 1, y: 2, z: 3 }), TypeError);
  assert.throws(() => movePoint(drawing, first.id, { u: Infinity, v: 2 }), TypeError);
  assert.throws(() => selectPoint(drawing, 'missing'), RangeError);
  assert.deepEqual(drawing, saved);
});
