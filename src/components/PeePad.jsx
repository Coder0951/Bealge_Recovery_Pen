export default function PeePad({ position, type, safetyMode, onPointerDown, rotationY = 0 }) {
  const PEN_FLOOR_HEIGHT = 1;
  const MAT_THICKNESS = 1.3;
  const MAT_SURFACE_HEIGHT = PEN_FLOOR_HEIGHT + MAT_THICKNESS; // 2.3"
  const isWashable = type === 'washable';
  const size = isWashable ? 36 : 22;
  const thickness = 0.2;
  
  // Pee pads lay flat ON the mat surface
  const adjustedPosition = [position[0], MAT_SURFACE_HEIGHT + thickness / 2, position[2]];

  return (
    <mesh position={adjustedPosition} rotation={[0, rotationY * Math.PI / 180, 0]} receiveShadow onPointerDown={(e) => { e.stopPropagation(); onPointerDown && onPointerDown(e); }}>
      <boxGeometry args={[size, thickness, size]} />
      <meshStandardMaterial 
        color={safetyMode ? "#0ea5e9" : isWashable ? "#38bdf8" : "#fbbf24"}
        roughness={0.7}
        metalness={0}
      />
    </mesh>
  );
}
