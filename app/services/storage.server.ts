/**
 * Storage Service - Privacy-Focused File Storage
 * 
 * Strategy:
 * - User photos: Stored LOCALLY only (.uploads directory) - never sent to external storage
 * - Result images: Stored on Supabase if configured, falls back to local storage
 * - Auto-cleanup: User photos are automatically deleted after 7 days for privacy
 * 
 * This approach:
 * ✅ Protects user privacy (no personal photos on external servers)
 * ✅ Reduces storage costs
 * ✅ Complies with data retention best practices
 * ✅ Works without Supabase configuration
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const BUCKET_NAME = 'tryon-photos';

// Local storage configuration
const UPLOAD_DIR = path.join(process.cwd(), '.uploads');
const PUBLIC_UPLOAD_PATH = '/uploads';

let supabaseClient: SupabaseClient | null = null;

// Lazy initialization of Supabase client
function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '⚠️  Supabase credentials not set. Using local storage for results.'
    );
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseClient;
}

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(path.join(UPLOAD_DIR, 'user-photos'), { recursive: true });
    await fs.mkdir(path.join(UPLOAD_DIR, 'results'), { recursive: true });
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a user photo to local storage (privacy-friendly - no external storage)
 */
export async function uploadUserPhoto(
  file: Buffer | Blob,
  shop: string,
  fileName: string
): Promise<UploadResult> {
  try {
    await ensureUploadDir();

    // Create a unique path: shop/timestamp-filename
    const timestamp = Date.now();
    const sanitizedShop = shop.replace(/[^a-zA-Z0-9-]/g, '-');
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '-');
    const uniqueFileName = `${timestamp}-${sanitizedFileName}`;
    
    const relativePath = path.join('user-photos', sanitizedShop, uniqueFileName);
    const fullPath = path.join(UPLOAD_DIR, relativePath);

    // Ensure shop directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Convert Blob to Buffer if needed
    let buffer: Buffer;
    if (Buffer.isBuffer(file)) {
      buffer = file;
    } else {
      // file is Blob
      const arrayBuffer = await (file as Blob).arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // Write file to local storage
    await fs.writeFile(fullPath, buffer);

    // Return URL accessible via the app
    const publicUrl = `${PUBLIC_UPLOAD_PATH}/${relativePath.replace(/\\/g, '/')}`;

    console.log('📁 User photo saved locally:', publicUrl);

    return {
      success: true,
      url: publicUrl,
      path: relativePath,
    };
  } catch (error) {
    console.error('Upload exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload a generated result image (tries Supabase, falls back to local)
 */
export async function uploadResultImage(
  imageData: string, // base64 or buffer
  shop: string,
  requestId: string
): Promise<UploadResult> {
  try {
    // Convert base64 to buffer
    let buffer: Buffer;
    if (imageData.startsWith('data:image/')) {
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(imageData, 'base64');
    }

    const sanitizedShop = shop.replace(/[^a-zA-Z0-9-]/g, '-');
    
    // Try Supabase first if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      const storagePath = `${sanitizedShop}/results/${requestId}.jpg`;

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: 'image/jpeg',
          cacheControl: '86400',
          upsert: true,
        });

      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        console.log('☁️  Result uploaded to Supabase:', publicUrl);
        return {
          success: true,
          url: publicUrl,
          path: storagePath,
        };
      }
      
      console.warn('Supabase upload failed, falling back to local storage:', error);
    }

    // Fallback to local storage
    await ensureUploadDir();
    
    const relativePath = path.join('results', sanitizedShop, `${requestId}.jpg`);
    const fullPath = path.join(UPLOAD_DIR, relativePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    const publicUrl = `${PUBLIC_UPLOAD_PATH}/${relativePath.replace(/\\/g, '/')}`;
    
    console.log('📁 Result saved locally:', publicUrl);

    return {
      success: true,
      url: publicUrl,
      path: relativePath,
    };
  } catch (error) {
    console.error('Upload exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a file from storage (local or Supabase)
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    // Try local storage first
    const localPath = path.join(UPLOAD_DIR, filePath);
    try {
      await fs.unlink(localPath);
      console.log('🗑️  Deleted local file:', filePath);
      return true;
    } catch (localError: any) {
      if (localError.code !== 'ENOENT') {
        console.error('Local delete error:', localError);
      }
    }

    // Try Supabase if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

      if (error) {
        console.error('Supabase delete error:', error);
        return false;
      }

      console.log('☁️  Deleted from Supabase:', filePath);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Delete exception:', error);
    return false;
  }
}

/**
 * Get a signed URL for temporary access (for private buckets)
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Storage service not configured');
      return null;
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Signed URL exception:', error);
    return null;
  }
}

/**
 * List files for a shop
 */
export async function listShopFiles(
  shop: string,
  folder: 'user-photos' | 'results' = 'results'
): Promise<string[]> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      console.warn('Storage service not configured');
      return [];
    }

    const sanitizedShop = shop.replace(/[^a-zA-Z0-9-]/g, '-');
    const path = `${sanitizedShop}/${folder}`;

    const { data, error } = await supabase.storage.from(BUCKET_NAME).list(path);

    if (error) {
      console.error('List files error:', error);
      return [];
    }

    return data.map((file) => `${path}/${file.name}`);
  } catch (error) {
    console.error('List files exception:', error);
    return [];
  }
}

/**
 * Clean up old files (run periodically) - especially important for user photos
 */
export async function cleanupOldFiles(daysOld: number = 7): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffTime = cutoffDate.getTime();
    
    let deletedCount = 0;

    // Clean up local storage
    const userPhotosDir = path.join(UPLOAD_DIR, 'user-photos');
    
    try {
      const shops = await fs.readdir(userPhotosDir);
      
      for (const shop of shops) {
        const shopDir = path.join(userPhotosDir, shop);
        const stat = await fs.stat(shopDir);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(shopDir);
          
          for (const file of files) {
            const filePath = path.join(shopDir, file);
            const fileStat = await fs.stat(filePath);
            
            // Delete if older than cutoff date
            if (fileStat.mtimeMs < cutoffTime) {
              await fs.unlink(filePath);
              deletedCount++;
              console.log(`🗑️  Deleted old file: ${file}`);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Local cleanup error:', error);
      }
    }

    console.log(`🧹 Cleanup complete: deleted ${deletedCount} files older than ${daysOld} days`);
    return deletedCount;
  } catch (error) {
    console.error('Cleanup exception:', error);
    return 0;
  }
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of ${maxSizeBytes / 1024 / 1024}MB`,
    };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed. Use JPG, PNG, or WebP.`,
    };
  }

  return { valid: true };
}

/**
 * Get storage usage for a shop (useful for billing)
 */
export async function getStorageUsage(shop: string): Promise<number> {
  try {
    const sanitizedShop = shop.replace(/[^a-zA-Z0-9-]/g, '-');

    // List all files for the shop
    const userPhotos = await listShopFiles(shop, 'user-photos');
    const results = await listShopFiles(shop, 'results');

    // Note: Supabase doesn't provide file size in list() by default
    // You'd need to fetch metadata for each file or track size in your database

    return userPhotos.length + results.length;
  } catch (error) {
    console.error('Storage usage exception:', error);
    return 0;
  }
}

