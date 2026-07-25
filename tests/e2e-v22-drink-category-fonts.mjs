import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const baseUrl = 'http://127.0.0.1:4173';
const outDir = 'analysis-test-results';
mkdirSync(outDir, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  passed: false,
  checks: [],
  errors: [],
  metrics: {},
};

const check = (name, ok, details = '') => {
  report.checks.push({ name, ok: Boolean(ok), details });
  if (!ok) throw new Error(`${name}${details ? `: ${details}` : ''}`);
};
const px = value => Number.parseFloat(String(value || '0')) || 0;
const weight = value => Number.parseInt(String(value || '0'), 10) || 0;
const iPhoneUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

async function openCashier(browser, { name, width, height, phone }) {
  const context = await browser.newContext({
    viewport: { width, height },
    screen: { width, height },
    deviceScaleFactor: phone ? 3 : 1,
    isMobile: phone,
    hasTouch: phone,
    userAgent: phone ? iPhoneUa : undefined,
    serviceWorkers: 'allow',
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(`${name}: ${String(error)}`));
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push(`${name} console: ${message.text()}`);
  });
  await page.goto(`${baseUrl}/?test=v22-${name}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#staffGrid .staff-card').first().waitFor({ timeout: 20000 });
  const amir = page.locator('#staffGrid .staff-card').filter({ hasText: 'Amir' }).first();
  if (await amir.count()) await amir.click();
  else await page.locator('#staffGrid .staff-card').first().click();
  await page.locator('#app:not(.hidden)').waitFor({ timeout: 15000 });
  await page.locator('.table-button').filter({ hasText: /^K3$/ }).first().click();
  await page.locator('#orderContent:not(.hidden)').waitFor({ timeout: 15000 });
  await page.locator('.product-tile').first().waitFor({ timeout: 15000 });
  return { context, page };
}

async function metrics(page) {
  return page.evaluate(() => {
    const css = node => node ? getComputedStyle(node) : null;
    const grid = document.querySelector('.product-grid');
    const tile = document.querySelector('.product-tile');
    const name = tile?.querySelector('strong');
    const price = tile?.querySelector('span');
    const category = document.querySelector('.category-button');
    const tabs = document.querySelector('.catalog-tabs');
    const floor = document.querySelector('.floor-canvas');
    return {
      columns: css(grid)?.gridTemplateColumns.split(/\s+/).filter(Boolean).length || 0,
      tileHeight: Math.round(tile?.getBoundingClientRect().height || 0),
      productFont: css(name)?.fontSize || '',
      productWeight: css(name)?.fontWeight || '',
      priceFont: css(price)?.fontSize || '',
      priceWeight: css(price)?.fontWeight || '',
      categoryFont: css(category)?.fontSize || '',
      categoryWeight: css(category)?.fontWeight || '',
      categoryLineHeight: css(category)?.lineHeight || '',
      railParent: document.querySelector('.category-rail')?.parentElement?.className || '',
      tabsDisplay: css(tabs)?.display || '',
      floorHeight: Math.round(floor?.getBoundingClientRect().height || 0),
      docWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

let browser;
try {
  browser = await chromium.launch({ headless: true });

  {
    const { context, page } = await openCashier(browser, { name: 'iphone390', width: 390, height: 844, phone: true });
    const m = await metrics(page);
    report.metrics.iphone390 = m;
    check('Smalle iPhone behoudt de oorspronkelijke twee productkolommen', m.columns === 2, `kolommen=${m.columns}`);
    check('Producttegels behouden vrijwel dezelfde hoogte', m.tileHeight >= 80 && m.tileHeight <= 90, `hoogte=${m.tileHeight}`);
    check('Dranknamen zijn duidelijk groter', px(m.productFont) >= 15, m.productFont);
    check('Dranknamen zijn extra vet', weight(m.productWeight) >= 900, m.productWeight);
    check('Prijzen zijn duidelijker leesbaar', px(m.priceFont) >= 12.5, m.priceFont);
    check('Prijzen zijn vet', weight(m.priceWeight) >= 800, m.priceWeight);
    check('Drankcategorieën zijn duidelijk groter', px(m.categoryFont) >= 12.5, m.categoryFont);
    check('Drankcategorieën zijn extra vet', weight(m.categoryWeight) >= 900, m.categoryWeight);
    check('Categorieën staan nog steeds links in order-main', m.railParent.includes('order-main'), m.railParent);
    check('Favorieten, Alle producten en Recent blijven zichtbaar', m.tabsDisplay === 'flex', m.tabsDisplay);
    check('Plattegrondhoogte is niet veranderd', m.floorHeight === 500, `hoogte=${m.floorHeight}`);
    check('Geen horizontale documentoverflow', m.scrollWidth <= m.docWidth + 2, `${m.scrollWidth}/${m.docWidth}`);

    const tile = page.locator('.product-tile').filter({ hasText: 'Aperol Spritz' }).first();
    await tile.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, Math.max(1, window.scrollY - 120)));
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => ({ y: window.scrollY, table: window.__kassaAppApi?.getSelectedTableId?.() || '' }));
    await tile.click();
    await page.locator('#ticketList .ticket-row').waitFor({ timeout: 10000 });
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({ y: window.scrollY, table: window.__kassaAppApi?.getSelectedTableId?.() || '', qty: window.__kassaAppApi?.getOrder?.('K3')?.items?.find(item => item.productId === 'p1')?.qty || 0 }));
    check('Producttik springt niet naar de kaart', Math.abs(after.y - before.y) <= 5, `${before.y}→${after.y}`);
    check('Producttik verandert de tafel niet', before.table === 'K3' && after.table === 'K3', `${before.table}→${after.table}`);
    check('Producttik voegt exact één toe', after.qty === 1, `qty=${after.qty}`);

    await page.screenshot({ path: `${outDir}/v22-drink-category-fonts-iphone390.png`, fullPage: true });
    await context.close();
  }

  {
    const { context, page } = await openCashier(browser, { name: 'iphone708', width: 708, height: 1050, phone: true });
    const m = await metrics(page);
    report.metrics.iphone708 = m;
    check('Brede iPhone behoudt de oorspronkelijke drie productkolommen', m.columns === 3, `kolommen=${m.columns}`);
    check('Brede iPhone gebruikt dezelfde grote, vette dranknamen', px(m.productFont) >= 15 && weight(m.productWeight) >= 900, `${m.productFont}/${m.productWeight}`);
    check('Brede iPhone gebruikt dezelfde grote, vette categorieën', px(m.categoryFont) >= 12.5 && weight(m.categoryWeight) >= 900, `${m.categoryFont}/${m.categoryWeight}`);
    check('Brede iPhone heeft geen horizontale overflow', m.scrollWidth <= m.docWidth + 2, `${m.scrollWidth}/${m.docWidth}`);
    await context.close();
  }

  {
    const { context, page } = await openCashier(browser, { name: 'desktop', width: 1440, height: 900, phone: false });
    const m = await metrics(page);
    report.metrics.desktop = m;
    check('Desktop behoudt vijf productkolommen', m.columns === 5, `kolommen=${m.columns}`);
    check('Desktoptypografie blijft ongewijzigd', px(m.productFont) === 10 && px(m.categoryFont) === 9, `${m.productFont}/${m.categoryFont}`);
    await context.close();
  }

  check('Geen onverwachte JavaScript-fouten', report.errors.length === 0, report.errors.join('\n'));
  report.passed = true;
} catch (error) {
  report.failure = String(error?.stack || error);
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(`${outDir}/v22-drink-category-fonts.json`, JSON.stringify(report, null, 2));
  writeFileSync(`${outDir}/v22-drink-category-fonts.md`, [
    '# Registratiekassa v22 — drank- en categorielettertypes',
    '',
    `**Resultaat: ${report.passed ? 'GESLAAGD' : 'MISLUKT'}**`,
    '',
    ...report.checks.map(item => `- ${item.ok ? '✅' : '❌'} ${item.name}${item.details ? ` — ${item.details}` : ''}`),
    '',
    report.failure ? `\n## Fout\n\n\`\`\`text\n${report.failure}\n\`\`\`` : '',
  ].join('\n'));
  if (browser) await browser.close();
}

if (!report.passed) process.exitCode = 1;
