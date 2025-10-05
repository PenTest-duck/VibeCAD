"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Palette, Sparkles, ArrowRight, Trash2 } from "lucide-react";
import Sandbox from "@/components/Sandbox";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'draw'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drawing functionality
  const getEventPos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Calculate scaling factors
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getEventPos(e);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up drawing style
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [getEventPos]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getEventPos(e);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, getEventPos]);

  const stopDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // File upload functionality
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, []);

  const clearUpload = useCallback(() => {
    setUploadedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const generateCAD = useCallback(() => {
    // This will be implemented to send the sketch to the backend
    console.log('Generating CAD from:', activeTab === 'upload' ? uploadedFile : 'canvas');

    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const pngDataUrl = canvas.toDataURL('image/png');
      console.log('Canvas PNG Data URL:', pngDataUrl);
      // You can now use pngDataUrl to send the image to the backend or for further processing
    }
  }, [activeTab, uploadedFile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                VibeCAD
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 hidden sm:block">
              AI-Powered 3D CAD Generation
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
              Transform Your
              <span className="gradient-text block">
                Sketches into 3D
              </span>
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Upload a photo of your sketch or draw directly on our canvas. Our AI will generate a professional 3D CAD model for you.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-1 shadow-lg">
              <Button
                variant={activeTab === 'upload' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('upload')}
                className="px-6 py-3"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <Button
                variant={activeTab === 'draw' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('draw')}
                className="px-6 py-3"
              >
                <Palette className="w-4 h-4 mr-2" />
                Draw Sketch
              </Button>
            </div>
          </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <Card className="max-w-2xl mx-auto hover-lift">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Upload Your Sketch</CardTitle>
                <CardDescription>
                  Upload a clear photo of your hand-drawn sketch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!previewUrl ? (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <div className="space-y-2 text-center flex flex-col items-center">
                        <p className="text-lg font-medium text-slate-700 dark:text-slate-300 text-center">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Uploaded sketch"
                        className="w-full h-64 object-contain rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={clearUpload}
                        className="absolute top-2 right-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                      {uploadedFile?.name}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Draw Tab */}
          {activeTab === 'draw' && (
            <Card className="max-w-2xl mx-auto hover-lift">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Draw Your Sketch</CardTitle>
                <CardDescription>
                  Use your trackpad or mouse to draw your design
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={400}
                    className="w-full h-64 bg-white dark:bg-slate-900 cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{
                      touchAction: 'none'
                    }}
                  />
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={clearCanvas}
                    className="mr-4"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Canvas
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          <div className="text-center mt-8">
            <Button
              size="lg"
              onClick={generateCAD}
              disabled={activeTab === 'upload' ? !uploadedFile : false}
              className="px-8 py-4 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Generate 3D CAD Model
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          {/* Features */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Upload</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Simply upload a photo of your sketch and let our AI do the rest
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Palette className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Draw Directly</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Use our intuitive canvas to draw your design with precision
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Powered</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Advanced AI technology converts your sketches to professional CAD models
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}