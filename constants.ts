import { Color } from 'three';

export const APP_CONFIG = {
  colors: {
    bg: '#05160e', // Slightly lighter deep green background
    emerald: '#107A48', // Brighter, more vibrant emerald
    gold: '#FFDF4F', // Lighter, more champagne-like gold
    goldHighlight: '#FFFBE6',
    red: '#D92B2B', // Brighter, festive red
    warmWhite: '#FFFEE0',
    silver: '#E0F7FA', // Icy silver for snowflakes
    cookie: '#C17E46', // Gingerbread color
    darkGold: '#B8860B', // Reindeer color
    diamond: '#FFFFFF', // Glitter color
    ribbon: '#FFD700', // Gold Ribbon
  },
  counts: {
    needles: 2000, 
    balls: 80,
    gifts: 60,
    baseGifts: 0, // Removed base gifts
    candies: 30,
    photos: 12, // Increased slightly
    snowflakes: 25,
    gingerbread: 20,
    reindeer: 20,
    glitter: 60, // New: Sparkling balls
    ribbon: 400, // New: Segments creating a spiral ribbon
    snow: 1500, 
  },
  camera: {
    // Look at 0,0,0
    defaultPos: [0, 2, 24] as [number, number, number],
  },
  tree: {
    height: 12,
    radius: 4.5,
  }
};

// Vertex Shader for Particles (GPU interpolation)
export const NEEDLE_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uProgress; // 0 = Formed, 1 = Chaos
  
  attribute vec3 aChaosPos;
  attribute vec3 aTargetPos;
  attribute float aPhase;
  attribute float aSize;
  
  varying vec3 vColor;
  
  // Vibrant saturated colors for Normal Blending
  const vec3 cEmerald = vec3(0.0, 0.8, 0.3); 
  const vec3 cGold = vec3(1.0, 0.7, 0.1);
  const vec3 cRed = vec3(1.0, 0.2, 0.2);
  
  void main() {
    // Cubic bezier ease for smooth transition
    float t = uProgress;
    float ease = t * t * (3.0 - 2.0 * t);
    
    // Interpolate position
    vec3 newPos = mix(aTargetPos, aChaosPos, ease);
    
    // Add some wind/floating movement
    float wave = sin(uTime * 2.0 + aPhase) * 0.1;
    newPos.y += wave;
    newPos.x += cos(uTime + aPhase) * 0.05;
    
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    
    gl_Position = projectionMatrix * mvPosition;
    
    // Size attenuation
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    
    // Mix color based on height and chaos
    float heightMix = (aTargetPos.y + 5.0) / 15.0;
    
    // Base gradient from Emerald to Gold
    vec3 baseColor = mix(cEmerald, cGold, heightMix * 0.5 + ease * 0.5);
    
    // Add occasional color variation based on phase for detail
    float variation = sin(aPhase * 15.0);
    if (variation > 0.95) {
       baseColor = cRed; // Occasional red sparkles
    } else if (variation < -0.9) {
       baseColor = cGold * 1.2; // Extra bright gold sparkles
    }
    
    vColor = baseColor;
  }
`;

export const NEEDLE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  
  void main() {
    // Circular particle
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    
    // Soft edge but more solid center for clearer color
    float alpha = 1.0 - smoothstep(0.5, 1.0, r);
    
    gl_FragColor = vec4(vColor, alpha * 0.9);
  }
`;