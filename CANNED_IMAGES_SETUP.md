# Pre-Selected Images Setup Guide

This feature allows customers to choose from pre-selected model images instead of uploading their own photos. When a customer selects a pre-selected image, the generated try-on result is cached, so the next person who tries the same combination gets an instant response.

## Quick Setup (3 Easy Steps!)

### 1. Create Supabase Storage Bucket

1. Go to your Supabase project → Storage
2. Create a new bucket called `canned_images`
3. Make it **PUBLIC** (important!)

### 2. Add Your Images

Drop your model photos into the `public/canned-images/` folder:

```
public/
  canned-images/
    model-alex.jpg
    female-professional.png
    male-casual.webp
```

**Naming Tips:**
- Use descriptive names like `model-alex.jpg` or `female-professional.png`
- Include keywords like `male`, `female`, or `woman` to auto-detect gender
- Supported formats: JPG, JPEG, PNG, WebP

### 3. Run the Upload Script

```bash
npx tsx prisma/seed-canned-supabase.ts
```

The script will:
- ✅ Upload all images to Supabase Storage
- ✅ Get public URLs for each image
- ✅ Create database entries automatically
- ✅ Extract names from filenames
- ✅ Detect gender from filenames (optional)

### 4. Done!

Your pre-selected images will now appear in the try-on modal for all customers!

## How It Works

1. **First use**: When a customer selects a pre-selected image and tries on a product, the AI generates the result normally
2. **Automatic caching**: The result is automatically stored in the database
3. **Instant results**: The next customer who selects the same image + product combination gets the cached result instantly (no AI generation needed)
4. **Credits**: Both cached and fresh generations count toward your usage credits

## Managing Your Images

### To Add More Images:
1. Drop new images into `public/canned-images/`
2. Run `npx tsx prisma/seed-canned-images.ts`

### To Update an Image:
1. Replace the file in `public/canned-images/` (keep the same filename)
2. Run `npx tsx prisma/seed-canned-images.ts`

### To Remove an Image:
1. Delete the file from `public/canned-images/`
2. (Optional) Delete from database using Prisma Studio:
```bash
npx prisma studio
# Navigate to CannedImage table and delete the entry
```

## Example Filenames

Good naming helps the script auto-detect properties:

```
✅ model-alex.jpg          → Name: "Model Alex"
✅ female-sarah-pro.png    → Name: "Female Sarah Pro", Gender: female
✅ male-casual-john.webp   → Name: "Male Casual John", Gender: male
✅ unisex-style-1.jpg      → Name: "Unisex Style 1", Gender: unisex
✅ 01-professional.png     → Name: "01 Professional"
```

## Tips for Best Results

1. **Variety**: Include diverse models (different genders, body types, ethnicities)
2. **Quality**: Use high-resolution images (at least 512x512px)
3. **Consistency**: Similar lighting and style across all pre-selected images
4. **Limit**: Start with 3-6 models; too many choices can overwhelm customers
5. **Test**: Try each pre-selected image with your products to ensure good results

## Cache Management

Cached results are stored per shop, so each store has its own cache. The cache:
- Automatically builds as customers use pre-selected images
- Persists until manually cleared
- Is tied to specific product IDs (if you change a product image, the cache for that product is invalidated)

To view cache statistics, check the `cached_try_on` table in Prisma Studio:
```bash
npx prisma studio
```

