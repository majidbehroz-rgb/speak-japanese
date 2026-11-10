// regress: one check per phase-6 review finding (each adapted from the reviewer's repro script; nothing here reads the review folder).
// The old-build state in fixtures/old-pub-w3d5.json was made by using the previous public app up to week 3 day 5 (no personal data).
// Each check opens its own page on the fake clock; a check that needs the owner's saved progress is skipped when it is not on this machine.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { run, openPage, ownerKeys, BASE, FAST_SPEECH, FAKE_AUDIO } = require('./lib');
const OLD = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'old-pub-w3d5.json'), 'utf8'));   // last session Nov 2
const T = (m, d, h = 10, mi = 0) => new Date(2026, m - 1, d, h, mi);
const oldState = () => Object.assign(JSON.parse(JSON.stringify(OLD)), { trip: '2026-12-17' });

run('regress', async ({ report }) => {
  const ok = (cond, msg) => cond ? report.info('ok   ' + msg) : report.fail(msg);
  const page0 = async (o, fn) => { const P = await openPage(o); try { await fn(P.page, P); if (P.errors.length) report.fail('page errors: ' + P.errors.slice(0, 3).join(' | ')); } finally { await P.browser.close(); } };

  // 1 stalled network (repro-11): a hung sprite or index request falls back to text-to-speech; the lesson keeps talking
  for (const which of ['sprite', 'index']) {
    const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    try { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await ctx.newPage();
      await p.addInitScript(FAST_SPEECH); await p.addInitScript(FAKE_AUDIO); await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
      await p.route(which === 'index' ? /audio\/index\.json/ : /audio\/(w\d+|coach)\.mp3/, () => {});
      await p.goto(BASE); await p.waitForFunction(() => typeof startSession === 'function'); await p.click('#start'); await p.waitForTimeout(8000);
      const r = await p.evaluate(() => (window.__ttsLog || []).filter(x => x.text.trim()).length + window.__clipLog.length);
      ok(r > 0, `stalled ${which} request: the lesson still speaks within 8 s (${r} lines)`); } finally { await b.close(); }
  }

  // 2 a quiz's pending timer must not act on the next step (repro-7)
  await page0({ time: T(11, 14) }, async page => {
    await page.click('#start'); await page.evaluate(() => { player.idx = player.stages.findIndex(s => s.kind === 'quiz'); renderToday(); });
    await page.evaluate(() => { const b = document.querySelector('#qz [data-opt]'); if (b) b.click(); });   // an answer arms the quiz's timer
    await page.click('#pl-next'); if (await page.$('#pl-skip')) await page.click('#pl-skip');
    const at = await page.evaluate(() => player.idx); await page.clock.runFor(2000);
    const r = await page.evaluate(() => ({ idx: player.idx, kind: player.stages[player.idx].kind, done: !!player.done[player.idx], auto: !!document.getElementById('pl-auto') }));
    ok(r.idx === at && !r.done && !r.auto, `quiz timer ignored after leaving the quiz (${r.kind}: done ${r.done}, countdown ${r.auto})`);
  });

  // 3 leaving Today cancels the countdown and the lesson audio; coming back shows the step done with Next (repro-8)
  await page0({ time: T(11, 14) }, async page => {
    await page.click('#start'); await page.evaluate(() => stageDone());
    await page.click('nav.tabs >> text=Plan'); const n0 = await page.evaluate(() => window.__clipLog.length + (window.__ttsLog || []).length);
    await page.clock.runFor(6000);
    const r = await page.evaluate(n0 => ({ idx: player && player.idx, audio: window.__clipLog.length + (window.__ttsLog || []).length - n0 }), n0);
    ok(r.idx === 0 && r.audio === 0, `after leaving Today: still on step 1, no audio (${r.audio})`);
    await page.click('nav.tabs >> text=Today'); await page.clock.runFor(6000);
    const b = await page.evaluate(() => ({ idx: player.idx, next: !!document.querySelector('#pl-next'), auto: !!document.getElementById('pl-auto') }));
    ok(b.idx === 0 && b.next && !b.auto, 'back on Today: the step is done, Next is offered, no surprise advance');
  });

  // 4 + 9 migration from the old build: no empty learning days; the card names what comes after the warm-up (repro-1, repro-3)
  await page0({ time: T(11, 14), storage: oldState() }, async page => {
    const btn = (await page.textContent('#mg-cont')).trim(); await page.click('#mg-cont');
    const r = await page.evaluate(() => { const S = srsMap(), q = PLAN.queue.slice(PLAN.pos);
      return { empty: q.filter(e => isLearnDay(e) && !e.rep && sessionItems(e.w, e.d).every(id => S[id])).map(sessionName),
        partly: q.filter(e => isLearnDay(e) && !e.rep && sessionItems(e.w, e.d).some(id => S[id])).map(sessionName),
        next: sessionName(q.find(e => e.k !== 'back')), first: q[0] && q[0].k }; });
    ok(!r.empty.length, `no queued learning day is fully learned already (${r.empty.join(', ') || 'none'})`);
    ok(!r.partly.length, `partly learned days are merged into catch-ups (${r.partly.join(', ') || 'none'})`);
    ok(btn.includes(r.next), `Continue names the session after the warm-up: "${btn}" / ${r.next}`);
  });

  // 5 warm-up: a prelude that does not use up the day; only after a 7-day gap (repro-2)
  await page0({ time: T(11, 17, 9), storage: oldState() }, async page => {
    await page.click('#mg-cont');
    const a = await page.evaluate(() => ({ k: current().k, planned: sessionsToday() }));
    await page.evaluate(() => { startSession(); finishSession('ok'); player = null; renderToday(); });
    const b = await page.evaluate(() => ({ done: /Done for today/.test(document.querySelector('#v-today').innerText), doneToday: doneToday(), planned: sessionsToday(), start: !!document.querySelector('#start') }));
    ok(a.k === 'back' && !b.done && b.doneToday === 0 && b.planned === a.planned && b.start, `warm-up then the day's lesson is still to do (planned ${a.planned}, done ${b.doneToday})`);
  });
  await page0({ time: T(11, 5, 9), storage: oldState() }, async page => {
    const txt = (await page.textContent('#mg-cont')).trim(); await page.click('#mg-cont');
    const k = await page.evaluate(() => current().k);
    ok(k !== 'back' && !/warm-up/.test(txt), `3 days since the last session: no warm-up ("${txt}")`);
  });

  // 6 Hard repeats at most once; a suggested Hard is never saved by the countdown (repro-4, repro-5)
  await page0({ time: T(11, 14) }, async page => {
    const names = []; for (let day = 0; day < 8; day++) { names.push(await page.evaluate(() => { const c = current(); startSession(); const n = sessionName(c); finishSession('hard'); player = null; return n; }));
      await page.clock.setSystemTime(new Date(2026, 10, 15 + day, 10)); await page.evaluate(() => { _sched = null; }); }
    const d1 = names.filter(x => /politeness, day 1/.test(x)).length;
    ok(d1 <= 2, `rated Hard every day: day 1 comes back at most once (${d1} times in 8 days)`);
  });
  await page0({ time: T(11, 14), storage: { autoNext: true } }, async page => {
    await page.click('#start'); await page.evaluate(() => { player.quiz = { right: 3, total: 8 }; player.idx = player.stages.length - 1; renderToday(); });
    const cd = await page.evaluate(() => !!document.querySelector('#pl-auto')); await page.clock.runFor(7000);
    const r = await page.evaluate(() => ({ log: PLAN.log.length, player: !!player }));
    ok(!cd && r.log === 0 && r.player, 'a suggested Hard waits for a tap (no countdown, nothing saved)');
    await page.evaluate(() => { player.quiz = { right: 8, total: 8 }; renderToday(); }); await page.clock.runFor(7000);
    ok(await page.evaluate(() => PLAN.log.length === 1 && PLAN.log[0].rating === 'easy'), 'a suggested Easy is saved by the countdown');
  });

  // 7 Start over with a session open closes it first (repro-12)
  await page0({ time: T(11, 21), storage: oldState() }, async page => {
    await page.click('#mg-cont'); await page.click('#start'); await page.evaluate(() => { player.idx = 1; store.set('resume', { key: skey(player.s), date: todayIso(), at: 1, n: player.stages.length }); });
    await page.click('nav.tabs >> text=Plan'); await page.evaluate(() => document.querySelectorAll('#v-plan details').forEach(d => d.open = true));
    await page.click('#reset'); await page.evaluate(() => document.querySelector('#reset-yes').click());
    await page.click('nav.tabs >> text=Today');
    const r = await page.evaluate(() => ({ player: !!player, resume: store.get('resume', null), next: sessionName(current()), start: !!document.querySelector('#start') }));
    ok(!r.player && !r.resume && r.start, `Start over closed the open session and its resume (next: ${r.next})`);
  });

  // 8 profile answers are known only once the phrase that teaches their slot is learned; other people's names stay exempt (repro-6)
  await page0({ time: T(11, 14) }, async page => {
    const bad = await page.evaluate(() => { const out = []; let g = 0;
      while (current() && g++ < 14) { const s = current(), st = sessionStages(s), sp = st.find(x => x.kind === 'speak');
        if (sp) { player = { s, stages: st, learnIds: st.filter(x => x.kind === 'learn' && !x.staff).flatMap(x => x.ids) }; const K = knownTokens(player.learnIds);
          for (let i = 0; i < 5; i++) closingQA(sp.w, 99).forEach(q => wordTok(fill(q.q[0], 0) + ' ' + fill(q.a[0], 0)).forEach(t => { if (!K.has(t) && !NAME_WORDS.has(t) && !/^\d/.test(t)) out.push(sessionName(s) + ': ' + t); })); }
        player = { s, stages: st }; finishSession('ok', s.d === 6 ? CANDO[s.w].map(() => true) : undefined); player = null; }
      return [...new Set(out)]; });
    ok(!bad.length, `closing questions use only learned words, profile answers included (${bad.slice(0, 3).join('; ') || 'none'})`);
  });

  // 10 a session that runs past midnight is logged on the day it started (repro-10)
  await page0({ time: T(11, 16, 23), storage: { trip: '2026-12-17' } }, async page => {
    await page.evaluate(() => { startSession(); finishSession('ok'); player = null; renderToday(); });
    await page.clock.setSystemTime(T(11, 17, 23, 55)); await page.evaluate(() => { _sched = null; renderToday(); });
    await page.click('#start'); await page.clock.setSystemTime(T(11, 18, 0, 8));
    await page.evaluate(() => { finishSession('ok'); player = null; _sched = null; renderToday(); });
    const r = await page.evaluate(() => ({ log: PLAN.log.map(l => l.date), done: /Done for today/.test(document.querySelector('#v-today').innerText) }));
    ok(r.log.includes('2026-11-17') && !r.done, `logged on the start day (${r.log.join(', ')}); the new day is still open`);
  });

  // 11 Drive's your-turn pause equals Time to answer at any Voice speed (repro-9)
  await page0({ time: T(11, 20), storage: oldState() }, async page => {
    await page.click('#mg-cont');
    const r = await page.evaluate(async () => { await audioIndex(); const res = {};
      for (const v of [0.7, 1, 1.2]) { setVrate(v); store.set('gap', 3); const sc = driveScript('review', 10), worst = [];
        sc.forEach((x, i) => { if (!x.turn) return; const ans = sc.slice(i + 1).find(y => y.k); if (!ans) return; worst.push(Math.abs(x.gap / driveRate() - turnMs({ key: ans.k }) / 1000) / (turnMs({ key: ans.k }) / 1000)); });
        res[v] = { pauses: worst.length, worst: Math.max(0, ...worst) }; }
      setVrate(1); return res; });
    Object.entries(r).forEach(([v, x]) => ok(x.pauses > 0 && x.worst < 0.1, `Drive at ${Math.round(v * 100)}%: ${x.pauses} pauses within 10% of Time to answer (worst ${(x.worst * 100).toFixed(1)}%)`));
  });

  // 12 a malformed saved plan is rebuilt; a render error shows a message and "Rebuild my plan" (repro-13)
  { const b = await chromium.launch(); try { const p = await (await b.newContext({ serviceWorkers: 'block' })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.goto(BASE.replace('index.html', '__blank')); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('jp17:plan', JSON.stringify({ v: 2, pack: 5, queue: [{ w: 0, d: 0 }], pos: 0 })); });
      await p.goto(BASE); await p.waitForTimeout(1500);
      const r = await p.evaluate(() => ({ len: document.querySelector('#v-today').innerText.trim().length, log: Array.isArray(PLAN.log), start: !!document.querySelector('#start') }));
      ok(!errs.length && r.len > 0 && r.log && r.start, `malformed plan rebuilt on load (errors ${errs.length}, Start ${r.start})`);
      await p.evaluate(() => { window.__orig = renderTodayInner; window.renderTodayInner = () => { throw new Error('test'); }; renderToday(); });
      const shown = await p.evaluate(() => !!document.querySelector('#rebuild'));
      await p.evaluate(() => { window.renderTodayInner = window.__orig; document.querySelector('#rebuild').click(); });
      ok(shown && await p.evaluate(() => !!document.querySelector('#start')), 'a render error shows "Rebuild my plan", which brings Today back');
    } finally { await b.close(); } }

  // 13a a stale resume ("step 41 of 3") is dropped
  await page0({ time: T(11, 14) }, async page => {
    await page.evaluate(() => { store.set('resume', { key: skey(current()), date: todayIso(), at: 41, n: 3 }); renderToday(); });
    const t = await page.evaluate(() => document.querySelector('#v-today').innerText);
    ok(!/41/.test(t) && /Start/.test(t), 'a resume point past the end of the session is ignored');
  });
  // 13b a progress code with another flight date takes effect without a reload
  { let code;
    await page0({ time: T(11, 14), storage: { trip: '2026-12-20' } }, async page => { await page.evaluate(() => { startSession(); finishSession('ok'); player = null; }); code = await page.evaluate(() => progressCode()); });
    await page0({ time: T(11, 14), storage: { trip: '2026-12-17' } }, async page => {
      const r = await page.evaluate(c => { const a = iso(TRIP), m = loadProgressCode(c); renderToday(); return { a, b: iso(TRIP), ok: m.ok, left: daysLeft(), log: PLAN.log.length }; }, code);
      ok(r.ok && r.a === '2026-12-17' && r.b === '2026-12-20' && r.log === 1, `progress code: flight date ${r.a} → ${r.b} and the plan follow at once`);
    }); }
  // 13c a flight date in the past: one session a day, a message and a link to set the date, no fit warnings
  await page0({ time: T(12, 20), storage: { trip: '2026-12-17' } }, async page => {
    const r = await page.evaluate(() => ({ status: statusText(), planned: sessionsToday(), text: document.querySelector('#v-today').innerText, link: !!document.querySelector('#v-today [data-gotab="plan"]') }));
    ok(/flight date has passed/i.test(r.text) && r.link && r.planned === 1 && !/won't fit|not fit|too many/i.test(r.text), `past flight date: "${r.status}", one a day, link to set a new date`);
  });
  // 13d Lessons: finished sessions can be redone, the next one starts from Today, later ones show contents only
  await page0({ time: T(11, 14) }, async page => {
    await page.evaluate(() => { startSession(); finishSession('ok'); player = null; lessonWeek = 0; show('lessons'); });
    const r = await page.evaluate(() => ({ d0: (document.querySelector('[data-play="0-0"]') || {}).textContent, d1: (document.querySelector('[data-play="0-1"]') || {}).textContent,
      d3: !!document.querySelector('[data-play="0-3"]'), contents: document.querySelectorAll('#v-lessons details.contents').length }));
    ok(r.d0 === 'Revisit' && /Today|Start/.test(r.d1 || '') && !r.d3 && r.contents > 0, `Lessons: day 1 ${r.d0}, day 2 ${r.d1}, day 4 startable ${r.d3}, ${r.contents} show contents`);
    const f = await page.evaluate(() => { const x = playSession(0, 3); return { x, player: !!player }; });
    ok(f.x === false && !f.player, 'a later session cannot be started from a link');
  });
}, { noBrowser: true });
