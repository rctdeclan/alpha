import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrawing, addPoint, finishCurve, selectCurve, selectPoint, movePoint, setTrajectoryDirection, curveSegments } from '../drawing.mjs';
import { drawingReducer } from '../drawingReducer.mjs';

function sample() {
  const drawing = createDrawing();
  for (const [u, v] of [[30, 120], [100, 40], [170, 110], [240, 70]]) addPoint(drawing, { u, v });
  finishCurve(drawing);
  for (const [u, v] of [[40, 320], [120, 230], [200, 340], [280, 270]]) addPoint(drawing, { u, v });
  finishCurve(drawing);
  return drawing;
}

function changed(before, after) {
  const saved = new Map(before.map(segment => [segment.id, JSON.stringify(segment)]));
  return after.filter(segment => saved.get(segment.id) !== JSON.stringify(segment)).map(segment => segment.id);
}

function geometry(drawing) {
  return structuredClone({ points: drawing.points, curves: drawing.curves, segments: curveSegments(drawing) });
}

test('finishing is geometry-preserving, including empty and single-point drawings', () => {
  const drawing = createDrawing();
  finishCurve(drawing);
  finishCurve(drawing);
  assert.deepEqual(drawing.curves, []);
  addPoint(drawing, { u: 10, v: 20 });
  const before = geometry(drawing);
  finishCurve(drawing);
  assert.deepEqual(geometry(drawing), before);
  assert.equal(drawing.activeCurveId, null);
  assert.equal(drawing.selectedPointId, null);
  addPoint(drawing, { u: 30, v: 40 });
  assert.deepEqual(drawing.curves.map(curve => curve.pointIds), [['P1'], ['P2']]);
  assert.deepEqual(curveSegments(drawing), []);
});

test('independent curves reference one document point pool and never acquire a connecting segment', () => {
  const drawing = sample();
  assert.deepEqual(drawing.curves.map(({ id, pointIds }) => ({ id, pointIds })), [
    { id: 'C1', pointIds: ['P1', 'P2', 'P3', 'P4'] },
    { id: 'C2', pointIds: ['P5', 'P6', 'P7', 'P8'] },
  ]);
  const segments = curveSegments(drawing);
  assert.equal(segments.length, 6);
  assert.ok(!segments.some(segment => segment.id.includes('P4-P5')));
  assert.equal(new Set(segments.map(segment => segment.id)).size, 6);
  const saved = structuredClone(segments);
  drawing.points.reverse();
  assert.deepEqual(curveSegments(drawing), saved, 'document storage order must not determine topology');
});

test('curve and point selection change no geometry and never resume finished curves', () => {
  const drawing = sample();
  const before = geometry(drawing);
  for (const id of ['C1', 'C2', 'C1']) {
    selectCurve(drawing, id);
    assert.equal(drawing.selectedCurveId, id);
    assert.equal(drawing.selectedPointId, null);
    assert.equal(drawing.activeCurveId, null);
    assert.deepEqual(geometry(drawing), before);
  }
  selectPoint(drawing, 'P6');
  assert.equal(drawing.selectedCurveId, 'C2');
  assert.equal(drawing.selectedPointId, 'P6');
  assert.deepEqual(geometry(drawing), before);
  addPoint(drawing, { u: 400, v: 300 });
  assert.equal(drawing.activeCurveId, 'C3');
  assert.deepEqual(drawing.curves.slice(0, 2), before.curves);
  assert.deepEqual(drawing.curves[2].pointIds, ['P9']);
});

for (const curveIndex of [0, 1]) {
  for (const pointIndex of [0, 1, 3]) {
    test(`C${curveIndex + 1} point ${pointIndex + 1}: P and T edits preserve other curves and non-adjacent segments`, () => {
      const drawing = sample();
      const curve = drawing.curves[curveIndex];
      const id = curve.pointIds[pointIndex];
      const otherCurve = structuredClone(drawing.curves[1 - curveIndex]);
      const expected = [pointIndex - 1, pointIndex].filter(i => i >= 0 && i < 3)
        .map(i => `${curve.id}:${curve.pointIds[i]}-${curve.pointIds[i + 1]}`);
      let before = curveSegments(drawing);
      const trajectories = structuredClone(drawing.curves.map(curve => curve.trajectories));
      movePoint(drawing, id, { u: 175, v: 190 });
      assert.deepEqual(changed(before, curveSegments(drawing)), expected);
      assert.deepEqual(drawing.curves.map(curve => curve.trajectories), trajectories);
      before = curveSegments(drawing);
      const points = structuredClone(drawing.points);
      setTrajectoryDirection(drawing, id, { u: -1, v: 3 }, curve.id);
      assert.deepEqual(changed(before, curveSegments(drawing)), expected);
      assert.deepEqual(drawing.points, points);
      assert.deepEqual(drawing.curves[1 - curveIndex], otherCurve);
    });
  }
}

test('starting/extending another curve cannot re-infer finished trajectories', () => {
  const drawing = sample();
  const before = geometry(drawing);
  for (const [u, v] of [[390, 100], [420, 200], [440, 90]]) addPoint(drawing, { u, v });
  assert.deepEqual(drawing.curves.slice(0, 2), before.curves);
  assert.deepEqual(curveSegments(drawing).slice(0, 6), before.segments);
});

test('zero trajectory fallback uses curve neighbors rather than adjacent document entries', () => {
  const drawing = sample();
  addPoint(drawing, { u: 1000, v: 1000 });
  setTrajectoryDirection(drawing, 'P9', { u: 0, v: 1 }, 'C3');
  assert.deepEqual(drawing.curves[2].trajectories.P9, { u: 0, v: 1 });
});

test('a future shared-point fixture has one P and independent curve-local T values', () => {
  const drawing = sample();
  // Representation fixture only: there is intentionally no sharing/rewiring action.
  const second = drawing.curves[1];
  second.pointIds[1] = 'P2';
  second.trajectories.P2 = second.trajectories.P6;
  delete second.trajectories.P6;
  let before = curveSegments(drawing);
  const positions = structuredClone(drawing.points);
  const secondT = structuredClone(second.trajectories);
  setTrajectoryDirection(drawing, 'P2', { u: 0, v: 1 }, 'C1');
  assert.deepEqual(changed(before, curveSegments(drawing)), ['C1:P1-P2', 'C1:P2-P3']);
  assert.deepEqual(second.trajectories, secondT);
  assert.deepEqual(drawing.points, positions);
  before = curveSegments(drawing);
  setTrajectoryDirection(drawing, 'P2', { u: -2, v: 1 }, 'C2');
  assert.deepEqual(changed(before, curveSegments(drawing)), ['C2:P5-P2', 'C2:P2-P7']);
  before = curveSegments(drawing);
  movePoint(drawing, 'P2', { u: 160, v: 170 });
  assert.deepEqual(changed(before, curveSegments(drawing)), ['C1:P1-P2', 'C1:P2-P3', 'C2:P5-P2', 'C2:P2-P7']);
  assert.equal(drawing.points.filter(point => point.id === 'P2').length, 1);
  selectCurve(drawing, 'C2');
  selectPoint(drawing, 'P2');
  assert.equal(drawing.selectedCurveId, 'C2');
});

test('invalid selection is atomic and reducer curve lifecycle preserves earlier snapshots', () => {
  const drawing = sample();
  const saved = structuredClone(drawing);
  assert.throws(() => selectCurve(drawing, 'missing'), RangeError);
  assert.throws(() => selectPoint(drawing, 'P1', 'C2'), RangeError);
  assert.throws(() => setTrajectoryDirection(drawing, 'P1', { u: 1, v: 0 }, 'C2'), RangeError);
  assert.deepEqual(drawing, saved);
  const selected = drawingReducer(drawing, { type: 'select-curve', id: 'C1' });
  const finished = drawingReducer(selected, { type: 'finish' });
  const action = { type: 'add', position: { u: 380, v: 350 } };
  const extended = drawingReducer(finished, action);
  assert.deepEqual(extended, drawingReducer(finished, action));
  assert.equal(extended.curves.length, 3);
  assert.deepEqual(drawing, saved);
});
