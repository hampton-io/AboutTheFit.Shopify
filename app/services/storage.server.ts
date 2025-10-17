import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️  Supabase credentials not set. File storage features will not work.'
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET_NAME = 'tryon-photos';

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a user photo to Supabase Storage
 */
export async function uploadUserPhoto(
  file: Buffer | Blob,
  shop: string,
  fileName: string
): Promise<UploadResult> {
  try {
    // Create a unique path: shop/timestamp-filename
    const timestamp = Date.now();
    const sanitizedShop = shop.replace(/[^a-zA-Z0-9-]/g, '-');
    const path = `${sanitizedShop}/user-photos/${timestamp}-${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

    return {
      success: true,
      url: publicUrl,
      path: path,
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
 * Upload a generated result image
 */
export async function uploadResultImage(
  imageData: string, // base64 or buffer
  shop: string,
  requestId: string
): Promise<UploadResult> {
  try {
    // Convert base64 to buffer if needed
    let buffer: Buffer;
    if (imageData.startsWith('data:image/')) {
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(imageData, 'base64');
    }

    const sanitizedShop = shop.replace(/[^a-zA-Z0-9-]/g, '-');
    const path = `${sanitizedShop}/results/${requestId}.jpg`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '86400', // Cache for 24 hours
        upsert: true, // Allow overwriting
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

    return {
      success: true,
      url: publicUrl,
      path: path,
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
 * Delete a file from storage
 */
export async function deleteFile(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
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
 * Clean up old files (run periodically)
 */
export async function cleanupOldFiles(daysOld: number = 7): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // This is a simplified version - in production, you'd want to:
    // 1. List all files with metadata
    // 2. Filter by date
    // 3. Delete in batches
    // 4. Update database records

    console.log(`Cleanup would delete files older than ${cutoffDate}`);
    return 0;
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

