// audio: every clip Drive mode can request exists in audio/index.json, and each clip's byte range lies inside its MP3 file
// and starts on an MP3 frame header.
// Two passes: (1) static: every key driveScript() could build for any deck item, staff item, piece and coach line;
// (2) dynamic: driveScript('review'|'preview', 30) at every point of the course, keys collected from the real scripts.
// Optional clips (new-word clips and staff replies, which Drive skips when absent) are reported, not failed.
const fs = require('fs'), path = require('path');
const { run, REPO } = require('./lib');

run('audio', async ({ page, report }) => {
  const dir = path.join(REPO, 'audio'), meta = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  const sizes = {}, bufs = {};
  let bad = 0;
  for (const [k, c] of Object.entries(meta.clips)) {
    const [file, off, len, frames] = c;
    if (!(file in bufs)) { const f = path.join(dir, file); bufs[file] = fs.existsSync(f) ? fs.readFileSync(f) : null; sizes[file] = bufs[file] ? bufs[file].length : -1; }
    const b = bufs[file];
    const why = !b ? 'file missing' : !(off >= 0 && len > 0 && off + len <= b.length) ? 'byte range outside file' : !(frames > 0) ? 'no frames'
      : !(b[off] === 0xff && (b[off + 1] & 0xe0) === 0xe0) ? 'does not start on an MP3 frame' : '';
    if (why) { bad++; if (bad <= 20) report.fail(`clip ${k}: ${why}`); }
  }
  if (!meta.silence || !Buffer.from(meta.silence, 'base64').length) report.fail('index.json has no silence frame');
  report.info(`${Object.keys(meta.clips).length} clips in ${Object.keys(sizes).length} files (${Object.entries(sizes).map(([f, s]) => f + ' ' + s).join(', ')}); ${bad} bad`);
  const unused = new Set(Object.keys(meta.clips));

  const r = await page.evaluate(async () => {
    await driveLoad();
    const need = new Map(), opt = new Map(), add = (m, k, why) => { if (!m.has(k)) m.set(k, why); };
    Object.values(DRP).forEach(t => add(need, DRK.c(t), 'coach line'));
    deck.forEach(c => {
      if (c.staff) { add(need, DRK.k(c.ro), 'staff ' + c.id); add(need, DRK.e(c.en), 'staff meaning ' + c.id); if (c.reply && !c.reply.startsWith('(')) add(opt, DRK.j(c.reply), 'staff reply ' + c.id); return; }
      add(need, DRK.j(c.ro), c.id); add(need, DRK.e(c.en), 'meaning ' + c.id); add(need, DRK.s(c.ro), 'slow ' + c.id);
      const parts = PARTS[c.ro] ? partsOf(c.ro) : [];
      if (parts.length > 1 || (parts.length === 1 && /sound it out/.test(parts[0][2]))) parts.forEach(x => { if (!/sound it out|the whole phrase/.test(x[2])) add(need, DRK.e(x[2]), 'piece meaning ' + c.id); add(need, DRK.s(x[0]), 'piece ' + c.id); });
      if (!c.word) newWordsFor(c.id, c.ro).forEach(w => { if (dclip(DRK.w(w.ro))) add(need, DRK.e(w.en), 'word meaning ' + w.ro); else add(opt, DRK.w(w.ro), 'new word in ' + c.id); });
    });
    // dynamic: the real scripts at every point of the course
    const keep = { PLAN, player }, used = new Set(), missingDyn = new Map();
    const q = baseQueue(), log = [];
    for (let i = 0; i <= q.length; i += 1) {
      PLAN = { queue: baseQueue(), pos: i, log: log.slice(), focus: {}, lastAdjust: null }; player = null;
      for (const mode of ['review', 'preview']) for (let rep = 0; rep < 2; rep++) driveScript(mode, 30).forEach(s => { if (s.k) { used.add(s.k); if (!dclip(s.k)) missingDyn.set(s.k, `W${(q[i] || q[q.length - 1]).w + 1} ${mode}`); } });
      if (q[i]) log.push({ date: iso(new Date(2026, 10, 14 + i)), key: skey(q[i]), w: q[i].w, d: q[i].d, rating: 'ok' });
    }
    PLAN = keep.PLAN; player = keep.player;
    const miss = m => [...m].filter(([k]) => !dclip(k));
    return { need: need.size, opt: opt.size, missNeed: miss(need), missOpt: miss(opt), missingDyn: [...missingDyn], used: [...used], keys: [...need.keys(), ...opt.keys()] };
  });
  r.keys.concat(r.used).forEach(k => unused.delete(k));
  r.missNeed.forEach(([k, why]) => report.fail(`missing clip ${k} (${why})`));
  r.missingDyn.forEach(([k, where]) => report.fail(`drive script asked for missing clip ${k} (${where})`));
  report.info(`static: ${r.need} required keys, ${r.missNeed.length} missing; dynamic: ${r.used.length} distinct keys requested, ${r.missingDyn.length} missing`);
  report.info(`optional clips missing (Drive skips them): ${r.missOpt.length}${r.missOpt.length ? ' e.g. ' + r.missOpt.slice(0, 8).map(([k, w]) => `${k} (${w})`).join(', ') : ''}`);
  report.info(`clips in index.json that Drive never requests: ${unused.size}${unused.size ? ' e.g. ' + [...unused].slice(0, 8).join(', ') : ''}`);
});
