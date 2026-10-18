import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrawing, addPoint, movePoint, setTrajectoryDirection, curveSegments } from '../drawing.mjs';
import { drawingReducer } from '../drawingReducer.mjs';

function sample() {
  const drawing = createDrawing();
  for (const [u, v] of [[40, 240], [100, 120], [180, 200], [260, 100], [340, 220], [420, 150]]) {
    addPoint(drawing, { u, v });
  }
  return drawing;
}

for (let index = 0; index < 6; index++) {
  test(`editing T${index + 1} changes only adjacent segments and never moves P`, () => {
    const drawing = sample();
    const id = drawing.points[index].id;
    const points = structuredClone(drawing.points);
    const otherTrajectories = Object.entries(drawing.curves[0].trajectories).filter(([key]) => key !== id);
    const originalMagnitude = Math.hypot(drawing.curves[0].trajectories[id].u, drawing.curves[0].trajectories[id].v);
    for (const direction of [{ u: 0, v: 1 }, { u: -2, v: 1 }, { u: 4, v: -3 }]) {
      const before = curveSegments(drawing);
      setTrajectoryDirection(drawing, id, direction);
      const after = curveSegments(drawing);
      const changed = after.flatMap((segment, i) => JSON.stringify(segment) === JSON.stringify(before[i]) ? [] : [i]);
      assert.deepEqual(changed, [index - 1, index].filter(i => i >= 0 && i < 5));
      assert.deepEqual(drawing.points, points);
      assert.deepEqual(Object.entries(drawing.curves[0].trajectories).filter(([key]) => key !== id), otherTrajectories);
      const t = drawing.curves[0].trajectories[id];
      assert.ok(Math.abs(Math.hypot(t.u, t.v) - originalMagnitude) < 1e-10);
      assert.ok(Math.abs(t.u * direction.v - t.v * direction.u) < 1e-10);
      assert.ok(t.u * direction.u + t.v * direction.v > 0);
      assert.deepEqual(Object.keys(t).sort(), ['u', 'v']);
    }
  });
}

test('point dragging and curve extension preserve a manually edited trajectory', () => {
  const drawing = sample();
  const id = drawing.points.at(-1).id;
  setTrajectoryDirection(drawing, id, { u: 1, v: 2 });
  const t = structuredClone(drawing.curves[0].trajectories[id]);
  movePoint(drawing, id, { u: 410, v: 190 });
  addPoint(drawing, { u: 460, v: 260 });
  assert.deepEqual(drawing.curves[0].trajectories[id], t);
});

test('an isolated point has an editable direction that survives the second point', () => {
  const drawing = createDrawing();
  addPoint(drawing, { u: 40, v: 50 });
  setTrajectoryDirection(drawing, 'P1', { u: 0, v: 4 });
  assert.deepEqual(drawing.curves[0].trajectories.P1, { u: 0, v: 1 });
  addPoint(drawing, { u: 100, v: 100 });
  assert.deepEqual(drawing.curves[0].trajectories.P1, { u: 0, v: 1 });
  assert.deepEqual(drawing.points[0].position, { u: 40, v: 50 });
});

test('zero trajectories at a reversal acquire a finite local direction', () => {
  const drawing = createDrawing();
  for (const u of [0, 100, 0]) addPoint(drawing, { u, v: 0 });
  assert.deepEqual(drawing.curves[0].trajectories.P2, { u: 0, v: 0 });
  const before = curveSegments(drawing);
  setTrajectoryDirection(drawing, 'P2', { u: 0, v: 2 });
  assert.deepEqual(drawing.curves[0].trajectories.P2, { u: 0, v: 100 });
  assert.ok(curveSegments(drawing).every((s, i) => JSON.stringify(s) !== JSON.stringify(before[i])));
});

test('invalid or ambiguous direction input does not corrupt geometry', () => {
  const drawing = sample();
  const before = structuredClone(drawing);
  setTrajectoryDirection(drawing, 'P3', { u: 0, v: 0 });
  assert.throws(() => setTrajectoryDirection(drawing, 'P3', { u: NaN, v: 1 }), TypeError);
  assert.throws(() => setTrajectoryDirection(drawing, 'missing', { u: 1, v: 0 }), RangeError);
  assert.deepEqual(drawing, before);
});

test('trajectory reducer edits are replayable and leave previous React state intact', () => {
  const drawing = sample();
  const before = structuredClone(drawing);
  const action = { type: 'trajectory', id: 'P3', direction: { u: 1, v: 4 } };
  const result = drawingReducer(drawing, action);
  assert.deepEqual(result, drawingReducer(drawing, action));
  assert.deepEqual(drawing, before);
  assert.deepEqual(result.points, before.points);
  assert.notDeepEqual(result.curves[0].trajectories.P3, before.curves[0].trajectories.P3);
});
