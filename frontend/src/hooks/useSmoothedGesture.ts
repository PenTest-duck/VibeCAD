import { useState, useEffect, useRef } from "react";
import { GestureType } from "@/components/GestureDetector";

export function useSmoothedGesture(
  gesture: GestureType,
  pitch: number | null,
  yaw: number | null,
  roll: number | null,
  isFistClosed: boolean,
  smoothingFrames: number = 2
) {
  const lastGestureRef = useRef<GestureType>("UNKNOWN");
  const lastValidGestureRef = useRef<GestureType>("UNKNOWN");
  const lastValidTimeRef = useRef(Date.now());
  const unknownCountRef = useRef(0);
  const sameGestureCountRef = useRef(0);
  const [smoothedGesture, setSmoothedGesture] = useState<GestureType>("UNKNOWN");
  const [smoothedPitch, setSmoothedPitch] = useState<number | null>(null);
  const [smoothedYaw, setSmoothedYaw] = useState<number | null>(null);
  const [smoothedRoll, setSmoothedRoll] = useState<number | null>(null);

  useEffect(() => {
    const now = Date.now();
    
    // Handle UNKNOWN - clear gesture quickly when hand disappears
    if (gesture === "UNKNOWN") {
      unknownCountRef.current++;
      
      // Special handling for zoom gestures - clear them immediately
      const isZoomGesture = lastValidGestureRef.current === "ZOOM IN" || lastValidGestureRef.current === "ZOOM OUT";
      
      if (isZoomGesture) {
        // Clear zoom gestures immediately - no persistence
        lastValidGestureRef.current = "UNKNOWN";
        setSmoothedGesture("UNKNOWN");
        sameGestureCountRef.current = 0;
        return;
      }
      
      // For non-zoom gestures, only persist for 100ms (very brief - just for momentary tracking loss)
      const timeSinceLastValid = now - lastValidTimeRef.current;
      if (timeSinceLastValid < 100 && lastValidGestureRef.current !== "UNKNOWN") {
        // Keep last gesture very briefly during momentary tracking loss
        setSmoothedGesture(lastValidGestureRef.current);
        return;
      } else {
        // After 100ms or immediately if already UNKNOWN, clear it
        lastValidGestureRef.current = "UNKNOWN";
        setSmoothedGesture("UNKNOWN");
        sameGestureCountRef.current = 0;
      }
      return;
    }
    
    // Reset unknown counter
    unknownCountRef.current = 0;
    
    // Almost immediate pass-through with minimal buffering
    // If same gesture as last frame, accept immediately
    if (gesture === lastGestureRef.current) {
      sameGestureCountRef.current++;
      // Accept after just 1 matching frame
      if (sameGestureCountRef.current >= 1) {
        lastValidGestureRef.current = gesture;
        lastValidTimeRef.current = now;
        setSmoothedGesture(gesture);
      }
    } else {
      // Gesture changed - accept immediately but reset counter
      sameGestureCountRef.current = 1;
      lastValidGestureRef.current = gesture;
      lastValidTimeRef.current = now;
      setSmoothedGesture(gesture);
    }
    
    lastGestureRef.current = gesture;
  }, [gesture, smoothingFrames]);

  // Minimal smoothing for pitch - almost direct pass-through
  useEffect(() => {
    if (pitch !== null && !isNaN(pitch) && isFinite(pitch)) {
      if (smoothedPitch === null) {
        // First value, use directly
        setSmoothedPitch(pitch);
      } else {
        // Very light smoothing - 70% new value, 30% old
        const smoothed = pitch * 0.7 + smoothedPitch * 0.3;
        setSmoothedPitch(smoothed);
      }
    } else {
      setSmoothedPitch(null);
    }
  }, [pitch]);

  // Minimal smoothing for yaw - almost direct pass-through
  useEffect(() => {
    if (yaw !== null && !isNaN(yaw) && isFinite(yaw)) {
      if (smoothedYaw === null) {
        // First value, use directly
        setSmoothedYaw(yaw);
      } else {
        // Very light smoothing - 70% new value, 30% old
        const smoothed = yaw * 0.7 + smoothedYaw * 0.3;
        setSmoothedYaw(smoothed);
      }
    } else {
      setSmoothedYaw(null);
    }
  }, [yaw]);

  // Minimal smoothing for roll - almost direct pass-through
  useEffect(() => {
    if (roll !== null && !isNaN(roll) && isFinite(roll)) {
      if (smoothedRoll === null) {
        // First value, use directly
        setSmoothedRoll(roll);
      } else {
        // Very light smoothing - 70% new value, 30% old
        const smoothed = roll * 0.7 + smoothedRoll * 0.3;
        setSmoothedRoll(smoothed);
      }
    } else {
      setSmoothedRoll(null);
    }
  }, [roll]);

  // Minimal smoothing for pitch - almost direct pass-through
  useEffect(() => {
    if (pitch !== null && !isNaN(pitch) && isFinite(pitch)) {
      if (smoothedPitch === null) {
        // First value, use directly
        setSmoothedPitch(pitch);
      } else {
        // Very light smoothing - 70% new value, 30% old
        const smoothed = pitch * 0.7 + smoothedPitch * 0.3;
        setSmoothedPitch(smoothed);
      }
    } else {
      setSmoothedPitch(null);
    }
  }, [pitch]);

  return {
    gesture: smoothedGesture,
    pitch: smoothedPitch,
    yaw: smoothedYaw,
    roll: smoothedRoll,
    isFistClosed
  };
}
