import { test, expect, chromium } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5174';
const LOCALES = ['en-US', 'zh-CN', 'zh-TW'];

const routes = [
  '/',
  '/football',
  '/players',
  '/clubs',
  '/competitions',
  '/matches',
  '/news',
  '/search',
  '/player',
  '/learn',
  '/community',
  '/scouting',
  '/manager',
  '/sim',
  '/transfers',
  '/review',
  '/timeline',
  '/development',
  '/history',
  '/achievements',
  '/watchlist',
];

// For quick testing, comment out most routes
// const routes = ['/', '/football', '/manager', '/player', '/learn', '/sim'];

async function checkLocale(page, locale) {
  await page.evaluate((l) => {
    localStorage.setItem('football-os.locale', l);
    window.location.reload();
  }, locale);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(200);

  const htmlLang = await page.getAttribute('html', 'lang');
  const htmlClass = await page.getAttribute('html', 'class');
  const bodyText = await page.innerText('body');
  const bodyHtml = await page.innerHTML('body');

  // Check for raw keys (ni.kind.*, coach.*, etc.)
  const rawKeyPatterns = [
    /ni\.kind\.\w+/,
    /coach\.\w+/,
    /mgr\.\w+/,
    /tac\.\w+/,
    /sim\.\w+/,
    /det\.\w+/,
    /hist\.\w+/,
    /learn\.\w+/,
    /comm\.\w+/,
    /ach\.\w+/,
    /ai\.\w+/,
    /common\.\w+/,
    /ms\.\w+/,
  ];

  const foundKeys = [];
  for (const pattern of rawKeyPatterns) {
    const matches = bodyText.match(pattern);
    if (matches) foundKeys.push(...matches);
  }

  // Check for unfilled placeholders like {club}, {player}
  const placeholders = bodyText.match(/\{[a-zA-Z]+\}/g) || [];

  // Check for [object Object] or undefined/NaN
  const badValues = [];
  if (bodyText.includes('[object Object]')) badValues.push('[object Object]');
  if (bodyText.includes('undefined') && !bodyText.includes('undefined') === false) badValues.push('undefined');
  if (bodyText.includes('NaN')) badValues.push('NaN');

  return {
    locale,
    route: page.url(),
    htmlLang,
    htmlClass,
    textLength: bodyText.length,
    foundKeys: [...new Set(foundKeys)],
    placeholders: [...new Set(placeholders)],
    badValues,
  };
}

async function walkRoutes(page, baseRoute) {
  const results = [];
  for (const locale of LOCALES) {
    await page.goto(`${BASE_URL}${baseRoute}?locale=${locale}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    const result = await checkLocale(page, locale);
    result.route = baseRoute;
    results.push(result);
  }
  return results;
}

async function testCareerState(page) {
  await page.goto(`${BASE_URL}/manager`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const hasCareer = await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('football-os.state') || '{}');
    return !!store.career;
  });

  if (!hasCareer) {
    await page.goto(`${BASE_URL}/onboarding`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="名称" i]').first();
    if (await nameInput.count()) {
      await nameInput.fill('Test Manager');
      await page.click('button:has-text("Start"), button:has-text("开始"), button[type="submit"]').catch(() => {});
      await page.waitForTimeout(1000);
    }
  }

  const results = [];
  for (const locale of LOCALES) {
    await page.goto(`${BASE_URL}/manager?locale=${locale}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    const result = await checkLocale(page, locale);
    result.route = '/manager (populated)';
    results.push(result);
  }
  return results;
}

async function testPlayerOS(page) {
  await page.goto(`${BASE_URL}/player`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const results = [];
  for (const locale of LOCALES) {
    await page.goto(`${BASE_URL}/player?locale=${locale}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    const result = await checkLocale(page, locale);
    result.route = '/player';
    results.push(result);
  }
  return results;
}

async function testLearnHub(page) {
  await page.goto(`${BASE_URL}/learn`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const results = [];
  for (const locale of LOCALES) {
    await page.goto(`${BASE_URL}/learn?locale=${locale}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    const result = await checkLocale(page, locale);
    result.route = '/learn';
    results.push(result);
  }
  return results;
}

async function testSimulationLab(page) {
  await page.goto(`${BASE_URL}/sim`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const results = [];
  for (const locale of LOCALES) {
    await page.goto(`${BASE_URL}/sim?locale=${locale}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);
    const result = await checkLocale(page, locale);
    result.route = '/sim';
    results.push(result);
  }
  return results;
}

async function testStorageBlocked(page) {
  // Simulate blocked storage
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    localStorage.setItem('football-os.storage-test', 'test');
  });

  await page.evaluate(() => {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { throw new DOMException('QuotaExceededError', 'QuotaExceededError'); };
    // Store original for restoration
    (window as any).__originalSetItem = originalSetItem;
  });

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const bodyText = await page.innerText('body');
  const hasNotStored = bodyText.includes('not stored') || bodyText.includes('未存') || bodyText.includes('未儲');

  await page.evaluate(() => {
    const original = (window as any).__originalSetItem;
    if (original) localStorage.setItem = original;
  });

  return { storageBlocked: hasNotStored };
}

test.describe('Three-locale browser walk', () => {
  test.setTimeout(300000);
  test('all routes in three locales', async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const allResults = [];

    // Test all routes
    for (const route of routes) {
      console.log(`Walking ${route}...`);
      const results = await walkRoutes(page, route);
      allResults.push(...results);
    }

    // Test special populated states
    console.log('Testing Manager OS (populated)...');
    allResults.push(...await testCareerState(page));

    console.log('Testing Player OS...');
    allResults.push(...await testPlayerOS(page));

    console.log('Testing Learn Hub...');
    allResults.push(...await testLearnHub(page));

    console.log('Testing Simulation Lab...');
    allResults.push(...await testSimulationLab(page));

    console.log('Testing storage blocked...');
    const storageResult = await testStorageBlocked(page);
    allResults.push(storageResult);

    await browser.close();

    // Report
    console.log('\n=== BROWSER WALK REPORT ===');
    console.log(`Total results: ${allResults.length}`);
    let totalIssues = 0;
    for (let i = 0; i < allResults.length; i++) {
      const r = allResults[i];
      console.log(`[${i}] foundKeys: ${r.foundKeys?.length}, locale: ${r.locale}, route: ${r.route}, textLength: ${r.textLength}`);
      if (r.foundKeys && r.foundKeys.length > 0) {
        console.log(`⚠️  ${r.locale} ${r.route}: RAW KEYS: ${r.foundKeys.join(', ')}`);
        totalIssues += r.foundKeys.length;
      }
      if (r.placeholders && r.placeholders.length > 0) {
        console.log(`⚠️  ${r.locale} ${r.route}: UNFILLED PLACEHOLDERS: ${r.placeholders.join(', ')}`);
        totalIssues += r.placeholders.length;
      }
      if (r.badValues && r.badValues.length > 0) {
        console.log(`⚠️  ${r.locale} ${r.route}: BAD VALUES: ${r.badValues.join(', ')}`);
        totalIssues += r.badValues.length;
      }
      if (!r.foundKeys && (!r.placeholders || r.placeholders.length === 0) && (!r.badValues || r.badValues.length === 0)) {
        console.log(`✅ ${r.locale} ${r.route}: clean (${r.textLength} chars, html:lang=${r.htmlLang})`);
      }
    }

    console.log(`\nTotal issues: ${totalIssues}`);
    expect(totalIssues).toBe(0);
  });
});