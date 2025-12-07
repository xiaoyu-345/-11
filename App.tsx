import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Scene } from './components/Scene';
import { initializeHandLandmarker, detectHands } from './services/gestureService';
import { GestureState } from './types';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Gesture State
  const [gestureState, setGestureState] = useState<GestureState>({
    isHandDetected: false,
    isOpen: false,
    isOk: false,
    handPosition: { x: 0, y: 0 },
    zoom: 0
  });

  // Target Progress: 0 = Formed, 1 = Chaos
  const [targetProgress, setTargetProgress] = useState(0);
  
  // Smooth progress for ThreeJS
  const progressRef = useRef(0);
  const [renderProgress, setRenderProgress] = useState(0);
  
  // Reset Trigger
  const [resetTrigger, setResetTrigger] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(0);

  // Initialize MediaPipe and Camera
  useEffect(() => {
    const init = async () => {
      const success = await initializeHandLandmarker();
      if (!success) {
        setCameraError("Failed to load gesture recognition model.");
      }
      setLoading(false);
    };
    init();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener('loadeddata', predictWebcam);
        setPermissionGranted(true);
      }
    } catch (err) {
      setCameraError("Camera permission denied. The visual experience will still work in auto-mode.");
      setPermissionGranted(false);
    }
  };

  const predictWebcam = () => {
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const result = detectHands(videoRef.current);
      if (result) {
        setGestureState(result);
        setTargetProgress(result.isOpen ? 1 : 0);
      } else {
         // If hand lost, don't immediately reset target progress, let it linger or reset?
         // We reset to 0 (Formed) if hand is lost usually
         setTargetProgress(0);
      }
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  // Smooth progress interpolation loop
  useEffect(() => {
    let frameId: number;
    const animateProgress = () => {
        const diff = targetProgress - progressRef.current;
        // Move towards target
        progressRef.current += diff * 0.05; 
        setRenderProgress(progressRef.current);
        frameId = requestAnimationFrame(animateProgress);
    };
    frameId = requestAnimationFrame(animateProgress);
    return () => cancelAnimationFrame(frameId);
  }, [targetProgress]);

  const handleReset = () => {
      setTargetProgress(0);
      setResetTrigger(prev => prev + 1);
      // We don't stop the camera, but we force the state to look reset
  };

  return (
    <div className="relative w-full h-screen bg-[#020b05] text-white overflow-hidden font-serif">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas 
          dpr={[1, 2]} 
          gl={{ 
            antialias: false, 
            toneMapping: THREE.ACESFilmicToneMapping, 
            toneMappingExposure: 0.8 
          }}
        >
          <Scene progress={renderProgress} gestureState={gestureState} resetTrigger={resetTrigger} />
        </Canvas>
      </div>

      {/* Overlay UI */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8">
        
        {/* Header */}
        <header className="flex justify-between items-start">
          <div className="border-l-4 border-[#FFD700] pl-4 bg-black/20 backdrop-blur-sm p-2 rounded-r-lg pointer-events-auto">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" style={{ fontFamily: '"Cinzel", serif' }}>
              GRAND CHRISTMAS
            </h1>
            <p className="text-emerald-400 text-sm md:text-base uppercase tracking-widest mt-1 font-light">Interactive Luxury Edition</p>
          </div>
          
          <div className="text-right hidden md:block bg-black/20 backdrop-blur-sm p-2 rounded-l-lg">
            <p className="text-[10px] text-emerald-600 uppercase tracking-widest">Status</p>
            <p className={`text-lg font-bold ${gestureState.isHandDetected ? 'text-[#FFD700]' : 'text-gray-600'}`}>
              {gestureState.isHandDetected 
                ? (gestureState.isOk ? "PHOTO VIEW" : (gestureState.isOpen ? "UNLEASHED" : "FORMING")) 
                : "AWAITING GESTURE"}
            </p>
          </div>
        </header>

        {/* Footer */}
        <footer className="text-center md:text-right text-emerald-800 text-[10px] uppercase tracking-widest font-bold opacity-50">
             Powered by React 19 & Three.js Fiber
        </footer>
      </div>

      {/* Control Box - Bottom Left */}
      <div className="absolute bottom-8 left-8 z-20 w-56 bg-black/40 backdrop-blur-md border border-[#FFD700]/30 p-4 rounded-lg text-center shadow-lg transform transition-transform hover:scale-105 origin-bottom-left">
            
            <video ref={videoRef} autoPlay playsInline className="hidden" style={{ transform: 'scaleX(-1)' }}></video>
            
            {!permissionGranted && !cameraError && !loading && (
                <div className="space-y-2">
                    <p className="text-emerald-100 text-xs font-light leading-tight">
                        Gestures: Open Hand (Explode), Pinch OK (View Photo), Move Closer (Zoom). <br/>
                    </p>
                    <button 
                        onClick={startCamera}
                        className="bg-[#FFD700] text-[#004225] w-full py-1.5 text-xs font-bold tracking-wider hover:bg-white transition-all shadow-[0_0_10px_rgba(255,215,0,0.3)]"
                    >
                        Enable Camera
                    </button>
                </div>
            )}

            {cameraError && (
                 <div className="text-red-400 text-[10px] mb-2 border border-red-900/50 p-1">
                    {cameraError}
                 </div>
            )}

            {loading && (
                <p className="text-[#FFD700] text-xs animate-pulse">Initializing...</p>
            )}

            {/* Manual Fallback & Reset */}
            <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                 <button 
                    onMouseDown={() => setTargetProgress(1)}
                    onMouseUp={() => setTargetProgress(0)}
                    onTouchStart={() => setTargetProgress(1)}
                    onTouchEnd={() => setTargetProgress(0)}
                    className="w-full border border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700] hover:text-black py-1.5 text-[10px] transition-colors uppercase tracking-widest"
                 >
                    Hold to Explode
                 </button>

                 <button 
                    onClick={handleReset}
                    className="w-full bg-emerald-900/50 border border-emerald-500/50 text-emerald-100 hover:bg-emerald-800 py-1.5 text-[10px] transition-colors uppercase tracking-widest"
                 >
                    Reset View
                 </button>
            </div>
      </div>

    </div>
  );
};

export default App;