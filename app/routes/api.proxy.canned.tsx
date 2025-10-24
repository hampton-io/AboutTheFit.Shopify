import type { LoaderFunctionArgs } from 'react-router';
import { getActiveCannedImages } from '../services/canned.server';

/**
 * App Proxy endpoint for fetching canned images
 * Accessible via: /apps/aboutthefit/api/canned from the storefront
 * Routes to: /api/proxy/canned in the app
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log('🎨 Fetching canned images from /api/proxy/canned');

  try {
    const cannedImages = await getActiveCannedImages();
    console.log(`📸 Found ${cannedImages.length} active canned images in database`);
    
    if (cannedImages.length > 0) {
      console.log('Sample image:', {
        id: cannedImages[0].id,
        name: cannedImages[0].name,
        imageUrl: cannedImages[0].imageUrl?.substring(0, 50) + '...',
      });
    }

    return Response.json({
      success: true,
      images: cannedImages.map((img) => ({
        id: img.id,
        name: img.name,
        imageUrl: img.imageUrl,
        description: img.description,
        gender: img.gender,
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching canned images:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch images',
      },
      { status: 500 }
    );
  }
};

