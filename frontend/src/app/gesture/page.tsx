"use client";

import GestureDetector from "@/components/GestureDetector";

export default function GesturePage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-8">
      <div className="max-w-6xl w-full">
        <h1 className="text-4xl font-bold text-white mb-4 text-center">
          Hand Gesture Detection
        </h1>
        <p className="text-slate-300 text-center mb-8">
          Try these gestures: <span className="font-semibold">Open Palm (Zoom Out)</span>, <span className="font-semibold">Pinch (Zoom In)</span>, <span className="font-semibold">Point (Directional)</span>, <span className="font-semibold">Fist (Orientation Tracking)</span>
        </p>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-white text-sm">
          <div className="bg-slate-800 p-4 rounded-lg">
            <div className="font-bold mb-1">🖐️ Open Palm</div>
            <div className="text-slate-400">Zoom Out</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <div className="font-bold mb-1">🤏 Pinch</div>
            <div className="text-slate-400">Zoom In</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <div className="font-bold mb-1">☝️ Point</div>
            <div className="text-slate-400">Up/Down/Left/Right</div>
          </div>
          <div className="bg-gradient-to-br from-purple-800 to-indigo-800 p-4 rounded-lg border border-purple-500">
            <div className="font-bold mb-1">✊ Fist</div>
            <div className="text-slate-300">Yaw & Roll Tracking</div>
          </div>
        </div>
      </div>
    </div>
  );
}

