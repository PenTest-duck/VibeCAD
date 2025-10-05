"use client";

import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { X, Code, ChevronLeft, ChevronRight } from "lucide-react";

interface SCADEditorProps {
  modelId?: string | null;
  isOpen: boolean;
  onToggle: () => void;
}

export default function SCADEditor({ modelId, isOpen, onToggle }: SCADEditorProps) {
  const [scadCode, setScadCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch SCAD code when modelId changes
  useEffect(() => {
    if (!modelId) {
      setScadCode("");
      setError(null);
      return;
    }

    const fetchScadCode = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/scad/${modelId}.scad`);
        if (!response.ok) {
          throw new Error(`Failed to fetch SCAD code: ${response.statusText}`);
        }
        const code = await response.text();
        setScadCode(code);
      } catch (err) {
        console.error("Error fetching SCAD code:", err);
        setError(err instanceof Error ? err.message : "Failed to load SCAD code");
        setScadCode("");
      } finally {
        setIsLoading(false);
      }
    };

    fetchScadCode();
  }, [modelId]);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setScadCode(value);
    }
  };

  return (
    <>
      {/* Toggle button when closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-20 z-50 bg-neutral-800/90 backdrop-blur-sm hover:bg-neutral-700/90 text-white p-3 rounded-lg shadow-lg border border-neutral-600/50 transition-all duration-200 flex items-center gap-2"
          title="Open SCAD Editor"
        >
          <Code size={20} />
          <ChevronRight size={16} />
        </button>
      )}

      {/* Editor panel */}
      <div
        className={`fixed left-0 top-0 h-full bg-neutral-900 border-r border-neutral-700 shadow-2xl z-40 transition-all duration-300 ${
          isOpen ? "w-[500px]" : "w-0"
        } overflow-hidden`}
      >
        {isOpen && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-800 border-b border-neutral-700">
              <div className="flex items-center gap-2">
                <Code size={20} className="text-blue-400" />
                <h2 className="text-white font-semibold">SCAD Editor</h2>
                {modelId && (
                  <span className="text-xs text-neutral-400 ml-2">
                    {modelId}.scad
                  </span>
                )}
              </div>
              <button
                onClick={onToggle}
                className="text-neutral-400 hover:text-white transition-colors p-1 hover:bg-neutral-700 rounded"
                title="Close Editor"
              >
                <ChevronLeft size={20} />
              </button>
            </div>

            {/* Editor content */}
            <div className="flex-1 overflow-hidden relative">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-neutral-400">Loading SCAD code...</div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-red-400 text-center px-4">
                    <div className="text-2xl mb-2">⚠️</div>
                    <div>{error}</div>
                  </div>
                </div>
              ) : !modelId ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-neutral-500 text-center px-4">
                    <div className="text-4xl mb-3">📝</div>
                    <div className="font-medium mb-2">No model loaded</div>
                    <div className="text-sm">Load a model to view its SCAD code</div>
                  </div>
                </div>
              ) : (
                <Editor
                  height="100%"
                  defaultLanguage="cpp"
                  language="cpp"
                  value={scadCode}
                  onChange={handleEditorChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: "on",
                    readOnly: false,
                    scrollbar: {
                      vertical: "visible",
                      horizontal: "visible",
                      useShadows: false,
                      verticalScrollbarSize: 10,
                      horizontalScrollbarSize: 10,
                    },
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    renderLineHighlight: "all",
                    fixedOverflowWidgets: true,
                  }}
                  loading={<div className="flex items-center justify-center h-full text-neutral-400">Initializing editor...</div>}
                />
              )}
            </div>

            {/* Footer info */}
            <div className="px-4 py-2 bg-neutral-800 border-t border-neutral-700 text-xs text-neutral-400">
              <div className="flex items-center justify-between">
                <span>Edits are local only</span>
                <span className="flex items-center gap-1">
                  {scadCode.length > 0 && `${scadCode.split('\n').length} lines`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
