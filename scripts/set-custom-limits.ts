/**
 * Script to set custom limits for a shop
 * 
 * Usage:
 *   npx tsx scripts/set-custom-limits.ts <shop-domain> <credits-limit> <product-limit>
 * 
 * Example:
 *   npx tsx scripts/set-custom-limits.ts myshop.myshopify.com 1000 50
 *   npx tsx scripts/set-custom-limits.ts myshop.myshopify.com -1 -1  (unlimited)
 * 
 * To remove custom limits and revert to plan defaults:
 *   npx tsx scripts/set-custom-limits.ts myshop.myshopify.com --remove
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('❌ Error: Shop domain is required');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/set-custom-limits.ts <shop-domain> <credits-limit> <product-limit>');
    console.log('  npx tsx scripts/set-custom-limits.ts <shop-domain> --remove');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/set-custom-limits.ts myshop.myshopify.com 1000 50');
    console.log('  npx tsx scripts/set-custom-limits.ts myshop.myshopify.com -1 -1  (unlimited)');
    console.log('  npx tsx scripts/set-custom-limits.ts myshop.myshopify.com --remove');
    process.exit(1);
  }

  const shop = args[0];
  
  // Check if shop exists
  const shopData = await prisma.appMetadata.findUnique({
    where: { shop },
  });
  
  if (!shopData) {
    console.error(`❌ Error: Shop "${shop}" not found in database`);
    process.exit(1);
  }

  // Remove custom limits
  if (args[1] === '--remove') {
    await prisma.appMetadata.update({
      where: { shop },
      data: {
        hasCustomLimits: false,
      },
    });
    
    console.log('✅ Custom limits removed!');
    console.log(`Shop: ${shop}`);
    console.log('The limits will revert to plan defaults on next app refresh.');
    return;
  }

  // Set custom limits
  if (args.length < 3) {
    console.error('❌ Error: Both credits limit and product limit are required');
    console.log('Usage: npx tsx scripts/set-custom-limits.ts <shop-domain> <credits-limit> <product-limit>');
    process.exit(1);
  }

  const creditsLimit = parseInt(args[1], 10);
  const productLimit = parseInt(args[2], 10);

  if (isNaN(creditsLimit) || isNaN(productLimit)) {
    console.error('❌ Error: Limits must be numbers (use -1 for unlimited)');
    process.exit(1);
  }

  await prisma.appMetadata.update({
    where: { shop },
    data: {
      creditsLimit,
      productLimit,
      hasCustomLimits: true,
    },
  });

  console.log('✅ Custom limits set successfully!');
  console.log(`Shop: ${shop}`);
  console.log(`Credits Limit: ${creditsLimit === -1 ? 'Unlimited' : creditsLimit}`);
  console.log(`Product Limit: ${productLimit === -1 ? 'Unlimited' : productLimit}`);
  console.log('\nThese limits will persist even when the user refreshes the app.');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

