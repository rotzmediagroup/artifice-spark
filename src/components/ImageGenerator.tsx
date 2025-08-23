import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Download, Settings, Wand2, Image, Palette, Zap, Star, Upload, X, ImageIcon, History, Share2, Copy, RotateCcw, Grid3X3, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import rotzLogo from "/lovable-uploads/76e648b8-1d96-4e74-9c2c-401522a50123.png";

const artStyles = [
  "Photorealistic", "Digital Art", "Oil Painting", "Watercolor", "Pencil Sketch", "Charcoal Drawing",
  "Anime", "Manga", "Comic Book", "Cartoon", "Pixel Art", "Vector Art", "Minimalist", "Abstract",
  "Surreal", "Fantasy", "Sci-Fi", "Cyberpunk", "Steampunk", "Art Nouveau", "Art Deco", "Pop Art",
  "Street Art", "Graffiti", "Impressionist", "Expressionist", "Cubist", "Renaissance", "Baroque",
  "Gothic", "Medieval", "Japanese Ink", "Chinese Painting", "Indian Miniature", "African Art",
  "Blueprint", "Technical Drawing", "Architectural", "Isometric", "3D Render", "Low Poly",
  "Voxel Art", "Papercraft", "Origami", "Clay Model", "Bronze Sculpture", "Marble Sculpture",
  "Neon", "Holographic", "Glitch Art", "Vaporwave", "Synthwave", "Retro", "Vintage", "Film Noir",
  // Unique & Creative Styles
  "Biomechanical", "Fractals", "Kaleidoscope", "Double Exposure", "Tilt-Shift", "Cross-Hatching",
  "Stippling", "Mosaic", "Stained Glass", "Embroidery", "Quilt Pattern", "Batik", "Tie-Dye",
  "Sand Art", "Ice Sculpture", "Latte Art", "Food Art", "Shadow Play", "Light Painting",
  "Macro Photography", "Infrared", "X-Ray", "Thermal Imaging", "Satellite View", "Microscopic",
  "Cel Shading", "Toon Shading", "Wireframe", "Point Cloud", "Particle System", "Fluid Dynamics",
  "Crystalline", "Organic", "Geometric", "Tessellation", "Voronoi", "Mandelbrot",
  "Paper Cut-out", "Pop-up Book", "Diorama", "Shadow Box", "Layered Paper", "Kirigami",
  "Grunge", "Distressed", "Weathered", "Rust Texture", "Patina", "Aged Paper",
  "Neon Signs", "LED Display", "Circuit Board", "Binary Code", "Matrix Style", "Hologram",
  "Aurora Borealis", "Galaxy", "Nebula", "Solar Flare", "Cosmic Dust", "Planetary",
  "Underwater", "Volcanic", "Desert Dunes", "Forest Canopy", "Mountain Peaks", "Ocean Waves",
  "Typography Art", "Calligraphy", "Illuminated Manuscript", "Bookbinding", "Letter Press",
  "Chalk Art", "Sidewalk Art", "Cave Painting", "Hieroglyphics", "Petroglyphs", "Runes",
  "Dieselpunk", "Solarpunk", "Biopunk", "Atompunk", "Clockwork", "Victorian",
  "Art Brut", "Outsider Art", "Folk Art", "Tribal Art", "Primitive", "Shamanic",
  "Psychedelic", "Optical Illusion", "Anamorphic", "Impossible Objects", "M.C. Escher Style",
  "Pointillism", "Fauvism", "Dadaism", "Constructivism", "Suprematism", "Bauhaus"
];

const aspectRatios = [
  { label: "Square (1:1)", value: "1:1", width: 1024, height: 1024 },
  { label: "Portrait (4:5)", value: "4:5", width: 1024, height: 1280 },
  { label: "Landscape (16:9)", value: "16:9", width: 1344, height: 768 },
  { label: "Wide (21:9)", value: "21:9", width: 1536, height: 640 },
  { label: "Phone (9:16)", value: "9:16", width: 768, height: 1344 },
];

const promptTemplates = [
  {
    name: "Fantasy Portrait",
    prompt: "A mystical fantasy portrait, magical atmosphere, ethereal lighting, detailed character design",
    category: "Portrait"
  },
  {
    name: "Sci-Fi Landscape",
    prompt: "Futuristic alien landscape, cyberpunk city, neon lights, flying vehicles, distant planets",
    category: "Landscape"
  },
  {
    name: "Abstract Art",
    prompt: "Abstract geometric composition, vibrant colors, dynamic shapes, modern art style",
    category: "Abstract"
  },
  {
    name: "Nature Scene",
    prompt: "Serene natural landscape, golden hour lighting, peaceful atmosphere, high detail",
    category: "Nature"
  },
  {
    name: "Character Design",
    prompt: "Unique character concept art, detailed costume design, expressive pose, professional illustration",
    category: "Character"
  }
];

interface GeneratedImageData {
  id: string;
  url: string;
  prompt: string;
  style: string;
  timestamp: Date;
  liked: boolean;
  settings: {
    steps: number;
    cfgScale: number;
    aspectRatio: string;
    negativePrompt: string;
  };
}

export default function ImageGenerator() {
  const [positivePrompt, setPositivePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [aspectRatio, setAspectRatio] = useState(aspectRatios[0]);
  const [steps, setSteps] = useState([30]);
  const [cfgScale, setCfgScale] = useState([7]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<GeneratedImageData[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [batchCount, setBatchCount] = useState(1);
  const [selectedHistoryImage, setSelectedHistoryImage] = useState<GeneratedImageData | null>(null);
  const [savedPresets, setSavedPresets] = useState<any[]>([]);

  // Load saved data from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('imageHistory');
    const savedPresets = localStorage.getItem('savedPresets');
    
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setImageHistory(parsedHistory);
      } catch (error) {
        console.error('Error loading image history:', error);
      }
    }
    
    if (savedPresets) {
      try {
        setSavedPresets(JSON.parse(savedPresets));
      } catch (error) {
        console.error('Error loading saved presets:', error);
      }
    }
  }, []);

  // Save to localStorage whenever history changes
  useEffect(() => {
    localStorage.setItem('imageHistory', JSON.stringify(imageHistory));
  }, [imageHistory]);

  useEffect(() => {
    localStorage.setItem('savedPresets', JSON.stringify(savedPresets));
  }, [savedPresets]);

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload a valid image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("Image size should be less than 10MB");
      return;
    }

    setReferenceImage(file);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setReferenceImagePreview(previewUrl);
    
    toast.success("Reference image uploaded successfully!");
  };

  const handleRemoveImage = () => {
    setReferenceImage(null);
    if (referenceImagePreview) {
      URL.revokeObjectURL(referenceImagePreview);
      setReferenceImagePreview(null);
    }
    toast.success("Reference image removed");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const applyTemplate = (template: any) => {
    setPositivePrompt(template.prompt);
    setSelectedTemplate(template.name);
    toast.success(`Applied template: ${template.name}`);
  };

  const saveCurrentPreset = () => {
    const preset = {
      id: Date.now().toString(),
      name: `Preset ${savedPresets.length + 1}`,
      positivePrompt,
      negativePrompt,
      selectedStyle,
      aspectRatio,
      steps: steps[0],
      cfgScale: cfgScale[0],
      timestamp: new Date()
    };
    
    setSavedPresets([...savedPresets, preset]);
    toast.success("Preset saved!");
  };

  const loadPreset = (preset: any) => {
    setPositivePrompt(preset.positivePrompt);
    setNegativePrompt(preset.negativePrompt);
    setSelectedStyle(preset.selectedStyle);
    setAspectRatio(preset.aspectRatio);
    setSteps([preset.steps]);
    setCfgScale([preset.cfgScale]);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const downloadImage = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || `rotz-ai-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Image downloaded!");
    } catch (error) {
      toast.error("Failed to download image");
    }
  };

  const shareImage = async (url: string) => {
    try {
      await navigator.share({
        title: 'Generated with ROTZ.AI',
        text: 'Check out this AI-generated image!',
        url: url
      });
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(url);
      toast.success("Image URL copied to clipboard!");
    }
  };

  const toggleLike = (imageId: string) => {
    setImageHistory(prev => 
      prev.map(img => 
        img.id === imageId ? { ...img, liked: !img.liked } : img
      )
    );
  };

  const deleteFromHistory = (imageId: string) => {
    setImageHistory(prev => prev.filter(img => img.id !== imageId));
    toast.success("Image removed from history");
  };

  const generateVariations = (originalImage: GeneratedImageData) => {
    setPositivePrompt(originalImage.prompt + " [variation]");
    setSelectedStyle(originalImage.style);
    setNegativePrompt(originalImage.settings.negativePrompt);
    setSteps([originalImage.settings.steps]);
    setCfgScale([originalImage.settings.cfgScale]);
    const ratio = aspectRatios.find(r => r.label === originalImage.settings.aspectRatio) || aspectRatios[0];
    setAspectRatio(ratio);
    toast.success("Settings loaded for variation generation");
  };

  const handleGenerate = async () => {
    if (!positivePrompt.trim()) {
      toast.error("Please enter a positive prompt");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
    
    try {
      for (let i = 0; i < batchCount; i++) {
        // Prepare the payload for the webhook
        const payload: any = {
          prompt: positivePrompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
          style: selectedStyle || undefined,
          width: aspectRatio.width,
          height: aspectRatio.height,
          steps: steps[0],
          cfg_scale: cfgScale[0],
          timestamp: new Date().toISOString()
        };

        // Add reference image if uploaded
        if (referenceImage) {
          const base64Image = await fileToBase64(referenceImage);
          payload.reference_image = base64Image;
          payload.image_prompt = true;
        }

        console.log("Sending request to webhook:", payload);
        
        const response = await fetch('https://agents.rotz.ai/webhook/a7ff7b82-67b5-4e98-adfd-132f1f100496', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Webhook response:", result);
        
        // Handle the response and add to history
        if (result.image_url || result.imageUrl || result.url) {
          const imageUrl = result.image_url || result.imageUrl || result.url;
          const newImageData: GeneratedImageData = {
            id: Date.now().toString() + i,
            url: imageUrl,
            prompt: positivePrompt.trim(),
            style: selectedStyle,
            timestamp: new Date(),
            liked: false,
            settings: {
              steps: steps[0],
              cfgScale: cfgScale[0],
              aspectRatio: aspectRatio.label,
              negativePrompt: negativePrompt.trim()
            }
          };
          
          setGeneratedImages(prev => [...prev, imageUrl]);
          setImageHistory(prev => [newImageData, ...prev]);
          toast.success("🎨 Image generated successfully!");
        } else if (result.images && Array.isArray(result.images)) {
          result.images.forEach((imageUrl: string, index: number) => {
            const newImageData: GeneratedImageData = {
              id: Date.now().toString() + i + index,
              url: imageUrl,
              prompt: positivePrompt.trim(),
              style: selectedStyle,
              timestamp: new Date(),
              liked: false,
              settings: {
                steps: steps[0],
                cfgScale: cfgScale[0],
                aspectRatio: aspectRatio.label,
                negativePrompt: negativePrompt.trim()
              }
            };
            setImageHistory(prev => [newImageData, ...prev]);
          });
          
          setGeneratedImages(result.images);
          toast.success(`🎨 ${result.images.length} images generated successfully!`);
        } else {
          console.log("Unexpected response format:", result);
          toast.success("✨ Generation completed! Check the response format.");
        }
      }
      
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(`Failed to generate image: ${error.message}`);
    } finally {
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setIsGenerating(false);
      setTimeout(() => setGenerationProgress(0), 1000);
    }
  };

  return (
    <div className="min-h-screen p-6 relative">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full blur-xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 left-32 w-40 h-40 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Enhanced Header with Logo */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <img 
              src={rotzLogo} 
              alt="ROTZ.AI Logo" 
              className="h-16 w-auto float animate-bounce-in"
            />
          </div>
          <h1 className="text-5xl font-bold text-gradient mb-4 animate-slide-up">
            AI Image Generator
          </h1>
          <p className="text-muted-foreground text-xl animate-fade-in" style={{animationDelay: '0.2s'}}>
            Create stunning images with professional AI technology
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Enhanced Controls Panel */}
          <Card className="glass p-8 space-y-8 glow hover:scale-[1.02] transition-all duration-500 animate-scale-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 animate-pulse-glow">
                <Wand2 className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gradient">Generation Controls</h2>
            </div>

            {/* Enhanced Positive Prompt */}
            <div className="space-y-3 animate-slide-up" style={{animationDelay: '0.1s'}}>
              <Label htmlFor="positive-prompt" className="flex items-center gap-3 text-lg font-medium">
                <div className="p-1 rounded bg-gradient-to-r from-purple-500/20 to-cyan-500/20">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                </div>
                Positive Prompt
                <Badge variant="secondary" className="text-xs animate-bounce">Required</Badge>
              </Label>
              <Textarea
                id="positive-prompt"
                placeholder="Describe your vision... e.g., 'A majestic dragon flying over a cyberpunk city at sunset'"
                value={positivePrompt}
                onChange={(e) => setPositivePrompt(e.target.value)}
                className="min-h-[120px] glass border-primary/30 focus:border-primary/60 hover:border-primary/40 transition-all duration-300 text-base leading-relaxed"
              />
            </div>

            {/* Negative Prompt */}
            <div className="space-y-3 animate-slide-up" style={{animationDelay: '0.15s'}}>
              <Label htmlFor="negative-prompt" className="flex items-center gap-3 text-lg font-medium">
                <div className="p-1 rounded bg-gradient-to-r from-red-500/20 to-orange-500/20">
                  <Settings className="h-5 w-5 text-secondary animate-spin" style={{animationDuration: '3s'}} />
                </div>
                Negative Prompt
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </Label>
              <Textarea
                id="negative-prompt"
                placeholder="What to avoid... e.g., 'blurry, low quality, distorted'"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="min-h-[100px] glass border-secondary/30 focus:border-secondary/60 hover:border-secondary/40 transition-all duration-300"
              />
            </div>

            {/* Reference Image Upload */}
            <div className="space-y-3 animate-slide-up" style={{animationDelay: '0.2s'}}>
              <Label className="flex items-center gap-3 text-lg font-medium">
                <div className="p-1 rounded bg-gradient-to-r from-green-500/20 to-blue-500/20">
                  <ImageIcon className="h-5 w-5 text-accent animate-pulse" />
                </div>
                Reference Image
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </Label>
              
              {!referenceImagePreview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-accent/30 rounded-lg p-8 text-center hover:border-accent/50 transition-colors duration-300 cursor-pointer glass"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-accent/60" />
                  <p className="text-muted-foreground mb-2">
                    Drag & drop an image here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    Supports JPG, PNG, WEBP up to 10MB
                  </p>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden glass border border-accent/30">
                  <img
                    src={referenceImagePreview}
                    alt="Reference"
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Button
                      onClick={handleRemoveImage}
                      size="sm"
                      variant="destructive"
                      className="bg-red-500/80 hover:bg-red-600"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                  <div className="absolute top-2 right-2 bg-green-500/80 text-white px-2 py-1 rounded text-xs font-medium">
                    Reference Image
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Templates */}
            <div className="space-y-3 animate-slide-up" style={{animationDelay: '0.3s'}}>
              <Label className="flex items-center gap-3 text-lg font-medium">
                <div className="p-1 rounded bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
                  <Star className="h-5 w-5 text-accent animate-pulse" />
                </div>
                Prompt Templates
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {promptTemplates.map((template) => (
                  <Button
                    key={template.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                    className="text-left justify-start h-auto p-3 glass"
                  >
                    <div>
                      <div className="font-medium text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{template.prompt}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Art Style */}
            <div className="space-y-3 animate-slide-up" style={{animationDelay: '0.4s'}}>
              <Label className="flex items-center gap-3 text-lg font-medium">
                <div className="p-1 rounded bg-gradient-to-r from-pink-500/20 to-purple-500/20">
                  <Palette className="h-5 w-5 text-accent animate-pulse" />
                </div>
                Art Style
              </Label>
              <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                <SelectTrigger className="glass border-accent/20">
                  <SelectValue placeholder="Choose an art style..." />
                </SelectTrigger>
                <SelectContent className="glass border-accent/20 max-h-60">
                  {artStyles.map((style) => (
                    <SelectItem key={style} value={style}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-3 animate-slide-up" style={{animationDelay: '0.5s'}}>
              <Label className="flex items-center gap-3 text-lg font-medium">
                <div className="p-1 rounded bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
                  <Image className="h-5 w-5 text-primary animate-pulse" />
                </div>
                Aspect Ratio
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {aspectRatios.map((ratio) => (
                  <Button
                    key={ratio.value}
                    variant={aspectRatio.value === ratio.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAspectRatio(ratio)}
                    className="text-xs"
                  >
                    {ratio.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Batch Generation */}
            <div className="space-y-3 animate-slide-up" style={{animationDelay: '0.6s'}}>
              <Label className="flex items-center gap-3 text-lg font-medium">
                <div className="p-1 rounded bg-gradient-to-r from-indigo-500/20 to-purple-500/20">
                  <Grid3X3 className="h-5 w-5 text-primary animate-pulse" />
                </div>
                Batch Generation
              </Label>
              <div className="flex gap-2">
                {[1, 2, 4, 6].map((count) => (
                  <Button
                    key={count}
                    variant={batchCount === count ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBatchCount(count)}
                    className="flex-1"
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4 p-4 glass rounded-lg border border-muted/20">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-muted-foreground">Advanced Settings</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveCurrentPreset}
                  className="text-xs"
                >
                  Save Preset
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Steps: {steps[0]}</Label>
                <Slider
                  value={steps}
                  onValueChange={setSteps}
                  max={100}
                  min={10}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">CFG Scale: {cfgScale[0]}</Label>
                <Slider
                  value={cfgScale}
                  onValueChange={setCfgScale}
                  max={20}
                  min={1}
                  step={0.5}
                  className="w-full"
                />
              </div>

              {savedPresets.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Saved Presets</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {savedPresets.slice(-4).map((preset) => (
                      <Button
                        key={preset.id}
                        variant="outline"
                        size="sm"
                        onClick={() => loadPreset(preset)}
                        className="text-xs truncate"
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Generation Progress */}
            {isGenerating && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Generating...</span>
                  <span>{Math.round(generationProgress)}%</span>
                </div>
                <Progress value={generationProgress} className="w-full" />
              </div>
            )}

            {/* Enhanced Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !positivePrompt.trim()}
              className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-500 transform hover:scale-[1.02] animate-pulse-glow text-white"
            >
              {isGenerating ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Generating Magic...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Zap className="h-6 w-6" />
                  Generate Images
                  <Star className="h-5 w-5 animate-pulse" />
                </div>
              )}
            </Button>
          </Card>

          {/* Enhanced Results with Tabs */}
          <Card className="glass p-8 glow animate-scale-in" style={{animationDelay: '0.2s'}}>
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="current" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Current Images
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History ({imageHistory.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="current" className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 animate-pulse-glow">
                    <Image className="h-6 w-6 text-accent" />
                  </div>
                  <h2 className="text-2xl font-bold text-gradient">Generated Images</h2>
                </div>

                {generatedImages.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {generatedImages.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-1">
                          <img
                            src={imageUrl}
                            alt={`Generated image ${index + 1}`}
                            className="w-full rounded-lg shadow-2xl transform group-hover:scale-[1.02] transition-all duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                          <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                className="glass text-white border-white/20 hover:bg-white/20"
                                onClick={() => downloadImage(imageUrl)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="glass text-white border-white/20 hover:bg-white/20"
                                onClick={() => shareImage(imageUrl)}
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 space-y-4">
                    <div className="p-6 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 w-24 h-24 mx-auto flex items-center justify-center animate-pulse-glow">
                      <Image className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-semibold text-muted-foreground">Ready to Create</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Enter your creative prompt above and watch AI transform your imagination into stunning visual art
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gradient">Image History</h2>
                  {imageHistory.length > 0 && (
                    <Badge variant="secondary">{imageHistory.length} images</Badge>
                  )}
                </div>

                {imageHistory.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imageHistory.map((image) => (
                      <Dialog key={image.id}>
                        <DialogTrigger asChild>
                          <div className="relative group cursor-pointer">
                            <div className="relative rounded-lg overflow-hidden bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-1">
                              <img
                                src={image.url}
                                alt={image.prompt}
                                className="w-full aspect-square object-cover rounded-lg shadow-lg transform group-hover:scale-105 transition-all duration-300"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                                <Button size="sm" variant="ghost" className="text-white">
                                  View Details
                                </Button>
                              </div>
                              {image.liked && (
                                <div className="absolute top-2 right-2 bg-red-500/80 text-white p-1 rounded-full">
                                  <Heart className="h-3 w-3 fill-current" />
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogTrigger>
                        
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Image Details</DialogTitle>
                          </DialogHeader>
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <img
                                src={image.url}
                                alt={image.prompt}
                                className="w-full rounded-lg shadow-lg"
                              />
                            </div>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium">Prompt</Label>
                                <p className="text-sm text-muted-foreground mt-1">{image.prompt}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Style</Label>
                                <p className="text-sm text-muted-foreground mt-1">{image.style || "Default"}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Created</Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {image.timestamp.toLocaleDateString()} at {image.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                              <div className="flex gap-2 pt-4">
                                <Button 
                                  onClick={() => downloadImage(image.url, `rotz-ai-${image.id}.png`)}
                                  className="flex-1"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => toggleLike(image.id)}
                                  className={image.liked ? "text-red-500" : ""}
                                >
                                  <Heart className={`h-4 w-4 ${image.liked ? 'fill-current' : ''}`} />
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => generateVariations(image)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline"
                                  onClick={() => deleteFromHistory(image.id)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 space-y-4">
                    <div className="p-6 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 w-24 h-24 mx-auto flex items-center justify-center">
                      <History className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-semibold text-muted-foreground">No History Yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Generate your first image to start building your creation history
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}