// state: the owner's real saved progress opens without errors and shows week 2, day 3 as the next session with 25 learned items
// (learned = learnedIds() plus staffKnown(), the set the spaced review draws from).
// This pins today's behaviour so later migrations can be compared. The progress file is read at run time from
// SJ_STATE (default /home/claude/build-inputs/user-state.json) and is never copied into the repo; only counts are printed.
// SJ_STATE_NOW=YYYY-MM-DD sets the fake clock (default 2026-11-10).
const fs = require('fs');
const { run } = require('./lib');
const FILE = process.env.SJ_STATE || '/home/claude/build-inputs/user-state.json';
const [Y, M, D] = (process.env.SJ_STATE_NOW || '2026-11-10').split('-').map(Number);
const EXPECT = { w: 1, d: 2, learned: 25 };

if (!fs.existsSync(FILE)) { console.log(`== state: SKIP (no progress file at ${FILE})`); process.exit(0); }
const doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const keys = ((doc.data || doc).keys) || {};

run('state', async ({ page, errors, report }) => {
  // store each key the way the app's store.set() does: localStorage "jp17:<key>" = JSON
  await page.evaluate(keys => { localStorage.clear(); for (const k in keys) localStorage.setItem('jp17:' + k, JSON.stringify(keys[k])); }, keys);
  await page.reload();
  await page.waitForFunction(() => typeof current === 'function' && document.querySelector('#v-today').innerHTML.length > 0);
  const s = await page.evaluate(() => {
    const c = current(), t = document.querySelector('#v-today').innerText;
    return { c, title: c ? sessionTitle(c) : null, learned: new Set([...learnedIds(), ...staffKnown()]).size, phrasesWords: learnedIds().size, pos: PLAN.pos, queue: PLAN.queue.length, log: PLAN.log.length,
      srs: Object.keys(srsAll()).length, due: dueCount(), startShown: !!document.querySelector('#start'), titleShown: c ? t.toLowerCase().includes(sessionTitle(c).toLowerCase()) : false,
      lastError: store.get('lastError', null) };
  });
  report.info(`next: ${s.title} (w${s.c && s.c.w + 1} d${s.c && s.c.d + 1}); learned ${s.learned} (${s.phrasesWords} phrases/words + ${s.learned - s.phrasesWords} staff); plan ${s.pos}/${s.queue}, ${s.log} logged; srs ${s.srs}, due ${s.due}; Start button ${s.startShown}`);
  if (!s.c || s.c.w !== EXPECT.w || s.c.d !== EXPECT.d) report.fail(`expected week ${EXPECT.w + 1}, day ${EXPECT.d + 1} next`);
  if (s.learned !== EXPECT.learned) report.fail(`expected ${EXPECT.learned} learned items, got ${s.learned}`);
  if (!s.titleShown) report.fail('Today screen does not show the next session title');
  if (s.lastError) report.fail('app recorded an error: ' + s.lastError.msg);
  // open the session and leave it, to make sure the saved progress drives a session without errors
  await page.click('#start'); await page.waitForTimeout(300);
  const st = await page.evaluate(() => player ? player.stages.map(x => x.kind).join(' > ') : null);
  report.info('session steps: ' + st);
  if (!st) report.fail('session did not start');
  await page.click('#pl-exit');
}, { time: new Date(Y, M - 1, D, 12, 0, 0) });
