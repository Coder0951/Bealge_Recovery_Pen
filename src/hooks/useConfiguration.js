import { PEN_FRAME_SIZE, PEN_INTERIOR_SIZE, PEN_BOUNDARY } from '../utils/collision.js';

export function useConfiguration(mode, options = {}) {
  const MAT_HEIGHT = 2.3;
  
  // Item dimensions (width x depth)
  const DIMENSIONS = {
    fullBed: { width: 29, depth: 18 },
    padBed: { width: 25, depth: 14 },
    washablePad: { width: 36, depth: 36 },
    disposablePad: { width: 22, depth: 22 },
    bowlStand: { width: 10, depth: 10 }
  };
  
  // Validate and constrain item position within pen boundaries
  const constrainPosition = (position, width, depth, itemName) => {
    const [x, y, z] = position;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    
    // Calculate boundaries for this item
    const minX = -PEN_BOUNDARY + halfWidth;
    const maxX = PEN_BOUNDARY - halfWidth;
    const minZ = -PEN_BOUNDARY + halfDepth;
    const maxZ = PEN_BOUNDARY - halfDepth;
    
    // Clamp position to boundaries
    const constrainedX = Math.max(minX, Math.min(maxX, x));
    const constrainedZ = Math.max(minZ, Math.min(maxZ, z));
    
    // Warn if position was adjusted
    if (constrainedX !== x || constrainedZ !== z) {
      console.warn(
        `${itemName} at [${x}, ${z}] adjusted to [${constrainedX}, ${constrainedZ}] to fit within pen boundaries. ` +
        `Item size: ${width}" × ${depth}", Pen interior: ${PEN_INTERIOR_SIZE}" × ${PEN_INTERIOR_SIZE}" (frame ${PEN_FRAME_SIZE}" × ${PEN_FRAME_SIZE}")`
      );
    }
    
    return [constrainedX, y, constrainedZ];
  };
  
  // ── Entrance zone (front wall, zipper door area) ──────────
  // Door is on front wall (z = +25) centered around x = 12.5
  // Keep a clear path: x: 0 to 25, z: 14 to 25 (11" deep clearance)
  const ENTRANCE_ZONE = {
    minX: 0,
    maxX: PEN_BOUNDARY,    // 24
    minZ: 14,
    maxZ: PEN_BOUNDARY     // 24
  };
  
  // Check if an item's AABB overlaps a rectangular zone
  const overlapsZone = (cx, cz, halfW, halfD, zone) => {
    return (cx + halfW > zone.minX && cx - halfW < zone.maxX &&
            cz + halfD > zone.minZ && cz - halfD < zone.maxZ);
  };
  
  // Check if two items overlap each other (AABB test)
  const itemsOverlap = (ax, az, ahw, ahd, bx, bz, bhw, bhd) => {
    return (Math.abs(ax - bx) < (ahw + bhw) && Math.abs(az - bz) < (ahd + bhd));
  };
  
  // Push an item out of the entrance zone along X axis
  const clearEntrance = (cx, cz, halfW, halfD, itemName) => {
    if (overlapsZone(cx, cz, halfW, halfD, ENTRANCE_ZONE)) {
      // Shift left so right edge clears ENTRANCE_ZONE.minX
      const newX = ENTRANCE_ZONE.minX - halfW - 1; // 1" margin
      console.warn(
        `${itemName} at [${cx}, ${cz}] blocks entrance — shifted to x=${newX.toFixed(1)}`
      );
      return newX;
    }
    return cx;
  };
  
  // Resolve overlaps between solid items (beds + bowls) by nudging the later item.
  // This runs iteratively until stable (or max iterations reached) to avoid cascading overlaps.
  const resolveSolidOverlaps = (beds, bowls, maxIter = 10) => {
    // Build a unified solids list preserving origin type and index so we can map back
    const solids = [];
    beds.forEach((b, i) => {
      const dim = b.type === 'full' ? DIMENSIONS.fullBed : DIMENSIONS.padBed;
      solids.push({ kind: 'bed', index: i, width: dim.width, depth: dim.depth, position: [...b.position] });
    });
    bowls.forEach((b, i) => {
      const dim = DIMENSIONS.bowlStand;
      solids.push({ kind: 'bowl', index: i, width: dim.width, depth: dim.depth, position: [...b.position] });
    });

    const eps = 1e-6;
    let iter = 0;
    let changed = true;
    while (changed && iter < maxIter) {
      changed = false;
      iter++;
      for (let i = 0; i < solids.length; i++) {
        const A = solids[i];
        const ahw = A.width / 2;
        const ahd = A.depth / 2;
        for (let j = i + 1; j < solids.length; j++) {
          const B = solids[j];
          const bhw = B.width / 2;
          const bhd = B.depth / 2;
          const ax = A.position[0];
          const az = A.position[2];
          let bx = B.position[0];
          let bz = B.position[2];

          if (itemsOverlap(ax, az, ahw, ahd, bx, bz, bhw, bhd)) {
            const overlapX = (ahw + bhw) - Math.abs(ax - bx);
            const overlapZ = (ahd + bhd) - Math.abs(az - bz);
            // Push the later item (B) along the axis of least overlap with 1" margin
            if (overlapX <= overlapZ) {
              bx += (bx >= ax ? overlapX + 1 : -(overlapX + 1));
            } else {
              bz += (bz >= az ? overlapZ + 1 : -(overlapZ + 1));
            }
            B.position[0] = bx;
            B.position[2] = bz;
            changed = true;
            console.warn(`${B.kind} ${B.index + 1} nudged to [${bx.toFixed(1)}, ${bz.toFixed(1)}] to resolve overlap with ${A.kind} ${A.index + 1}`);
          }
        }
      }
      // After each iteration, also clamp solids back into pen bounds
      solids.forEach((S) => {
        const hw = S.width / 2;
        const hd = S.depth / 2;
        const cx = Math.max(-PEN_BOUNDARY + hw, Math.min(PEN_BOUNDARY - hw, S.position[0]));
        const cz = Math.max(-PEN_BOUNDARY + hd, Math.min(PEN_BOUNDARY - hd, S.position[2]));
        if (Math.abs(cx - S.position[0]) > eps || Math.abs(cz - S.position[2]) > eps) {
          S.position[0] = cx;
          S.position[2] = cz;
          changed = true;
        }
      });
    }

    // Map back to beds and bowls
    const outBeds = beds.map((b, i) => ({ ...b, position: solids.find(s => s.kind === 'bed' && s.index === i).position }));
    const outBowls = bowls.map((b, i) => ({ ...b, position: solids.find(s => s.kind === 'bowl' && s.index === i).position }));
    return { beds: outBeds, bowls: outBowls };
  };
  
  // Apply constraints to configuration items
  const applyConstraints = (config) => {
    // Step 1: Boundary-constrain beds and bowls first
    let beds = config.beds.map((bed, i) => {
      const dim = bed.type === 'full' ? DIMENSIONS.fullBed : DIMENSIONS.padBed;
      return {
        ...bed,
        position: constrainPosition(bed.position, dim.width, dim.depth, `Bed ${i + 1} (${bed.type})`)
      };
    });

    let bowls = config.bowls.map((bowl, i) => {
      const dim = DIMENSIONS.bowlStand;
      return {
        ...bowl,
        position: constrainPosition(bowl.position, dim.width, dim.depth, `Bowl Stand ${i + 1}`)
      };
    });

    // Iteratively resolve overlaps among beds + bowls, then re-apply entrance protection and re-resolve if needed
    const resolved = resolveSolidOverlaps(beds, bowls, 12);
    beds = resolved.beds.map((bed, i) => ({ ...bed }));
    bowls = resolved.bowls.map((b) => ({ ...b }));

    // After initial nudge pass, ensure none of the solids blocks the entrance; if so shift and re-run overlap resolution
    let anyEntranceShift = false;
    beds = beds.map((bed, i) => {
      const dim = bed.type === 'full' ? DIMENSIONS.fullBed : DIMENSIONS.padBed;
      const [x, y, z] = bed.position;
      const newX = clearEntrance(x, z, dim.width / 2, dim.depth / 2, `Bed ${i + 1} (${bed.type})`);
      const pos = constrainPosition([newX, y, z], dim.width, dim.depth, `Bed ${i + 1} entrance-fix`);
      if (pos[0] !== x || pos[2] !== z) anyEntranceShift = true;
      return { ...bed, position: pos };
    });

    bowls = bowls.map((bowl, i) => {
      const dim = DIMENSIONS.bowlStand;
      const [x, y, z] = bowl.position;
      const newX = clearEntrance(x, z, dim.width / 2, dim.depth / 2, `Bowl Stand ${i + 1}`);
      const pos = constrainPosition([newX, y, z], dim.width, dim.depth, `Bowl Stand ${i + 1} entrance-fix`);
      if (pos[0] !== x || pos[2] !== z) anyEntranceShift = true;
      return { ...bowl, position: pos };
    });

    if (anyEntranceShift) {
      const reResolved = resolveSolidOverlaps(beds, bowls, 8);
      beds = reResolved.beds;
      bowls = reResolved.bowls;
    }
    
    // Step 2: Bowls — already handled above (boundary + entrance + overlap resolution)
    // (kept for clarity; bowls variable now contains resolved/entrance-fixed positions)

    // Step 3: Pads — boundary + entrance
    const pads = config.pads.map((pad, i) => {
      const dim = pad.type === 'washable' ? DIMENSIONS.washablePad : DIMENSIONS.disposablePad;
      let pos = constrainPosition(pad.position, dim.width, dim.depth, `Pee Pad ${i + 1} (${pad.type})`);
      const newX = clearEntrance(pos[0], pos[2], dim.width / 2, dim.depth / 2, `Pee Pad ${i + 1} (${pad.type})`);
      pos = constrainPosition([newX, pos[1], pos[2]], dim.width, dim.depth, `Pee Pad ${i + 1} entrance-fix`);
      return { ...pad, position: pos };
    });
    
    return { beds, bowls, pads };
  };
  
  // ═══════════════════════════════════════════════════════════════
  // 3 VET-CONFIRMED RECOVERY PRESETS
  // Bed types: full (bolster + cushion) | pad (interior mat only)
  // Every preset: 3-zone separation (sleep / eat / eliminate)
  // Every preset: washable + disposable layered bathroom
  // Inventory: 4 full beds (can split to pad), 2 bowl stands,
  //   2 washable pads (36×36), disposable pads (22×22)
  // ═══════════════════════════════════════════════════════════════

  const configurations = {

    // ── 1. ICU — Days 1-3 (Acute Post-Op) — customized by user ──
    icu: {
      clamp: false,
      beds: [
        { rotationY: 0, position: [-8, 0, -13], type: 'full' },
        { rotationY: 270, position: [14.75, 0, -10], type: 'pad' }
      ],
      bowls: [
        { rotationY: 90, position: [-17, 0, 16], height: 4.9 },
        { rotationY: 180, position: [-17, 0, 2], height: 4.9 }
      ],
      pads: [
        { rotationY: 0, position: [-12, 0, 12], type: 'disposable' },
        { rotationY: 0, position: [-12.25, 0, -10], type: 'disposable' },
        { rotationY: 0, position: [10.5, 0, -11], type: 'disposable' },
        { rotationY: 0, position: [13, 0, 13], type: 'disposable' },
        { rotationY: 0, position: [0, 0, 0], type: 'washable' }
      ]
    },

    // ── 2. RECOVERY — Weeks 2-4 (Controlled Mobility) ──────────
    recovery: {
      clamp: false,
      beds: [
        { rotationY: 0, position: [-8.5, 0, -13.75], type: 'full' },
        { rotationY: 270, position: [14.5, 0, -10.25], type: 'pad' }
      ],
      bowls: [
        { rotationY: 180, position: [-20, 0, 18], height: 4.9 },
        { rotationY: 180, position: [-9.5, 0, 17.75], height: 4.9 }
      ],
      pads: [
        { rotationY: 0, position: [-0.25, 0, 0], type: 'washable' }
      ]
    },

    // ── 3. GRADUATION — Weeks 8-12 (Pre-Release) ───────────────
    grad: {
      clamp: false,
      beds: [
        { rotationY: 90, position: [-13.5, 0, 8.75], type: 'full' },
        { rotationY: 0, position: [-10.25, 0, -14.25], type: 'pad' },
        { rotationY: 90, position: [3.25, 0, 9], type: 'pad' }
      ],
      bowls: [
        { rotationY: 270, position: [18.25, 0, -18], height: 4.9 },
        { rotationY: 270, position: [18.25, 0, -8], height: 4.9 }
      ],
      pads: []
    },

    // ── 4. OPTIMAL — Balanced Layout ───────────────────────────
    optimal: {
      beds: [
        { rotationY: 180, position: [-8, 0, 10.75], type: 'full' },
        { rotationY: 0, position: [10, 0, -16], type: 'pad' }
      ],
      bowls: [
        { rotationY: 0, position: [-18, 0, -19], height: 4.9 },
        { rotationY: 0, position: [-8, 0, -19], height: 4.9 }
      ],
      pads: []
    }
  };

  // Get configuration and apply boundary constraints
  const clampOverride = options.clamp;
  const configDef = configurations[mode] || configurations.optimal;
  const { clamp: presetClamp, ...layoutSeed } = configDef;
  const shouldClamp = typeof clampOverride === 'boolean'
    ? clampOverride
    : typeof presetClamp === 'boolean'
      ? presetClamp
      : true;
  return shouldClamp ? applyConstraints(layoutSeed) : layoutSeed;
}
