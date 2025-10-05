import * as THREE from "three";

export function uid(prefix = "obj"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clampVector3ToBox(v: THREE.Vector3, box: THREE.Box3): THREE.Vector3 {
  v.set(
    THREE.MathUtils.clamp(v.x, box.min.x, box.max.x),
    THREE.MathUtils.clamp(v.y, box.min.y, box.max.y),
    THREE.MathUtils.clamp(v.z, box.min.z, box.max.z)
  );
  return v;
}
