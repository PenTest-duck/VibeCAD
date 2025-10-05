import { useMemo } from "react";
import * as THREE from "three";

export function BoundsBox({ box }: { box: THREE.Box3 }) {
  const geom = useMemo(() => new THREE.BufferGeometry(), [box]);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: 0x3b82f6, opacity: 0.3, transparent: true }), []);
  
  const points = useMemo(() => {
    const min = box.min; 
    const max = box.max;
    const corners = [
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(max.x, min.y, max.z),
      new THREE.Vector3(min.x, min.y, max.z),
      new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(max.x, max.y, min.z),
      new THREE.Vector3(max.x, max.y, max.z),
      new THREE.Vector3(min.x, max.y, max.z),
    ];
    const edges = [
      [0,1],[1,2],[2,3],[3,0], // bottom
      [4,5],[5,6],[6,7],[7,4], // top
      [0,4],[1,5],[2,6],[3,7], // verticals
    ];
    const pts: number[] = [];
    edges.forEach(([a,b]) => { 
      pts.push(corners[a].x, corners[a].y, corners[a].z, corners[b].x, corners[b].y, corners[b].z); 
    });
    const buf = new Float32Array(pts);
    geom.setAttribute("position", new THREE.BufferAttribute(buf, 3));
    return geom;
  }, [box, geom]);
  
  return <lineSegments geometry={geom} material={mat} />;
}
