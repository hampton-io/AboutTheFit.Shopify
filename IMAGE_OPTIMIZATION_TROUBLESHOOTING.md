# Image Optimization Troubleshooting

## Issue: AI Failing After Optimization

If you're experiencing AI generation failures after enabling image optimization, here's how to troubleshoot:

## Quick Fix: Disable Optimization Temporarily

To test if optimization is causing the issue, you can disable it:

### Option 1: Environment Variable (Recommended)
Add to your `.env` file:
```bash
ENABLE_IMAGE_OPTIMIZATION=false
```

### Option 2: Test With Different Settings
The optimization now uses higher quality settings by default:
- **Max dimensions:** 1536x1536 (increased from 1024)
- **Quality:** 95% (increased from 85%)
- **Format:** JPEG

These settings provide better AI compatibility while still reducing file size.

## Testing Process

### Step 1: Disable Optimization
```bash
# Add to .env
ENABLE_IMAGE_OPTIMIZATION=false
```

Restart your dev server:
```bash
npm run dev
```

### Step 2: Test Try-On
Try creating a try-on with a user photo. Check the logs:

**If optimization is disabled, you'll see:**
```
ℹ️  Image optimization disabled (ENABLE_IMAGE_OPTIMIZATION=false)
🤖 Calling AI service...
```

**If optimization is enabled, you'll see:**
```
🖼️  Optimizing user photo before AI processing...
✅ User photo optimized successfully
💰 User photo size reduced by XX% - saving tokens!
🤖 Calling AI service...
```

### Step 3: Compare Results

- **If AI works WITHOUT optimization:** The compression was too aggressive
- **If AI still fails:** The issue is not related to optimization

## Solutions Based on Results

### If Optimization Was the Problem

Keep optimization disabled for now:
```bash
ENABLE_IMAGE_OPTIMIZATION=false
```

**OR** try adjusting the quality settings in `app/routes/api.proxy.tryon.create.tsx`:

```typescript
const optimizedUserPhoto = await optimizeImage(actualUserPhoto, {
  maxWidth: 2048,   // Even larger
  maxHeight: 2048,  // Even larger
  quality: 98,      // Near-lossless
});
```

### If Optimization Was NOT the Problem

The AI failure is unrelated to image optimization. Common causes:

1. **API Key Issues**
   - Check `GOOGLE_AI_API_KEY` is set correctly
   - Verify the key has access to `gemini-2.5-flash-image` model

2. **Image Format Issues**
   - Ensure user photos are valid images (JPEG, PNG)
   - Check if images are corrupted

3. **Gemini Model Issues**
   - Gemini's image generation can be inconsistent
   - Consider switching to Replicate (see AI_PROVIDER_SETUP.md)

## Current Settings

The optimization is now configured with **AI-friendly settings**:

```typescript
{
  maxWidth: 1536,   // Large enough for good quality
  maxHeight: 1536,  // Large enough for good quality
  quality: 95,      // Very high quality (minimal compression)
}
```

This provides:
- ✅ Still reduces file size (typically 50-70% reduction)
- ✅ High enough quality for AI processing
- ✅ Faster processing than full-size images
- ✅ Lower token costs

## Recommended Configuration

### For Gemini AI (Current Setup)
```bash
# Keep optimization enabled with high quality
ENABLE_IMAGE_OPTIMIZATION=true  # (default)
```

The new high-quality settings (95%, 1536x1536) should work well with Gemini.

### For Replicate IDM-VTON
```bash
# Standard optimization works great
ENABLE_IMAGE_OPTIMIZATION=true
```

You could even use more aggressive settings since IDM-VTON is more robust.

## Monitoring

Watch the logs when processing a try-on:

```bash
# Good - optimization working
🖼️  Optimizing user photo before AI processing...
📥 Fetching image from URL...
📏 Original image size: 2.45 MB
📐 Original dimensions: 2048x1536 (jpeg)
📏 Optimized image size: 456.12 KB
📐 Optimized dimensions: 1536x1152
🗜️  Compression ratio: 81.4% reduction
✅ User photo optimized successfully
💰 User photo size reduced by 81.4% - saving tokens!
🤖 Calling AI service...
✅ AI generation complete
✅ AI result: Success!
```

```bash
# If optimization is disabled
ℹ️  Image optimization disabled (ENABLE_IMAGE_OPTIMIZATION=false)
🤖 Calling AI service...
```

## Getting Help

If issues persist:

1. **Check the full logs** for detailed error messages
2. **Try with a different test image** - some images may be problematic
3. **Verify your AI provider settings** in `app/services/ai.server.ts`
4. **Consider switching to Replicate** - see `AI_PROVIDER_SETUP.md`

## Performance Impact

### With Optimization (95% quality, 1536x1536)
- Average reduction: 50-70%
- AI success rate: Should be the same
- Cost savings: Moderate token reduction

### Without Optimization
- No reduction: Full-size images sent to AI
- AI success rate: Baseline
- Cost impact: Higher token costs

## Best Practice

1. **Start with optimization ENABLED** (new high-quality settings)
2. **Monitor AI success rates** for a few days
3. **If issues occur**, disable temporarily to confirm cause
4. **Adjust settings** as needed based on your specific use case

---

**Quick Toggle:**
```bash
# Enable (default)
ENABLE_IMAGE_OPTIMIZATION=true

# Disable
ENABLE_IMAGE_OPTIMIZATION=false
```

