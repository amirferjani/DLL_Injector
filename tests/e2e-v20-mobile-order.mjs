import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const baseUrl = 'http://127.0.0.1:4173';
const outDir = 'analysis-test-results';
mkdirSync(outDir, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  passed: false,
  checks: [],
  browserErrors: [],
  metrics: {},
};

function check(name, ok, details = '') {
  report.checks.push({ name, ok: Boolean(ok), details });
  if (!ok) throw new Error(`${name}${details ? `: ${details}` : ''}`);
}

const iPhoneUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

async function openPhone(browser, { name, width, height }) {
  const context = await browser.newContext({
    viewport: { width, height },
    screen: { width, height },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: iPhoneUa,
    serviceWorkers: 'allow',
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.browserErrors.push(`${name}: ${String(error)}`));
  page.on('console', message => {
    if (message.type() === 'error') report.browserErrors.push(`${name} console: ${message.text()}`);
  });
  await page.goto(`${baseUrl}/?test=mobile-order-v20-${name}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#staffGrid .staff-card').first().waitFor({ timeout: 20000 });
  await page.evaluate(() => document.getElementById('bossLoginButton')?.click());
  await page.locator('#bossPinWrap:not(.hidden)').waitFor({ timeout: 10000 });
  await page.locator('#bossPin').fill('0607');
  await page.evaluate(() => document.getElementById('bossPinSubmit')?.click());
  await page.locator('#app:not(.hidden)').waitFor({ timeout: 15000 });
  await page.waitForFunction(() => document.documentElement.classList.contains('rk-order-v20'), null, { timeout: 15000 });
  const table = page.locator('.table-button').filter({ hasText: /^K3$/ }).first();
  await table.click({ force: true });
  await page.locator('#orderContent:not(.hidden)').waitFor();
  await page.locator('#categoryRail [data-rk-catalog-proxy="favorites"]').waitFor({ timeout: 10000 });
  await page.locator('#requestBillButton.rk-request-pill').waitFor({ timeout: 10000 });
  await page.locator('.order-head-actions .order-history-button').waitFor({ timeout: 10000 });
  await page.waitForFunction(() => {
    const tab = document.querySelector('.catalog-tabs .catalog-tab');
    return tab && getComputedStyle(tab).display === 'none';
  }, null, { timeout: 10000 });
  await page.locator('.product-tile').first().waitFor();
  return { context, page };
}

async function layoutMetrics(page) {
  return page.evaluate(() => {
    const cs = node => node ? getComputedStyle(node) : null;
    const grid = document.querySelector('#productGrid');
    const tile = document.querySelector('.product-tile');
    const rail = document.querySelector('#categoryRail');
    const tabs = document.querySelector('.catalog-tabs');
    const search = document.querySelector('.product-search');
    const mic = document.querySelector('#voiceButton');
    const request = document.querySelector('#requestBillButton');
    const actions = [...document.querySelectorAll('.order-head-actions > button')].filter(node => cs(node)?.display !== 'none');
    const actionTops = actions.map(node => Math.round(node.getBoundingClientRect().top));
    const checkout = [...document.querySelectorAll('.checkout-bar > button')].map(node => ({
      id: node.id,
      display: cs(node)?.display,
      width: Math.round(node.getBoundingClientRect().width),
      top: Math.round(node.getBoundingClientRect().top),
    }));
    return {
      device: document.documentElement.dataset.rkDevice || '',
      version: document.documentElement.dataset.rkOrderVersion || '',
      columns: cs(grid)?.gridTemplateColumns.split(/\s+/).filter(Boolean).length || 0,
      tileHeight: Math.round(tile?.getBoundingClientRect().height || 0),
      tileNameFont: cs(tile?.querySelector('strong'))?.fontSize || '',
      tilePriceFont: cs(tile?.querySelector('span'))?.fontSize || '',
      railParent: rail?.parentElement?.id || rail?.parentElement?.className || '',
      railBeforeSearch: Boolean(rail && tabs && rail.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING),
      railOverflowX: cs(rail)?.overflowX || '',
      proxyLabels: [...document.querySelectorAll('#categoryRail [data-rk-catalog-proxy]')].map(node => node.textContent.trim()),
      hasMore: [...document.querySelectorAll('button')].some(node => /^meer\b/i.test(node.textContent.trim())),
      hiddenOriginalTabs: [...document.querySelectorAll('.catalog-tabs .catalog-tab')].every(node => cs(node)?.display === 'none'),
      searchWidth: Math.round(search?.getBoundingClientRect().width || 0),
      tabsWidth: Math.round(tabs?.getBoundingClientRect().width || 0),
      micDisplay: cs(mic)?.display || '',
      micWidth: Math.round(mic?.getBoundingClientRect().width || 0),
      requestParent: request?.parentElement === document.querySelector('.order-head > div:first-child') ? 'title' : request?.parentElement?.className || '',
      requestDisplay: cs(request)?.display || '',
      actionCount: actions.length,
      actionTops,
      checkout,
      docWidth: document.documentElement.clientWidth,
      docScrollWidth: document.documentElement.scrollWidth,
    };
  });
}

let browser;
try {
  browser = await chromium.launch({ headless: true });

  {
    const { context, page } = await openPhone(browser, { name: 'iphone390', width: 390, height: 844 });
    const metrics = await layoutMetrics(page);
    report.metrics.iphone390 = metrics;

    check('De echte website laadt mobiele bestelweergave v20', metrics.device === 'phone' && metrics.version === '20', `${metrics.device}/${metrics.version}`);
    check('De referentie gebruikt vier productkolommen', metrics.columns === 4, `kolommen=${metrics.columns}`);
    check('Productkaarten blijven compact maar leesbaar', metrics.tileHeight >= 96 && metrics.tileHeight <= 115, `hoogte=${metrics.tileHeight}`);
    check('Productnamen blijven leesbaar', Number.parseFloat(metrics.tileNameFont) >= 12, metrics.tileNameFont);
    check('Prijzen blijven leesbaar', Number.parseFloat(metrics.tilePriceFont) >= 11, metrics.tilePriceFont);
    check('Categorieën staan vóór het zoekveld', metrics.railParent === 'orderContent' && metrics.railBeforeSearch, `${metrics.railParent}/${metrics.railBeforeSearch}`);
    check('Categorieën scrollen horizontaal', ['auto','scroll'].includes(metrics.railOverflowX), metrics.railOverflowX);
    check('Favorieten, Alles en Recent zijn in dezelfde scrollrij aanwezig', ['Favorieten','Alles','Recent'].every(label => metrics.proxyLabels.includes(label)), JSON.stringify(metrics.proxyLabels));
    check('Er bestaat geen Meer-knop', !metrics.hasMore, String(metrics.hasMore));
    check('De oude grote catalogustabknoppen zijn verborgen', metrics.hiddenOriginalTabs, String(metrics.hiddenOriginalTabs));
    check('Zoekveld vult zijn bestelrij', metrics.searchWidth >= metrics.tabsWidth * 0.9, `${metrics.searchWidth}/${metrics.tabsWidth}`);
    check('Start microfoon blijft zichtbaar', metrics.micDisplay !== 'none' && metrics.micWidth >= 115, `${metrics.micDisplay}/${metrics.micWidth}`);
    check('Rekening gevraagd blijft als aparte functie zichtbaar', metrics.requestParent === 'title' && metrics.requestDisplay !== 'none', `${metrics.requestParent}/${metrics.requestDisplay}`);
    check('Plattegrond, Verplaats en Historiek blijven als drie actiekaarten zichtbaar', metrics.actionCount === 3, `acties=${metrics.actionCount}`);
    check('De drie actiekaarten staan in één compacte rij', new Set(metrics.actionTops).size === 1, JSON.stringify(metrics.actionTops));
    check('Bestellen en betalen blijven naast elkaar zichtbaar', metrics.checkout.length === 2 && metrics.checkout.every(item => item.display !== 'none' && item.width > 0) && new Set(metrics.checkout.map(item => item.top)).size === 1, JSON.stringify(metrics.checkout));
    check('Mobiele pagina heeft geen horizontale documentoverflow', metrics.docScrollWidth <= metrics.docWidth + 2, `${metrics.docScrollWidth}/${metrics.docWidth}`);

    const tile = page.locator('.product-tile').filter({ hasText: 'Aperol Spritz' }).first();
    await tile.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const target = [...document.querySelectorAll('.product-tile')].find(node => node.textContent.includes('Aperol Spritz'));
      const absoluteTop = (target?.getBoundingClientRect().top || 0) + window.scrollY;
      window.scrollTo(0, Math.max(1, absoluteTop - 280));
    });
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => ({ y: window.scrollY, table: window.__kassaAppApi?.getSelectedTableId?.() || '' }));
    await tile.click({ force: true });
    await page.locator('#ticketList .ticket-row').waitFor();
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({ y: window.scrollY, table: window.__kassaAppApi?.getSelectedTableId?.() || '', qty: window.__kassaAppApi?.getOrder?.('K3')?.items?.find(item => item.productId === 'p1')?.qty || 0 }));
    check('Producttik springt niet meer terug naar de plattegrond', Math.abs(after.y - before.y) <= 5, `${before.y}→${after.y}`);
    check('Producttik selecteert geen andere tafel', before.table === after.table && after.table === 'K3', `${before.table}→${after.table}`);
    check('Producttik voegt het gekozen product toe', after.qty === 1, `qty=${after.qty}`);
    check('Min- en verwijderbediening blijven aanwezig', await page.locator('#ticketList .rk-minus-button').count() === 1 && await page.locator('#ticketList [data-remove]').count() === 1, 'min/x');

    await page.screenshot({ path: `${outDir}/v20-iphone-390.png`, fullPage: true });
    await context.close();
  }

  {
    const { context, page } = await openPhone(browser, { name: 'iphone354', width: 354, height: 780 });
    const metrics = await layoutMetrics(page);
    report.metrics.iphone354 = metrics;
    check('Smalle iPhone behoudt vier kolommen zoals de referentie', metrics.columns === 4, `kolommen=${metrics.columns}`);
    check('Smalle iPhone heeft geen horizontale documentoverflow', metrics.docScrollWidth <= metrics.docWidth + 2, `${metrics.docScrollWidth}/${metrics.docWidth}`);
    await page.screenshot({ path: `${outDir}/v20-iphone-354.png`, fullPage: true });
    await context.close();
  }

  check('Geen onverwachte JavaScript-paginafouten', report.browserErrors.length === 0, report.browserErrors.join('\n'));
  report.passed = true;
} catch (error) {
  report.failure = String(error?.stack || error);
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(`${outDir}/v20-report.json`, JSON.stringify(report, null, 2));
  writeFileSync(`${outDir}/v20-report.md`, [
    '# Registratiekassa v20 — echte mobiele bestelweergave',
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
