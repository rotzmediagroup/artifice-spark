import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useStorage = () => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadReferenceImage = async (file: File): Promise<string> => {
    if (!user) {
      throw new Error('User must be authenticated to upload images');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('Image size must be less than 10MB');
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}_${file.name}`;
      const imageRef = ref(storage, `users/${user.uid}/reference-images/${filename}`);

      // Upload file
      const snapshot = await uploadBytes(imageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setUploadProgress(100);
      toast.success('Reference image uploaded successfully!');
      
      return downloadURL;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      throw error;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const deleteReferenceImage = async (imageUrl: string): Promise<void> => {
    if (!user) {
      throw new Error('User must be authenticated to delete images');
    }

    try {
      // Extract the path from the download URL
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
      toast.success('Reference image deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete image');
      throw error;
    }
  };

  return {
    uploadReferenceImage,
    deleteReferenceImage,
    uploading,
    uploadProgress
  };
};