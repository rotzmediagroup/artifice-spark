import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

// Scheduled function to run daily at 2 AM UTC
export const cleanupExpiredImages = functions.pubsub
  .schedule('0 2 * * *') // Runs at 2:00 AM every day
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting daily image cleanup task...');
    
    const now = new Date();
    let deletedCount = 0;
    let errorCount = 0;
    
    try {
      // Get all users
      const usersSnapshot = await db.collection('users').get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Query expired images for this user
        const expiredImagesQuery = db
          .collection(`users/${userId}/imageHistory`)
          .where('expiresAt', '<=', admin.firestore.Timestamp.fromDate(now));
        
        const expiredImagesSnapshot = await expiredImagesQuery.get();
        
        for (const imageDoc of expiredImagesSnapshot.docs) {
          try {
            const imageData = imageDoc.data();
            const imageId = imageDoc.id;
            
            console.log(`Deleting expired image ${imageId} for user ${userId}`);
            
            // Delete from Storage if URL exists
            if (imageData.url) {
              try {
                // Extract file path from URL
                const urlParts = imageData.url.split('/');
                const fileName = urlParts[urlParts.length - 1].split('?')[0];
                const filePath = `generated-images/${userId}/${fileName}`;
                
                // Delete from Storage
                await storage.bucket().file(filePath).delete();
                console.log(`Deleted file from storage: ${filePath}`);
              } catch (storageError) {
                console.error(`Failed to delete storage file: ${storageError}`);
                // Continue even if storage deletion fails
              }
            }
            
            // Delete from Firestore
            await imageDoc.ref.delete();
            console.log(`Deleted Firestore document: ${imageId}`);
            
            // Log the deletion
            await db.collection('deletionLogs').add({
              userId,
              imageId,
              imageUrl: imageData.url || 'unknown',
              deletedAt: admin.firestore.FieldValue.serverTimestamp(),
              reason: 'expired',
              originalCreatedAt: imageData.timestamp,
              expiresAt: imageData.expiresAt,
            });
            
            deletedCount++;
          } catch (error) {
            console.error(`Error deleting image ${imageDoc.id}:`, error);
            errorCount++;
          }
        }
      }
      
      console.log(`Cleanup completed. Deleted ${deletedCount} images, ${errorCount} errors.`);
      
      // Log summary
      await db.collection('cleanupLogs').add({
        executedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedCount,
        errorCount,
        status: 'completed',
      });
      
    } catch (error) {
      console.error('Fatal error in cleanup task:', error);
      
      // Log error
      await db.collection('cleanupLogs').add({
        executedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedCount,
        errorCount,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
    
    return null;
  });

// Callable function to extend image expiration
export const extendImageExpiration = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email;
  const imageId = data.imageId;
  
  if (!imageId) {
    throw new functions.https.HttpsError('invalid-argument', 'Image ID is required');
  }
  
  // Check if user is admin
  const isAdmin = userEmail === 'jerome@rotz.host';
  
  try {
    // Get the image document
    const imageRef = db.doc(`users/${userId}/imageHistory/${imageId}`);
    const imageDoc = await imageRef.get();
    
    if (!imageDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Image not found');
    }
    
    const imageData = imageDoc.data();
    if (!imageData) {
      throw new functions.https.HttpsError('not-found', 'Image data not found');
    }
    
    const currentExtensionCount = imageData.extensionCount || 0;
    const contentType = imageData.contentType || 'image'; // Default to 'image' for backwards compatibility
    
    // Different extension limits based on content type
    const maxExtensions = contentType === 'video' ? 1 : 3;
    const mediaTypeName = contentType === 'video' ? 'Videos' : 'Images';
    
    // Check extension limit for non-admin users
    if (!isAdmin && currentExtensionCount >= maxExtensions) {
      throw new functions.https.HttpsError(
        'permission-denied',
        `Maximum extensions reached. ${mediaTypeName} can be extended up to ${maxExtensions} time${maxExtensions === 1 ? '' : 's'}.`
      );
    }
    
    // Calculate new expiration date (add 7 days)
    const currentExpiresAt = imageData.expiresAt.toDate();
    const newExpiresAt = new Date(currentExpiresAt);
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);
    
    // Update the image document
    await imageRef.update({
      expiresAt: admin.firestore.Timestamp.fromDate(newExpiresAt),
      extensionCount: currentExtensionCount + 1,
      lastExtendedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Log the extension
    await db.collection('extensionLogs').add({
      userId,
      imageId,
      extendedAt: admin.firestore.FieldValue.serverTimestamp(),
      extensionNumber: currentExtensionCount + 1,
      newExpiresAt: admin.firestore.Timestamp.fromDate(newExpiresAt),
      isAdmin,
    });
    
    return {
      success: true,
      newExpiresAt: newExpiresAt.toISOString(),
      extensionCount: currentExtensionCount + 1,
      remainingExtensions: isAdmin ? 'unlimited' : (maxExtensions - (currentExtensionCount + 1)),
    };
    
  } catch (error) {
    console.error('Error extending image expiration:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to extend image expiration');
  }
});

// HTTP function to manually trigger cleanup (admin only)
export const manualCleanup = functions.https.onRequest(async (req, res) => {
  // Simple auth check via query parameter (in production, use proper authentication)
  const adminKey = req.query.adminKey;
  
  if (adminKey !== functions.config().admin?.key) {
    res.status(403).send('Unauthorized');
    return;
  }
  
  try {
    // Trigger the cleanup
    await cleanupExpiredImages(null);
    res.status(200).send('Cleanup completed successfully');
  } catch (error) {
    console.error('Manual cleanup failed:', error);
    res.status(500).send('Cleanup failed');
  }
});

// Proxy function for N8N webhook - handles long-running video generation
export const proxyToN8N = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes max timeout
    memory: '1GB'
  })
  .https.onRequest(async (req, res) => {
    console.log('ProxyToN8N: Request received', {
      method: req.method,
      contentType: req.get('content-type'),
      timestamp: new Date().toISOString()
    });

    // Enable CORS for browser requests
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, key, Connection, Cache-Control');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const startTime = Date.now();
      const apiKey = req.get('key');
      
      if (!apiKey) {
        console.error('ProxyToN8N: No API key provided');
        res.status(401).send('API key required');
        return;
      }

      const contentType = req.get('content-type') || '';
      
      // Separate webhook URLs for different generation types
      const imageWebhookUrl = 'https://agents.rotz.ai/webhook/a7ff7b82-67b5-4e98-adfd-132f1f100496'; // Respond to Webhook node
      const videoWebhookUrl = 'https://agents.rotz.ai/webhook/12e3ed27-21ad-47e1-b1b2-cca64970c0fe'; // Streaming configuration
      
      // Determine if this is a video generation request by checking the request body
      let isVideoGeneration = false;
      try {
        if (req.body && typeof req.body === 'object') {
          // For JSON requests - check generation_settings.generation_type
          if (req.body.generation_settings?.generation_type === 'video' || 
              req.body.generation_settings?.generation_type === 'img2video') {
            isVideoGeneration = true;
          }
          // For FormData requests wrapped in N8N format - check nested payload
          if (Array.isArray(req.body) && req.body[0]?.body?.generation_settings) {
            const genType = req.body[0].body.generation_settings.generation_type;
            if (genType === 'video' || genType === 'img2video') {
              isVideoGeneration = true;
            }
          }
        }
      } catch (e) {
        // If we can't parse, default to non-video handling
        console.log('ProxyToN8N: Could not determine generation type, defaulting to image handling');
      }
      
      // Select appropriate webhook based on generation type
      const n8nWebhookUrl = isVideoGeneration ? videoWebhookUrl : imageWebhookUrl;
      
      console.log(`ProxyToN8N: Generation type detected as ${isVideoGeneration ? 'VIDEO' : 'IMAGE'}`);
      console.log(`ProxyToN8N: Routing to webhook: ${n8nWebhookUrl.split('/').pop()}`);
      
      let response;
      
      if (contentType.includes('multipart/form-data')) {
        // Handle FormData requests (with reference images)
        console.log('ProxyToN8N: Processing FormData request');
        
        // Forward the raw body as-is
        // The req.rawBody contains the original multipart data
        const boundary = contentType.split('boundary=')[1];
        
        if (!boundary) {
          throw new Error('No boundary found in multipart request');
        }
        
        // Forward request with original FormData
        response = await axios({
          method: 'POST',
          url: n8nWebhookUrl,
          data: req.rawBody || req.body,
          headers: {
            'Content-Type': contentType,
            'key': apiKey,
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache'
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          responseType: isVideoGeneration ? 'stream' : 'arraybuffer', // Stream for videos, buffer for images
          timeout: 540000, // 9 minutes
          validateStatus: () => true // Don't throw on any status
        });
        
      } else {
        // Handle JSON requests
        console.log('ProxyToN8N: Processing JSON request');
        
        response = await axios({
          method: 'POST',
          url: n8nWebhookUrl,
          data: req.body,
          headers: {
            'Content-Type': 'application/json',
            'key': apiKey,
            'Connection': 'keep-alive', 
            'Cache-Control': 'no-cache'
          },
          responseType: isVideoGeneration ? 'stream' : 'arraybuffer', // Stream for videos, buffer for images
          timeout: 540000, // 9 minutes
          validateStatus: () => true // Don't throw on any status
        });
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`ProxyToN8N: N8N response received`, {
        status: response.status,
        contentType: response.headers['content-type'],
        processingTimeMs: processingTime,
        processingTimeMin: (processingTime / 60000).toFixed(2),
        isStreamResponse: isVideoGeneration
      });
      
      // Forward the response headers
      const responseContentType = response.headers['content-type'];
      if (responseContentType) {
        res.set('Content-Type', responseContentType);
      }
      
      // Set status
      res.status(response.status);
      
      // Handle response based on type
      if (isVideoGeneration && response.status === 200) {
        // Check if this is actually a video stream or JSON response
        if (responseContentType && responseContentType.includes('application/json')) {
          // N8N video webhook returns JSON with video URL (not a stream)
          console.log('ProxyToN8N: Video webhook returned JSON response (expected for this webhook)');
          
          const chunks: Buffer[] = [];
          response.data.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.data.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const jsonResponse = buffer.toString('utf8');
            console.log('ProxyToN8N: Video webhook JSON response:', jsonResponse);
            
            // Parse and validate the response
            try {
              const parsed = JSON.parse(jsonResponse);
              
              // Check if this is a successful video generation response
              if (Array.isArray(parsed) && parsed[0]?.status === 'SUCCEEDED' && parsed[0]?.output) {
                console.log('ProxyToN8N: Video generation successful, forwarding response');
                res.set('Content-Type', 'application/json');
                res.status(200).send(jsonResponse);
              } else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.output && Array.isArray(parsed[0].output)) {
                // Alternative successful format - array with output URLs
                console.log('ProxyToN8N: Video generation successful (alternative format), forwarding response');
                res.set('Content-Type', 'application/json');
                res.status(200).send(jsonResponse);
              } else {
                // Check if response contains any video URLs (fallback success detection)
                const responseStr = jsonResponse.toLowerCase();
                const hasVideoUrl = responseStr.includes('.mp4') || responseStr.includes('video') || responseStr.includes('output');
                
                if (hasVideoUrl && !responseStr.includes('error') && !responseStr.includes('failed')) {
                  // Likely a successful response in unexpected format
                  console.log('ProxyToN8N: Video response contains video data, treating as success');
                  res.set('Content-Type', 'application/json');
                  res.status(200).send(jsonResponse);
                } else {
                  // This is likely an actual error
                  console.error('ProxyToN8N: Video webhook response appears to be an error:', jsonResponse);
                  res.set('Content-Type', 'application/json');
                  res.status(500).send(jsonResponse);
                }
              }
            } catch (parseError) {
              console.error('ProxyToN8N: Failed to parse video webhook response:', parseError);
              
              // Even if parsing failed, check if the raw response looks successful
              const responseStr = jsonResponse.toLowerCase();
              const hasVideoContent = responseStr.includes('.mp4') || responseStr.includes('output');
              const hasErrorContent = responseStr.includes('error') || responseStr.includes('failed');
              
              if (hasVideoContent && !hasErrorContent) {
                console.log('ProxyToN8N: Parsing failed but response appears to contain video data, treating as success');
                res.set('Content-Type', 'application/json');
                res.status(200).send(jsonResponse);
              } else {
                console.log('ProxyToN8N: Parsing failed and no video content detected, treating as error');
                res.set('Content-Type', 'application/json');
                res.status(500).send(jsonResponse);
              }
            }
          });
          response.data.on('error', (streamError: any) => {
            console.error('ProxyToN8N: Error reading video webhook response:', streamError);
            if (!res.headersSent) {
              res.status(500).json({
                error: 'Stream Processing Error',
                message: 'Failed to read N8N video webhook response'
              });
            }
          });
        } else {
          // Actual video stream - implement true streaming passthrough
          console.log('ProxyToN8N: Starting streaming passthrough for N8N response');
          
          let totalSize = 0;
          let hasStartedSending = false;
          
          // Set headers for streaming response
          res.set('Content-Type', responseContentType || 'video/mp4');
          res.set('Cache-Control', 'no-cache');
          res.set('Transfer-Encoding', 'chunked');
          
          // Stream data directly to client as it arrives from N8N
          response.data.on('data', (chunk: Buffer) => {
            totalSize += chunk.length;
            
            // Log progress periodically
            if (totalSize > 0 && totalSize % (1024 * 1024) === 0) {
              console.log(`ProxyToN8N: Streaming ${(totalSize / (1024 * 1024)).toFixed(1)}MB to client`);
            }
            
            // Forward chunk immediately to client (no buffering)
            if (!hasStartedSending) {
              hasStartedSending = true;
              console.log('ProxyToN8N: Starting stream transmission to client');
            }
            
            // Write chunk directly to response stream
            try {
              res.write(chunk);
            } catch (writeError) {
              console.error('ProxyToN8N: Error writing chunk to client:', writeError);
              // Don't abort - let the error handler deal with it
            }
          });
          
          // Handle stream completion
          response.data.on('end', () => {
            console.log(`ProxyToN8N: Stream complete, total ${(totalSize / (1024 * 1024)).toFixed(2)}MB streamed`);
            
            // End the response stream
            try {
              res.end();
              console.log('ProxyToN8N: Successfully completed streaming response');
            } catch (endError) {
              console.error('ProxyToN8N: Error ending response stream:', endError);
            }
          });
          
          // Handle stream errors with better logging and cleanup
          response.data.on('error', (streamError: any) => {
            console.error('ProxyToN8N: Stream error during video processing:', streamError);
            console.error('ProxyToN8N: Stream error code:', streamError.code);
            console.error('ProxyToN8N: Bytes streamed before error:', totalSize);
            
            // For streaming responses, we can't send JSON if headers already sent
            if (!res.headersSent) {
              // Headers not sent yet - can still send error response
              res.status(500).json({
                error: 'Stream Processing Error',
                message: `Stream failed after ${(totalSize / (1024 * 1024)).toFixed(2)}MB: ${streamError.message}`,
                errorCode: streamError.code,
                isStreaming: true
              });
            } else {
              // Headers already sent - can only log and close connection
              console.error('ProxyToN8N: Cannot send error response - already streaming. Closing connection.');
              try {
                res.destroy(); // Forcefully close the connection
              } catch (destroyError) {
                console.error('ProxyToN8N: Error destroying response stream:', destroyError);
              }
            }
          });
        }
        
      } else {
        // For image generation or error responses - buffer and send
        console.log('ProxyToN8N: Sending buffered response');
        
        if (response.data) {
          if (isVideoGeneration) {
            // Video request but got error status - need to read stream and convert to buffer
            const chunks: Buffer[] = [];
            
            response.data.on('data', (chunk: Buffer) => {
              chunks.push(chunk);
            });
            
            response.data.on('end', () => {
              const buffer = Buffer.concat(chunks);
              res.send(buffer);
            });
            
            response.data.on('error', (streamError: any) => {
              console.error('ProxyToN8N: Stream error during error response:', streamError);
              res.send('');
            });
            
          } else {
            // Image generation - response.data is an ArrayBuffer
            const buffer = Buffer.from(response.data);
            res.send(buffer);
          }
        } else {
          res.send('');
        }
      }
      
    } catch (error: any) {
      console.error('ProxyToN8N: Error occurred', {
        message: error.message,
        code: error.code,
        responseAvailable: !!error.response,
        responseStatus: error.response?.status
      });
      
      // Don't try to send response if headers already sent (streaming scenario)
      if (res.headersSent) {
        console.error('ProxyToN8N: Cannot send error response - headers already sent (likely during streaming)');
        return;
      }
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: 'The request to N8N took too long to complete'
        });
      } else if (error.code === 'ECONNRESET') {
        res.status(500).json({
          error: 'Connection Reset',
          message: 'The connection to N8N was reset during processing'
        });
      } else if (error.response) {
        // N8N responded with an error
        res.status(error.response.status || 500).send(error.response.data || 'N8N Error');
      } else {
        // Network or other error
        res.status(500).json({
          error: 'Proxy Error',
          message: error.message || 'Failed to proxy request to N8N'
        });
      }
    }
  });