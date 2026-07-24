import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
loadEnv(join(here, '.env'));

const PORT = clampInt(process.env.PORT, 8765, 1, 65535);
const HOST = '127.0.0.1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const ALLOWED_ORIGINS = new Set((process.env.ALLOWED_ORIGINS || 'https://amirferjani.github.io,http://127.0.0.1:8765,http://localhost:8765')
  .split(',').map(value => value.trim()).filter(Boolean));
const buckets = new Map();

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

function clampInt(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin) return {'Access-Control-Allow-Origin':'*'};
  if (!ALLOWED_ORIGINS.has(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Accept',
    'Access-Control-Max-Age': '86400'
  };
}

function json(res, status, body, extraHeaders = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type':'application/json; charset=utf-8',
    'Content-Length':Buffer.byteLength(data),
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    ...extraHeaders
  });
  res.end(data);
}

async function readJson(req, maxBytes = 256_000) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) throw Object.assign(new Error('Aanvraag is te groot.'), {status:413});
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw Object.assign(new Error('Ongeldige JSON.'), {status:400}); }
}

function rateLimit(req) {
  const key = req.headers['tailscale-user-login'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt > 60_000) {
    buckets.set(key, {startedAt:now, count:1});
    return true;
  }
  current.count += 1;
  return current.count <= 60;
}

function normalizeProducts(rawProducts) {
  if (!Array.isArray(rawProducts)) return [];
  return rawProducts.slice(0, 250).map(product => ({
    id: String(product?.id || '').slice(0, 80),
    name: String(product?.name || '').slice(0, 120),
    aliases: Array.isArray(product?.aliases) ? product.aliases.slice(0, 20).map(alias => String(alias).slice(0, 80)) : []
  })).filter(product => product.id && product.name);
}

function extractResponseText(response) {
  if (typeof response?.output_text === 'string') return response.output_text;
  const texts = [];
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') texts.push(content.text);
    }
  }
  return texts.join('\n');
}

function parseModelJson(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed?.actions) ? parsed.actions : [];
}

function validateActions(rawActions, products) {
  const validIds = new Set(products.map(product => product.id));
  const actions = [];
  for (const action of rawActions.slice(0, 40)) {
    const type = action?.type === 'remove' ? 'remove' : action?.type === 'add' ? 'add' : null;
    const productId = String(action?.productId || '');
    if (!type || !validIds.has(productId)) continue;
    actions.push({type, productId, qty:clampInt(action?.qty, 1, 1, 25)});
  }
  return actions;
}

async function parseOrderWithOpenAI(transcript, products) {
  if (!OPENAI_API_KEY) throw Object.assign(new Error('OPENAI_API_KEY ontbreekt op de server.'), {status:503});
  const catalog = products.map(product => `${product.id}: ${product.name} [${product.aliases.join(', ')}]`).join('\n');
  const instructions = `Je bent de orderparser van een Belgische horecakassa. Zet uitsluitend het gesproken Nederlands om naar veilige orderacties.\n\nRegels:\n- Gebruik alleen productId-waarden uit de catalogus.\n- Herken aantallen als cijfers of Nederlandse woorden.\n- Standaard aantal is 1.\n- Woorden zoals verwijder, haal weg, geen of wis betekenen type remove.\n- Bij een correctie zoals "nee, ik bedoel X" geldt alleen het gecorrigeerde deel.\n- Verzin nooit producten.\n- Geef uitsluitend compacte geldige JSON terug in deze vorm: {"actions":[{"type":"add","productId":"cola","qty":2}]}.\n- Als niets zeker herkend is: {"actions":[]}.\n\nCATALOGUS:\n${catalog}`;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method:'POST',
    headers:{
      'Authorization':`Bearer ${OPENAI_API_KEY}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      model:OPENAI_MODEL,
      instructions,
      input:transcript,
      max_output_tokens:500
    }),
    signal:AbortSignal.timeout(25_000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI antwoordde met HTTP ${response.status}.`;
    throw Object.assign(new Error(message), {status:502});
  }
  const text = extractResponseText(payload);
  if (!text) throw Object.assign(new Error('AI gaf geen tekstuitvoer.'), {status:502});
  try { return validateActions(parseModelJson(text), products); }
  catch { throw Object.assign(new Error('AI gaf geen geldige order-JSON.'), {status:502}); }
}

const server = http.createServer(async (req, res) => {
  const cors = corsHeaders(req);
  if (!cors) return json(res, 403, {error:'Deze website-origin is niet toegestaan.'});
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }
  if (!rateLimit(req)) return json(res, 429, {error:'Te veel aanvragen; probeer zo meteen opnieuw.'}, cors);
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, {
      ok:true,
      service:'Registratiekassa AI',
      model:OPENAI_MODEL,
      aiConfigured:Boolean(OPENAI_API_KEY),
      tailscaleUser:req.headers['tailscale-user-login'] || null
    }, cors);
  }

  if (req.method === 'POST' && url.pathname === '/api/voice/parse') {
    try {
      const body = await readJson(req);
      const transcript = String(body?.transcript || '').trim().slice(0, 2000);
      const products = normalizeProducts(body?.products);
      if (!transcript) return json(res, 400, {error:'Transcript ontbreekt.'}, cors);
      if (!products.length) return json(res, 400, {error:'Productcatalogus ontbreekt.'}, cors);
      const actions = await parseOrderWithOpenAI(transcript, products);
      return json(res, 200, {actions, model:OPENAI_MODEL}, cors);
    } catch (error) {
      console.error(new Date().toISOString(), error);
      return json(res, error.status || 500, {error:error.message || 'Onbekende serverfout.'}, cors);
    }
  }

  return json(res, 404, {error:'Niet gevonden.'}, cors);
});

server.listen(PORT, HOST, () => {
  console.log(`Registratiekassa AI luistert op http://${HOST}:${PORT}`);
  console.log(`Model: ${OPENAI_MODEL} · API-sleutel: ${OPENAI_API_KEY ? 'ingesteld' : 'ontbreekt'}`);
});

for (const signal of ['SIGINT','SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
