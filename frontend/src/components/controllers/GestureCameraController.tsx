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
  resetCamera?: boolean;
  rotationEnabled?: boolean;
}

export function GestureCameraController({ 
  gesture,
  pitch, 
  yaw, 
  roll, 
  isFistClosed,
  resetCamera = false,
  rotationEnabled = true
}: GestureCameraControllerProps) {
  const { camera } = useThree();
  // Fixed world origin - like Inventor/SolidWorks, rotation center never changes
  const worldOriginRef = useRef(new THREE.Vector3(0, 0, 0));
  const lastPitchRef = useRef<number | null>(null);
  const lastYawRef = useRef<number | null>(null);
  const lastRollRef = useRef<number | null>(null);
  
  // Handle camera reset (Home button / H key)
  useFrame((state, delta) => {
    if (resetCamera) {
      // Reset camera to default Inventor-like isometric view
      camera.position.set(12, 12, 12);
      worldOriginRef.current.set(0, 0, 0);
      camera.lookAt(worldOriginRef.current);
      return; // Skip other updates this frame
    }
    // Faster movement like Inventor
    const moveSpeed = 8 * delta; // Increased for more responsive panning
    const zoomSpeed = 8 * delta;
    const rotateSpeed = 0.8 * delta;
    
    // PRIORITY 1: Directional movements and zoom - these override rotation completely
    // Like Inventor: Pan in SCREEN SPACE (2D Cartesian), but workspace centered at origin
    if (gesture === "UP" || gesture === "DOWN" || gesture === "LEFT" || gesture === "RIGHT" || gesture === "ZOOM IN" || gesture === "ZOOM OUT") {
      // Directional gestures take priority - stop any rotation
      lastPitchRef.current = null;
      lastYawRef.current = null;
      lastRollRef.current = null;
      
      if (gesture === "UP") {
        // Pan UP - move camera and target together in world Y (like something.tsx)
        camera.position.y += moveSpeed;
        worldOriginRef.current.y += moveSpeed;
      } else if (gesture === "DOWN") {
        // Pan DOWN - move camera and target together in world Y (like something.tsx)
        camera.position.y -= moveSpeed;
        worldOriginRef.current.y -= moveSpeed;
      } else if (gesture === "LEFT") {
        // Pan LEFT - move camera and target together in world X (like something.tsx)
        camera.position.x -= moveSpeed;
        worldOriginRef.current.x -= moveSpeed;
      } else if (gesture === "RIGHT") {
        // Pan RIGHT - move camera and target together in world X (like something.tsx)
        camera.position.x += moveSpeed;
        worldOriginRef.current.x += moveSpeed;
      } else if (gesture === "ZOOM IN") {
        // Move camera towards world origin
        const direction = new THREE.Vector3();
        direction.subVectors(worldOriginRef.current, camera.position).normalize();
        const distance = camera.position.distanceTo(worldOriginRef.current);
        if (distance > 2) {
          camera.position.addScaledVector(direction, zoomSpeed);
        }
      } else if (gesture === "ZOOM OUT") {
        // Move camera away from world origin
        const direction = new THREE.Vector3();
        direction.subVectors(worldOriginRef.current, camera.position).normalize();
        const distance = camera.position.distanceTo(worldOriginRef.current);
        if (distance < 80) {
          camera.position.addScaledVector(direction, -zoomSpeed);
        }
      }
      
      // Always look at world origin after directional movements
      camera.lookAt(worldOriginRef.current);
      return; // Exit early - don't process rotation
    }
    
    // PRIORITY 2: Fist rotation - orbit camera around target using pitch, yaw, and roll
    // Only runs if no directional gesture is active AND rotation is enabled
    // Only rotate on ONE axis at a time - the one with the largest change
    if (rotationEnabled && isFistClosed && pitch !== null && yaw !== null && roll !== null) {
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
          if (rotationAxis === 'pitch') {
            // Pitch - orbit around Z axis at world origin (hand tilting up/down)
            const offset = new THREE.Vector3().subVectors(camera.position, worldOriginRef.current);
            const clampedPitchDelta = THREE.MathUtils.clamp(pitchDelta, -15, 15);
            const quaternion = new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 0, 1), 
              THREE.MathUtils.degToRad(clampedPitchDelta * 0.9)
            );
            offset.applyQuaternion(quaternion);
            camera.position.copy(worldOriginRef.current).add(offset);
          } else if (rotationAxis === 'yaw') {
            // Yaw - orbit around Y axis at world origin (wrist turning horizontally)
            const offset = new THREE.Vector3().subVectors(camera.position, worldOriginRef.current);
            const clampedYawDelta = THREE.MathUtils.clamp(yawDelta, -15, 15);
            const quaternion = new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0), 
              THREE.MathUtils.degToRad(clampedYawDelta * 0.9)
            );
            offset.applyQuaternion(quaternion);
            camera.position.copy(worldOriginRef.current).add(offset);
          } else if (rotationAxis === 'roll') {
            // Roll - orbit around X axis at world origin (fist rotating clockwise/counterclockwise)
            const offset = new THREE.Vector3().subVectors(camera.position, worldOriginRef.current);
            const clampedRollDelta = THREE.MathUtils.clamp(rollDelta, -15, 15);
            const quaternion = new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(1, 0, 0), 
              THREE.MathUtils.degToRad(clampedRollDelta * 0.9)
            );
            offset.applyQuaternion(quaternion);
            camera.position.copy(worldOriginRef.current).add(offset);
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
    
    // Always look at world origin - maintains consistent rotation center
    camera.lookAt(worldOriginRef.current);
  });
  
  return null;
}
