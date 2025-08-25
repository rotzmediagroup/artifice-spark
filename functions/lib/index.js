"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualCleanup = exports.extendImageExpiration = exports.cleanupExpiredImages = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();
// Scheduled function to run daily at 2 AM UTC
exports.cleanupExpiredImages = functions.pubsub
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
                        }
                        catch (storageError) {
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
                }
                catch (error) {
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
    }
    catch (error) {
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
exports.extendImageExpiration = functions.https.onCall(async (data, context) => {
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
            throw new functions.https.HttpsError('permission-denied', `Maximum extensions reached. ${mediaTypeName} can be extended up to ${maxExtensions} time${maxExtensions === 1 ? '' : 's'}.`);
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
    }
    catch (error) {
        console.error('Error extending image expiration:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to extend image expiration');
    }
});
// HTTP function to manually trigger cleanup (admin only)
exports.manualCleanup = functions.https.onRequest(async (req, res) => {
    var _a;
    // Simple auth check via query parameter (in production, use proper authentication)
    const adminKey = req.query.adminKey;
    if (adminKey !== ((_a = functions.config().admin) === null || _a === void 0 ? void 0 : _a.key)) {
        res.status(403).send('Unauthorized');
        return;
    }
    try {
        // Trigger the cleanup
        await (0, exports.cleanupExpiredImages)(null);
        res.status(200).send('Cleanup completed successfully');
    }
    catch (error) {
        console.error('Manual cleanup failed:', error);
        res.status(500).send('Cleanup failed');
    }
});
//# sourceMappingURL=index.js.map