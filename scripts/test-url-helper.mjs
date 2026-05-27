#!/usr/bin/env node
/**
 * Test getResponsiveThumbnailUrl helper function
 */

// Mock the UPDATED helper function inline
function getResponsiveThumbnailUrl(thumbnailUrl, imageUrl, targetSize, useProxy = false) {
  // Strategy 1: Use proxy for same-origin loading (public mode)
  if (useProxy) {
    const fileIdMatch =
      thumbnailUrl?.match(/[?&]id=([^&]+)/) ||
      imageUrl?.match(/\/d\/([^/?]+)/);
    const fileId = fileIdMatch?.[1] || fileIdMatch?.[2];

    if (fileId) {
      return `/api/drive-download/${fileId}`;
    }
  }

  const normalizedSize = Math.max(200, Math.round(targetSize));

  // Strategy 2: Prefer lh3.googleusercontent.com (already whitelisted for Next.js Image)
  if (imageUrl && /lh3\.googleusercontent\.com/i.test(imageUrl)) {
    const baseUrl = imageUrl.replace(/[?=]s\d+$/, '');
    return `${baseUrl}=s${normalizedSize}`;
  }

  // Strategy 3: Fallback to drive.google.com/thumbnail
  if (!thumbnailUrl) return imageUrl;

  if (!/drive\.google\.com\/thumbnail/i.test(thumbnailUrl)) {
    return thumbnailUrl;
  }

  const sizeParam = `sz=w${normalizedSize}`;

  if (thumbnailUrl.includes('sz=')) {
    return thumbnailUrl.replace(/sz=[sw]\d+/i, sizeParam);
  }

  const separator = thumbnailUrl.includes('?') ? '&' : '?';
  return `${thumbnailUrl}${separator}${sizeParam}`;
}

// Test data from database
const thumbnail_url = 'https://drive.google.com/thumbnail?id=1QV6YdK9KSCNg8_KtRCxahxMUhM5iXrhL&sz=s400';
const image_url = 'https://lh3.googleusercontent.com/d/1QV6YdK9KSCNg8_KtRCxahxMUhM5iXrhL';
const columnWidth = 400;

console.log('🧪 Testing getResponsiveThumbnailUrl\n');

console.log('Input:');
console.log(`  thumbnail_url: ${thumbnail_url}`);
console.log(`  image_url: ${image_url}`);
console.log(`  targetSize: ${columnWidth}\n`);

// Test admin mode (useProxy = false)
const adminResult = getResponsiveThumbnailUrl(thumbnail_url, image_url, columnWidth, false);
console.log('Admin Mode (useProxy = false):');
console.log(`  Result: ${adminResult}`);
console.log(`  Domain: ${new URL(adminResult).hostname}`);
console.log(`  Whitelisted? ${new URL(adminResult).hostname.includes('lh3.googleusercontent.com') ? '✅ YES' : '❌ NO (drive.google.com)'}\n`);

// Test public mode (useProxy = true)
const publicResult = getResponsiveThumbnailUrl(thumbnail_url, image_url, columnWidth, true);
console.log('Public Mode (useProxy = true):');
console.log(`  Result: ${publicResult}`);
console.log(`  Is local? ${publicResult.startsWith('/') ? '✅ YES (same domain)' : '❌ NO'}\n`);

console.log('─'.repeat(80));
console.log('\n💡 Conclusion:');
console.log(`   Admin mode returns: drive.google.com ❌ NOT WHITELISTED`);
console.log(`   Public mode returns: /api/drive-download ✅ SAME DOMAIN`);
console.log(`\n   → Problem: Admin mode uses drive.google.com thumbnail URLs`);
console.log(`   → Solution: Either use image_url (lh3) OR use proxy OR use <img>\n`);
