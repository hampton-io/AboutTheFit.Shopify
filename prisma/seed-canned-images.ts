/**
 * Seed script for adding canned (pre-selected) images
 * 
 * INSTRUCTIONS:
 * 1. Drop your model images into the public/canned-images/ folder
 * 2. Run: npx tsx prisma/seed-canned-images.ts
 * 
 * That's it! The script will automatically:
 * - Find all images in the folder
 * - Create database entries for them
 * - Generate URLs that serve from your app
 * 
 * Supported formats: JPG, JPEG, PNG, WebP
 * Naming: Use descriptive filenames like "model-alex.jpg" or "female-professional.png"
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const IMAGES_DIR = path.join(process.cwd(), 'public', 'canned-images');
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function extractNameFromFilename(filename: string): string {
  // Remove extension and convert to title case
  const nameWithoutExt = path.parse(filename).name;
  // Remove leading numbers (e.g., "1-male-alex" -> "male-alex")
  const withoutLeadingNumber = nameWithoutExt.replace(/^\d+[-_]/, '');
  // Replace hyphens and underscores with spaces
  const cleaned = withoutLeadingNumber.replace(/[-_]/g, ' ');
  // Convert to title case
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function detectGenderFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower.includes('male') && !lower.includes('female')) return 'male';
  if (lower.includes('female')) return 'female';
  if (lower.includes('unisex') || lower.includes('neutral')) return 'unisex';
  return null;
}

async function seed() {
  console.log('🌱 Seeding canned images from public/canned-images/...\n');

  // Check if directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Directory not found: ${IMAGES_DIR}`);
    console.log('💡 Creating directory...');
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    console.log('✅ Directory created! Add your images and run this script again.');
    return;
  }

  // Read all files from the directory
  const files = fs.readdirSync(IMAGES_DIR);
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  });

  if (imageFiles.length === 0) {
    console.log('⚠️  No images found in public/canned-images/');
    console.log('💡 Add some JPG, PNG, or WebP images to the folder and run this script again.');
    return;
  }

  console.log(`📸 Found ${imageFiles.length} image(s)\n`);

  // Process each image
  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const name = extractNameFromFilename(filename);
    const gender = detectGenderFromFilename(filename);
    const imageUrl = `/canned-images/${filename}`;

    // Check if image already exists
    const existing = await prisma.cannedImage.findFirst({
      where: { imageUrl },
    });

    let result;
    if (existing) {
      // Update existing
      result = await prisma.cannedImage.update({
        where: { id: existing.id },
        data: {
          name,
          gender,
          sortOrder: i + 1,
          isActive: true,
        },
      });
    } else {
      // Create new
      result = await prisma.cannedImage.create({
        data: {
          name,
          imageUrl,
          gender,
          sortOrder: i + 1,
          isActive: true,
        },
      });
    }

    console.log(`✅ ${name}`);
    console.log(`   File: ${filename}`);
    console.log(`   URL: ${imageUrl}`);
    console.log(`   Gender: ${gender || 'not detected'}`);
    console.log('');
  }

  console.log('✨ Seeding complete!');
  console.log(`📊 Total: ${imageFiles.length} image(s) added to database\n`);
}

seed()
  .catch((error) => {
    console.error('❌ Error seeding:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

