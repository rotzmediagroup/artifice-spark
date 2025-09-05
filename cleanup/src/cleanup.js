import pkg from 'pg';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';

const { Client } = pkg;
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function cleanupExpiredImages() {
  try {
    await client.connect();
    console.log('🧹 Starting image cleanup task...');

    // Get expired images
    const result = await client.query(
      'SELECT id, file_path FROM image_history WHERE expires_at <= NOW()'
    );

    let deletedCount = 0;
    let errorCount = 0;

    for (const image of result.rows) {
      try {
        // Delete file from filesystem
        if (image.file_path) {
          const fullPath = path.resolve(image.file_path);
          if (await fs.pathExists(fullPath)) {
            await fs.unlink(fullPath);
            console.log(`🗑️  Deleted file: ${image.file_path}`);
          }
        }

        // Delete from database
        await client.query('DELETE FROM image_history WHERE id = $1', [image.id]);
        deletedCount++;

      } catch (error) {
        console.error(`❌ Error deleting image ${image.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Cleanup completed: ${deletedCount} deleted, ${errorCount} errors`);

  } catch (error) {
    console.error('❌ Cleanup task failed:', error);
  } finally {
    await client.end();
  }
}

cleanupExpiredImages();