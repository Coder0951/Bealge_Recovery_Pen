import { useState, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import Playpen from './Playpen';
import Bed from './Bed';
import BowlStand from './BowlStand';
import PeePad from './PeePad';
import { useConfiguration } from '../hooks/useConfiguration';
import { isOverlappingAny, snapToGrid, halfExtentsForItem, clampToPen, findNonOverlappingPosition } from '../utils/collision';

export default function Scene({ mode, beagleSize, safetyMode, animationEnabled, layout: overrideLayout, layoutApi, simulationRunning }) {
  const defaultLayout = useConfiguration(mode);
  const layout = overrideLayout || defaultLayout;
  const effectiveLayout = layoutApi ? layoutApi.layout : layout;

  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [ghostPos, setGhostPos] = useState(null);
  const [ghostValid, setGhostValid] = useState(true);
  // Simulation state
  const [beaglePos, setBeaglePos] = useState([0, 0, 0]);
  const [beagleRotY, setBeagleRotY] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [holdTimer, setHoldTimer] = useState(0);
  const simRef = useRef({ running: false, speed: 12 }); // inches per second

  const gridSize = 0.25; // inches (finer grid)
  const ROTATION_STEP = 45; // degrees
  const NUDGE_STEP = 0.25; // inches

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

  // Build navigation targets from layout (bed -> bowls -> pads)
  const navTargets = useMemo(() => {
    const list = [];
    try {
      // Prefer the editable/effective layout; if it's empty (design mode cleared), fall back to preset
      const sourceLayout = (effectiveLayout && ((effectiveLayout.beds||[]).length || (effectiveLayout.bowls||[]).length || (effectiveLayout.pads||[]).length))
        ? effectiveLayout
        : (layout || {});
      const beds = (sourceLayout.beds || []).filter(b => b && b.position);
      const bowls = (sourceLayout.bowls || []).filter(b => b && b.position);
      const pads = (sourceLayout.pads || []).filter(p => p && p.position);
      if (beds.length) list.push(beds[0].position);
      for (const b of bowls) list.push(b.position);
      for (const p of pads) list.push(p.position);
      if (beds.length) list.push(beds[0].position);
    } catch (e) {}
    return list;
  }, [effectiveLayout]);

  // Simple navigation loop when simulation is enabled (controlled via global prop on layoutApi if present)
  useFrame((state, delta) => {
    const running = typeof simulationRunning !== 'undefined' ? simulationRunning : (layoutApi && !!layoutApi.simulationRunning);
    if (!running) return;
    simRef.current.running = true;
    const speed = simRef.current.speed;
    if (!navTargets || !navTargets.length) return;

    // initialize beagle pos to first bed if at origin
    if (beaglePos[0] === 0 && beaglePos[2] === 0) {
      const start = navTargets[0] || [0,0,0];
      setBeaglePos([start[0] - 6, 0.5, start[2]]);
    }

    const tgt = navTargets[targetIndex % navTargets.length];
    if (!tgt) return;
    const dx = tgt[0] - beaglePos[0];
    const dz = tgt[2] - beaglePos[2];
    const dist = Math.hypot(dx, dz);
    if (dist < 1.0) {
      // arrived, hold briefly then advance
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

    const vx = (dx / dist) * speed * delta;
    const vz = (dz / dist) * speed * delta;
    setBeaglePos(([x,y,z]) => [x + vx, y, z + vz]);
    const ang = Math.atan2(vx, vz) * 180 / Math.PI;
    setBeagleRotY(ang);
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
      {/* Simulated beagle actor */}
      {simulationRunning && (
        <group position={[beaglePos[0], beaglePos[1], beaglePos[2]]} rotation={[0, (beagleRotY || 0) * Math.PI / 180, 0]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <sphereGeometry args={[2.2, 16, 12]} />
            <meshStandardMaterial color="#c48b5c" />
          </mesh>
          <mesh position={[0, 1.8, 1.6]} castShadow>
            <sphereGeometry args={[0.9, 12, 8]} />
            <meshStandardMaterial color="#8b5a3c" />
          </mesh>
        </group>
      )}
    </group>
  );
}
