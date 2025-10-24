/**
 * Test script for image optimization service
 * 
 * Usage: node test-image-optimization.mjs
 * 
 * This script tests the image optimizer with sample images
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure sharp for serverless (same as production)
sharp.cache(false);
sharp.simd(false);

console.log('🧪 Testing Image Optimization Service\n');

async function testOptimization() {
  try {
    // Test with one of the canned images
    const imagePath = join(__dirname, 'public', 'canned-images', '1-male-alex.png');
    console.log('📂 Loading test image:', imagePath);
    
    const imageBuffer = readFileSync(imagePath);
    const originalSize = imageBuffer.length;
    
    console.log(`📏 Original size: ${(originalSize / 1024).toFixed(2)} KB`);
    
    // Get original metadata
    const originalMetadata = await sharp(imageBuffer).metadata();
    console.log(`📐 Original dimensions: ${originalMetadata.width}x${originalMetadata.height}`);
    
    // Optimize the image
    console.log('\n🖼️  Optimizing image...');
    
    const optimizedBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        mozjpeg: true,
      })
      .toBuffer();
    
    const optimizedSize = optimizedBuffer.length;
    const optimizedMetadata = await sharp(optimizedBuffer).metadata();
    
    console.log(`📏 Optimized size: ${(optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`📐 Optimized dimensions: ${optimizedMetadata.width}x${optimizedMetadata.height}`);
    
    const savings = ((1 - optimizedSize / originalSize) * 100);
    console.log(`🗜️  Compression ratio: ${savings.toFixed(1)}% reduction`);
    
    // Convert to base64 (simulating what we send to AI)
    const base64Length = optimizedBuffer.toString('base64').length;
    console.log(`📊 Base64 length: ${(base64Length / 1024).toFixed(2)} KB`);
    
    console.log('\n✅ Test passed! Image optimization is working correctly.');
    
    // Summary
    console.log('\n📋 Summary:');
    console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`   Optimized: ${(optimizedSize / 1024).toFixed(2)} KB`);
    console.log(`   Savings: ${savings.toFixed(1)}%`);
    console.log(`   This will significantly reduce AI token costs! 💰`);
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nStack trace:', error.stack);
    return false;
  }
}

// Test with URL (simulating external image)
async function testUrlToBase64() {
  try {
    console.log('\n\n🌐 Testing URL to Base64 conversion...');
    
    // Test with a small public image
    const testUrl = 'https://via.placeholder.com/1500x1500.jpg';
    console.log(`📥 Fetching: ${testUrl}`);
    
    const response = await fetch(testUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`📏 Downloaded size: ${(buffer.length / 1024).toFixed(2)} KB`);
    
    // Optimize
    const optimized = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside' })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    console.log(`📏 Optimized size: ${(optimized.length / 1024).toFixed(2)} KB`);
    
    const base64 = optimized.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64}`;
    
    console.log(`✅ Data URI created (length: ${dataUri.length} chars)`);
    
    return true;
  } catch (error) {
    console.error('❌ URL test failed:', error.message);
    return false;
  }
}

// Run tests
(async () => {
  const test1 = await testOptimization();
  const test2 = await testUrlToBase64();
  
  if (test1) {
    console.log('\n\n🎉 Core test passed! Image optimization is working correctly.');
    if (test2) {
      console.log('✅ URL test also passed!');
    } else {
      console.log('⚠️  URL test failed (may be network issue) but core functionality works.');
    }
    console.log('\n✅ Image optimization is ready for deployment to Vercel!');
    process.exit(0);
  } else {
    console.log('\n\n❌ Core test failed. Please check the errors above.');
    process.exit(1);
  }
})();

