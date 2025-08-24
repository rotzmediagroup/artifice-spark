import { useCallback } from 'react';

/**
 * Custom hook for mobile haptic feedback using Web Vibration API
 * Provides tactile feedback for UI interactions on supported devices
 * Gracefully falls back on unsupported devices (like iOS Safari)
 */
export const useHaptic = () => {
  const vibrate = useCallback((pattern: number | number[]) => {
    // Check if vibration API is supported
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        // Silently fail on devices that don't support vibration
        console.debug('Haptic feedback not available:', error);
      }
    }
  }, []);

  return {
    // Light tap for minor interactions (button presses, selections)
    lightTap: useCallback(() => vibrate(50), [vibrate]),
    
    // Medium tap for important actions (generate, upload)
    mediumTap: useCallback(() => vibrate(100), [vibrate]),
    
    // Strong tap for critical actions
    strongTap: useCallback(() => vibrate(200), [vibrate]),
    
    // Success pattern for positive feedback (generation complete)
    success: useCallback(() => vibrate([50, 50, 50]), [vibrate]),
    
    // Error pattern for negative feedback (validation errors)
    error: useCallback(() => vibrate([200, 100, 200]), [vibrate]),
    
    // Double tap for confirmation actions
    doubleTap: useCallback(() => vibrate([50, 100, 50]), [vibrate]),
    
    // Custom vibration pattern
    custom: useCallback((pattern: number | number[]) => vibrate(pattern), [vibrate]),
    
    // Check if haptic feedback is supported
    isSupported: 'vibrate' in navigator && typeof navigator.vibrate === 'function'
  };
};

export default useHaptic;