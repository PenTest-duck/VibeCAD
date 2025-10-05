"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { MapControls, TransformControls, GizmoHelper, GizmoViewcube } from "@react-three/drei";
import { GestureType } from "./GestureDetector";

// Types
import { 
  UploadedItem, 
  ToolMode, 
  MovementPlane,
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent
} from "@/types/sandbox.types";

// Utils
import { uid, clampVector3ToBox } from "@/utils/helpers";
import { loadModelFromFile, loadModelById } from "@/utils/model-loader";

// Hooks
import { useSmoothedGesture } from "@/hooks/useSmoothedGesture";

// Scene Components
import { Lights, Ground, BoundsBox, Selectable, CameraRig } from "@/components/scene";

// Controllers
import { GestureCameraController, GestureObjectController } from "@/components/controllers";

// UI
import { SandboxUI } from "@/components/ui/SandboxUI";

interface SandboxProps {
  modelId?: string | null;
}

export default function Sandbox3D({ modelId }: SandboxProps) {
  // Fixed workspace bounds
  const bounds = useMemo(() => new THREE.Box3(
    new THREE.Vector3(-20, 0, -20), 
    new THREE.Vector3(20, 20, 20)
  ), []);

  // Scene state
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
  const [gestureScaleEnabled, setGestureScaleEnabled] = useState(false);
  const [movementPlane, setMovementPlane] = useState<MovementPlane>("XZ");
  
  // Voice control state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Apply smoothing to gesture values
  const smoothedGesture = useSmoothedGesture(
    currentGesture,
    gestureYaw,
    gestureRoll,
    gestureFistClosed,
    3
  );

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Handle voice commands
  const handleUtterance = useCallback((utterance: string) => {
    console.log("Utterance received:", utterance);
    // TODO: Implement actual command processing logic here
  }, []);
  
  // Initialize speech recognition
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
          handleUtterance(finalTranscript.trim());
          setFinalTranscript(finalTranscript.trim());
          setCurrentTranscript("");
          
          setTimeout(() => {
            setFinalTranscript("");
          }, 3000);
        } else {
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
      
      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        }
      };
    } else {
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

  // Load model by ID when provided
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

  // Add an uploaded object to the scene
  const addObject = useCallback((name: string, object: THREE.Object3D) => {
    object.traverse((c: any) => {
      if (c.isMesh) {
        c.castShadow = true; 
        c.receiveShadow = true;
      }
    });
    
    // Normalize initial placement: center on ground
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // Move object so its center is at world origin
    object.position.sub(center);
    
    // Auto-scale to fit within bounds
    const boundsSize = new THREE.Vector3();
    bounds.getSize(boundsSize);
    const maxBoundsDimension = Math.min(boundsSize.x, boundsSize.y, boundsSize.z) * 0.8;
    const maxModelDimension = Math.max(size.x, size.y, size.z);
    
    if (maxModelDimension > maxBoundsDimension) {
      const scaleFactor = maxBoundsDimension / maxModelDimension;
      object.scale.setScalar(scaleFactor);
      const scaledBox = new THREE.Box3().setFromObject(object);
      scaledBox.getSize(size);
    }
    
    // Position object on the ground plane
    object.position.y = size.y * 0.5;
    object.position.x = 0;
    object.position.z = 0;

    const id = uid("asset");
    setItems((prev) => [...prev, { id, name, object }]);
  }, [bounds]);

  // Handle file uploads
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

  // Drag and drop handlers
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // Remove selected object
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

  // Prevent hydration issues
  if (!isMounted) {
    return (
      <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-neutral-950 to-neutral-900 flex items-center justify-center">
        <div className="text-neutral-400">Loading 3D workspace...</div>
      </div>
    );
  }

  return (
    <div 
      className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-neutral-950 to-neutral-900" 
      onDrop={onDrop} 
      onDragOver={onDragOver}
    >
      {/* UI Overlay */}
      <SandboxUI
        handleFiles={handleFiles}
        mode={mode}
        setMode={setMode}
        snap={snap}
        setSnap={setSnap}
        snapStep={snapStep}
        setSnapStep={setSnapStep}
        showBounds={showBounds}
        setShowBounds={setShowBounds}
        selected={selected}
        removeSelected={removeSelected}
        gestureEnabled={gestureEnabled}
        setGestureEnabled={setGestureEnabled}
        gestureScaleEnabled={gestureScaleEnabled}
        setGestureScaleEnabled={setGestureScaleEnabled}
        movementPlane={movementPlane}
        setMovementPlane={setMovementPlane}
        setCurrentGesture={setCurrentGesture}
        setGestureYaw={setGestureYaw}
        setGestureRoll={setGestureRoll}
        setGestureFistClosed={setGestureFistClosed}
        smoothedGesture={smoothedGesture}
        currentGesture={currentGesture}
        voiceEnabled={voiceEnabled}
        setVoiceEnabled={setVoiceEnabled}
        currentTranscript={currentTranscript}
        finalTranscript={finalTranscript}
        showCameraHint={showCameraHint}
      />

      {/* Drag & drop hint */}
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
        
        {/* Gesture Controllers */}
        {gestureEnabled && selected && (
          <GestureObjectController 
            selectedObject={selected}
            gesture={smoothedGesture.gesture} 
            yaw={smoothedGesture.yaw} 
            roll={smoothedGesture.roll} 
            isFistClosed={smoothedGesture.isFistClosed}
            bounds={bounds}
            scaleEnabled={gestureScaleEnabled}
            movementPlane={movementPlane}
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
        
        {/* Scene Elements */}
        <Lights />
        <Ground size={Math.max(50, (bounds.max.x - bounds.min.x) * 1.5)} />
        {showBounds && <BoundsBox box={bounds} />}
        
        {/* Map Controls */}
        <MapControls 
          makeDefault 
          enableDamping 
          dampingFactor={0.1}
          screenSpacePanning={true}
          minDistance={5}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2 - 0.1}
        />

        {/* ViewCube */}
        <GizmoHelper alignment="top-right" margin={[80, 80]}>
          <GizmoViewcube 
            color="#3b82f6"
            hoverColor="#60a5fa"
            textColor="#ffffff"
            strokeColor="#1e40af"
            opacity={0.9}
          />
        </GizmoHelper>

        {/* Scene Objects */}
        {items.map((it) => (
          <Selectable key={it.id} object={it.object} onSelect={setSelected} />
        ))}

        {/* Background mesh for deselection */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.01, 0]}
          onPointerDown={() => setSelected(null)}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshBasicMaterial visible={false} />
        </mesh>

        {/* Transform controls */}
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
            onObjectChange={() => {
              if (selected) {
                clampVector3ToBox(selected.position, bounds);
              }
            }}
          />
        )}

        {/* Focus indicator */}
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