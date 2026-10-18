// Sheet coordinates are 2D local SVG units, with the origin at the upper left.
// Resizing the view does not rescale or rewrite stored positions.
export function createDrawing() {
  return {
    sheet: { id: 'sheet-1' }, points: [], curves: [],
    nextPointId: 1, nextCurveId: 1,
    activeCurveId: null, selectedCurveId: null, selectedPointId: null,
  };
}

function position2D({ u, v }) {
  if (!Number.isFinite(u) || !Number.isFinite(v)) {
    throw new TypeError('A drawing position requires finite u and v values.');
  }
  return { u, v };
}

function findCurve(drawing, id) {
  const curve = drawing.curves.find(curve => curve.id === id);
  if (!curve) throw new RangeError('Unknown drawing curve.');
  return curve;
}

function curvePoints(drawing, curve) {
  const points = new Map(drawing.points.map(point => [point.id, point]));
  return curve.pointIds.map(id => {
    const point = points.get(id);
    if (!point || point.sheet !== curve.sheet) throw new RangeError('Curve references an invalid Sheet point.');
    return point;
  });
}

function pointCurve(drawing, pointId, curveId) {
  if (!drawing.points.some(point => point.id === pointId)) {
    throw new RangeError('Unknown drawing point.');
  }
  const candidates = drawing.curves.filter(curve => curve.pointIds.includes(pointId));
  const requested = curveId ?? drawing.selectedCurveId;
  const curve = candidates.find(curve => curve.id === requested);
  if (curve) return curve;
  if (curveId == null && candidates.length === 1) return candidates[0];
  throw new RangeError('Choose a curve containing this point.');
}

export function addPoint(drawing, position) {
  const localPosition = position2D(position);
  let curve;
  if (drawing.activeCurveId) {
    curve = findCurve(drawing, drawing.activeCurveId);
  } else {
    curve = {
      id: `C${drawing.nextCurveId++}`,
      sheet: drawing.sheet.id,
      pointIds: [], trajectories: {}, editedTrajectories: {},
    };
    drawing.curves.push(curve);
    drawing.activeCurveId = curve.id;
  }
  const point = {
    id: `P${drawing.nextPointId++}`,
    sheet: drawing.sheet.id,
    position: localPosition,
  };
  drawing.points.push(point);
  curve.pointIds.push(point.id);
  inferNewTrajectories(curvePoints(drawing, curve), curve);
  drawing.selectedCurveId = curve.id;
  drawing.selectedPointId = point.id;
  return point;
}

export function finishCurve(drawing) {
  drawing.activeCurveId = null;
  drawing.selectedPointId = null;
}

export function selectCurve(drawing, id) {
  const curve = findCurve(drawing, id);
  finishCurve(drawing);
  drawing.selectedCurveId = curve.id;
  return curve;
}

export function selectPoint(drawing, id, curveId) {
  const curve = pointCurve(drawing, id, curveId);
  selectCurve(drawing, curve.id);
  drawing.selectedPointId = id;
  return drawing.points.find(point => point.id === id);
}

export function movePoint(drawing, id, position) {
  const point = drawing.points.find(point => point.id === id);
  if (!point) throw new RangeError('Unknown drawing point.');
  point.position = position2D(position);
}

export function setTrajectoryDirection(drawing, id, direction, curveId) {
  const curve = pointCurve(drawing, id, curveId);
  const points = curvePoints(drawing, curve);
  const index = curve.pointIds.indexOf(id);
  const vector = position2D(direction);
  const size = length(vector);
  if (size < 1e-9) return;
  let magnitude = length(curve.trajectories[id]);
  if (magnitude < 1e-9) {
    // An isolated point or reversal can have no initial direction. Give an
    // explicit edit a useful local magnitude, independent of drag distance.
    const point = points[index];
    const distances = [points[index - 1], points[index + 1]]
      .filter(Boolean)
      .map(neighbor => length(difference(point.position, neighbor.position)))
      .filter(distance => distance > 1e-9);
    magnitude = distances.length ? Math.min(...distances) : 1;
  }
  curve.trajectories[id] = {
    u: vector.u / size * magnitude,
    v: vector.v / size * magnitude,
  };
  curve.editedTrajectories ??= {};
  curve.editedTrajectories[id] = true;
}


function difference(a, b) {
  return { u: b.u - a.u, v: b.v - a.v };
}

function length(vector) {
  return Math.hypot(vector.u, vector.v);
}

function inferNewTrajectories(points, curve) {
  const last = points.at(-1);
  if (points.length === 1) {
    curve.trajectories[last.id] = { u: 0, v: 0 };
    return;
  }
  const previous = points.at(-2);
  const incoming = difference(previous.position, last.position);
  curve.trajectories[last.id] = incoming;
  // A new observation must not replace a direction the user explicitly set.
  if (curve.editedTrajectories?.[previous.id]) return;
  if (points.length === 2) {
    curve.trajectories[previous.id] = { ...incoming };
    return;
  }
  // Only the former endpoint gains a second observation on extension.
  // Earlier trajectories stay fixed; dragging never re-infers trajectories.
  const before = difference(points.at(-3).position, previous.position);
  const a = length(before), b = length(incoming);
  if (a === 0 || b === 0) {
    curve.trajectories[previous.id] = { ...(a === 0 ? incoming : before) };
    return;
  }
  const bisector = { u: before.u / a + incoming.u / b, v: before.v / a + incoming.v / b };
  const size = length(bisector);
  const scale = size < 1e-9 ? 0 : Math.min(a, b) / size;
  curve.trajectories[previous.id] = { u: bisector.u * scale, v: bisector.v * scale };
}

export function curveSegments(drawing, curveId) {
  const curves = curveId == null ? drawing.curves : [findCurve(drawing, curveId)];
  return curves.flatMap(curve => {
    const points = curvePoints(drawing, curve);
    return points.slice(1).map((end, index) => {
      const start = points[index];
      const chordLength = length(difference(start.position, end.position));
      // Cubic Hermite geometry rendered through equivalent SVG cubic controls.
      // Cap tangent reach using only this segment's chord to limit overshoot.
      function control(point, sign) {
        const trajectory = curve.trajectories[point.id];
        const magnitude = length(trajectory);
        const scale = magnitude === 0 ? 0 : Math.min(1, chordLength / magnitude) / 3;
        return {
          u: point.position.u + sign * trajectory.u * scale,
          v: point.position.v + sign * trajectory.v * scale,
        };
      }
      return {
        id: `${curve.id}:${start.id}-${end.id}`,
        curveId: curve.id,
        start: { ...start.position },
        control1: control(start, 1),
        control2: control(end, -1),
        end: { ...end.position },
      };
    });
  });
}
