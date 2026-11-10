// timing (rule 5): with stubbed clip lengths (the fake <audio> "plays" each clip for its length in audio/index.json at the Voice speed),
// a learner does the first sessions of the plan hands-free with Time to answer = 5 s and Voice speed = 90%. Asserts:
//  - no two voices overlap, and no clip or text-to-speech line starts before the previous one ended
//  - every "your turn" pause equals the slider-based value: Time to answer + the length of the expected answer's clip at this speed
//    (or ~0.2 s per character for unrecorded lines), at most 16 s; and nothing is spoken during a pause
const fs = require('fs'), path = require('path');
const { run, openPage, REPO } = require('./lib');
const { walkCourse } = require('./walker');
const GAP = 5, VRATE = 0.9, SESSIONS = +(process.env.SJ_TIMING_SESSIONS || 6);

run('timing', async ({ report }) => {
  const meta = JSON.parse(fs.readFileSync(path.join(REPO, 'audio', 'index.json'), 'utf8'));
  const expected = (key, text) => { const c = key && meta.clips[key]; const say = c ? c[3] * meta.frame * 1000 / VRATE : String(text || '').length * 200 * Math.max(1, 1 / VRATE); return Math.min(16000, Math.round(GAP * 1000 + say)); };
  const { browser, page, errors } = await openPage({ time: new Date(2026, 10, 14, 8), storage: { trip: '2026-12-17', autoNext: true, gap: GAP, vrate: VRATE } });
  const install = p => p.evaluate(() => { window.__turns = []; const orig = yourTurn; window.yourTurn = function (L) { window.__turns.push({ ms: turnMs(L), at: Date.now(), key: L && L.key || null, text: L && L.text || '' }); return orig.apply(this, arguments); }; });
  let voices = 0, pauses = 0, overlaps = [], early = [], badPause = [], talkInPause = [];
  const r = await walkCourse(page, { start: '2026-11-14', report, errors, afterLoad: install, maxSessions: SESSIONS,
    onSession: async ({ page: p, title }) => {
      const d = await p.evaluate(() => { const x = { clips: window.__clipLog || [], tts: window.__ttsLog || [], turns: window.__turns || [] }; window.__clipLog = []; window.__ttsLog = []; window.__turns = []; return x; });
      const all = d.clips.map(c => ({ ...c, what: c.key })).concat(d.tts.map(t => ({ ...t, what: 'tts:' + t.text }))).sort((a, b) => a.start - b.start);
      voices += all.length;
      for (let i = 1; i < all.length; i++) { const a = all[i - 1], b = all[i]; if (a.end == null) overlaps.push(`${title}: ${a.what} never ended before ${b.what}`); else if (b.start < a.end) (a.cut ? early : overlaps).push(`${title}: ${b.what} started ${a.end - b.start} ms before ${a.what} ended`); }
      d.turns.forEach(t => { pauses++; const want = expected(t.key, t.text); if (t.ms !== want) badPause.push(`${title}: pause for ${t.key || t.text} is ${t.ms} ms, expected ${want}`);
        const inside = all.find(v => v.start > t.at && v.start < t.at + t.ms - 1); if (inside) talkInPause.push(`${title}: ${inside.what} spoke ${inside.start - t.at} ms into a ${t.ms} ms pause`); });
    } });
  await browser.close();
  report.info(`${r.sessions} sessions: ${voices} voice lines, ${pauses} your-turn pauses checked (Time to answer ${GAP} s, Voice speed ${VRATE * 100}%)`);
  overlaps.slice(0, 10).forEach(m => report.fail('overlap: ' + m));
  early.slice(0, 10).forEach(m => report.fail('started before the previous voice ended: ' + m));
  badPause.slice(0, 10).forEach(m => report.fail(m));
  talkInPause.slice(0, 10).forEach(m => report.fail('spoke during a pause: ' + m));
  if (!overlaps.length && !early.length) report.info('no overlaps; every line started after the previous one ended');
  if (!badPause.length && !talkInPause.length) report.info('every your-turn pause matched the slider-based value, with silence during it');
}, { noBrowser: true });
