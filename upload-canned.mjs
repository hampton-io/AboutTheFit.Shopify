import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔍 Checking environment variables...');
console.log(`SUPABASE_URL: ${supabaseUrl ? '✅ Found' : '❌ Missing'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${supabaseKey ? '✅ Found' : '❌ Missing'}\n`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('Make sure your .env file contains:');
  console.error('  SUPABASE_URL=https://your-project.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const IMAGES_DIR = path.join(__dirname, 'public', 'canned-images');
const BUCKET_NAME = 'canned_images';
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function extractNameFromFilename(filename) {
  const nameWithoutExt = path.parse(filename).name;
  // Remove leading numbers (e.g., "1-male-alex" -> "male-alex")
  const withoutLeadingNumber = nameWithoutExt.replace(/^\d+[-_]/, '');
  const cleaned = withoutLeadingNumber.replace(/[-_]/g, ' ');
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function detectGenderFromFilename(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('male') && !lower.includes('female')) return 'male';
  if (lower.includes('female') || lower.includes('woman')) return 'female';
  if (lower.includes('unisex') || lower.includes('neutral')) return 'unisex';
  return null;
}

async function seed() {
  console.log('🌱 Uploading canned images to Supabase...\n');

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Directory not found: ${IMAGES_DIR}`);
    return;
  }

  const files = fs.readdirSync(IMAGES_DIR);
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
  });

  if (imageFiles.length === 0) {
    console.log('⚠️  No images found');
    return;
  }

  console.log(`📸 Found ${imageFiles.length} image(s)\n`);

  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const name = extractNameFromFilename(filename);
    const gender = detectGenderFromFilename(filename);
    const filePath = path.join(IMAGES_DIR, filename);

    console.log(`📤 Uploading: ${filename}...`);

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`❌ Failed to upload ${filename}:`, uploadError.message);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    const imageUrl = urlData.publicUrl;

    console.log(`✅ Uploaded: ${imageUrl}`);

    const existing = await prisma.cannedImage.findFirst({
      where: { 
        OR: [
          { imageUrl },
          { name }
        ]
      },
    });

    if (existing) {
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
      console.log(`📝 Updated: ${name}\n`);
    } else {
      await prisma.cannedImage.create({
        data: {
          name,
          imageUrl,
          gender,
          sortOrder: i + 1,
          isActive: true,
        },
      });
      console.log(`📝 Created: ${name}\n`);
    }
  }

  console.log('✨ Done!\n');
}

seed()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

