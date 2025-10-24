/**
 * Image Optimization Service
 * 
 * Optimizes images before sending them to AI services to reduce:
 * - Token usage and costs
 * - Processing time
 * - Bandwidth consumption
 * 
 * Features:
 * - Resizes images to optimal dimensions for AI processing
 * - Compresses images to reduce file size
 * - Converts to JPEG format for consistency
 * - Handles both base64 and URL inputs
 * - Works in Vercel Node.js serverless environment
 */

import sharp from 'sharp';

// Configure sharp for better performance in serverless environments
// This prevents caching issues on Vercel
sharp.cache(false);
sharp.simd(false); // Disable SIMD for better compatibility

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 1-100, JPEG quality
  format?: 'jpeg' | 'png' | 'webp';
}

export interface OptimizedImage {
  data: string; // base64 encoded
  width: number;
  height: number;
  format: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 85,
  format: 'jpeg',
};

/**
 * Optimizes an image from a URL or base64 string
 */
export async function optimizeImage(
  input: string,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Get the image buffer
    let buffer: Buffer;
    let originalSize: number;

    if (input.startsWith('data:image/')) {
      // Base64 input with data URI
      const base64Data = input.replace(/^data:image\/[a-z]+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
      originalSize = buffer.length;
    } else if (input.startsWith('http://') || input.startsWith('https://')) {
      // URL input - fetch the image
      console.log(`📥 Fetching image from URL...`);
      const response = await fetch(input);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      originalSize = buffer.length;
      
      // Validate it's actually an image
      if (originalSize === 0) {
        throw new Error('Fetched image is empty');
      }
    } else {
      // Assume it's raw base64 without the data URI prefix
      try {
        buffer = Buffer.from(input, 'base64');
        originalSize = buffer.length;
        
        // Validate the buffer is not empty and seems like an image
        if (originalSize === 0) {
          throw new Error('Image buffer is empty');
        }
      } catch (decodeError) {
        throw new Error(`Failed to decode base64 image: ${decodeError instanceof Error ? decodeError.message : 'Unknown error'}`);
      }
    }

    console.log(`📏 Original image size: ${(originalSize / 1024).toFixed(2)} KB`);

    // Process the image with sharp
    let sharpInstance;
    let metadata;
    
    try {
      sharpInstance = sharp(buffer);
      metadata = await sharpInstance.metadata();
      
      // Validate we got valid metadata
      if (!metadata.format || !metadata.width || !metadata.height) {
        throw new Error('Invalid image metadata - file may be corrupted or not an image');
      }
      
      console.log(`📐 Original dimensions: ${metadata.width}x${metadata.height} (${metadata.format})`);
    } catch (sharpError) {
      throw new Error(`Sharp processing failed: ${sharpError instanceof Error ? sharpError.message : 'Unknown error'}`);
    }

    // Resize if needed (maintain aspect ratio)
    let processedImage = sharpInstance.resize(opts.maxWidth, opts.maxHeight, {
      fit: 'inside', // Keep aspect ratio, fit within dimensions
      withoutEnlargement: true, // Don't upscale small images
    });

    // Convert to desired format and compress
    switch (opts.format) {
      case 'jpeg':
        processedImage = processedImage.jpeg({
          quality: opts.quality,
          mozjpeg: true, // Use mozjpeg for better compression
        });
        break;
      case 'png':
        processedImage = processedImage.png({
          compressionLevel: 9,
          quality: opts.quality,
        });
        break;
      case 'webp':
        processedImage = processedImage.webp({
          quality: opts.quality,
        });
        break;
    }

    // Get the optimized buffer
    const optimizedBuffer = await processedImage.toBuffer();
    const optimizedMetadata = await sharp(optimizedBuffer).metadata();
    const optimizedSize = optimizedBuffer.length;

    console.log(`📏 Optimized image size: ${(optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`📐 Optimized dimensions: ${optimizedMetadata.width}x${optimizedMetadata.height}`);
    console.log(`🗜️  Compression ratio: ${((1 - optimizedSize / originalSize) * 100).toFixed(1)}% reduction`);

    // Convert to base64
    const base64Data = optimizedBuffer.toString('base64');
    const dataUri = `data:image/${opts.format};base64,${base64Data}`;

    return {
      data: dataUri,
      width: optimizedMetadata.width || opts.maxWidth || 1024,
      height: optimizedMetadata.height || opts.maxHeight || 1024,
      format: opts.format || 'jpeg',
      originalSize,
      optimizedSize,
      compressionRatio: (1 - optimizedSize / originalSize) * 100,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error optimizing image:', errorMessage);
    
    // Always use fallback instead of throwing - ensures service continues working
    console.warn('⚠️  Using unoptimized image as fallback');
    
    // Return the original image in a format that will work with AI
    const fallbackData = input.startsWith('data:') 
      ? input 
      : input.startsWith('http') 
        ? input // Keep URLs as-is for AI to fetch directly
        : `data:image/jpeg;base64,${input}`;
    
    return {
      data: fallbackData,
      width: opts.maxWidth || 1024,
      height: opts.maxHeight || 1024,
      format: 'jpeg',
      originalSize: 0,
      optimizedSize: 0,
      compressionRatio: 0,
    };
  }
}

/**
 * Optimizes both user photo and clothing image for try-on
 */
export async function optimizeImagesForTryOn(params: {
  userPhoto: string;
  clothingImage: string;
}): Promise<{
  userPhoto: string;
  clothingImage: string;
  stats: {
    userPhoto: OptimizedImage;
    clothingImage: OptimizedImage;
    totalSavings: number;
  };
}> {
  console.log('🖼️  Optimizing images for try-on...');

  try {
    const [optimizedUser, optimizedClothing] = await Promise.all([
      optimizeImage(params.userPhoto, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 85,
      }),
      optimizeImage(params.clothingImage, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 85,
      }),
    ]);

    const totalOriginalSize = optimizedUser.originalSize + optimizedClothing.originalSize;
    const totalOptimizedSize = optimizedUser.optimizedSize + optimizedClothing.optimizedSize;
    const totalSavings = totalOriginalSize > 0 
      ? ((1 - totalOptimizedSize / totalOriginalSize) * 100) 
      : 0;

    console.log(`💾 Total size reduction: ${(totalOriginalSize / 1024).toFixed(2)} KB → ${(totalOptimizedSize / 1024).toFixed(2)} KB`);
    console.log(`📊 Total savings: ${totalSavings.toFixed(1)}%`);

    return {
      userPhoto: optimizedUser.data,
      clothingImage: optimizedClothing.data,
      stats: {
        userPhoto: optimizedUser,
        clothingImage: optimizedClothing,
        totalSavings,
      },
    };
  } catch (error) {
    console.error('❌ Error in batch optimization:', error);
    
    // Fallback: return original images if optimization fails entirely
    console.warn('⚠️  Using unoptimized images as fallback');
    return {
      userPhoto: params.userPhoto,
      clothingImage: params.clothingImage,
      stats: {
        userPhoto: {
          data: params.userPhoto,
          width: 1024,
          height: 1024,
          format: 'jpeg',
          originalSize: 0,
          optimizedSize: 0,
          compressionRatio: 0,
        },
        clothingImage: {
          data: params.clothingImage,
          width: 1024,
          height: 1024,
          format: 'jpeg',
          originalSize: 0,
          optimizedSize: 0,
          compressionRatio: 0,
        },
        totalSavings: 0,
      },
    };
  }
}

/**
 * Quick validation to check if an image needs optimization
 */
export function shouldOptimizeImage(input: string, maxSizeKB: number = 500): boolean {
  try {
    if (input.startsWith('data:image/')) {
      const base64Data = input.replace(/^data:image\/[a-z]+;base64,/, '');
      const sizeKB = Buffer.from(base64Data, 'base64').length / 1024;
      return sizeKB > maxSizeKB;
    }
    // For URLs, we'll optimize by default since we don't know the size
    return true;
  } catch {
    return true;
  }
}

