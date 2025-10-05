import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

export function CameraRig() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(12, 12, 12);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  
  return null;
}
