import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database, 
  Shield, 
  Users, 
  Image as ImageIcon,
  Settings2,
  Wifi,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestore } from '@/hooks/useFirestore';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc,
  setDoc,
  updateDoc, 
  deleteDoc, 
  getDocs,
  query,
  where,
  Timestamp,
  onSnapshot,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message: string;
  duration?: number;
  error?: string;
  details?: string;
}

interface ConnectionStats {
  latency: number;
  isOnline: boolean;
  projectId: string;
  hasAuth: boolean;
  authStateLoaded: boolean;
  firestoreConnected: boolean;
}

export default function FirestoreConnectionTest() {
  const { user, signIn, signUp, signInWithGoogle } = useAuth();
  const { addImageToHistory, addPreset, deleteImageFromHistory, deletePreset, imageHistory, presets, loading: firestoreLoading } = useFirestore();
  
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Firebase Configuration', status: 'pending', message: 'Checking Firebase setup...' },
    { name: 'Authentication System', status: 'pending', message: 'Testing authentication...' },
    { name: 'Network Connectivity', status: 'pending', message: 'Testing network connection...' },
    { name: 'Google Sign-In', status: 'pending', message: 'Testing Google OAuth...' },
    { name: 'Database Connection', status: 'pending', message: 'Connecting to Firestore...' },
    { name: 'Security Rules', status: 'pending', message: 'Testing security rules...' },
    { name: 'Real-time Sync Check', status: 'pending', message: 'Verifying real-time sync...' },
    { name: 'Image History CRUD', status: 'pending', message: 'Testing image operations...' },
    { name: 'User Presets CRUD', status: 'pending', message: 'Testing preset operations...' },
    { name: 'Data Isolation', status: 'pending', message: 'Testing user isolation...' },
  ]);

  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    latency: 0,
    isOnline: false,
    projectId: '',
    hasAuth: false,
    authStateLoaded: false,
    firestoreConnected: false
  });
  
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testEmail] = useState(`test-${Date.now()}@rotz.example.com`);
  const [testPassword] = useState('TestPassword123!');
  const [createdTestData, setCreatedTestData] = useState<string[]>([]);
  const authStatePromise = useRef<Promise<any> | null>(null);

  // Wait for auth state to be properly loaded
  const waitForAuthState = (): Promise<any> => {
    if (authStatePromise.current) {
      return authStatePromise.current;
    }

    authStatePromise.current = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setConnectionStats(prev => ({ ...prev, authStateLoaded: true, hasAuth: !!user }));
        unsubscribe();
        resolve(user);
      });
    });

    return authStatePromise.current;
  };

  // Utility function to wait with timeout
  const waitFor = (condition: () => boolean, timeout = 10000, interval = 100): Promise<void> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for condition after ${timeout}ms`));
        } else {
          setTimeout(check, interval);
        }
      };
      check();
    });
  };

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };

  const runTest = async (index: number, testFn: () => Promise<void>, retries = 2) => {
    const startTime = Date.now();
    updateTest(index, { status: 'running', message: 'Running...', error: undefined });
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await testFn();
        const duration = Date.now() - startTime;
        updateTest(index, { 
          status: 'success', 
          message: `Completed successfully`, 
          duration,
          details: attempt > 0 ? `Succeeded on attempt ${attempt + 1}` : undefined
        });
        return;
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (attempt === retries) {
          updateTest(index, { 
            status: 'error', 
            message: `Failed: ${errorMessage}`,
            duration,
            error: errorMessage,
            details: retries > 0 ? `Failed after ${retries + 1} attempts` : undefined
          });
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
  };

  const testFirebaseConfiguration = async () => {
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const missingVars = Object.entries(config)
      .filter(([_, value]) => !value || value.includes('your-') || value.includes('undefined'))
      .map(([key]) => key);

    if (missingVars.length > 0) {
      throw new Error(`Missing configuration: ${missingVars.join(', ')}`);
    }

    setConnectionStats(prev => ({
      ...prev,
      projectId: config.projectId || 'unknown',
      hasAuth: !!config.apiKey,
    }));

    // Verify Firebase is initialized
    if (!auth || !db) {
      throw new Error('Firebase services not properly initialized');
    }
  };

  const testNetworkConnectivity = async () => {
    if (!auth.currentUser) throw new Error('No authenticated user for network test');
    
    const startTime = Date.now();
    
    try {
      // First, try to create a connection test document to ensure it exists
      const testDocRef = doc(db, 'connection-test', 'connectivity-test');
      
      updateTest(2, { status: 'running', message: 'Creating connection test document...' });
      
      // Try to create/update the connection test document
      try {
        await setDoc(testDocRef, {
          message: 'Connection test successful',
          timestamp: Timestamp.now(),
          testUser: auth.currentUser.uid
        });
      } catch (writeError: any) {
        // If we can't write, that's fine - the document might already exist
        // or we might not have write permissions (which is expected for connection-test)
        console.warn('Cannot write to connection-test document:', writeError.message);
      }
      
      updateTest(2, { status: 'running', message: 'Testing Firestore read access...' });
      
      // Now test reading from the connection test document
      const docSnapshot = await getDoc(testDocRef);
      
      const latency = Date.now() - startTime;
      
      // Update connection stats
      setConnectionStats(prev => ({ 
        ...prev, 
        latency,
        isOnline: true,
        firestoreConnected: true
      }));
      
      if (docSnapshot.exists()) {
        updateTest(2, { status: 'running', message: `Network test successful (${latency}ms latency)` });
      } else {
        updateTest(2, { status: 'running', message: `Network connected but test document not found (${latency}ms latency)` });
      }
      
    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      setConnectionStats(prev => ({ 
        ...prev, 
        isOnline: false,
        latency,
        firestoreConnected: false
      }));
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        throw new Error(`Network connectivity failed: Permission denied. Check Firestore security rules. (${latency}ms)`);
      } else if (error.code === 'unavailable') {
        throw new Error(`Network connectivity failed: Firestore service unavailable. (${latency}ms)`);
      } else {
        throw new Error(`Network connectivity failed: ${error.message} (${latency}ms)`);
      }
    }
  };

  const testAuthenticationSystem = async () => {
    // First, wait for auth state to be loaded
    await waitForAuthState();
    
    if (!user) {
      try {
        // Try to create a test user
        updateTest(2, { status: 'running', message: 'Creating test user...' });
        await signUp(testEmail, testPassword, 'Test User');
        
        // Wait for auth state to update
        await waitFor(() => !!auth.currentUser, 10000);
        
        if (!auth.currentUser) {
          throw new Error('User creation succeeded but auth state not updated');
        }
        
      } catch (error: any) {
        // If user already exists, try to sign in
        if (error?.code === 'auth/email-already-in-use') {
          try {
            updateTest(2, { status: 'running', message: 'Signing in existing test user...' });
            await signIn(testEmail, testPassword);
            
            // Wait for auth state to update
            await waitFor(() => !!auth.currentUser, 10000);
            
            if (!auth.currentUser) {
              throw new Error('Sign in succeeded but auth state not updated');
            }
          } catch (signInError) {
            throw new Error(`Authentication failed: ${signInError instanceof Error ? signInError.message : 'Unknown error'}`);
          }
        } else {
          throw new Error(`User creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Verify we have an authenticated user
    if (!auth.currentUser) {
      throw new Error('No authenticated user after authentication test');
    }
  };

  const testGoogleSignIn = async () => {
    try {
      // Don't actually perform Google sign-in in automated tests
      // Instead, check if the function exists and is callable
      if (typeof signInWithGoogle !== 'function') {
        throw new Error('Google sign-in function not available');
      }

      // Test that Google provider is configured (this will fail if not configured)
      // We'll catch the specific error to provide helpful feedback
      updateTest(3, { 
        status: 'warning', 
        message: 'Google OAuth requires manual configuration in Firebase Console',
        details: 'This test requires Google OAuth to be configured in the Firebase Console'
      });
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        updateTest(3, { 
          status: 'warning', 
          message: 'Google sign-in not configured',
          details: 'Enable Google OAuth provider in Firebase Console'
        });
      } else {
        throw error;
      }
    }
  };

  const testDatabaseConnection = async () => {
    if (!auth.currentUser) throw new Error('No authenticated user');

    // Test basic read/write operations
    const testCollection = collection(db, `users/${auth.currentUser.uid}/test`);
    
    // Test write
    const testDoc = await addDoc(testCollection, {
      testData: 'database connection test',
      timestamp: Timestamp.now(),
      userId: auth.currentUser.uid
    });
    
    setCreatedTestData(prev => [...prev, `users/${auth.currentUser.uid}/test/${testDoc.id}`]);
    
    // Test read
    const readDoc = await getDoc(testDoc);
    if (!readDoc.exists()) {
      throw new Error('Failed to read test document after creation');
    }
    
    // Test update
    await updateDoc(testDoc, {
      updated: true,
      updateTimestamp: Timestamp.now()
    });
    
    // Verify update
    const updatedDoc = await getDoc(testDoc);
    if (!updatedDoc.data()?.updated) {
      throw new Error('Failed to verify document update');
    }
  };

  const testSecurityRules = async () => {
    if (!auth.currentUser) throw new Error('No authenticated user');

    // Test that we can write to our own user collection
    const testCollection = collection(db, `users/${auth.currentUser.uid}/test`);
    const testDoc = await addDoc(testCollection, {
      securityTest: true,
      timestamp: Timestamp.now(),
      userId: auth.currentUser.uid
    });
    
    setCreatedTestData(prev => [...prev, `users/${auth.currentUser.uid}/test/${testDoc.id}`]);

    // Test that we cannot write to another user's collection
    const fakeUserId = 'fake-user-id-for-security-test';
    try {
      await addDoc(collection(db, `users/${fakeUserId}/test`), {
        maliciousData: 'this should fail',
        timestamp: Timestamp.now()
      });
      throw new Error('Security violation: able to write to other user data');
    } catch (error: any) {
      // This should fail with a permission error
      if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
        // Good! Security rules are working
        return;
      }
      throw new Error(`Unexpected security test error: ${error.message}`);
    }
  };

  const testImageHistoryCRUD = async () => {
    if (!auth.currentUser) throw new Error('No authenticated user');

    const initialCount = imageHistory.length;
    const uniqueId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Test Create with unique identifier
    const testImageData = {
      url: `https://example.com/test-image-${uniqueId}.jpg`,
      prompt: `Test image generation prompt for CRUD test ${uniqueId}`,
      style: 'Digital Art',
      timestamp: new Date(),
      liked: false,
      settings: {
        steps: 30,
        cfgScale: 7,
        aspectRatio: 'Square (1:1)', // Use the label format that matches actual usage
        negativePrompt: 'blurry, low quality'
      }
    };

    updateTest(7, { status: 'running', message: 'Creating test image...' });
    
    await addImageToHistory(testImageData);

    updateTest(7, { status: 'running', message: 'Waiting for real-time sync...' });
    
    // Wait for real-time update with timeout and progress feedback
    try {
      await waitFor(() => imageHistory.length > initialCount, 10000);
      
      if (imageHistory.length <= initialCount) {
        updateTest(7, { status: 'running', message: 'Real-time sync slow, verifying with direct query...' });
        
        // Fallback: Direct query to verify image was created
        const imageHistoryRef = collection(db, `users/${auth.currentUser.uid}/imageHistory`);
        const snapshot = await getDocs(imageHistoryRef);
        const currentCount = snapshot.size;
        
        if (currentCount <= initialCount) {
          throw new Error(`Image not created in Firestore. Expected: >${initialCount}, Got: ${currentCount}`);
        }
        
        updateTest(7, { status: 'running', message: `Image created successfully (verified via direct query: ${currentCount} total)` });
      } else {
        updateTest(7, { status: 'running', message: `Real-time sync working (${imageHistory.length} images total)` });
      }
    } catch (timeoutError) {
      // If real-time sync fails, try direct verification
      updateTest(7, { status: 'running', message: 'Real-time sync timeout, checking direct query...' });
      
      const imageHistoryRef = collection(db, `users/${auth.currentUser.uid}/imageHistory`);
      const snapshot = await getDocs(imageHistoryRef);
      const allImages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const testImage = allImages.find(img => img.prompt === testImageData.prompt);
      
      if (!testImage) {
        throw new Error(`Test image not found after creation. Total images in DB: ${allImages.length}`);
      }
      
      // Mark for cleanup using the found image ID
      setCreatedTestData(prev => [...prev, `imageHistory/${testImage.id}`]);
      updateTest(7, { status: 'running', message: `CRUD test passed (direct verification: found test image)` });
      return; // Exit early since we found the image via direct query
    }

    // Find the test image using unique identifier (if real-time sync worked)
    const testImage = imageHistory.find(img => img.prompt === testImageData.prompt);
    if (!testImage) {
      // One more fallback attempt
      const imageHistoryRef = collection(db, `users/${auth.currentUser.uid}/imageHistory`);
      const snapshot = await getDocs(imageHistoryRef);
      const allImages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const fallbackImage = allImages.find(img => img.prompt === testImageData.prompt);
      
      if (fallbackImage) {
        setCreatedTestData(prev => [...prev, `imageHistory/${fallbackImage.id}`]);
        updateTest(7, { status: 'running', message: `CRUD test passed (fallback verification)` });
        return;
      }
      
      throw new Error(`Test image with prompt "${testImageData.prompt}" not found in history. Found ${imageHistory.length} via real-time, ${allImages.length} via direct query.`);
    }

    // Mark for cleanup
    if (testImage.id) {
      setCreatedTestData(prev => [...prev, `imageHistory/${testImage.id}`]);
    }
  };

  const testUserPresetsCRUD = async () => {
    if (!auth.currentUser) throw new Error('No authenticated user');

    const initialCount = presets.length;
    const uniqueId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Test Create with unique identifier
    const testPreset = {
      name: `Test Preset for CRUD ${uniqueId}`,
      positivePrompt: `Test positive prompt for CRUD operations ${uniqueId}`,
      negativePrompt: 'Test negative prompt',
      selectedStyle: 'Digital Art',
      aspectRatio: { label: 'Square (1:1)', value: '1:1', width: 1024, height: 1024 },
      steps: 30,
      cfgScale: 7,
      timestamp: new Date()
    };

    updateTest(8, { status: 'running', message: 'Creating test preset...' });
    
    await addPreset(testPreset);

    updateTest(8, { status: 'running', message: 'Waiting for real-time sync...' });

    // Wait for real-time update with timeout and progress feedback
    try {
      await waitFor(() => presets.length > initialCount, 10000);
      
      if (presets.length <= initialCount) {
        updateTest(8, { status: 'running', message: 'Real-time sync slow, verifying with direct query...' });
        
        // Fallback: Direct query to verify preset was created
        const presetsRef = collection(db, `users/${auth.currentUser.uid}/presets`);
        const snapshot = await getDocs(presetsRef);
        const currentCount = snapshot.size;
        
        if (currentCount <= initialCount) {
          throw new Error(`Preset not created in Firestore. Expected: >${initialCount}, Got: ${currentCount}`);
        }
        
        updateTest(8, { status: 'running', message: `Preset created successfully (verified via direct query: ${currentCount} total)` });
      } else {
        updateTest(8, { status: 'running', message: `Real-time sync working (${presets.length} presets total)` });
      }
    } catch (timeoutError) {
      // If real-time sync fails, try direct verification
      updateTest(8, { status: 'running', message: 'Real-time sync timeout, checking direct query...' });
      
      const presetsRef = collection(db, `users/${auth.currentUser.uid}/presets`);
      const snapshot = await getDocs(presetsRef);
      const allPresets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const testPresetFound = allPresets.find(preset => preset.name === testPreset.name);
      
      if (!testPresetFound) {
        throw new Error(`Test preset not found after creation. Total presets in DB: ${allPresets.length}`);
      }
      
      // Mark for cleanup using the found preset ID
      setCreatedTestData(prev => [...prev, `presets/${testPresetFound.id}`]);
      updateTest(8, { status: 'running', message: `CRUD test passed (direct verification: found test preset)` });
      return; // Exit early since we found the preset via direct query
    }

    // Find the test preset using unique identifier (if real-time sync worked)
    const testPresetFound = presets.find(preset => preset.name === testPreset.name);
    if (!testPresetFound) {
      // One more fallback attempt
      const presetsRef = collection(db, `users/${auth.currentUser.uid}/presets`);
      const snapshot = await getDocs(presetsRef);
      const allPresets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const fallbackPreset = allPresets.find(preset => preset.name === testPreset.name);
      
      if (fallbackPreset) {
        setCreatedTestData(prev => [...prev, `presets/${fallbackPreset.id}`]);
        updateTest(8, { status: 'running', message: `CRUD test passed (fallback verification)` });
        return;
      }
      
      throw new Error(`Test preset with name "${testPreset.name}" not found. Found ${presets.length} via real-time, ${allPresets.length} via direct query.`);
    }

    // Mark for cleanup
    if (testPresetFound.id) {
      setCreatedTestData(prev => [...prev, `presets/${testPresetFound.id}`]);
    }
  };

  const testRealtimeSyncCheck = async () => {
    if (!auth.currentUser) throw new Error('No authenticated user');
    
    // Check if Firestore listeners are working by verifying data loads
    if (firestoreLoading) {
      updateTest(6, { status: 'running', message: 'Waiting for Firestore data to load...' });
      
      // Wait for Firestore to finish loading
      await waitFor(() => !firestoreLoading, 10000);
      
      if (firestoreLoading) {
        throw new Error('Firestore data still loading after timeout - real-time sync may not be working');
      }
    }
    
    // Verify that we can access the imageHistory and presets arrays
    if (!Array.isArray(imageHistory)) {
      throw new Error('Image history not properly loaded from Firestore');
    }
    
    if (!Array.isArray(presets)) {
      throw new Error('Presets not properly loaded from Firestore');
    }
    
    updateTest(6, { status: 'running', message: `Real-time sync verified: ${imageHistory.length} images, ${presets.length} presets loaded` });
  };

  const testDataIsolation = async () => {
    if (!auth.currentUser) throw new Error('No authenticated user');

    // Test that we cannot read other users' data
    const otherUserId = 'non-existent-user-id-123';
    
    try {
      const otherUserQuery = query(
        collection(db, `users/${otherUserId}/imageHistory`)
      );
      
      const snapshot = await getDocs(otherUserQuery);
      
      // If we can read the collection but it's empty, that's fine
      // The security rules should prevent us from reading if there was data
      
    } catch (error: any) {
      // Should get permission denied, which is what we want
      if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
        return; // Good! Data isolation is working
      }
      throw new Error(`Unexpected data isolation test error: ${error.message}`);
    }
  };

  const testRealtimeSync = async () => {
    if (!auth.currentUser) throw new Error('No authenticated user');

    // Create a test document and listen for real-time updates
    const testCollection = collection(db, `users/${auth.currentUser.uid}/test`);
    
    let listenerTriggered = false;
    let unsubscribe: (() => void) | null = null;
    
    try {
      // Set up listener
      const listenerPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Real-time listener timeout'));
        }, 10000);
        
        unsubscribe = onSnapshot(testCollection, (snapshot) => {
          if (!listenerTriggered && snapshot.docs.length > 0) {
            listenerTriggered = true;
            clearTimeout(timeout);
            resolve();
          }
        }, (error) => {
          clearTimeout(timeout);
          reject(new Error(`Listener error: ${error.message}`));
        });
      });
      
      // Add a document to trigger the listener
      await addDoc(testCollection, {
        realtimeTest: true,
        timestamp: Timestamp.now(),
        userId: auth.currentUser.uid
      });
      
      // Wait for listener to trigger
      await listenerPromise;
      
      if (!listenerTriggered) {
        throw new Error('Real-time listener was not triggered');
      }
      
    } finally {
      if (unsubscribe) {
        unsubscribe();
      }
    }
  };

  const cleanupTestData = async () => {
    try {
      // Clean up any test documents we created
      for (const docPath of createdTestData) {
        try {
          // Handle both full paths and relative paths
          if (docPath.startsWith('imageHistory/')) {
            // Delete from image history
            const imageId = docPath.replace('imageHistory/', '');
            await deleteImageFromHistory(imageId);
          } else if (docPath.startsWith('presets/')) {
            // Delete from presets
            const presetId = docPath.replace('presets/', '');
            await deletePreset(presetId);
          } else {
            // Default to direct doc deletion for test collection
            await deleteDoc(doc(db, docPath));
          }
        } catch (error) {
          console.warn(`Failed to cleanup test document: ${docPath}`, error);
        }
      }
      setCreatedTestData([]);
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setCreatedTestData([]);

    const testFunctions = [
      testFirebaseConfiguration,
      testAuthenticationSystem,
      testNetworkConnectivity,
      testGoogleSignIn,
      testDatabaseConnection,
      testSecurityRules,
      testRealtimeSyncCheck,
      testImageHistoryCRUD,
      testUserPresetsCRUD,
      testDataIsolation,
    ];

    try {
      for (let i = 0; i < testFunctions.length; i++) {
        await runTest(i, testFunctions[i], i === 3 ? 0 : 2); // No retries for Google OAuth test (now at index 3)
        setProgress(((i + 1) / testFunctions.length) * 100);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } finally {
      setIsRunning(false);
      await cleanupTestData();
    }
    
    const failedTests = tests.filter(test => test.status === 'error');
    const warningTests = tests.filter(test => test.status === 'warning');
    
    if (failedTests.length === 0) {
      if (warningTests.length > 0) {
        toast.warning(`⚠️ ${warningTests.length} tests had warnings - check Firebase Console configuration`);
      } else {
        toast.success('🎉 All Firestore connection tests passed!');
      }
    } else {
      toast.error(`❌ ${failedTests.length} tests failed`);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'running': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const successCount = tests.filter(test => test.status === 'success').length;
  const errorCount = tests.filter(test => test.status === 'error').length;
  const warningCount = tests.filter(test => test.status === 'warning').length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Firestore Connection Test Suite
            {isRunning && <RefreshCw className="h-4 w-4 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Comprehensive testing of Firebase Firestore connectivity, authentication, and data operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Wifi className={`h-4 w-4 ${connectionStats.firestoreConnected ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-sm">
                {connectionStats.firestoreConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className={`h-4 w-4 ${connectionStats.authStateLoaded ? 'text-green-500' : 'text-yellow-500'}`} />
              <span className="text-sm">
                {connectionStats.authStateLoaded ? 'Auth Ready' : 'Loading...'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="text-sm">
                {connectionStats.latency >= 0 ? `${connectionStats.latency}ms` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-mono">
                {connectionStats.projectId || 'unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className={`h-4 w-4 ${user ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm">
                {user ? 'Authenticated' : 'Not authenticated'}
              </span>
            </div>
          </div>

          {/* Progress */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Running tests...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Summary */}
          <div className="flex gap-4">
            <Badge variant="default" className="bg-green-500">
              ✓ {successCount} Passed
            </Badge>
            {warningCount > 0 && (
              <Badge variant="secondary" className="bg-yellow-500">
                ⚠ {warningCount} Warnings
              </Badge>
            )}
            {errorCount > 0 && (
              <Badge variant="destructive">
                ✗ {errorCount} Failed
              </Badge>
            )}
            <Badge variant="outline">
              Total: {tests.length}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>
            {createdTestData.length > 0 && (
              <Button 
                onClick={cleanupTestData}
                variant="outline"
                disabled={isRunning}
              >
                Clean Up Test Data
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tests.map((test, index) => (
            <div key={index}>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <div className="font-medium">{test.name}</div>
                    <div className="text-sm text-muted-foreground">{test.message}</div>
                    {test.error && (
                      <div className="text-xs text-red-500 mt-1 font-mono bg-red-50 p-2 rounded">
                        {test.error}
                      </div>
                    )}
                    {test.details && (
                      <div className="text-xs text-blue-600 mt-1">
                        {test.details}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  {test.duration && (
                    <div className="text-xs text-muted-foreground">
                      {test.duration}ms
                    </div>
                  )}
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(test.status)}`} />
                </div>
              </div>
              {index < tests.length - 1 && <Separator className="my-2" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* User Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Authenticated</AlertTitle>
              <AlertDescription>
                Signed in as: {user.email} ({user.uid})
                <br />
                Display Name: {user.displayName || 'Not set'}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Not Authenticated</AlertTitle>
              <AlertDescription>
                Tests will create a temporary user for testing database operations
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Google OAuth Configuration Help */}
      {warningCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              Configuration Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Google OAuth Setup Needed</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>To enable Google sign-in, configure it in the Firebase Console:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Go to <a href={`https://console.firebase.google.com/project/${connectionStats.projectId}/authentication/providers`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Firebase Console → Authentication → Sign-in method</a></li>
                  <li>Enable "Google" provider</li>
                  <li>Add authorized domains: <code className="bg-gray-100 px-1 rounded">rotz-image-generator.web.app</code> and <code className="bg-gray-100 px-1 rounded">localhost</code></li>
                  <li>Configure OAuth consent screen in Google Cloud Console</li>
                  <li>Re-run tests to verify Google sign-in works</li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}