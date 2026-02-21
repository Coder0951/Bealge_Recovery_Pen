import { useState, useEffect } from 'react';
import Playpen from './Playpen';
import Bed from './Bed';
import BowlStand from './BowlStand';
import PeePad from './PeePad';
import { useConfiguration } from '../hooks/useConfiguration';
import { isOverlappingAny, snapToGrid, halfExtentsForItem, clampToPen, findNonOverlappingPosition } from '../utils/collision';

export default function Scene({ mode, beagleSize, safetyMode, animationEnabled, layout: overrideLayout, layoutApi }) {
  const defaultLayout = useConfiguration(mode);
  const layout = overrideLayout || defaultLayout;
  const effectiveLayout = layoutApi ? layoutApi.layout : layout;

  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [ghostPos, setGhostPos] = useState(null);
  const [ghostValid, setGhostValid] = useState(true);

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
    </group>
  );
}
