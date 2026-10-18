import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrawing, curveSegments } from '../drawing.mjs';
import { drawingReducer } from '../drawingReducer.mjs';

function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') freeze(child);
  }
  return value;
}

test('replaying a React add action is deterministic and does not duplicate points', () => {
  const state = freeze(createDrawing());
  const action = { type: 'add', position: { u: 12, v: 34 } };
  const first = drawingReducer(state, action);
  assert.deepEqual(first, drawingReducer(state, action));
  assert.equal(first.points.length, 1);
  assert.equal(state.points.length, 0);
  assert.deepEqual(first.points[0].position, { u: 12, v: 34 });
});

test('React selection and movement preserve prior states and curve locality', () => {
  let state = createDrawing();
  for (const [u, v] of [[20, 100], [80, 40], [140, 90], [200, 50], [260, 120]]) {
    state = drawingReducer(freeze(state), { type: 'add', position: { u, v } });
  }
  const selected = drawingReducer(freeze(state), { type: 'select', id: 'P3' });
  assert.equal(state.selectedPointId, 'P5');
  assert.equal(selected.selectedPointId, 'P3');
  assert.deepEqual(selected.points, state.points);
  const before = curveSegments(selected);
  const moved = drawingReducer(freeze(selected), { type: 'move', id: 'P3', position: { u: 155, v: 170 } });
  const after = curveSegments(moved);
  assert.deepEqual(selected.points[2].position, { u: 140, v: 90 });
  assert.deepEqual(moved.curves[0].trajectories, selected.curves[0].trajectories);
  assert.deepEqual(after.flatMap((segment, i) => JSON.stringify(segment) === JSON.stringify(before[i]) ? [] : [i]), [1, 2]);
});
