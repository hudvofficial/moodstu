#!/usr/bin/env node

import { chromium } from 'playwright';

async function testBottomNav() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  console.log('🚀 Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Wait for splash screen to disappear
  console.log('⏳ Waiting for splash screen...');
  await page.waitForTimeout(5000);

  // Check if we're on login or dashboard
  const currentUrl = page.url();
  console.log(`📍 Current URL: ${currentUrl}`);

  // Take screenshot
  console.log('📸 Taking screenshot...');
  await page.screenshot({ path: 'app-screenshot.png', fullPage: true });

  // Check bottom nav exists and position
  const bottomNav = await page.locator('nav').filter({ has: page.locator('a[href="/dashboard"]') }).first();
  const navExists = await bottomNav.count() > 0;

  if (navExists) {
    const box = await bottomNav.boundingBox();
    const viewport = page.viewportSize();

    console.log('✅ Bottom nav found!');
    console.log(`   Position: y=${box.y}, height=${box.height}`);
    console.log(`   Viewport height: ${viewport.height}`);
    console.log(`   Distance from bottom: ${viewport.height - (box.y + box.height)}px`);

    // Check if nav is at the bottom (within 5px tolerance)
    const distanceFromBottom = viewport.height - (box.y + box.height);
    if (distanceFromBottom <= 5) {
      console.log('✅ Bottom nav is properly positioned at the bottom!');
    } else {
      console.log(`❌ Bottom nav has ${distanceFromBottom}px gap from bottom!`);
    }

    // Check nav items
    const navItems = await bottomNav.locator('a').count();
    console.log(`   Nav items count: ${navItems}`);
  } else {
    console.log('❌ Bottom nav not found!');
  }

  // Check PWA manifest
  console.log('\n🔍 Checking PWA...');
  const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
  if (manifestLink) {
    console.log(`✅ Manifest link found: ${manifestLink}`);

    // Fetch manifest
    const manifestUrl = new URL(manifestLink, 'http://localhost:3000').toString();
    const manifestResponse = await page.context().request.get(manifestUrl);
    if (manifestResponse.ok()) {
      const manifest = await manifestResponse.json();
      console.log('✅ Manifest is valid:');
      console.log(`   Name: ${manifest.name || manifest.short_name}`);
      console.log(`   Display: ${manifest.display}`);
      console.log(`   Start URL: ${manifest.start_url}`);
      console.log(`   Theme color: ${manifest.theme_color}`);
      console.log(`   Icons: ${manifest.icons?.length || 0} icons`);
    } else {
      console.log('❌ Manifest fetch failed');
    }
  } else {
    console.log('❌ No manifest link found');
  }

  // Check service worker
  const swRegistrations = await page.evaluate(() => {
    return navigator.serviceWorker.getRegistrations().then(regs => regs.length);
  });
  console.log(`   Service worker registrations: ${swRegistrations}`);

  await browser.close();
  console.log('\n✅ Test completed!');
  console.log('📸 Screenshot saved to app-screenshot.png');
}

testBottomNav().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
