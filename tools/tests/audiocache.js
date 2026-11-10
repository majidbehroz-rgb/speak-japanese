// audiocache: recordings appended later must reach a phone that holds an old copy of a sprite.
//  (1) w1.mp3 first arrives cut short (an old cached copy): the app sees it is shorter than the index needs, fetches it once more
//      bypassing the cache (Cache-Control: no-cache), and the last clip of the file then plays.
//  (2) if the copy stays short, that clip falls back to text-to-speech and nothing breaks.
//  Also: audio/index.json is fetched with revalidation (Cache-Control: no-cache).
const fs = require('fs'), path = require('path');
const { run, openPage, REPO } = require('./lib');

run('audiocache', async ({ report }) => {
  const full = fs.readFileSync(path.join(REPO, 'audio', 'w1.mp3')), meta = JSON.parse(fs.readFileSync(path.join(REPO, 'audio', 'index.json'), 'utf8'));
  const last = Object.entries(meta.clips).filter(([, c]) => c[0] === 'w1.mp3').sort((a, b) => b[1][1] - a[1][1])[0][0];
  for (const mode of ['refetch', 'stays-short']) {
    // the page's fetch() calls are logged with their cache mode (the browser does not show that mode as a request header)
    const { browser, page, errors } = await openPage({ initScript: { fn: () => { const f = window.fetch; window.__fetches = []; window.fetch = function (u, o) { window.__fetches.push(String(u) + ' ' + ((o && o.cache) || 'default')); return f.apply(this, arguments); }; } } });
    const seen = [];
    await page.route(/\/audio\/(w1\.mp3|index\.json)/, async route => { const req = route.request(), h = await req.allHeaders(), cc = ((h['cache-control'] || '') + (h['pragma'] || '') + (/[?&]r=/.test(req.url()) ? ' bust' : '')).toLowerCase();
      if (/index\.json/.test(req.url())) { seen.push('index:' + (cc || 'none')); return route.continue(); }
      seen.push('w1:' + (cc || 'none'));
      const body = mode === 'refetch' && seen.filter(x => x.startsWith('w1:')).length > 1 ? full : full.subarray(0, Math.floor(full.length / 2));
      return route.fulfill({ status: 200, contentType: 'audio/mpeg', body }); });
    try {
      const r = await page.evaluate(async k => { AX.p = null; AX.files = {}; AX.urls = {}; AX.short = {}; await audioIndex(); window.__ttsLog = [];
        const res = await playClip(k); await voice({ key: k, text: 'テスト', lang: 'ja' }); return { res, short: AX.short['w1.mp3'] || 0, len: AX.files['w1.mp3'].byteLength, tts: (window.__ttsLog || []).length, fetches: window.__fetches.filter(x => /audio\//.test(x)) }; }, last);
      const w1 = r.fetches.filter(x => /w1\.mp3/.test(x)).map(x => x.split(' ')[1]), idx = r.fetches.filter(x => /index\.json/.test(x)).map(x => x.split(' ')[1]);
      if (mode === 'refetch') {
        if (w1.length === 2 && w1[1] === 'reload' && r.res === 'ok' && r.len === full.length && !r.tts) report.info(`old copy refetched once (${w1.join(', ')}); ${last} played`);
        else report.fail(`refetch: requests ${w1.join(', ')}, play ${r.res}, length ${r.len}/${full.length}, tts ${r.tts}`);
      } else {
        if (r.res === 'fail' && r.short && r.tts === 1) report.info(`copy stays short (${r.len} bytes): ${last} fell back to text-to-speech`);
        else report.fail(`stays short: play ${r.res}, short ${r.short}, tts ${r.tts}`);
      }
      if (idx[0] !== 'no-cache') report.fail('index.json not revalidated: ' + idx.join(', ')); else if (mode === 'refetch') report.info('index.json fetched with cache "no-cache" (revalidated)');
      if (errors.length) report.fail('page errors: ' + errors.join(' | '));
    } finally { await browser.close(); }
  }
}, { noBrowser: true });
