// plan: the v2 plan and its capacity, for a flight on Dec 17 2026.
//  (a) fresh learner, plan start Nov 14   (b) owner's progress opened Nov 10 / Nov 14, Continue   (c) the same, Start over
//  (d) a learner who misses 5 days mid-course   (e) the public build with no start date (skipped when the page has CFG.start)
// Asserts: never more than 2 planned a day; weekday doubles only when every weekend day is already doubled; finish on or before
// Dec 16 unless an overflow is stated; no "behind"/"missed" wording on Today or Plan; rendering Today twice changes no stored state.
// Prints the numbers for each case. Only counts and dates are printed, never the saved-progress contents.
const { run, openPage, ownerKeys, planSummary, lsSnapshot } = require('./lib');
const TRIP = '2026-12-17', LAST = '2026-12-16';
const at = (m, d, h = 9) => new Date(2026, m - 1, d, h, 0, 0);

run('plan', async ({ report }) => {
  const browsers = [];
  const open = async (o) => { const r = await openPage(o); browsers.push(r.browser); return r; };
  const check = async (name, page, errors) => {
    const s = await planSummary(page);
    report.info(`(${name}) next: ${s.next} | ${s.sessions} sessions from ${s.start} over ${s.days} days | doubled ${s.doubled.length} (weekend ${s.weekendDbl}, weekday ${s.weekdayDbl})${s.doubled.length ? ': ' + s.doubled.map(d => d.slice(5)).join(' ') : ''} | finals kept ${s.finalsKept} | finish ${s.finish} | spare ${s.spare}${s.overflow ? ' | OVERFLOW ' + s.overflow : ''} | learned ${s.learned}`);
    report.info(`(${name}) status: "${s.status}"`);
    if (s.maxDay > 2) report.fail(`(${name}) a day has ${s.maxDay} sessions planned`);
    if (s.weekdayDbl && !s.weekendsAllTwo) report.fail(`(${name}) weekday doubles while a weekend day has one session`);
    if (!s.overflow && s.finish && s.finish > LAST) report.fail(`(${name}) finishes ${s.finish}, after ${LAST}`);
    if (s.overflow && !/won't fit/.test(s.status)) report.fail(`(${name}) overflow not stated`);
    // wording on Today and Plan
    for (const tab of ['plan', 'today']) {
      const txt = await page.evaluate(t => { show(t); return document.querySelector('#v-' + t).innerText; }, tab);
      const bad = (txt.match(/\b(behind|missed|catch-up mode|buffer)\b/gi) || []);
      if (bad.length) report.fail(`(${name}) ${tab} says: ${[...new Set(bad)].join(', ')}`);
    }
    // rendering Today twice changes nothing stored
    const before = await lsSnapshot(page);
    await page.evaluate(() => { renderToday(); renderToday(); show('today'); });
    if ((await lsSnapshot(page)) !== before) report.fail(`(${name}) rendering Today changed stored state`);
    if (errors.length) report.fail(`(${name}) page errors: ${errors.join(' | ')}`);
    return s;
  };
  const owner = ownerKeys();

  // (a) fresh learner on Nov 14
  { const { page, errors } = await open({ time: at(11, 14), storage: { trip: TRIP } });
    const card = await page.$('#mg-card'); if (card) report.fail('(a) a fresh learner sees the migration card');
    const s = await check('a fresh, Nov 14', page, errors);
    if (s.start !== '2026-11-14') report.fail('(a) plan start is ' + s.start); }

  // (b)/(c) the owner's saved progress
  if (!owner) report.info('(b)/(c) skipped: no saved-progress file');
  else for (const [day, label] of [[10, 'Nov 10'], [14, 'Nov 14']]) for (const choice of ['continue', 'over']) {
    const name = `${choice === 'continue' ? 'b' : 'c'} owner ${label}, ${choice === 'continue' ? 'Continue' : 'Start over'}`;
    const { page, errors } = await open({ time: at(11, day), storage: owner });
    if (!(await page.$('#mg-card'))) { report.fail(`(${name}) no migration card`); continue; }
    if (choice === 'continue') await page.click('#mg-cont'); else { await page.click('#mg-over'); await page.click('#mg-over-yes'); }
    const s = await check(name, page, errors);
    if (s.learned !== 25) report.fail(`(${name}) learned ${s.learned}, expected 25`);
    if (choice === 'continue' && !/^Welcome back/.test(s.next)) report.fail(`(${name}) first session is not the warm-up`);
    if (choice === 'over' && !/day 1$/.test(s.next || '')) report.fail(`(${name}) does not start at week 1 day 1`);
  }

  // (d) misses 5 days mid-course: sessions as planned Nov 14..23, nothing Nov 24..28, back on Nov 29
  { const { page, errors } = await open({ time: at(11, 14), storage: { trip: TRIP } });
    for (let d = 14; d <= 23; d++) {
      await page.clock.setFixedTime(at(11, d));
      await page.evaluate(() => { let n = 0; while (current() && doneToday() < Math.max(1, sessionsToday()) && n++ < 3) { startSession(); finishSession('ok'); player = null; } });
    }
    await page.clock.setFixedTime(at(11, 29)); await page.reload(); await page.waitForFunction(() => typeof current === 'function');
    const s = await check('d missed 5 days, Nov 29', page, errors);
    if (/^Welcome back/.test(s.next)) report.fail('(d) a 5-day gap should not bring the warm-up'); }

  // (e) public build with no start date: the plan starts the day it is created
  { const { page, errors } = await open({ time: at(11, 10), storage: { trip: TRIP } });
    const hasStart = await page.evaluate(() => !!CFG.start);
    if (hasStart) report.info('(e) skipped: this build has CFG.start');
    else { const s = await check('e public, no start date, opened Nov 10', page, errors); if (s.start !== '2026-11-10') report.fail('(e) plan start is ' + s.start); } }

  for (const b of browsers) await b.close().catch(() => {});
}, { noBrowser: true });
