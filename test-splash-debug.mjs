#!/usr/bin/env node

import { chromium } from 'playwright';

async function debugSplash() {
  const browser = await chromium.launch({ headless: false }); // Show browser
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  // Listen to console logs
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });

  // Listen to page errors
  page.on('pageerror', err => {
    console.error(`[Browser Error] ${err.message}`);
  });

  console.log('🚀 Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

  // Check splash screen state every second
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);

    const splashState = await page.evaluate(() => {
      const splash = document.getElementById('splash-screen');
      if (!splash) return { exists: false };

      const styles = window.getComputedStyle(splash);
      return {
        exists: true,
        display: styles.display,
        opacity: styles.opacity,
        className: splash.className,
        readyState: document.readyState,
        sessionStorage: sessionStorage.getItem('ms_v2_loaded'),
      };
    });

    console.log(`[${i+1}s] Splash state:`, JSON.stringify(splashState, null, 2));

    if (!splashState.exists || splashState.display === 'none') {
      console.log('✅ Splash screen hidden!');
      break;
    }
  }

  await page.screenshot({ path: 'debug-splash.png' });
  console.log('📸 Screenshot saved to debug-splash.png');

  // Don't close immediately
  await page.waitForTimeout(3000);
  await browser.close();
}

debugSplash().catch(err => {
  console.error('❌ Debug failed:', err);
  process.exit(1);
});
