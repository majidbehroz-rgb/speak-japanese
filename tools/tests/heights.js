// heights: page heights (px at 390 wide) of Today, Plan and Lessons for a fresh learner on Nov 14 and for the owner after Continue
// (Lessons opens on the current week). Reports only.
const { run, openPage, ownerKeys } = require('./lib');
run('heights', async ({ report }) => {
  const owner = ownerKeys();
  for (const [name, storage] of [['fresh', { trip: '2026-12-17' }], ['owner', owner]]) {
    if (!storage) continue;
    const { browser, page } = await openPage({ time: new Date(2026, 10, 14, 9), storage });
    if (name === 'owner') await page.evaluate(() => { const b = document.querySelector('#mg-cont'); if (b) b.click(); });
    const h = {};
    for (const tab of ['today', 'plan', 'lessons']) h[tab] = await page.evaluate(t => { if (t === 'lessons') openWeek(curWeek()); else show(t); return document.documentElement.scrollHeight; }, tab);
    report.info(`${name}: Today ${h.today} px · Plan ${h.plan} px · Lessons ${h.lessons} px`);
    await browser.close();
  }
}, { noBrowser: true });
