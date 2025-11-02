import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getThemeInfo, verifyBlockInstalled } from "../services/theme-verification.server";

/**
 * Debug endpoint to inspect theme structure
 * Access: /api/admin/debug-theme
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { admin, session } = await authenticate.admin(request);
    const shop = session.shop;

    // Get all themes
    const themes = await getThemeInfo(session, shop);
    
    // Find main theme
    const mainTheme = themes.find((theme: any) => 
      theme.role === 'main'
    );

    if (!mainTheme) {
      return Response.json({ 
        error: 'No published theme found',
        themes 
      });
    }

    const themeId = mainTheme.id;

    // Fetch product template
    const templateKey = 'templates/product.json';
    
    try {
      const assetUrl = `https://${shop}/admin/api/2025-10/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(templateKey)}`;
      const assetResponse = await fetch(assetUrl, {
        headers: {
          'X-Shopify-Access-Token': session.accessToken || '',
          'Content-Type': 'application/json',
        },
      });

      if (!assetResponse.ok) {
        return Response.json({
          error: 'Failed to fetch template',
          templateKey,
        });
      }

      const assetData = await assetResponse.json() as { asset?: any };
      const asset = assetData.asset;

      if (asset?.value) {
        const templateJson = JSON.parse(asset.value);
        
        // Run verification
        const blockInstalled = await verifyBlockInstalled(session, shop);

        return Response.json({
          success: true,
          shop,
          theme: {
            id: themeId,
            name: mainTheme.name,
            role: mainTheme.role,
          },
          template: {
            key: templateKey,
            json: templateJson,
          },
          verification: {
            blockInstalled,
          },
          extensionInfo: {
            uid: '122b53bb-b213-1324-5c66-4fd32866c196d99d2fec',
            handle: 'about-the-fit',
            blockName: 'try_on_button',
            expectedPatterns: [
              'shopify://apps/about-the-fit/blocks/try_on_button',
              '/blocks/try_on_button',
              '122b53bb-b213-1324-5c66-4fd32866c196d99d2fec',
            ],
          },
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } else {
        return Response.json({
          error: 'Template file not found or empty',
          templateKey,
        });
      }
    } catch (error: any) {
      console.error('Error fetching template:', error);
      return Response.json({
        error: 'Failed to fetch template',
        message: error.message,
        templateKey,
      });
    }

  } catch (error: any) {
    console.error('Error in debug-theme:', error);
    return Response.json({
      error: 'Failed to authenticate or fetch theme',
      message: error.message,
    }, { status: 500 });
  }
}

