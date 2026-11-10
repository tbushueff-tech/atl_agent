// No listening server and no external requests: serve repository files in
// Playwright routes and exercise the same page used by GitHub Pages.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { inflateSync } from 'node:zlib';
import { createPrivateKey, createPublicKey, verify } from 'node:crypto';
import { chromium } from 'playwright';
import { PRIVATE_KEY_STR } from '../src/private-key.js';
import { serializeForSignature } from '../src/properties.js';
import { javaUtf8 } from '../src/java-utf8.js';

const liveUrl = process.env.ATL_LIVE_URL;
const origin = liveUrl ? new URL(liveUrl).origin : 'http://127.0.0.1:8099';
const root = fileURLToPath(new URL('../', import.meta.url));
const publicKey = createPublicKey(createPrivateKey({ key: Buffer.from(PRIVATE_KEY_STR, 'base64'), type: 'pkcs8', format: 'der' }));
const browser = await chromium.launch({ headless: true, ...(process.env.ATL_BROWSER_CHANNEL ? { channel: process.env.ATL_BROWSER_CHANNEL } : {}) });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 }, timezoneId: 'Asia/Yekaterinburg', permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage(), errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { external.push(url.href); return route.abort(); }
    if (liveUrl) return route.continue();
    const file = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root)) return route.abort();
    try {
      await route.fulfill({ status: 200, contentType: { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' }[extname(file)] || 'application/octet-stream', body: await readFile(file) });
    } catch { await route.fulfill({ status: 404, body: 'Not found' }); }
  });
  await page.goto(liveUrl || origin);
  await page.locator('#serverId').fill('BLSA-YKF4-X270-D26O');
  await page.locator('#organisation').fill('Example organisation');
  await page.locator('#email').fill('admin@example.org');
  await page.locator('#product').fill('jira');
  await page.locator('#name').fill(' QA\\name ');
  await page.locator('#datacenter').check();
  async function generate() {
    await page.locator('#generate').click();
    await page.locator('#result').waitFor({ state: 'visible' });
    const key = await page.locator('#key').inputValue();
    const properties = await page.locator('#properties').inputValue();
    const compact = key.replace(/\s/g, ''), suffix = compact.lastIndexOf('X02');
    const encoded = compact.slice(0, suffix);
    assert.equal(parseInt(compact.slice(suffix + 3), 31), encoded.length);
    const bytes = Buffer.from(encoded, 'base64'), size = bytes.readUInt32BE();
    const payload = bytes.subarray(4, 4 + size), signature = bytes.subarray(4 + size);
    assert.equal(verify('sha1', payload, publicKey, signature), true);
    assert.equal(inflateSync(payload.subarray(5)).toString('utf8'), properties);
    const data = new Map(properties.split('\n').slice(1).map(line => {
      const separator = line.indexOf('='); return [line.slice(0, separator), line.slice(separator + 1)];
    }));
    assert.equal(verify('sha1', javaUtf8(serializeForSignature(data)), publicKey, Buffer.from(data.get('licenseHash'), 'base64')), true);
    return { key, properties, data };
  }
  const jira = await generate();
  assert.equal(jira.data.get('Description'), 'Unlimited license by https://zhile.io');
  assert.equal(jira.data.get('jira.DataCenter'), 'true');
  assert.equal(jira.data.get('greenhopper.active'), 'true');
  assert.equal(jira.data.get('ContactName'), ' QA\\name ');
  await page.locator('#copy').click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), jira.key);
  await page.locator('summary').click();
  if (process.env.ATL_SCREENSHOT_DIR) {
    await mkdir(process.env.ATL_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: resolve(process.env.ATL_SCREENSHOT_DIR, 'desktop.png'), fullPage: true });
  }
  await page.locator('#product').fill('com.example.plugin');
  await page.locator('#name').fill('');
  await page.locator('#datacenter').uncheck();
  const plugin = await generate();
  assert.equal(plugin.data.get('com.example.plugin.enterprise'), 'true');
  assert.equal(plugin.data.get('ContactName'), 'admin@example.org');
  assert.equal(plugin.data.has('LicenseID'), false);
  assert.equal(plugin.data.has('Subscription'), false);
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw Error('Clipboard unavailable'); }; });
  await page.locator('#copy').click();
  assert.equal(await page.locator('#copyStatus').textContent(), 'Выделено для копирования');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const panels = await page.locator('.panel').all();
  const first = await panels[0].boundingBox(), second = await panels[1].boundingBox();
  assert.ok(second.y >= first.y + first.height);
  if (process.env.ATL_SCREENSHOT_DIR) await page.screenshot({ path: resolve(process.env.ATL_SCREENSHOT_DIR, 'mobile.png'), fullPage: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(external, [], 'generation must remain entirely local');
  console.log('Browser smoke: Jira/DC, plugin, signatures, clipboard/fallback and mobile layout passed');
} finally { await browser.close(); }
