// The simulated learner shared by walk, audio, minutes and flow: follows the plan day by day from a start date, doing what Today
// offers, clicking like a user. Two modes:
//   auto   (default) auto-advance on; never taps Next; the fake clock is run forward so steps finish on their own; only interactive
//          steps are answered (quiz options, drill reveals, build reveals, intro Play all, self-check); the review and guided Speak
//          need no taps; the rating is taken from its 5-second countdown unless rateTap is set.
//   manual auto-advance off; answers interactive steps and taps Next step (confirming Skip on unfinished steps).
// Hooks: afterLoad(page) after every reload; onStep({page, day, title, step, kind, ms}) when a step is left (ms = fake time spent on it);
//        onSession({page, day, title, steps, date}) after each session.
const day0 = (start, i, h = 9) => { const [Y, M, D] = start.split('-').map(Number); return new Date(Y, M - 1, D + i, h, 0, 0); };

async function walkCourse(page, o) {
  const ev = (f, a) => page.evaluate(f, a), AUTO = o.mode !== 'manual', report = o.report, chunk = o.chunk || 3000;
  const act = (k, hard, rateTap) => ev(({ k, hard, rateTap }) => {
    const $ = s => document.querySelector(s), vis = s => { const e = $(s); return !!(e && e.offsetParent && !e.hidden); };
    const click = s => { if (vis(s)) { $(s).click(); return true; } return false; };
    let n = 0;
    switch (k) {
      case 'sound': click('#snd-play'); click('#snd-ok'); break;
      case 'quiz': while (n++ < 60 && !/All done|Nothing to check/.test(($('#qz') || {}).innerText || '')) { const o = [...document.querySelectorAll('#qz .opt:not([disabled])')]; if (o.length) o[Math.floor(Math.random() * o.length)].click(); click('#qz-next'); } window.__taps = (window.__taps || 0) + n; break;
      case 'cards': while (n++ < 30 && vis('#cw-show')) { click('#cw-show'); click('#cw-got'); } break;
      case 'build': while (n++ < 12 && (vis('#bw-rev') || vis('#bw-next'))) { click('#bw-rev'); click('#bw-next'); } break;
      case 'drill': while (n++ < 12 && vis('#dr-rev') && !/done/.test(($('#drill .label') || {}).innerText || '')) { click('#dr-rev'); click('#dr-next'); } break;
      case 'intro': click('#intro-play'); break;
      case 'selfcheck': document.querySelectorAll('[data-chk]').forEach(c => { c.checked = true; }); click('#finish-week'); break;
      case 'rate': if (rateTap || hard) click(`[data-rate="${hard ? 'hard' : 'ok'}"]`); break;
    }
    return n;
  }, { k, hard, rateTap });
  const ready = async () => { for (let t = 0; t < 200; t++) { if (await ev(() => typeof current === 'function' && !!document.querySelector('#v-today') && document.querySelector('#v-today').innerHTML.length > 0).catch(() => false)) return; if (AUTO) await page.clock.runFor(50); else await page.waitForTimeout(25); } throw new Error('page did not load'); };
  const now = () => ev(() => Date.now());
  let sessions = 0, stop = false, autoMoves = 0, skips = 0, fails = 0;
  const fail = m => { fails++; report.fail(m); };
  for (let i = 0; i < (o.days || 80) && !stop; i++) {
    if (AUTO) await page.clock.pauseAt(day0(o.start, i)); else await page.clock.setFixedTime(day0(o.start, i));
    await page.reload(); await ready(); if (o.afterLoad) await o.afterLoad(page);
    for (let rep = 0; rep < 3; rep++) {
      const st = await ev(() => { const c = current(); return { c, title: c ? sessionName(c) : null, left: daysLeft(), planned: sessionsToday(), done: doneToday(), log: PLAN.log.length, rem: remaining(), date: todayIso() }; });
      if (!st.c) { report.info(`day ${i + 1} (${st.date}): course complete after ${sessions} sessions`); stop = true; break; }
      if (st.left === 0) { fail(`flight day reached with ${st.rem} sessions not done`); stop = true; break; }
      if (st.done >= Math.max(st.planned, o.perDay || 0)) break;
      if (!(await ev(() => { const b = document.querySelector('#start'); if (b) b.click(); return !!b; }))) { fail(`day ${i + 1}: no Start button (${st.title})`); stop = true; break; }
      const steps = [];
      for (let g = 0; g < 40; g++) {
        const k = await ev(() => player ? player.stages[player.idx].kind : null); if (!k) break;
        const idx = await ev(() => player.idx), t0 = await now(); steps.push(k);
        const hard = !!(o.hard && (sessions + 1) % o.hard === 0);
        if (AUTO) {
          await act(k, hard, o.rateTap);
          let moved = false;
          for (let t = 0; t < 2000 && !moved; t++) { await page.clock.runFor(chunk); moved = await ev(i0 => !player || player.idx !== i0, idx); }
          if (!moved) { fail(`day ${i + 1} ${st.title}: auto-advance did not move on from step ${idx + 1} (${k})`); stop = true; break; }
          autoMoves++;
        } else {
          if (!['quiz', 'cards', 'build', 'drill', 'selfcheck', 'rate', 'sound', 'intro'].includes(k)) await page.waitForTimeout(30);
          await act(k, hard, true);
          if (['rate', 'selfcheck'].includes(k)) { if (o.onStep) await o.onStep({ page, day: i, title: st.title, step: idx, kind: k, ms: (await now()) - t0 }); break; }
          if (await ev(i0 => !!player && player.idx === i0, idx)) {
            await ev(() => { const b = document.querySelector('#pl-next'); if (b) b.click(); });
            if (await ev(() => { const b = document.querySelector('#pl-skip'); if (b) { b.click(); return true; } return false; })) skips++;
            if (await ev(i0 => !!player && player.idx === i0, idx)) { fail(`day ${i + 1}: stuck on ${k}`); stop = true; break; }
          }
        }
        if (o.onStep) await o.onStep({ page, day: i, title: st.title, step: idx, kind: k, ms: (await now()) - t0 });
        if (await ev(() => !player)) break;
      }
      if (AUTO) await page.clock.runFor(100); else await page.waitForTimeout(20);
      const after = await ev(() => ({ player: !!player, log: PLAN.log.length }));
      sessions++;
      const ok = !after.player && after.log === st.log + 1;
      if (!ok) { fail(`day ${i + 1} ${st.title}: session did not finish (${JSON.stringify(after)})`); stop = true; }
      if (o.verbose || !ok) report.info(`${st.date} ${st.title}: ${steps.join(' > ')}`);
      if (o.onSession) await o.onSession({ page, day: i, title: st.title, steps, date: st.date });
      if (o.errors && o.errors.length) { fail(`day ${i + 1} ${st.title}: page errors: ${o.errors.slice(0, 3).join(' | ')}`); stop = true; break; }
      if (stop || (o.maxSessions && sessions >= o.maxSessions)) { stop = true; break; }
    }
  }
  const end = await ev(() => ({ log: PLAN.log.filter(l => l.key !== 'rest'), err: store.get('lastError', null), complete: !current() }));
  return { sessions, autoMoves, skips, fails, complete: end.complete, last: end.log.length ? end.log[end.log.length - 1].date : null, err: end.err };
}
module.exports = { walkCourse, day0 };
