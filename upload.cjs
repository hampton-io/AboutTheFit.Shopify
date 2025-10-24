require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function upload() {
  console.log('\n🚀 Starting upload...\n');
  
  // Check environment
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log('Supabase URL:', supabaseUrl ? '✅' : '❌ MISSING');
  console.log('Supabase Key:', supabaseKey ? '✅' : '❌ MISSING');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('\n❌ Missing Supabase credentials in .env file!');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const imagesDir = path.join(__dirname, 'public', 'canned-images');
  
  console.log('\nImages directory:', imagesDir);
  console.log('Directory exists:', fs.existsSync(imagesDir) ? '✅' : '❌');
  
  const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
  console.log(`\nFound ${files.length} images:`, files);
  
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    console.log(`\n--- Processing ${i + 1}/${files.length}: ${filename} ---`);
    
    const filePath = path.join(imagesDir, filename);
    const fileBuffer = fs.readFileSync(filePath);
    // Remove leading numbers, hyphens/underscores, file extension, then title case
    const name = filename
      .replace(/^\d+[-_]/, '')  // Remove leading number and separator
      .replace(/[-_]/g, ' ')
      .replace(/\.\w+$/, '')
      .replace(/\b\w/g, l => l.toUpperCase());
    const gender = filename.includes('male') && !filename.includes('female') ? 'male' : 
                   filename.includes('female') || filename.includes('woman') ? 'female' : null;
    
    console.log(`  Name: ${name}`);
    console.log(`  Gender: ${gender || 'not detected'}`);
    console.log(`  Size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
    
    // Upload to Supabase
    console.log(`  Uploading to Supabase...`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('canned_images')
      .upload(filename, fileBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      console.error(`  ❌ Upload failed:`, uploadError.message);
      continue;
    }
    
    console.log(`  ✅ Uploaded to Supabase`);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('canned_images')
      .getPublicUrl(filename);
    
    const imageUrl = urlData.publicUrl;
    console.log(`  URL: ${imageUrl}`);
    
    // Save to database
    console.log(`  Saving to database...`);
    const existing = await prisma.cannedImage.findFirst({ where: { name } });
    
    if (existing) {
      await prisma.cannedImage.update({
        where: { id: existing.id },
        data: { name, imageUrl, gender, sortOrder: i + 1, isActive: true }
      });
      console.log(`  ✅ Updated database row`);
    } else {
      await prisma.cannedImage.create({
        data: { name, imageUrl, gender, sortOrder: i + 1, isActive: true }
      });
      console.log(`  ✅ Created database row`);
    }
  }
  
  // Verify
  const count = await prisma.cannedImage.count();
  console.log(`\n✨ Done! ${count} total images in database.\n`);
}

upload()
  .catch(err => {
    console.error('\n❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

