import { useRef, useEffect } from "react";
import * as THREE from "three";

export function Lights() {
  const dirRef = useRef<THREE.DirectionalLight>(null!);
  
  useEffect(() => {
    if (dirRef.current) {
      const light = dirRef.current;
      light.shadow.mapSize.set(2048, 2048);
      light.shadow.camera.near = 0.5;
      light.shadow.camera.far = 200;
      light.shadow.camera.left = -40;
      light.shadow.camera.right = 40;
      light.shadow.camera.top = 40;
      light.shadow.camera.bottom = -40;
    }
  }, []);
  
  return (
    <>
      {/* Ambient light for base illumination */}
      <ambientLight intensity={0.6} />
      {/* Sun-like directional light from above */}
      <directionalLight
        ref={dirRef}
        position={[20, 30, 20]}
        intensity={1.2}
        castShadow
        color="#ffffff"
      />
      {/* Hemisphere light simulating sky (blue-ish top) and ground (warm bottom) */}
      <hemisphereLight 
        intensity={0.6} 
        color="#87ceeb" 
        groundColor="#f4a460" 
      />
      {/* Additional soft fill lights for sky-like atmosphere */}
      <directionalLight position={[-10, 20, -10]} intensity={0.3} color="#b0d4ff" />
      <directionalLight position={[10, 15, -15]} intensity={0.2} color="#ffd4b0" />
    </>
  );
}
