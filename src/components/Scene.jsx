import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox, useSphere } from '@react-three/cannon';
import Playpen from './Playpen';
import Bed from './Bed';
import BowlStand from './BowlStand';
import PeePad from './PeePad';
import DogSkeleton from './DogSkeleton';
import { useConfiguration } from '../hooks/useConfiguration';
import { isOverlappingAny, snapToGrid, halfExtentsForItem, clampToPen, findNonOverlappingPosition } from '../utils/collision';

const BED_DIMENSIONS = {
  full: { width: 29, depth: 18, height: 8 },
  pad: { width: 25, depth: 14, height: 3 }
};
const BOWL_DIMENSIONS = { width: 10, depth: 10 };
const REALISTIC_MODEL_PATH = '/assets/dog-realistic.glb';
const REALISTIC_TEXTURE_PATHS = Object.freeze({ albedo: '', normal: '', roughness: '' });
const OUTSIDE_START_OFFSET = 4; // how far outside the pen the actor begins

export default function Scene({ mode, beagleSize, safetyMode, animationEnabled, layout: overrideLayout, layoutApi, simulationRunning }) {
  const defaultLayout = useConfiguration(mode);
  const layout = overrideLayout || defaultLayout;
  const effectiveLayout = layoutApi ? layoutApi.layout : layout;

  const collisionNormalRef = useRef(null);

  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [ghostPos, setGhostPos] = useState(null);
  const [ghostValid, setGhostValid] = useState(true);
  // Simulation state
  const [beaglePos, setBeaglePos] = useState([0, 0, 0]);
  const [beagleRotY, setBeagleRotY] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [holdTimer, setHoldTimer] = useState(0);
  const [speed, setSpeed] = useState(12);
  const simRef = useRef({ running: false, stuckTimer: 0 }); // inches per second

  const gridSize = 0.25; // inches (finer grid)
  const ROTATION_STEP = 45; // degrees
  const NUDGE_STEP = 0.25; // inches
  const MAT_SURFACE = 2.3; // top surface height of the floor mat
  // effective beagle length: shorter by 4 inches for the actor (make a bit shorter)
  const effectiveBeagleLength = Math.max(12, (beagleSize.length || 24) - 4);
  // Pen bounds (match Playpen PEN_SIZE=50) - leave a small margin
  const PEN_HALF = 24.5;

  function handleItemPointerDown(e, itemId) {
    if (!layoutApi) return;
    e.stopPropagation();
    setSelectedId(itemId);
    setDragging(true);
  }

  function handleFloorMove(e) {
    if (!layoutApi) return;
    const point = e.point;
    const candidate = [point.x, 0, point.z];
    setGhostPos(candidate);

    // If we are placing an item from the palette, always update that item
    if (layoutApi.placingId) {
      const all = [...(layoutApi.layout.beds || []), ...(layoutApi.layout.bowls || []), ...(layoutApi.layout.pads || [])];
      const it = all.find((i) => i._id === layoutApi.placingId);
      if (!it) return;
      const snapped = snapToGrid(candidate, gridSize);
      const he = halfExtentsForItem(it);
      const clamped = clampToPen(snapped, he);
      const overlap = isOverlappingAny(layoutApi.layout, it, clamped, { excludeId: layoutApi.placingId });
      if (!overlap) {
        setGhostValid(true);
        layoutApi.setItemPosition(layoutApi.placingId, clamped);
      } else {
        // attempt nearest non-overlapping snap
        const alt = findNonOverlappingPosition(layoutApi.layout, it, clamped, { gridSize, maxRadius: 24, excludeId: layoutApi.placingId });
        if (alt) {
          setGhostValid(true);
          layoutApi.setItemPosition(layoutApi.placingId, alt);
        } else {
          setGhostValid(false);
        }
      }
      return;
    }

    // Otherwise, handle dragging of existing selected item
    if (dragging && selectedId) {
      const all = [...(layoutApi.layout.beds || []), ...(layoutApi.layout.bowls || []), ...(layoutApi.layout.pads || [])];
      const it = all.find((i) => i._id === selectedId);
      if (!it) return;
      const snapped = snapToGrid(candidate, gridSize);
      const he = halfExtentsForItem(it);
      const clamped = clampToPen(snapped, he);
      const overlap = isOverlappingAny(layoutApi.layout, it, clamped, { excludeId: selectedId });
      if (!overlap) {
        setGhostValid(true);
        layoutApi.setItemPosition(selectedId, clamped);
      } else {
        const alt = findNonOverlappingPosition(layoutApi.layout, it, clamped, { gridSize, maxRadius: 12, excludeId: selectedId });
        if (alt) {
          setGhostValid(true);
          layoutApi.setItemPosition(selectedId, alt);
        } else {
          setGhostValid(false);
        }
      }
    }
  }

  function handleFloorDown(e) {
    if (!layoutApi) return;
    e.stopPropagation();
    const point = e.point;
    const clicked = [point.x, 0, point.z];
    // If a drag-from-palette placement is happening, finalize it here
    if (layoutApi.placingId) {
      const snapped = snapToGrid(clicked, gridSize);
      const all = [...(layoutApi.layout.beds || []), ...(layoutApi.layout.bowls || []), ...(layoutApi.layout.pads || [])];
      const it = all.find((i) => i._id === layoutApi.placingId);
      if (it) {
        const he = halfExtentsForItem(it);
        const clamped = clampToPen(snapped, he);
        const overlap = isOverlappingAny(layoutApi.layout, it, clamped, { excludeId: layoutApi.placingId });
        if (!overlap) {
          layoutApi.setItemPosition(layoutApi.placingId, clamped);
        } else {
          const alt = findNonOverlappingPosition(layoutApi.layout, it, clamped, { gridSize, maxRadius: 24, excludeId: layoutApi.placingId });
          if (alt) layoutApi.setItemPosition(layoutApi.placingId, alt);
        }
      }
      // finalize placement
      layoutApi.setPlacingId(null);
      setSelectedId(null);
      setDragging(false);
      return;
    }

    setSelectedId(null);
    setDragging(false);
  }

  function handleFloorUp(e) {
    if (!layoutApi) return;
    e.stopPropagation();
    // If we were placing from palette and released without dropping, finalize
    if (layoutApi.placingId) {
      layoutApi.setPlacingId(null);
    }
    setDragging(false);
    setSelectedId(null);
  }

  // Build navigation targets: perimeter loop + beds (bowls intentionally excluded)
  const navTargets = useMemo(() => {
    const list = [];
    try {
      const beds = (effectiveLayout?.beds || []).filter(b => b && b.position);
      const circleMargin = Math.max(3, Math.min(8, effectiveBeagleLength * 0.18));
      list.push([0, 0, PEN_HALF - 2]); // rear-center target
      const perimeter = [
        [-PEN_HALF + circleMargin, 0, PEN_HALF - circleMargin], // rear-left
        [-PEN_HALF + circleMargin, 0, -PEN_HALF + circleMargin], // front-left
        [PEN_HALF - circleMargin, 0, -PEN_HALF + circleMargin], // front-right
        [PEN_HALF - circleMargin, 0, PEN_HALF - circleMargin] // rear-right
      ];
      list.push(...perimeter);
      for (const bed of beds) {
        list.push([bed.position[0], 0, bed.position[2]]);
      }
    } catch (e) {}
    return list;
  }, [effectiveLayout, effectiveBeagleLength]);

  // Simple navigation loop when simulation is enabled (controlled via global prop on layoutApi if present)
  useFrame((state, delta) => {
    const running = typeof simulationRunning !== 'undefined'
      ? simulationRunning
      : ((layoutApi && !!layoutApi.simulationRunning) || !!animationEnabled);
    if (!running) return;
    simRef.current.running = true;
    if (!navTargets || !navTargets.length) return;

    // initialize beagle pos at the entrance if still at origin
    if (beaglePos[0] === 0 && beaglePos[2] === 0) {
      const outsideX = -PEN_HALF - OUTSIDE_START_OFFSET; // start outside the door
      setBeaglePos([outsideX, MAT_SURFACE, 0]);
    }

    const tgt = navTargets[targetIndex % navTargets.length];
    if (!tgt) return;

    // desired velocity toward target
    const toTgtX = tgt[0] - beaglePos[0];
    const toTgtZ = tgt[2] - beaglePos[2];
    const toDist = Math.hypot(toTgtX, toTgtZ);
    if (toDist < 1.0) {
      setHoldTimer((ht) => {
        const next = ht + delta;
        if (next > 1.0) {
          setTargetIndex((i) => (i + 1) % Math.max(1, navTargets.length));
          return 0;
        }
        return next;
      });
      return;
    }

    const desiredVX = (toTgtX / toDist) * speed;
    const desiredVZ = (toTgtZ / toDist) * speed;

    // obstacle avoidance: avoid bowl stands (treated as solid obstacles)
    const obstacles = (effectiveLayout.bowls || []).filter(b => b && b.position);
    let avoidX = 0, avoidZ = 0;
    const dogRadius = Math.max(4, effectiveBeagleLength * 0.18); // ~4-6 inches radius
    const noseBuffer = Math.max(5, dogRadius * 1.5);
    // approximate body/head radii for clamping and extents
    const bodyRadiusLocal = Math.max(3, effectiveBeagleLength * 0.16);
    const headRadiusLocal = bodyRadiusLocal * 0.6;
    const actorExtent = Math.max(dogRadius, bodyRadiusLocal, headRadiusLocal, effectiveBeagleLength * 0.25);
    for (const ob of obstacles) {
      const he = halfExtentsForItem(ob);
      const ox = ob.position[0];
      const oz = ob.position[2];
      const dx = beaglePos[0] - ox;
      const dz = beaglePos[2] - oz;
      const dist = Math.hypot(dx, dz);
      const clearance = Math.max(he.hw, he.hd) + noseBuffer; // wider nose buffer keeps the snout away from corners
      if (dist < clearance && dist > 0.001) {
        const push = (clearance - dist) / clearance; // 0..1
        avoidX += (dx / dist) * push * speed * 1.8;
        avoidZ += (dz / dist) * push * speed * 1.8;
      }
    }

    // combine desired + avoidance
    let vx = desiredVX + avoidX;
    let vz = desiredVZ + avoidZ;
    const vmag = Math.hypot(vx, vz);
    if (vmag > 0.001) {
      vx = (vx / vmag) * Math.min(vmag, speed);
      vz = (vz / vmag) * Math.min(vmag, speed);
    }

    // step by delta
    const stepX = vx * delta;
    const stepZ = vz * delta;

    // predictive collision with bowls: if next position overlaps a bowl, slide around
    let nextX = beaglePos[0] + stepX;
    let nextZ = beaglePos[2] + stepZ;
    for (const ob of obstacles) {
      const he = halfExtentsForItem(ob);
      const ox = ob.position[0];
      const oz = ob.position[2];
      const dx = nextX - ox;
      const dz = nextZ - oz;
      const dist = Math.hypot(dx, dz);
      const clearance = Math.max(he.hw, he.hd) + dogRadius + 0.5;
      if (dist < clearance && dist > 0.001) {
        // push perpendicular to approach to slide
        const awayX = (dx / dist) * (clearance - dist);
        const awayZ = (dz / dist) * (clearance - dist);
        nextX += awayX;
        nextZ += awayZ;
      }
    }

    // Prevent leaving the pen or phasing through walls: clamp to interior bounds using actor extent
    const clampMargin = Math.min(noseBuffer * 0.4, 5);
    const clampMin = -PEN_HALF + actorExtent + clampMargin;
    const clampMax = PEN_HALF - actorExtent - clampMargin;
    nextX = Math.max(clampMin, Math.min(clampMax, nextX));
    nextZ = Math.max(clampMin, Math.min(clampMax, nextZ));

    const collision = collisionNormalRef.current;
    if (collision && Math.abs(collision.y) < 0.8) {
      const push = Math.min(speed * 0.1, 0.5);
      nextX += collision.x * push;
      nextZ += collision.z * push;
      collisionNormalRef.current = null;
    }

    // adjust vertical position if walking onto a bed
    let nextY = beaglePos[1];
    const beds = (effectiveLayout.beds || []).filter(b => b && b.position);
    let onBed = false;
    for (const bed of beds) {
      const he = halfExtentsForItem(bed);
      const bx = bed.position[0];
      const bz = bed.position[2];
      if (Math.abs(nextX - bx) < he.hw && Math.abs(nextZ - bz) < he.hd) {
        onBed = true;
        const bedTop = (bed.type === 'full') ? 8 : 3; // full bed ~8", pad bed ~3"
        // Reduce how high the actor is placed on the bed to avoid excessive lift.
        const bedOffset = Math.max(0.5, dogRadius * 0.25);
        nextY = bedTop + bedOffset;
        break;
      }
    }

    // floor default height (place on top of mat)
    if (!onBed) nextY = MAT_SURFACE;

    // compute heading angle and a small lean based on turning rate
    const ang = Math.atan2(vx, vz) * 180 / Math.PI;
    const prevAng = simRef.current.prevAng || ang;
    let dAng = ang - prevAng;
    dAng = ((dAng + 180) % 360) - 180; // normalize to [-180,180]
    // lean in degrees (clamped), scaled from angular change
    const leanDeg = Math.max(-25, Math.min(25, dAng * 0.35));
    const leanRad = leanDeg * Math.PI / 180;

    // gait/bob and bending to make motion more dog-like
    const time = state.clock.getElapsedTime();
    const speedFactor = Math.min(1, speed / 12);
    const gaitFreq = 3.5 + speedFactor * 1.5;
    const gaitAmp = 0.6 * speedFactor; // vertical bob amplitude (inches)
    const bob = Math.sin(time * gaitFreq * 2) * gaitAmp;
    // small fore-aft pitch when turning or accelerating
    const bend = Math.max(-0.25, Math.min(0.25, (dAng * Math.PI / 180) * 0.08));

    simRef.current.bob = bob;
    simRef.current.bend = bend;

    // detect if we're not making progress (stuck in corner) and attempt to nudge
    const movedDistance = Math.hypot(nextX - beaglePos[0], nextZ - beaglePos[2]);
    if (movedDistance < 0.05) {
      simRef.current.stuckTimer = (simRef.current.stuckTimer || 0) + delta;
    } else {
      simRef.current.stuckTimer = 0;
    }
    if (simRef.current.stuckTimer > 0.6) {
      // advance to next nav target and push toward pen center to escape corner
      setTargetIndex((i) => (i + 1) % Math.max(1, navTargets.length));
      nextX += (0 - nextX) * 0.2;
      nextZ += (0 - nextZ) * 0.2;
      simRef.current.stuckTimer = 0;
    }

    setBeaglePos(([x,y,z]) => [nextX, y + (nextY - y) * 0.18, nextZ]);
    setBeagleRotY(ang);
    simRef.current.prevAng = ang;
    simRef.current.currentLean = leanRad;
  });

  const renderBed = (bed, index) => (
    <Bed
      key={bed._id || `bed-${index}`}
      position={bed.position}
      type={bed.type}
      safetyMode={safetyMode}
      onPointerDown={(e) => handleItemPointerDown(e, bed._id)}
      rotationY={typeof bed.rotationY === 'number' ? bed.rotationY : 0}
    />
  );

  const renderBowl = (bowl, index) => (
    <BowlStand
      key={bowl._id || `bowl-${index}`}
      position={bowl.position}
      height={bowl.height}
      animationEnabled={animationEnabled && index === 1}
      safetyMode={safetyMode}
      onPointerDown={(e) => handleItemPointerDown(e, bowl._id)}
      rotationY={(function() {
        try {
          // Prefer stored rotation if provided (allow manual rotate). Fall back to auto-facing nearest bed.
          if (typeof bowl.rotationY === 'number') return bowl.rotationY;
          const beds = (effectiveLayout.beds || []).filter(b => b && b.position);
          if (!beds.length) return 0;
          let nearest = beds[0];
          let best = Infinity;
          for (const b of beds) {
            const dx = b.position[0] - bowl.position[0];
            const dz = b.position[2] - bowl.position[2];
            const d = Math.hypot(dx, dz);
            if (d < best) { best = d; nearest = b; }
          }
          const dx = nearest.position[0] - bowl.position[0];
          const dz = nearest.position[2] - bowl.position[2];
          const ang = Math.atan2(dx, dz) * 180 / Math.PI;
          return ang;
        } catch (e) { return 0; }
      })()}
    />
  );

  const renderPad = (pad, index) => (
    <PeePad
      key={pad._id || `pad-${index}`}
      position={pad.position}
      type={pad.type}
      safetyMode={safetyMode}
      onPointerDown={(e) => handleItemPointerDown(e, pad._id)}
      rotationY={typeof pad.rotationY === 'number' ? pad.rotationY : 0}
    />
  );

  const ghostItem = (() => {
    if (!layoutApi) return null;
    if (selectedId) {
      const all = [...(layoutApi.layout.beds || []), ...(layoutApi.layout.bowls || []), ...(layoutApi.layout.pads || [])];
      return all.find((i) => i._id === selectedId) || null;
    }
    const all = [...(layoutApi.layout.beds || []), ...(layoutApi.layout.bowls || []), ...(layoutApi.layout.pads || [])];
    return all.find((i) => !i.position) || null;
  })();

  // Keyboard controls: arrow keys to nudge selected item, R to rotate, Delete/Backspace to remove
  useEffect(() => {
    if (!layoutApi) return;
    const onKey = (e) => {
      // If placing a new item, Delete cancels it
      if ((e.key === 'Delete' || e.key === 'Backspace') && layoutApi.placingId) {
        e.preventDefault();
        try { layoutApi.removeItem(layoutApi.placingId); } catch (err) {}
        layoutApi.setPlacingId && layoutApi.setPlacingId(null);
        setSelectedId(null);
        setDragging(false);
        return;
      }

      // If no selected item, nothing more to do
      if (!selectedId) return;

      const all = [...(layoutApi.layout.beds || []), ...(layoutApi.layout.bowls || []), ...(layoutApi.layout.pads || [])];
      const it = all.find((i) => i._id === selectedId);
      if (!it) return;
      // Allow delete of selected even if unplaced
      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        try { layoutApi.removeItem(selectedId); } catch (err) {}
        setSelectedId(null);
        setDragging(false);
        return;
      }

      if (!it.position) return;

      let [x, y, z] = it.position;
      let moved = false;
      if (e.key === 'ArrowUp') { z -= NUDGE_STEP; moved = true; e.preventDefault(); }
      if (e.key === 'ArrowDown') { z += NUDGE_STEP; moved = true; e.preventDefault(); }
      if (e.key === 'ArrowLeft') { x -= NUDGE_STEP; moved = true; e.preventDefault(); }
      if (e.key === 'ArrowRight') { x += NUDGE_STEP; moved = true; e.preventDefault(); }

      if (e.key === 'r' || e.key === 'R') {
        const cur = it.rotationY || 0;
        const next = (cur + ROTATION_STEP) % 360;
        layoutApi.setItemRotation && layoutApi.setItemRotation(selectedId, next);
        return;
      }

      if (moved) {
        const candidate = snapToGrid([x, y, z], gridSize);
        const he = halfExtentsForItem(it);
        const clamped = clampToPen(candidate, he);
        const overlap = isOverlappingAny(layoutApi.layout, it, clamped, { excludeId: selectedId });
        if (!overlap) {
          layoutApi.setItemPosition(selectedId, clamped);
        } else {
          const alt = findNonOverlappingPosition(layoutApi.layout, it, clamped, { gridSize, maxRadius: 12, excludeId: selectedId });
          if (alt) layoutApi.setItemPosition(selectedId, alt);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [layoutApi, selectedId]);

  return (
    <group>
      {/* Playpen enclosure */}
      <Playpen safetyMode={safetyMode} />

          {/* Beds based on configuration (only render placed items) */}
          {effectiveLayout.beds && effectiveLayout.beds.filter((b) => b && b.position).map((bed, index) => (
            renderBed(bed, index)
          ))}

      {/* Bowl stands (only render placed items) */}
      {effectiveLayout.bowls && effectiveLayout.bowls.filter((b) => b && b.position).map((bowl, index) => (
        renderBowl(bowl, index)
      ))}

      {/* Pee pads (only render placed items) */}
      {effectiveLayout.pads && effectiveLayout.pads.filter((p) => p && p.position).map((pad, index) => (
        renderPad(pad, index)
      ))}

      {/* Invisible floor for pointer interactions (only active in design mode) */}
      {layoutApi && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          onPointerMove={handleFloorMove}
          onPointerDown={handleFloorDown}
          onPointerUp={handleFloorUp}
        >
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#000" transparent opacity={0} />
        </mesh>
      )}

      {/* Ghost preview */}
      {ghostPos && ghostItem && (
        (() => {
          const he = halfExtentsForItem(ghostItem);
          const w = he.hw * 2;
          const d = he.hd * 2;
          const y = 2.3 + 1; // approximate surface + small height
          return (
            <mesh position={[ghostPos[0], y, ghostPos[2]]} raycast={() => null}>
                    <boxGeometry args={[w, 2, d]} />
              <meshStandardMaterial color={ghostValid ? 'green' : 'red'} transparent opacity={0.35} />
            </mesh>
          );
        })()
      )}
      {/* Simulated beagle actor - articulated skeleton with simple IK */}
      {simulationRunning && (
        <>
          <ScenePhysics
            beaglePos={beaglePos}
            dogRadius={Math.max(4, effectiveBeagleLength * 0.18)}
            layout={effectiveLayout}
            matSurface={MAT_SURFACE}
            onCollision={(normal) => {
              if (normal) collisionNormalRef.current = normal;
            }}
          />
          <Suspense fallback={null}>
            <DogSkeleton
              position={beaglePos}
              rotationY={beagleRotY}
              length={Math.max(12, effectiveBeagleLength)}
              bodyRadius={Math.max(3, effectiveBeagleLength * 0.16)}
              beds={effectiveLayout.beds}
              matSurfaceHeight={MAT_SURFACE}
              speed={speed}
              modelPath={REALISTIC_MODEL_PATH}
              realisticTexturePaths={REALISTIC_TEXTURE_PATHS}
            />
          </Suspense>
        </>
      )}
    </group>
  );
}

function StaticCollider({ position, width, depth, height, matSurface, metadata }) {
  if (!position) return null;
  const [ref] = useBox(() => ({
    args: [width / 2, height / 2, depth / 2],
    position: [position[0], matSurface + height / 2, position[2]],
    type: 'Static'
  }));
  useEffect(() => {
    if (ref.current) {
      ref.current.userData = metadata;
    }
  }, [ref, metadata]);
  return <mesh ref={ref} visible={false} />;
}

function ScenePhysics({ beaglePos, dogRadius, layout, matSurface, onCollision }) {
  const [ref, api] = useSphere(() => ({
    args: [dogRadius],
    type: 'Kinematic',
    position: [beaglePos[0], beaglePos[1], beaglePos[2]],
    onCollide: (event) => {
      const normal = event.contact?.ni;
      if (!normal) return;
      if (Math.abs(normal.y) < 0.8) {
        onCollision && onCollision({ x: normal.x, y: normal.y, z: normal.z });
      }
    }
  }));

  useFrame(() => {
    if (!api) return;
    api.position.set(beaglePos[0], beaglePos[1], beaglePos[2]);
    api.velocity.set(0, 0, 0);
  });

  const beds = layout?.beds || [];
  const bowls = layout?.bowls || [];

  return (
    <>
      <mesh ref={ref} visible={false} />
      {beds.map((bed, index) => {
        const dims = BED_DIMENSIONS[bed.type] || BED_DIMENSIONS.pad;
        return (
          <StaticCollider
            key={bed._id || `bed-collider-${index}`}
            position={bed.position}
            width={dims.width}
            depth={dims.depth}
            height={dims.height}
            matSurface={matSurface}
            metadata={{ surfaceHeight: matSurface + dims.height, object: 'bed' }}
          />
        );
      })}
      {bowls.map((bowl, index) => (
        <StaticCollider
          key={bowl._id || `bowl-collider-${index}`}
          position={bowl.position}
          width={BOWL_DIMENSIONS.width}
          depth={BOWL_DIMENSIONS.depth}
          height={(bowl.height || 5)}
          matSurface={matSurface}
          metadata={{ isObstacle: true, object: 'bowl' }}
        />
      ))}
    </>
  );
}
