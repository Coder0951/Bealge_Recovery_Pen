// Basic AABB collision and snapping utilities
// Note: DIMENSIONS mirror those in `useConfiguration.js` — keep in sync if changed.
export const DIMENSIONS = {
  fullBed: { width: 29, depth: 18 },
  padBed: { width: 25, depth: 14 },
  washablePad: { width: 36, depth: 36 },
  disposablePad: { width: 22, depth: 22 },
  bowlStand: { width: 10, depth: 10 }
};

export function halfExtentsForItem(item) {
  // Infer item kind and type
  if (item.hasOwnProperty('height')) {
    // bowl stand
    const d = DIMENSIONS.bowlStand;
    return { hw: d.width / 2, hd: d.depth / 2 };
  }

  // Determine base width/depth by type
  let dim = null;
  if (item.type === 'full' || item.type === 'pad') dim = item.type === 'full' ? DIMENSIONS.fullBed : DIMENSIONS.padBed;
  else if (item.type === 'washable' || item.type === 'disposable') dim = item.type === 'washable' ? DIMENSIONS.washablePad : DIMENSIONS.disposablePad;
  else dim = { width: 10, depth: 10 };

  // Base half-extents
  const hw = dim.width / 2;
  const hd = dim.depth / 2;

  // Account for rotationY (degrees) by computing the axis-aligned bounding box
  // of the rotated rectangle. This ensures overlap and clamping use correct extents.
  const rot = (item.rotationY || 0) * Math.PI / 180;
  const cos = Math.abs(Math.cos(rot));
  const sin = Math.abs(Math.sin(rot));
  const hwRot = hw * cos + hd * sin;
  const hdRot = hw * sin + hd * cos;
  return { hw: hwRot, hd: hdRot };
}

export function aabbOverlap(posA, halfA, posB, halfB) {
  const ax = posA[0];
  const az = posA[2];
  const bx = posB[0];
  const bz = posB[2];

  const overlapX = Math.abs(ax - bx) < (halfA.hw + halfB.hw);
  const overlapZ = Math.abs(az - bz) < (halfA.hd + halfB.hd);
  return overlapX && overlapZ;
}

export function isOverlappingAny(layout, candidateItem, candidatePos, opts = {}) {
  const { excludeId } = opts;
  const lists = ['beds', 'bowls', 'pads'];
  for (const key of lists) {
    const arr = layout[key] || [];
    for (const it of arr) {
      if (excludeId && it._id === excludeId) continue;
      if (!it.position) continue; // skip unplaced
      // PAD STACKING RULES:
      // - Disposable can stack on washable (allowed)
      // - Washable can overlap other washable (allowed)
      // - Disposable on disposable should be treated as conflicting (not allowed)
      // - Pads must NOT overlap beds or bowls
      const existingIsPad = (it.type === 'washable' || it.type === 'disposable');
      const candidateIsPad = (candidateItem.type === 'washable' || candidateItem.type === 'disposable');

      // If existing is a pad and candidate is a pad, allow certain stacking rules
      if (existingIsPad && candidateIsPad) {
        if (it.type === 'washable' && candidateItem.type === 'disposable') {
          // disposable on top of washable OK
          continue;
        }
        if (it.type === 'washable' && candidateItem.type === 'washable') {
          // washable can overlap washable
          continue;
        }
        // other pad combinations (e.g., disposable on disposable, disposable under washable) are blocking
      }

      // If candidate is pad and existing is bed/bowl -> conflict (can't slide pad under existing item)
      if (candidateIsPad && !existingIsPad) {
        const halfA = halfExtentsForItem(candidateItem);
        const halfB = halfExtentsForItem(it);
        if (aabbOverlap(candidatePos, halfA, it.position, halfB)) return true;
        continue;
      }

      // If existing is pad but candidate is bed/bowl -> ALLOW (anything can sit on top of pads)
      if (existingIsPad && !candidateIsPad) {
        // Skip collision check - beds and bowls can be placed on pads
        continue;
      }

      // Default: both are non-pad (beds and bowls) -> normal collision check
      const halfA = halfExtentsForItem(candidateItem);
      const halfB = halfExtentsForItem(it);
      if (aabbOverlap(candidatePos, halfA, it.position, halfB)) return true;
    }
  }
  return false;
}

export function findNonOverlappingPosition(layout, candidateItem, desiredPos, opts = {}) {
  const { gridSize = 1, maxRadius = 12, excludeId } = opts;
  const center = snapToGrid(desiredPos, gridSize);
  const half = halfExtentsForItem(candidateItem);

  // Spiral search around center using grid step to find the nearest valid position.
  const maxSteps = Math.ceil(maxRadius / gridSize);
  const dirs = [ [1,0], [0,1], [-1,0], [0,-1] ];
  let x = 0, z = 0;
  let stepLen = 1;
  let dir = 0;
  let stepsRemaining = stepLen;
  let iterations = 0;
  const maxIter = (maxSteps * 2 + 1) * (maxSteps * 2 + 1);

  // include center first
  while (Math.hypot(x, z) * gridSize <= maxRadius && iterations < maxIter) {
    const pos = [center[0] + x * gridSize, desiredPos[1], center[2] + z * gridSize];
    const clamped = clampToPen(pos, half);
    const dist = Math.hypot(clamped[0] - center[0], clamped[2] - center[2]);
    if (dist <= maxRadius) {
      const overlap = isOverlappingAny(layout, candidateItem, clamped, { excludeId });
      if (!overlap) return clamped;
    }

    // step the spiral
    x += dirs[dir][0];
    z += dirs[dir][1];
    stepsRemaining--;
    if (stepsRemaining === 0) {
      dir = (dir + 1) % 4;
      if (dir === 0 || dir === 2) stepLen++;
      stepsRemaining = stepLen;
    }
    iterations++;
  }

  return null;
}

export function snapToGrid(position, gridSize = 1) {
  if (!gridSize || gridSize <= 0) return position;
  const [x, y, z] = position;
  const snap = (v) => Math.round(v / gridSize) * gridSize;
  return [snap(x), y, snap(z)];
}

export const PEN_BOUNDARY = 25; // inches (half-size)

export function clampToPen(position, halfExtents = { hw: 0, hd: 0 }) {
  const [x, y, z] = position;
  const minX = -PEN_BOUNDARY + halfExtents.hw;
  const maxX = PEN_BOUNDARY - halfExtents.hw;
  const minZ = -PEN_BOUNDARY + halfExtents.hd;
  const maxZ = PEN_BOUNDARY - halfExtents.hd;
  const cx = Math.max(minX, Math.min(maxX, x));
  const cz = Math.max(minZ, Math.min(maxZ, z));
  return [cx, y, cz];
}
