// walk: a fresh learner follows the plan from day 1 (Sat Nov 14 2026, flight Dec 17), doing what Today offers each day
// (the planned sessions), clicking like a user; asserts no page errors, every session finishes, and the course completes by Dec 16.
// Modes (SJ_WALK_MODE):
//   manual (default)  auto-advance off; the learner answers quizzes/reviews and taps Next step (confirming Skip on unfinished steps).
//   auto              auto-advance on; the learner never taps Next: steps finish on their own (fake clock run forward) and the
//                     "Next: …" countdown moves on. Only interactive steps are answered (quiz, drill, build, intro, self-check); the
//                     review and guided Speak need no taps and the rating is taken from its countdown. (See walker.js.)
// Options: SJ_WALK_DAYS=n (days to walk; default until complete), SJ_WALK_START=YYYY-MM-DD, SJ_WALK_TRIP=YYYY-MM-DD (default 2026-12-17),
//          SJ_WALK_HARD=n (rate every n-th session Hard), SJ_WALK_VERBOSE=1
const { run, openPage } = require('./lib');
const { walkCourse } = require('./walker');
const MODE = process.env.SJ_WALK_MODE || 'manual', AUTO = MODE === 'auto';
const DAYS = +(process.env.SJ_WALK_DAYS || 0), HARD = +(process.env.SJ_WALK_HARD || 0), VERBOSE = !!process.env.SJ_WALK_VERBOSE;
const [Y, M, D] = (process.env.SJ_WALK_START || '2026-11-14').split('-').map(Number);
const TRIP = process.env.SJ_WALK_TRIP || '2026-12-17', LAST = (() => { const d = new Date(TRIP + 'T12:00'); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })();
const day = i => new Date(Y, M - 1, D + i, 9, 0, 0);

run('walk:' + MODE, async ({ report }) => {
  const { browser, page, errors } = await openPage({ time: new Date(day(0).getTime() - 3600e3), storage: { trip: TRIP, autoNext: AUTO } }); // pauseAt must move forward
  const t0 = Date.now();
  const r = await walkCourse(page, { mode: MODE, start: `${Y}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}`, days: DAYS, hard: HARD, verbose: VERBOSE, report, errors, rateTap: MODE === 'manual' });
  report.info(`${r.sessions} sessions in ${((Date.now() - t0) / 1000).toFixed(1)}s; last session ${r.last}; ${AUTO ? r.autoMoves + ' auto-advances' : r.skips + ' steps skipped via the prompt'}`);
  if (!DAYS && !r.complete) report.fail('course not complete');
  if (!DAYS && r.last && r.last > LAST) report.fail(`last session ${r.last} is after ${LAST}`);
  if (r.err) report.fail('app recorded an error: ' + r.err.where + ': ' + r.err.msg);
  await browser.close();
}, { noBrowser: true });
