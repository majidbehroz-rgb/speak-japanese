// state: the owner's real saved progress under plan v2.
// Opened on SJ_STATE_NOW (default 2026-11-10): no page errors; the "New plan" card appears; after Continue the first session is the
// warm-up, then the first learning session holding an unlearned item (week 2 day 3 before phase 4; week 2 day 1 since numbers 1–3 joined it); learned (= items with a review record) stays exactly 25; no queued learning session is made only of
// items already learned, and every unlearned item is in a queued session (nothing skipped).
// The progress file is read at run time (SJ_STATE, default /home/claude/build-inputs/user-state.json), never copied; only counts are printed.
const { run, openPage, ownerKeys } = require('./lib');
const [Y, M, D] = (process.env.SJ_STATE_NOW || '2026-11-10').split('-').map(Number);
const keys = ownerKeys();
if (!keys) { console.log('== state: SKIP (no saved-progress file)'); process.exit(0); }

run('state', async ({ report }) => {
  const { browser, page, errors } = await openPage({ time: new Date(Y, M - 1, D, 12), storage: keys });
  try {
    const learned = () => page.evaluate(() => new Set([...learnedIds(), ...staffKnown()]).size);
    const l0 = await learned();
    report.info(`opened: plan v${await page.evaluate(() => PLAN.v)}, ${l0} learned, migration card ${!!(await page.$('#mg-card'))}`);
    if (l0 !== 25) report.fail(`expected 25 learned, got ${l0}`);
    if (!(await page.$('#mg-card'))) report.fail('no "New plan" card');
    const cont = await page.textContent('#mg-cont').catch(() => '');
    report.info('card button: ' + cont.trim());
    await page.click('#mg-cont');
    const s = await page.evaluate(() => {
      const S = srsMap(), q = PLAN.queue.slice(PLAN.pos), order = courseOrder();
      const queuedLearn = q.filter(x => isLearnDay(x));
      const relearn = queuedLearn.filter(x => sessionItems(x.w, x.d).every(id => S[id])).map(x => `${x.w + 1}-${x.d + 1}`);
      const queuedItems = new Set(queuedLearn.flatMap(x => sessionItems(x.w, x.d)));
      const skipped = order.filter(isLearnDay).flatMap(x => sessionItems(x.w, x.d)).filter(id => !S[id] && !queuedItems.has(id));
      const first = current() && sessionName(current()), btn = (document.querySelector('#start') || {}).textContent || '';
      const want = courseOrder()[nextLessonIndex()];
      return { want: [want.w, want.d], first, second: q[1] ? sessionName(q[1]) : null, secondWD: q[1] ? [q[1].w, q[1].d] : null, relearn, skipped: skipped.length, partly: queuedLearn.filter(x => sessionItems(x.w, x.d).some(id => S[id])).length, btn, lastError: store.get('lastError', null) };
    });
    report.info(`after Continue: ${s.first} → ${s.second}; Start button "${s.btn.trim()}"`);
    if (!/^Welcome back/.test(s.first || '')) report.fail('first session is not the warm-up');
    if (!s.secondWD || s.secondWD[0] !== s.want[0] || s.secondWD[1] !== s.want[1]) report.fail(`the session after the warm-up is not the first one holding an unlearned item (W${s.want[0] + 1}D${s.want[1] + 1})`);
    if (s.relearn.length) report.fail('already-learned sessions queued as new: ' + s.relearn.join(', '));
    if (s.skipped) report.fail(`${s.skipped} unlearned items are in no queued session`);
    report.info(`queued learning sessions holding some learned items: ${s.partly}`);
    if (!/Start · Welcome back/.test(s.btn)) report.fail('Start button does not name the warm-up');
    // do the warm-up through the app, then the next session must be week 2 day 3 and learned still 25
    await page.click('#start');
    const steps = await page.evaluate(() => player.stages.map(x => x.kind + (x.ids ? '(' + x.ids.length + ')' : '')).join(' > '));
    report.info('warm-up steps: ' + steps);
    await page.evaluate(() => { finishSession('ok'); player = null; renderToday(); });
    const after = await page.evaluate(() => { const c = current(); return { c: c && [c.w, c.d], name: c && sessionName(c),
      next3: PLAN.queue.slice(PLAN.pos, PLAN.pos + 3).map(q => { const st = sessionStages(q); return `${sessionName(q)} [${newToday(st) || 'nothing new'}]: ` + st.map(x => x.kind + (x.kind === 'learn' ? '(' + x.ids.map(id => byId(id).ro).join(', ') + ')' : '')).join(' > '); }) }; });
    after.next3.forEach((t, i) => report.info(`next session ${i + 1}: ${t}`));
    const l1 = await learned();
    report.info(`after the warm-up: ${after.name}; learned ${l1}`);
    if (!after.c || after.c[0] !== s.want[0] || after.c[1] !== s.want[1]) report.fail('after the warm-up the next session is not the first one holding an unlearned item');
    if (l1 !== 25) report.fail(`learned changed to ${l1}`);
    if (s.lastError) report.fail('app recorded an error: ' + s.lastError.msg);
    if (errors.length) report.fail('page errors: ' + errors.join(' | '));
  } finally { await browser.close(); }
}, { noBrowser: true });
