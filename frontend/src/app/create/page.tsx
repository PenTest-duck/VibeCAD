"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Palette, Sparkles, ArrowRight, Trash2, Wand2, Home } from "lucide-react";
import { generateCAD } from "@/api/client";
import Link from "next/link";

export default function CreatePage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'draw'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

    // Set up drawing style with white stroke for visibility on dark background
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
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

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      let imageFile: File;
      
      if (activeTab === 'upload' && uploadedFile) {
        // Use the uploaded file directly
        imageFile = uploadedFile;
      } else if (activeTab === 'draw' && canvasRef.current) {
        // Convert canvas to File
        const canvas = canvasRef.current;
        const pngDataUrl = canvas.toDataURL('image/png');
        
        // Convert data URL to blob, then to File
        const response = await fetch(pngDataUrl);
        const blob = await response.blob();
        imageFile = new File([blob], 'sketch.png', { type: 'image/png' });
      } else {
        throw new Error('No image available to generate CAD');
      }

      console.log('Generating CAD from:', imageFile.name);
      
      // Call the generateCAD API
      const modelId = await generateCAD(imageFile);
      
      console.log('CAD generation completed! Model ID:', modelId);
      
      // TODO: Handle the generated model (redirect to results page, show success message, etc.)
      // For now, just show an alert
      alert(`CAD model generated successfully! Model ID: ${modelId}`);
      
    } catch (error) {
      console.error('Error generating CAD:', error);
      alert('Failed to generate CAD. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [activeTab, uploadedFile]);

  const hasContent = activeTab === 'upload' ? uploadedFile : canvasRef.current?.getContext('2d')?.getImageData(0, 0, 600, 400).data.some(pixel => pixel !== 0);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/waves.mp4" type="video/mp4" />
      </video>
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20 z-10"></div>
      
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-20 p-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <span className="text-white font-semibold text-lg">VibeCAD</span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-20 w-full max-w-6xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-6">
          <h1 className="text-white text-[clamp(1.8rem,6vw,3.5rem)] font-black drop-shadow-lg mb-3">
            Create Your
            <span className="gradient-text block">3D Masterpiece</span>
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-4">
            Upload a sketch or draw directly on our canvas. Transform your ideas into professional 3D CAD models with AI.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-1 shadow-2xl border border-white/20">
            <Button
              variant={activeTab === 'upload' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('upload')}
              className={`px-6 py-3 rounded-xl transition-all duration-300 ${
                activeTab === 'upload' 
                  ? 'bg-white text-slate-900 shadow-lg' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </Button>
            <Button
              variant={activeTab === 'draw' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('draw')}
              className={`px-6 py-3 rounded-xl transition-all duration-300 ${
                activeTab === 'draw' 
                  ? 'bg-white text-slate-900 shadow-lg' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              <Palette className="w-4 h-4 mr-2" />
              Draw Sketch
            </Button>
          </div>
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <Card className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl text-white mb-1">Upload Your Sketch</CardTitle>
              <CardDescription className="text-white/70 text-base">
                Upload a clear photo of your hand-drawn sketch
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {!previewUrl ? (
                <div className="border-2 border-dashed border-white/30 rounded-2xl p-8 text-center hover:border-white/50 transition-all duration-300 group cursor-pointer"
                     onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-12 h-12 text-white/60 mx-auto mb-4 group-hover:text-white/80 transition-colors" />
                  <Label htmlFor="file-upload" className="flex flex-row items-center justify-center cursor-pointer">
                    <div className="space-y-2 text-center flex flex-col items-center justify-center">
                      <p className="text-lg font-medium text-white">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-sm text-white/60">
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
                <div className="space-y-3">
                  <div className="relative group">
                    <img
                      src={previewUrl}
                      alt="Uploaded sketch"
                      className="w-full h-48 object-contain rounded-2xl border border-white/20 shadow-xl"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={clearUpload}
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-white/70 text-center">
                    {uploadedFile?.name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Draw Tab */}
        {activeTab === 'draw' && (
          <Card className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl text-white mb-1">Draw Your Sketch</CardTitle>
              <CardDescription className="text-white/70 text-base">
                Use your trackpad or mouse to draw your design
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="border-2 border-white/20 rounded-2xl overflow-hidden shadow-xl">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={400}
                  className="w-full h-64 bg-slate-900/50 cursor-crosshair"
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
                  className="px-4 py-2 bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Canvas
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate Button */}
        <div className="text-center mt-6">
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={!hasContent || isGenerating}
            className={`group relative inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold rounded-2xl transition-all duration-300 ${
              hasContent && !isGenerating
                ? 'bg-white text-slate-900 hover:bg-white/90 hover:scale-105 shadow-2xl'
                : 'bg-white/20 text-white/50 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating CAD...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                Transform to CAD
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
