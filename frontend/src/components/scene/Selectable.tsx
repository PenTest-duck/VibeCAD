import { useRef, useState } from "react";
import * as THREE from "three";
import { useCursor } from "@react-three/drei";

interface SelectableProps {
  object: THREE.Object3D;
  onSelect: (o: THREE.Object3D) => void;
}

export function Selectable({ object, onSelect }: SelectableProps) {
  const ref = useRef<THREE.Object3D>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  
  return (
    <primitive
      ref={ref}
      object={object}
      onPointerOver={(e: { stopPropagation: () => void; }) => { 
        e.stopPropagation(); 
        setHovered(true); 
      }}
      onPointerOut={(e: { stopPropagation: () => void; }) => { 
        e.stopPropagation(); 
        setHovered(false); 
      }}
      onPointerDown={(e: { stopPropagation: () => void; }) => { 
        e.stopPropagation(); 
        onSelect(object); 
      }}
      castShadow
      receiveShadow
    />
  );
}
