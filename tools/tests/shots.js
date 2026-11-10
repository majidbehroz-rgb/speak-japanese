// shots: phone-size (390x844) screenshots for review by eye, saved to SJ_SHOTS (default /home/claude/out/shots/phase2/).
// Not a pass/fail test. Web fonts are blocked here, so the fallback fonts show.
const fs = require('fs'), path = require('path');
const { run, openPage, ownerKeys } = require('./lib');
const OUT = process.env.SJ_SHOTS || '/home/claude/out/shots/phase2';
const at = (m, d, h = 9) => new Date(2026, m - 1, d, h, 0, 0);
fs.mkdirSync(OUT, { recursive: true });

run('shots', async ({ report }) => {
  const browsers = [], saved = [];
  const open = async o => { const r = await openPage(o); browsers.push(r.browser); return r; };
  const shot = async (page, name, full = false) => { const f = path.join(OUT, name + '.png'); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: f, fullPage: full }); saved.push(name); };
  const click = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
  try {
    // 1. Today, fresh learner on Nov 14
    { const { page } = await open({ time: at(11, 14, 8), storage: { trip: '2026-12-17' } });
      await shot(page, '01-today-fresh-nov14');
      // 4-6. a learn step (gear closed, open), the countdown, the skip prompt
      await page.evaluate(() => store.set('soundOK', true)); await page.clock.pauseAt(at(11, 14, 9));
      await click(page, '#start'); await page.clock.runFor(1500);
      await shot(page, '04-learn-step-gear-closed');
      await page.evaluate(() => { const g = document.querySelector('#pl-gear'); g.open = true; g.scrollIntoView(); });
      await page.screenshot({ path: path.join(OUT, '05-learn-step-gear-open.png') }); saved.push('05-learn-step-gear-open');
      await page.evaluate(() => { document.querySelector('#pl-gear').open = false; });
      await click(page, '#pl-next'); await page.evaluate(() => document.querySelector('#pl-skipq').scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: path.join(OUT, '07-skip-prompt.png') }); saved.push('07-skip-prompt');
      await click(page, '#pl-keep');
      for (let t = 0; t < 600 && !(await page.$('#pl-auto')); t++) await page.clock.runFor(1000);
      await page.evaluate(() => document.querySelector('#pl-auto').scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: path.join(OUT, '06-next-countdown.png') }); saved.push('06-next-countdown');
      // 8. done for today (both planned sessions on a doubled Saturday)
      await page.evaluate(() => { player = null; while (current() && doneToday() < sessionsToday()) { startSession(); finishSession('ok'); player = null; } renderToday(); });
      await shot(page, '08-done-for-today');
      await click(page, '#fb-open'); await shot(page, '08b-done-feedback-open');
      // 9. Plan top, 10. Lessons week 2
      await page.evaluate(() => show('plan')); await shot(page, '09-plan-top');
      await page.evaluate(() => openWeek(1)); await shot(page, '10-lessons-week2'); }
    // 2-3. the owner's progress on Nov 10: the card, then after Continue
    const owner = ownerKeys();
    if (owner) { const { page } = await open({ time: at(11, 10, 9), storage: owner });
      await shot(page, '02-today-owner-nov10-card');
      await click(page, '#mg-cont'); await shot(page, '03-today-owner-after-continue'); }
    report.info(`saved ${saved.length} screenshots to ${OUT}: ${saved.join(', ')}`);
  } finally { for (const b of browsers) await b.close().catch(() => {}); }
}, { noBrowser: true });
