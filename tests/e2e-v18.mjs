import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const baseUrl = 'http://127.0.0.1:4173';
const fakeServer = 'https://registratiekassa-test.tailnet.ts.net';
const resultsDir = 'analysis-test-results';
mkdirSync(resultsDir, { recursive: true });

const report = {
  startedAt: new Date().toISOString(),
  passed: false,
  checks: [],
  browserErrors: [],
  expectedNetworkErrors: [],
  fakeServer: { syncCalls: 0, acceptedMutations: 0, acceptedAudits: 0, acceptedPayments: 0 },
};

const check = (name, value, details = '') => {
  if (!value) throw new Error(`${name}${details ? `: ${details}` : ''}`);
  report.checks.push({ name, ok: true, details });
};

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'allow',
  });

  await context.addInitScript(server => {
    localStorage.setItem('registratiekassa-ai-server-url', server);
    localStorage.setItem('registratiekassa-server-url', server);
  }, fakeServer);

  const revisions = new Map();
  let cursor = 0;
  let serverAvailable = true;
  await context.route(`${fakeServer}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const headers = {
      'Access-Control-Allow-Origin': baseUrl,
      'Access-Control-Allow-Credentials': 'false',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,Accept',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers, body: '' });
      return;
    }
    if (!serverAvailable) {
      await route.abort('internetdisconnected');
      return;
    }
    if (url.pathname === '/health') {
      await route.fulfill({ status: 200, headers, body: JSON.stringify({ ok: true, service: 'Registratiekassa test', database: 'sqlite-wal' }) });
      return;
    }
    if (url.pathname === '/api/session/team' || url.pathname === '/api/session/boss') {
      await route.fulfill({ status: 200, headers, body: JSON.stringify({ token: 'test-token', expiresIn: 43200 }) });
      return;
    }
    if (url.pathname === '/api/snapshot') {
      await route.fulfill({ status: 200, headers, body: JSON.stringify({ tables: [], cursor }) });
      return;
    }
    if (url.pathname === '/api/sync') {
      const body = request.postDataJSON?.() || {};
      const accepted = [];
      for (const mutation of body.mutations || []) {
        const next = (revisions.get(mutation.tableId) || 0) + 1;
        revisions.set(mutation.tableId, next);
        cursor += 1;
        accepted.push({ id: mutation.id, tableId: mutation.tableId, revision: next });
      }
      report.fakeServer.syncCalls += 1;
      report.fakeServer.acceptedMutations += accepted.length;
      report.fakeServer.acceptedAudits += (body.audits || []).length;
      report.fakeServer.acceptedPayments += (body.payments || []).length;
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({
          accepted,
          acceptedAudits: (body.audits || []).map(entry => entry.id),
          acceptedPayments: (body.payments || []).map(entry => entry.id),
          conflicts: [],
          operations: [],
          cursor,
        }),
      });
      return;
    }
    if (url.pathname === '/api/voice/parse') {
      await route.fulfill({ status: 200, headers, body: JSON.stringify({ actions: [], model: null }) });
      return;
    }
    await route.fulfill({ status: 404, headers, body: JSON.stringify({ error: 'Niet gevonden in testserver' }) });
  });

  const page = await context.newPage();
  page.on('pageerror', error => report.browserErrors.push(String(error)));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (!serverAvailable && /ERR_INTERNET_DISCONNECTED|Failed to fetch/i.test(text)) report.expectedNetworkErrors.push(text);
    else report.browserErrors.push(`console: ${text}`);
  });

  await page.goto(`${baseUrl}/?test=v18`, { waitUntil: 'domcontentloaded' });
  await page.locator('.staff-card').first().waitFor({ timeout: 20000 });
  await page.locator('#bossLoginButton').click();
  await page.locator('#bossPinWrap:not(.hidden)').waitFor();
  await page.locator('#bossPin').fill('0607');
  await page.locator('#bossPinSubmit').click();
  await page.locator('#app:not(.hidden)').waitFor({ timeout: 15000 });
  check('Baaslogin werkt', true);

  await page.waitForFunction(() => document.querySelector('#serverButton')?.dataset.connectionState === 'online', null, { timeout: 20000 });
  check('Testserver wordt als online weergegeven', true);

  const table = page.locator('.table-button[title*="Tafel K10"]').first();
  await table.click();
  await page.locator('#orderContent:not(.hidden)').waitFor();
  const product = page.locator('.product-tile').filter({ hasText: 'Aperol Spritz' }).first();
  await product.click();
  await page.locator('#ticketList .ticket-row').waitFor();
  await page.locator('#ticketList .rk-minus-button').waitFor({ timeout: 10000 });
  check('Product kan normaal toegevoegd worden', (await page.locator('#ticketList .qty-button').first().textContent())?.trim() === '1×');

  const productContent = page.locator('#ticketList [data-quick-add]').first();
  await productContent.click();
  await page.waitForTimeout(500);
  check('Eén tik opent als Baas nog steeds productgeschiedenis', await page.locator('#historyDialog').evaluate(dialog => dialog.open));
  check('Eén tik verhoogt het aantal niet', (await page.locator('#ticketList .qty-button').first().textContent())?.trim() === '1×');
  await page.locator('#historyDialog').evaluate(dialog => dialog.close());

  await page.locator('#ticketList [data-quick-add]').first().dblclick({ delay: 80 });
  await page.waitForTimeout(450);
  check('Dubbele tik verhoogt exact met één', (await page.locator('#ticketList .qty-button').first().textContent())?.trim() === '2×');
  check('Dubbele tik opent geen geschiedenis', !(await page.locator('#historyDialog').evaluate(dialog => dialog.open)));

  const actionTexts = await page.locator('#ticketList .rk-line-actions button').allTextContents();
  check('Minteken staat naast het kruis', actionTexts.length >= 2 && actionTexts[0].trim() === '−' && actionTexts[1].trim() === '×', JSON.stringify(actionTexts));
  await page.locator('#ticketList .rk-minus-button').click();
  await page.waitForTimeout(300);
  check('Minteken vermindert exact één', (await page.locator('#ticketList .qty-button').first().textContent())?.trim() === '1×');

  await page.waitForFunction(() => {
    try {
      const events = JSON.parse(localStorage.getItem('registratiekassa-audit-v3') || '[]');
      return events.some(event => event.action === 'item_add') && events.some(event => event.action === 'item_remove');
    } catch { return false; }
  }, null, { timeout: 10000 });
  check('Plus en min blijven in het append-only auditlog zichtbaar', true);

  await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 15000 });
  check('PWA-serviceworker bestuurt de pagina', true);

  serverAvailable = false;
  await context.setOffline(true);
  await page.waitForTimeout(300);
  await product.click();
  await page.waitForTimeout(700);
  check('Bediening blijft offline lokaal werken', (await page.locator('#ticketList .qty-button').first().textContent())?.trim() === '2×');

  const queuedOffline = await page.evaluate(() => window.__kassaAppApi.getSyncState().queue.length);
  check('Offline wijziging blijft in lokale synchronisatiewachtrij', queuedOffline > 0, `queue=${queuedOffline}`);

  await page.evaluate(() => window.__kassaAppApi.syncNow({ force: true, silent: true }));
  await page.waitForTimeout(500);
  const retryState = await page.evaluate(() => {
    const sync = window.__kassaAppApi.getSyncState();
    return { lastError: sync.lastError || '', nextRetryAt: Number(sync.nextRetryAt || 0), failureCount: Number(sync.failureCount || 0) };
  });
  check('Verbindingsfout krijgt backoff en blijft bewaard', retryState.failureCount > 0 && retryState.nextRetryAt > Date.now(), JSON.stringify(retryState));

  await page.waitForTimeout(700);
  await page.evaluate(() => localStorage.removeItem('registratiekassa-zoo-v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#app:not(.hidden)').waitFor({ timeout: 15000 });
  await page.locator('.table-button[title*="Tafel K10"]').first().click();
  await page.locator('#orderContent:not(.hidden)').waitFor();
  await page.locator('#ticketList .qty-button').first().waitFor();
  check('IndexedDB-veiligheidskopie herstelt bestelling bij offline reload', (await page.locator('#ticketList .qty-button').first().textContent())?.trim() === '2×');

  serverAvailable = true;
  await context.setOffline(false);
  await page.waitForFunction(() => (window.__kassaAppApi.getSyncState().queue || []).length === 0, null, { timeout: 25000 });
  await page.waitForFunction(() => document.querySelector('#serverButton')?.dataset.connectionState === 'online', null, { timeout: 15000 });
  check('Wachtrij wordt na verbindingsherstel bevestigd en geleegd', true);
  check('Fake SQLite/Tailscale-server ontving mutaties', report.fakeServer.acceptedMutations > 0, JSON.stringify(report.fakeServer));

  await page.screenshot({ path: `${resultsDir}/v18-mobile.png`, fullPage: true });
  check('Geen onverwachte JavaScript-paginafouten', report.browserErrors.length === 0, report.browserErrors.join(' | '));

  report.passed = true;
  report.finishedAt = new Date().toISOString();
  writeFileSync(`${resultsDir}/v18-report.json`, JSON.stringify(report, null, 2));
  writeFileSync(`${resultsDir}/v18-report.md`, `# Registratiekassa v18 — E2E-test\n\n**Resultaat: GESLAAGD**\n\n${report.checks.map(item => `- ✅ ${item.name}${item.details ? ` — ${item.details}` : ''}`).join('\n')}\n\nVerwachte offline netwerkfouten: ${report.expectedNetworkErrors.length}.\n\nFake server: \`${JSON.stringify(report.fakeServer)}\`\n`);
} catch (error) {
  report.passed = false;
  report.finishedAt = new Date().toISOString();
  report.failure = String(error?.stack || error);
  writeFileSync(`${resultsDir}/v18-report.json`, JSON.stringify(report, null, 2));
  writeFileSync(`${resultsDir}/v18-report.md`, `# Registratiekassa v18 — E2E-test\n\n**Resultaat: MISLUKT**\n\n\`\`\`\n${report.failure}\n\`\`\`\n`);
  throw error;
} finally {
  await browser?.close();
}
