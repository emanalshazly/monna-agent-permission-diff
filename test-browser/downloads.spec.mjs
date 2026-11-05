// Browser test for issue #2: inspect real Markdown/SARIF download bytes (EN + AR UI).
// Run: npx playwright install chromium && npm run test:browser
import {test, expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CANARY = 'PUBLIC_TEST_CANARY_DO_NOT_USE';
const TYPES = {'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json'};
// Fictional settings only. No real tokens / hostnames.
const BEFORE = {permissions:{allow:['Read(./docs/**)']},mcpServers:{demo:{command:'node',args:['server.js'],env:{}}}};
const AFTER  = {permissions:{allow:['Read(./docs/**)','Bash(curl:*)']},mcpServers:{demo:{command:'node',args:['server.js'],env:{API_KEY:CANARY}}}};
const EXPECTED_RULES = ['ALLOW_ADDED'];

let server, base;
test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    try { const body = await readFile(join(ROOT, p === '/' ? 'index.html' : p));
      res.writeHead(200, {'content-type': TYPES[extname(p)] || 'text/html'}); res.end(body);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
});
test.afterAll(() => server?.close());

async function setup(page, lang) {
  await page.goto(base);
  if (lang === 'ar') { await page.click('#lang'); await expect(page.locator('html')).toHaveAttribute('dir', 'rtl'); }
  await page.fill('#before', JSON.stringify(BEFORE, null, 2));
  await page.fill('#after', JSON.stringify(AFTER, null, 2));
  await page.selectOption('#format', 'claude-settings');
  await page.click('#compare');
  await expect(page.locator('#md')).toBeEnabled();
}
async function download(page, id) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#' + id)]);
  expect(dl.suggestedFilename()).toBe(`monna-permission-diff.${id}`);
  const chunks = []; for await (const c of await dl.createReadStream()) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

for (const lang of ['en', 'ar']) {
  test(`markdown + sarif download bytes (${lang})`, async ({page}) => {
    await setup(page, lang);

    const md = await download(page, 'md');
    expect(md).toMatch(/^# MONNA Agent Permission Diff/);
    for (const r of EXPECTED_RULES) expect(md).toContain(`| ${r} |`);
    expect(md).not.toContain(CANARY);
    // copyable-text fallback must equal downloaded bytes
    expect(await page.inputValue('#exportText')).toBe(md);
    await expect(page.locator('#exportPreview')).toBeVisible();

    const raw = await download(page, 'sarif');
    expect(raw).not.toContain(CANARY);
    const s = JSON.parse(raw);
    expect(s.version).toBe('2.1.0');
    const ids = s.runs[0].results.map(r => r.ruleId);
    for (const r of EXPECTED_RULES) expect(ids).toContain(r);
    expect(s.runs[0].tool.driver.rules.map(r => r.id)).toEqual(expect.arrayContaining(EXPECTED_RULES));
    for (const r of s.runs[0].results) expect(r.locations[0].physicalLocation.region.startLine).toBeGreaterThan(0);
    expect(await page.inputValue('#exportText')).toBe(raw);
  });
}
