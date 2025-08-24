import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface GeneratedImageData {
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
    // Enhanced dimension data
    width?: number;
    height?: number;
    isCustomDimensions?: boolean;
    totalPixels?: number;
    megapixels?: number;
  };
}

export interface PresetData {
  id: string;
  name: string;
  positivePrompt: string;
  negativePrompt: string;
  selectedStyle: string;
  aspectRatio: any;
  steps: number;
  cfgScale: number;
  timestamp: Date;
  // Enhanced dimension data
  customWidth?: number;
  customHeight?: number;
  useCustomDimensions?: boolean;
}

export const useFirestore = () => {
  const { user } = useAuth();
  const [imageHistory, setImageHistory] = useState<GeneratedImageData[]>([]);
  const [presets, setPresets] = useState<PresetData[]>([]);
  const [loading, setLoading] = useState(true);

  // Convert Firestore data to our format
  const convertImageData = (doc: { id: string; data: () => any }): GeneratedImageData => ({
    id: doc.id,
    url: doc.data().url,
    prompt: doc.data().prompt,
    style: doc.data().style,
    timestamp: doc.data().timestamp?.toDate() || new Date(),
    liked: doc.data().liked || false,
    settings: doc.data().settings || {
      steps: 30,
      cfgScale: 7,
      aspectRatio: 'Square (1:1)', // Use the label format consistently
      negativePrompt: '',
      width: 1024,
      height: 1024,
      isCustomDimensions: false,
      totalPixels: 1048576,
      megapixels: 1.05
    }
  });

  const convertPresetData = (doc: { id: string; data: () => any }): PresetData => ({
    id: doc.id,
    name: doc.data().name,
    positivePrompt: doc.data().positivePrompt,
    negativePrompt: doc.data().negativePrompt,
    selectedStyle: doc.data().selectedStyle,
    aspectRatio: doc.data().aspectRatio,
    steps: doc.data().steps,
    cfgScale: doc.data().cfgScale,
    timestamp: doc.data().timestamp?.toDate() || new Date(),
    // Enhanced dimension data with defaults
    customWidth: doc.data().customWidth || 1024,
    customHeight: doc.data().customHeight || 1024,
    useCustomDimensions: doc.data().useCustomDimensions || false,
  });

  // Load data when user changes
  useEffect(() => {
    if (!user) {
      setImageHistory([]);
      setPresets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let imagesLoaded = false;
    let presetsLoaded = false;

    const checkAllLoaded = () => {
      if (imagesLoaded && presetsLoaded) {
        setLoading(false);
      }
    };

    // Subscribe to image history with error handling
    const imageHistoryRef = collection(db, `users/${user.uid}/imageHistory`);
    const imageHistoryQuery = query(imageHistoryRef, orderBy('timestamp', 'desc'));
    
    const unsubscribeImages = onSnapshot(
      imageHistoryQuery, 
      (snapshot) => {
        const images = snapshot.docs.map(convertImageData);
        setImageHistory(images);
        imagesLoaded = true;
        checkAllLoaded();
      },
      (error) => {
        console.error('Error loading image history:', error);
        setImageHistory([]);
        imagesLoaded = true;
        checkAllLoaded();
      }
    );

    // Subscribe to presets with error handling
    const presetsRef = collection(db, `users/${user.uid}/presets`);
    const presetsQuery = query(presetsRef, orderBy('timestamp', 'desc'));
    
    const unsubscribePresets = onSnapshot(
      presetsQuery, 
      (snapshot) => {
        const presetsData = snapshot.docs.map(convertPresetData);
        setPresets(presetsData);
        presetsLoaded = true;
        checkAllLoaded();
      },
      (error) => {
        console.error('Error loading presets:', error);
        setPresets([]);
        presetsLoaded = true;
        checkAllLoaded();
      }
    );

    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout reached, forcing completion');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => {
      unsubscribeImages();
      unsubscribePresets();
      clearTimeout(loadingTimeout);
    };
  }, [user]);

  // Image history operations
  const addImageToHistory = async (imageData: Omit<GeneratedImageData, 'id'>) => {
    if (!user) return;
    
    try {
      const imageHistoryRef = collection(db, `users/${user.uid}/imageHistory`);
      await addDoc(imageHistoryRef, {
        ...imageData,
        timestamp: Timestamp.fromDate(imageData.timestamp),
        userId: user.uid
      });
    } catch (error) {
      console.error('Error adding image to history:', error);
      throw error;
    }
  };

  const updateImageInHistory = async (imageId: string, updates: Partial<GeneratedImageData>) => {
    if (!user) return;
    
    try {
      const imageRef = doc(db, `users/${user.uid}/imageHistory`, imageId);
      const updateData: any = { ...updates };
      if (updates.timestamp) {
        updateData.timestamp = Timestamp.fromDate(updates.timestamp);
      }
      await updateDoc(imageRef, updateData);
    } catch (error) {
      console.error('Error updating image in history:', error);
      throw error;
    }
  };

  const deleteImageFromHistory = async (imageId: string) => {
    if (!user) return;
    
    try {
      const imageRef = doc(db, `users/${user.uid}/imageHistory`, imageId);
      await deleteDoc(imageRef);
    } catch (error) {
      console.error('Error deleting image from history:', error);
      throw error;
    }
  };

  // Preset operations
  const addPreset = async (presetData: Omit<PresetData, 'id'>) => {
    if (!user) return;
    
    try {
      const presetsRef = collection(db, `users/${user.uid}/presets`);
      await addDoc(presetsRef, {
        ...presetData,
        timestamp: Timestamp.fromDate(presetData.timestamp),
        userId: user.uid
      });
    } catch (error) {
      console.error('Error adding preset:', error);
      throw error;
    }
  };

  const updatePreset = async (presetId: string, updates: Partial<PresetData>) => {
    if (!user) return;
    
    try {
      const presetRef = doc(db, `users/${user.uid}/presets`, presetId);
      const updateData: any = { ...updates };
      if (updates.timestamp) {
        updateData.timestamp = Timestamp.fromDate(updates.timestamp);
      }
      await updateDoc(presetRef, updateData);
    } catch (error) {
      console.error('Error updating preset:', error);
      throw error;
    }
  };

  const deletePreset = async (presetId: string) => {
    if (!user) return;
    
    try {
      const presetRef = doc(db, `users/${user.uid}/presets`, presetId);
      await deleteDoc(presetRef);
    } catch (error) {
      console.error('Error deleting preset:', error);
      throw error;
    }
  };

  // Migration function from localStorage
  const migrateFromLocalStorage = async () => {
    if (!user) return;
    
    try {
      const batch = writeBatch(db);
      
      // Migrate image history
      const savedHistory = localStorage.getItem('imageHistory');
      if (savedHistory) {
        const historyData = JSON.parse(savedHistory);
        const imageHistoryRef = collection(db, `users/${user.uid}/imageHistory`);
        
        historyData.forEach((item: GeneratedImageData) => {
          const docRef = doc(imageHistoryRef);
          batch.set(docRef, {
            ...item,
            timestamp: Timestamp.fromDate(new Date(item.timestamp)),
            userId: user.uid
          });
        });
      }
      
      // Migrate presets
      const savedPresets = localStorage.getItem('savedPresets');
      if (savedPresets) {
        const presetsData = JSON.parse(savedPresets);
        const presetsRef = collection(db, `users/${user.uid}/presets`);
        
        presetsData.forEach((item: PresetData) => {
          const docRef = doc(presetsRef);
          batch.set(docRef, {
            ...item,
            timestamp: Timestamp.fromDate(new Date(item.timestamp)),
            userId: user.uid
          });
        });
      }
      
      await batch.commit();
      
      // Clear localStorage after successful migration
      localStorage.removeItem('imageHistory');
      localStorage.removeItem('savedPresets');
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
  };

  return {
    imageHistory,
    presets,
    loading,
    addImageToHistory,
    updateImageInHistory,
    deleteImageFromHistory,
    addPreset,
    updatePreset,
    deletePreset,
    migrateFromLocalStorage
  };
};