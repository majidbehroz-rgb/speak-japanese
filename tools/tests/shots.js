// shots: phone-size (390x844) screenshots for review by eye, saved to SJ_SHOTS (default /home/claude/out/shots/phase5/).
// Not a pass/fail test. Web fonts are blocked here, so the fallback fonts show.
const fs = require('fs'), path = require('path');
const { run, openPage, ownerKeys } = require('./lib');
const OUT = process.env.SJ_SHOTS || '/home/claude/out/shots/phase5';
fs.mkdirSync(OUT, { recursive: true });

run('shots', async ({ report }) => {
  const saved = [];
  for (const [who, storage] of [['new', { trip: '2026-12-17' }], ['owner', ownerKeys()]]) {
    if (!storage) continue;
    const { browser, page } = await openPage({ time: new Date(2026, 10, 14, 9), storage });
    const shot = async (name, sel, open) => { await page.evaluate(([s, o]) => { if (o) { const d = document.querySelector(o); if (d) d.open = true; } const e = s && document.querySelector(s); if (e) e.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0); }, [sel || null, open || null]); await page.screenshot({ path: path.join(OUT, name + '.png') }); saved.push(name); };
    try {
      if (who === 'owner') { await page.evaluate(() => { const b = document.querySelector('#mg-cont'); if (b) b.click(); }); await shot('01-today-owner-nov14-after-continue'); }
      await page.evaluate(() => showPractice('listen')); await shot(`02-listen-${who}`);
      await page.evaluate(() => showPractice('cards')); await shot(`03-cards-${who}`);
      if (who === 'owner') {
        await page.evaluate(() => show('plan')); await shot('04-plan-top');
        await page.evaluate(() => { const d = [...document.querySelectorAll('#v-plan details.fold')].find(x => /Settings/.test(x.querySelector('summary').textContent)); if (d) d.open = true; });
        await page.waitForTimeout(500); await shot('05-plan-settings-offline-line', '#offline-line');
        await page.evaluate(() => openWeek(1)); await shot('06-lessons-week2');
      }
    } finally { await browser.close(); }
  }
  report.info(`saved ${saved.length} screenshots to ${OUT}: ${saved.join(', ')}`);
}, { noBrowser: true });
