import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import FurShells from './FurShells';

function useTextureAsset(path) {
  const [texture, setTexture] = useState(null);
  useEffect(() => {
    if (!path) {
      setTexture(null);
      return undefined;
    }
    let active = true;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(
      path,
      (loaded) => {
        loaded.wrapS = THREE.RepeatWrapping;
        loaded.wrapT = THREE.RepeatWrapping;
        loaded.needsUpdate = true;
        if (active) setTexture(loaded);
      },
      undefined,
      () => {
        if (active) setTexture(null);
      }
    );
    return () => {
      active = false;
      tex.dispose();
      setTexture(null);
    };
  }, [path]);
  return texture;
}

export default function DogSkeleton({
  position = [0,0,0],
  rotationY = 0,
  length = 20,
  bodyRadius = 3,
  beds = [],
  matSurfaceHeight = 2.3,
  speed = 12,
  modelPath = '/assets/dog.glb',
  skeletonMode = false,
  bodyColor = '#c48b5c',
  pawColor = '#3b2a1a',
  noseColor = '#1b1b1b',
  eyeColor = '#000000',
  realisticTexturePaths = {}
}) {
  const groupRef = useRef();
  const bodyGroupRef = useRef();   // tilt pivot at hip-attachment line (local y=0 = hip world height)
  const bodyVisualRef = useRef();  // visual body geometry, offset up by bodyHeight/2 from pivot
  const headGroupRef = useRef();
  const legsRef = useRef([]);
  const pawRefs = useRef([]);
  const skelRefs = useRef({});
  const [gltf, setGltf] = useState(null);
  const [gltfError, setGltfError] = useState(false);
  const prevRot = useRef(rotationY || 0);
  const legGroupRefs = useRef([]);
  const legClimbProgress = useRef([0,0,0,0]);
  const hipSmoothY = useRef(null);
  const HEIGHT_OFFSET = 3; // inches to raise entire dog visually
  const albedoTexture = useTextureAsset(realisticTexturePaths.albedo);
  const normalTexture = useTextureAsset(realisticTexturePaths.normal);
  const roughnessTexture = useTextureAsset(realisticTexturePaths.roughness);
  const bodyGeometry = useMemo(
    () => new THREE.CylinderGeometry(bodyRadius * 0.85, bodyRadius * 1.0, length * 0.6, 16),
    [bodyRadius, length]
  );
  const headGeometry = useMemo(
    () => new THREE.SphereGeometry(bodyRadius * 0.45, 16, 12),
    [bodyRadius]
  );

  // safe non-suspending loader
  useEffect(() => {
    let mounted = true;
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (loaded) => { if (mounted) setGltf(loaded); },
      undefined,
      (err) => { console.warn('DogSkeleton: could not load model', modelPath, err); if (mounted) setGltfError(true); }
    );
    return () => { mounted = false; };
  }, [modelPath]);

  // leg local offsets relative to body center (x,z)
  const halfW = Math.max(bodyRadius * 0.6, length * 0.12);
  const halfL = Math.max(bodyRadius * 0.5, length * 0.18);
  const hipOffsets = [
    // front-left, front-right, rear-left, rear-right
    [-halfW, -halfL, 0],
    [halfW, -halfL, 0],
    [-halfW, halfL, 0],
    [halfW, halfL, 0]
  ];
  // approximate body and paw sizes
  const bodyHeight = bodyRadius * 2; // cylinder vertical extent
  const pawRadius = bodyRadius * 0.18;
  const legLength = Math.max(3, bodyRadius * 1.2); // fixed leg length (inches) - shortened by half

  function surfaceYAt(x, z) {
    try {
      for (const bed of beds || []) {
        if (!bed || !bed.position) continue;
        const he = bed._halfExtents || null;
        const hw = he ? he.hw : (bed.type === 'full' ? 14.5 : 12.5);
        const hd = he ? he.hd : (bed.type === 'full' ? 9 : 7);
        const bx = bed.position[0];
        const bz = bed.position[2];
        if (Math.abs(x - bx) < hw && Math.abs(z - bz) < hd) {
          const bedTop = (bed.type === 'full') ? 8 : 3;
          const innerMargin = Math.min(hw, hd) * 0.5;
          const insideInterior = Math.abs(x - bx) < Math.max(0, hw - innerMargin)
            && Math.abs(z - bz) < Math.max(0, hd - innerMargin);
          const bolsterSink = (bedTop > 5 && insideInterior) ? 5 : 0;
          // bedTop is height above the mat; return absolute surface Y
          return matSurfaceHeight + bedTop - bolsterSink + 0.05;
        }
      }
    } catch (e) {}
    return matSurfaceHeight;
  }

  // return the highest sampled surface Y under (x,z) within a small radius
  function highestSurfaceYAt(x, z, radius = Math.max(0.5, bodyRadius * 0.6)) {
    // sample center and the 8 surrounding offsets (3x3 grid)
    const offs = [0, -radius, radius];
    let best = -Infinity;
    for (let ox of offs) {
      for (let oz of offs) {
        const y = surfaceYAt(x + ox, z + oz);
        if (y > best) best = y;
      }
    }
    return best;
  }

  useEffect(() => {
    legsRef.current = legsRef.current.slice(0, 4);
    pawRefs.current = pawRefs.current.slice(0, 4);

    // map skeleton bones by common substrings if model present
    if (gltf && gltf.scene) {
      const bones = [];
      gltf.scene.traverse((n) => {
        if (n.isBone) bones.push(n);
      });
      const names = bones.map(b => b.name.toLowerCase());
      const find = (candidates) => {
        for (const cand of candidates) {
          const idx = names.findIndex(n => n.includes(cand));
          if (idx >= 0) return bones[idx];
        }
        return null;
      };
      skelRefs.current.spine = find(['spine','spine1','spine2','torso']) || bones[0] || null;
      skelRefs.current.neck = find(['neck']) || null;
      skelRefs.current.head = find(['head']) || null;
      skelRefs.current.tail = find(['tail']) || null;
      skelRefs.current.frontLeftThigh = find(['front_left','frontleft','left_fore','lf_thigh','frontl','front l']) || null;
      skelRefs.current.frontRightThigh = find(['front_right','frontright','right_fore','rf_thigh','frontr','front r']) || null;
      skelRefs.current.rearLeftThigh = find(['rear_left','rearleft','left_hind','lh_thigh','rear l']) || null;
      skelRefs.current.rearRightThigh = find(['rear_right','rearright','right_hind','rh_thigh','rear r']) || null;
    }
  }, [gltf]);

  useEffect(() => {
    if (!gltf || !gltf.scene) return undefined;
    gltf.scene.traverse((node) => {
      if (!node.isMesh) return;
      const apply = (mat) => {
        if (!mat) return mat;
        const next = mat.clone();
        if (albedoTexture) next.map = albedoTexture;
        if (normalTexture) next.normalMap = normalTexture;
        if (roughnessTexture) next.roughnessMap = roughnessTexture;
        next.needsUpdate = true;
        return next;
      };
      if (Array.isArray(node.material)) {
        node.material = node.material.map(apply);
      } else {
        node.material = apply(node.material);
      }
    });
  }, [gltf, albedoTexture, normalTexture, roughnessTexture]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    //const gaitFreq = 3.0 + Math.min(1, speed/12) * 1.5;
    const stride = Math.min(6, length * 0.25);

    const worldPos = new THREE.Vector3(position[0], position[1] + HEIGHT_OFFSET, position[2]);
    const bodyQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotationY * Math.PI/180, 0));

    // local bob/lean/bend computed here so bodyGroup can animate independently
    const prev = prevRot.current || rotationY;
    let dAng = rotationY - prev;
    dAng = ((dAng + 180) % 360) - 180;
    const leanDeg = Math.max(-25, Math.min(25, dAng * 0.35));
    const leanRad = leanDeg * Math.PI / 180;
    const bend = Math.max(-0.25, Math.min(0.25, (dAng * Math.PI / 180) * 0.08));
    const speedFactor = Math.min(1, speed / 12);
    const gaitFreq = 3.5 + speedFactor * 1.5;
    const gaitAmp = 0.6 * speedFactor;
    const bob = Math.sin(t * gaitFreq * 2) * gaitAmp;
    prevRot.current = rotationY;

    // compute foot targets (x,z) and required hip heights so body raises onto higher surfaces
    const footTargets = [];
    let requiredHipWorldY = -Infinity;
    let sumHipWorldY = 0;
    for (let i = 0; i < 4; i++) {
      const local = new THREE.Vector3(hipOffsets[i][0], 0, hipOffsets[i][1]);
      local.applyQuaternion(bodyQuat);
      const hipX = local.x + position[0];
      const hipZ = local.z + position[2];
      const phaseOffsets = [-0.25, 0.25, 0.25, -0.25];
      const phase = t * gaitFreq + phaseOffsets[i];
      const lift = Math.max(0, Math.sin(phase * Math.PI * 2)) * 1.4 * Math.min(1, speed/12);
      const foreBack = (i < 2) ? -1 : 1;
      const forwardOffset = foreBack * Math.sin(phase * Math.PI * 2) * stride * 0.2;
      const footX = hipX + 0;
      const footZ = hipZ + forwardOffset;
      // find the highest nearby surface under this foot so each leg adapts individually
      const groundY = highestSurfaceYAt(footX, footZ);
      const surfaceDelta = Math.max(0, groundY - matSurfaceHeight);
      const limitedDelta = Math.min(surfaceDelta, legLength * 0.9);
      const targetProgress = Math.min(1, limitedDelta / 3);
      const currentProgress = legClimbProgress.current[i] || 0;
      const progress = THREE.MathUtils.lerp(currentProgress, targetProgress, Math.min(1, delta * 3.5));
      legClimbProgress.current[i] = progress;
      const climbBoost = progress * Math.max(0, limitedDelta + 1);
      const rawFootY = groundY + lift * 0.6 + climbBoost * 0.5;
      const maxFootY = position[1] + legLength * 0.85;
      let footY = Math.min(rawFootY, maxFootY);
      footY = Math.max(groundY + 0.05, footY);
      const footTarget = new THREE.Vector3(footX, footY, footZ);
      const hipNeeded = footY + legLength;
      footTargets[i] = { hipX, hipZ, footTarget, hipNeeded };
      requiredHipWorldY = Math.max(requiredHipWorldY, hipNeeded);
      sumHipWorldY += hipNeeded;
    }

    const avgHipWorldY = (sumHipWorldY / 4) || requiredHipWorldY;

    // groupRef Y: anchor to provided simulation position rather than computed hip height
    if (hipSmoothY.current === null) hipSmoothY.current = requiredHipWorldY;
    hipSmoothY.current = THREE.MathUtils.lerp(hipSmoothY.current, requiredHipWorldY, Math.min(1, delta * 2.5));
    const bodyWorldHipY = hipSmoothY.current;
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + HEIGHT_OFFSET;
    }
    // bodyGroupRef is the tilt pivot at hip-attachment line — keep its own y at 0 so rotations
    // happen around the hip line, not around the body centre
    if (bodyGroupRef.current) {
      bodyGroupRef.current.position.y = 0;
      // base lean/bend from turning
      bodyGroupRef.current.rotation.z = leanRad;
      bodyGroupRef.current.rotation.x = bend;
    }
    // bodyVisualRef holds body geometry offset upward plus bob animation
    if (bodyVisualRef.current) {
      const hipLiftDelta = Math.max(0, requiredHipWorldY - avgHipWorldY);
      const baseHipTarget = position[1] + legLength;
      const hipDelta = bodyWorldHipY - baseHipTarget;
      bodyVisualRef.current.position.y = bodyHeight / 2 + bob - hipLiftDelta + hipDelta * 0.9;
    }

    // simple head/ear idle animation for fallback geometry
    if (headGroupRef.current && !(gltf && gltf.scene)) {
      headGroupRef.current.rotation.x = Math.sin(t * 1.2) * 0.06; // tilt
      headGroupRef.current.rotation.y = Math.sin(t * 0.8) * 0.08;
      // ears (if present) will be children and inherit slight motion
    }

    // Adjust body tilt so opposing foot pairs end up at similar heights
    if (bodyGroupRef.current) {
      try {
        const footYs = footTargets.map(f => f.footTarget.y);
        // indices: 0 front-left, 1 front-right, 2 rear-left, 3 rear-right
        const leftAvg = (footYs[0] + footYs[2]) / 2;
        const rightAvg = (footYs[1] + footYs[3]) / 2;
        const frontAvg = (footYs[0] + footYs[1]) / 2;
        const rearAvg = (footYs[2] + footYs[3]) / 2;

        // compute hip separations using hip positions from footTargets (world coords)
        const leftHipX = (footTargets[0].hipX + footTargets[2].hipX) / 2;
        const rightHipX = (footTargets[1].hipX + footTargets[3].hipX) / 2;
        const frontHipZ = (footTargets[0].hipZ + footTargets[1].hipZ) / 2;
        const rearHipZ = (footTargets[2].hipZ + footTargets[3].hipZ) / 2;
        const dx = Math.max(0.0001, Math.abs(leftHipX - rightHipX));
        const dz = Math.max(0.0001, Math.abs(frontHipZ - rearHipZ));

        // compute desired roll/pitch from actual height diffs and separations
        const maxTilt = 1.1; // allow up to ~63deg when climbing
        const surfaceDeltaPitch = frontAvg - rearAvg;
        const pitchThreshold = 0.15;
        const pitchBoost = Math.sign(surfaceDeltaPitch) * Math.max(0, Math.abs(surfaceDeltaPitch) - pitchThreshold) * 1.75;
        const desiredRoll = Math.max(-maxTilt, Math.min(maxTilt, Math.atan2(leftAvg - rightAvg, dx)));
        const desiredPitchRaw = Math.atan2(surfaceDeltaPitch * 2.2, dz);
        const desiredPitch = Math.max(-maxTilt, Math.min(maxTilt, desiredPitchRaw + pitchBoost));

        // current base lean/bend (from turning) are leanRad and bend; blend toward combined target
        const targetZ = leanRad + desiredRoll;
        const targetX = bend + desiredPitch;
        const curZ = bodyGroupRef.current.rotation.z;
        const curX = bodyGroupRef.current.rotation.x;
        const blend = 0.35; // faster response for dramatic tilt
        bodyGroupRef.current.rotation.z = THREE.MathUtils.lerp(curZ, targetZ, blend);
        bodyGroupRef.current.rotation.x = THREE.MathUtils.lerp(curX, targetX, blend);
      } catch (e) {}
    }

    // update legs and paws using fixed legLength and actual (tilted) hip world positions
    for (let i = 0; i < 4; i++) {
      const footTarget = footTargets[i].footTarget;
      // derive actual hip world position through the now-tilted bodyGroupRef pivot so legs
      // stay flush with the tilted torso rather than floating through it
      let hipWorld;
      if (bodyGroupRef.current) {
        bodyGroupRef.current.updateMatrixWorld();
        hipWorld = bodyGroupRef.current.localToWorld(
          new THREE.Vector3(hipOffsets[i][0], 0, hipOffsets[i][1])
        );
      } else {
        hipWorld = new THREE.Vector3(footTargets[i].hipX, bodyWorldHipY, footTargets[i].hipZ);
      }

        const thighBones = [skelRefs.current.frontLeftThigh, skelRefs.current.frontRightThigh, skelRefs.current.rearLeftThigh, skelRefs.current.rearRightThigh];
        const thigh = thighBones[i];
        const climbProgress = legClimbProgress.current[i] || 0;
        const legBlend = Math.min(1, 0.6 + climbProgress * 0.4);
        const dir = new THREE.Vector3().subVectors(footTarget, hipWorld);
        const dist = Math.max(dir.length(), 0.01);
        const dirNorm = dir.clone().normalize();
        if (thigh && thigh.parent) {
          const up = new THREE.Vector3(0,1,0);
          const q = new THREE.Quaternion();
          q.setFromUnitVectors(up, dirNorm);
          const parent = thigh.parent;
          parent.updateMatrixWorld();
          const invParentQuat = parent.getWorldQuaternion(new THREE.Quaternion()).invert();
          const localQuat = invParentQuat.multiply(q.clone());
          thigh.quaternion.slerp(localQuat, legBlend);
          const hipPosLocal = parent.worldToLocal(hipWorld.clone());
          thigh.position.lerp(hipPosLocal, legBlend);
        } else {
          const lg = legGroupRefs.current[i];
          if (lg) lg.position.y = 0; // hip top at local y=0

          const leg = legsRef.current[i];
          if (leg) {
            const parent = legGroupRefs.current[i] || groupRef.current;
            const desiredCenterWorld = hipWorld.clone().add(dirNorm.clone().multiplyScalar(dist / 2));
            parent.updateMatrixWorld();
            const localCenter = parent.worldToLocal(desiredCenterWorld.clone());
            leg.position.lerp(localCenter, legBlend);
            const invParentQuat = parent.getWorldQuaternion(new THREE.Quaternion()).invert();
            const up = new THREE.Vector3(0,1,0);
            const q = new THREE.Quaternion();
            q.setFromUnitVectors(up, dirNorm);
            const localQuat = invParentQuat.multiply(q.clone());
            leg.quaternion.slerp(localQuat, legBlend);
            leg.scale.lerp(new THREE.Vector3(1, 1, 1), legBlend);
          }
        }
        const paw = pawRefs.current[i];
        if (paw) {
          const parent = paw.parent || legGroupRefs.current[i] || groupRef.current;
          if (parent) {
            parent.updateMatrixWorld();
            const footWorldAtLeg = hipWorld.clone().add(dirNorm.clone().multiplyScalar(dist));
            const localFoot = parent.worldToLocal(footWorldAtLeg);
            paw.position.lerp(localFoot, legBlend);
          } else {
            paw.position.lerp(footTarget, legBlend);
          }
        }
    }
  });

  // Render: use glTF if loaded else fallback simple geometry
  const posWithOffset = [position[0], position[1] + HEIGHT_OFFSET, position[2]];

  if (gltf && gltf.scene) {
    return (
      <primitive ref={groupRef} object={gltf.scene} position={posWithOffset} rotation={[0, rotationY * Math.PI / 180, 0]} />
    );
  }

  return (
    <group ref={groupRef} position={posWithOffset} rotation={[0, rotationY * Math.PI / 180, 0]}>
      {/* bodyGroupRef: tilt pivot at hip-attachment line; local y=0 aligns with hip world height */}
      <group ref={bodyGroupRef} position={[0, 0, 0]}>
        {/* bodyVisualRef: body geometry offset above the hip pivot + bob */}
        <group ref={bodyVisualRef} position={[0, bodyHeight / 2, 0]}>
        {/* spine / torso as a tapered cylinder (length along Z) */}
        <mesh geometry={bodyGeometry} position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]}> 
          <meshStandardMaterial color={skeletonMode ? '#ffffff' : bodyColor} wireframe={skeletonMode} />
        </mesh>
        {!skeletonMode && (
          <group rotation={[Math.PI/2, 0, 0]}>
            <FurShells
              geometry={bodyGeometry}
              length={bodyRadius * 0.35}
              color={bodyColor}
              layers={12}
              noiseScale={5}
            />
          </group>
        )}
        {/* segmented tail moved to front (swap with head) */}
        <group position={[0, 0, -length*0.5 + bodyRadius*0.4]}> 
          {[0,1,2,3].map(i => (
            <mesh key={`tail-${i}`} position={[0, 0, i * (bodyRadius*0.22)]}>
              <sphereGeometry args={[bodyRadius*0.35 * Math.max(0.35, 1 - i*0.18), 12, 10]} />
              <meshStandardMaterial color={skeletonMode ? '#ffffff' : bodyColor} wireframe={skeletonMode} />
            </mesh>
          ))}
        </group>
        {/* head + neck group moved to rear (swap with tail) */}
        <group ref={headGroupRef} position={[0, 0, length*0.5 - bodyRadius*0.4]}> 
          {/* neck (points toward body) */}
          <mesh position={[0, 0.0, -bodyRadius*0.15]} rotation={[Math.PI/2, 0, 0]}> 
            <cylinderGeometry args={[bodyRadius*0.28, bodyRadius*0.36, bodyRadius*0.6, 10]} />
            <meshStandardMaterial color={skeletonMode ? '#ffffff' : bodyColor} wireframe={skeletonMode} />
          </mesh>
          {/* head as slightly elongated ellipsoid */}
          <group position={[0, 0, 0]} scale={[1.0, 0.95, 1.18]}>
            <mesh geometry={headGeometry}> 
              <meshStandardMaterial color={skeletonMode ? '#ffffff' : bodyColor} wireframe={skeletonMode} />
            </mesh>
            {!skeletonMode && (
              <FurShells
                geometry={headGeometry}
                length={bodyRadius * 0.25}
                color={bodyColor}
                layers={8}
                noiseScale={6}
              />
            )}
          </group>
          {/* lower jaw */}
          <mesh position={[0, bodyRadius*0.12, bodyRadius*0.18]} rotation={[0,0,0]} scale={[1,0.6,0.9]}> 
            <sphereGeometry args={[bodyRadius*0.28, 12, 10]} />
            <meshStandardMaterial color={skeletonMode ? '#ffffff' : bodyColor} wireframe={skeletonMode} />
          </mesh>
          {/* cheek bulges */}
          <mesh position={[-bodyRadius*0.35, -bodyRadius*0.02, bodyRadius*0.06]} scale={[0.6,0.5,0.8]}> 
            <sphereGeometry args={[bodyRadius*0.22, 12, 10]} />
            <meshStandardMaterial color={skeletonMode ? '#ffffff' : bodyColor} wireframe={skeletonMode} />
          </mesh>
          <mesh position={[bodyRadius*0.35, -bodyRadius*0.02, bodyRadius*0.06]} scale={[0.6,0.5,0.8]}> 
            <sphereGeometry args={[bodyRadius*0.22, 12, 10]} />
            <meshStandardMaterial color={skeletonMode ? '#ffffff' : bodyColor} wireframe={skeletonMode} />
          </mesh>
          {/* eyelids (subtle flattened spheres above eyes) */}
          <mesh position={[-bodyRadius*0.22, -bodyRadius*0.12, bodyRadius*0.48]} scale={[1.0,0.35,0.9]}> 
            <sphereGeometry args={[bodyRadius*0.09, 8, 6]} />
            <meshStandardMaterial color={skeletonMode ? '#ffffff' : '#e0c7b0'} />
          </mesh>
          <mesh position={[bodyRadius*0.22, -bodyRadius*0.12, bodyRadius*0.48]} scale={[1.0,0.35,0.9]}> 
            <sphereGeometry args={[bodyRadius*0.09, 8, 6]} />
            <meshStandardMaterial color={skeletonMode ? '#ffffff' : '#e0c7b0'} />
          </mesh>
          {/* subtle mouth crease */}
          <mesh position={[0, bodyRadius*0.18, bodyRadius*0.05]} rotation={[0,0,0]}> 
            <boxGeometry args={[bodyRadius*0.3, bodyRadius*0.04, bodyRadius*0.08]} />
            <meshStandardMaterial color={'#6b4932'} />
          </mesh>
          {/* snout (pointing away from body) */}
          <mesh position={[0, 0, bodyRadius*0.7]} rotation={[Math.PI/2, 0, 0]}> 
            <cylinderGeometry args={[bodyRadius*0.15, bodyRadius*0.12, bodyRadius*0.9, 8]} />
            <meshStandardMaterial color={skeletonMode ? '#ffffff' : bodyColor} wireframe={skeletonMode} />
          </mesh>
          {/* nose */}
          <mesh position={[0, 0, bodyRadius*1.25]}> 
            <sphereGeometry args={[bodyRadius*0.12, 8, 6]} />
            <meshStandardMaterial color={noseColor} />
          </mesh>
          {/* eyes */}
          <mesh position={[-bodyRadius*0.22, -bodyRadius*0.05, bodyRadius*0.55]}> 
            <sphereGeometry args={[bodyRadius*0.08, 8, 6]} />
            <meshStandardMaterial color={eyeColor} />
          </mesh>
          <mesh position={[bodyRadius*0.22, -bodyRadius*0.05, bodyRadius*0.55]}> 
            <sphereGeometry args={[bodyRadius*0.08, 8, 6]} />
            <meshStandardMaterial color={eyeColor} />
          </mesh>
          {/* ears */}
          <mesh position={[-bodyRadius*0.25, -bodyRadius*0.28, bodyRadius*0.2]} rotation={[-0.5, 0, -0.4]}> 
            <coneGeometry args={[bodyRadius*0.12, bodyRadius*0.28, 8]} />
            <meshStandardMaterial color={skeletonMode ? '#ffffff' : bodyColor} wireframe={skeletonMode} />
          </mesh>
          <mesh position={[bodyRadius*0.25, -bodyRadius*0.28, bodyRadius*0.2]} rotation={[-0.5, 0, 0.4]}> 
            <coneGeometry args={[bodyRadius*0.12, bodyRadius*0.28, 8]} />
            <meshStandardMaterial color={skeletonMode ? '#ffffff' : bodyColor} wireframe={skeletonMode} />
          </mesh>
        </group>
        </group>{/* end bodyVisualRef */}

        {/* legs attached to pivot (groups positioned at hip offsets relative to hip line) */}
        {hipOffsets.map((h, i) => (
          <group key={`leg-${i}`} ref={el => legGroupRefs.current[i] = el} position={[h[0], 0, h[1]]}>
            <mesh ref={el => legsRef.current[i] = el} position={[0, - (legLength/2), 0]}>
              <cylinderGeometry args={[bodyRadius*0.12, bodyRadius*0.07, legLength, 8]} />
              <meshStandardMaterial color={skeletonMode ? '#ffffff' : '#8b5a3c'} wireframe={skeletonMode} />
            </mesh>
            <mesh ref={el => pawRefs.current[i] = el} position={[0, -legLength, 0]}>
              <sphereGeometry args={[pawRadius, 8, 6]} />
              <meshStandardMaterial color={pawColor} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
