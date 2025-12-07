import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance, Image } from '@react-three/drei';
import * as THREE from 'three';
import { APP_CONFIG } from '../constants';
import { OrnamentData, GestureState } from '../types';

interface OrnamentsProps {
  progress: number;
  gestureState?: GestureState;
}

// Generate the greeting card texture once
const createGreetingCardUrl = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 640; 
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Card Background - PINK
    ctx.fillStyle = '#FFC0CB'; // Pink
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Inner Frame (slightly darker pink or white for contrast)
    ctx.fillStyle = '#FFF0F5'; // Lavender Blush
    ctx.fillRect(20, 20, 472, 472);
    
    // Photo Area Gradient (Pink/Red theme)
    const grad = ctx.createLinearGradient(20, 20, 492, 492);
    grad.addColorStop(0, '#FF69B4'); // Hot Pink
    grad.addColorStop(1, '#C71585'); // Medium Violet Red
    ctx.fillStyle = grad;
    ctx.fillRect(30, 30, 452, 452);

    // Text Settings
    ctx.textAlign = 'center';
    
    // "Dear Benjamin,"
    ctx.fillStyle = '#8B0000'; // Dark Red text
    ctx.font = 'bold italic 36px "Playfair Display", serif';
    ctx.fillText('Dear Benjamin,', 256, 200);

    // "Marry Christmas,"
    ctx.fillStyle = '#FFD700'; // Gold text
    ctx.shadowColor="rgba(0,0,0,0.5)";
    ctx.shadowBlur=4;
    ctx.font = 'bold 52px "Playfair Display", serif';
    ctx.fillText('Marry Christmas,', 256, 280);
    
    // "圣诞快乐"
    ctx.shadowBlur=0;
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 64px "SimSun", serif';
    ctx.fillText('圣诞快乐', 256, 380);
    
    // Decoration
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 5;
    ctx.strokeRect(40, 40, 432, 432);

    return canvas.toDataURL();
};

// Helper to generate positions
const generateOrnamentData = (count: number, type: OrnamentData['type'], seedOffset: number): OrnamentData[] => {
  const data: OrnamentData[] = [];
  const { height, radius } = APP_CONFIG.tree;
  
  // Default color palette for generic items
  const colors = [APP_CONFIG.colors.gold, APP_CONFIG.colors.red, APP_CONFIG.colors.emerald, APP_CONFIG.colors.warmWhite];

  for (let i = 0; i < count; i++) {
    let x, y, z;
    let color = colors[Math.floor(Math.random() * colors.length)];
    let scale = 0.3;
    let rotation: [number, number, number] = [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI];

    if (type === 'ribbon') {
        // Spiral Logic
        const tRaw = i / count; 
        const t = Math.sqrt(tRaw);

        const spirals = 5.0; // Number of turns
        const h = height * 0.9;
        
        y = (1 - t) * h - (h / 2) - 0.5;
        const rCurrent = t * radius * 1.1;
        const angle = t * Math.PI * 2 * spirals;
        
        x = rCurrent * Math.cos(angle);
        z = rCurrent * Math.sin(angle);
        
        const tangentX = -Math.sin(angle);
        const tangentZ = Math.cos(angle);
        const slopeY = -0.2; 
        
        const dummy = new THREE.Object3D();
        dummy.position.set(0,0,0);
        dummy.lookAt(tangentX, slopeY, tangentZ);
        rotation = [dummy.rotation.x, dummy.rotation.y, dummy.rotation.z];
        
        color = APP_CONFIG.colors.ribbon;
        scale = 1.0;
        
    } else if (type === 'baseGift') {
        // PILE AT BOTTOM
        // Random placement around the base, slightly outside trunk
        const angle = Math.random() * Math.PI * 2;
        const dist = 2.0 + Math.random() * 3.5; // Radius 2 to 5.5
        
        x = dist * Math.cos(angle);
        // Base of tree is at -height/2 (-6). Stack them slightly.
        y = (-height / 2) + Math.random() * 1.5; 
        z = dist * Math.sin(angle);
        
        // Ensure flat-ish rotation
        rotation = [0, Math.random() * Math.PI * 2, 0];
        scale = 0.8 + Math.random() * 0.5; // Bigger than tree ornaments
        
    } else {
        // Standard Surface Distribution
        const u = Math.random();
        const yNorm = (1 - Math.sqrt(u)) * 0.85;
    
        y = yNorm * height - (height / 2);
        const r = (1 - yNorm) * radius * 0.9; 
        const theta = Math.random() * Math.PI * 2;
        
        x = r * Math.cos(theta);
        z = r * Math.sin(theta);
    }

    // Chaos around center
    const chaosU = Math.random();
    const chaosV = Math.random();
    const thetaChaos = 2 * Math.PI * chaosU;
    const phiChaos = Math.acos(2 * chaosV - 1);
    const rChaos = 10 + Math.random() * 15;
    const cx = rChaos * Math.sin(phiChaos) * Math.cos(thetaChaos);
    const cy = rChaos * Math.sin(phiChaos) * Math.sin(thetaChaos);
    const cz = rChaos * Math.cos(phiChaos);

    // Determine specific color/scale based on type
    if (type === 'ball') scale = 0.25 + Math.random() * 0.35;
    if (type === 'gift') scale = 0.4 + Math.random() * 0.4;
    if (type === 'snowflake') { color = APP_CONFIG.colors.silver; scale = 0.5; }
    if (type === 'gingerbread') { color = APP_CONFIG.colors.cookie; scale = 0.5; }
    if (type === 'reindeer') { color = APP_CONFIG.colors.darkGold; scale = 0.6; }
    if (type === 'glitter') { color = APP_CONFIG.colors.diamond; scale = 0.15 + Math.random() * 0.15; }

    data.push({
      id: i + seedOffset,
      chaosPos: new THREE.Vector3(cx, cy, cz),
      targetPos: new THREE.Vector3(x, y, z),
      type,
      color,
      rotation,
      scale,
    });
  }
  return data;
};

// Component for a single moving ornament
const MovingInstance: React.FC<{ data: OrnamentData; progress: number }> = ({ data, progress }) => {
  const ref = useRef<any>(null);
  
  useFrame(() => {
    if (ref.current) {
      ref.current.position.lerpVectors(data.targetPos, data.chaosPos, progress);
      
      const rotSpeed = progress * 20.0;
      ref.current.rotation.x = data.rotation[0] + rotSpeed * 0.1;
      ref.current.rotation.y = data.rotation[1] + rotSpeed * 0.2;
      ref.current.rotation.z = data.rotation[2] + rotSpeed * 0.1;
    }
  });

  return (
    <Instance
      ref={ref}
      color={data.color}
      scale={data.scale}
    />
  );
};

// Component for Polaroids
const PolaroidImages = ({ progress, gestureState }: { progress: number, gestureState?: GestureState }) => {
    const count = APP_CONFIG.counts.photos;
    const { height, radius } = APP_CONFIG.tree;
    const groupRef = useRef<THREE.Group>(null);
    const [viewingIndex, setViewingIndex] = useState(0); 
    
    const greetingCardUrl = useMemo(() => createGreetingCardUrl(), []);

    const photos = useMemo(() => {
        // Use a Golden Spiral distribution to ensure even vertical and radial spacing
        // This prevents clustering at the bottom while looking organic.
        const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~2.3999 rad

        return Array.from({length: count}).map((_, i) => {
            // Linear Vertical Distribution from 10% to 85% of tree height
            // This guarantees photos are spread apart vertically
            const t = i / Math.max(count - 1, 1);
            const minH = 0.1; 
            const maxH = 0.85;
            const yNorm = minH + t * (maxH - minH);
            
            // Calculate Y position
            const y = yNorm * height - (height / 2);
            
            // Calculate Radius based on cone shape at this height
            // We use (y + height/2) / height to get the 0..1 normalized height for radius calc
            const hNorm = (y + (height / 2)) / height;
            const r = (1 - hNorm) * radius * 1.15; // 1.15 to hover slightly off the needles
            
            // Calculate Angle using Golden Spiral
            const theta = i * goldenAngle;

            const targetPos = new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
            
            // Chaos position
            const rChaos = 15 + Math.random() * 10;
            const thetaChaos = Math.random() * Math.PI * 2;
            const yChaos = (Math.random() - 0.5) * 20;
            const chaosPos = new THREE.Vector3(rChaos * Math.cos(thetaChaos), yChaos, rChaos * Math.sin(thetaChaos));
            
            return {
                id: i,
                url: greetingCardUrl,
                targetPos,
                chaosPos,
                rot: [0, theta - Math.PI / 2, 0] 
            };
        })
    }, [greetingCardUrl, count, height, radius]);

    useFrame((state) => {
        if(!groupRef.current) return;
        const isGrabbing = gestureState?.isOk;
        const camPos = state.camera.position;
        const viewPos = new THREE.Vector3(0, camPos.y - 1, camPos.z - 6);
        
        photos.forEach((photo, i) => {
            const child = groupRef.current!.children[i];
            if(child) {
                 if (isGrabbing && i === viewingIndex) {
                     child.position.lerp(viewPos, 0.1);
                     child.lookAt(camPos);
                     const s = THREE.MathUtils.lerp(child.scale.x, 3.5, 0.1);
                     child.scale.set(s, s, s);
                 } else {
                     child.position.lerpVectors(photo.targetPos, photo.chaosPos, progress);
                     const s = THREE.MathUtils.lerp(child.scale.x, 1, 0.1);
                     child.scale.set(s, s, s);

                     if (progress > 0.5) {
                        child.rotation.x += 0.02;
                        child.rotation.y += 0.03;
                     } else {
                         const targetRotY = Math.atan2(photo.targetPos.x, photo.targetPos.z);
                         child.rotation.y = THREE.MathUtils.lerp(child.rotation.y, targetRotY, 0.1);
                         child.rotation.x = THREE.MathUtils.lerp(child.rotation.x, 0, 0.1);
                         child.rotation.z = THREE.MathUtils.lerp(child.rotation.z, 0, 0.1);
                     }
                 }
            }
        });
    });

    return (
        <group ref={groupRef}>
            {photos.map((photo) => (
                <group key={photo.id} position={photo.targetPos}>
                   <mesh position={[0, 0, -0.01]}>
                        <boxGeometry args={[1.2, 1.5, 0.05]} />
                        <meshStandardMaterial color="#FFC0CB" roughness={0.2} />
                   </mesh>
                   <Image 
                    url={photo.url} 
                    scale={[1, 1]} 
                    position={[0, 0.1, 0.03]}
                    transparent
                   />
                </group>
            ))}
        </group>
    )
}

// Tree Star Component
const TreeStar = ({ progress }: { progress: number }) => {
    const ref = useRef<THREE.Group>(null);
    const { height } = APP_CONFIG.tree;
    const targetPos = useMemo(() => new THREE.Vector3(0, 7.2, 0), [height]);
    
    // Star participates in chaos around center
    const chaosPos = useMemo(() => {
        const r = 10 + Math.random() * 5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        return new THREE.Vector3(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
    }, []); 

    useFrame((state) => {
        if (ref.current) {
            ref.current.position.lerpVectors(targetPos, chaosPos, progress);
            ref.current.rotation.y += 0.01 + (progress * 0.1);
            ref.current.rotation.x += progress * 0.05;
            ref.current.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.02;
            const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
            ref.current.scale.set(s, s, s);
        }
    });

    const starGeometry = useMemo(() => {
        const shape = new THREE.Shape();
        const points = 5;
        const outerRadius = 1.2;
        const innerRadius = 0.5; 
        for (let i = 0; i < points * 2; i++) {
             const angle = (i * Math.PI) / points - Math.PI / 2;
             const r = (i % 2 === 0) ? outerRadius : innerRadius;
             const x = Math.cos(angle) * r;
             const y = Math.sin(angle) * r;
             if (i === 0) shape.moveTo(x, y);
             else shape.lineTo(x, y);
        }
        shape.closePath();
        const geom = new THREE.ExtrudeGeometry(shape, {
            depth: 0.4, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05, bevelSegments: 3
        });
        geom.center(); 
        return geom;
    }, []);

    return (
        <group ref={ref}>
             <mesh geometry={starGeometry}>
                 <meshStandardMaterial 
                    color="#FFD700" emissive="#FFD700" emissiveIntensity={2} 
                    roughness={0.1} metalness={0.8} 
                 />
             </mesh>
             <pointLight distance={10} intensity={2} color="#FFD700" />
        </group>
    );
};

export const Ornaments: React.FC<OrnamentsProps> = ({ progress, gestureState }) => {
  const balls = useMemo(() => generateOrnamentData(APP_CONFIG.counts.balls, 'ball', 0), []);
  const gifts = useMemo(() => generateOrnamentData(APP_CONFIG.counts.gifts, 'gift', 1000), []);
  // Removed baseGifts here
  const candies = useMemo(() => generateOrnamentData(APP_CONFIG.counts.candies, 'candy', 2000), []);
  
  const snowflakes = useMemo(() => generateOrnamentData(APP_CONFIG.counts.snowflakes, 'snowflake', 3000), []);
  const gingerbreads = useMemo(() => generateOrnamentData(APP_CONFIG.counts.gingerbread, 'gingerbread', 4000), []);
  const reindeers = useMemo(() => generateOrnamentData(APP_CONFIG.counts.reindeer, 'reindeer', 5000), []);
  
  // New Elements
  const glitter = useMemo(() => generateOrnamentData(APP_CONFIG.counts.glitter, 'glitter', 6000), []);
  const ribbon = useMemo(() => generateOrnamentData(APP_CONFIG.counts.ribbon, 'ribbon', 7000), []);

  // --- Geometries ---

  // Candy Cane
  const candyGeometry = useMemo(() => {
    class CustomSinCurve extends THREE.Curve<THREE.Vector3> {
        scale: number;
        constructor(scale = 1) { super(); this.scale = scale; }
        getPoint(t: number, optionalTarget = new THREE.Vector3()) {
            const tx = 0;
            let ty, tz;
            if (t < 0.7) { ty = t * 3.0; tz = 0; } 
            else {
                const angle = ((t - 0.7) / 0.3) * Math.PI; 
                ty = 2.1 + Math.sin(angle) * 0.5;
                tz = - (1.0 - Math.cos(angle)) * 0.5;
            }
            return optionalTarget.set(tx, ty, tz).multiplyScalar(this.scale);
        }
    }
    const path = new CustomSinCurve(1.5);
    const geom = new THREE.TubeGeometry(path, 20, 0.15, 8, false);
    geom.center();
    return geom;
  }, []);

  // Snowflake
  const snowflakeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const spikes = 6;
    const outerR = 1.0;
    const innerR = 0.3;
    for (let i = 0; i < spikes * 2; i++) {
        const a = (i * Math.PI) / spikes;
        const r = i % 2 === 0 ? outerR : innerR;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if(i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
    geom.center();
    return geom;
  }, []);

  // Gingerbread Man
  const gingerbreadGeometry = useMemo(() => {
     const shape = new THREE.Shape();
     shape.moveTo(-0.4, 0.4); 
     shape.lineTo(-0.8, 0.4); 
     shape.lineTo(-0.8, 0.1); 
     shape.lineTo(-0.4, 0.1); 
     shape.lineTo(-0.4, -0.4); 
     shape.lineTo(-0.6, -0.8); 
     shape.lineTo(-0.3, -0.8); 
     shape.lineTo(0.0, -0.5);  
     shape.lineTo(0.3, -0.8);  
     shape.lineTo(0.6, -0.8);  
     shape.lineTo(0.4, -0.4);  
     shape.lineTo(0.4, 0.1);   
     shape.lineTo(0.8, 0.1);   
     shape.lineTo(0.8, 0.4);   
     shape.lineTo(0.4, 0.4);   
     shape.absarc(0, 0.65, 0.35, 0, Math.PI * 2);
     const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 });
     geom.center();
     return geom;
  }, []);

  // Reindeer Head
  const reindeerGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); 
    shape.lineTo(0.4, 0.2); 
    shape.lineTo(0.5, 0.5); 
    shape.lineTo(0.8, 1.2); 
    shape.lineTo(0.7, 1.2);
    shape.lineTo(0.5, 0.7); 
    shape.lineTo(0.3, 1.1);
    shape.lineTo(0.2, 1.1);
    shape.lineTo(0.3, 0.6); 
    shape.lineTo(0.1, 0.8); 
    shape.lineTo(0.0, 0.6);
    shape.lineTo(-0.2, 0.3); 
    shape.lineTo(-0.2, -0.2); 
    shape.lineTo(0.1, -0.1); 
    shape.lineTo(0, 0); 
    const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.05 });
    geom.center();
    return geom;
  }, []);

  return (
    <>
      <TreeStar progress={progress} />

      <Instances range={APP_CONFIG.counts.balls}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial roughness={0.3} metalness={0.4} envMapIntensity={1.5} />
        {balls.map((data, i) => (
          <MovingInstance key={i} data={data} progress={progress} />
        ))}
      </Instances>

      <Instances range={APP_CONFIG.counts.gifts}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.4} metalness={0.3} envMapIntensity={1} />
        {gifts.map((data, i) => (
          <MovingInstance key={i} data={data} progress={progress} />
        ))}
      </Instances>

      {/* Removed Base Gifts Instances */}

      <Instances range={APP_CONFIG.counts.candies} geometry={candyGeometry}>
         <meshStandardMaterial color={APP_CONFIG.colors.red} roughness={0.2} metalness={0.1} />
         {candies.map((data, i) => (
          <MovingInstance key={i} data={data} progress={progress} />
        ))}
      </Instances>

      <Instances range={APP_CONFIG.counts.snowflakes} geometry={snowflakeGeometry}>
         <meshStandardMaterial color={APP_CONFIG.colors.silver} roughness={0.2} metalness={0.8} emissive={APP_CONFIG.colors.silver} emissiveIntensity={0.2} />
         {snowflakes.map((data, i) => (
          <MovingInstance key={i} data={data} progress={progress} />
        ))}
      </Instances>

      <Instances range={APP_CONFIG.counts.gingerbread} geometry={gingerbreadGeometry}>
         <meshStandardMaterial color={APP_CONFIG.colors.cookie} roughness={0.9} metalness={0.0} />
         {gingerbreads.map((data, i) => (
          <MovingInstance key={i} data={data} progress={progress} />
        ))}
      </Instances>
      
      <Instances range={APP_CONFIG.counts.reindeer} geometry={reindeerGeometry}>
         <meshStandardMaterial color={APP_CONFIG.colors.darkGold} roughness={0.3} metalness={0.6} />
         {reindeers.map((data, i) => (
          <MovingInstance key={i} data={data} progress={progress} />
        ))}
      </Instances>
      
      {/* Glitter Balls - High emissive intensity for bloom */}
      <Instances range={APP_CONFIG.counts.glitter}>
         <sphereGeometry args={[1, 16, 16]} />
         <meshStandardMaterial 
            color="#FFF" 
            emissive="#FFF" 
            emissiveIntensity={3} 
            toneMapped={false} 
         />
         {glitter.map((data, i) => (
          <MovingInstance key={i} data={data} progress={progress} />
        ))}
      </Instances>

      {/* Ribbon Segments - Thin metallic boxes that form a spiral */}
      <Instances range={APP_CONFIG.counts.ribbon}>
         <boxGeometry args={[0.3, 0.05, 0.8]} />
         <meshStandardMaterial 
            color={APP_CONFIG.colors.ribbon} 
            roughness={0.1} 
            metalness={1.0} 
            envMapIntensity={2} 
            side={THREE.DoubleSide}
         />
         {ribbon.map((data, i) => (
          <MovingInstance key={i} data={data} progress={progress} />
        ))}
      </Instances>
      
      <PolaroidImages progress={progress} gestureState={gestureState} />
    </>
  );
};