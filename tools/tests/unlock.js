// unlock: real audio, real time (no stubbed <audio>, no fake clock; a few seconds). The first tap plays the silent unlock clip, then the
// first lesson clips play one after another. Asserts that no audio "error" event fires, and that "ended" fires for the unlock and for
// each clip, with each clip's playing time close to its length in audio/index.json.
const { run, openPage } = require('./lib');

run('unlock', async ({ report }) => {
  const { browser, page, errors } = await openPage({ fakeAudio: false });
  try {
    await page.evaluate(async () => { await audioIndex(); const a = audioEl(); window.__ev = [];
      ['error', 'ended', 'playing'].forEach(t => a.addEventListener(t, () => window.__ev.push({ t, src: a.dataset.clip || 'unlock', at: performance.now(), code: a.error && a.error.code }))); });
    await page.mouse.click(5, 5);   // the first tap: unlocks
    await page.waitForFunction(() => (window.__ev || []).some(e => e.t === 'ended' || e.t === 'error'), null, { timeout: 5000 }).catch(() => {});
    const keys = ['j:Konnichiwa', 'e:Thank you', 'w:hai'].filter(k => k);
    const res = await page.evaluate(async keys => { const out = []; for (const k of keys) { if (!clipOf(k)) { out.push({ k, missing: true }); continue; } const t0 = performance.now(); const r = await playClip(k); out.push({ k, r, ms: Math.round(performance.now() - t0), want: Math.round(clipSec(k) * 1000) }); } return out; }, keys);
    const ev = await page.evaluate(() => window.__ev);
    const errs = ev.filter(e => e.t === 'error');
    if (errs.length) errs.forEach(e => report.fail(`audio error (code ${e.code}) while playing ${e.src}`)); else report.info('no audio error events');
    if (ev.some(e => e.t === 'ended' && e.src === 'unlock')) report.info('unlock clip: ended'); else report.fail('unlock clip did not end');
    res.forEach(r => { if (r.missing) return report.info(`${r.k}: not in the index (skipped)`);
      const ended = ev.some(e => e.t === 'ended' && e.src === r.k);
      if (r.r !== 'ok' || !ended) report.fail(`${r.k}: ${r.r}, ended ${ended}`); else report.info(`${r.k}: ended after ${r.ms} ms (clip ${r.want} ms)`);
      if (r.r === 'ok' && (r.ms < r.want * 0.8 || r.ms > r.want + 1200)) report.fail(`${r.k}: played ${r.ms} ms for a ${r.want} ms clip`); });
    if (errors.length) report.fail('page errors: ' + errors.join(' | '));
  } finally { await browser.close(); }
}, { noBrowser: true });
