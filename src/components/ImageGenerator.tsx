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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, Download, Settings, Wand2, Image, Palette, Zap, Star, Upload, X, ImageIcon, History, Share2, Copy, RotateCcw, Heart, Trash2, LogIn, Clock, AlertTriangle, Video, Camera } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useFirestore, GeneratedImageData, PresetData } from "@/hooks/useFirestore";
import { useStorage } from "@/hooks/useStorage";
import UserMenu from "@/components/UserMenu";
import AuthModal from "@/components/AuthModal";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { CreditDisplay } from "@/components/CreditDisplay";
import { useCredits } from "@/hooks/useCredits";
import { useImageExtension } from "@/hooks/useImageExtension";
import { useHaptic } from "@/hooks/useHaptic";
import { getExpirationStatus, formatExpirationDate } from "@/lib/dateUtils";
import rotzLogo from "/lovable-uploads/76e648b8-1d96-4e74-9c2c-401522a50123.png";

const artStyles = [
  "3D Render", "Abstract", "African Art", "Aged Paper", "Anamorphic", "Anime", "Architectural", 
  "Architectural Visualization", "Art Brut", "Art Deco", "Art Nouveau", "Atompunk", "Aurora Borealis", 
  "Baroque", "Batik", "Bauhaus", "Binary Code", "Biomechanical", "Biopunk", "Blueprint", 
  "Bookbinding", "Bronze Sculpture", "Cartoon", "Cave Painting", "Cel Shading", "Chalk Art", 
  "Charcoal Drawing", "Children's Book Illustration", "Chinese Painting", "Circuit Board", 
  "Clay Model", "Clockwork", "Comic Book", "Comic Strip", "Concept Art", "Constructivism", 
  "Cross-Hatching", "Crystalline", "Cubist", "Cyberpunk", "Dadaism", "Desert Dunes", 
  "Dieselpunk", "Digital Art", "Diorama", "Distressed", "Double Exposure", "Embroidery", 
  "Expressionist", "Fantasy", "Fashion Photography", "Fauvism", "Film Noir", "Fluid Dynamics", 
  "Folk Art", "Food Art", "Food Photography", "Forest Canopy", "Fractals", "Galaxy", 
  "Game Board", "Geometric", "Glitch Art", "Gothic", "Graffiti", "Grunge", "Hieroglyphics", 
  "Hologram", "Holographic", "Hyper Realistic", "Ice Sculpture", "Illuminated Manuscript", 
  "Impossible Objects", "Impressionist", "Indian Miniature", "Infrared", "Isometric", 
  "Japanese Ink", "Kaleidoscope", "Kirigami", "Latte Art", "Layered Paper", "LED Display", 
  "Letter Press", "Light Painting", "Low Poly", "M.C. Escher Style", "Macro Photography", 
  "Mandelbrot", "Manga", "Marble Sculpture", "Matte Painting", "Matrix Style", "Medical Illustration", 
  "Medieval", "Microscopic", "Minimalist", "Mosaic", "Mountain Peaks", "Nebula", "Neon", 
  "Neon Signs", "Ocean Waves", "Oil Painting", "Optical Illusion", "Organic", "Origami", 
  "Outsider Art", "Paper Cut-out", "Papercraft", "Particle System", "Patina", "Pencil Sketch", 
  "Photo Realistic", "Photorealistic", "Pixel Art", "Planetary", "Point Cloud", "Pointillism", 
  "Pop Art", "Pop-up Book", "Primitive", "Psychedelic", "Quilt Pattern", "Renaissance", 
  "Retro", "Runes", "Rust Texture", "Sand Art", "Satellite View", "Sci-Fi", "Scientific Diagram", 
  "Shadow Box", "Shadow Play", "Shamanic", "Sidewalk Art", "Solar Flare", "Solarpunk", 
  "Stained Glass", "Steampunk", "Stippling", "Street Art", "Suprematism", "Surreal", 
  "Synthwave", "Technical Drawing", "Technical Manual", "Tessellation", "Thermal Imaging", 
  "Tie-Dye", "Tilt-Shift", "Toon Shading", "Tribal Art", "Typography Art", "Underwater", 
  "Vaporwave", "Vector Art", "Victorian", "Vintage", "Volcanic", "Voronoi", "Voxel Art", 
  "Watercolor", "Weathered", "Wireframe", "X-Ray"
].sort();

// Detailed style descriptions for better AI understanding
const styleDescriptions = {
  "3D Render": "Three-dimensional computer graphics rendering with realistic lighting, shadows, and textures. Professional 3D modeling aesthetic with clean surfaces and volumetric lighting.",
  "Abstract": "Non-representational art focusing on colors, forms, and composition. Emphasis on visual elements rather than realistic depiction, exploring pure artistic expression.",
  "Anime": "Japanese animation style with distinctive character designs, large expressive eyes, stylized proportions, and vibrant colors typical of manga and anime culture.",
  "Architectural": "Precise architectural drawing style with clean lines, technical accuracy, and professional presentation suitable for construction and design documentation.",
  "Architectural Visualization": "Photorealistic architectural rendering showing buildings and spaces with accurate materials, lighting, and environmental context for presentation purposes.",
  "Cartoon": "Simplified, exaggerated illustration style with bold outlines, bright colors, and whimsical character designs typical of animated cartoons and comic strips.",
  "Charcoal Drawing": "Traditional charcoal art technique with rich blacks, subtle grays, and soft blending. Emphasis on dramatic contrast and expressive mark-making.",
  "Children's Book Illustration": "Warm, friendly illustration style appropriate for young readers. Bright colors, simple shapes, and engaging characters with educational appeal.",
  "Comic Book": "Sequential art style with bold outlines, dynamic compositions, speech bubbles, and action-oriented visual storytelling typical of superhero and graphic novels.",
  "Comic Strip": "Panel-based illustration format with clear narrative flow, character consistency, and visual humor typical of newspaper comic strips.",
  "Concept Art": "Professional game and film concept artwork with detailed environments, character designs, and mood exploration for entertainment industry production.",
  "Cyberpunk": "Futuristic dystopian aesthetic with neon colors, high-tech elements, urban decay, and digital enhancement themes characteristic of cyberpunk genre.",
  "Digital Art": "Contemporary digital painting and illustration created with electronic tools, featuring smooth gradients, precise details, and modern artistic techniques.",
  "Fantasy": "Imaginative artwork depicting magical realms, mythical creatures, and supernatural elements with rich storytelling and otherworldly atmospheres.",
  "Fashion Photography": "Professional fashion and portrait photography with emphasis on styling, lighting, and glamour. High-end commercial aesthetic with model poses.",
  "Food Photography": "Appetizing food presentation with careful lighting, composition, and styling to showcase culinary dishes in their most appealing form.",
  "Game Board": "Tabletop board game design aesthetic with clear geometric layouts, vibrant colors suitable for game components, top-down perspective, clean iconography optimized for gameplay functionality.",
  "Hyper Realistic": "Extremely detailed realistic artwork that appears photographic, with meticulous attention to textures, lighting, and minute details that surpass normal photography.",
  "Impressionist": "Loose brushwork and emphasis on light effects, outdoor scenes, and momentary visual impressions typical of French Impressionist movement.",
  "Manga": "Japanese comic book style with detailed line work, expressive characters, screen tones, and panel-based storytelling typical of manga publications.",
  "Matte Painting": "Digital matte painting technique used in film and games for creating expansive environments and backgrounds with photorealistic detail and atmospheric perspective.",
  "Medical Illustration": "Scientific accuracy in depicting anatomical structures, medical procedures, and biological systems with educational clarity and professional precision.",
  "Minimalist": "Clean, simplified aesthetic with minimal elements, abundant white space, and focus on essential forms without unnecessary decoration or complexity.",
  "Oil Painting": "Traditional oil painting technique with rich, textured brushstrokes, warm color palette, classical composition, painterly quality with visible brush marks and luminous depth.",
  "Photo Realistic": "Photographic quality in painted or digital art, achieving realistic lighting, textures, and proportions that closely mimic actual photography.",
  "Photorealistic": "Artwork that achieves the visual fidelity and detail of a photograph, with accurate lighting, shadows, and surface textures.",
  "Pixel Art": "Digital art created with individual pixels, featuring limited color palettes and blocky aesthetic reminiscent of early video game graphics.",
  "Sci-Fi": "Science fiction aesthetic with futuristic technology, space themes, advanced machinery, and speculative design elements.",
  "Scientific Diagram": "Clear, educational illustration style used for scientific and technical documentation with precise labeling and informational clarity.",
  "Steampunk": "Victorian-era inspired aesthetic combined with steam-powered machinery, brass fixtures, gears, and retro-futuristic industrial design elements.",
  "Technical Drawing": "Precise engineering and technical illustration style with clean lines, accurate proportions, and professional drafting standards.",
  "Technical Manual": "Instructional illustration style used in manuals and documentation, featuring clear step-by-step visuals and informational graphics.",
  "Vector Art": "Clean geometric artwork created with mathematical curves and shapes, featuring solid colors and scalable graphics typical of logo and icon design.",
  "Watercolor": "Traditional watercolor painting technique with transparent washes, soft blending, organic color bleeding, and delicate artistic expression."
};

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
  // Portraits
  {
    name: "Fantasy Portrait",
    prompt: "A mystical fantasy portrait, magical atmosphere, ethereal lighting, detailed character design, enchanted eyes",
    category: "Portrait"
  },
  {
    name: "Realistic Portrait",
    prompt: "Professional headshot photography, studio lighting, sharp focus, detailed facial features, natural expression",
    category: "Portrait"
  },
  {
    name: "Heroic Character",
    prompt: "Epic heroic character portrait, dramatic lighting, powerful stance, detailed armor or costume, inspiring presence",
    category: "Portrait"
  },
  {
    name: "Cyberpunk Portrait",
    prompt: "Futuristic cyberpunk portrait, neon lighting, technological augmentations, urban setting, dystopian atmosphere",
    category: "Portrait"
  },

  // Landscapes
  {
    name: "Sci-Fi Landscape",
    prompt: "Futuristic alien landscape, cyberpunk city, neon lights, flying vehicles, distant planets, atmospheric perspective",
    category: "Landscape"
  },
  {
    name: "Nature Scene",
    prompt: "Serene natural landscape, golden hour lighting, peaceful atmosphere, high detail, pristine wilderness",
    category: "Landscape"
  },
  {
    name: "Fantasy Realm",
    prompt: "Magical fantasy landscape, floating islands, mystical forests, ancient ruins, ethereal atmosphere",
    category: "Landscape"
  },
  {
    name: "Post-Apocalyptic",
    prompt: "Post-apocalyptic wasteland, abandoned buildings, dramatic sky, desolate atmosphere, survival setting",
    category: "Landscape"
  },

  // Abstract
  {
    name: "Abstract Art",
    prompt: "Abstract geometric composition, vibrant colors, dynamic shapes, modern art style, flowing forms",
    category: "Abstract"
  },
  {
    name: "Fluid Dynamics",
    prompt: "Liquid paint splash, fluid dynamics, swirling colors, organic patterns, smooth gradients",
    category: "Abstract"
  },
  {
    name: "Sacred Geometry",
    prompt: "Sacred geometric patterns, mandala design, symmetrical composition, spiritual symbolism, intricate details",
    category: "Abstract"
  },

  // Architecture
  {
    name: "Modern Architecture",
    prompt: "Contemporary architectural design, clean lines, glass and steel, minimalist aesthetic, urban environment",
    category: "Architecture"
  },
  {
    name: "Ancient Temple",
    prompt: "Ancient temple architecture, ornate carvings, historical stonework, mystical atmosphere, cultural heritage",
    category: "Architecture"
  },
  {
    name: "Futuristic Building",
    prompt: "Futuristic architectural structure, innovative design, advanced materials, sci-fi cityscape, high-tech aesthetic",
    category: "Architecture"
  },

  // Objects & Still Life
  {
    name: "Product Shot",
    prompt: "Professional product photography, clean white background, studio lighting, commercial quality, detailed textures",
    category: "Object"
  },
  {
    name: "Vintage Still Life",
    prompt: "Classic still life arrangement, vintage objects, warm lighting, artistic composition, nostalgic atmosphere",
    category: "Object"
  },
  {
    name: "Magical Artifact",
    prompt: "Enchanted magical artifact, glowing runes, mystical energy, fantasy item, detailed craftsmanship",
    category: "Object"
  },

  // Animals & Creatures
  {
    name: "Wildlife Portrait",
    prompt: "Majestic wildlife animal portrait, natural habitat, detailed fur or feathers, expressive eyes, nature photography",
    category: "Animal"
  },
  {
    name: "Mythical Creature",
    prompt: "Legendary mythical creature, dragon or phoenix, magical powers, fantasy setting, epic scale",
    category: "Animal"
  },
  {
    name: "Cute Pet",
    prompt: "Adorable pet portrait, playful expression, soft lighting, cozy domestic setting, heartwarming moment",
    category: "Animal"
  },

  // Scenes & Action
  {
    name: "Epic Battle",
    prompt: "Dynamic battle scene, warriors in combat, dramatic action, epic scale, cinematic composition",
    category: "Scene"
  },
  {
    name: "Peaceful Moment",
    prompt: "Tranquil peaceful scene, calm atmosphere, gentle lighting, serene mood, contemplative setting",
    category: "Scene"
  },
  {
    name: "Adventure Scene",
    prompt: "Exciting adventure moment, explorers discovering ancient ruins, treasure hunting, mysterious atmosphere",
    category: "Scene"
  },
  // Action & Adventure
  {
    name: "Epic Quest",
    prompt: "Heroes embarking on epic quest, dramatic landscape, adventure gear, determination, cinematic journey",
    category: "Action"
  },
  {
    name: "Battle Scene",
    prompt: "Intense medieval battle, clashing swords, armored warriors, battlefield chaos, dynamic action",
    category: "Action"
  },
  {
    name: "Heist Moment",
    prompt: "Suspenseful heist scene, stealthy infiltration, high-tech security, tension-filled atmosphere",
    category: "Action"
  },
  {
    name: "Chase Sequence",
    prompt: "High-speed chase through city streets, motion blur, adrenaline rush, cinematic action",
    category: "Action"
  },
  // Horror & Dark
  {
    name: "Haunted Mansion",
    prompt: "Spooky Victorian mansion, fog-shrouded, gothic architecture, eerie atmosphere, ghostly presence",
    category: "Horror"
  },
  {
    name: "Cosmic Horror",
    prompt: "Eldritch cosmic horror, tentacled entity, otherworldly terror, dark void, existential dread",
    category: "Horror"
  },
  {
    name: "Gothic Nightmare",
    prompt: "Dark gothic cathedral, shadows and candlelight, mysterious figures, haunting atmosphere",
    category: "Horror"
  },
  {
    name: "Abandoned Place",
    prompt: "Decaying abandoned building, overgrown vegetation, broken windows, post-apocalyptic mood",
    category: "Horror"
  },
  // Fantasy & Magic
  {
    name: "Dragon Encounter",
    prompt: "Majestic dragon perched on mountain peak, scales glistening, ancient power, fantasy epic",
    category: "Fantasy"
  },
  {
    name: "Spell Casting",
    prompt: "Wizard casting powerful spell, magical energy swirling, glowing runes, mystical power",
    category: "Fantasy"
  },
  {
    name: "Magical Forest",
    prompt: "Enchanted forest glade, luminescent plants, fairy lights, mystical creatures, ethereal beauty",
    category: "Fantasy"
  },
  {
    name: "Crystal Cave",
    prompt: "Underground crystal cave, glowing gems, prismatic light, magical formations, wonder and mystery",
    category: "Fantasy"
  },
  // Sci-Fi & Future
  {
    name: "Space Exploration",
    prompt: "Astronaut exploring alien planet, distant galaxies, space suit reflection, cosmic wonder",
    category: "Sci-Fi"
  },
  {
    name: "AI Awakening",
    prompt: "Advanced AI robot gaining consciousness, glowing circuits, digital awakening, futuristic laboratory",
    category: "Sci-Fi"
  },
  {
    name: "Cyberpunk Street",
    prompt: "Neon-lit cyberpunk alley, rain-slicked streets, holographic ads, urban dystopia",
    category: "Sci-Fi"
  },
  {
    name: "Time Portal",
    prompt: "Swirling time portal, energy vortex, temporal distortion, sci-fi gateway, dimensional travel",
    category: "Sci-Fi"
  },
  // Artistic & Creative
  {
    name: "Surreal Dreamscape",
    prompt: "Salvador Dali inspired dreamscape, floating objects, impossible architecture, surreal imagery",
    category: "Artistic"
  },
  {
    name: "Pop Art Style",
    prompt: "Vibrant pop art composition, bold colors, comic book style, retro aesthetic, graphic design",
    category: "Artistic"
  },
  {
    name: "Art Nouveau Design",
    prompt: "Elegant Art Nouveau illustration, flowing organic lines, floral motifs, decorative elegance",
    category: "Artistic"
  },
  {
    name: "Street Art Mural",
    prompt: "Large-scale street art mural, vibrant graffiti, urban expression, colorful wall art",
    category: "Artistic"
  },
  // Nature & Environment
  {
    name: "Underwater World",
    prompt: "Vibrant coral reef underwater, tropical fish, sunbeams through water, marine biodiversity",
    category: "Nature"
  },
  {
    name: "Mountain Peak",
    prompt: "Snow-capped mountain summit, dramatic clouds, alpine landscape, majestic wilderness",
    category: "Nature"
  },
  {
    name: "Desert Oasis",
    prompt: "Hidden desert oasis, palm trees, clear water, sand dunes, peaceful refuge in wasteland",
    category: "Nature"
  },
  {
    name: "Aurora Borealis",
    prompt: "Northern lights dancing across starry sky, arctic landscape, natural light phenomenon",
    category: "Nature"
  },
  // Vintage & Retro
  {
    name: "1920s Glamour",
    prompt: "Art deco 1920s party scene, flapper fashion, jazz age elegance, vintage glamour",
    category: "Vintage"
  },
  {
    name: "Victorian Elegance",
    prompt: "Ornate Victorian interior, rich fabrics, elegant furniture, period architecture, refined luxury",
    category: "Vintage"
  },
  {
    name: "80s Neon",
    prompt: "Retro 1980s aesthetic, neon colors, synthwave vibes, geometric patterns, nostalgic atmosphere",
    category: "Vintage"
  },
  {
    name: "Wild West Scene",
    prompt: "Classic western frontier town, saloon doors, dusty streets, cowboy atmosphere, desert sunset",
    category: "Vintage"
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
  const { credits, hasCredits, deductCredits, canGenerateImages, getCreditStatusMessage, loading: creditsLoading } = useCredits();
  const { extendImage, extending, canExtend, getExtensionButtonText } = useImageExtension();
  const { lightTap, mediumTap, success, error, doubleTap } = useHaptic();

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
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMode, setGenerationMode] = useState<'image' | 'video'>('image');
  const [videoDuration, setVideoDuration] = useState(5); // Default 5 seconds
  const [videoFps, setVideoFps] = useState(24); // Default 24 FPS
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
      openAuthModal();
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
      setReferenceImageFile(file); // Store the file for webhook binary upload
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleRemoveImage = () => {
    setReferenceImageUrl(null);
    setReferenceImageFile(null); // Also clear the file
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
    lightTap(); // Light haptic feedback for template selection
    setPositivePrompt(template.prompt);
    setSelectedTemplate(template.name);
    toast.success(`Applied template: ${template.name}`);
  };

  const handleStyleChange = (style: string) => {
    lightTap(); // Light haptic feedback for style selection
    setSelectedStyle(style);
  };

  const handleTabChange = (value: string) => {
    lightTap(); // Light haptic feedback for tab navigation
    // Tab state is handled by the Tabs component itself
  };

  const handleModeChange = (mode: 'image' | 'video') => {
    lightTap(); // Light haptic feedback for mode switch
    setGenerationMode(mode);
    toast.success(`Switched to ${mode} generation mode`);
  };

  const openAuthModal = () => {
    lightTap(); // Light haptic feedback for opening auth modal
    setAuthModalOpen(true);
  };

  const handleStepsChange = (value: number[]) => {
    lightTap(); // Light haptic feedback for slider adjustment
    setSteps(value);
  };

  const handleCfgScaleChange = (value: number[]) => {
    lightTap(); // Light haptic feedback for slider adjustment
    setCfgScale(value);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/[type];base64, prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const saveCurrentPreset = async () => {
    if (!user) {
      toast.error("Please sign in to save presets");
      openAuthModal();
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
      lightTap(); // Haptic feedback for successful download
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
      lightTap(); // Haptic feedback for clipboard copy
      toast.success("Image URL copied to clipboard!");
    }
  };

  const toggleLike = async (imageId: string) => {
    if (!user) return;
    
    lightTap(); // Haptic feedback for like toggle
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
    
    doubleTap(); // Double tap haptic for delete action (confirmation-like)
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
    // Haptic feedback for generate button press
    mediumTap();
    
    if (!positivePrompt.trim()) {
      error(); // Error haptic pattern
      toast.error("Please enter a positive prompt");
      return;
    }

    if (!user) {
      error(); // Error haptic pattern
      toast.error("Please sign in to generate images");
      openAuthModal();
      return;
    }

    // Check if user has sufficient credits
    if (!canGenerateImages()) {
      error(); // Error haptic pattern
      toast.error("No credits available! Contact administrator to get credits for image generation.");
      return;
    }

    const requiredCredits = generationMode === 'video' ? 10 : 1;
    if (!hasCredits(requiredCredits)) {
      error(); // Error haptic pattern
      toast.error(`Insufficient credits! You need ${requiredCredits} credit${requiredCredits > 1 ? 's' : ''} but only have ${credits}.`);
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
      // Generate single image
      // Prepare comprehensive payload for the webhook
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      const currentDimensions = getCurrentDimensions();
      
      // Convert reference image to base64 if present
      const referenceImageBase64 = referenceImageFile ? await convertFileToBase64(referenceImageFile) : null;
      
      const payload = {
          // Generation settings - primary parameters
          generation_settings: {
            generation_type: generationMode, // 'image' or 'video'
            prompt: positivePrompt.trim(),
            negative_prompt: negativePrompt.trim() || undefined,
            style: selectedStyle || undefined,
            style_description: selectedStyle 
              ? (styleDescriptions[selectedStyle as keyof typeof styleDescriptions] 
                 || `${selectedStyle} artistic style with characteristic visual elements and techniques.`)
              : undefined,
            aspect_ratio: currentDimensions.aspect_ratio,
            aspect_ratio_label: currentDimensions.aspect_ratio_label,
            aspect_ratio_category: aspectRatio.category || "standard",
            steps: steps[0],
            cfg_scale: cfgScale[0],
            batch_count: 1,
            template_used: selectedTemplate || null,
            reference_image: referenceImageBase64,
            reference_image_metadata: referenceImageFile ? {
              name: referenceImageFile.name,
              size: referenceImageFile.size,
              type: referenceImageFile.type,
              lastModified: referenceImageFile.lastModified
            } : null,
            // Video-specific settings (only included if generating video)
            ...(generationMode === 'video' && {
              video_duration: videoDuration,
              video_fps: videoFps,
              video_format: "mp4"
            }),
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
            app_version: "1.8.0", // Added Video Generation Support
            generation_mode: referenceImageUrl ? "img2img" : "text2img",
            batch_info: {
              total_batch_count: 1,
              batch_index: 1,
              is_batch: false
            }
          },
          
          // UI state - complete interface context
          ui_state: {
            selected_template: selectedTemplate || null,
            custom_dimensions_enabled: useCustomDimensions || aspectRatio.value === "custom",
            selected_style_index: artStyles.indexOf(selectedStyle),
            selected_aspect_ratio: currentDimensions.aspect_ratio_label,
            parameter_ranges: {
              steps_range: [1, 50],
              cfg_scale_range: [1, 20],
              custom_width_range: [256, 2000],
              custom_height_range: [256, 2000]
            },
            quality_preset: "standard"
          },
          
          // Legacy compatibility - maintain backward compatibility
          width: currentDimensions.width,
          height: currentDimensions.height,
          prompt: positivePrompt.trim(),
          negative_prompt: negativePrompt.trim() || undefined,
          style: selectedStyle || undefined,
          style_description: selectedStyle 
            ? (styleDescriptions[selectedStyle as keyof typeof styleDescriptions] 
               || `${selectedStyle} artistic style with characteristic visual elements and techniques.`)
            : undefined,
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
          toast.success(`🎨 ${generationMode === 'video' ? 'Video successfully generated!' : 'Image'} ${generationMode === 'video' ? 'Thank you for your patience.' : 'generated! Uploading to storage...'}`);
          
          try {
            // Upload binary image to Firebase Storage in background
            const firebaseImageUrl = await uploadImageToStorage(result.blob, imageId);
            console.log("Upload successful, replacing temp URL with Firebase URL");
            
            // Replace temporary URL with Firebase URL
            setGeneratedImages(prev => 
              prev.map(url => url === tempImageUrl ? firebaseImageUrl : url)
            );
            
            // Create image data with Firebase Storage URL
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 14); // Expires in 14 days
            
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
              },
              // Auto-deletion fields
              expiresAt: expirationDate,
              extensionCount: 0,
              isExpired: false
            };
            
            // Save to history with Firebase URL
            await addImageToHistory(newImageData);
            
            // Deduct credits for successful generation
            try {
              await deductCredits(requiredCredits);
              console.log(`${requiredCredits} credit${requiredCredits > 1 ? 's' : ''} deducted for successful ${generationMode} generation`);
            } catch (creditError) {
              console.error("Failed to deduct credits:", creditError);
              // Note: We don't show error to user as image was already generated
            }
            
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
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + 14);
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
            },
            expiresAt: expirationDate,
            extensionCount: 0,
            isExpired: false
          };
          
          setGeneratedImages(prev => [...prev, imageUrl]);
          await addImageToHistory(newImageData);
          
          // Deduct credits for successful generation
          try {
            await deductCredits(requiredCredits);
            console.log(`${requiredCredits} credit${requiredCredits > 1 ? 's' : ''} deducted for successful ${generationMode} generation`);
          } catch (creditError) {
            console.error("Failed to deduct credits:", creditError);
          }
          
          success(); // Success haptic pattern
          toast.success(`🎨 ${generationMode === 'video' ? 'Video ready! Thank you for waiting.' : 'Image generated successfully!'}`);
        } else if (result.images && Array.isArray(result.images)) {
          const currentDims = getCurrentDimensions();
          for (const imageUrl of result.images) {
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 14);
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
              },
              expiresAt: expirationDate,
              extensionCount: 0,
              isExpired: false
            };
            await addImageToHistory(newImageData);
            
            // Deduct credits for each successful generation
            try {
              await deductCredits(requiredCredits);
              console.log(`${requiredCredits} credit${requiredCredits > 1 ? 's' : ''} deducted for successful ${generationMode} generation`);
            } catch (creditError) {
              console.error("Failed to deduct credits:", creditError);
            }
          }
          
          setGeneratedImages(result.images);
          success(); // Success haptic pattern
          toast.success(`🎨 ${result.images.length} ${generationMode === 'video' ? 'video' : 'image'}${result.images.length > 1 ? 's' : ''} generated successfully!`);
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
              
              const expirationDate = new Date();
              expirationDate.setDate(expirationDate.getDate() + 14);
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
                },
                expiresAt: expirationDate,
                extensionCount: 0,
                isExpired: false
              };
              
              await addImageToHistory(newImageData);
              
              // Deduct credits for successful generation
              try {
                await deductCredits(1);
                console.log("Credit deducted for successful image generation");
              } catch (creditError) {
                console.error("Failed to deduct credits:", creditError);
              }
              
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
            AI {generationMode === 'video' ? 'Video' : 'Image'} Generator
          </h1>
          <p className="text-muted-foreground text-xl animate-fade-in" style={{animationDelay: '0.2s'}}>
            Create stunning {generationMode === 'image' ? 'images' : 'videos'} with professional AI technology
          </p>
          
          {/* Generation Mode Toggle */}
          <div className="flex justify-center mb-8 animate-slide-up" style={{animationDelay: '0.3s'}}>
            <div className="glass p-1 rounded-lg border border-accent/20">
              <div className="flex">
                <Button
                  variant={generationMode === 'image' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleModeChange('image')}
                  className={`flex items-center gap-2 ${generationMode === 'image' ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''}`}
                >
                  <Camera className="h-4 w-4" />
                  Images
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={generationMode === 'video' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleModeChange('video')}
                        className={`flex items-center gap-2 ${generationMode === 'video' ? 'bg-gradient-to-r from-purple-600 to-blue-600' : ''}`}
                      >
                        <Video className="h-4 w-4" />
                        Videos
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm">
                        Video generation is more complex and requires 2-5 minutes of processing time
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

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
                  onClick={openAuthModal}
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

            {/* Reference Image Upload - Only show for image mode */}
            {generationMode === 'image' && (
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
                    onClick={() => user ? (lightTap(), document.getElementById('image-upload')?.click()) : openAuthModal()}
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
            )}

            {/* Prompt Templates */}
            <div className="space-y-3 animate-slide-up" style={{animationDelay: '0.3s'}}>
              <Label className="flex items-center gap-3 text-lg font-medium">
                <div className="p-1 rounded bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
                  <Star className="h-5 w-5 text-accent animate-pulse" />
                </div>
                Prompt Templates
              </Label>
              <div className="max-h-60 overflow-y-auto scroll-smooth space-y-2">
                {promptTemplates.map((template) => (
                  <Button
                    key={template.name}
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                    className="w-full text-left justify-start h-auto p-3 glass hover:bg-accent/10 transition-colors"
                  >
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-sm">{template.name}</div>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          {template.category}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{template.prompt}</div>
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
                <Badge variant="secondary" className="text-xs animate-bounce">Required</Badge>
              </Label>
              <Select value={selectedStyle} onValueChange={handleStyleChange}>
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
                  onValueChange={handleStepsChange}
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
                  onValueChange={handleCfgScaleChange}
                  max={20}
                  min={1}
                  step={0.5}
                  className="w-full"
                />
              </div>
              
              {/* Video Generation Warning */}
              {generationMode === 'video' && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 animate-slide-up">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        ⏱️ Video generation takes time
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        Video processing typically takes 2-5 minutes. Please be patient while we create your video.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Video-specific controls */}
              {generationMode === 'video' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Duration: {videoDuration}s
                    </Label>
                    <Slider
                      value={[videoDuration]}
                      onValueChange={(value) => {
                        lightTap(); // Haptic feedback
                        setVideoDuration(value[0]);
                      }}
                      max={30}
                      min={3}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>3s</span>
                      <span>15s</span>
                      <span>30s</span>
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Estimated generation time: {videoDuration <= 10 ? '2-4' : videoDuration <= 20 ? '3-5' : '4-7'} minutes
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Frame Rate: {videoFps} FPS</Label>
                    <Select 
                      value={videoFps.toString()} 
                      onValueChange={(value) => {
                        lightTap(); // Haptic feedback
                        setVideoFps(parseInt(value));
                      }}
                    >
                      <SelectTrigger className="glass border-accent/20">
                        <SelectValue placeholder="Select frame rate..." />
                      </SelectTrigger>
                      <SelectContent className="glass border-accent/20">
                        <SelectItem value="12">12 FPS</SelectItem>
                        <SelectItem value="24">24 FPS (Cinema)</SelectItem>
                        <SelectItem value="30">30 FPS (Standard)</SelectItem>
                        <SelectItem value="60">60 FPS (Smooth)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

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

            {/* Credit Display */}
            {user && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium">Credits Available:</Label>
                    </div>
                    <CreditDisplay variant="inline" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Image generation cost:</span>
                    <span className="font-medium">1 credit</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Video generation cost:</span>
                    <span className="font-medium">10 credits</span>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !positivePrompt.trim() || !selectedStyle}
              className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all duration-500 transform hover:scale-[1.02] animate-pulse-glow text-white"
            >
              {isGenerating ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {generationMode === 'video' 
                    ? 'Generating Video... This may take several minutes' 
                    : 'Generating Magic...'}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Zap className="h-6 w-6" />
                  Generate {generationMode === 'video' ? 'Video (2-5 min)' : 'Images'}
                  <Star className="h-5 w-5 animate-pulse" />
                </div>
              )}
            </Button>
          </Card>

          {/* Enhanced Results with Tabs */}
          <Card className="glass p-8 glow animate-scale-in" style={{animationDelay: '0.2s'}}>
            <Tabs defaultValue="current" className="w-full" onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="current" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Current {generationMode === 'video' ? 'Videos' : 'Images'}
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
                  <h2 className="text-2xl font-bold text-gradient">Generated {generationMode === 'video' ? 'Videos' : 'Images'}</h2>
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

                {/* Auto-deletion Warning Banner */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div className="space-y-1">
                      <h3 className="font-medium text-amber-500">Automatic Image Deletion</h3>
                      <p className="text-sm text-muted-foreground">
                        Images are automatically deleted after 14 days to manage storage. Download images you want to keep permanently.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        • Regular users can extend storage up to 3 times (7 days each)
                      </p>
                    </div>
                  </div>
                </div>

                {imageHistory.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {imageHistory.map((image) => {
                      const expirationStatus = getExpirationStatus(image.expiresAt);
                      return (
                        <Dialog key={image.id}>
                          <DialogTrigger asChild>
                            <div className="relative group cursor-pointer">
                              <div className="relative rounded-lg overflow-hidden bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-1">
                                <img
                                  src={image.url}
                                  alt={image.prompt}
                                  className={`w-full aspect-square object-cover rounded-lg shadow-lg transform group-hover:scale-105 transition-all duration-300 ${
                                    image.isExpired ? 'opacity-50' : ''
                                  }`}
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-center justify-center">
                                  <Button size="sm" variant="ghost" className="text-white">
                                    View Details
                                  </Button>
                                </div>
                                
                                {/* Expiration Warning Badge */}
                                {(expirationStatus.status === 'critical' || expirationStatus.status === 'warning' || expirationStatus.status === 'expired') && (
                                  <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                                    expirationStatus.status === 'expired' ? 'bg-red-500/90 text-white' :
                                    expirationStatus.status === 'critical' ? 'bg-red-500/80 text-white' :
                                    'bg-amber-500/80 text-white'
                                  }`}>
                                    <Clock className="h-3 w-3" />
                                    {expirationStatus.daysRemaining > 0 ? `${expirationStatus.daysRemaining}d` : 'Expired'}
                                  </div>
                                )}
                                
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
                              
                              {/* Expiration Information */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Storage Expiration</Label>
                                <div className="space-y-1">
                                  <p className={`text-sm ${expirationStatus.color}`}>
                                    {expirationStatus.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Expires on: {formatExpirationDate(image.expiresAt)}
                                  </p>
                                  {image.extensionCount > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      Extensions used: {image.extensionCount}/3
                                    </p>
                                  )}
                                </div>
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
                              
                              {/* Extension Button */}
                              {canExtend(image.extensionCount) && !image.isExpired && (
                                <div className="pt-2">
                                  <Button
                                    variant="outline"
                                    onClick={async () => {
                                      const result = await extendImage(image.id);
                                      if (result) {
                                        // Refresh the image data
                                        window.location.reload();
                                      }
                                    }}
                                    disabled={extending === image.id}
                                    className="w-full"
                                  >
                                    {extending === image.id ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                        Extending...
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="h-4 w-4 mr-2" />
                                        {getExtensionButtonText(image.extensionCount)}
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                        </Dialog>
                      );
                    })}
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
        <PWAInstallPrompt />
      </div>
    </div>
  );
}