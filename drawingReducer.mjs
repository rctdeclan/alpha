import { addPoint, selectPoint, movePoint, setTrajectoryDirection, finishCurve, selectCurve } from './drawing.mjs';

// The geometry model mutates its argument. Copy at the React state boundary
// so reducer replays and earlier render snapshots remain independent.
export function drawingReducer(state, action) {
  const next = structuredClone(state);
  switch (action.type) {
    case 'add':
      addPoint(next, action.position);
      return next;
    case 'select':
      selectPoint(next, action.id, action.curveId);
      return next;
    case 'finish':
      finishCurve(next);
      return next;
    case 'select-curve':
      selectCurve(next, action.id);
      return next;
    case 'move':
      movePoint(next, action.id, action.position);
      return next;
    case 'trajectory':
      setTrajectoryDirection(next, action.id, action.direction, action.curveId);
      return next;
    default:
      throw new Error(`Unknown drawing action: ${action.type}`);
  }
}
