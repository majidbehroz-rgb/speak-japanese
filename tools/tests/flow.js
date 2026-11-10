// flow: the hands-free session flow.
//  - auto-advance: when a step completes, "Next: …" counts down and moves on; "Stay here" stops it
//  - resume: after a reload, Today offers "Resume · step N of M" and it returns to the same step
//  - skip prompt: Next on an unfinished step asks first ("Skip this step? …"); on a finished step it just moves on
//  - feedback: the box is closed by default after a session, opens from its link, and is gone the next day
//  - the gear (Speed, Time to answer) is collapsed; step help text shows the first two times, then sits behind "?"
// Uses a paused fake clock so every timer is under the test's control.
const { run, openPage } = require('./lib');
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
    const helpState = await ev(() => ({ kind: player.stages[player.idx].kind, shown: !document.querySelector('#pl-desc').hidden, q: !!document.querySelector('#pl-help') }));
    expect(helpState.kind === 'learn' && helpState.shown, 'learn help still shown the second time');
    await ev(() => { player = null; renderToday(); });
    await click('#start');
    for (let k = 0; k < 6; k++) { const kind = await ev(() => player && player.stages[player.idx].kind); if (kind === 'learn') break; await ev(() => { player.idx++; renderToday(); }); }
    const h3 = await ev(() => ({ shown: !document.querySelector('#pl-desc').hidden, q: !!document.querySelector('#pl-help') }));
    expect(!h3.shown && h3.q, 'third time: help text behind "?"');
    await click('#pl-help');
    expect(!(await ev(() => document.querySelector('#pl-desc').hidden)), '"?" shows the help');
    if (errors.length) report.fail('page errors: ' + errors.join(' | '));
  } finally { await browser.close(); }
}, { noBrowser: true });
