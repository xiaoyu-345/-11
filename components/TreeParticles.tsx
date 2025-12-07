import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { APP_CONFIG, NEEDLE_VERTEX_SHADER, NEEDLE_FRAGMENT_SHADER } from '../constants';

interface TreeParticlesProps {
  progress: number; // 0 to 1
}

export const TreeParticles: React.FC<TreeParticlesProps> = ({ progress }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { count, positions, chaosPositions, phases, sizes } = useMemo(() => {
    const count = APP_CONFIG.counts.needles;
    const positions = new Float32Array(count * 3);
    const chaosPositions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);

    const { height, radius } = APP_CONFIG.tree;

    for (let i = 0; i < count; i++) {
      // 1. Target Position (Cone Tree)
      // Normalize height 0 to 1
      const yNorm = Math.random(); 
      const y = yNorm * height - (height / 2); // Center Y
      
      // Radius at this height (cone tapers to top)
      const r = (1 - yNorm) * radius;
      
      // Random angle
      const theta = Math.random() * Math.PI * 2;
      
      // SHELL DISTRIBUTION:
      // Focus particles near the surface (0.85 to 1.0 of radius) 
      // instead of filling the inside. This creates a hollow shape defined by the "leaves".
      const shellThickness = 0.15; // Top 15% of radius
      const rRandom = r * (1.0 - (Math.random() * shellThickness));

      const x = rRandom * Math.cos(theta);
      const z = rRandom * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // 2. Chaos Position (Sphere Volume)
      // Center-heavy distribution
      const u = Math.random();
      const v = Math.random();
      const thetaChaos = 2 * Math.PI * u;
      const phiChaos = Math.acos(2 * v - 1);
      
      // Use power function to cluster near center
      const dist = Math.pow(Math.random(), 3) * 20; // Most points within small radius, some far out
      const rChaos = dist + 2.0; // Minimum offset

      const cx = rChaos * Math.sin(phiChaos) * Math.cos(thetaChaos);
      const cy = rChaos * Math.sin(phiChaos) * Math.sin(thetaChaos);
      const cz = rChaos * Math.cos(phiChaos);

      chaosPositions[i * 3] = cx;
      chaosPositions[i * 3 + 1] = cy;
      chaosPositions[i * 3 + 2] = cz;

      phases[i] = Math.random() * Math.PI * 2;
      
      // Further reduced size for finer detail
      sizes[i] = Math.random() * 2.5 + 0.5;
    }

    return { count, positions, chaosPositions, phases, sizes };
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      // Smooth lerp for progress is handled in parent or here? 
      // We receive 'progress' which is already interpolated value from spring/state
      materialRef.current.uniforms.uProgress.value = progress;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
  }), []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position" // This maps to 'position' in standard three, but we use custom attr for logic
          count={count}
          array={positions} // These act as TargetPos really, but we need base bounding box
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPos"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aChaosPos"
          count={count}
          array={chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          count={count}
          array={phases}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={NEEDLE_VERTEX_SHADER}
        fragmentShader={NEEDLE_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        // Normal Blending ensures colors don't add up to white, keeping them saturated
        blending={THREE.NormalBlending}
      />
    </points>
  );
};