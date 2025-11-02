import type { AdminApiContext, Session } from '@shopify/shopify-app-react-router/server';

interface ThemeAsset {
  key: string;
  value?: string;
}

interface Theme {
  id: number;
  name: string;
  role: string;
}

/**
 * Server-side theme verification
 * Checks if our app block is actually installed in the merchant's theme
 * Much more reliable than client-side beacons!
 */
export async function verifyBlockInstalled(
  session: Session,
  shop: string
): Promise<boolean> {
  try {
    // Step 1: Get the published (main) theme using REST API
    // Use the session's access token to make authenticated requests
    const themesUrl = `https://${shop}/admin/api/2025-10/themes.json`;
    
    const themesResponse = await fetch(themesUrl, {
      headers: {
        'X-Shopify-Access-Token': session.accessToken || '',
        'Content-Type': 'application/json',
      },
    });
    
    if (!themesResponse.ok) {
      return false;
    }

    const themesData = await themesResponse.json() as { themes?: Theme[] };
    const themes = themesData.themes || [];
    
    // Find the main (published) theme
    const mainTheme = themes.find(theme => 
      theme.role === 'main'
    );

    if (!mainTheme) {
      return false;
    }

    const themeId = mainTheme.id;

    // Step 2: Fetch product template JSON files
    // Check common product templates
    const templatesToCheck = [
      'templates/product.json',
      'sections/main-product.json',
    ];

    for (const templateKey of templatesToCheck) {
      try {
        const assetUrl = `https://${shop}/admin/api/2025-10/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(templateKey)}`;
        const assetResponse = await fetch(assetUrl, {
          headers: {
            'X-Shopify-Access-Token': session.accessToken || '',
            'Content-Type': 'application/json',
          },
        });

        if (!assetResponse.ok) {
          continue;
        }

        const assetData = await assetResponse.json() as { asset?: ThemeAsset };
        const asset = assetData.asset;

        if (asset?.value) {
          // Step 3: Parse JSON and look for our block type
          const templateJson = JSON.parse(asset.value);
          
          // Our block type identifiers (multiple formats to check)
          // Format with UID: shopify://apps/{handle}/blocks/{block-name}/{uid}
          const blockTypePatterns = [
            'shopify://apps/about-the-fit/blocks/try_on_button',
            '/blocks/try_on_button', // Partial match
            '122b53bb-b213-1324-5c66-4fd32866c196d99d2fec', // Just the UID
          ];
          
          // Check all sections and their blocks
          for (const pattern of blockTypePatterns) {
            const foundBlock = checkForBlockInTemplate(templateJson, pattern);
            
            if (foundBlock) {
              return true;
            }
          }
        }
      } catch (error) {
        // Template might not exist, continue checking others
        continue;
      }
    }

    return false;

  } catch (error) {
    // Silently fail and assume not installed on error
    return false;
  }
}

/**
 * Recursively search for our block type in template JSON
 */
function checkForBlockInTemplate(obj: any, blockPattern: string): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  // Check if this object has our block type (exact or partial match)
  if (obj.type && typeof obj.type === 'string') {
    if (obj.type === blockPattern || obj.type.includes(blockPattern)) {
      return true;
    }
  }

  // Also check 'id' field which might contain the block reference
  if (obj.id && typeof obj.id === 'string' && obj.id.includes(blockPattern)) {
    return true;
  }

  // Recursively check all properties
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (checkForBlockInTemplate(obj[key], blockPattern)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get detailed theme info for debugging
 */
export async function getThemeInfo(session: Session, shop: string): Promise<any> {
  try {
    const themesUrl = `https://${shop}/admin/api/2025-10/themes.json`;
    const response = await fetch(themesUrl, {
      headers: {
        'X-Shopify-Access-Token': session.accessToken || '',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as { themes?: Theme[] };
    return data.themes || [];
  } catch (error) {
    return [];
  }
}

