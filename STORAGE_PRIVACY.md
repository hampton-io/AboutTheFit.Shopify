# Privacy-Focused Storage Implementation

## Overview
Your app now uses a privacy-first approach to file storage that protects user data.

## Storage Strategy

### 👤 User Photos (Customer Uploads)
- **Location**: Local filesystem only (`.uploads/user-photos/`)
- **Why**: Personal photos are sensitive data - never sent to external storage
- **Access**: Served via `/uploads/` route 
- **Retention**: Auto-deleted after 7 days (configurable)
- **Git**: Excluded via `.gitignore`

### 🎨 Result Images (AI-Generated Try-Ons)
- **Primary**: Supabase Storage (if configured)
- **Fallback**: Local filesystem (`.uploads/results/`)
- **Why**: Non-personal images can be stored externally for CDN benefits
- **Retention**: Permanent (unless manually cleaned)

## File Structure

```
.uploads/
├── user-photos/
│   └── {shop-name}/
│       └── {timestamp}-{filename}.jpg
└── results/
    └── {shop-name}/
        └── {request-id}.jpg
```

## Privacy Benefits

✅ **User Privacy**: Customer photos never leave your server
✅ **GDPR Compliant**: Data minimization - user photos auto-deleted
✅ **Cost Effective**: No external storage fees for temporary uploads
✅ **Secure**: Files only accessible through authenticated routes
✅ **Works Offline**: No dependency on external services for core functionality

## Automatic Cleanup

User photos are automatically deleted after 7 days to protect privacy and save disk space.

### Manual Cleanup
```typescript
import { cleanupOldFiles } from '~/services/storage.server';

// Delete files older than 7 days (default)
await cleanupOldFiles();

// Or specify custom retention period
await cleanupOldFiles(3); // 3 days
```

### Scheduled Cleanup (Recommended)

Add a cron job or scheduled task to run cleanup daily:

```bash
# Example: Daily at 3 AM
0 3 * * * curl https://your-app.com/api/cleanup
```

Or use a service like:
- GitHub Actions (scheduled workflow)
- Railway Cron Jobs
- Vercel Cron (if deploying to Vercel)

## Routes

### `/uploads/*` - File Server
- Serves locally stored files
- Security: Prevents directory traversal
- Caching: 1 hour cache headers
- Supported formats: JPG, PNG, WebP, GIF

## Configuration

### Environment Variables (Optional)
```env
# For result image storage (optional - falls back to local)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
```

### Storage Limits
- Max file size: 10MB (configurable in `validateFile()`)
- Allowed types: JPG, PNG, WebP
- Auto-cleanup: 7 days for user photos

## Deployment Considerations

### Local Development
- Files stored in `.uploads/` directory
- Directory auto-created on first upload
- Persists between restarts

### Production (Railway/Heroku/etc)
- **Important**: Ephemeral filesystems will lose files on restart
- Options:
  1. ✅ Use Supabase for result images (recommended)
  2. Mount persistent volume for `.uploads/`
  3. Configure cleanup to run more frequently

### Vercel/Serverless
- **Not compatible** with local file storage
- Must use Supabase or other cloud storage
- Update `storage.server.ts` to remove local storage fallback

## Monitoring

Monitor storage usage:
```typescript
import { getStorageUsage } from '~/services/storage.server';

const fileCount = await getStorageUsage('shop-name.myshopify.com');
console.log(`${fileCount} files stored`);
```

## Security Notes

1. **User Photos**: Deleted automatically - no long-term retention
2. **Access Control**: Files served through app routes (can add auth if needed)
3. **Path Validation**: Directory traversal protection built-in
4. **No External Exposure**: Files not directly accessible via static URL

## Migration Notes

If you were previously using Supabase for user photos:
1. User photos will now go to local storage automatically
2. Old Supabase photos remain untouched
3. Gradually phase out old photos with cleanup script
4. Result images continue using Supabase (if configured)

