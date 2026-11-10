// doses: new words and new items per learning day for all 10 weeks (product rule 6), using the app's newToday() counting.
// Flags days with more than 7 new words or more than 12 new items (words + phrases + staff phrases). Reports only; never fails
// on a flag (set SJ_DOSES_STRICT=1 to fail on flags).
const { run } = require('./lib');
const MAX_WORDS = 7, MAX_ITEMS = 12;

run('doses', async ({ page, report }) => {
  const rows = await page.evaluate(() => {
    const out = [];
    for (let w = 0; w < 10; w++) for (let d = 0; d < learnDays(w); d++) {
      const st = stagesFor(w, d), txt = newToday(st);
      const m = /(\d+) words?, (\d+) phrases?/.exec(txt) || [0, 0, 0];
      const learn = st.filter(s => s.kind === 'learn');
      out.push({ w, d, words: +m[1], phrases: +m[2], txt, min: st.reduce((a, s) => a + (s.min || 0), 0),
        parts: learn.map(s => `${s.staff ? 'staff' : s.ids.every(id => byId(id).word) ? 'extras' : 'phrases'}:${s.ids.length}`).join(' ') });
    }
    return out;
  });
  const flagged = [];
  let lastW = -1;
  rows.forEach(r => {
    const items = r.words + r.phrases, tag = `W${r.w + 1}D${r.d + 1}`;
    const over = [r.words > MAX_WORDS ? `>${MAX_WORDS} words` : '', items > MAX_ITEMS ? `>${MAX_ITEMS} items` : ''].filter(Boolean);
    if (over.length) flagged.push(tag);
    if (r.w !== lastW) { lastW = r.w; }
    report.info(`${tag.padEnd(6)} words ${String(r.words).padStart(2)}  phrases ${String(r.phrases).padStart(2)}  items ${String(items).padStart(2)}  ~${String(r.min).padStart(2)} min  [${r.parts}]${over.length ? '   <-- ' + over.join(', ') : ''}`);
  });
  report.info(`flagged: ${flagged.join(', ') || 'none'}`);
  if (process.env.SJ_DOSES_STRICT && flagged.length) report.fail('days over the dose limits: ' + flagged.join(', '));
});
