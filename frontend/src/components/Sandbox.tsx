"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, TransformControls, Html, useCursor } from "@react-three/drei";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

interface UploadedItem {
  id: string;
  name: string;
  object: THREE.Object3D;
}

type ToolMode = "translate" | "rotate" | "scale";

// -------- Helpers --------
function uid(prefix = "obj"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function clampVector3ToBox(v: THREE.Vector3, box: THREE.Box3): THREE.Vector3 {
  v.set(
    THREE.MathUtils.clamp(v.x, box.min.x, box.max.x),
    THREE.MathUtils.clamp(v.y, box.min.y, box.max.y),
    THREE.MathUtils.clamp(v.z, box.min.z, box.max.z)
  );
  return v;
}

async function loadModelFromFile(file: File): Promise<THREE.Object3D> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext) throw new Error("File must have an extension");

  const arrayBuffer = await file.arrayBuffer();

  switch (ext) {
    case "glb":
    case "gltf": {
      const loader = new GLTFLoader();
      return await new Promise((resolve, reject) => {
        loader.parse(
          arrayBuffer,
          "",
          (gltf) => {
            const scene = gltf.scene || new THREE.Group();
            resolve(scene);
          },
          (err) => reject(err)
        );
      });
    }
    case "stl": {
      const loader = new STLLoader();
      return await new Promise((resolve, reject) => {
        try {
          const geometry = loader.parse(arrayBuffer);
          const material = new THREE.MeshStandardMaterial({ 
            color: 0xaaaaaa,
            roughness: 0.5,
            metalness: 0.5
          });
          const mesh = new THREE.Mesh(geometry, material);
          resolve(mesh);
        } catch (err) {
          reject(err);
        }
      });
    }
    case "obj": {
      const loader = new OBJLoader();
      return await new Promise((resolve, reject) => {
        try {
          const text = new TextDecoder().decode(arrayBuffer);
          const object = loader.parse(text);
          // Apply default material to OBJ meshes
          object.traverse((child: any) => {
            if (child.isMesh) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0xaaaaaa,
                roughness: 0.5,
                metalness: 0.5
              });
            }
          });
          resolve(object);
        } catch (err) {
          reject(err);
        }
      });
    }
    default:
      throw new Error(`Unsupported file type: .${ext}. Supported formats: GLB, GLTF, STL, OBJ`);
  }
}

// -------- Scene Elements --------
function Lights() {
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

function Ground({ size = 50 }: { size?: number }) {
  return (
    <group>
      {/* Soft shadow-catcher plane with sky-reflecting tint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#e8f4f8" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Grid helper slightly above to avoid z-fight */}
      <gridHelper args={[size, size, "#999", "#ddd"]} position={[0, 0.01, 0]} />
      <axesHelper args={[2]} />
    </group>
  );
}

function BoundsBox({ box }: { box: THREE.Box3 }) {
  const geom = useMemo(() => new THREE.BufferGeometry(), [box]);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: 0x3b82f6, opacity: 0.3, transparent: true }), []);
  const points = useMemo(() => {
    const min = box.min; const max = box.max;
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
    edges.forEach(([a,b]) => { pts.push(corners[a].x, corners[a].y, corners[a].z, corners[b].x, corners[b].y, corners[b].z); });
    const buf = new Float32Array(pts);
    geom.setAttribute("position", new THREE.BufferAttribute(buf, 3));
    return geom;
  }, [box, geom]);
  return <lineSegments geometry={geom} material={mat} />;
}

// Click-to-select wrapper with hover cursor
function Selectable({ object, onSelect }: { object: THREE.Object3D; onSelect: (o: THREE.Object3D) => void }) {
  const ref = useRef<THREE.Object3D>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  return (
    <primitive
      ref={ref}
      object={object}
      onPointerOver={(e: { stopPropagation: () => void; }) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e: { stopPropagation: () => void; }) => { e.stopPropagation(); setHovered(false); }}
      onPointerDown={(e: { stopPropagation: () => void; }) => { e.stopPropagation(); onSelect(object); }}
      castShadow
      receiveShadow
    />
  );
}

function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(12, 12, 12);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

// -------- Main Sandbox Component --------
export default function Sandbox3D() {
  // Fixed workspace bounds (edit to taste)
  const bounds = useMemo(() => new THREE.Box3(new THREE.Vector3(-20, 0, -20), new THREE.Vector3(20, 20, 20)), []);

  const [items, setItems] = useState<UploadedItem[]>([]);
  const [selected, setSelected] = useState<THREE.Object3D | null>(null);
  const [mode, setMode] = useState<ToolMode>("translate");
  const [snap, setSnap] = useState(true);
  const [snapStep, setSnapStep] = useState(0.25);
  const [showBounds, setShowBounds] = useState(true);
  const [showDropMessage, setShowDropMessage] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fade out drop message after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDropMessage(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Add an uploaded THREE.Object3D into scene state
  const addObject = useCallback((name: string, object: THREE.Object3D) => {
    object.traverse((c: any) => {
      if (c.isMesh) {
        c.castShadow = true; c.receiveShadow = true;
      }
    });
    // Normalize initial placement: center on ground
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    object.position.sub(center); // move pivot to world origin
    
    // Auto-scale to fit within bounds with some padding
    const boundsSize = new THREE.Vector3();
    bounds.getSize(boundsSize);
    const maxBoundsDimension = Math.min(boundsSize.x, boundsSize.y, boundsSize.z) * 0.8; // 80% of bounds
    const maxModelDimension = Math.max(size.x, size.y, size.z);
    
    if (maxModelDimension > maxBoundsDimension) {
      const scaleFactor = maxBoundsDimension / maxModelDimension;
      object.scale.setScalar(scaleFactor);
      // Recalculate size after scaling
      const scaledBox = new THREE.Box3().setFromObject(object);
      scaledBox.getSize(size);
    }
    
    object.position.y = size.y * 0.5; // sit on ground plane

    const id = uid("asset");
    setItems((prev) => [...prev, { id, name, object }]);
    // Don't auto-select - user can click to select if needed
  }, [bounds]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !files.length) return;
    for (const file of Array.from(files)) {
      try {
        const obj = await loadModelFromFile(file);
        addObject(file.name, obj);
      } catch (e: any) {
        alert(`Failed to load ${file.name}: ${e.message ?? e}`);
      }
    }
  }, [addObject]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const removeSelected = useCallback(() => {
    if (!selected) return;
    setItems((prev) => prev.filter((it) => it.object !== selected));
    setSelected(null);
  }, [selected]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName.toLowerCase() === "input") return;
      if (e.key === "Delete" || e.key === "Backspace") removeSelected();
      if (e.key === "w") setMode("translate");
      if (e.key === "e") setMode("rotate");
      if (e.key === "r") setMode("scale");
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [removeSelected]);

  // Prevent hydration issues by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="relative h-[80vh] w-full rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-950 to-neutral-900 border border-neutral-800 shadow-2xl flex items-center justify-center">
        <div className="text-neutral-400">Loading 3D workspace...</div>
      </div>
    );
  }

  return (
    <div className="relative h-[80vh] w-full rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-950 to-neutral-900 border border-neutral-800 shadow-2xl" onDrop={onDrop} onDragOver={onDragOver}>
      {/* UI overlay - Top Controls */}
      <div className="pointer-events-auto absolute left-4 top-4 z-10 flex flex-wrap gap-2 rounded-xl bg-neutral-900/90 p-2 backdrop-blur-md text-sm text-neutral-100 shadow-xl border border-neutral-700/50">
        {/* Upload Button */}
        <label className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 cursor-pointer transition-colors font-medium">
          <input
            type="file"
            accept=".glb,.gltf,.stl,.obj"
            className="hidden"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
          <span>📁</span> Upload
        </label>
        
        {/* Transform Tools */}
        <div className="inline-flex items-center gap-1 bg-neutral-800/50 rounded-lg p-1">
          <button 
            className={`px-3 py-1.5 rounded-md transition-all ${mode === "translate" ? "bg-blue-600 text-white shadow-md" : "hover:bg-neutral-700"}`} 
            onClick={() => setMode("translate")}
            title="Move (W)"
          >
            ↔️
          </button>
          <button 
            className={`px-3 py-1.5 rounded-md transition-all ${mode === "rotate" ? "bg-blue-600 text-white shadow-md" : "hover:bg-neutral-700"}`} 
            onClick={() => setMode("rotate")}
            title="Rotate (E)"
          >
            🔄
          </button>
          <button 
            className={`px-3 py-1.5 rounded-md transition-all ${mode === "scale" ? "bg-blue-600 text-white shadow-md" : "hover:bg-neutral-700"}`} 
            onClick={() => setMode("scale")}
            title="Scale (R)"
          >
            ⚖️
          </button>
        </div>

        {/* Snap Controls */}
        {snap && (
          <div className="inline-flex items-center gap-2 bg-neutral-800/50 rounded-lg px-3 py-1.5">
            <span className="text-xs text-neutral-400">Step:</span>
            <input
              className="w-14 bg-neutral-700 rounded px-2 py-1 outline-none text-xs focus:ring-2 focus:ring-blue-500"
              type="number"
              min={0.01}
              step={0.01}
              value={snapStep}
              onChange={(e) => setSnapStep(Math.max(0.01, Number(e.target.value)))}
            />
          </div>
        )}
      </div>

      {/* Bottom Right Controls */}
      <div className="pointer-events-auto absolute right-4 bottom-4 z-10 flex flex-col gap-2">
        <button 
          className={`rounded-lg px-3 py-2 transition-all text-sm font-medium ${snap ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300"} backdrop-blur-md shadow-lg`}
          onClick={() => setSnap(!snap)}
          title="Toggle snapping"
        >
          {snap ? "🧲 Snap On" : "🧲 Snap Off"}
        </button>
        <button 
          className={`rounded-lg px-3 py-2 transition-all text-sm font-medium ${showBounds ? "bg-neutral-800/90 hover:bg-neutral-700" : "bg-neutral-800/50 hover:bg-neutral-700/70"} text-neutral-300 backdrop-blur-md shadow-lg`}
          onClick={() => setShowBounds(!showBounds)}
          title="Toggle workspace bounds"
        >
          {showBounds ? "📦 Bounds" : "📦 Bounds"}
        </button>
        {selected && (
          <button 
            className="rounded-lg bg-red-600/90 hover:bg-red-700 px-3 py-2 transition-all text-sm font-medium text-white backdrop-blur-md shadow-lg"
            onClick={removeSelected}
            title="Delete selected (Del)"
          >
            🗑️ Delete
          </button>
        )}
      </div>

      {/* Drag & drop hint - fades out after 5 seconds or when items are added */}
      {items.length === 0 && showDropMessage && (
        <div 
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-1000"
          style={{ opacity: showDropMessage ? 1 : 0 }}
        >
          <div className="bg-neutral-900/80 backdrop-blur-sm rounded-2xl px-8 py-6 text-center border border-neutral-700/50 shadow-2xl">
            <div className="text-4xl mb-3">📦</div>
            <div className="text-neutral-300 font-medium mb-2">Drop 3D models here</div>
            <div className="text-neutral-500 text-sm">Supports GLB, GLTF, STL, OBJ</div>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas shadows camera={{ fov: 45, near: 0.1, far: 500 }} dpr={[1, 2]}>
        <color attach="background" args={["#87ceeb"]} />
        <fog attach="fog" args={["#b0d4ff", 50, 200]} />
        <CameraRig />
        <Lights />
        <Ground size={Math.max(50, (bounds.max.x - bounds.min.x) * 1.5)} />
        {showBounds && <BoundsBox box={bounds} />}
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />

        {/* Background mesh for deselection - clicking empty space deselects */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.01, 0]}
          onClick={(e) => {
            e.stopPropagation();
            setSelected(null);
          }}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        {/* Scene content */}
        {items.map((it) => {
          // Render selectable objects
          return <Selectable key={it.id} object={it.object} onSelect={setSelected} />;
        })}

        {/* Transform controls for selected object */}
        {selected && (
          <TransformControls
            object={selected}
            mode={mode}
            showY={true}
            showX={true}
            showZ={true}
            translationSnap={snap ? snapStep : undefined}
            rotationSnap={snap ? THREE.MathUtils.degToRad(15) : undefined}
            scaleSnap={snap ? 0.1 : undefined}
            onObjectChange={(e) => {
              // Clamp to bounds after each transform interaction
              if (selected) {
                clampVector3ToBox(selected.position, bounds);
              }
            }}
          />
        )}

        {/* Subtle focus indicator on selected object */}
        {selected && (
          <mesh position={selected.position}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
          </mesh>
        )}
      </Canvas>
    </div>
  );
}
