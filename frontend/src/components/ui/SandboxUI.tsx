import React from "react";
import * as THREE from "three";
import GestureDetector, { GestureType } from "@/components/GestureDetector";
import { ToolMode, MovementPlane } from "@/types/sandbox.types";

interface SandboxUIProps {
  // File handling
  handleFiles: (files: FileList | null) => void;
  
  // Transform controls
  mode: ToolMode;
  setMode: (mode: ToolMode) => void;
  snap: boolean;
  setSnap: (snap: boolean) => void;
  snapStep: number;
  setSnapStep: (step: number) => void;
  showBounds: boolean;
  setShowBounds: (show: boolean) => void;
  
  // Selection
  selected: THREE.Object3D | null;
  removeSelected: () => void;
  
  // Gesture controls
  gestureEnabled: boolean;
  setGestureEnabled: (enabled: boolean) => void;
  gestureScaleEnabled: boolean;
  setGestureScaleEnabled: (enabled: boolean) => void;
  movementPlane: MovementPlane;
  setMovementPlane: (plane: MovementPlane) => void;
  setCurrentGesture: (gesture: GestureType) => void;
  setGestureYaw: (yaw: number | null) => void;
  setGestureRoll: (roll: number | null) => void;
  setGestureFistClosed: (closed: boolean) => void;
  smoothedGesture: {
    gesture: GestureType;
    yaw: number | null;
    roll: number | null;
    isFistClosed: boolean;
  };
  currentGesture: GestureType;
  
  // Voice controls
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  currentTranscript: string;
  finalTranscript: string;
  
  // UI state
  showCameraHint: boolean;
}

export function SandboxUI({
  handleFiles,
  mode,
  setMode,
  snap,
  setSnap,
  snapStep,
  setSnapStep,
  showBounds,
  setShowBounds,
  selected,
  removeSelected,
  gestureEnabled,
  setGestureEnabled,
  gestureScaleEnabled,
  setGestureScaleEnabled,
  movementPlane,
  setMovementPlane,
  setCurrentGesture,
  setGestureYaw,
  setGestureRoll,
  setGestureFistClosed,
  smoothedGesture,
  currentGesture,
  voiceEnabled,
  setVoiceEnabled,
  currentTranscript,
  finalTranscript,
  showCameraHint,
}: SandboxUIProps) {
  return (
    <>
      {/* Top Controls */}
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

      {/* Bottom Left - Controls Hint */}
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
        {/* Voice Transcript Display */}
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

        {/* Gesture Scale Toggle */}
        {gestureEnabled && selected && (
          <button 
            className={`rounded-lg px-3 py-2 transition-all text-sm font-medium ${gestureScaleEnabled ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300"} backdrop-blur-md shadow-lg`}
            onClick={() => setGestureScaleEnabled(!gestureScaleEnabled)}
            title="Toggle gesture zoom/scale control"
          >
            {gestureScaleEnabled ? "🔍 Scale On" : "🔍 Scale Off"}
          </button>
        )}

        {/* Movement Plane Selector */}
        {selected && (
          <div className="flex gap-1 bg-neutral-800/90 backdrop-blur-md rounded-lg p-1 shadow-lg">
            <button
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${movementPlane === "XZ" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"}`}
              onClick={() => setMovementPlane("XZ")}
              title="Move on XZ plane (ground)"
            >
              XZ
            </button>
            <button
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${movementPlane === "XY" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"}`}
              onClick={() => setMovementPlane("XY")}
              title="Move on XY plane (front)"
            >
              XY
            </button>
            <button
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${movementPlane === "YZ" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"}`}
              onClick={() => setMovementPlane("YZ")}
              title="Move on YZ plane (side)"
            >
              YZ
            </button>
          </div>
        )}
        
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
        
        {/* Gesture Detector */}
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
    </>
  );
}
