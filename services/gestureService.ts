import { FilesetResolver, HandLandmarker, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/+esm";

let handLandmarker: HandLandmarker | null = null;
let runningMode: "IMAGE" | "VIDEO" = "VIDEO";

// State for relative zoom control
let initialScale: number | null = null;
let lossCounter = 0;
const RESET_THRESHOLD = 30; // Frames to wait before resetting calibration (approx 0.5-1s)

export const initializeHandLandmarker = async () => {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
        delegate: "GPU"
      },
      runningMode: runningMode,
      numHands: 1
    });
    return true;
  } catch (e) {
    console.error("Failed to init MediaPipe", e);
    return false;
  }
};

export const detectHands = (video: HTMLVideoElement) => {
  if (!handLandmarker) return null;

  const startTimeMs = performance.now();
  const results = handLandmarker.detectForVideo(video, startTimeMs);

  if (results.landmarks && results.landmarks.length > 0) {
    // Reset loss counter since we found a hand
    lossCounter = 0;

    const landmarks = results.landmarks[0];
    const wrist = landmarks[0];
    
    // Fingers
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const mcp = landmarks[9]; // Middle finger MCP

    // Reference scale: distance from wrist to Middle Finger MCP (Palm size proxy)
    // This is much more stable than finger tips when opening/closing hand
    const scale = Math.sqrt(Math.pow(mcp.x - wrist.x, 2) + Math.pow(mcp.y - wrist.y, 2));

    // 1. OPEN/CLOSED Logic (Chaos Trigger)
    const tips = [indexTip, middleTip, ringTip, pinkyTip]; 
    let avgDist = 0;
    tips.forEach(p => {
      const d = Math.sqrt(Math.pow(p.x - wrist.x, 2) + Math.pow(p.y - wrist.y, 2));
      avgDist += d;
    });
    avgDist /= 4;
    const isOpen = avgDist > (scale * 1.5); 

    // 2. OK GESTURE Logic (Photo Grab)
    // Thumb and Index close together, others extended
    const pinchDist = Math.sqrt(Math.pow(thumbTip.x - indexTip.x, 2) + Math.pow(thumbTip.y - indexTip.y, 2));
    const isPinching = pinchDist < (scale * 0.5); // Tolerance for pinch
    
    // Check if other fingers are extended (to differentiate from a closed fist)
    const middleDist = Math.sqrt(Math.pow(middleTip.x - wrist.x, 2) + Math.pow(middleTip.y - wrist.y, 2));
    const ringDist = Math.sqrt(Math.pow(ringTip.x - wrist.x, 2) + Math.pow(ringTip.y - wrist.y, 2));
    // If middle and ring are extended and pinch is happening -> OK gesture
    const isOk = isPinching && (middleDist > scale) && (ringDist > scale);

    // 3. POSITION Control
    // Invert X for mirror effect
    const centerX = 1.0 - mcp.x; 
    const centerY = mcp.y;

    // 4. ZOOM Control (Relative Mode)
    // If this is the start of a session, store the initial scale
    if (initialScale === null) {
        initialScale = scale;
    }

    // We calculate zoom relative to the initial hand size.
    // The neutral position (delta = 0) should correspond to the default camera distance.
    // In Scene.tsx, the range is [55, 10]. Default Z is 24.
    // 24 = 55(1-z) + 10(z)  => 24 = 55 - 55z + 10z => 24 = 55 - 45z => 45z = 31 => z = 0.68
    const neutralZoom = 0.68;
    
    // Sensitivity: High value means small hand movements create large zoom changes.
    // Lowered from 6.0 to 2.5 to require LARGER hand movements for control.
    const sensitivity = 2.5; 
    
    const scaleDelta = scale - initialScale;
    const zoomRaw = neutralZoom + (scaleDelta * sensitivity);
    const zoom = Math.max(0, Math.min(1, zoomRaw));

    return {
      isHandDetected: true,
      isOpen,
      isOk,
      handPosition: { x: (centerX * 2) - 1, y: (centerY * 2) - 1 }, // -1 to 1
      zoom
    };
  }

  // Handle Hand Loss with Debounce
  lossCounter++;
  if (lossCounter > RESET_THRESHOLD) {
    initialScale = null; // Reset calibration after sustained hand loss
  }

  return { isHandDetected: false, isOpen: false, isOk: false, handPosition: {x: 0, y: 0}, zoom: 0 };
};