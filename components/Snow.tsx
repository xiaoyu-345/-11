import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { APP_CONFIG } from '../constants';

const SNOW_VERTEX_SHADER = `
  uniform float uTime;
  attribute float aScale;
  attribute vec3 aVelocity;
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    
    // Fall down based on time and velocity
    float fallSpeed = aVelocity.y;
    float yOffset = mod(uTime * fallSpeed, 20.0); // Loop range 20 units
    pos.y -= yOffset;
    
    // Wrap around height (from 10 down to -10)
    if (pos.y < -10.0) pos.y += 20.0;
    
    // Horizontal drift
    pos.x += sin(uTime * aVelocity.x + pos.y) * 0.1;
    pos.z += cos(uTime * aVelocity.z + pos.y) * 0.1;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = aScale * (100.0 / -mvPosition.z);
    
    // Fade out near bottom or top edges for smoothness
    vAlpha = smoothstep(-10.0, -8.0, pos.y) * (1.0 - smoothstep(8.0, 10.0, pos.y));
  }
`;

const SNOW_FRAGMENT_SHADER = `
  varying float vAlpha;
  
  void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    
    float alpha = (1.0 - r) * 0.8 * vAlpha;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;

export const Snow: React.FC = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const { count, positions, scales, velocities } = useMemo(() => {
    const count = APP_CONFIG.counts.snow;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Random position in a large box
      positions[i * 3] = (Math.random() - 0.5) * 30; // x
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20; // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30; // z

      // Much smaller scale for fine snow
      scales[i] = Math.random() * 0.8 + 0.3; 
      
      // Velocity: X/Z for drift speed, Y for fall speed
      velocities[i * 3] = Math.random() * 0.5 + 0.1; // drift x frequency
      velocities[i * 3 + 1] = Math.random() * 2.0 + 1.0; // fall speed
      velocities[i * 3 + 2] = Math.random() * 0.5 + 0.1; // drift z frequency
    }

    return { count, positions, scales, velocities };
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScale"
          count={count}
          array={scales}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aVelocity"
          count={count}
          array={velocities}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={SNOW_VERTEX_SHADER}
        fragmentShader={SNOW_FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};