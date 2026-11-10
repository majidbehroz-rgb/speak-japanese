// Shared helpers for the Speak Japanese tests: a tiny static server, a Playwright page with fast fake speech, and reporting.
// Env: SJ_PAGE   path of the built page to serve as /index.html (default: <repo>/index.html; tools/test.sh --private sets it to the private build)
//      SJ_PORT   port (default 8765)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const REPO = path.resolve(__dirname, '..', '..');
const PAGE = process.env.SJ_PAGE || path.join(REPO, 'index.html');
const PORT = +(process.env.SJ_PORT || 8765);
const BASE = `http://localhost:${PORT}/index.html`;
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.mp3': 'audio/mpeg', '.js': 'text/javascript' };

function serve() {
  return new Promise((res, rej) => {
    const srv = http.createServer((req, rsp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const f = u === '/' || u === '/index.html' ? PAGE : path.join(REPO, path.normalize(u).replace(/^(\.\.[\/\\])+/, ''));
      if (!f.startsWith(REPO) && f !== PAGE) { rsp.writeHead(403); return rsp.end(); }
      fs.readFile(f, (e, buf) => {
        if (e) { rsp.writeHead(404); return rsp.end('not found'); }
        rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); rsp.end(buf);
      });
    });
    srv.on('error', rej);
    srv.listen(PORT, '127.0.0.1', () => res(srv));
  });
}

// Speech that finishes almost at once, so stages that talk move quickly. Only the browser's speechSynthesis is replaced;
// the app's own speak()/sleep() code paths stay as they are.
const FAST_SPEECH = `(() => {
  const ja = { name: 'Test ja', lang: 'ja-JP', localService: true, default: false, voiceURI: 'test-ja' };
  const en = { name: 'Test en', lang: 'en-US', localService: true, default: true, voiceURI: 'test-en' };
  const fake = { speaking: false, pending: false, paused: false, onvoiceschanged: null,
    getVoices() { return [ja, en]; }, cancel() { this.speaking = false; }, pause() {}, resume() {},
    speak(u) { this.speaking = true; setTimeout(() => { this.speaking = false; try { u.onend && u.onend({}); } catch (e) {} }, 5); },
    addEventListener() {}, removeEventListener() {} };
  try { Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true }); } catch (e) {}
  window.SpeechSynthesisUtterance = function (t) { this.text = t; this.lang = ''; this.rate = 1; this.voice = null; this.volume = 1; };
})();`;

async function openPage(opts = {}) {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()); // offline: no web fonts
  if (opts.fastSpeech !== false) await page.addInitScript(FAST_SPEECH);
  if (opts.initScript) await page.addInitScript(opts.initScript.fn, opts.initScript.arg);
  if (opts.time) await page.clock.install({ time: opts.time });
  if (opts.fixedTime) await page.clock.setFixedTime(opts.fixedTime);
  if (opts.storage) { // seed localStorage on the same origin before the app loads (values are stored as the app's store.set() does: JSON)
    await page.goto(BASE.replace(/index\.html$/, '__blank'));
    await page.evaluate(st => { localStorage.clear(); for (const k in st) localStorage.setItem('jp17:' + k, JSON.stringify(st[k])); }, opts.storage);
  }
  await page.goto(BASE);
  await page.waitForFunction(() => typeof stagesFor === 'function' && document.querySelector('#v-today').innerHTML.length > 0);
  return { browser, page, errors };
}

// run(name, async ({page, errors, report}) => ...) : serves, opens, runs, closes everything, sets the exit code.
async function run(name, fn, opts) {
  let srv, browser, failed = false;
  const report = { fail: m => { failed = true; console.log('  FAIL ' + m); }, info: m => console.log('  ' + m) };
  console.log(`== ${name}  (${path.relative(REPO, PAGE) || PAGE})`);
  try {
    srv = await serve();
    if (opts && opts.noBrowser) await fn({ report });
    else {
      const o = await openPage(opts); browser = o.browser;
      await fn({ page: o.page, errors: o.errors, report });
      if (o.errors.length) report.fail('page errors: ' + o.errors.slice(0, 5).join(' | '));
    }
  } catch (e) { report.fail('exception: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close().catch(() => {}); if (srv) srv.close(); }
  console.log(`== ${name}: ${failed ? 'FAIL' : 'PASS'}`);
  process.exitCode = failed ? 1 : 0;
}

// the owner's saved progress (never copied into the repo; read at run time)
function ownerKeys() {
  const f = process.env.SJ_STATE || '/home/claude/build-inputs/user-state.json';
  if (!fs.existsSync(f)) return null;
  const d = JSON.parse(fs.readFileSync(f, 'utf8')); return (d.data || d).keys || null;
}
// a plain summary of the plan as the app computes it
const planSummary = page => page.evaluate(() => { const S = planSchedule(), c = current();
  const wk = S.days.filter(d => { const g = _dt(d.date).getDay(); return (g === 0 || g === 6) && !d.off; });
  return { status: statusText(), next: c ? sessionName(c) : null, sessions: S.R, start: S.start, days: S.days.length, cut: S.cut, finalsKept: S.finalsKept, finish: S.finish, spare: S.spare,
    overflow: S.overflow, doubled: S.doubled, weekendDbl: S.weekendDbl, weekdayDbl: S.weekdayDbl, maxDay: Math.max(0, ...S.days.map(d => d.done + d.n)),
    weekendsAllTwo: wk.every(d => d.done + d.n >= 2), learned: new Set([...learnedIds(), ...staffKnown()]).size, v: PLAN.v, choice: PLAN.choice }; });
const lsSnapshot = page => page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])));

module.exports = { REPO, PAGE, BASE, serve, openPage, run, FAST_SPEECH, ownerKeys, planSummary, lsSnapshot };
