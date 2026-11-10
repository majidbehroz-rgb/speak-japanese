// minutes: how long each session of the plan takes at default settings (Time to answer 3 s, Voice speed 100%, auto-advance on).
// A learner walks the whole plan hands-free on a fake clock with the real clip lengths from audio/index.json; the time of every step
// is measured in the page (from the moment it is shown to the moment the next one is). Tapping steps are modelled, since the
// simulated learner answers instantly: quick check 5 s per question, drill 6 s per item, build 8 s per sentence, self-check 40 s
// (plus the 3 s "Next" countdown each). Text-to-speech lines are timed at ~190 ms per Japanese character, ~75 ms per English one. Prints the table; flags sessions over 16 minutes and learning days under 5, and for each
// session over the limit proposes what to trim (nothing is changed). Fails on a session over 16 minutes; SJ_MINUTES_STRICT=1 also fails on short learning days.
// SJ_MINUTES_OWNER=1: start from the owner's saved progress (read at run time, never copied) at default settings, Continue on the
// migration card, then walk the owner's real plan from Nov 14.
const { run, openPage, ownerKeys } = require('./lib');
const OWNER = !!process.env.SJ_MINUTES_OWNER;
const { walkCourse } = require('./walker');
const MAX = 16, MIN_LEARN = 5;

run('minutes', async ({ report }) => {
  // unrecorded lines (conversation, questions, drills) still use text-to-speech: give the fake voice a realistic length
  const ttsLen = { fn: () => { window.__ttsMs = u => Math.max(700, String(u.text).length * (/ja/.test(u.lang) ? 190 : 75) / Math.max(0.3, u.rate || 1)); } };
  const { browser, page, errors } = await openPage({ time: new Date(2026, 10, 14, 8), storage: OWNER ? Object.assign({}, ownerKeys(), { autoNext: true, gap: 3, vrate: 1 }) : { trip: '2026-12-17', autoNext: true }, initScript: ttsLen });
  if (OWNER && !ownerKeys()) { report.info('no owner state on this machine: skipped'); await browser.close(); return; }
  const install = p => p.evaluate(() => { const mg = document.querySelector('#mg-cont'); if (mg) mg.click(); window.__steps = []; const orig = renderPlayer;
    window.renderPlayer = function (el) { const st = player.stages[player.idx], last = window.__steps[window.__steps.length - 1];
      if (!last || last.idx !== player.idx) window.__steps.push({ idx: player.idx, kind: st.kind, title: st.title, at: Date.now(), n: st.kind === 'quiz' ? Math.min(st.n || 8, (st.ids || []).length) : st.n || 0, isLearnDay: player.s.d >= 0 && player.s.d < learnDays(player.s.w) && !player.s.k });
      return orig.apply(this, arguments); }; });
  const rows = [];
  const r = await walkCourse(page, { start: '2026-11-14', report, errors, afterLoad: install,
    onSession: async ({ page: p, title, date }) => {
      const d = await p.evaluate(() => { const x = window.__steps || [], end = Date.now(); window.__steps = []; return { x, end }; });
      const steps = d.x.map((s, i) => { const raw = ((i + 1 < d.x.length ? d.x[i + 1].at : d.end) - s.at) / 1000;
        const model = { quiz: s.n * 5 + 3, drill: s.n * 6 + 3, build: s.n * 8 + 3, selfcheck: 40, cards: s.n * 6 + 3 }[s.kind];
        return { kind: s.kind, title: s.title, sec: model !== undefined ? model : raw }; });
      const total = steps.reduce((a, s) => a + s.sec, 0) / 60;
      rows.push({ date, title, total, learn: d.x.length && d.x[0].isLearnDay, steps });
    } });
  await browser.close();
  const flags = [];
  rows.forEach(r => {
    const over = r.total > MAX, under = r.learn && r.total < MIN_LEARN;
    if (over || under) flags.push(r);
    report.info(`${r.date} ${r.title.padEnd(44)} ${r.total.toFixed(1).padStart(5)} min  ${r.steps.map(s => `${s.kind} ${(s.sec / 60).toFixed(1)}`).join(' · ')}${over ? '   <-- over ' + MAX : under ? '   <-- under ' + MIN_LEARN : ''}`);
  });
  const avg = rows.reduce((a, r) => a + r.total, 0) / Math.max(1, rows.length);
  report.info(`${rows.length} sessions; average ${avg.toFixed(1)} min; longest ${Math.max(...rows.map(r => r.total)).toFixed(1)}; shortest ${Math.min(...rows.map(r => r.total)).toFixed(1)}`);
  report.info(`flags: ${flags.length ? flags.map(f => `${f.title} ${f.total.toFixed(1)} min`).join('; ') : 'none'}`);
  const tip = { learn: 'move an item to a lighter day of the week (phase 4 packing) or drop the second "once more" for pieces already known',
    review: 'lower the review cap for this session (rv cap) or the floor', speak: 'recall only the phrases (not extras) or drop the closing questions on long days',
    listen: 'lower the listen limit', answer: 'ask 4 questions instead of 6', dialogue: 'play the conversation once, then only "be the traveler"', meaning: 'hear only today\'s phrases, not the extras' };
  flags.filter(f => f.total > MAX).forEach(f => { const top = f.steps.slice().sort((a, b) => b.sec - a.sec).slice(0, 2);
    report.info(`proposal for ${f.title} (${f.total.toFixed(1)} min): ` + top.map(s => `${s.kind} takes ${(s.sec / 60).toFixed(1)} min → ${tip[s.kind] || 'shorten this step'}`).join('; ')); });
  if (flags.some(f => f.total > MAX)) report.fail('sessions over ' + MAX + ' minutes');
  if (process.env.SJ_MINUTES_STRICT && flags.length) report.fail('learning days under ' + MIN_LEARN + ' minutes');
}, { noBrowser: true });
