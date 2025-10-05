import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { GestureType } from "@/components/GestureDetector";
import { MovementPlane } from "@/types/sandbox.types";

interface GestureObjectControllerProps {
  selectedObject: THREE.Object3D;
  gesture: GestureType;
  yaw: number | null;
  roll: number | null;
  pitch: number | null;
  isFistClosed: boolean;
  bounds: THREE.Box3;
  scaleEnabled: boolean;
  rotationEnabled: boolean;
  movementPlane: MovementPlane;
}

export function GestureObjectController({ 
  selectedObject,
  gesture,
  yaw, 
  roll,
  pitch,
  isFistClosed,
  bounds,
  scaleEnabled,
  rotationEnabled,
  movementPlane
}: GestureObjectControllerProps) {
  const lastYawRef = useRef<number | null>(null);
  const lastRollRef = useRef<number | null>(null);
  const lastPitchRef = useRef<number | null>(null);
  
  useFrame((state, delta) => {
    // Slower, more precise control
    const moveSpeed = 1.5 * delta;
    const scaleSpeed = 0.00003;
    const rotateSpeed = 1.2 * delta;
    
    // Debug: Log when a zoom gesture is received
    if ((gesture === "ZOOM IN" || gesture === "ZOOM OUT") && Math.random() < 0.2) {
      console.log("Object zoom:", gesture, "Current scale:", selectedObject.scale.x);
    }
    
    // Directional movements and scaling - only when fist is NOT closed (no rotation happening)
    if (!isFistClosed) {
      if (gesture === "UP") {
        if (movementPlane === "XZ") {
          selectedObject.position.z -= moveSpeed;
        } else if (movementPlane === "XY") {
          selectedObject.position.y += moveSpeed;
        } else if (movementPlane === "YZ") {
          selectedObject.position.z -= moveSpeed;
        }
      } else if (gesture === "DOWN") {
        if (movementPlane === "XZ") {
          selectedObject.position.z += moveSpeed;
        } else if (movementPlane === "XY") {
          selectedObject.position.y -= moveSpeed;
        } else if (movementPlane === "YZ") {
          selectedObject.position.z += moveSpeed;
        }
      } else if (gesture === "LEFT") {
        if (movementPlane === "XZ") {
          selectedObject.position.x -= moveSpeed;
        } else if (movementPlane === "XY") {
          selectedObject.position.x -= moveSpeed;
        } else if (movementPlane === "YZ") {
          selectedObject.position.y += moveSpeed;
        }
      } else if (gesture === "RIGHT") {
        if (movementPlane === "XZ") {
          selectedObject.position.x += moveSpeed;
        } else if (movementPlane === "XY") {
          selectedObject.position.x += moveSpeed;
        } else if (movementPlane === "YZ") {
          selectedObject.position.y -= moveSpeed;
        }
      } else if (scaleEnabled && gesture === "ZOOM IN") {
        // Scale down the object
        const currentScale = selectedObject.scale.x;
        if (currentScale > 0.001) {
          const newScale = currentScale - (scaleSpeed * 2);
          selectedObject.scale.setScalar(Math.max(newScale, 0.001));
        }
      } else if (scaleEnabled && gesture === "ZOOM OUT") {
        // Scale up the object
        const currentScale = selectedObject.scale.x;
        if (currentScale < 500) {
          const newScale = currentScale + (scaleSpeed * 2);
          selectedObject.scale.setScalar(Math.min(newScale, 500));
        }
      }
    }
    
    // Fist rotation - rotate the object based on pitch, yaw, and roll (only if enabled)
    // Only rotate on ONE axis at a time - the one with the largest change
    if (rotationEnabled && isFistClosed && pitch !== null && yaw !== null && roll !== null) {
      // Use delta from last frame for smooth rotation
      if (lastPitchRef.current !== null && lastYawRef.current !== null && lastRollRef.current !== null) {
        const pitchDelta = pitch - lastPitchRef.current; // Hand tilting up/down
        const yawDelta = yaw - lastYawRef.current; // Wrist turning horizontally
        const rollDelta = roll - lastRollRef.current; // Fist rotating clockwise/counterclockwise
        
        // Adjusted dead zones for each axis - larger to avoid conflict with cardinal directions
        const pitchDeadZone = 2.5; // Increased from 1.5 for better separation
        const yawDeadZone = 3.5;   // Increased from 2.5 to distinguish from roll
        const rollDeadZone = 3.0;  // Increased from 2.0 for medium sensitivity
        
        // Find which axis has the largest change
        const absPitch = Math.abs(pitchDelta);
        const absYaw = Math.abs(yawDelta);
        const absRoll = Math.abs(rollDelta);
        const maxDelta = Math.max(absPitch, absYaw, absRoll);
        
        // Different dominance requirements for different axes
        let shouldRotate = false;
        let rotationAxis: 'pitch' | 'yaw' | 'roll' | null = null;
        
        if (absPitch === maxDelta && absPitch > pitchDeadZone) {
          // Pitch: needs to be 1.3x larger than others (more sensitive)
          if (absPitch > absYaw * 1.3 && absPitch > absRoll * 1.3) {
            shouldRotate = true;
            rotationAxis = 'pitch';
          }
        } else if (absYaw === maxDelta && absYaw > yawDeadZone) {
          // Yaw: needs to be 1.8x larger than roll (stronger separation from roll)
          if (absYaw > absPitch * 1.4 && absYaw > absRoll * 1.8) {
            shouldRotate = true;
            rotationAxis = 'yaw';
          }
        } else if (absRoll === maxDelta && absRoll > rollDeadZone) {
          // Roll: needs to be 1.6x larger than yaw (distinguish from wrist turning)
          if (absRoll > absPitch * 1.4 && absRoll > absYaw * 1.6) {
            shouldRotate = true;
            rotationAxis = 'roll';
          }
        }
        
        if (shouldRotate && rotationAxis) {
          // Log rotation for debugging (sample 5% of frames)
          if (Math.random() < 0.05) {
            console.log(`Object rotation [${rotationAxis}] - Pitch: ${pitchDelta.toFixed(1)}° Yaw: ${yawDelta.toFixed(1)}° Roll: ${rollDelta.toFixed(1)}°`);
          }

          if (rotationAxis === 'pitch') {
            // Pitch - rotate around Z axis (hand tilting up/down)
            // Object rotates around its own center
            const clampedPitchDelta = THREE.MathUtils.clamp(pitchDelta, -15, 15);
            selectedObject.rotateOnWorldAxis(
              new THREE.Vector3(0, 0, 1), 
              THREE.MathUtils.degToRad(clampedPitchDelta * 1.2)
            );
          } else if (rotationAxis === 'yaw') {
            // Yaw - rotate around Y axis (wrist turning horizontally)
            // Object rotates around its own center
            const clampedYawDelta = THREE.MathUtils.clamp(yawDelta, -15, 15);
            selectedObject.rotateOnWorldAxis(
              new THREE.Vector3(0, 1, 0), 
              THREE.MathUtils.degToRad(clampedYawDelta * 1.2)
            );
          } else if (rotationAxis === 'roll') {
            // Roll - rotate around X axis (fist rotating clockwise/counterclockwise)
            // Object rotates around its own center
            const clampedRollDelta = THREE.MathUtils.clamp(rollDelta, -15, 15);
            selectedObject.rotateOnWorldAxis(
              new THREE.Vector3(1, 0, 0), 
              THREE.MathUtils.degToRad(clampedRollDelta * 1.2)
            );
          }
        }
      }
      
      lastPitchRef.current = pitch;
      lastYawRef.current = yaw;
      lastRollRef.current = roll;
    } else {
      // Reset tracking when fist is not closed
      lastPitchRef.current = null;
      lastYawRef.current = null;
      lastRollRef.current = null;
    }
    // KEY FIX: When fist opens, we DON'T reset the refs!
    // This allows rotation to accumulate across multiple fist gestures,
    // just like pitch_rotation in gesture.py
    
    // Clamp position to bounds
    selectedObject.position.clamp(bounds.min, bounds.max);
  });
  
  return null;
}
