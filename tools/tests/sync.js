// sync: progress codes and merges under plan v2.
//  - a progress code made from a v2 plan round-trips into a fresh device (same plan position, log and review records)
//  - merging with a v1 plan (old app on another device), behind or ahead, in either direction, never downgrades to v1
//    and never moves the learner backwards; review records only grow
//  - the owner's saved progress (v1) arriving as a code on a v2 device keeps the device on v2
const { run, openPage, ownerKeys } = require('./lib');
const at = (d, h = 9) => new Date(2026, 10, d, h, 0, 0);

run('sync', async ({ report }) => {
  const browsers = [];
  const open = async o => { const r = await openPage(o); browsers.push(r.browser); return r; };
  const expect = (ok, msg) => { if (ok) report.info('ok   ' + msg); else report.fail(msg); };
  try {
    // device A: a fresh v2 learner who has done 6 sessions
    const A = await open({ time: at(14), storage: { trip: '2026-12-17', soundOK: true } });
    await A.page.evaluate(() => { for (let i = 0; i < 6; i++) { startSession(); finishSession('ok'); player = null; } });
    const a = await A.page.evaluate(() => ({ code: progressCode(), pos: coursePos(PLAN), log: PLAN.log.length, srs: Object.keys(srsMap()).length, v: PLAN.v }));
    report.info(`device A: plan v${a.v}, course position ${a.pos}, ${a.log} sessions, ${a.srs} review records`);
    // device B: fresh, loads the code
    const B = await open({ time: at(14, 10), storage: { trip: '2026-12-17' } });
    const b = await B.page.evaluate(code => { const r = loadProgressCode(code); return { ok: r.ok, pos: coursePos(PLAN), log: PLAN.log.length, srs: Object.keys(srsMap()).length, v: PLAN.v, choice: PLAN.choice }; }, a.code);
    expect(b.ok && b.v === 2 && b.pos === a.pos && b.log === a.log && b.srs === a.srs && b.choice === 'done', `code round-trips (v${b.v}, position ${b.pos}, ${b.log} sessions, ${b.srs} records)`);
    // merges with v1 plans, behind and ahead, both directions
    const res = await A.page.evaluate(() => {
      const v1 = (pos, logN) => { const q = []; for (let w = 0; w < 10; w++) for (let d = 0; d < 7; d++) q.push({ w, d, rep: 0 }); for (let i = 0; i < 3; i++) q.push({ w: 9, d: 7 + i, rep: 0 });
        return { queue: q, pos, log: q.slice(0, logN).map((s, i) => ({ date: '2026-10-' + String(5 + i).padStart(2, '0'), key: s.w + '-' + s.d, w: s.w, d: s.d, rating: 'ok' })), focus: {} }; };
      const local = progSnapshot(SHARE_KEYS), out = [];
      for (const [name, p] of [['v1 behind', v1(2, 2)], ['v1 ahead (week 3)', v1(15, 15)]]) {
        const remote = { plan: p, srs: {} };
        for (const dir of ['local=v2', 'local=v1']) {
          const m = dir === 'local=v2' ? mergeProgress(local, remote) : mergeProgress(remote, local);
          out.push({ name: name + ', ' + dir, v: m.plan.v, pos: coursePos(m.plan), srs: Object.keys(m.srs || {}).length, log: m.plan.log.length });
        }
      }
      return { before: { pos: coursePos(PLAN), srs: Object.keys(srsMap()).length }, out };
    });
    for (const m of res.out) {
      expect(m.v === 2, `${m.name}: result is v2`);
      expect(m.pos >= res.before.pos, `${m.name}: position ${m.pos} ≥ ${res.before.pos} (not backwards)`);
      expect(m.srs >= res.before.srs, `${m.name}: review records ${m.srs} ≥ ${res.before.srs}`);
    }
    // the owner's v1 progress arriving as a code on a v2 device
    const owner = ownerKeys();
    if (owner) {
      const C = await open({ time: at(14, 11), storage: { trip: '2026-12-17' } });
      const code = await C.page.evaluate(keys => 'JP1.' + b64e(JSON.stringify(Object.fromEntries(SHARE_KEYS.filter(k => keys[k] !== undefined).map(k => [k, keys[k]])))), owner);
      const c = await C.page.evaluate(code => { const r = loadProgressCode(code); return { ok: r.ok, v: PLAN.v, learned: new Set([...learnedIds(), ...staffKnown()]).size, choice: PLAN.choice, stored: (store.get('plan') || {}).v }; }, code);
      expect(c.ok && c.v === 2 && c.stored === 2, `owner's v1 code on a v2 device: stays v2 (choice ${c.choice}, ${c.learned} learned)`);
      expect(c.learned === 25, 'owner code keeps 25 learned');
    }
    for (const r of [A, B]) if (r.errors.length) report.fail('page errors: ' + r.errors.join(' | '));
  } finally { for (const b of browsers) await b.close().catch(() => {}); }
}, { noBrowser: true });
