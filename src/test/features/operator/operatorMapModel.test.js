import { describe, expect, it } from 'vitest';
import {
  OP_CX,
  OP_CY,
  OP_INNER_GROUND_RX,
  OPERATOR_STAND_POSITIONS,
  getOperatorNodeMapPos,
  projectOutsideOperatorInnerGround,
} from '../../../features/operator/operatorMapModel';

describe('operatorMapModel', () => {
  it('projects center point outside inner ground safely', () => {
    const p = projectOutsideOperatorInnerGround(OP_CX, OP_CY, 14);
    expect(p.x).toBe(OP_CX + OP_INNER_GROUND_RX + 14);
    expect(p.y).toBe(OP_CY);
  });

  it('keeps already-outside points unchanged', () => {
    const p = projectOutsideOperatorInnerGround(OP_CX + 500, OP_CY, 14);
    expect(p).toEqual({ x: OP_CX + 500, y: OP_CY });
  });

  it('maps zone aliases and stand ids to operator map positions', () => {
    const zonePos = getOperatorNodeMapPos('B5');
    expect(zonePos).toBeTruthy();
    expect(typeof zonePos.x).toBe('number');
    expect(typeof zonePos.y).toBe('number');

    const standPos = getOperatorNodeMapPos(OPERATOR_STAND_POSITIONS[0].id);
    expect(standPos).toEqual({
      x: OPERATOR_STAND_POSITIONS[0].x,
      y: OPERATOR_STAND_POSITIONS[0].y,
    });

    expect(getOperatorNodeMapPos('UNKNOWN_NODE')).toBeNull();
  });
});
