/**
 * Upload canned images to Supabase Storage and seed database
 * 
 * INSTRUCTIONS:
 * 1. Make sure you have created a bucket called "canned_images" in Supabase
 * 2. Make sure the bucket is PUBLIC
 * 3. Images should be in public/canned-images/ folder
 * 4. Run: npx tsx prisma/seed-canned-supabase.ts
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const IMAGES_DIR = path.join(process.cwd(), 'public', 'canned-images');
const BUCKET_NAME = 'canned_images';
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function extractNameFromFilename(filename: string): string {
  const nameWithoutExt = path.parse(filename).name;
  // Remove leading numbers (e.g., "1-male-alex" -> "male-alex")
  const withoutLeadingNumber = nameWithoutExt.replace(/^\d+[-_]/, '');
  const cleaned = withoutLeadingNumber.replace(/[-_]/g, ' ');
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function detectGenderFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.includes('male') && !lower.includes('female')) return 'male';
  if (lower.includes('female') || lower.includes('woman')) return 'female';
  if (lower.includes('unisex') || lower.includes('neutral')) return 'unisex';
  return null;
}

async function seed() {
  console.log('🌱 Uploading canned images to Supabase and seeding database...\n');

  // Check if directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Directory not found: ${IMAGES_DIR}`);
    return;
  }

  // Read all image files
  const files = fs.readdirSync(IMAGES_DIR);
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  });

  if (imageFiles.length === 0) {
    console.log('⚠️  No images found in public/canned-images/');
    return;
  }

  console.log(`📸 Found ${imageFiles.length} image(s)\n`);

  // Process each image
  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const name = extractNameFromFilename(filename);
    const gender = detectGenderFromFilename(filename);
    const filePath = path.join(IMAGES_DIR, filename);

    console.log(`📤 Uploading: ${filename}...`);

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, fileBuffer, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error(`❌ Failed to upload ${filename}:`, uploadError.message);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    const imageUrl = urlData.publicUrl;

    console.log(`✅ Uploaded to Supabase: ${imageUrl}`);

    // Check if already exists in database
    const existing = await prisma.cannedImage.findFirst({
      where: { 
        OR: [
          { imageUrl },
          { name }
        ]
      },
    });

    if (existing) {
      // Update existing
      await prisma.cannedImage.update({
        where: { id: existing.id },
        data: {
          name,
          imageUrl,
          gender,
          sortOrder: i + 1,
          isActive: true,
        },
      });
      console.log(`📝 Updated database entry: ${name}`);
    } else {
      // Create new
      await prisma.cannedImage.create({
        data: {
          name,
          imageUrl,
          gender,
          sortOrder: i + 1,
          isActive: true,
        },
      });
      console.log(`📝 Created database entry: ${name}`);
    }

    console.log('');
  }

  console.log('✨ Seeding complete!');
  console.log(`📊 Total: ${imageFiles.length} image(s) uploaded and added to database\n`);
}

seed()
  .catch((error) => {
    console.error('❌ Error seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

