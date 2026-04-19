/** Browser / GPU canvas backing-store limits — keeps resize loops from allocating absurd bitmaps */
export const MAX_CANVAS_CSS_PX = 4096;

export const OP_MAP_W = 800;
export const OP_MAP_H = 600;
export const OP_CX = OP_MAP_W / 2;
export const OP_CY = OP_MAP_H / 2;

export const OPERATOR_ZONE_LOCATIONS = [
  { id: 'A1-A4', x: OP_CX - 230, y: OP_CY - 80, rx: 65, ry: 60, alias: ['A1', 'A2', 'A3', 'A4'] },
  { id: 'B1-B3', x: OP_CX, y: OP_CY - 210, rx: 90, ry: 45, alias: ['B1', 'B2', 'B3'] },
  { id: 'B4-B6', x: OP_CX + 230, y: OP_CY - 80, rx: 75, ry: 55, alias: ['B4', 'B5', 'B6'] },
  { id: 'C1-C3', x: OP_CX + 230, y: OP_CY + 120, rx: 85, ry: 55, alias: ['C1', 'C2', 'C3'] },
  { id: 'C4-C6', x: OP_CX, y: OP_CY + 210, rx: 95, ry: 45, alias: ['C4', 'C5', 'C6'] },
  { id: 'D1-D3', x: OP_CX - 210, y: OP_CY + 120, rx: 75, ry: 55, alias: ['D1', 'D2', 'D3'] },
];

export const OPERATOR_STAND_POSITIONS = [
  { id: 'S3', x: OP_CX - 110, y: OP_CY - 170 },
  { id: 'S5', x: OP_CX - 150, y: OP_CY + 30 },
  { id: 'S7', x: OP_CX + 140, y: OP_CY - 170 },
  { id: 'S12', x: OP_CX + 155, y: OP_CY + 40 },
];

export function getOperatorNodeMapPos(nodeId) {
  const zm = {
    A1: 'A1-A4',
    A2: 'A1-A4',
    A3: 'A1-A4',
    A4: 'A1-A4',
    B1: 'B1-B3',
    B2: 'B1-B3',
    B3: 'B1-B3',
    B4: 'B4-B6',
    B5: 'B4-B6',
    B6: 'B4-B6',
    C1: 'C1-C3',
    C2: 'C1-C3',
    C3: 'C1-C3',
    C4: 'C4-C6',
    C5: 'C4-C6',
    C6: 'C4-C6',
    D1: 'D1-D3',
    D2: 'D1-D3',
    D3: 'D1-D3',
  };
  const gid = zm[nodeId];
  if (gid) {
    const zl = OPERATOR_ZONE_LOCATIONS.find((z) => z.id === gid);
    if (zl) return { x: zl.x, y: zl.y };
  }
  const sp = OPERATOR_STAND_POSITIONS.find((s) => s.id === nodeId);
  if (sp) return { x: sp.x, y: sp.y };
  return null;
}
