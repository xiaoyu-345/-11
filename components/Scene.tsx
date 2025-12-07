import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { TreeParticles } from './TreeParticles';
import { Ornaments } from './Ornaments';
import { Snow } from './Snow';
import { GestureState } from '../types';
import { APP_CONFIG } from '../constants';

interface SceneProps {
  progress: number;
  gestureState: GestureState;
  resetTrigger: number; // Increment to trigger reset
}

export const Scene: React.FC<SceneProps> = ({ progress, gestureState, resetTrigger }) => {
  const camRef = useRef<THREE.PerspectiveCamera>(null);
  
  // Handle Reset by snapping or animating quickly back
  useEffect(() => {
    if (camRef.current) {
        // We let the useFrame handle the lerp back to default if no hand is detected
    }
  }, [resetTrigger]);

  useFrame((state) => {
    const cam = state.camera;
    const defaultZ = APP_CONFIG.camera.defaultPos[2];
    const defaultY = APP_CONFIG.camera.defaultPos[1];

    if (gestureState.isHandDetected) {
       const { x, y } = gestureState.handPosition;
       const zoomFactor = gestureState.zoom; // 0 (far/small hand) to 1 (close/big hand)

       // Map zoom factor to Z position
       // Narrowed Range: Far (55) to Close (10)
       // This reduces the degree of visual distance change relative to hand input.
       const targetZ = THREE.MathUtils.lerp(55, 10, zoomFactor);

       // Target Look offsets (Orbit)
       // We multiply x by a factor to orbit around the tree
       const targetX = x * 15; // Increased orbit range slightly
       const targetY = defaultY + (y * 8); 
       
       cam.position.x = THREE.MathUtils.lerp(cam.position.x, targetX, 0.05);
       cam.position.y = THREE.MathUtils.lerp(cam.position.y, targetY, 0.05);
       cam.position.z = THREE.MathUtils.lerp(cam.position.z, targetZ, 0.05);
       
    } else {
        // Auto Rotate / Return to default when no hand
        const t = state.clock.getElapsedTime();
        const autoX = Math.sin(t * 0.1) * 20;
        
        // Soft return to default 
        cam.position.x = THREE.MathUtils.lerp(cam.position.x, autoX, 0.02);
        cam.position.y = THREE.MathUtils.lerp(cam.position.y, defaultY, 0.02);
        cam.position.z = THREE.MathUtils.lerp(cam.position.z, defaultZ, 0.02);
    }
    
    // CRITICAL: Always look at the geometric center of the tree (0,0,0)
    // Since tree geometry is centered at 0 (-6 to +6), this ensures perfect centering.
    cam.lookAt(0, 0, 0);
  });

  return (
    <>
      <PerspectiveCamera ref={camRef} makeDefault position={APP_CONFIG.camera.defaultPos} fov={50} />
      
      {/* Cinematic Lighting */}
      <ambientLight intensity={0.1} color="#001100" />
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.3} 
        penumbra={1} 
        intensity={10} 
        color="#FFD700" 
        castShadow 
      />
      <pointLight position={[-10, 5, -10]} intensity={3} color="#00ffaa" />
      
      <Environment preset="lobby" background={false} />
      
      {/* Main Content */}
      <group position={[0, 0, 0]}>
        <TreeParticles progress={progress} />
        <Ornaments progress={progress} gestureState={gestureState} />
        <Snow />
      </group>

      {/* Post Processing */}
      <EffectComposer disableNormalPass>
        <Bloom 
          luminanceThreshold={0.7} 
          mipmapBlur 
          intensity={0.6} 
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.0} />
        <Noise opacity={0.05} />
      </EffectComposer>
    </>
  );
};