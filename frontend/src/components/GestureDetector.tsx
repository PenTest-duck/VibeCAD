"use client";

import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker, HandLandmarkerResult, NormalizedLandmark } from "@mediapipe/tasks-vision";

type GestureType = "ZOOM OUT" | "ZOOM IN" | "UP" | "DOWN" | "LEFT" | "RIGHT" | "UNKNOWN";

interface GestureDetectorProps {
  onGestureChange?: (gesture: GestureType) => void;
  onOrientationChange?: (yaw: number | null, roll: number | null) => void;
  onFistChange?: (isFistClosed: boolean) => void;
}

export default function GestureDetector({
  onGestureChange,
  onOrientationChange,
  onFistChange
}: GestureDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentGesture, setCurrentGesture] = useState<GestureType>("UNKNOWN");
  const [yaw, setYaw] = useState<number | null>(null);
  const [roll, setRoll] = useState<number | null>(null);
  const [isFistClosed, setIsFistClosed] = useState(false);
  const animationFrameRef = useRef<number>(0);

  // Initialize MediaPipe HandLandmarker
  useEffect(() => {
    const initializeHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        const handLandmarkerInstance = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        setHandLandmarker(handLandmarkerInstance);
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing HandLandmarker:", error);
        setIsLoading(false);
      }
    };

    initializeHandLandmarker();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Start webcam
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    };

    startWebcam();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Gesture detection functions (migrated from Python)
  
  const distance = (p1: NormalizedLandmark, p2: NormalizedLandmark): number => {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  };

  const normalizeAngle = (angle: number): number => {
    // Normalize any angle (degrees) to the range (-180, 180]
    return ((angle + 180) % 360) - 180;
  };

  const crossProduct = (v1: number[], v2: number[]): number[] => {
    // Calculate cross product of two 3D vectors
    return [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0]
    ];
  };

  const normalize3D = (v: number[]): number[] => {
    // Normalize a 3D vector
    const norm = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    return [v[0] / (norm + 1e-6), v[1] / (norm + 1e-6), v[2] / (norm + 1e-6)];
  };

  const getHandOrientation = (landmarks: NormalizedLandmark[]): { yaw: number; roll: number } | null => {
    // Estimates hand orientation (yaw, roll) in degrees using MediaPipe landmarks
    // Key landmarks for palm plane
    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];
    const middleMcp = landmarks[9];

    // Convert to 3D arrays
    const w = [wrist.x, wrist.y, wrist.z || 0];
    const i = [indexMcp.x, indexMcp.y, indexMcp.z || 0];
    const p = [pinkyMcp.x, pinkyMcp.y, pinkyMcp.z || 0];
    const m = [middleMcp.x, middleMcp.y, middleMcp.z || 0];

    // Palm plane normal vector
    const v1 = [i[0] - w[0], i[1] - w[1], i[2] - w[2]];
    const v2 = [p[0] - w[0], p[1] - w[1], p[2] - w[2]];
    const normal = normalize3D(crossProduct(v1, v2));

    // Palm forward vector (wrist → middle finger)
    const forward = [m[0] - w[0], m[1] - w[1], m[2] - w[2]];
    const normalizedForward = normalize3D(forward);

    // Compute orientation angles
    const yaw = (Math.atan2(normal[0], normal[2]) * 180) / Math.PI;
    const roll = (Math.atan2(normalizedForward[1], normalizedForward[0]) * 180) / Math.PI;

    return {
      yaw,
      roll: normalizeAngle(roll + 100)
    };
  };

  const isFingerExtended = (
    tip: NormalizedLandmark,
    pip: NormalizedLandmark,
    mcp: NormalizedLandmark,
    threshold: number = 0.7
  ): boolean => {
    // Vectors
    const v1 = [pip.x - mcp.x, pip.y - mcp.y];
    const v2 = [tip.x - pip.x, tip.y - pip.y];

    // Compute cosine similarity
    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const norm1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2);
    const norm2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2);

    const cosAngle = dot / (norm1 * norm2 + 1e-6); // avoid div by zero

    return cosAngle > threshold; // >0.7 means finger is mostly straight
  };

  const fingersUp = (landmarks: NormalizedLandmark[]): number[] => {
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    const mcps = [5, 9, 13, 17];
    const states: number[] = [];

    for (let i = 0; i < tips.length; i++) {
      const tip = landmarks[tips[i]];
      const pip = landmarks[pips[i]];
      const mcp = landmarks[mcps[i]];
      states.push(isFingerExtended(tip, pip, mcp) ? 1 : 0);
    }

    return states;
  };

  const isFistClosedCheck = (landmarks: NormalizedLandmark[]): boolean => {
    // Returns true if all fingers (index, middle, ring, pinky) are folded
    const states = fingersUp(landmarks);
    return states.reduce((sum, val) => sum + val, 0) === 0;
  };

  const detectDirection = (landmarks: NormalizedLandmark[]): string => {
    const wrist = landmarks[0];
    const indexTip = landmarks[8];

    // Flip dx to account for mirrored display (Python flips frame before processing, we only flip display)
    const dx = wrist.x - indexTip.x;
    const dy = wrist.y - indexTip.y; // Invert y for natural coordinate system

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // Angle in degrees (-180 to 180)

    // Cardinal directions with explicit ranges
    if (angle >= 45 && angle <= 135) {
      return "UP";
    } else if (angle >= -135 && angle <= -45) {
      return "DOWN";
    } else if (angle > -45 && angle < 45) {
      return "RIGHT";
    } else {
      // Covers 135 → 180 and -180 → -135
      return "LEFT";
    }
  };

  const detectGesture = (landmarks: NormalizedLandmark[]): GestureType => {
    const states = fingersUp(landmarks);
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const pinchDistance = distance(thumbTip, indexTip);

    // High Five → Zoom Out
    if (states.join("") === "1111") {
      return "ZOOM OUT";
    }
    // Pinch → Zoom In
    else if (pinchDistance < 0.05) {
      return "ZOOM IN";
    }
    // Index finger pointing → detect direction
    else if (states.join("") === "1000") {
      return detectDirection(landmarks) as GestureType;
    } else {
      return "UNKNOWN";
    }
  };

  // Draw hand landmarks on canvas
  const drawHandLandmarks = (
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ) => {
    // Draw connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [0, 17] // Palm
    ];

    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(startPoint.x * width, startPoint.y * height);
      ctx.lineTo(endPoint.x * width, endPoint.y * height);
      ctx.stroke();
    });

    // Draw landmarks
    ctx.fillStyle = "#FF0000";
    landmarks.forEach((landmark) => {
      ctx.beginPath();
      ctx.arc(landmark.x * width, landmark.y * height, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  // Notify parent components of state changes
  useEffect(() => {
    if (onGestureChange) {
      onGestureChange(currentGesture);
    }
  }, [currentGesture, onGestureChange]);

  useEffect(() => {
    if (onOrientationChange) {
      onOrientationChange(yaw, roll);
    }
  }, [yaw, roll, onOrientationChange]);

  useEffect(() => {
    if (onFistChange) {
      onFistChange(isFistClosed);
    }
  }, [isFistClosed, onFistChange]);

  // Process video frames
  useEffect(() => {
    if (!handLandmarker || !videoRef.current || !canvasRef.current) return;

    let lastVideoTime = -1;

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect hand landmarks
      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;

        const results: HandLandmarkerResult = handLandmarker.detectForVideo(
          video,
          performance.now()
        );

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          // Draw landmarks
          drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height);

          // Detect gesture
          const gesture = detectGesture(landmarks);
          setCurrentGesture(gesture);
          
          // Check if fist is closed and get orientation
          const fistClosed = isFistClosedCheck(landmarks);
          setIsFistClosed(fistClosed);
          
          let displayText = "";
          
          if (gesture !== "UNKNOWN") {
            displayText = `Gesture: ${gesture}`;
            console.log(`Gesture detected: ${gesture}`);
            setYaw(null);
            setRoll(null);
          } else if (fistClosed) {
            // Calculate orientation when fist is closed
            const orientation = getHandOrientation(landmarks);
            if (orientation) {
              setYaw(orientation.yaw);
              setRoll(orientation.roll);
              displayText = `Yaw: ${orientation.yaw.toFixed(1)}° | Roll: ${orientation.roll.toFixed(1)}°`;
            }
          } else {
            displayText = "Gesture: NONE";
            setYaw(null);
            setRoll(null);
          }

          // Draw text on canvas (unmirrored)
          ctx.save();
          ctx.scale(-1, 1); // Mirror the text back
          ctx.font = "bold 36px Arial";
          ctx.fillStyle = "#00FF00";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          ctx.strokeText(displayText, -canvas.width + 50, 100);
          ctx.fillText(displayText, -canvas.width + 50, 100);
          ctx.restore();
        } else {
          setCurrentGesture("UNKNOWN");
          setIsFistClosed(false);
          setYaw(null);
          setRoll(null);
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handLandmarker]);

  return (
    <>
      {isLoading && (
        <div className="text-white text-center mb-4">
          Loading MediaPipe Hand Landmarker...
        </div>
      )}

      <div className="relative w-full max-w-4xl mx-auto bg-black rounded-lg overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover opacity-0"
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            if (canvasRef.current) {
              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
            }
          }}
        />
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ transform: "scaleX(-1)" }} // Mirror the video
        />
      </div>

      <div className="mt-6 bg-slate-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white mb-2">
          Current Gesture:
        </h2>
        <div className={`text-3xl font-bold ${
          currentGesture === "UNKNOWN" ? "text-slate-400" : "text-green-400"
        }`}>
          {currentGesture}
        </div>
      </div>

      {/* Orientation display when fist is closed */}
      {isFistClosed && yaw !== null && roll !== null && (
        <div className="mt-6 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg p-6 shadow-lg border-2 border-purple-500">
          <h2 className="text-xl font-semibold text-white mb-4">
            ✊ Fist Detected - Hand Orientation
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Yaw (Left/Right)</div>
              <div className="text-2xl font-bold text-cyan-400">
                {yaw.toFixed(1)}°
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Roll (Twist)</div>
              <div className="text-2xl font-bold text-pink-400">
                {roll.toFixed(1)}°
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-300">
            💡 Make a fist and rotate your hand to see orientation changes
          </div>
        </div>
      )}
    </>
  );
}

export type { GestureType };
