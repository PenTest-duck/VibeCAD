import { useState, useEffect, useRef } from "react";
import { GestureType } from "@/components/GestureDetector";

export function useSmoothedGesture(
  gesture: GestureType,
  pitch: number | null,
  yaw: number | null,
  roll: number | null,
  isFistClosed: boolean,
  smoothingFrames: number = 1 // NO BUFFERING - instant response like Inventor
) {
  const lastGestureRef = useRef<GestureType>("UNKNOWN");
  const [smoothedGesture, setSmoothedGesture] = useState<GestureType>("UNKNOWN");
  
  // Use refs to track smoothed values to avoid infinite loops
  const smoothedPitchRef = useRef<number | null>(null);
  const smoothedYawRef = useRef<number | null>(null);
  const smoothedRollRef = useRef<number | null>(null);
  
  const [smoothedPitch, setSmoothedPitch] = useState<number | null>(null);
  const [smoothedYaw, setSmoothedYaw] = useState<number | null>(null);
  const [smoothedRoll, setSmoothedRoll] = useState<number | null>(null);

  useEffect(() => {
    // INSTANT gesture detection - no buffering, no delay
    // Just pass through the gesture immediately like Inventor does
    if (gesture !== lastGestureRef.current) {
      setSmoothedGesture(gesture);
      lastGestureRef.current = gesture;
    }
  }, [gesture]);

  // MINIMAL smoothing for orientation - very light, just to prevent jitter
  useEffect(() => {
    if (pitch !== null && !isNaN(pitch) && isFinite(pitch)) {
      if (smoothedPitchRef.current === null) {
        smoothedPitchRef.current = pitch;
        setSmoothedPitch(pitch);
      } else {
        // Very light smoothing - 85% new, 15% old (almost instant)
        const smoothed = pitch * 0.85 + smoothedPitchRef.current * 0.15;
        smoothedPitchRef.current = smoothed;
        setSmoothedPitch(smoothed);
      }
    } else {
      smoothedPitchRef.current = null;
      setSmoothedPitch(null);
    }
  }, [pitch]); // Only depend on pitch, not smoothedPitch

  useEffect(() => {
    if (yaw !== null && !isNaN(yaw) && isFinite(yaw)) {
      if (smoothedYawRef.current === null) {
        smoothedYawRef.current = yaw;
        setSmoothedYaw(yaw);
      } else {
        // Very light smoothing - 85% new, 15% old (almost instant)
        const smoothed = yaw * 0.85 + smoothedYawRef.current * 0.15;
        smoothedYawRef.current = smoothed;
        setSmoothedYaw(smoothed);
      }
    } else {
      smoothedYawRef.current = null;
      setSmoothedYaw(null);
    }
  }, [yaw]); // Only depend on yaw, not smoothedYaw

  useEffect(() => {
    if (roll !== null && !isNaN(roll) && isFinite(roll)) {
      if (smoothedRollRef.current === null) {
        smoothedRollRef.current = roll;
        setSmoothedRoll(roll);
      } else {
        // Very light smoothing - 85% new, 15% old (almost instant)
        const smoothed = roll * 0.85 + smoothedRollRef.current * 0.15;
        smoothedRollRef.current = smoothed;
        setSmoothedRoll(smoothed);
      }
    } else {
      smoothedRollRef.current = null;
      setSmoothedRoll(null);
    }
  }, [roll]); // Only depend on roll, not smoothedRoll

  return {
    gesture: smoothedGesture,
    pitch: smoothedPitch,
    yaw: smoothedYaw,
    roll: smoothedRoll,
    isFistClosed
  };
}
