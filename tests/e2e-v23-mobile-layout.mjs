import { chromium, devices } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const baseUrl = 'http://127.0.0.1:4173';
const outputDir = 'analysis-test-results';
mkdirSync(outputDir, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  passed: false,
  checks: [],
  browserErrors: [],
  metrics: {},
};

function check(name, ok, details = '') {
  report.checks.push({ name, ok: Boolean(ok), details: String(details ?? '') });
  if (!ok) throw new Error(`${name}${details ? `: ${details}` : ''}`);
}

async function openOrder(page) {
  await page.goto(`${baseUrl}/?test=mobile-layout-v23`, { waitUntil: 'domcontentloaded' });
  await page.locator('#staffGrid .staff-card').first().waitFor({ timeout: 20000 });
  await page.locator('#staffGrid .staff-card').first().click();
  await page.locator('#app:not(.hidden)').waitFor({ timeout: 15000 });
  const table = page.locator('.table-button').filter({ hasText: /^K3$/ }).first();
  await table.click();
  await page.locator('#orderContent:not(.hidden)').waitFor({ timeout: 15000 });
  await page.waitForFunction(() => document.documentElement.classList.contains('rk-phone-v23'), null, { timeout: 15000 });
}

let browser;
try {
  browser = await chromium.launch({ headless: true });

  const phoneContext = await browser.newContext({
    ...devices['iPhone 15 Pro'],
    viewport: { width: 402, height: 874 },
    serviceWorkers: 'allow',
  });
  const phone = await phoneContext.newPage();
  phone.on('pageerror', error => report.browserErrors.push(String(error)));
  phone.on('console', message => {
    if (message.type() === 'error') report.browserErrors.push(`console: ${message.text()}`);
  });

  await openOrder(phone);

  const metrics = await phone.evaluate(() => {
    const root = document.documentElement;
    const grid = document.querySelector('.product-grid');
    const tile = document.querySelector('.product-tile');
    const tileName = tile?.querySelector('strong');
    const tilePrice = tile?.querySelector('span');
    const categoryRail = document.querySelector('.category-rail');
    const category = document.querySelector('.category-button');
    const actionButtons = [...document.querySelectorAll('.order-head-actions > button')].filter(button => {
      const style = getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    const tabs = [...document.querySelectorAll('.catalog-tab')].filter(button => {
      const style = getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      return style.display !== 'none' && rect.width > 0 && rect.height > 0;
    });
    const gridStyle = grid ? getComputedStyle(grid) : null;
    const columns = gridStyle?.gridTemplateColumns
      ? gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length
      : 0;
    return {
      mobileVersion: root.dataset.rkMobileVersion || '',
      phoneClass: root.classList.contains('rk-phone-v23'),
      columnAttribute: root.dataset.rkPhoneColumns || '',
      columns,
      tileHeight: tile?.getBoundingClientRect().height || 0,
      tileNameFont: tileName ? getComputedStyle(tileName).fontSize : '',
      tilePriceFont: tilePrice ? getComputedStyle(tilePrice).fontSize : '',
      categoryDisplay: categoryRail ? getComputedStyle(categoryRail).display : '',
      categoryOverflowX: categoryRail ? getComputedStyle(categoryRail).overflowX : '',
      categoryFont: category ? getComputedStyle(category).fontSize : '',
      visibleActionButtons: actionButtons.map(button => button.textContent.trim()),
      visibleTabs: tabs.map(button => button.textContent.trim()),
      voiceVisible: (() => {
        const button = document.querySelector('#voiceButton');
        if (!button) return false;
        const style = getComputedStyle(button);
        const rect = button.getBoundingClientRect();
        return style.display !== 'none' && rect.width > 0 && rect.height > 0;
      })(),
      documentWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
    };
  });
  report.metrics.phone = metrics;

  check('Telefoon krijgt de v23-layout', metrics.phoneClass && metrics.mobileVersion === '23', JSON.stringify(metrics));
  check('Gangbare iPhone gebruikt vier compacte kolommen', metrics.columns === 4 && metrics.columnAttribute === '4', `kolommen=${metrics.columns}`);
  check('Productkaart blijft compact en minstens 88px hoog', metrics.tileHeight >= 88 && metrics.tileHeight < 115, metrics.tileHeight);
  check('Productnaam blijft leesbaar zonder enorme kaart', parseFloat(metrics.tileNameFont) >= 13, metrics.tileNameFont);
  check('Prijs blijft leesbaar', parseFloat(metrics.tilePriceFont) >= 11.5, metrics.tilePriceFont);
  check('Categorieën zijn een horizontale schuifstrook', metrics.categoryDisplay === 'flex' && ['auto','scroll'].includes(metrics.categoryOverflowX), `${metrics.categoryDisplay}/${metrics.categoryOverflowX}`);
  check('Alle drie kaarttabbladen zijn tegelijk zichtbaar', metrics.visibleTabs.length === 3, JSON.stringify(metrics.visibleTabs));
  check('Microfoonknop blijft zichtbaar', metrics.voiceVisible, 'voiceButton');
  check('Rekeningacties staan naast elkaar en verdwijnen niet', metrics.visibleActionButtons.length >= 3, JSON.stringify(metrics.visibleActionButtons));
  check('Geen horizontale documentoverflow', metrics.documentScrollWidth <= metrics.documentWidth + 1, `${metrics.documentScrollWidth}/${metrics.documentWidth}`);

  const firstTile = phone.locator('.product-tile').first();
  await firstTile.scrollIntoViewIfNeeded();
  await phone.waitForTimeout(120);
  const beforeScroll = await phone.evaluate(() => window.scrollY);
  await firstTile.click();
  await phone.locator('#ticketList .ticket-row').first().waitFor({ timeout: 10000 });
  await phone.waitForTimeout(180);
  const afterScroll = await phone.evaluate(() => window.scrollY);
  check('Product kan toegevoegd worden zonder terug naar de plattegrond te springen', Math.abs(afterScroll - beforeScroll) < 80, `${beforeScroll} -> ${afterScroll}`);

  const qtyBefore = await phone.locator('#ticketList .qty-button').first().textContent();
  const productContent = phone.locator('#ticketList .ticket-row > div').filter({ has: phone.locator('strong') }).first();
  await productContent.dblclick({ delay: 80 });
  await phone.waitForTimeout(250);
  const qtyAfter = await phone.locator('#ticketList .qty-button').first().textContent();
  check('Bestaande dubbele-tikfunctie blijft werken', Number.parseInt(qtyAfter) === Number.parseInt(qtyBefore) + 1, `${qtyBefore} -> ${qtyAfter}`);

  const minus = phone.locator('#ticketList .rk-minus-button').first();
  await minus.click();
  await phone.waitForTimeout(180);
  const qtyMinus = await phone.locator('#ticketList .qty-button').first().textContent();
  check('Bestaand minteken blijft exact één verminderen', Number.parseInt(qtyMinus) === Number.parseInt(qtyAfter) - 1, `${qtyAfter} -> ${qtyMinus}`);

  await phone.screenshot({ path: `${outputDir}/v23-iphone-402.png`, fullPage: true });
  await phoneContext.close();

  const smallContext = await browser.newContext({
    ...devices['iPhone SE'],
    viewport: { width: 350, height: 780 },
    serviceWorkers: 'block',
  });
  const small = await smallContext.newPage();
  await openOrder(small);
  const smallMetrics = await small.evaluate(() => {
    const grid = document.querySelector('.product-grid');
    const style = grid ? getComputedStyle(grid) : null;
    return {
      columns: style?.gridTemplateColumns?.split(' ').filter(Boolean).length || 0,
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  report.metrics.smallPhone = smallMetrics;
  check('Kleine iPhone gebruikt drie kolommen', smallMetrics.columns === 3, JSON.stringify(smallMetrics));
  check('Kleine iPhone heeft geen horizontale overflow', smallMetrics.scrollWidth <= smallMetrics.width + 1, `${smallMetrics.scrollWidth}/${smallMetrics.width}`);
  await smallContext.close();

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  const desktop = await desktopContext.newPage();
  await desktop.goto(`${baseUrl}/?test=desktop-v23`, { waitUntil: 'domcontentloaded' });
  await desktop.locator('#staffGrid .staff-card').first().waitFor({ timeout: 20000 });
  await desktop.locator('#staffGrid .staff-card').first().click();
  await desktop.locator('.table-button').filter({ hasText: /^K3$/ }).first().click();
  await desktop.locator('#orderContent:not(.hidden)').waitFor();
  const desktopMetrics = await desktop.evaluate(() => {
    const grid = document.querySelector('.product-grid');
    const style = grid ? getComputedStyle(grid) : null;
    return {
      phoneClass: document.documentElement.classList.contains('rk-phone-v23'),
      columns: style?.gridTemplateColumns?.split(' ').filter(Boolean).length || 0,
      tileHeight: document.querySelector('.product-tile')?.getBoundingClientRect().height || 0,
    };
  });
  report.metrics.desktop = desktopMetrics;
  check('Desktop krijgt de telefoonlayout niet', !desktopMetrics.phoneClass, JSON.stringify(desktopMetrics));
  check('Desktopdichtheid blijft behouden', desktopMetrics.columns >= 5, `kolommen=${desktopMetrics.columns}`);
  await desktopContext.close();

  const unexpected = report.browserErrors.filter(message => !/favicon|ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(message));
  check('Geen onverwachte JavaScript-paginafouten', unexpected.length === 0, unexpected.join('\n'));
  report.passed = true;
} catch (error) {
  report.failure = String(error?.stack || error);
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(`${outputDir}/v23-report.json`, JSON.stringify(report, null, 2));
  const lines = [
    '# Registratiekassa v23 — mobiele layouttest',
    '',
    `**Resultaat: ${report.passed ? 'GESLAAGD' : 'MISLUKT'}**`,
    '',
    ...report.checks.map(item => `- ${item.ok ? '✅' : '❌'} ${item.name}${item.details ? ` — ${item.details}` : ''}`),
    '',
    report.failure ? `## Fout\n\n\`\`\`\n${report.failure}\n\`\`\`` : '',
  ];
  writeFileSync(`${outputDir}/v23-report.md`, lines.join('\n'));
  await browser?.close();
  if (!report.passed) process.exitCode = 1;
}
