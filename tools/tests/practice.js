// practice: Listen, Cards, Talk and Drive offer only what has been learned. A new learner sees a short note pointing to Today; the
// owner (after Continue) gets only learned items, Play sits above the folded options, and the Cards counter never reads "/ 9999".
const { run, openPage, ownerKeys } = require('./lib');
run('practice', async ({ report }) => {
  const expect = (ok, msg) => { if (ok) report.info('ok   ' + msg); else report.fail(msg); };
  for (const [name, storage] of [['new learner', { trip: '2026-12-17' }], ['owner', ownerKeys()]]) {
    if (!storage) continue;
    const { browser, page, errors } = await openPage({ time: new Date(2026, 10, 14, 9), storage });
    try {
      if (name === 'owner') await page.evaluate(() => { const b = document.querySelector('#mg-cont'); if (b) b.click(); });
      const r = await page.evaluate(() => { const L = practiceIds(), out = {}, txt = id => document.querySelector(id).innerText;
        showPractice('listen'); out.listen = { n: listenItems.length, bad: listenItems.filter(c => !L.has(c.id)).length, note: /Nothing learned yet/.test(txt('#v-listen')), playFirst: (() => { const p = document.querySelector('#ls-play'), d = document.querySelector('#v-listen details'); return !p || !d || !!(p.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING); })() };
        showPractice('cards'); out.cards = { n: pool().length, bad: pool().filter(c => !L.has(c.id)).length, note: /Nothing learned yet/.test(txt('#v-cards')), counter: /\/ 9999/.test(txt('#v-cards')) };
        talk.mode = 'answer'; talk.max = curWeek(); showPractice('talk'); out.talk = { n: talkItems.length, note: /Nothing learned yet/.test(txt('#v-talk')) };
        store.set('dmode', 'review'); showPractice('drive'); const P = drivePools(); out.drive = { n: P.learned.length + P.staff.length, bad: P.learned.filter(c => !L.has(c.id)).length, note: /Nothing learned yet/.test(txt('#v-drive')), play: !!document.querySelector('#dv-play') };
        return out; });
      report.info(`${name}: listen ${r.listen.n}, cards ${r.cards.n}, talk ${r.talk.n}, drive ${r.drive.n}`);
      if (name === 'new learner') {
        expect(r.listen.n === 0 && r.listen.note && r.cards.note && r.talk.note && r.drive.note && !r.drive.play, 'new learner: a note pointing to Today on Listen, Cards, Talk and Drive; nothing unlearned offered');
      } else {
        expect(r.listen.n > 0 && !r.listen.bad && !r.cards.bad && !r.drive.bad, 'owner: Listen, Cards and Drive offer only learned items');
        expect(r.listen.playFirst, 'owner: Play sits above the folded options');
        expect(!r.cards.counter, 'owner: the Cards counter does not read "/ 9999"');
      }
      if (errors.length) report.fail(name + ': page errors: ' + errors.join(' | '));
    } finally { await browser.close(); }
  }
}, { noBrowser: true });
