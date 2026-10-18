import test from 'node:test';
import assert from 'node:assert/strict';
import { createDrawing, addPoint, movePoint, curveSegments } from '../drawing.mjs';

function sample() {
  const drawing = createDrawing();
  for (const [u, v] of [[30, 120], [90, 50], [150, 100], [210, 60], [270, 130], [330, 80]]) {
    addPoint(drawing, { u, v });
  }
  return drawing;
}

function changed(before, after) {
  return after.flatMap((segment, i) => JSON.stringify(segment) === JSON.stringify(before[i]) ? [] : [i]);
}

test('successive points are interpolated with automatically curved, tangent-aligned segments', () => {
  const drawing = sample();
  const segments = curveSegments(drawing);
  assert.equal(segments.length, drawing.points.length - 1);
  let curved = false;
  segments.forEach((segment, i) => {
    assert.deepEqual(segment.start, drawing.points[i].position);
    assert.deepEqual(segment.end, drawing.points[i + 1].position);
    const chord = { u: segment.end.u - segment.start.u, v: segment.end.v - segment.start.v };
    const handle = { u: segment.control2.u - segment.start.u, v: segment.control2.v - segment.start.v };
    if (Math.abs(chord.u * handle.v - chord.v * handle.u) > 1e-6) curved = true;
    if (i > 0) {
      const previous = segments[i - 1];
      const incoming = { u: previous.end.u - previous.control2.u, v: previous.end.v - previous.control2.v };
      const outgoing = { u: segment.control1.u - segment.start.u, v: segment.control1.v - segment.start.v };
      assert.ok(Math.abs(incoming.u * outgoing.v - incoming.v * outgoing.u) < 1e-8);
      assert.ok(incoming.u * outgoing.u + incoming.v * outgoing.v > 0);
    }
  });
  assert.ok(curved, 'non-collinear points must produce curved segments');
});

for (let index = 0; index < 6; index++) {
  test(`moving point ${index + 1} changes exactly its adjacent segments, repeatedly`, () => {
    const drawing = sample();
    const trajectories = structuredClone(drawing.curves[0].trajectories);
    const untouched = structuredClone(drawing.points.filter((_, i) => i !== index));
    const expected = [index - 1, index].filter(i => i >= 0 && i < 5);
    for (const position of [{ u: 170, v: 200 }, { u: 0, v: 0 }, { u: -20.5, v: 90.25 }]) {
      const before = curveSegments(drawing);
      movePoint(drawing, drawing.points[index].id, position);
      assert.deepEqual(changed(before, curveSegments(drawing)), expected);
      assert.deepEqual(drawing.curves[0].trajectories, trajectories);
      assert.deepEqual(drawing.points.filter((_, i) => i !== index), untouched);
    }
  });
}

test('extension fits only the former endpoint and new endpoint', () => {
  const drawing = sample();
  const before = curveSegments(drawing);
  const trajectories = structuredClone(drawing.curves[0].trajectories);
  addPoint(drawing, { u: 390, v: 160 });
  const after = curveSegments(drawing);
  assert.equal(after.length, 6);
  assert.deepEqual(after.slice(0, -2), before.slice(0, -1));
  for (const point of drawing.points.slice(0, -2)) {
    assert.deepEqual(drawing.curves[0].trajectories[point.id], trajectories[point.id]);
  }
});

test('two points are straight; coincident points, reversals, and collapsed segments stay finite and 2D', () => {
  const drawing = createDrawing();
  assert.deepEqual(curveSegments(drawing), []);
  addPoint(drawing, { u: 0, v: 0 });
  assert.deepEqual(curveSegments(drawing), []);
  addPoint(drawing, { u: 90, v: 0 });
  assert.deepEqual(curveSegments(drawing)[0].control1, { u: 30, v: 0 });
  assert.deepEqual(curveSegments(drawing)[0].control2, { u: 60, v: 0 });
  addPoint(drawing, { u: 0, v: 0 });
  addPoint(drawing, { u: 0, v: 0 });
  addPoint(drawing, { u: 10, v: 30 });
  movePoint(drawing, 'P2', { u: 0, v: 0 });
  const segments = curveSegments(drawing);
  assert.deepEqual(segments[0].control1, { u: 0, v: 0 });
  assert.deepEqual(segments[0].control2, { u: 0, v: 0 });
  for (const position of [...Object.values(drawing.curves[0].trajectories), ...segments.flatMap(s => [s.start, s.control1, s.control2, s.end])]) {
    assert.deepEqual(Object.keys(position).sort(), ['u', 'v']);
    assert.ok(Number.isFinite(position.u) && Number.isFinite(position.v));
  }
});
