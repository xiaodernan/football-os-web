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

  // M227 checks: html:lang matches locale, html.class has theme
  const localeToLang: Record<string, string> = { 'en-US': 'en', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW' };
  const expectedLang = localeToLang[locale] || locale;
  const langOk = htmlLang === expectedLang;
  const hasThemeClass = htmlClass && (htmlClass.includes('light') || htmlClass.includes('dark'));

  return {
    locale,
    route: page.url(),
    htmlLang,
    htmlClass,
    textLength: bodyText.length,
    foundKeys: [...new Set(foundKeys)],
    placeholders: [...new Set(placeholders)],
    badValues,
    langOk,
    hasThemeClass,
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

async function testThemePersistence(page) {
  // Test that theme changes persist across reloads (effect-side persist)
  await page.goto(`${BASE_URL}?locale=en-US`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Get initial theme
  const initialClass = await page.getAttribute('html', 'class');
  const initialTheme = initialClass?.includes('dark') ? 'dark' : 'light';

  // Toggle theme via the theme toggle button
  const themeToggle = page.locator('button[aria-label*="theme" i], button[aria-label*="主题" i], button:has-text("Toggle theme"), button:has-text("切换主题"), [data-testid="theme-toggle"]').first();
  if (await themeToggle.count()) {
    await themeToggle.click();
    await page.waitForTimeout(300);
  } else {
    // Try clicking any button that might toggle theme
    const toggles = page.locator('button:has(svg.lucide-sun), button:has(svg.lucide-moon), button[title*="theme" i], button[title*="主题" i]');
    if (await toggles.count()) {
      await toggles.first().click();
      await page.waitForTimeout(300);
    }
  }

  const afterToggleClass = await page.getAttribute('html', 'class');
  const afterToggleTheme = afterToggleClass?.includes('dark') ? 'dark' : 'light';

  // Reload page
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const afterReloadClass = await page.getAttribute('html', 'class');
  const afterReloadTheme = afterReloadClass?.includes('dark') ? 'dark' : 'light';

  // Theme should persist after reload
  const persisted = afterToggleTheme === afterReloadTheme;

  return {
    initialTheme,
    afterToggleTheme,
    afterReloadTheme,
    persisted,
  };
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

    console.log('Testing theme persistence (M227 effect-side persist)...');
    const themeResult = await testThemePersistence(page);
    allResults.push(themeResult);

    await browser.close();

    // Report
    console.log('\n=== BROWSER WALK REPORT ===');
    console.log(`Total results: ${allResults.length}`);
    let totalIssues = 0;
    let langIssues = 0;
    let themeIssues = 0;
    for (let i = 0; i < allResults.length; i++) {
      const r = allResults[i];
      console.log(`[${i}] foundKeys: ${r.foundKeys?.length}, locale: ${r.locale}, route: ${r.route}, textLength: ${r.textLength}, langOk: ${r.langOk}, themeClass: ${r.hasThemeClass}`);
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
      if (r.langOk === false) {
        console.log(`⚠️  ${r.locale} ${r.route}: HTML LANG MISMATCH (got ${r.htmlLang})`);
        langIssues++;
      }
      if (r.hasThemeClass === false && r.route !== undefined) {
        console.log(`⚠️  ${r.locale} ${r.route}: NO THEME CLASS (class="${r.htmlClass}")`);
        themeIssues++;
      }
      if (!r.foundKeys && (!r.placeholders || r.placeholders.length === 0) && (!r.badValues || r.badValues.length === 0)) {
        console.log(`✅ ${r.locale} ${r.route}: clean (${r.textLength} chars, html:lang=${r.htmlLang}, theme=${r.hasThemeClass ? 'yes' : 'no'})`);
      }
    }

    // Theme persistence result
    const themePersistResult = allResults.find(r => r.persisted !== undefined);
    if (themePersistResult) {
      if (themePersistResult.persisted) {
        console.log(`✅ M227 theme persistence: ${themePersistResult.initialTheme} → ${themePersistResult.afterToggleTheme} → ${themePersistResult.afterReloadTheme} (persisted)`);
      } else {
        console.log(`⚠️  M227 theme persistence FAILED: ${themePersistResult.initialTheme} → ${themePersistResult.afterToggleTheme} → ${themePersistResult.afterReloadTheme} (NOT persisted)`);
        totalIssues++;
      }
    }

    console.log(`\nTotal issues: ${totalIssues} (raw keys: ${totalIssues - langIssues - themeIssues}, lang: ${langIssues}, theme: ${themeIssues})`);
    expect(totalIssues).toBe(0);
  });
});