"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MapControls, TransformControls, Html, useCursor, GizmoHelper, GizmoViewcube } from "@react-three/drei";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import GestureDetector, { GestureType } from "./GestureDetector";

// Speech Recognition types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

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

// Load model by ID from backend API
async function loadModelById(modelId: string): Promise<THREE.Object3D> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is not set');
    }
    
    const response = await fetch(`${backendUrl}/stl/${modelId}.stl`);
    if (!response.ok) {
      throw new Error(`Failed to load model: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const file = new File([blob], `${modelId}.stl`, { type: 'application/octet-stream' });
    return await loadModelFromFile(file);
  } catch (error) {
    console.error('Error loading model by ID:', error);
    throw error;
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

// Minimal smoothing - prioritize responsiveness over stability
function useSmoothedGesture(
  gesture: GestureType,
  yaw: number | null,
  roll: number | null,
  isFistClosed: boolean,
  smoothingFrames: number = 2 // Minimal smoothing
) {
  const lastGestureRef = useRef<GestureType>("UNKNOWN");
  const lastValidGestureRef = useRef<GestureType>("UNKNOWN");
  const lastValidTimeRef = useRef(Date.now());
  const unknownCountRef = useRef(0);
  const sameGestureCountRef = useRef(0);
  const [smoothedGesture, setSmoothedGesture] = useState<GestureType>("UNKNOWN");
  const [smoothedYaw, setSmoothedYaw] = useState<number | null>(null);
  const [smoothedRoll, setSmoothedRoll] = useState<number | null>(null);

  useEffect(() => {
    const now = Date.now();
    
    // Handle UNKNOWN - clear gesture quickly when hand disappears
    if (gesture === "UNKNOWN") {
      unknownCountRef.current++;
      
      // Special handling for zoom gestures - clear them immediately
      const isZoomGesture = lastValidGestureRef.current === "ZOOM IN" || lastValidGestureRef.current === "ZOOM OUT";
      
      if (isZoomGesture) {
        // Clear zoom gestures immediately - no persistence
        lastValidGestureRef.current = "UNKNOWN";
        setSmoothedGesture("UNKNOWN");
        sameGestureCountRef.current = 0;
        return;
      }
      
      // For non-zoom gestures, only persist for 100ms (very brief - just for momentary tracking loss)
      const timeSinceLastValid = now - lastValidTimeRef.current;
      if (timeSinceLastValid < 100 && lastValidGestureRef.current !== "UNKNOWN") {
        // Keep last gesture very briefly during momentary tracking loss
        setSmoothedGesture(lastValidGestureRef.current);
        return;
      } else {
        // After 100ms or immediately if already UNKNOWN, clear it
        lastValidGestureRef.current = "UNKNOWN";
        setSmoothedGesture("UNKNOWN");
        sameGestureCountRef.current = 0;
      }
      return;
    }
    
    // Reset unknown counter
    unknownCountRef.current = 0;
    
    // Almost immediate pass-through with minimal buffering
    // If same gesture as last frame, accept immediately
    if (gesture === lastGestureRef.current) {
      sameGestureCountRef.current++;
      // Accept after just 1 matching frame
      if (sameGestureCountRef.current >= 1) {
        lastValidGestureRef.current = gesture;
        lastValidTimeRef.current = now;
        setSmoothedGesture(gesture);
      }
    } else {
      // Gesture changed - accept immediately but reset counter
      sameGestureCountRef.current = 1;
      lastValidGestureRef.current = gesture;
      lastValidTimeRef.current = now;
      setSmoothedGesture(gesture);
    }
    
    lastGestureRef.current = gesture;
  }, [gesture, smoothingFrames]);

  // Minimal smoothing for yaw - almost direct pass-through
  useEffect(() => {
    if (yaw !== null && !isNaN(yaw) && isFinite(yaw)) {
      if (smoothedYaw === null) {
        // First value, use directly
        setSmoothedYaw(yaw);
      } else {
        // Very light smoothing - 70% new value, 30% old
        const smoothed = yaw * 0.7 + smoothedYaw * 0.3;
        setSmoothedYaw(smoothed);
      }
    } else {
      setSmoothedYaw(null);
    }
  }, [yaw]);

  // Minimal smoothing for roll - almost direct pass-through
  useEffect(() => {
    if (roll !== null && !isNaN(roll) && isFinite(roll)) {
      if (smoothedRoll === null) {
        // First value, use directly
        setSmoothedRoll(roll);
      } else {
        // Very light smoothing - 70% new value, 30% old
        const smoothed = roll * 0.7 + smoothedRoll * 0.3;
        setSmoothedRoll(smoothed);
      }
    } else {
      setSmoothedRoll(null);
    }
  }, [roll]);

  return {
    gesture: smoothedGesture,
    yaw: smoothedYaw,
    roll: smoothedRoll,
    isFistClosed
  };
}

// Gesture-controlled camera movement (when no object is selected)
function GestureCameraController({ 
  gesture, 
  yaw, 
  roll, 
  isFistClosed 
}: { 
  gesture: GestureType; 
  yaw: number | null; 
  roll: number | null; 
  isFistClosed: boolean;
}) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  const lastYawRef = useRef<number | null>(null);
  const lastRollRef = useRef<number | null>(null);
  
  useFrame((state, delta) => {
    // Slower, more controlled movement
    const moveSpeed = 5 * delta; // Reduced from 8
    const zoomSpeed = 6 * delta;
    const rotateSpeed = 0.8 * delta; // Reduced sensitivity
    
    // Debug: Log when a non-UNKNOWN gesture is received
    if (gesture !== "UNKNOWN" && Math.random() < 0.1) { // Log 10% of frames to avoid spam
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
      if (distance > 2) { // Don't get too close
        camera.position.addScaledVector(direction, zoomSpeed);
      }
    } else if (gesture === "ZOOM OUT") {
      // Move camera away from target
      const direction = new THREE.Vector3();
      direction.subVectors(targetRef.current, camera.position).normalize();
      const distance = camera.position.distanceTo(targetRef.current);
      if (distance < 80) { // Don't get too far
        camera.position.addScaledVector(direction, -zoomSpeed);
      }
    }
    
    // Fist rotation - orbit camera around target
    if (isFistClosed && yaw !== null && roll !== null) {
      if (lastYawRef.current !== null && lastRollRef.current !== null) {
        const yawDelta = yaw - lastYawRef.current;
        const rollDelta = roll - lastRollRef.current;
        
        // Dead zone - ignore small movements
        const deadZone = 2; // degrees
        
        if (Math.abs(yawDelta) > deadZone) {
          // Orbit around Y axis (yaw)
          const offset = new THREE.Vector3().subVectors(camera.position, targetRef.current);
          const clampedYawDelta = THREE.MathUtils.clamp(yawDelta, -15, 15); // Limit max rotation per frame
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

// Gesture-controlled object manipulation (when object is selected)
function GestureObjectController({ 
  selectedObject,
  gesture, 
  yaw, 
  roll, 
  isFistClosed,
  bounds
}: { 
  selectedObject: THREE.Object3D;
  gesture: GestureType; 
  yaw: number | null; 
  roll: number | null; 
  isFistClosed: boolean;
  bounds: THREE.Box3;
}) {
  const lastYawRef = useRef<number | null>(null);
  const lastRollRef = useRef<number | null>(null);
  
  useFrame((state, delta) => {
    // Slower, more precise control
    const moveSpeed = 1.5 * delta; // Reduced from 2
    const scaleSpeed = 0.00003; // Much slower scaling - 0.03% per frame
    const rotateSpeed = 1.2 * delta; // Reduced from 2
    
    // Debug: Log when a zoom gesture is received
    if ((gesture === "ZOOM IN" || gesture === "ZOOM OUT") && Math.random() < 0.2) {
      console.log("Object zoom:", gesture, "Current scale:", selectedObject.scale.x);
    }
    
    // Directional movements - translate the object
    if (gesture === "UP") {
      selectedObject.position.z -= moveSpeed;
    } else if (gesture === "DOWN") {
      selectedObject.position.z += moveSpeed;
    } else if (gesture === "LEFT") {
      selectedObject.position.x -= moveSpeed;
    } else if (gesture === "RIGHT") {
      selectedObject.position.x += moveSpeed;
    } else if (gesture === "ZOOM IN") {
      // Scale down the object - additive for consistent rate (zoom in = make smaller)
      const currentScale = selectedObject.scale.x;
      if (currentScale > 0.001) { // Very small minimum to prevent disappearing
        const newScale = currentScale - (scaleSpeed * 2); // Additive decrease
        selectedObject.scale.setScalar(Math.max(newScale, 0.001));
      }
    } else if (gesture === "ZOOM OUT") {
      // Scale up the object - additive for consistent rate (zoom out = make bigger)
      const currentScale = selectedObject.scale.x;
      if (currentScale < 500) { // Much larger maximum
        const newScale = currentScale + (scaleSpeed * 2); // Additive increase
        selectedObject.scale.setScalar(Math.min(newScale, 500));
      }
    }
    
    // Fist rotation - rotate the object based on yaw and roll
    if (isFistClosed && yaw !== null && roll !== null) {
      // Use delta from last frame for smooth rotation
      if (lastYawRef.current !== null && lastRollRef.current !== null) {
        const yawDelta = yaw - lastYawRef.current;
        const rollDelta = roll - lastRollRef.current;
        
        // Dead zone - ignore small movements
        const deadZone = 2; // degrees
        
        if (Math.abs(yawDelta) > deadZone) {
          // Clamp rotation delta to prevent jumps
          const clampedYawDelta = THREE.MathUtils.clamp(yawDelta, -15, 15);
          // Yaw rotates around Y axis
          selectedObject.rotateOnWorldAxis(
            new THREE.Vector3(0, 1, 0), 
            THREE.MathUtils.degToRad(clampedYawDelta * rotateSpeed)
          );
        }
        
        if (Math.abs(rollDelta) > deadZone) {
          // Clamp rotation delta to prevent jumps
          const clampedRollDelta = THREE.MathUtils.clamp(rollDelta, -15, 15);
          // Roll rotates around X axis
          selectedObject.rotateOnWorldAxis(
            new THREE.Vector3(1, 0, 0), 
            THREE.MathUtils.degToRad(clampedRollDelta * rotateSpeed)
          );
        }
      }
      
      lastYawRef.current = yaw;
      lastRollRef.current = roll;
    } else {
      // Reset tracking when fist is not closed
      lastYawRef.current = null;
      lastRollRef.current = null;
    }
    
    // Clamp position to bounds
    selectedObject.position.clamp(bounds.min, bounds.max);
  });
  
  return null;
}

// -------- Main Sandbox Component --------
interface SandboxProps {
  modelId?: string | null;
}

export default function Sandbox3D({ modelId }: SandboxProps) {
  // Fixed workspace bounds (edit to taste)
  const bounds = useMemo(() => new THREE.Box3(new THREE.Vector3(-20, 0, -20), new THREE.Vector3(20, 20, 20)), []);

  const [items, setItems] = useState<UploadedItem[]>([]);
  const [selected, setSelected] = useState<THREE.Object3D | null>(null);
  const [mode, setMode] = useState<ToolMode>("translate");
  const [snap, setSnap] = useState(true);
  const [snapStep, setSnapStep] = useState(0.25);
  const [showBounds, setShowBounds] = useState(true);
  const [showDropMessage, setShowDropMessage] = useState(true);
  const [showCameraHint, setShowCameraHint] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  // Gesture control state
  const [currentGesture, setCurrentGesture] = useState<GestureType>("UNKNOWN");
  const [gestureYaw, setGestureYaw] = useState<number | null>(null);
  const [gestureRoll, setGestureRoll] = useState<number | null>(null);
  const [gestureFistClosed, setGestureFistClosed] = useState(false);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  
  // Voice control state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Apply smoothing/debouncing to gesture values with persistence during tracking loss
  const smoothedGesture = useSmoothedGesture(
    currentGesture,
    gestureYaw,
    gestureRoll,
    gestureFistClosed,
    3 // smoothing frames - reduced for faster response
  );

  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Dummy function for handling completed utterances
  const handleUtterance = useCallback((utterance: string) => {
    console.log("Utterance received:", utterance);
    // TODO: Implement actual command processing logic here
  }, []);
  
  // Initialize speech recognition when voice is enabled
  useEffect(() => {
    if (!isMounted) return;
    
    if (voiceEnabled) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error("Speech Recognition is not supported in this browser");
        setVoiceEnabled(false);
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onend = () => {
        setIsListening(false);
        // Restart if voice is still enabled
        if (voiceEnabled) {
          try {
            recognition.start();
          } catch (err) {
            console.error("Failed to restart speech recognition:", err);
          }
        }
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";
        let finalTranscript = "";
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          // Call handleUtterance with the completed sentence
          handleUtterance(finalTranscript.trim());
          setFinalTranscript(finalTranscript.trim());
          setCurrentTranscript("");
          
          // Clear final transcript after 3 seconds
          setTimeout(() => {
            setFinalTranscript("");
          }, 3000);
        } else {
          // Display interim transcript
          setCurrentTranscript(interimTranscript);
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setVoiceEnabled(false);
        }
      };
      
      recognitionRef.current = recognition;
      
      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
      
      // Cleanup on unmount or when voice is disabled
      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        }
      };
    } else {
      // Stop recognition when voice is disabled
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setCurrentTranscript("");
      setFinalTranscript("");
      setIsListening(false);
    }
  }, [voiceEnabled, isMounted, handleUtterance]);

  // Fade out drop message after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowDropMessage(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Fade out camera hint after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCameraHint(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Load model by ID when modelId is provided
  useEffect(() => {
    if (modelId && isMounted) {
      loadModelById(modelId)
        .then((object) => {
          addObject(`Model-${modelId}`, object);
        })
        .catch((error) => {
          console.error('Failed to load model:', error);
        });
    }
  }, [modelId, isMounted]);

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
    
    // Move object so its center is at world origin (0,0,0)
    object.position.sub(center);
    
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
    
    // Position object so it sits on the ground plane (Y = 0) with its bottom at Y = 0
    // Since we centered the object, we need to move it up by half its height
    object.position.y = size.y * 0.5;
    
    // Ensure the object is centered at world origin (0, 0, 0) horizontally
    object.position.x = 0;
    object.position.z = 0;

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
      <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-neutral-950 to-neutral-900 flex items-center justify-center">
        <div className="text-neutral-400">Loading 3D workspace...</div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-neutral-950 to-neutral-900" onDrop={onDrop} onDragOver={onDragOver}>
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

      {/* Bottom Left - Controls Hint - fades out after 8 seconds */}
      {showCameraHint && (
        <div 
          className="pointer-events-none absolute left-4 bottom-4 z-10 rounded-lg bg-neutral-900/80 backdrop-blur-md px-3 py-2 text-xs text-neutral-300 shadow-lg border border-neutral-700/50 transition-opacity duration-1000"
          style={{ opacity: showCameraHint ? 1 : 0 }}
        >
          <div className="font-medium mb-1">Camera Controls:</div>
          <div>🖱️ Left Click: Pan</div>
          <div>🖱️ Middle Click: Rotate</div>
          <div>🖱️ Scroll: Zoom</div>
          <div>🎯 ViewCube: Quick Views</div>
          <div className="mt-2 pt-2 border-t border-neutral-700/50 font-medium">Gesture Controls:</div>
          <div>🎥 No selection: Controls camera</div>
          <div>📦 With selection: Controls object</div>
          <div>☝️ Point: Move/Pan</div>
          <div>🤏 Pinch/Palm: Zoom/Scale</div>
          <div>✊ Fist: Orbit/Rotate</div>
        </div>
      )}

      {/* Bottom Right Controls */}
      <div className="pointer-events-auto absolute right-4 bottom-4 z-10 flex flex-col gap-2 items-end">
        {/* Voice Transcript Display - show above controls when listening */}
        {voiceEnabled && (currentTranscript || finalTranscript) && (
          <div className="rounded-lg bg-neutral-900/90 backdrop-blur-md px-4 py-3 text-sm text-neutral-100 shadow-lg border border-neutral-700/50 max-w-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-neutral-400">Listening:</span>
            </div>
            <div className="mt-1">
              {finalTranscript && (
                <div className="text-neutral-200">{finalTranscript}</div>
              )}
              {currentTranscript && (
                <div className="italic text-neutral-300">{currentTranscript}</div>
              )}
            </div>
          </div>
        )}
        
        {/* Voice Control Toggle */}
        <button 
          className={`rounded-lg px-3 py-2 transition-all text-sm font-medium ${voiceEnabled ? "bg-green-600 hover:bg-green-700 text-white" : "bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300"} backdrop-blur-md shadow-lg`}
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          title="Toggle voice control"
        >
          {voiceEnabled ? "🎤 Voice On" : "🎤 Voice Off"}
        </button>
        
        {/* Gesture Control Toggle */}
        <button 
          className={`rounded-lg px-3 py-2 transition-all text-sm font-medium ${gestureEnabled ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300"} backdrop-blur-md shadow-lg`}
          onClick={() => setGestureEnabled(!gestureEnabled)}
          title="Toggle gesture control"
        >
          {gestureEnabled ? "👋 Gesture On" : "👋 Gesture Off"}
        </button>
        
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
        
        {/* Gesture Detector - only show when enabled */}
        {gestureEnabled && (
          <div className="mt-2 flex flex-col gap-2">
            <GestureDetector
              onGestureChange={setCurrentGesture}
              onOrientationChange={(yaw, roll) => {
                setGestureYaw(yaw);
                setGestureRoll(roll);
              }}
              onFistChange={setGestureFistClosed}
            />
            {/* Gesture status indicator */}
            {!selected && smoothedGesture.gesture !== "UNKNOWN" && (
              <div className="bg-blue-600/90 backdrop-blur-md px-3 py-2 rounded-lg text-xs text-white font-medium text-center shadow-lg">
                🎥 Camera: {smoothedGesture.gesture}
              </div>
            )}
            {!selected && smoothedGesture.gesture === "UNKNOWN" && (
              <div className="bg-neutral-700/90 backdrop-blur-md px-3 py-2 rounded-lg text-xs text-white font-medium text-center shadow-lg">
                🎥 Controlling Camera
              </div>
            )}
            {selected && smoothedGesture.gesture !== "UNKNOWN" && (
              <div className="bg-green-600/90 backdrop-blur-md px-3 py-2 rounded-lg text-xs text-white font-medium text-center shadow-lg">
                📦 Object: {smoothedGesture.gesture}
              </div>
            )}
            {selected && smoothedGesture.gesture === "UNKNOWN" && (
              <div className="bg-purple-600/90 backdrop-blur-md px-3 py-2 rounded-lg text-xs text-white font-medium text-center shadow-lg">
                📦 Controlling Object
              </div>
            )}
            {/* Debug info */}
            <div className="bg-neutral-800/80 backdrop-blur-md px-2 py-1 rounded text-[10px] text-neutral-400 font-mono">
              Raw: {currentGesture} | Smooth: {smoothedGesture.gesture}
            </div>
          </div>
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
        {gestureEnabled && selected && (
          <GestureObjectController 
            selectedObject={selected}
            gesture={smoothedGesture.gesture} 
            yaw={smoothedGesture.yaw} 
            roll={smoothedGesture.roll} 
            isFistClosed={smoothedGesture.isFistClosed}
            bounds={bounds}
          />
        )}
        {gestureEnabled && !selected && (
          <GestureCameraController 
            gesture={smoothedGesture.gesture} 
            yaw={smoothedGesture.yaw} 
            roll={smoothedGesture.roll} 
            isFistClosed={smoothedGesture.isFistClosed}
          />
        )}
        <Lights />
        <Ground size={Math.max(50, (bounds.max.x - bounds.min.x) * 1.5)} />
        {showBounds && <BoundsBox box={bounds} />}
        
        {/* MapControls - like Inventor: pan with left click, zoom with wheel, rotate with middle mouse */}
        <MapControls 
          makeDefault 
          enableDamping 
          dampingFactor={0.1}
          screenSpacePanning={true}
          minDistance={5}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2 - 0.1}
        />

        {/* ViewCube - Click to orbit to preset views, like Inventor */}
        <GizmoHelper alignment="top-right" margin={[80, 80]}>
          <GizmoViewcube 
            color="#3b82f6"
            hoverColor="#60a5fa"
            textColor="#ffffff"
            strokeColor="#1e40af"
            opacity={0.9}
          />
        </GizmoHelper>

        {/* Scene content - render first so they're on top */}
        {items.map((it) => {
          // Render selectable objects
          return <Selectable key={it.id} object={it.object} onSelect={setSelected} />;
        })}

        {/* Background mesh for deselection - clicking empty space deselects */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.01, 0]}
          onPointerDown={(e) => {
            // Only deselect if no object was clicked (event wasn't stopped)
            setSelected(null);
          }}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshBasicMaterial visible={false} />
        </mesh>

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
