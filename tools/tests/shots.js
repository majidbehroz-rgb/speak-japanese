// shots: phone-size (390x844) screenshots for review by eye, saved to SJ_SHOTS (default /home/claude/out/shots/phase3/).
// Not a pass/fail test. Web fonts are blocked here, so the fallback fonts show; audio is the test stand-in (clip lengths only).
const fs = require('fs'), path = require('path');
const { run, openPage, ownerKeys } = require('./lib');
const OUT = process.env.SJ_SHOTS || '/home/claude/out/shots/phase3';
const at = (m, d, h = 9) => new Date(2026, m - 1, d, h, 0, 0);
fs.mkdirSync(OUT, { recursive: true });

run('shots', async ({ report }) => {
  const browsers = [], saved = [];
  const open = async o => { const r = await openPage(o); browsers.push(r.browser); return r; };
  const shot = async (page, name, sel) => { const f = path.join(OUT, name + '.png'); await page.evaluate(s => { const e = s && document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0); }, sel || null); await page.screenshot({ path: f }); saved.push(name); };
  const click = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
  const until = async (page, fn, arg, step = 250, max = 2400) => { for (let i = 0; i < max; i++) { if (await page.evaluate(fn, arg)) return true; await page.clock.runFor(step); } return false; };
  try {
    const { page } = await open({ time: at(11, 14, 8), storage: { trip: '2026-12-17', autoNext: true } });
    await page.clock.pauseAt(at(11, 14, 9)); await page.reload(); await until(page, () => !!document.querySelector('#start'));
    await shot(page, '01-today-learning-day');
    await click(page, '#start');
    // a pair, one member at a time (Hai / Iie, week 1 day 1)
    if (await until(page, () => /one at a time/.test((document.querySelector('#ln-stage .phase') || {}).textContent || ''))) await shot(page, '02-pair-prompt', '#ln-stage');
    await page.evaluate(() => { const g = document.querySelector('#pl-gear'); g.open = true; const h = g.querySelector('details'); if (h) h.open = true; });
    await shot(page, '03-gear-open-with-help', '#pl-gear');
    await page.evaluate(() => { document.querySelector('#pl-gear').open = false; });
    // guided Speak during the pause, then the rating with its suggestion
    if (await until(page, () => player && player.stages[player.idx].kind === 'quiz')) await page.evaluate(() => { let n = 0; while (n++ < 60 && !/All done/.test(document.querySelector('#qz').innerText)) { const o = [...document.querySelectorAll('#qz .opt:not([disabled])')]; if (o.length) o[0].click(); const nx = document.querySelector('#qz-next'); if (nx && !nx.hidden) nx.click(); } });
    if (await until(page, () => /Your turn/.test((document.querySelector('#gs-stage') || {}).textContent || ''))) await shot(page, '04-guided-speak-pause', '#gs-stage');
    if (await until(page, () => /answer|again/i.test((document.querySelector('#gs-stage p') || {}).textContent || '') && !/Your turn/.test(document.querySelector('#gs-stage p').textContent))) await shot(page, '05-guided-speak-answer', '#gs-stage');
    if (await until(page, () => player && player.stages[player.idx].kind === 'rate' && !!document.querySelector('#pl-auto'))) await shot(page, '06-rating-suggestion', '.rate');
    await until(page, () => !player);
    await shot(page, '07-done-for-today');
    // day 2: the review, during the pause and after the answer
    await page.clock.pauseAt(at(11, 15, 9)); await page.reload(); await until(page, () => !!document.querySelector('#start'));
    await click(page, '#start');
    if (await until(page, () => /Your turn/.test((document.querySelector('#rv-phase') || {}).textContent || ''))) await shot(page, '08-review-pause', '#rv-card');
    if (await until(page, () => /Answer/.test((document.querySelector('#rv-phase') || {}).textContent || ''))) await shot(page, '09-review-answer', '#rv-card');
    // the owner's warm-up review (no rating step)
    const owner = ownerKeys();
    if (owner) { const o = await open({ time: at(11, 14, 9), storage: owner });
      await click(o.page, '#mg-cont'); await shot(o.page, '10-today-owner-warmup'); }
    report.info(`saved ${saved.length} screenshots to ${OUT}: ${saved.join(', ')}`);
  } finally { for (const b of browsers) await b.close().catch(() => {}); }
}, { noBrowser: true });
