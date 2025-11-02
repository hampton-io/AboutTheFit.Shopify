import type { ActionFunctionArgs } from 'react-router';
import db from '../db.server';

/**
 * Theme Editor Beacon
 * Called when our block is loaded in Shopify's theme editor (design mode)
 * Helps detect when merchants are actively working with our extension
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');

    if (!shop) {
      return Response.json({ success: false }, { status: 400 });
    }

    console.log('🎨 Theme editor beacon received from:', shop);

    // Update or create app metadata with last editor activity timestamp
    await db.appMetadata.upsert({
      where: { shop },
      update: {
        settings: {
          lastEditorActivity: new Date().toISOString(),
        },
      },
      create: {
        shop,
        settings: {
          lastEditorActivity: new Date().toISOString(),
        },
      },
    });

    return Response.json({ 
      success: true,
      message: 'Beacon received' 
    });
  } catch (error) {
    console.error('Error processing editor beacon:', error);
    return Response.json({ 
      success: false,
      error: 'Failed to process beacon' 
    }, { status: 500 });
  }
};

