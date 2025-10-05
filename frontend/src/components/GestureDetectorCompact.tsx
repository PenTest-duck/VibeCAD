"use client";

import { useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker, HandLandmarkerResult, NormalizedLandmark } from "@mediapipe/tasks-vision";

type GestureType = "ZOOM OUT" | "ZOOM IN" | "UP" | "DOWN" | "LEFT" | "RIGHT" | "UNKNOWN";

interface GestureDetectorCompactProps {
  onGestureChange?: (gesture: GestureType) => void;
  onOrientationChange?: (yaw: number | null, roll: number | null) => void;
  onFistChange?: (isFistClosed: boolean) => void;
}

export default function GestureDetectorCompact({
  onGestureChange,
  onOrientationChange,
  onFistChange
}: GestureDetectorCompactProps) {
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
          video: { width: 640, height: 480 }
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

  // Gesture detection functions
  const distance = (p1: NormalizedLandmark, p2: NormalizedLandmark): number => {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  };

  const normalizeAngle = (angle: number): number => {
    return ((angle + 180) % 360) - 180;
  };

  const crossProduct = (v1: number[], v2: number[]): number[] => {
    return [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0]
    ];
  };

  const normalize3D = (v: number[]): number[] => {
    const norm = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    return [v[0] / (norm + 1e-6), v[1] / (norm + 1e-6), v[2] / (norm + 1e-6)];
  };

  const getHandOrientation = (landmarks: NormalizedLandmark[]): { yaw: number; roll: number } | null => {
    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];
    const middleMcp = landmarks[9];

    const w = [wrist.x, wrist.y, wrist.z || 0];
    const i = [indexMcp.x, indexMcp.y, indexMcp.z || 0];
    const p = [pinkyMcp.x, pinkyMcp.y, pinkyMcp.z || 0];
    const m = [middleMcp.x, middleMcp.y, middleMcp.z || 0];

    const v1 = [i[0] - w[0], i[1] - w[1], i[2] - w[2]];
    const v2 = [p[0] - w[0], p[1] - w[1], p[2] - w[2]];
    const normal = normalize3D(crossProduct(v1, v2));

    const forward = [m[0] - w[0], m[1] - w[1], m[2] - w[2]];
    const normalizedForward = normalize3D(forward);

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
    const v1 = [pip.x - mcp.x, pip.y - mcp.y];
    const v2 = [tip.x - pip.x, tip.y - pip.y];

    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const norm1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2);
    const norm2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2);

    const cosAngle = dot / (norm1 * norm2 + 1e-6);

    return cosAngle > threshold;
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
    const states = fingersUp(landmarks);
    return states.reduce((sum, val) => sum + val, 0) === 0;
  };

  const detectDirection = (landmarks: NormalizedLandmark[]): string => {
    const wrist = landmarks[0];
    const indexTip = landmarks[8];

    const dx = wrist.x - indexTip.x;
    const dy = wrist.y - indexTip.y;

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    if (angle >= 45 && angle <= 135) {
      return "UP";
    } else if (angle >= -135 && angle <= -45) {
      return "DOWN";
    } else if (angle > -45 && angle < 45) {
      return "RIGHT";
    } else {
      return "LEFT";
    }
  };

  const detectGesture = (landmarks: NormalizedLandmark[]): GestureType => {
    const states = fingersUp(landmarks);
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const pinchDistance = distance(thumbTip, indexTip);

    if (states.join("") === "1111") {
      return "ZOOM OUT";
    } else if (pinchDistance < 0.05) {
      return "ZOOM IN";
    } else if (states.join("") === "1000") {
      return detectDirection(landmarks) as GestureType;
    } else {
      return "UNKNOWN";
    }
  };

  const drawHandLandmarks = (
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    width: number,
    height: number
  ) => {
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20],
      [0, 17]
    ];

    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 1.5;

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(startPoint.x * width, startPoint.y * height);
      ctx.lineTo(endPoint.x * width, endPoint.y * height);
      ctx.stroke();
    });

    ctx.fillStyle = "#FF0000";
    landmarks.forEach((landmark) => {
      ctx.beginPath();
      ctx.arc(landmark.x * width, landmark.y * height, 3, 0, 2 * Math.PI);
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

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;

        const results: HandLandmarkerResult = handLandmarker.detectForVideo(
          video,
          performance.now()
        );

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height);

          const gesture = detectGesture(landmarks);
          setCurrentGesture(gesture);
          
          const fistClosed = isFistClosedCheck(landmarks);
          setIsFistClosed(fistClosed);
          
          let displayText = "";
          
          if (gesture !== "UNKNOWN") {
            displayText = gesture;
            setYaw(null);
            setRoll(null);
          } else if (fistClosed) {
            const orientation = getHandOrientation(landmarks);
            if (orientation) {
              setYaw(orientation.yaw);
              setRoll(orientation.roll);
              displayText = `Y:${orientation.yaw.toFixed(0)}° R:${orientation.roll.toFixed(0)}°`;
            }
          } else {
            displayText = "NONE";
            setYaw(null);
            setRoll(null);
          }

          // Draw text on canvas (unmirrored)
          ctx.save();
          ctx.scale(-1, 1);
          ctx.font = "bold 16px Arial";
          ctx.fillStyle = "#00FF00";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.strokeText(displayText, -canvas.width + 10, 25);
          ctx.fillText(displayText, -canvas.width + 10, 25);
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
    <div className="relative w-64 h-48 bg-black rounded-lg overflow-hidden shadow-xl border-2 border-neutral-700">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-xs bg-black/80 z-10">
          Loading...
        </div>
      )}
      
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
        style={{ transform: "scaleX(-1)" }}
      />
      
      {/* Status indicator */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <div className={`text-xs font-bold px-2 py-1 rounded ${
          currentGesture !== "UNKNOWN" ? "bg-green-600/80" : "bg-neutral-800/80"
        } text-white`}>
          {currentGesture !== "UNKNOWN" ? "🎯 Active" : "👋 Show hand"}
        </div>
      </div>
    </div>
  );
}

export type { GestureType };
