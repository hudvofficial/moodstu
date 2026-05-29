#!/usr/bin/env node

import { chromium } from 'playwright';

async function auditBottomNav() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  console.log('🔍 Starting deep audit...\n');

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Get all computed styles
  const audit = await page.evaluate(() => {
    const viewport = document.querySelector('.app-shell-viewport');
    const nav = document.querySelector('nav[class*="bottom"]');
    const main = document.querySelector('main');

    const getComputedProps = (el, props) => {
      if (!el) return null;
      const computed = window.getComputedStyle(el);
      const result = {};
      props.forEach(prop => {
        result[prop] = computed.getPropertyValue(prop);
      });
      return result;
    };

    const getRect = (el) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        height: rect.height,
        width: rect.width,
      };
    };

    return {
      viewport: {
        computed: getComputedProps(viewport, [
          'position', 'inset', 'padding-bottom', 'padding-top',
          'padding-left', 'padding-right', 'height', 'box-sizing'
        ]),
        rect: getRect(viewport),
      },
      nav: {
        computed: getComputedProps(nav, [
          'position', 'bottom', 'left', 'right', 'top',
          'padding-bottom', 'padding-top', 'height', 'z-index'
        ]),
        rect: getRect(nav),
      },
      main: {
        computed: getComputedProps(main, [
          'padding-bottom', 'padding-top', 'overflow-y'
        ]),
        rect: getRect(main),
      },
      window: {
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        safeAreaBottom: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || 'N/A',
      },
      gaps: {
        navToBottom: window.innerHeight - (nav ? nav.getBoundingClientRect().bottom : 0),
        mainBottomPadding: main ? getComputedStyle(main).paddingBottom : 'N/A',
      }
    };
  });

  console.log('═══════════════════════════════════════');
  console.log('📊 DEEP AUDIT REPORT');
  console.log('═══════════════════════════════════════\n');

  console.log('🖼️  VIEWPORT (.app-shell-viewport):');
  console.log('   Computed styles:');
  Object.entries(audit.viewport.computed || {}).forEach(([k, v]) => {
    console.log(`     ${k}: ${v}`);
  });
  console.log('   BoundingRect:');
  Object.entries(audit.viewport.rect || {}).forEach(([k, v]) => {
    console.log(`     ${k}: ${v}px`);
  });

  console.log('\n📱 BOTTOM NAV (<nav>):');
  console.log('   Computed styles:');
  Object.entries(audit.nav.computed || {}).forEach(([k, v]) => {
    console.log(`     ${k}: ${v}`);
  });
  console.log('   BoundingRect:');
  Object.entries(audit.nav.rect || {}).forEach(([k, v]) => {
    console.log(`     ${k}: ${v}px`);
  });

  console.log('\n📄 MAIN CONTENT (<main>):');
  console.log('   Computed styles:');
  Object.entries(audit.main.computed || {}).forEach(([k, v]) => {
    console.log(`     ${k}: ${v}`);
  });

  console.log('\n🌐 WINDOW:');
  Object.entries(audit.window).forEach(([k, v]) => {
    console.log(`   ${k}: ${v}`);
  });

  console.log('\n📏 GAPS:');
  Object.entries(audit.gaps).forEach(([k, v]) => {
    console.log(`   ${k}: ${v}`);
  });

  console.log('\n═══════════════════════════════════════');
  console.log('🎯 DIAGNOSIS:');
  console.log('═══════════════════════════════════════');

  const gap = audit.gaps.navToBottom;
  if (gap > 5) {
    console.log(`\n❌ GAP DETECTED: ${gap}px between nav bottom and screen bottom`);
    console.log('\n🔍 Possible causes:');
    console.log(`   1. Nav bottom position: ${audit.nav.computed?.bottom}`);
    console.log(`   2. Viewport padding-bottom: ${audit.viewport.computed?.['padding-bottom']}`);
    console.log(`   3. Nav height: ${audit.nav.computed?.height}`);
    console.log(`   4. Window innerHeight: ${audit.window.innerHeight}px`);
  } else {
    console.log(`\n✅ No gap detected (${gap}px is within tolerance)`);
  }

  await page.screenshot({ path: 'audit-screenshot.png', fullPage: true });
  console.log('\n📸 Screenshot saved to audit-screenshot.png');

  console.log('\n⏸️  Keeping browser open for 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);

  await browser.close();
}

auditBottomNav().catch(err => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
