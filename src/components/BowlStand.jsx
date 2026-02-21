import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeasurementTooltip } from './MeasurementTooltip';

export default function BowlStand({ position, height, animationEnabled, safetyMode, onPointerDown, rotationY = 0 }) {
  const indicatorRef = useRef();
  const [hovered, setHovered] = useState(false);
  const PEN_FLOOR_HEIGHT = 1;
  const MAT_THICKNESS = 1.3;
  const MAT_SURFACE_HEIGHT = PEN_FLOOR_HEIGHT + MAT_THICKNESS; // 2.3"
  
  // Bowl stands sit ON the mat surface
  const standPosition = [position[0], MAT_SURFACE_HEIGHT, position[2]];
  const bowlPosition = [position[0], MAT_SURFACE_HEIGHT + height, position[2]];
  
  // Base dimensions
  const BASE_SIZE = 10; // 10" x 10" footprint
  const LEG_RADIUS = 0.25;
  const LEG_POSITIONS = [
    [-BASE_SIZE/2 * 0.7, BASE_SIZE/2 * 0.7],   // Front-left
    [BASE_SIZE/2 * 0.7, BASE_SIZE/2 * 0.7],    // Front-right
    [-BASE_SIZE/2 * 0.7, -BASE_SIZE/2 * 0.7],  // Back-left
    [BASE_SIZE/2 * 0.7, -BASE_SIZE/2 * 0.7]    // Back-right
  ];
  
  const BOWL_TILT = (15 * Math.PI) / 180; // 15 degrees in radians

  // Animated floating indicator
  useFrame((state) => {
    if (indicatorRef.current && animationEnabled) {
      indicatorRef.current.position.y = MAT_SURFACE_HEIGHT + height + 3 + Math.sin(state.clock.elapsedTime * 2) * 0.5;
    }
  });

  return (
    <group onPointerDown={(e) => { e.stopPropagation(); onPointerDown && onPointerDown(e); }}>
      {hovered && (
        <MeasurementTooltip
          visible={true}
          position={[position[0], MAT_SURFACE_HEIGHT + height + 5, position[2]]}
          dimensions={`8" dia × 2.5" depth | Height: ${height}" | Tilt: 15°`}
          title="Elevated Bowl Station"
        />
      )}
      
      {/* Stand base - simple X-shaped base */}
      <group position={standPosition}>
        {/* Four legs forming X pattern */}
        <mesh rotation={[0, 0, 0]} position={[0, 0.2, 0]} castShadow>
          {/* Create X-shaped base using a flat shape */}
          <boxGeometry args={[BASE_SIZE, 0.4, 2]} />
          <meshStandardMaterial 
            color={safetyMode ? "#f59e0b" : "#1f2937"}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
        
        <mesh rotation={[0, Math.PI/2, 0]} position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[BASE_SIZE, 0.4, 2]} />
          <meshStandardMaterial 
            color={safetyMode ? "#f59e0b" : "#1f2937"}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
        
        {/* Center hub */}
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[1.5, 1.5, 0.5, 16]} />
          <meshStandardMaterial 
            color={safetyMode ? "#f59e0b" : "#1f2937"}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
        
        {/* Center post */}
        <mesh position={[0, height / 2, 0]} castShadow>
          <cylinderGeometry args={[0.6, 0.8, height, 16]} />
          <meshStandardMaterial 
            color={safetyMode ? "#f59e0b" : "#1f2937"}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
      </group>

      {/* Stainless steel bowl with 15° tilt; allow yaw rotation so bowl can face nearest bed */}
      <group rotation={[0, rotationY * Math.PI / 180, 0]} position={bowlPosition}>
        <group rotation={[BOWL_TILT, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
          >
            <cylinderGeometry args={[4, 3.5, 2.5, 32]} />
            <meshStandardMaterial 
              color="#e5e7eb"
              roughness={0.2}
              metalness={0.8}
            />
          </mesh>

          {/* Colored rim to indicate forward tilt direction */}
          <mesh position={[0, 1.05, -0.6]} rotation={[0, 0, 0]}>
            <torusGeometry args={[3.9, 0.18, 16, 64]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} metalness={0.3} roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* Floating indicator (for water bowl) */}
      {animationEnabled && (
        <mesh ref={indicatorRef} position={[position[0], MAT_SURFACE_HEIGHT + height + 3, position[2]]}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial 
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}
    </group>
  );
}
