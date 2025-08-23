import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Download, Settings, Wand2, Image, Palette, Zap, Star } from "lucide-react";
import { toast } from "sonner";
import rotzLogo from "@/assets/rotz-logo.png";

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

export default function ImageGenerator() {
  const [positivePrompt, setPositivePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [aspectRatio, setAspectRatio] = useState(aspectRatios[0]);
  const [steps, setSteps] = useState([30]);
  const [cfgScale, setCfgScale] = useState([7]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!positivePrompt.trim()) {
      toast.error("Please enter a positive prompt");
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock generated images
      const mockImages = [
        "https://images.unsplash.com/photo-1706885093487-7eda37f48a60?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1706885093385-b6b87b72f15a?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1706885093480-e3d2b9c38e84?w=500&h=500&fit=crop",
        "https://images.unsplash.com/photo-1706885093294-8ddf4a4c4cb3?w=500&h=500&fit=crop"
      ];
      
      setGeneratedImages(mockImages);
      toast.success("Images generated successfully!");
    } catch (error) {
      toast.error("Failed to generate images");
    } finally {
      setIsGenerating(false);
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
          <div className="flex items-center justify-center gap-2 mt-4 animate-fade-in" style={{animationDelay: '0.4s'}}>
            <Star className="h-5 w-5 text-yellow-400 animate-pulse" />
            <span className="text-sm text-muted-foreground">100+ Art Styles Available</span>
            <Star className="h-5 w-5 text-yellow-400 animate-pulse" />
          </div>
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

            {/* Enhanced Negative Prompt */}
            <div className="space-y-3 animate-slide-up" style={{animationDelay: '0.2s'}}>
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

            {/* Art Style */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-accent" />
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
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
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

            {/* Advanced Settings */}
            <div className="space-y-4 p-4 glass rounded-lg border border-muted/20">
              <h3 className="font-medium text-sm text-muted-foreground">Advanced Settings</h3>
              
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
            </div>

            {/* Enhanced Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !positivePrompt.trim()}
              className="w-full h-14 text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 glow pulse-glow transform transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed animate-bounce-in"
              size="lg"
            >
              {isGenerating ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
                  <span>Generating Magic...</span>
                  <Zap className="h-5 w-5 animate-pulse" />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 animate-pulse" />
                  <span>Generate Images</span>
                  <Zap className="h-5 w-5" />
                </div>
              )}
            </Button>
          </Card>

          {/* Enhanced Results Panel */}
          <Card className="glass p-8 glow hover:scale-[1.02] transition-all duration-500 animate-scale-in" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 animate-pulse-glow">
                  <Image className="h-6 w-6 text-secondary" />
                </div>
                <span className="text-gradient">Generated Images</span>
              </h2>
              {generatedImages.length > 0 && (
                <Badge variant="secondary" className="cyber-glow animate-bounce text-lg px-4 py-2">
                  {generatedImages.length} Images ✨
                </Badge>
              )}
            </div>

            {generatedImages.length === 0 ? (
              <div className="h-96 flex items-center justify-center text-center text-muted-foreground animate-fade-in">
                <div className="space-y-6">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl flex items-center justify-center animate-pulse-glow">
                    <Image className="h-16 w-16 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-medium">Your AI masterpieces will appear here</p>
                    <p className="text-sm text-muted-foreground/70">Fill in your prompts and hit generate to get started!</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {generatedImages.map((image, index) => (
                  <div key={index} className="relative group animate-scale-in" style={{animationDelay: `${index * 0.1}s`}}>
                    <img
                      src={image}
                      alt={`Generated image ${index + 1}`}
                      className="w-full h-56 object-cover rounded-xl border border-muted/30 group-hover:scale-110 transition-all duration-500 shadow-lg hover:shadow-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl flex items-end justify-center pb-4">
                      <Button size="sm" variant="secondary" className="cyber-glow hover:scale-110 transition-transform duration-200 bg-white/90 text-black font-medium">
                        <Download className="h-4 w-4 mr-2" />
                        Download HD
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/50 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <Star className="h-4 w-4 text-yellow-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}