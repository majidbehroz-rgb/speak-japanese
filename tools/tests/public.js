// public: the public build (index.html in the repo) carries no private strings, no analytics and an empty CFG (product rule 12).
// Also proves the checker works by running it on the private build when one exists (it must be flagged there).
// Matches are never printed, only what kind of string was found.
// Env: SJ_CFG (private CFG paths to compare against, colon separated; default the two files in /home/claude/private/)
const fs = require('fs'), path = require('path');
const { run, REPO } = require('./lib');
const CFGS = (process.env.SJ_CFG || '/home/claude/private/cfg.js:/home/claude/private/cfg.v42.js').split(':').filter(f => fs.existsSync(f));
const PRIVATE_BUILD = process.env.SJ_PRIVATE_OUT || '/home/claude/out/japan-trainer.html';

function problems(html) {
  const out = [];
  const rx = [
    [/discord(?:app)?\.com\/(?:channels|api\/webhooks)\/\d{15,}/i, 'Discord channel/webhook link'],
    [/discord\.gg\/\w/i, 'Discord invite link'],
    [/claude\.ai\/(?:code\/)?artifacts?\/[\w-]/i, 'claude.ai artifact link'],
    [/\/\*CFG\*\//, 'private CFG marker'],
    [/google-analytics|googletagmanager|gtag\(|plausible\.io|segment\.(?:io|com)|mixpanel|hotjar|clarity\.ms|umami/i, 'analytics'],
  ];
  rx.forEach(([r, what]) => { if (r.test(html)) out.push(what); });
  const m = /const CFG=\{[^\n]*?\};/.exec(html);
  if (!m) out.push('CFG line missing');
  else {
    const c = m[0];
    ['start', 'trip', 'appLink'].forEach(k => { const v = new RegExp(k + ':"([^"]*)"').exec(c); if (!v || v[1]) out.push(`CFG.${k} not empty`); });
    if (!/ch:\{\}/.test(c)) out.push('CFG.ch not empty');
    if (!/pub:true/.test(c)) out.push('CFG.pub not true');
  }
  for (const f of CFGS) {
    const pc = fs.readFileSync(f, 'utf8'), pub = (/publicLink:"([^"]*)"/.exec(pc) || [])[1];
    for (const u of pc.match(/"https?:\/\/[^"]+"/g) || []) { const url = u.slice(1, -1); if (url !== pub && html.includes(url)) out.push(`a URL from ${path.basename(f)}`); }
    for (const k of ['start', 'trip']) { const v = (new RegExp(k + ':"([^"]+)"').exec(pc) || [])[1]; if (v && html.includes(`"${v}"`)) out.push(`the ${k} date from ${path.basename(f)}`); }
  }
  return [...new Set(out)];
}

run('public', async ({ report }) => {
  const html = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');
  const p = problems(html);
  p.forEach(x => report.fail('index.html contains: ' + x));
  if (!p.length) report.info(`index.html clean (checked against ${CFGS.length} private CFG file(s))`);
  if (fs.existsSync(PRIVATE_BUILD)) {
    const q = problems(fs.readFileSync(PRIVATE_BUILD, 'utf8'));
    if (q.length) report.info(`checker self-test: private build flagged as expected (${q.length} kinds)`);
    else report.fail('checker self-test: the private build was NOT flagged; the checks are too weak');
  } else report.info('checker self-test skipped (no private build at ' + PRIVATE_BUILD + ')');
}, { noBrowser: true });
