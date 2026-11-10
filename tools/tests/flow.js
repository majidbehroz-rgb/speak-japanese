// flow: the hands-free session flow.
//  - auto-advance: when a step completes, "Next: …" counts down and moves on; "Stay here" stops it
//  - resume: after a reload, Today offers "Resume · step N of M" and it returns to the same step
//  - skip prompt: Next on an unfinished step asks first ("Skip this step? …"); on a finished step it just moves on
//  - feedback: the box is closed by default after a session, opens from its link, and is gone the next day
//  - the gear (Voice speed, Time to answer) is collapsed; step help text shows the first two times, then sits behind "?"
//  - phase 3: a learning day runs from Start to Done with no taps except the quick-check answers (the rating is taken from its
//    countdown); the review grades itself; a Missed-it tap re-queues the item and sends it back to tomorrow; with audio/index.json
//    missing the session falls back to text-to-speech (with its sound check) and still completes
// Uses a paused fake clock so every timer is under the test's control.
const { run, openPage } = require('./lib');
const { walkCourse } = require('./walker');
const at = (d, h = 9, m = 0) => new Date(2026, 10, d, h, m, 0);

run('flow', async ({ report }) => {
  const { browser, page, errors } = await openPage({ time: at(14, 8), storage: { trip: '2026-12-17', soundOK: true } });
  const ev = (f, a) => page.evaluate(f, a);
  const idx = () => ev(() => player ? player.idx : null);
  const has = sel => ev(s => !!document.querySelector(s), sel);
  const click = sel => ev(s => { const e = document.querySelector(s); if (e) e.click(); return !!e; }, sel);
  const runUntil = async (fn, maxMs = 600000, step = 1000) => { for (let t = 0; t < maxMs; t += step) { if (await ev(fn)) return true; await page.clock.runFor(step); } return false; };
  const expect = (ok, msg) => { if (ok) report.info('ok   ' + msg); else report.fail(msg); };
  try {
    await page.clock.pauseAt(at(14, 9));
    await click('#start');
    expect((await idx()) === 0, 'session started at step 1');
    expect(!(await ev(() => document.querySelector('#pl-gear').open)), 'gear collapsed by default');
    expect(/Time to answer/.test(await ev(() => document.querySelector('#pl-gear').textContent)), 'gear holds "Time to answer"');
    expect(!(await ev(() => document.querySelector('#pl-desc').hidden)), 'step help shown the first time');
    // skip prompt on an unfinished step
    await click('#pl-next');
    expect(await has('#pl-skipq'), 'Next on an unfinished step asks "Skip this step?"');
    expect(/come back in tomorrow's review/.test(await ev(() => document.querySelector('#pl-skipq').innerText)), 'prompt says the phrases come back tomorrow');
    await click('#pl-keep');
    expect(!(await has('#pl-skipq')) && (await idx()) === 0, 'Keep going stays on the step');
    // auto-advance fires when the step completes
    expect(await runUntil(() => !!document.querySelector('#pl-auto')), 'countdown appears when the learn step completes');
    expect(/^Next: /.test(await ev(() => document.querySelector('#pl-auto').innerText)), 'countdown names the next step');
    await page.clock.runFor(4000);
    expect((await idx()) === 1, 'auto-advance moved on to step 2');
    // and can be stopped
    expect(await runUntil(() => !!document.querySelector('#pl-auto')), 'countdown appears on step 2');
    await click('#pl-stay');
    await page.clock.runFor(6000);
    expect((await idx()) === 1 && !(await has('#pl-auto')), 'Stay here stops the countdown');
    await click('#pl-next');
    expect(!(await has('#pl-skipq')) && (await idx()) === 2, 'Next on a finished step moves on without asking');
    // resume after a reload
    const before = await idx();
    await page.reload(); await runUntil(() => typeof current === 'function' && !!document.querySelector('#v-today').innerHTML, 5000, 50);
    const btn = await ev(() => (document.querySelector('#start') || {}).textContent || '');
    expect(/^Resume · step 3 of/.test(btn.trim()), `Today offers "${btn.trim()}"`);
    await click('#start');
    expect((await idx()) === before, 'Resume returns to the same step');
    // help text: the third time a kind is seen it sits behind "?"
    const seen = await ev(() => store.get('seenKinds', {}));
    report.info('seen counts: ' + JSON.stringify(seen));
    // finish the session quickly, then look at the done card
    await ev(() => { player.idx = player.stages.length - 1; renderToday(); });
    await click('[data-rate="ok"]');
    expect(await has('#fb-open') && !(await has('#fb-text')), 'after a session: "Send feedback" link, box closed');
    await click('#fb-open');
    expect(await has('#fb-text'), 'the link opens the feedback box');
    expect(/Done: .*✓/i.test(await ev(() => document.querySelector('#v-today').innerText)), 'done card shows what was done');
    // the next day: no box, no done card
    await page.clock.pauseAt(at(15, 9)); await page.reload(); await runUntil(() => typeof current === 'function' && !!document.querySelector('#v-today').innerHTML, 5000, 50);
    expect(!(await has('#fb-text')) && !(await has('#fb-open')), 'next day: no feedback box or link');
    // second time learn is seen: help shown; third time: behind "?"
    await click('#start');
    for (let k = 0; k < 6; k++) { const kind = await ev(() => player && player.stages[player.idx].kind); if (kind === 'learn') break; await ev(() => { player.idx++; renderToday(); }); }
    const helpState = await ev(() => ({ kind: player.stages[player.idx].kind, shown: !document.querySelector('#pl-desc').hidden, q: !!document.querySelector('#pl-help'), seen: store.get('seenKinds', {}).learn }));
    // (a day can hold two learn steps, so count views rather than days)
    expect(helpState.kind === 'learn' && helpState.shown === (helpState.seen <= 2), `learn help shown while seen ≤ 2 times (seen ${helpState.seen}, shown ${helpState.shown})`);
    await ev(() => { player = null; renderToday(); });
    await click('#start');
    for (let k = 0; k < 6; k++) { const kind = await ev(() => player && player.stages[player.idx].kind); if (kind === 'learn') break; await ev(() => { player.idx++; renderToday(); }); }
    const h3 = await ev(() => ({ shown: !document.querySelector('#pl-desc').hidden, q: !!document.querySelector('#pl-help') }));
    expect(!h3.shown && h3.q, 'third time: help text behind "?"');
    await click('#pl-help');
    expect(!(await ev(() => document.querySelector('#pl-desc').hidden)), '"?" shows the help');
    if (errors.length) report.fail('page errors: ' + errors.join(' | '));
  } finally { await browser.close(); }
  // ---- phase 3: hands-free learning day, self-grading review, Missed it, no-index fallback ----
  { const P = await openPage({ time: new Date(2026, 10, 14, 8), storage: { trip: '2026-12-17', autoNext: true } });
    try {
      const kinds = [];
      const r = await walkCourse(P.page, { start: '2026-11-14', report, errors: P.errors, maxSessions: 1, onStep: ({ kind }) => kinds.push(kind) });
      const taps = await P.page.evaluate(() => window.__taps || 0), hardTaps = await P.page.evaluate(() => window.__hardTaps || 0);
      expect(r.sessions === 1 && !r.fails, `day 1 ran Start → Done hands-free: ${kinds.join(' > ')} (${taps} quick-check taps, no other taps; rating ${hardTaps ? 'tapped: Hard is never saved without a tap' : 'from its countdown'})`);
      expect(!kinds.includes('sound'), 'no sound check with recorded voices');
      // day 2: watch the review grade itself, and tap Missed it once
      await P.page.clock.pauseAt(new Date(2026, 10, 15, 9)); await P.page.reload();
      for (let t = 0; t < 100 && !(await P.page.evaluate(() => typeof current === 'function' && !!document.querySelector('#start'))); t++) await P.page.clock.runFor(50);
      const before = await P.page.evaluate(() => JSON.parse(JSON.stringify(srsMap())));
      await P.page.evaluate(() => document.querySelector('#start').click());
      const kind0 = await P.page.evaluate(() => player.stages[player.idx].kind);
      expect(kind0 === 'review', 'day 2 opens with the review');
      const total0 = await P.page.evaluate(() => +(document.querySelector('#rv-prog') || { textContent: '0/0' }).textContent.split('/')[1]);
      let missedId = null;
      for (let t = 0; t < 200 && !missedId; t++) { await P.page.clock.runFor(250); missedId = await P.page.evaluate(() => { const b = document.querySelector('#rv-miss'); if (b && !b.disabled) { b.click(); const card = document.querySelector('#rv-card'); return card ? card.innerText : 'x'; } return null; }); }
      expect(!!missedId, 'Missed it is available during the pause');
      const prog = () => P.page.evaluate(() => (document.querySelector('#rv-prog') || { textContent: '' }).textContent);
      const p0 = await prog(); for (let t = 0; t < 200 && (await prog()) === p0; t++) await P.page.clock.runFor(250);
      const total1 = +(await prog()).split('/')[1];
      for (let t = 0; t < 400 && (await P.page.evaluate(() => player && player.idx === 0)); t++) await P.page.clock.runFor(1000);
      const after = await P.page.evaluate(() => JSON.parse(JSON.stringify(srsMap())));
      const tomorrow = '2026-11-16', reviewed = Object.keys(before).filter(id => after[id] && after[id].last === '2026-11-15');
      const missed = reviewed.filter(id => after[id].s === 1 && after[id].due === tomorrow), gotUp = reviewed.filter(id => after[id].s > before[id].s);
      expect(missed.length === 1, `the missed item is back to level 1, due tomorrow (${missed.join(', ')})`);
      expect(gotUp.length === reviewed.length - 1 && gotUp.length > 0, `the other ${gotUp.length} reviewed items were graded "got it" with no taps`);
      const queued = await P.page.evaluate(() => player ? player.reviewMisses : null);
      expect(total1 === total0 + 1, `the missed item is re-queued at the end (${total0} → ${total1} items); misses counted for the rating: ${queued}`);
      if (P.errors.length) report.fail('page errors: ' + P.errors.join(' | '));
    } finally { await P.browser.close(); } }
  { const P = await openPage({ time: new Date(2026, 10, 14, 8), storage: { trip: '2026-12-17', autoNext: true }, noAudioIndex: true });
    try {
      const kinds = [];
      const r = await walkCourse(P.page, { start: '2026-11-14', report, errors: P.errors, maxSessions: 1, onStep: ({ kind }) => kinds.push(kind) });
      const st = await P.page.evaluate(() => ({ state: AX.state, tts: (window.__ttsLog || []).length, clips: (window.__clipLog || []).length }));
      expect(r.sessions === 1 && !r.fails && st.state === 'fail', `no audio index: session completes on text-to-speech (${kinds.join(' > ')})`);
      expect(kinds[0] === 'sound', 'no audio index: the sound check comes back');
      if (P.errors.length) report.fail('page errors: ' + P.errors.join(' | '));
    } finally { await P.browser.close(); } }
}, { noBrowser: true });
