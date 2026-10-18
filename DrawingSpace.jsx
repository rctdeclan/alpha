import { useReducer, useRef } from 'react';
import { createDrawing, curveSegments } from './drawing.mjs';
import { drawingReducer } from './drawingReducer.mjs';

function sheetPosition(event) {
  const local = new DOMPoint(event.clientX, event.clientY)
    .matrixTransform(event.currentTarget.getScreenCTM().inverse());
  return { u: local.x, v: local.y };
}

export default function DrawingSpace() {
  const [drawing, dispatch] = useReducer(drawingReducer, undefined, createDrawing);
  const drag = useRef(null);
  const selectedCurve = drawing.curves.find(curve => curve.id === drawing.selectedCurveId);
  const selectedPoint = drawing.points.find(point => point.id === drawing.selectedPointId);
  const trajectory = selectedPoint ? selectedCurve?.trajectories[selectedPoint.id] : null;
  const trajectoryAngle = trajectory && Math.hypot(trajectory.u, trajectory.v) > 1e-9
    ? Math.atan2(trajectory.v, trajectory.u) : 0;
  const lineU = 32 * Math.cos(trajectoryAngle);
  const lineV = 32 * Math.sin(trajectoryAngle);

  function startDrag(event) {
    if (event.button !== 0 || !event.isPrimary || drag.current) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    const position = sheetPosition(event);
    const trajectoryId = event.target.dataset.trajectoryId;
    if (trajectoryId && selectedPoint?.id === trajectoryId) {
      drag.current = {
        kind: 'trajectory',
        pointerId: event.pointerId,
        pointId: trajectoryId,
        curveId: selectedCurve.id,
        origin: { ...selectedPoint.position },
        initialPointerAngle: Math.atan2(position.v - selectedPoint.position.v, position.u - selectedPoint.position.u),
        initialTrajectoryAngle: trajectoryAngle,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    const id = event.target.dataset.pointId;
    const curveId = event.target.dataset.curveId;
    if (curveId && !id) {
      dispatch({ type: 'select-curve', id: curveId });
      return;
    }
    const point = id
      ? drawing.points.find(point => point.id === id)
      : { id: `P${drawing.nextPointId}`, position };
    dispatch(id ? { type: 'select', id, curveId } : { type: 'add', position });
    drag.current = {
      kind: 'point',
      pointerId: event.pointerId,
      pointId: point.id,
      offsetU: point.position.u - position.u,
      offsetV: point.position.v - position.v,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const position = sheetPosition(event);
    if (active.kind === 'trajectory') {
      const u = position.u - active.origin.u;
      const v = position.v - active.origin.v;
      // Ignore the ambiguous direction at P. An angular delta makes either
      // side of the line draggable without reversing T on pointer-down.
      if (Math.hypot(u, v) < 3) return;
      const angle = active.initialTrajectoryAngle + Math.atan2(v, u) - active.initialPointerAngle;
      dispatch({
        type: 'trajectory',
        id: active.pointId,
        curveId: active.curveId,
        direction: { u: Math.cos(angle), v: Math.sin(angle) },
      });
      return;
    }
    const surface = event.currentTarget;
    dispatch({
      type: 'move',
      id: active.pointId,
      position: {
        u: Math.max(0, Math.min(surface.clientWidth, position.u + active.offsetU)),
        v: Math.max(0, Math.min(surface.clientHeight, position.v + active.offsetV)),
      },
    });
  }

  function endDrag(event) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function finishDrawing(event) {
    if (event.key !== 'Escape' && event.key !== 'Enter') return;
    event.preventDefault();
    const active = drag.current;
    drag.current = null;
    if (active && event.currentTarget.hasPointerCapture(active.pointerId)) {
      event.currentTarget.releasePointerCapture(active.pointerId);
    }
    dispatch({ type: 'finish' });
  }

  return (
    <svg
      className="drawing-space"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="2D drawing space"
      tabIndex={0}
      onKeyDown={finishDrawing}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
    >
      <g>
        {curveSegments(drawing).map(({ id, curveId, start, control1, control2, end }) => {
          const d = `M ${start.u} ${start.v} C ${control1.u} ${control1.v} ${control2.u} ${control2.v} ${end.u} ${end.v}`;
          return (
            <g key={id}>
              <path className="curve-hit" data-curve-id={curveId} aria-label={`Curve ${curveId}`} d={d} />
              <path
                className={`drawing-curve${curveId === drawing.selectedCurveId ? ' selected' : ''}`}
                data-segment-id={id}
                data-curve-id={curveId}
                d={d}
                aria-hidden="true"
              />
            </g>
          );
        })}
      </g>
      {selectedPoint && (
        <g className="trajectory" aria-label={`Trajectory of ${selectedPoint.id}`}>
          <line
            className="trajectory-hit"
            data-trajectory-id={selectedPoint.id}
            x1={selectedPoint.position.u - lineU}
            y1={selectedPoint.position.v - lineV}
            x2={selectedPoint.position.u + lineU}
            y2={selectedPoint.position.v + lineV}
          />
          <line
            className="trajectory-line"
            x1={selectedPoint.position.u - lineU}
            y1={selectedPoint.position.v - lineV}
            x2={selectedPoint.position.u + lineU}
            y2={selectedPoint.position.v + lineV}
          />
        </g>
      )}
      {drawing.points.map(point => {
        const selected = point.id === drawing.selectedPointId;
        const owner = selectedCurve?.pointIds.includes(point.id)
          ? selectedCurve : drawing.curves.find(curve => curve.pointIds.includes(point.id));
        return (
          <circle
            key={point.id}
            className={`drawing-point${selected ? ' selected' : ''}`}
            data-point-id={point.id}
            data-curve-id={owner?.id}
            aria-label={point.id}
            cx={point.position.u}
            cy={point.position.v}
            r={selected ? 5 : 3.5}
          />
        );
      })}
    </svg>
  );
}
