import type { ActionFunctionArgs } from 'react-router';
import { cleanupOldFiles } from '../services/storage.server';

/**
 * Cleanup endpoint for scheduled tasks
 * 
 * Can be called by:
 * - Cron job: curl -X POST https://your-app.com/api/cleanup
 * - GitHub Actions scheduled workflow
 * - Railway/Vercel cron
 * 
 * Security: Add authentication if exposing publicly
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    // Optional: Add authentication
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    console.log('🧹 Starting scheduled cleanup...');
    
    const deletedCount = await cleanupOldFiles(7); // 7 days retention
    
    return Response.json({
      success: true,
      message: `Cleanup complete: ${deletedCount} files deleted`,
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export const loader = action;

