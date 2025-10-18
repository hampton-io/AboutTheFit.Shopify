import type { LoaderFunctionArgs } from 'react-router';
import { promises as fs } from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), '.uploads');

/**
 * Serve locally stored files
 * Accessible via: /uploads/user-photos/...  or /uploads/results/...
 */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const filePath = params['*'];
    
    if (!filePath) {
      return new Response('File not found', { status: 404 });
    }

    // Security: prevent directory traversal
    const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(UPLOAD_DIR, safePath);

    // Ensure the resolved path is still within UPLOAD_DIR
    if (!fullPath.startsWith(UPLOAD_DIR)) {
      return new Response('Invalid file path', { status: 403 });
    }

    // Read the file
    const fileBuffer = await fs.readFile(fullPath);
    
    // Determine content type based on extension
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    }[ext] || 'application/octet-stream';

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error serving file:', error);
    
    if (error.code === 'ENOENT') {
      return new Response('File not found', { status: 404 });
    }
    
    return new Response('Error serving file', { status: 500 });
  }
};

