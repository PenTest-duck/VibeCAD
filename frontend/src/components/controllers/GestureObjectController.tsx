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
  isFistClosed: boolean;
  bounds: THREE.Box3;
  scaleEnabled: boolean;
  movementPlane: MovementPlane;
}

export function GestureObjectController({ 
  selectedObject,
  gesture, 
  yaw, 
  roll, 
  isFistClosed,
  bounds,
  scaleEnabled,
  movementPlane
}: GestureObjectControllerProps) {
  const lastYawRef = useRef<number | null>(null);
  const lastRollRef = useRef<number | null>(null);
  
  useFrame((state, delta) => {
    // Slower, more precise control
    const moveSpeed = 1.5 * delta;
    const scaleSpeed = 0.00003;
    const rotateSpeed = 1.2 * delta;
    
    // Debug: Log when a zoom gesture is received
    if ((gesture === "ZOOM IN" || gesture === "ZOOM OUT") && Math.random() < 0.2) {
      console.log("Object zoom:", gesture, "Current scale:", selectedObject.scale.x);
    }
    
    // Directional movements - translate the object based on selected plane
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
    
    // Fist rotation - rotate the object based on yaw and roll
    if (isFistClosed && yaw !== null && roll !== null) {
      if (lastYawRef.current !== null && lastRollRef.current !== null) {
        const yawDelta = yaw - lastYawRef.current;
        const rollDelta = roll - lastRollRef.current;
        
        // Dead zone - ignore small movements
        const deadZone = 2;
        
        if (Math.abs(yawDelta) > deadZone) {
          const clampedYawDelta = THREE.MathUtils.clamp(yawDelta, -15, 15);
          selectedObject.rotateOnWorldAxis(
            new THREE.Vector3(0, 1, 0), 
            THREE.MathUtils.degToRad(clampedYawDelta * rotateSpeed)
          );
        }
        
        if (Math.abs(rollDelta) > deadZone) {
          const clampedRollDelta = THREE.MathUtils.clamp(rollDelta, -15, 15);
          selectedObject.rotateOnWorldAxis(
            new THREE.Vector3(1, 0, 0), 
            THREE.MathUtils.degToRad(clampedRollDelta * rotateSpeed)
          );
        }
      }
      
      lastYawRef.current = yaw;
      lastRollRef.current = roll;
    } else {
      lastYawRef.current = null;
      lastRollRef.current = null;
    }
    
    // Clamp position to bounds
    selectedObject.position.clamp(bounds.min, bounds.max);
  });
  
  return null;
}
