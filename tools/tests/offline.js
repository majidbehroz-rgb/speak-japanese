// offline (public build): the page, Translate and recorded lessons work without data; online, a new version always wins.
// Its own server on port 8767 serves the repo (index.html can be swapped for a changed copy). Steps: first load (the service worker
// installs), Plan → Settings → "Save for offline", go offline, reload: the page renders, Translate search finds a phrase, and a
// lesson step plays a recorded clip. Then back online with a changed index.html on the server: a reload shows the new version.
// The private build is checked too: it must not register a service worker.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { run, REPO, FAST_SPEECH, FAKE_AUDIO } = require('./lib');
const PORT = 8767, PRIVATE = process.env.SJ_PRIVATE_OUT || '/home/claude/out/japan-trainer.html';
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.mp3': 'audio/mpeg', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

run('offline', async ({ report }) => {
  let pageBody = fs.readFileSync(path.join(REPO, 'index.html'));
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); let f = u === '/' ? '/index.html' : u;
    if (f === '/index.html') { r.writeHead(200, { 'Content-Type': TYPES['.html'] }); return r.end(pageBody); }
    if (f === '/private.html') { r.writeHead(200, { 'Content-Type': TYPES['.html'] }); return r.end(fs.readFileSync(PRIVATE)); }
    fs.readFile(path.join(REPO, path.normalize(f)), (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise(res => srv.listen(PORT, '127.0.0.1', res));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(FAST_SPEECH + ';' + FAKE_AUDIO);
    const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    const base = `http://localhost:${PORT}/`;
    await page.goto(base + 'index.html');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload(); await page.waitForFunction(() => typeof current === 'function' && !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    report.info('service worker registered and controlling the page');
    // Plan → Settings → Save for offline
    await page.evaluate(() => show('plan'));
    await page.waitForFunction(() => { const b = document.querySelector('#offline-line'); return b && !b.hidden && b.textContent.trim().length > 0; }, null, { timeout: 15000 });
    const before = await page.evaluate(() => document.querySelector('#offline-line').textContent.trim());
    report.info('Settings line before: ' + before);
    if (await page.$('#off-save')) { await page.evaluate(() => document.querySelector('#off-save').click()); }
    await page.waitForFunction(() => /ready ✓/.test((document.querySelector('#offline-line') || {}).textContent || ''), null, { timeout: 60000 });
    report.info('Settings line after: ' + (await page.evaluate(() => document.querySelector('#offline-line').textContent.trim())));
    // offline
    await ctx.setOffline(true);
    await page.reload(); await page.waitForFunction(() => typeof current === 'function' && document.querySelector('#v-today').innerHTML.length > 0, null, { timeout: 15000 });
    report.info('offline reload: the page renders');
    const hits = await page.evaluate(() => { show('translate'); return tSearch('thank you').length; });
    if (hits > 0) report.info(`offline Translate: "thank you" → ${hits} results`); else report.fail('offline Translate found nothing');
    await page.evaluate(() => { show('today'); store.set('soundOK', true); startSession(); });
    await page.waitForFunction(() => (window.__clipLog || []).length > 0, null, { timeout: 15000 }).catch(() => {});
    const clips = await page.evaluate(() => ({ clips: (window.__clipLog || []).map(c => c.key).slice(0, 3), tts: (window.__ttsLog || []).length, state: AX.state }));
    if (clips.clips.length) report.info(`offline lesson played recorded clips: ${clips.clips.join(', ')} (index ${clips.state})`); else report.fail(`offline lesson played no clip (index ${clips.state}, tts ${clips.tts})`);
    // back online with a new version on the server
    await page.evaluate(() => { player = null; });
    await ctx.setOffline(false);
    pageBody = Buffer.from(String(pageBody).replace('<title>Speak Japanese</title>', '<title>Speak Japanese (new version)</title>'));
    await page.reload(); await page.waitForFunction(() => typeof current === 'function');
    const title = await page.title();
    if (/new version/.test(title)) report.info('online reload shows the new version'); else report.fail('online reload still shows the old page: ' + title);
    if (errors.length) report.fail('page errors: ' + errors.join(' | '));
    // the private build registers no service worker
    const p2 = await (await browser.newContext()).newPage();
    await p2.goto(base + 'private.html'); await p2.waitForFunction(() => typeof current === 'function');
    await p2.waitForTimeout(1500);
    const regs = await p2.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
    if (regs) report.fail('the private build registered a service worker'); else report.info('private build: no service worker');
  } finally { await browser.close(); srv.close(); }
}, { noBrowser: true });
