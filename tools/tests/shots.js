// shots: phone-size (390x844) screenshots for review by eye, saved to SJ_SHOTS (default /home/claude/out/shots/phase4/).
// Not a pass/fail test. Progress is set up directly (review records for everything before a session, the plan pointer at it).
// Web fonts are blocked here, so the fallback fonts show; audio is the test stand-in (clip lengths only).
const fs = require('fs'), path = require('path');
const { run, openPage } = require('./lib');
const OUT = process.env.SJ_SHOTS || '/home/claude/out/shots/phase4';
fs.mkdirSync(OUT, { recursive: true });

run('shots', async ({ report }) => {
  const saved = [];
  const { browser, page } = await openPage({ time: new Date(2026, 10, 20, 8), storage: { trip: '2026-12-17', autoNext: true, soundOK: true } });
  const shot = async (name, sel) => { await page.evaluate(s => { const e = s && document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0); }, sel || null); await page.screenshot({ path: path.join(OUT, name + '.png') }); saved.push(name); };
  const until = async (fn, step = 250, max = 2400) => { for (let i = 0; i < max; i++) { if (await page.evaluate(fn)) return true; await page.clock.runFor(step); } return false; };
  // learned = review records for every learning session before course index `upTo`; the plan points at it
  const setTo = (w, d, demo) => page.evaluate(({ w, d, demo }) => { const q = courseOrder(), i = q.findIndex(s => s.w === w && s.d === d); localStorage.clear(); Object.keys(mem).forEach(k => delete mem[k]);
    store.set('trip', '2026-12-17'); store.set('soundOK', true); if (demo) store.set('numDemo', true);
    q.slice(0, i).filter(isLearnDay).forEach(s => srsLearn(sessionItems(s.w, s.d), '2026-11-14'));
    PLAN = newPlan(i, {}); savePlan(); player = null; show('today'); }, { w, d, demo });
  try {
    await page.clock.pauseAt(new Date(2026, 10, 20, 9));
    // Today, week 2 day 3, with its "New today" line
    await setTo(1, 2); await shot('01-today-week2-day3');
    // a number word being taught (week 2 day 1: ichi, ni, san)
    await setTo(1, 0); await page.evaluate(() => startSession());
    if (await until(() => /New word|Listen: the meaning, then the word/.test((document.querySelector('#ln-stage .phase') || {}).textContent || '') && /ichi|ni|san/.test((document.querySelector('#ln-stage .ro') || {}).textContent || ''))) await shot('02-number-word-taught', '#ln-stage');
    else if (await until(() => /ichi|ni\b|san/.test((document.querySelector('#ln-stage') || {}).textContent || ''))) await shot('02-number-word-taught', '#ln-stage');
    await page.evaluate(() => { player = null; });
    // numbers drill in week 2 (only 1–5 known), revealed
    await setTo(1, 6); await page.evaluate(() => openWeek(1)); await page.evaluate(() => { const b = document.querySelector('#dr-rev'); if (b) b.click(); });
    await shot('03-numbers-drill-week2', '#drill');
    // the first-time demonstration (all of 1–10 known, end of week 3)
    await setTo(2, 6); await page.evaluate(() => openWeek(1)); await page.clock.runFor(500);
    if (await until(() => !!document.querySelector('#dr-demo .ro'), 200, 200)) await shot('04-numbers-demonstration', '#drill');
    // week 4: the price drill and the numbers drill (now 1–99)
    await setTo(3, 6, true); await page.evaluate(() => openWeek(3)); await page.evaluate(() => { const b = document.querySelector('#dr-rev'); if (b) b.click(); });
    await shot('05-price-drill-week4', '#drill');
    await page.evaluate(() => openWeek(1)); await page.evaluate(() => { const b = document.querySelector('#dr-rev'); if (b) b.click(); });
    await shot('06-numbers-drill-week4', '#drill');
    report.info(`saved ${saved.length} screenshots to ${OUT}: ${saved.join(', ')}`);
  } finally { await browser.close(); }
}, { noBrowser: true });
