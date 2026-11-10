// walk: a fresh learner follows the plan from day 1 (Sat Nov 14 2026, flight Dec 17), doing what Today offers each day
// (the planned sessions), clicking like a user; asserts no page errors, every session finishes, and the course completes by Dec 16.
// Modes (SJ_WALK_MODE):
//   manual (default)  auto-advance off; the learner answers quizzes/reviews and taps Next step (confirming Skip on unfinished steps).
//   auto              auto-advance on; the learner never taps Next: steps finish on their own (fake clock run forward) and the
//                     "Next: …" countdown moves on. Interactive steps (quiz, review, drill, build, speak, rate, self-check) are answered.
// Options: SJ_WALK_DAYS=n (days to walk; default until complete), SJ_WALK_START=YYYY-MM-DD, SJ_WALK_TRIP=YYYY-MM-DD (default 2026-12-17),
//          SJ_WALK_HARD=n (rate every n-th session Hard), SJ_WALK_VERBOSE=1
const { run, openPage } = require('./lib');
const MODE = process.env.SJ_WALK_MODE || 'manual', AUTO = MODE === 'auto';
const DAYS = +(process.env.SJ_WALK_DAYS || 0), HARD = +(process.env.SJ_WALK_HARD || 0), VERBOSE = !!process.env.SJ_WALK_VERBOSE;
const [Y, M, D] = (process.env.SJ_WALK_START || '2026-11-14').split('-').map(Number);
const TRIP = process.env.SJ_WALK_TRIP || '2026-12-17', LAST = (() => { const d = new Date(TRIP + 'T12:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
const day = i => new Date(Y, M - 1, D + i, 9, 0, 0);

run('walk:' + MODE, async ({ report }) => {
  const { browser, page, errors } = await openPage({ time: new Date(day(0).getTime() - 3600e3), storage: { trip: TRIP, autoNext: AUTO } }); // pauseAt must move forward
  const ev = (f, a) => page.evaluate(f, a);
  // the clicks a learner makes on an interactive step (element.click(): same handlers as a tap, no waiting on animation frames)
  const act = (k, hard) => ev(({ k, hard }) => {
    const $ = s => document.querySelector(s), vis = s => { const e = $(s); return !!(e && e.offsetParent && !e.hidden); };
    const click = s => { if (vis(s)) { $(s).click(); return true; } return false; };
    let n = 0;
    switch (k) {
      case 'sound': click('#snd-play'); click('#snd-ok'); break;
      case 'quiz': while (n++ < 60 && !/All done|Nothing to check/.test(($('#qz') || {}).innerText || '')) { const o = [...document.querySelectorAll('#qz .opt:not([disabled])')]; if (o.length) o[Math.floor(Math.random() * o.length)].click(); click('#qz-next'); } break;
      case 'review': while (n++ < 120 && (vis('#rv-show') || vis('#rv-got'))) { click('#rv-show'); if (!click(Math.random() < 0.85 ? '#rv-got' : '#rv-again')) click('#rv-got'); } break;
      case 'cards': while (n++ < 30 && vis('#cw-show')) { click('#cw-show'); click('#cw-got'); } break;
      case 'build': while (n++ < 12 && (vis('#bw-rev') || vis('#bw-next'))) { click('#bw-rev'); click('#bw-next'); } break;
      case 'drill': while (n++ < 12 && vis('#dr-rev') && !/done/.test(($('#drill .label') || {}).innerText || '')) { click('#dr-rev'); click('#dr-next'); } break;
      case 'speak': click('#said'); break;
      case 'intro': click('#intro-play'); break;
      case 'selfcheck': document.querySelectorAll('[data-chk]').forEach(c => { c.checked = true; }); click('#finish-week'); break;
      case 'rate': click(`[data-rate="${hard ? 'hard' : 'ok'}"]`); break;
    }
    return n;
  }, { k, hard });
  const ready = async () => { for (let t = 0; t < 200; t++) { if (await ev(() => typeof current === 'function' && !!document.querySelector('#v-today') && document.querySelector('#v-today').innerHTML.length > 0).catch(() => false)) return; if (AUTO) await page.clock.runFor(50); else await page.waitForTimeout(25); } throw new Error('page did not load'); };
  let sessions = 0, stop = false, autoMoves = 0, skips = 0;
  const t0 = Date.now();
  for (let i = 0; i < (DAYS || 80) && !stop; i++) {
    if (AUTO) await page.clock.pauseAt(day(i)); else await page.clock.setFixedTime(day(i));
    await page.reload(); await ready();
    for (let rep = 0; rep < 3; rep++) {
      const st = await ev(() => { const c = current(); return { c, title: c ? sessionName(c) : null, left: daysLeft(), planned: sessionsToday(), done: doneToday(), pos: PLAN.pos, log: PLAN.log.length, rem: remaining(), date: todayIso() }; });
      if (!st.c) { report.info(`day ${i + 1} (${st.date}): course complete after ${sessions} sessions`); stop = true; break; }
      if (st.left === 0) { report.fail(`flight day reached with ${st.rem} sessions not done`); stop = true; break; }
      if (st.done >= st.planned) break;
      if (!(await ev(() => { const b = document.querySelector('#start'); if (b) b.click(); return !!b; }))) { report.fail(`day ${i + 1}: no Start button (${st.title})`); stop = true; break; }
      const steps = [];
      for (let g = 0; g < 40; g++) {
        const k = await ev(() => player ? player.stages[player.idx].kind : null); if (!k) break;
        const idx = await ev(() => player.idx); steps.push(k);
        const hard = !!(HARD && (sessions + 1) % HARD === 0);
        if (AUTO) {
          await act(k, hard); if (['rate', 'selfcheck'].includes(k)) break;
          let moved = false;
          for (let t = 0; t < 400 && !moved; t++) { await page.clock.runFor(3000); moved = await ev(i0 => !player || player.idx !== i0, idx); }
          if (!moved) { report.fail(`day ${i + 1} ${st.title}: auto-advance did not move on from step ${idx + 1} (${k})`); stop = true; break; }
          autoMoves++;
        } else {
          if (['learn', 'listen', 'meaning', 'warm', 'sayback', 'dialogue', 'roleplay', 'answer', 'tip', 'intro'].includes(k)) await page.waitForTimeout(30);
          const n = await act(k, hard); if (n >= 60 && k !== 'review') report.fail(`day ${i + 1}: ${k} step did not finish`);
          if (['rate', 'selfcheck'].includes(k)) break;
          if (await ev(i0 => !!player && player.idx === i0, idx)) {
            await ev(() => { const b = document.querySelector('#pl-next'); if (b) b.click(); });
            if (await ev(() => { const b = document.querySelector('#pl-skip'); if (b) { b.click(); return true; } return false; })) skips++;
            if (await ev(i0 => !!player && player.idx === i0, idx)) { report.fail(`day ${i + 1}: stuck on ${k}`); stop = true; break; }
          }
        }
      }
      if (AUTO) await page.clock.runFor(100); else await page.waitForTimeout(20);
      const after = await ev(() => ({ player: !!player, pos: PLAN.pos, log: PLAN.log.length }));
      sessions++;
      const ok = !after.player && after.log === st.log + 1;
      if (!ok) { report.fail(`day ${i + 1} ${st.title}: session did not finish (${JSON.stringify(after)})`); stop = true; }
      if (VERBOSE || !ok) report.info(`${st.date} ${st.title}: ${steps.join(' > ')}`);
      if (errors.length) { report.fail(`day ${i + 1} ${st.title}: page errors: ${errors.slice(0, 3).join(' | ')}`); stop = true; break; }
      if (stop) break;
    }
  }
  const end = await ev(() => ({ log: PLAN.log.filter(l => l.key !== 'rest'), err: store.get('lastError', null), complete: !current() }));
  const last = end.log.length ? end.log[end.log.length - 1].date : null;
  report.info(`${sessions} sessions in ${((Date.now() - t0) / 1000).toFixed(1)}s; last session ${last}; ${AUTO ? autoMoves + ' auto-advances' : skips + ' steps skipped via the prompt'}`);
  if (!DAYS && !end.complete) report.fail('course not complete');
  if (!DAYS && last && last > LAST) report.fail(`last session ${last} is after ${LAST}`);
  if (end.err) report.fail('app recorded an error: ' + end.err.where + ': ' + end.err.msg);
  await browser.close();
}, { noBrowser: true });
