import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

const vertexShader = `
uniform float layer;
uniform float maxLayers;
uniform float length;
varying float vLayer;
varying vec2 vUv;

void main() {
  float ratio = layer / maxLayers;
  vec3 displaced = position + normal * length * ratio;
  vLayer = ratio;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

const fragmentShader = `
uniform vec3 furColor;
uniform sampler2D noiseTexture;
uniform float noiseScale;
varying float vLayer;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * noiseScale + vec2(vLayer * 0.35);
  vec3 noise = texture(noiseTexture, uv).rgb;
  float alpha = pow(1.0 - vLayer, 2.0);
  vec3 base = furColor * (0.7 + 0.3 * noise.r) + noise.g * 0.15;
  gl_FragColor = vec4(base, alpha);
}
`;

function createNoiseTexture(size = 128) {
  const data = new Uint8Array(size * size * 3);
  for (let i = 0; i < data.length; i += 3) {
    const value = Math.floor(Math.random() * 255);
    data[i + 0] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export default function FurShells({ geometry, layers = 12, length = 0.5, color = '#c48b5c', noiseScale = 4 }) {
  const maxLayers = Math.max(1, layers);
  const baseColor = useMemo(() => new THREE.Color(color), [color]);
  const noiseTexture = useMemo(() => createNoiseTexture(64), []);

  useEffect(() => () => {
    noiseTexture.dispose();
  }, [noiseTexture]);

  const materials = useMemo(() => {
    return Array.from({ length: maxLayers }, (_, index) => {
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          layer: { value: index + 1 },
          maxLayers: { value: maxLayers },
          length: { value: length },
          furColor: { value: baseColor.clone() },
          noiseTexture: { value: noiseTexture },
          noiseScale: { value: noiseScale * (0.5 + index / maxLayers * 0.5) },
        },
        blending: THREE.NormalBlending,
        depthWrite: false,
        transparent: true,
        side: THREE.DoubleSide,
      });
      return material;
    });
  }, [maxLayers, length, baseColor, noiseScale, noiseTexture]);

  useEffect(() => {
    return () => {
      materials.forEach((mat) => mat.dispose());
    };
  }, [materials]);

  if (!geometry) return null;

  return (
    <>
      {materials.map((material, index) => (
        <mesh key={`fur-shell-${index}`} geometry={geometry} material={material} renderOrder={50 + index} />
      ))}
    </>
  );
}