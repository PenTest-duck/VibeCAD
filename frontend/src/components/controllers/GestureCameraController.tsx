import { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { GestureType } from "@/components/GestureDetector";

interface GestureCameraControllerProps {
  gesture: GestureType;
  pitch: number | null;
  yaw: number | null;
  roll: number | null;
  isFistClosed: boolean;
}

export function GestureCameraController({ 
  gesture,
  pitch, 
  yaw, 
  roll, 
  isFistClosed 
}: GestureCameraControllerProps) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const lastPitchRef = useRef<number | null>(null);
  const lastYawRef = useRef<number | null>(null);
  const lastRollRef = useRef<number | null>(null);
  
  useFrame((state, delta) => {
    // Slower, more controlled movement
    const moveSpeed = 5 * delta;
    const zoomSpeed = 6 * delta;
    const rotateSpeed = 0.8 * delta;
    
    // Debug: Log when a non-UNKNOWN gesture is received
    if (gesture !== "UNKNOWN" && Math.random() < 0.1) {
      console.log("Camera gesture:", gesture);
    }
    
    // Directional movements - move camera and target together
    if (gesture === "UP") {
      camera.position.y += moveSpeed;
      targetRef.current.y += moveSpeed;
    } else if (gesture === "DOWN") {
      camera.position.y -= moveSpeed;
      targetRef.current.y -= moveSpeed;
    } else if (gesture === "LEFT") {
      camera.position.x -= moveSpeed;
      targetRef.current.x -= moveSpeed;
    } else if (gesture === "RIGHT") {
      camera.position.x += moveSpeed;
      targetRef.current.x += moveSpeed;
    } else if (gesture === "ZOOM IN") {
      // Move camera towards target
      const direction = new THREE.Vector3();
      direction.subVectors(targetRef.current, camera.position).normalize();
      const distance = camera.position.distanceTo(targetRef.current);
      if (distance > 2) {
        camera.position.addScaledVector(direction, zoomSpeed);
      }
    } else if (gesture === "ZOOM OUT") {
      // Move camera away from target
      const direction = new THREE.Vector3();
      direction.subVectors(targetRef.current, camera.position).normalize();
      const distance = camera.position.distanceTo(targetRef.current);
      if (distance < 80) {
        camera.position.addScaledVector(direction, -zoomSpeed);
      }
    }
    
    // Fist rotation - orbit camera around target using pitch, yaw, and roll
    // Only rotate on ONE axis at a time - the one with the largest change
    if (isFistClosed && pitch !== null && yaw !== null && roll !== null) {
      if (lastPitchRef.current !== null && lastYawRef.current !== null && lastRollRef.current !== null) {
        const pitchDelta = pitch - lastPitchRef.current; // Hand tilting up/down
        const yawDelta = yaw - lastYawRef.current; // Wrist turning horizontally
        const rollDelta = roll - lastRollRef.current; // Fist rotating clockwise/counterclockwise
        
        // Adjusted dead zones for each axis (pitch needs lower threshold)
        const pitchDeadZone = 1.5; // Lower for pitch sensitivity
        const yawDeadZone = 2.5;   // Higher to distinguish from roll
        const rollDeadZone = 2.0;  // Medium for roll
        
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
          if (rotationAxis === 'pitch') {
            // Pitch - orbit around Z axis (hand tilting up/down)
            const offset = new THREE.Vector3().subVectors(camera.position, targetRef.current);
            const clampedPitchDelta = THREE.MathUtils.clamp(pitchDelta, -15, 15);
            const quaternion = new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 0, 1), 
              THREE.MathUtils.degToRad(clampedPitchDelta * 0.9)
            );
            offset.applyQuaternion(quaternion);
            camera.position.copy(targetRef.current).add(offset);
          } else if (rotationAxis === 'yaw') {
            // Yaw - orbit around Y axis (wrist turning horizontally)
            const offset = new THREE.Vector3().subVectors(camera.position, targetRef.current);
            const clampedYawDelta = THREE.MathUtils.clamp(yawDelta, -15, 15);
            const quaternion = new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0), 
              THREE.MathUtils.degToRad(clampedYawDelta * 0.9)
            );
            offset.applyQuaternion(quaternion);
            camera.position.copy(targetRef.current).add(offset);
          } else if (rotationAxis === 'roll') {
            // Roll - orbit around X axis (fist rotating clockwise/counterclockwise)
            const offset = new THREE.Vector3().subVectors(camera.position, targetRef.current);
            const clampedRollDelta = THREE.MathUtils.clamp(rollDelta, -15, 15);
            const quaternion = new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(1, 0, 0), 
              THREE.MathUtils.degToRad(clampedRollDelta * 0.9)
            );
            offset.applyQuaternion(quaternion);
            camera.position.copy(targetRef.current).add(offset);
          }
        }
      }
      
      lastPitchRef.current = pitch;
      lastYawRef.current = yaw;
      lastRollRef.current = roll;
    } else {
      lastPitchRef.current = null;
      lastYawRef.current = null;
      lastRollRef.current = null;
    }
    
    // Always look at target
    camera.lookAt(targetRef.current);
  });
  
  return null;
}
