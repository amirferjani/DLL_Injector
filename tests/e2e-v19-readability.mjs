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

const px = value => Number.parseFloat(String(value || '0')) || 0;
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
  page.on('pageerror', error => report.browserErrors.push(`${name}: ${String(error)}`));
  page.on('console', message => {
    if (message.type() === 'error') report.browserErrors.push(`${name} console: ${message.text()}`);
  });
  await page.goto(`${baseUrl}/?test=readability-v19-${name}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#staffGrid .staff-card').first().waitFor({ timeout: 20000 });
  if (phone) await page.waitForFunction(() => document.documentElement.classList.contains('rk-phone'), null, { timeout: 15000 });
  await page.locator('#staffGrid .staff-card').filter({ hasText: 'Amir' }).first().click();
  await page.locator('#app:not(.hidden)').waitFor({ timeout: 15000 });
  const table = page.locator('.table-button').filter({ hasText: /^K3$/ }).first();
  await table.click();
  await page.locator('#orderContent:not(.hidden)').waitFor();
  await page.locator('.product-tile').first().waitFor();
  return { context, page };
}

async function phoneMetrics(page) {
  return page.evaluate(() => {
    const grid = document.querySelector('.product-grid');
    const tile = document.querySelector('.product-tile');
    const tileName = tile?.querySelector('strong');
    const tilePrice = tile?.querySelector('span');
    const categoryRail = document.querySelector('.category-rail');
    const category = document.querySelector('.category-button');
    const search = document.querySelector('.product-search input');
    const view = document.querySelector('.view-switch');
    const orderAction = document.querySelector('.order-head-actions .soft-button');
    const styles = node => node ? getComputedStyle(node) : null;
    const columns = styles(grid)?.gridTemplateColumns.split(/\s+/).filter(Boolean).length || 0;
    return {
      device: document.documentElement.dataset.rkDevice || '',
      columns,
      tileHeight: tile?.getBoundingClientRect().height || 0,
      tileNameFont: styles(tileName)?.fontSize || '0px',
      tilePriceFont: styles(tilePrice)?.fontSize || '0px',
      categoryDisplay: styles(categoryRail)?.display || '',
      categoryOverflowX: styles(categoryRail)?.overflowX || '',
      categoryFont: styles(category)?.fontSize || '0px',
      searchFont: styles(search)?.fontSize || '0px',
      viewFont: styles(view)?.fontSize || '0px',
      orderActionFont: styles(orderAction)?.fontSize || '0px',
      documentWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
    };
  });
}

let browser;
try {
  browser = await chromium.launch({ headless: true });

  {
    const { context, page } = await openCashier(browser, { name: 'iphone390', width: 390, height: 844, phone: true });
    const metrics = await phoneMetrics(page);
    report.metrics.iphone390 = metrics;
    check('iPhone wordt onafhankelijk van de layoutviewport als telefoon herkend', metrics.device === 'phone', metrics.device);
    check('390px iPhone gebruikt drie leesbare productkolommen', metrics.columns === 3, `kolommen=${metrics.columns}`);
    check('Productnaam is primair en minstens 13px', px(metrics.tileNameFont) >= 13, metrics.tileNameFont);
    check('Productprijs is minstens 11.5px', px(metrics.tilePriceFont) >= 11.5, metrics.tilePriceFont);
    check('Producttegel is minstens 90px hoog', metrics.tileHeight >= 90, `${metrics.tileHeight}`);
    check('Categorieën zijn horizontale knoppen', metrics.categoryDisplay === 'flex' && ['auto','scroll'].includes(metrics.categoryOverflowX), `${metrics.categoryDisplay}/${metrics.categoryOverflowX}`);
    check('Categorietekst is minstens 12px', px(metrics.categoryFont) >= 12, metrics.categoryFont);
    check('Zoekveld is minstens 13px', px(metrics.searchFont) >= 13, metrics.searchFont);
    check('Belangrijke weergaveknoppen zijn minstens 13px', px(metrics.viewFont) >= 13, metrics.viewFont);
    check('Rekeningacties zijn minstens 12px', px(metrics.orderActionFont) >= 12, metrics.orderActionFont);
    check('Telefoonpagina heeft geen horizontale documentoverflow', metrics.documentScrollWidth <= metrics.documentWidth + 2, `${metrics.documentScrollWidth}/${metrics.documentWidth}`);

    await page.locator('.product-tile').filter({ hasText: 'Aperol Spritz' }).first().click({ force: true });
    await page.locator('#ticketList .ticket-row').waitFor();
    const ticket = await page.evaluate(() => {
      const row = document.querySelector('#ticketList .ticket-row');
      const primary = row?.querySelector('strong');
      const secondary = row?.querySelector('small');
      const minus = row?.querySelector('.rk-minus-button');
      const checkout = document.querySelector('.checkout-button strong');
      const cs = node => node ? getComputedStyle(node) : null;
      return {
        primary: cs(primary)?.fontSize || '0px',
        secondary: cs(secondary)?.fontSize || '0px',
        minusSize: minus?.getBoundingClientRect().width || 0,
        checkout: cs(checkout)?.fontSize || '0px',
      };
    });
    report.metrics.ticket = ticket;
    check('Bestellingsregel heeft minstens 14px hoofdtekst', px(ticket.primary) >= 14, ticket.primary);
    check('Bestellingsregel heeft minstens 10px statustekst', px(ticket.secondary) >= 10, ticket.secondary);
    check('Minbediening blijft een grote aanraakknop', ticket.minusSize >= 40, `${ticket.minusSize}`);
    check('Bestelknop blijft duidelijk leesbaar', px(ticket.checkout) >= 16, ticket.checkout);
    await page.screenshot({ path: `${outDir}/v19-iphone-390.png`, fullPage: true });
    await context.close();
  }

  {
    const { context, page } = await openCashier(browser, { name: 'iphone708', width: 708, height: 1050, phone: true });
    const metrics = await phoneMetrics(page);
    report.metrics.iphone708 = metrics;
    check('Brede iPhone-layout blijft als telefoon geclassificeerd', metrics.device === 'phone', metrics.device);
    check('Brede iPhone gebruikt maximaal vier en nooit zes productkolommen', metrics.columns === 4, `kolommen=${metrics.columns}`);
    check('Brede iPhone houdt dezelfde leesbare producttekst', px(metrics.tileNameFont) >= 13, metrics.tileNameFont);
    check('Brede iPhone heeft geen horizontale documentoverflow', metrics.documentScrollWidth <= metrics.documentWidth + 2, `${metrics.documentScrollWidth}/${metrics.documentWidth}`);
    await page.screenshot({ path: `${outDir}/v19-iphone-708.png`, fullPage: true });
    await context.close();
  }

  {
    const { context, page } = await openCashier(browser, { name: 'desktop', width: 1440, height: 900, phone: false });
    const metrics = await phoneMetrics(page);
    report.metrics.desktop = metrics;
    check('Desktop krijgt de telefoonklasse niet', metrics.device === 'desktop', metrics.device);
    check('Desktopdichtheid blijft behouden en wordt niet globaal vergroot', metrics.columns === 5, `kolommen=${metrics.columns}`);
    await context.close();
  }

  check('Geen onverwachte JavaScript-paginafouten', report.browserErrors.length === 0, report.browserErrors.join('\n'));
  report.passed = true;
} catch (error) {
  report.failure = String(error?.stack || error);
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(`${outDir}/v19-report.json`, JSON.stringify(report, null, 2));
  writeFileSync(`${outDir}/v19-report.md`, [
    '# Registratiekassa v19 — mobiele leesbaarheid',
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
