import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Download, Settings, Wand2, Image, Palette, Zap, Star, Upload, X, ImageIcon, History, Share2, Copy, RotateCcw, Grid3X3, Heart, Trash2, LogIn, TestTube } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useFirestore, GeneratedImageData, PresetData } from "@/hooks/useFirestore";
import { useStorage } from "@/hooks/useStorage";
import UserMenu from "@/components/UserMenu";
import AuthModal from "@/components/AuthModal";
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
  // Standard Dimensions
  { label: "Square (1:1)", value: "1:1", width: 1024, height: 1024, category: "standard" },
  { label: "Portrait (4:5)", value: "4:5", width: 1024, height: 1280, category: "standard" },
  { label: "Landscape (16:9)", value: "16:9", width: 1344, height: 768, category: "standard" },
  { label: "Wide (21:9)", value: "21:9", width: 1536, height: 640, category: "standard" },
  { label: "Phone (9:16)", value: "9:16", width: 768, height: 1344, category: "standard" },
  
  // Large Dimensions
  { label: "Large Square (1600x1600)", value: "1:1", width: 1600, height: 1600, category: "large" },
  { label: "Large Portrait (1280x1600)", value: "4:5", width: 1280, height: 1600, category: "large" },
  { label: "Large Landscape (1600x1280)", value: "5:4", width: 1600, height: 1280, category: "large" },
  { label: "Large Widescreen (1920x1080)", value: "16:9", width: 1920, height: 1080, category: "large" },
  
  // Ultra High Resolution
  { label: "Ultra Square (2000x2000)", value: "1:1", width: 2000, height: 2000, category: "ultra" },
  { label: "Ultra Portrait (1600x2000)", value: "4:5", width: 1600, height: 2000, category: "ultra" },
  { label: "Ultra Landscape (2000x1600)", value: "5:4", width: 2000, height: 1600, category: "ultra" },
  
  // Custom option
  { label: "Custom Dimensions", value: "custom", width: 1024, height: 1024, category: "custom" },
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
  const { user, loading: authLoading } = useAuth();
  const { 
    imageHistory, 
    presets, 
    loading: firestoreLoading, 
    addImageToHistory, 
    updateImageInHistory, 
    deleteImageFromHistory, 
    addPreset, 
    deletePreset,
    migrateFromLocalStorage 
  } = useFirestore();
  const { uploadReferenceImage, uploadFile, uploading, uploadProgress } = useStorage();

  const [positivePrompt, setPositivePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [aspectRatio, setAspectRatio] = useState(aspectRatios[0]);
  const [customWidth, setCustomWidth] = useState(1024);
  const [customHeight, setCustomHeight] = useState(1024);
  const [useCustomDimensions, setUseCustomDimensions] = useState(false);
  const [steps, setSteps] = useState([30]);
  const [cfgScale, setCfgScale] = useState([7]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [batchCount, setBatchCount] = useState(1);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [migrationComplete, setMigrationComplete] = useState(false);

  // Helper function to get current dimensions
  const getCurrentDimensions = () => {
    if (useCustomDimensions || aspectRatio.value === "custom") {
      return {
        width: customWidth,
        height: customHeight,
        is_custom: true,
        aspect_ratio: calculateAspectRatio(customWidth, customHeight),
        aspect_ratio_label: `Custom (${customWidth}x${customHeight})`,
        total_pixels: customWidth * customHeight,
        megapixels: Math.round((customWidth * customHeight) / 1000000 * 100) / 100
      };
    } else {
      return {
        width: aspectRatio.width,
        height: aspectRatio.height,
        is_custom: false,
        aspect_ratio: aspectRatio.value,
        aspect_ratio_label: aspectRatio.label,
        total_pixels: aspectRatio.width * aspectRatio.height,
        megapixels: Math.round((aspectRatio.width * aspectRatio.height) / 1000000 * 100) / 100
      };
    }
  };
  
  // Helper function to calculate aspect ratio from dimensions
  const calculateAspectRatio = (width: number, height: number) => {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
  };
  
  // Helper function to generate unique image ID
  const generateImageId = () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 11);
    return `img_${timestamp}_${randomStr}`;
  };
  
  // Helper function to upload image blob to Firebase Storage
  const uploadImageToStorage = async (blob: Blob, imageId: string): Promise<string> => {
    try {
      const fileName = `generated-images/${user?.uid}/${imageId}.png`;
      
      // Upload the blob to Firebase Storage using the uploadFile function from useStorage hook
      const downloadUrl = await uploadFile(blob, fileName);
      console.log("Image uploaded to Firebase Storage:", downloadUrl);
      
      return downloadUrl;
    } catch (error) {
      console.error("Error uploading to Firebase Storage:", error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Migrate data from localStorage when user first signs in
  useEffect(() => {
    if (user && !migrationComplete) {
      const hasLocalData = localStorage.getItem('imageHistory') || localStorage.getItem('savedPresets');
      if (hasLocalData) {
        migrateFromLocalStorage()
          .then(() => {
            toast.success('Your data has been migrated to the cloud!');
            setMigrationComplete(true);
          })
          .catch((error) => {
            console.error('Migration failed:', error);
            toast.error('Failed to migrate your data. Please try refreshing the page.');
          });
      } else {
        setMigrationComplete(true);
      }
    }
  }, [user, migrateFromLocalStorage, migrationComplete]);

  // Cleanup blob URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      // Clean up any blob URLs to prevent memory leaks
      generatedImages.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
          console.log("Cleaned up blob URL:", url);
        }
      });
    };
  }, []);

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!user) {
      toast.error("Please sign in to upload reference images");
      setAuthModalOpen(true);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload a valid image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size should be less than 10MB");
      return;
    }

    try {
      const downloadURL = await uploadReferenceImage(file);
      setReferenceImageUrl(downloadURL);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleRemoveImage = () => {
    setReferenceImageUrl(null);
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

  const applyTemplate = (template: { name: string; prompt: string; category: string }) => {
    setPositivePrompt(template.prompt);
    setSelectedTemplate(template.name);
    toast.success(`Applied template: ${template.name}`);
  };

  const saveCurrentPreset = async () => {
    if (!user) {
      toast.error("Please sign in to save presets");
      setAuthModalOpen(true);
      return;
    }

    try {
      const preset = {
        name: `Preset ${presets.length + 1}`,
        positivePrompt,
        negativePrompt,
        selectedStyle,
        aspectRatio,
        steps: steps[0],
        cfgScale: cfgScale[0],
        timestamp: new Date(),
        // Include custom dimension data
        customWidth,
        customHeight,
        useCustomDimensions
      };
      
      await addPreset(preset);
      toast.success("Preset saved!");
    } catch (error) {
      console.error('Error saving preset:', error);
      toast.error("Failed to save preset");
    }
  };

  const loadPreset = (preset: PresetData) => {
    setPositivePrompt(preset.positivePrompt);
    setNegativePrompt(preset.negativePrompt);
    setSelectedStyle(preset.selectedStyle);
    setAspectRatio(preset.aspectRatio);
    setSteps([preset.steps]);
    setCfgScale([preset.cfgScale]);
    
    // Restore custom dimensions if they exist
    if (preset.useCustomDimensions && preset.customWidth && preset.customHeight) {
      setCustomWidth(preset.customWidth);
      setCustomHeight(preset.customHeight);
      setUseCustomDimensions(true);
    } else {
      setUseCustomDimensions(false);
    }
    
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

  const toggleLike = async (imageId: string) => {
    if (!user) return;
    
    const image = imageHistory.find(img => img.id === imageId);
    if (image) {
      try {
        await updateImageInHistory(imageId, { liked: !image.liked });
      } catch (error) {
        console.error('Error updating like:', error);
        toast.error("Failed to update like");
      }
    }
  };

  const deleteFromHistory = async (imageId: string) => {
    if (!user) return;
    
    try {
      await deleteImageFromHistory(imageId);
      toast.success("Image removed from history");
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error("Failed to delete image");
    }
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

    if (!user) {
      toast.error("Please sign in to generate images");
      setAuthModalOpen(true);
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
        // Prepare comprehensive payload for the webhook
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        const currentDimensions = getCurrentDimensions();
        
        const payload = {
          // Generation settings - primary parameters
          generation_settings: {
            prompt: positivePrompt.trim(),
            negative_prompt: negativePrompt.trim() || undefined,
            style: selectedStyle || undefined,
            steps: steps[0],
            cfg_scale: cfgScale[0],
            batch_count: 1, // Always 1 per API call in the loop
            template_used: selectedTemplate || null,
            reference_image: referenceImageUrl || null,
            seed: null // Could be added later for reproducibility
          },
          
          // Dimension information - comprehensive size data
          dimensions: {
            width: currentDimensions.width,
            height: currentDimensions.height,
            is_custom: currentDimensions.is_custom,
            aspect_ratio: currentDimensions.aspect_ratio,
            aspect_ratio_label: currentDimensions.aspect_ratio_label,
            total_pixels: currentDimensions.total_pixels,
            megapixels: currentDimensions.megapixels,
            category: aspectRatio.category || "standard"
          },
          
          // User context - authentication and tracking
          user_context: {
            user_id: user?.uid || null,
            user_email: user?.email || null,
            user_display_name: user?.displayName || null,
            request_id: requestId,
            timestamp: new Date().toISOString(),
            app_version: "1.2.3", // Updated version
            generation_mode: referenceImageUrl ? "img2img" : "text2img",
            batch_info: {
              total_batch_count: batchCount,
              batch_index: i + 1,
              is_batch: batchCount > 1
            }
          },
          
          // UI state - complete interface context
          ui_state: {
            selected_template: selectedTemplate || null,
            custom_dimensions_enabled: useCustomDimensions || aspectRatio.value === "custom",
            available_styles: artStyles,
            selected_style_index: artStyles.indexOf(selectedStyle),
            available_aspect_ratios: aspectRatios.filter(ar => ar.category !== "custom"),
            selected_aspect_ratio_index: aspectRatios.findIndex(ar => 
              ar.width === currentDimensions.width && ar.height === currentDimensions.height
            ),
            parameter_ranges: {
              steps_range: [1, 50],
              cfg_scale_range: [1, 20],
              custom_width_range: [256, 2000],
              custom_height_range: [256, 2000]
            },
            quality_preset: "standard",
            prompt_templates: promptTemplates.map(t => ({
              name: t.name,
              category: t.category,
              active: t.name === selectedTemplate
            }))
          },
          
          // Legacy compatibility - maintain backward compatibility
          width: currentDimensions.width,
          height: currentDimensions.height,
          prompt: positivePrompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
          style: selectedStyle || undefined,
          steps: steps[0],
          cfg_scale: cfgScale[0]
        };

        console.log("Sending request to webhook:", payload);
        
        // Validate API key is present
        const apiKey = import.meta.env.VITE_WEBHOOK_API_KEY;
        if (!apiKey) {
          throw new Error('Webhook API key is not configured. Please check your environment variables.');
        }
        
        const response = await fetch('https://agents.rotz.ai/webhook/a7ff7b82-67b5-4e98-adfd-132f1f100496', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'key': apiKey
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          // Handle authentication errors specifically
          if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication failed. Please check your API credentials.');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Check if response is binary (PNG) or JSON
        const contentType = response.headers.get('content-type');
        console.log("Response content-type:", contentType);
        
        let result: any;
        let imageBlob: Blob | null = null;
        
        if (contentType && contentType.includes('image/png')) {
          // Handle binary PNG response
          imageBlob = await response.blob();
          console.log("Received binary PNG response, size:", imageBlob.size);
          
          result = {
            is_binary: true,
            blob: imageBlob,
            size: imageBlob.size
          };
        } else {
          // Handle JSON response (fallback)
          try {
            result = await response.json();
            console.log("Webhook JSON response:", result);
          } catch (jsonError) {
            // If JSON parsing fails, try to handle as binary anyway
            console.warn("JSON parsing failed, attempting binary handling:", jsonError);
            imageBlob = await response.blob();
            result = {
              is_binary: true,
              blob: imageBlob,
              size: imageBlob.size
            };
          }
        }
        
        // Handle the response and add to history
        if (result.is_binary && result.blob) {
          // Handle binary PNG response from N8N webhook
          console.log("Processing binary PNG response...", result.blob.size, "bytes");
          
          const imageId = generateImageId();
          const currentDims = getCurrentDimensions();
          
          // Create temporary blob URL for immediate display
          const tempImageUrl = URL.createObjectURL(result.blob);
          console.log("Created temporary blob URL:", tempImageUrl);
          
          // Show image immediately
          setGeneratedImages(prev => [...prev, tempImageUrl]);
          toast.success("🎨 Image generated! Uploading to storage...");
          
          try {
            // Upload binary image to Firebase Storage in background
            const firebaseImageUrl = await uploadImageToStorage(result.blob, imageId);
            console.log("Upload successful, replacing temp URL with Firebase URL");
            
            // Replace temporary URL with Firebase URL
            setGeneratedImages(prev => 
              prev.map(url => url === tempImageUrl ? firebaseImageUrl : url)
            );
            
            // Create image data with Firebase Storage URL
            const newImageData: GeneratedImageData = {
              id: imageId,
              url: firebaseImageUrl,
              prompt: positivePrompt.trim(),
              style: selectedStyle,
              timestamp: new Date(),
              liked: false,
              settings: {
                steps: steps[0],
                cfgScale: cfgScale[0],
                aspectRatio: currentDims.aspect_ratio_label,
                negativePrompt: negativePrompt.trim(),
                // Enhanced dimension data
                width: currentDims.width,
                height: currentDims.height,
                isCustomDimensions: currentDims.is_custom,
                totalPixels: currentDims.total_pixels,
                megapixels: currentDims.megapixels
              }
            };
            
            // Save to history with Firebase URL
            await addImageToHistory(newImageData);
            toast.success("💾 Image saved to your collection!");
            
            // Clean up temporary blob URL
            URL.revokeObjectURL(tempImageUrl);
            
          } catch (uploadError) {
            console.error("Failed to upload image:", uploadError);
            toast.error(`Failed to save generated image: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
            
            // Keep the temporary URL if upload fails, so user can still see the image
            console.log("Upload failed, keeping temporary blob URL for user to see image");
          }
          
        } else if (result.image_url || result.imageUrl || result.url) {
          // Handle JSON response with image URL (legacy support)
          const imageUrl = result.image_url || result.imageUrl || result.url;
          const currentDims = getCurrentDimensions();
          const newImageData: GeneratedImageData = {
            id: generateImageId(),
            url: imageUrl,
            prompt: positivePrompt.trim(),
            style: selectedStyle,
            timestamp: new Date(),
            liked: false,
            settings: {
              steps: steps[0],
              cfgScale: cfgScale[0],
              aspectRatio: currentDims.aspect_ratio_label,
              negativePrompt: negativePrompt.trim(),
              // Enhanced dimension data
              width: currentDims.width,
              height: currentDims.height,
              isCustomDimensions: currentDims.is_custom,
              totalPixels: currentDims.total_pixels,
              megapixels: currentDims.megapixels
            }
          };
          
          setGeneratedImages(prev => [...prev, imageUrl]);
          await addImageToHistory(newImageData);
          toast.success("🎨 Image generated successfully!");
        } else if (result.images && Array.isArray(result.images)) {
          const currentDims = getCurrentDimensions();
          for (const imageUrl of result.images) {
            const newImageData: GeneratedImageData = {
              id: generateImageId(),
              url: imageUrl,
              prompt: positivePrompt.trim(),
              style: selectedStyle,
              timestamp: new Date(),
              liked: false,
              settings: {
                steps: steps[0],
                cfgScale: cfgScale[0],
                aspectRatio: currentDims.aspect_ratio_label,
                negativePrompt: negativePrompt.trim(),
                // Enhanced dimension data
                width: currentDims.width,
                height: currentDims.height,
                isCustomDimensions: currentDims.is_custom,
                totalPixels: currentDims.total_pixels,
                megapixels: currentDims.megapixels
              }
            };
            await addImageToHistory(newImageData);
          }
          
          setGeneratedImages(result.images);
          toast.success(`🎨 ${result.images.length} images generated successfully!`);
        } else {
          console.log("Unexpected response format:", result);
          
          // If we have a blob but it wasn't detected as binary, try to handle it
          if (imageBlob && imageBlob.size > 0) {
            console.log("Attempting to handle undetected binary data...", imageBlob.size, "bytes");
            const imageId = generateImageId();
            const currentDims = getCurrentDimensions();
            
            // Create temporary blob URL for immediate display
            const tempImageUrl = URL.createObjectURL(imageBlob);
            console.log("Created temporary blob URL for fallback:", tempImageUrl);
            
            // Show image immediately
            setGeneratedImages(prev => [...prev, tempImageUrl]);
            toast.success("🎨 Image detected! Processing...");
            
            try {
              const firebaseImageUrl = await uploadImageToStorage(imageBlob, imageId);
              
              // Replace temporary URL with Firebase URL
              setGeneratedImages(prev => 
                prev.map(url => url === tempImageUrl ? firebaseImageUrl : url)
              );
              
              const newImageData: GeneratedImageData = {
                id: imageId,
                url: firebaseImageUrl,
                prompt: positivePrompt.trim(),
                style: selectedStyle,
                timestamp: new Date(),
                liked: false,
                settings: {
                  steps: steps[0],
                  cfgScale: cfgScale[0],
                  aspectRatio: currentDims.aspect_ratio_label,
                  negativePrompt: negativePrompt.trim(),
                  width: currentDims.width,
                  height: currentDims.height,
                  isCustomDimensions: currentDims.is_custom,
                  totalPixels: currentDims.total_pixels,
                  megapixels: currentDims.megapixels
                }
              };
              
              await addImageToHistory(newImageData);
              toast.success("💾 Image processed and saved!");
              
              // Clean up temporary blob URL
              URL.revokeObjectURL(tempImageUrl);
              
            } catch (uploadError) {
              console.error("Failed to process binary data:", uploadError);
              toast.error(`❌ Failed to save image: ${uploadError instanceof Error ? uploadError.message : 'Upload error'}`);
              
              // Keep the temporary URL if upload fails
              console.log("Fallback upload failed, keeping temporary blob URL");
            }
          } else {
            toast.warning("⚠️ Generation completed but no recognizable image data received.");
          }
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-full blur-xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 left-32 w-40 h-40 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Enhanced Header with Logo and User Menu */}
        <div className="text-center mb-12 animate-fade-in relative">
          <div className="absolute top-0 right-0 flex gap-2">
            <a href="/test" className="inline-flex">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Database Test
              </Button>
            </a>
            <UserMenu />
          </div>
          
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
          {user && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Welcome back, {user.displayName || user.email}</span>
              <Badge variant="secondary" className="animate-pulse">Cloud Synced</Badge>
            </div>
          )}
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

            {!user && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <div className="flex items-center gap-3 mb-2">
                  <LogIn className="h-5 w-5 text-amber-500" />
                  <h3 className="font-medium text-amber-500">Sign in for full experience</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Sign in to save your images, presets, and sync across devices
                </p>
                <Button 
                  onClick={() => setAuthModalOpen(true)}
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  Sign In
                </Button>
              </div>
            )}

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
              
              {!referenceImageUrl ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-accent/30 rounded-lg p-8 text-center hover:border-accent/50 transition-colors duration-300 cursor-pointer glass"
                  onClick={() => user ? document.getElementById('image-upload')?.click() : setAuthModalOpen(true)}
                >
                  {uploading ? (
                    <div className="space-y-4">
                      <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto"></div>
                      <p className="text-muted-foreground">Uploading... {uploadProgress}%</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto mb-4 text-accent/60" />
                      <p className="text-muted-foreground mb-2">
                        {user ? "Drag & drop an image here, or click to browse" : "Sign in to upload reference images"}
                      </p>
                      <p className="text-sm text-muted-foreground/70">
                        Supports JPG, PNG, WEBP up to 10MB
                      </p>
                    </>
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                    className="hidden"
                    disabled={!user}
                  />
                </div>
              ) : (
                <div className="relative rounded-lg overflow-hidden glass border border-accent/30">
                  <img
                    src={referenceImageUrl}
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

            {/* Dimensions Selector */}
            <div className="space-y-3 animate-slide-up" style={{animationDelay: '0.5s'}}>
              <Label className="flex items-center gap-3 text-lg font-medium">
                <div className="p-1 rounded bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
                  <Image className="h-5 w-5 text-primary animate-pulse" />
                </div>
                Image Dimensions
              </Label>
              
              <Tabs defaultValue="presets" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="presets">Presets</TabsTrigger>
                  <TabsTrigger value="large">Large</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>
                
                {/* Standard & Large Presets */}
                <TabsContent value="presets" className="space-y-2 mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    {aspectRatios.filter(ar => ar.category === "standard").map((ratio) => (
                      <Button
                        key={`${ratio.value}-${ratio.width}`}
                        variant={aspectRatio.width === ratio.width && aspectRatio.height === ratio.height && !useCustomDimensions ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setAspectRatio(ratio);
                          setUseCustomDimensions(false);
                        }}
                        className="text-xs"
                      >
                        {ratio.label}
                      </Button>
                    ))}
                  </div>
                </TabsContent>
                
                {/* Large & Ultra Presets */}
                <TabsContent value="large" className="space-y-2 mt-3">
                  <div className="grid grid-cols-1 gap-2">
                    {aspectRatios.filter(ar => ar.category === "large" || ar.category === "ultra").map((ratio) => (
                      <Button
                        key={`${ratio.value}-${ratio.width}`}
                        variant={aspectRatio.width === ratio.width && aspectRatio.height === ratio.height && !useCustomDimensions ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setAspectRatio(ratio);
                          setUseCustomDimensions(false);
                        }}
                        className="text-xs justify-between"
                      >
                        <span>{ratio.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round((ratio.width * ratio.height) / 1000000 * 100) / 100}MP
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </TabsContent>
                
                {/* Custom Dimensions */}
                <TabsContent value="custom" className="space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm mb-1 block">Width</Label>
                      <Input
                        type="number"
                        min={256}
                        max={2000}
                        value={customWidth}
                        onChange={(e) => {
                          const width = parseInt(e.target.value) || 256;
                          setCustomWidth(Math.min(2000, Math.max(256, width)));
                          setUseCustomDimensions(true);
                        }}
                        className="text-sm"
                        placeholder="Width (256-2000)"
                      />
                    </div>
                    <div>
                      <Label className="text-sm mb-1 block">Height</Label>
                      <Input
                        type="number"
                        min={256}
                        max={2000}
                        value={customHeight}
                        onChange={(e) => {
                          const height = parseInt(e.target.value) || 256;
                          setCustomHeight(Math.min(2000, Math.max(256, height)));
                          setUseCustomDimensions(true);
                        }}
                        className="text-sm"
                        placeholder="Height (256-2000)"
                      />
                    </div>
                  </div>
                  
                  {/* Custom Dimension Info */}
                  {(useCustomDimensions) && (
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <span>Aspect Ratio: {calculateAspectRatio(customWidth, customHeight)}</span>
                        <Badge variant="outline">{Math.round((customWidth * customHeight) / 1000000 * 100) / 100}MP</Badge>
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {customWidth} × {customHeight} pixels ({(customWidth * customHeight).toLocaleString()} total)
                      </div>
                      {(customWidth * customHeight > 2000000) && (
                        <div className="text-amber-600 text-xs mt-2">
                          ⚠️ Large dimensions may take longer to generate
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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

              {presets.length > 0 && user && (
                <div className="space-y-2">
                  <Label className="text-sm">Saved Presets</Label>
                  <div className="grid grid-cols-2 gap-1">
                    {presets.slice(-4).map((preset) => (
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

        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </div>
    </div>
  );
}