import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Download, Settings, Wand2, Image, Palette } from "lucide-react";
import { toast } from "sonner";

const artStyles = [
  "Photorealistic", "Digital Art", "Oil Painting", "Watercolor", "Pencil Sketch", "Charcoal Drawing",
  "Anime", "Manga", "Comic Book", "Cartoon", "Pixel Art", "Vector Art", "Minimalist", "Abstract",
  "Surreal", "Fantasy", "Sci-Fi", "Cyberpunk", "Steampunk", "Art Nouveau", "Art Deco", "Pop Art",
  "Street Art", "Graffiti", "Impressionist", "Expressionist", "Cubist", "Renaissance", "Baroque",
  "Gothic", "Medieval", "Japanese Ink", "Chinese Painting", "Indian Miniature", "African Art",
  "Blueprint", "Technical Drawing", "Architectural", "Isometric", "3D Render", "Low Poly",
  "Voxel Art", "Papercraft", "Origami", "Clay Model", "Bronze Sculpture", "Marble Sculpture",
  "Neon", "Holographic", "Glitch Art", "Vaporwave", "Synthwave", "Retro", "Vintage", "Film Noir"
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
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            AI Image Generator
          </h1>
          <p className="text-muted-foreground text-lg">
            Create stunning images with advanced AI technology
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <Card className="glass p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Wand2 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Generation Controls</h2>
            </div>

            {/* Positive Prompt */}
            <div className="space-y-2">
              <Label htmlFor="positive-prompt" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Positive Prompt
              </Label>
              <Textarea
                id="positive-prompt"
                placeholder="Describe what you want to create..."
                value={positivePrompt}
                onChange={(e) => setPositivePrompt(e.target.value)}
                className="min-h-[100px] glass border-primary/20 focus:border-primary/50"
              />
            </div>

            {/* Negative Prompt */}
            <div className="space-y-2">
              <Label htmlFor="negative-prompt" className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-secondary" />
                Negative Prompt
              </Label>
              <Textarea
                id="negative-prompt"
                placeholder="What to avoid in the image..."
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="min-h-[80px] glass border-secondary/20 focus:border-secondary/50"
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

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !positivePrompt.trim()}
              className="w-full h-12 text-lg font-medium glow animate-glow-pulse"
              size="lg"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
                  Generating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generate Images
                </div>
              )}
            </Button>
          </Card>

          {/* Results Panel */}
          <Card className="glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Image className="h-5 w-5 text-secondary" />
                Generated Images
              </h2>
              {generatedImages.length > 0 && (
                <Badge variant="secondary" className="cyber-glow">
                  {generatedImages.length} Images
                </Badge>
              )}
            </div>

            {generatedImages.length === 0 ? (
              <div className="h-96 flex items-center justify-center text-center text-muted-foreground">
                <div className="space-y-4">
                  <div className="w-24 h-24 mx-auto bg-muted/20 rounded-lg flex items-center justify-center">
                    <Image className="h-12 w-12" />
                  </div>
                  <p>Your generated images will appear here</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {generatedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Generated image ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg border border-muted/20 group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                      <Button size="sm" variant="secondary" className="cyber-glow">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
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