import { useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { GestureType } from "@/components/GestureDetector";

interface GestureCameraControllerProps {
  gesture: GestureType;
  yaw: number | null;
  roll: number | null;
  isFistClosed: boolean;
}

export function GestureCameraController({ 
  gesture, 
  yaw, 
  roll, 
  isFistClosed 
}: GestureCameraControllerProps) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
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
    
    // Fist rotation - orbit camera around target
    if (isFistClosed && yaw !== null && roll !== null) {
      if (lastYawRef.current !== null && lastRollRef.current !== null) {
        const yawDelta = yaw - lastYawRef.current;
        const rollDelta = roll - lastRollRef.current;
        
        // Dead zone - ignore small movements
        const deadZone = 2;
        
        if (Math.abs(yawDelta) > deadZone) {
          // Orbit around Y axis (yaw)
          const offset = new THREE.Vector3().subVectors(camera.position, targetRef.current);
          const clampedYawDelta = THREE.MathUtils.clamp(yawDelta, -15, 15);
          const quaternion = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), 
            THREE.MathUtils.degToRad(clampedYawDelta * rotateSpeed)
          );
          offset.applyQuaternion(quaternion);
          camera.position.copy(targetRef.current).add(offset);
        }
        
        if (Math.abs(rollDelta) > deadZone) {
          // Adjust height based on roll
          const clampedRollDelta = THREE.MathUtils.clamp(rollDelta, -15, 15);
          camera.position.y += clampedRollDelta * rotateSpeed * 0.3;
        }
      }
      
      lastYawRef.current = yaw;
      lastRollRef.current = roll;
    } else {
      lastYawRef.current = null;
      lastRollRef.current = null;
    }
    
    // Always look at target
    camera.lookAt(targetRef.current);
  });
  
  return null;
}
