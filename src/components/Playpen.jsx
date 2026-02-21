import * as THREE from 'three';
import { Grid } from '@react-three/drei';

export default function Playpen({ safetyMode }) {
  const PEN_SIZE = 50;
  const WALL_HEIGHT = 27;
  const TUBE_RADIUS = 0.75; // Thin tubes (finger-width)
  const MAT_HEIGHT = 2.3;
  const PEN_FLOOR_HEIGHT = 1;
  const GAP_SIZE = 1.5;
  const GRID_SIZE = 200;

  return (
    <group>
      {/* Room floor grid outside the pen */}
      <Grid
        position={[0, -0.05, 0]}
        args={[GRID_SIZE, GRID_SIZE]}
        cellSize={6}
        cellThickness={0.6}
        cellColor="#e5e7eb"
        sectionSize={12}
        sectionThickness={1.2}
        sectionColor="#b0b5bd"
        fadeDistance={150}
        fadeStrength={1.5}
        infiniteGrid
        side={THREE.DoubleSide}
      />
      {/* Floor mat (Fengdulong 50x50x1.3) positioned 1.5" from door */}
      <mesh 
        position={[GAP_SIZE / 2, 1 + 1.3 / 2, 0]} 
        receiveShadow
      >
        <boxGeometry args={[PEN_SIZE - GAP_SIZE, 1.3, PEN_SIZE]} />
        <meshStandardMaterial 
          color="#f8b4d9"
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Exposed pen floor in entry gap zone */}
      <mesh 
        position={[-(PEN_SIZE / 2 - GAP_SIZE / 2), PEN_FLOOR_HEIGHT / 2, 0]} 
        receiveShadow
      >
        <boxGeometry args={[GAP_SIZE, PEN_FLOOR_HEIGHT, PEN_SIZE]} />
        <meshStandardMaterial 
          color={safetyMode ? "#ef4444" : "#6b7280"}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* Frame tubes - thin hollow pipes forming square perimeter */}
      {/* Bottom frame - 4 edges */}
      {/* Left and Right edges (parallel to Z axis) */}
      {[-PEN_SIZE/2, PEN_SIZE/2].map((x, i) => (
        <mesh key={`bottom-x-${i}`} position={[x, PEN_FLOOR_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, PEN_SIZE, 16]} />
          <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
      {/* Back and Front edges (parallel to X axis) */}
      {[-PEN_SIZE/2, PEN_SIZE/2].map((z, i) => (
        <mesh key={`bottom-z-${i}`} position={[0, PEN_FLOOR_HEIGHT, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, PEN_SIZE, 16]} />
          <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}

      {/* Top frame - 4 edges */}
      {/* Left and Right edges (parallel to Z axis) */}
      {[-PEN_SIZE/2, PEN_SIZE/2].map((x, i) => (
        <mesh key={`top-x-${i}`} position={[x, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, PEN_SIZE, 16]} />
          <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
      {/* Back and Front edges (parallel to X axis) */}
      {[-PEN_SIZE/2, PEN_SIZE/2].map((z, i) => (
        <mesh key={`top-z-${i}`} position={[0, WALL_HEIGHT, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, PEN_SIZE, 16]} />
          <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}

      {/* Vertical posts */}
      {[
        [-PEN_SIZE/2, -PEN_SIZE/2],
        [PEN_SIZE/2, -PEN_SIZE/2],
        [-PEN_SIZE/2, PEN_SIZE/2],
        [PEN_SIZE/2, PEN_SIZE/2]
      ].map(([x, z], i) => (
        <mesh key={`post-${i}`} position={[x, WALL_HEIGHT / 2, z]}>
          <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, WALL_HEIGHT, 16]} />
          <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}

      {/* Middle vertical posts - one per wall */}
      {/* Left wall middle post */}
      <mesh position={[-PEN_SIZE/2, WALL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, WALL_HEIGHT, 16]} />
        <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
      </mesh>
      
      {/* Right wall middle post */}
      <mesh position={[PEN_SIZE/2, WALL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, WALL_HEIGHT, 16]} />
        <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
      </mesh>
      
      {/* Back wall middle post */}
      <mesh position={[0, WALL_HEIGHT / 2, -PEN_SIZE/2]}>
        <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, WALL_HEIGHT, 16]} />
        <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
      </mesh>
      
      {/* Front wall middle post */}
      <mesh position={[0, WALL_HEIGHT / 2, PEN_SIZE/2]}>
        <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, WALL_HEIGHT, 16]} />
        <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Corner connectors - 3-way joints at each corner */}
      {[
        [-PEN_SIZE/2, PEN_FLOOR_HEIGHT, -PEN_SIZE/2],
        [PEN_SIZE/2, PEN_FLOOR_HEIGHT, -PEN_SIZE/2],
        [-PEN_SIZE/2, PEN_FLOOR_HEIGHT, PEN_SIZE/2],
        [PEN_SIZE/2, PEN_FLOOR_HEIGHT, PEN_SIZE/2],
        [-PEN_SIZE/2, WALL_HEIGHT, -PEN_SIZE/2],
        [PEN_SIZE/2, WALL_HEIGHT, -PEN_SIZE/2],
        [-PEN_SIZE/2, WALL_HEIGHT, PEN_SIZE/2],
        [PEN_SIZE/2, WALL_HEIGHT, PEN_SIZE/2]
      ].map(([x, y, z], i) => (
        <mesh key={`corner-connector-${i}`} position={[x, y, z]}>
          <sphereGeometry args={[TUBE_RADIUS * 1.5, 16, 16]} />
          <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
        </mesh>
      ))}

      {/* T-connectors at middle posts - top and bottom */}
      {/* Left wall middle connectors */}
      <mesh position={[-PEN_SIZE/2, PEN_FLOOR_HEIGHT, 0]}>
        <sphereGeometry args={[TUBE_RADIUS * 1.5, 16, 16]} />
        <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[-PEN_SIZE/2, WALL_HEIGHT, 0]}>
        <sphereGeometry args={[TUBE_RADIUS * 1.5, 16, 16]} />
        <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
      </mesh>
      
      {/* Right wall middle connectors */}
      <mesh position={[PEN_SIZE/2, PEN_FLOOR_HEIGHT, 0]}>
        <sphereGeometry args={[TUBE_RADIUS * 1.5, 16, 16]} />
        <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[PEN_SIZE/2, WALL_HEIGHT, 0]}>
        <sphereGeometry args={[TUBE_RADIUS * 1.5, 16, 16]} />
        <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
      </mesh>
      
      {/* Back wall middle connectors */}
      <mesh position={[0, PEN_FLOOR_HEIGHT, -PEN_SIZE/2]}>
        <sphereGeometry args={[TUBE_RADIUS * 1.5, 16, 16]} />
        <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT, -PEN_SIZE/2]}>
        <sphereGeometry args={[TUBE_RADIUS * 1.5, 16, 16]} />
        <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
      </mesh>
      
      {/* Front wall middle connectors */}
      <mesh position={[0, PEN_FLOOR_HEIGHT, PEN_SIZE/2]}>
        <sphereGeometry args={[TUBE_RADIUS * 1.5, 16, 16]} />
        <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT, PEN_SIZE/2]}>
        <sphereGeometry args={[TUBE_RADIUS * 1.5, 16, 16]} />
        <meshStandardMaterial color="#4b5563" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Mesh walls - semi-transparent - all four sides identical */}
      {/* Left wall */}
      <mesh position={[-PEN_SIZE/2, WALL_HEIGHT/2, 0]} rotation={[0, Math.PI/2, 0]}>
        <planeGeometry args={[PEN_SIZE - 4, WALL_HEIGHT - 4]} />
        <meshStandardMaterial 
          color="#9ca3af"
          transparent
          opacity={0.3}
          side={2}
        />
      </mesh>
      
      {/* Right wall */}
      <mesh position={[PEN_SIZE/2, WALL_HEIGHT/2, 0]} rotation={[0, Math.PI/2, 0]}>
        <planeGeometry args={[PEN_SIZE - 4, WALL_HEIGHT - 4]} />
        <meshStandardMaterial 
          color="#9ca3af"
          transparent
          opacity={0.3}
          side={2}
        />
      </mesh>
      
      {/* Back wall */}
      <mesh position={[0, WALL_HEIGHT/2, -PEN_SIZE/2]} rotation={[0, 0, 0]}>
        <planeGeometry args={[PEN_SIZE - 4, WALL_HEIGHT - 4]} />
        <meshStandardMaterial 
          color="#9ca3af"
          transparent
          opacity={0.3}
          side={2}
        />
      </mesh>
      
      {/* Front wall */}
      <mesh position={[0, WALL_HEIGHT/2, PEN_SIZE/2]} rotation={[0, 0, 0]}>
        <planeGeometry args={[PEN_SIZE - 4, WALL_HEIGHT - 4]} />
        <meshStandardMaterial 
          color="#9ca3af"
          transparent
          opacity={0.3}
          side={2}
        />
      </mesh>

        {/* Zipper door oval, clipped at bottom */}
        {/* Zipper door oval with Three.js clipping plane to hide bottom segment */}
        <mesh
          position={[PEN_SIZE / 4, (WALL_HEIGHT - 4) / 2 - 1, PEN_SIZE/2 - 0.01]}
          rotation={[0, 0, 0]}
          scale={[0.85, 1.1, 1]}
          material={new THREE.MeshStandardMaterial({
            color: '#f3f4f6',
            clippingPlanes: [
              new THREE.Plane(new THREE.Vector3(0, 1, 0), -(PEN_FLOOR_HEIGHT + TUBE_RADIUS))
            ],
            clipShadows: true
          })}
        >
          <torusGeometry args={[11.25, 0.3, 32, 64]} />
        </mesh>
    </group>
  );
}
