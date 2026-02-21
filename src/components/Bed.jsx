import { useRef, useState } from 'react';
import { RoundedBox } from '@react-three/drei';
import { MeasurementTooltip } from './MeasurementTooltip';

export default function Bed({ position, type, safetyMode, onPointerDown, rotationY = 0 }) {
  const bedRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [hoveredPart, setHoveredPart] = useState(null);
  
  // Heights based on actual measurements - ALL items stack on mat surface
  const PEN_FLOOR_HEIGHT = 1;
  const MAT_THICKNESS = 1.3;
  const MAT_SURFACE_HEIGHT = PEN_FLOOR_HEIGHT + MAT_THICKNESS; // 2.3"
  
  // Full bed realistic structure dimensions
  const FULL_BED_OUTER_WIDTH = 29;
  const FULL_BED_OUTER_DEPTH = 18;
  const FULL_BED_TOTAL_HEIGHT = 8;
  const BOLSTER_WALL_THICKNESS = 2; // Thickness of bolster walls
  const INTERIOR_WIDTH = 25; // Interior sleeping area
  const INTERIOR_DEPTH = 14;
  const INTERIOR_CUSHION_HEIGHT = 3; // Interior cushion thickness (3" pad)
  
  // Simple pad dimensions
  const PAD_HEIGHT = 3;
  
  const isFullBed = type === 'full';
  const height = isFullBed ? FULL_BED_TOTAL_HEIGHT : PAD_HEIGHT;
  const width = isFullBed ? FULL_BED_OUTER_WIDTH : INTERIOR_WIDTH;
  const depth = isFullBed ? FULL_BED_OUTER_DEPTH : INTERIOR_DEPTH;
  
  // Position adjusted - beds sit ON the mat surface, not floating
  const adjustedPosition = [
    position[0],
    MAT_SURFACE_HEIGHT + height / 2,
    position[2]
  ];

  const dimensions = isFullBed 
    ? `Outer: 29" × 18" × 8"
Interior: 25" × 14" × 3"`
    : `25" × 14" × 3" (Interior Pad Only)`;
  
  // Positioning calculations for full bed components
  // Group center is at height/2, so bottom is at -height/2 = -4"
  const bottomOffset = -height / 2; // -4" for full bed
  const cushionCenter = bottomOffset + INTERIOR_CUSHION_HEIGHT / 2; // -4 + 1.5 = -2.5

  return (
    <group ref={bedRef} position={adjustedPosition} rotation={[0, rotationY * Math.PI / 180, 0]} onPointerDown={(e) => { e.stopPropagation(); onPointerDown && onPointerDown(e); }}>
      {hovered && !hoveredPart && (
        <MeasurementTooltip
          visible={true}
          position={[0, height / 2 + 3, 0]}
          dimensions={dimensions}
          title="Memory Foam Bed"
        />
      )}
      
      {isFullBed ? (
        <>
          {/* Unified Bolster Structure - North Wall (Blue) */}
          {hoveredPart === 'north' && (
            <MeasurementTooltip
              visible={true}
              position={[0, 5, FULL_BED_OUTER_DEPTH / 2]}
              dimensions={`29" wide × 8" tall × 2" thick`}
              title="North Bolster Wall"
            />
          )}
          <RoundedBox
            args={[FULL_BED_OUTER_WIDTH, FULL_BED_TOTAL_HEIGHT, BOLSTER_WALL_THICKNESS]}
            radius={0.8}
            smoothness={4}
            position={[0, 0, FULL_BED_OUTER_DEPTH / 2 - BOLSTER_WALL_THICKNESS / 2]}
            castShadow
            receiveShadow
            onPointerEnter={() => { setHovered(true); setHoveredPart('north'); }}
            onPointerLeave={() => { setHovered(false); setHoveredPart(null); }}
          >
            <meshStandardMaterial 
              color={safetyMode ? "#64748b" : "#475569"}
              roughness={0.8}
              metalness={0.1}
            />
          </RoundedBox>
          
          {/* Unified Bolster Structure - South Wall (Green) */}
          {hoveredPart === 'south' && (
            <MeasurementTooltip
              visible={true}
              position={[0, 5, -(FULL_BED_OUTER_DEPTH / 2)]}
              dimensions={`29" wide × 8" tall × 2" thick`}
              title="South Bolster Wall"
            />
          )}
          <RoundedBox
            args={[FULL_BED_OUTER_WIDTH, FULL_BED_TOTAL_HEIGHT, BOLSTER_WALL_THICKNESS]}
            radius={0.8}
            smoothness={4}
            position={[0, 0, -(FULL_BED_OUTER_DEPTH / 2 - BOLSTER_WALL_THICKNESS / 2)]}
            castShadow
            receiveShadow
            onPointerEnter={() => { setHovered(true); setHoveredPart('south'); }}
            onPointerLeave={() => { setHovered(false); setHoveredPart(null); }}
          >
            <meshStandardMaterial 
              color={safetyMode ? "#64748b" : "#475569"}
              roughness={0.8}
              metalness={0.1}
            />
          </RoundedBox>
          
          {/* Unified Bolster Structure - East Wall (Red) */}
          {hoveredPart === 'east' && (
            <MeasurementTooltip
              visible={true}
              position={[FULL_BED_OUTER_WIDTH / 2, 5, 0]}
              dimensions={`2" thick × 8" tall × 14" deep`}
              title="East Bolster Wall"
            />
          )}
          <RoundedBox
            args={[BOLSTER_WALL_THICKNESS, FULL_BED_TOTAL_HEIGHT, INTERIOR_DEPTH]}
            radius={0.8}
            smoothness={4}
            position={[FULL_BED_OUTER_WIDTH / 2 - BOLSTER_WALL_THICKNESS / 2, 0, 0]}
            castShadow
            receiveShadow
            onPointerEnter={() => { setHovered(true); setHoveredPart('east'); }}
            onPointerLeave={() => { setHovered(false); setHoveredPart(null); }}
          >
            <meshStandardMaterial 
              color={safetyMode ? "#64748b" : "#475569"}
              roughness={0.8}
              metalness={0.1}
            />
          </RoundedBox>
          
          {/* Unified Bolster Structure - West Wall (Orange) */}
          {hoveredPart === 'west' && (
            <MeasurementTooltip
              visible={true}
              position={[-(FULL_BED_OUTER_WIDTH / 2), 5, 0]}
              dimensions={`2" thick × 8" tall × 14" deep`}
              title="West Bolster Wall"
            />
          )}
          <RoundedBox
            args={[BOLSTER_WALL_THICKNESS, FULL_BED_TOTAL_HEIGHT, INTERIOR_DEPTH]}
            radius={0.8}
            smoothness={4}
            position={[-(FULL_BED_OUTER_WIDTH / 2 - BOLSTER_WALL_THICKNESS / 2), 0, 0]}
            castShadow
            receiveShadow
            onPointerEnter={() => { setHovered(true); setHoveredPart('west'); }}
            onPointerLeave={() => { setHovered(false); setHoveredPart(null); }}
          >
            <meshStandardMaterial 
              color={safetyMode ? "#64748b" : "#475569"}
              roughness={0.8}
              metalness={0.1}
            />
          </RoundedBox>
          
          {/* Interior Sleeping Cushion (25" × 14" × 3") - sits at bottom with bolster */}
          {hoveredPart === 'cushion' && (
            <MeasurementTooltip
              visible={true}
              position={[0, 2, 0]}
              dimensions={`25" wide × 3" tall × 14" deep`}
              title="Interior Sleeping Cushion"
            />
          )}
          <RoundedBox
            args={[INTERIOR_WIDTH, INTERIOR_CUSHION_HEIGHT, INTERIOR_DEPTH]}
            radius={0.5}
            smoothness={4}
            position={[0, cushionCenter, 0]}
            receiveShadow
            onPointerEnter={() => { setHovered(true); setHoveredPart('cushion'); }}
            onPointerLeave={() => { setHovered(false); setHoveredPart(null); }}
          >
            <meshStandardMaterial 
              color="#d1d5db"
              roughness={0.9}
              metalness={0}
            />
          </RoundedBox>
        </>
      ) : (
        // Interior pad only (flat) - 25" × 14" × 3"
        <RoundedBox
          args={[width, height, depth]}
          radius={0.5}
          smoothness={4}
          castShadow
          receiveShadow
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <meshStandardMaterial 
            color={safetyMode ? "#cbd5e1" : "#94a3b8"}
            roughness={0.9}
            metalness={0}
          />
        </RoundedBox>
      )}
    </group>
  );
}
