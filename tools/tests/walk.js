// walk: a simulated learner does one session a day from day 1, with a fake clock, clicking like a user:
// Start session, each step (answering quizzes and reviews), then rating or the weekly self-check.
// Asserts no page errors and that every session finishes (log grows by one, course position moves on).
// Options (env): SJ_WALK_DAYS=n   number of days to walk (default: until the course is complete)
//                SJ_WALK_START=YYYY-MM-DD  day 1 (default 2026-11-14)
//                SJ_WALK_HARD=n   rate every n-th session "Hard" (default 0 = always OK)
//                SJ_WALK_PER_DAY=app  do as many sessions a day as Today offers (sessionsToday()); default 1
//                SJ_WALK_VERBOSE=1 print every session's steps
// When the flight day arrives before the course is done (e.g. the private build's real dates with one session a day),
// the walk stops and prints a NOTE with the sessions left; that is current app behaviour, not a failure.
// Speech is replaced by an instant fake (see lib.js); app timers run for real but each step is left early with Next step.
const { run } = require('./lib');
const PER_DAY_APP = process.env.SJ_WALK_PER_DAY === 'app', DAYS = +(process.env.SJ_WALK_DAYS || 0), HARD = +(process.env.SJ_WALK_HARD || 0), VERBOSE = !!process.env.SJ_WALK_VERBOSE;
const [Y, M, D] = (process.env.SJ_WALK_START || '2026-11-14').split('-').map(Number);
const day = i => new Date(Y, M - 1, D + i, 9, 0, 0);

run('walk', async ({ page, errors, report }) => {
  const kind = () => page.evaluate(() => player ? player.stages[player.idx].kind : null);
  const vis = async sel => { const e = await page.$(sel); return !!(e && await e.isVisible()); };
  const click = async sel => { if (await vis(sel)) { await page.click(sel); return true; } return false; };
  const pause = ms => page.waitForTimeout(ms);
  let sessions = 0, maxDay = DAYS || 120;
  const t0 = Date.now();
  for (let i = 0; i < maxDay; i++) {
    await page.clock.setFixedTime(day(i));
    await page.reload(); await page.waitForFunction(() => typeof current === 'function' && document.querySelector('#v-today').innerHTML.length > 0);
    let finished = false;
    for (let rep = 0; rep < 3; rep++) {
    const st = await page.evaluate(() => { const c = current(); return { c, pos: PLAN.pos, log: PLAN.log.length, title: c ? sessionTitle(c) : null, left: daysLeft(), today: sessionsToday(), done: doneToday(), remaining: remaining() }; });
    if (!st.c) { report.info(`day ${i + 1}: course complete after ${sessions} sessions`); finished = true; break; }
    if (st.left === 0) { report.info(`NOTE day ${i + 1}: flight day reached with ${st.remaining} sessions not done (${sessions} done; next was ${st.title})`); finished = true; break; }
    if (rep > 0 && !(PER_DAY_APP && st.done < st.today)) break;
    if (!(await vis('#start'))) { report.fail(`day ${i + 1}: no Start session button (${st.title})`); finished = true; break; }
    await page.click('#start');
    const steps = [];
    let guard = 0;
    while (guard++ < 60) {
      const k = await kind();
      if (!k) break;
      steps.push(k);
      const idx = await page.evaluate(() => player.idx);
      if (['learn', 'listen', 'meaning', 'warm', 'sayback', 'dialogue', 'roleplay', 'answer', 'tip', 'intro'].includes(k)) await pause(40); // let it start talking, then move on
      // the clicks a learner makes on this step, done in the page with element.click() (fast, same handlers as a tap)
      const res = await page.evaluate(({ k, hard }) => {
        const $ = s => document.querySelector(s), vis = s => { const e = $(s); return !!(e && e.offsetParent && !e.hidden); };
        const click = s => { if (vis(s)) { $(s).click(); return true; } return false; };
        let n = 0;
        switch (k) {
          case 'sound': click('#snd-play'); click('#snd-ok'); break;
          case 'quiz':
            while (n++ < 60 && !/All done|Nothing to check/.test(($('#qz') || {}).innerText || '')) {
              const o = [...document.querySelectorAll('#qz .opt:not([disabled])')]; if (o.length) o[Math.floor(Math.random() * o.length)].click(); click('#qz-next');
            }
            break;
          case 'review': while (n++ < 120 && (vis('#rv-show') || vis('#rv-got'))) { click('#rv-show'); if (!click(Math.random() < 0.85 ? '#rv-got' : '#rv-again')) click('#rv-got'); } break;
          case 'cards': while (n++ < 30 && vis('#cw-show')) { click('#cw-show'); click('#cw-got'); } break;
          case 'build': for (; n < 3; n++) { click('#bw-rev'); click('#bw-next'); } break;
          case 'drill': for (; n < 3; n++) { click('#dr-rev'); click('#dr-next'); } break;
          case 'speak': click('#said'); break;
          case 'selfcheck': document.querySelectorAll('[data-chk]').forEach(c => { c.checked = true; }); click('#finish-week'); break;
          case 'rate': click(`[data-rate="${hard ? 'hard' : 'ok'}"]`); break;
        }
        return n;
      }, { k, hard: !!(HARD && (sessions + 1) % HARD === 0) });
      if (res >= 60 && k !== 'review') report.fail(`day ${i + 1}: ${k} step did not finish`);
      if (['selfcheck', 'rate'].includes(k)) break;
      if (await page.evaluate(i0 => !!player && player.idx === i0, idx)) { if (!(await click('#pl-next'))) { report.fail(`day ${i + 1}: stuck on ${k}`); break; } }
    }
    await pause(30);
    const after = await page.evaluate(() => ({ player: !!player, pos: PLAN.pos, log: PLAN.log.length }));
    sessions++;
    const ok = !after.player && after.log === st.log + 1 && after.pos === st.pos + 1;
    if (!ok) report.fail(`day ${i + 1} ${st.title}: session did not finish (${JSON.stringify(after)})`);
    if (VERBOSE || !ok) report.info(`day ${String(i + 1).padStart(2)} ${st.title}: ${steps.join(' > ')}`);
    if (errors.length) { report.fail(`day ${i + 1} ${st.title}: page errors`); finished = true; break; }
    }
    if (finished) break;
  }
  const end = await page.evaluate(() => ({ pos: PLAN.pos, queue: PLAN.queue.length, log: PLAN.log.length, err: store.get('lastError', null) }));
  report.info(`${sessions} sessions walked in ${((Date.now() - t0) / 1000).toFixed(1)}s; plan position ${end.pos}/${end.queue}, ${end.log} logged`);
  if (end.err) report.fail('app recorded an error: ' + end.err.where + ': ' + end.err.msg);
}, { time: day(0) });
