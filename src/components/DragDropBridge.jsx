import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { snapToGrid } from '../utils/collision';

export default function DragDropBridge({ layoutApi }) {
  const { camera, gl } = useThree();

  useEffect(() => {
    if (!layoutApi) return;
    const dom = gl.domElement;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y = 0 plane
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onDragOver = (e) => {
      e.preventDefault();
      if (!layoutApi.placingId) return;
      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersection = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, intersection)) {
        const candidate = [intersection.x, 0, intersection.z];
        const snapped = snapToGrid(candidate, 1);
        layoutApi.setItemPosition(layoutApi.placingId, snapped);
      }
    };

    const onDrop = (e) => {
      e.preventDefault();
      if (!layoutApi) return;
      // finalize placement: ensure position already set via dragover
      layoutApi.setPlacingId(null);
    };

    const onDragEnd = () => {
      // ensure placingId cleared
      if (layoutApi && layoutApi.placingId) layoutApi.setPlacingId(null);
    };

    dom.addEventListener('dragover', onDragOver);
    dom.addEventListener('drop', onDrop);
    window.addEventListener('dragend', onDragEnd);

    return () => {
      dom.removeEventListener('dragover', onDragOver);
      dom.removeEventListener('drop', onDrop);
      window.removeEventListener('dragend', onDragEnd);
    };
  }, [gl, camera, layoutApi]);

  return null;
}
