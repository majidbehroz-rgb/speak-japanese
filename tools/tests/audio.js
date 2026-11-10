// audio: every clip Drive mode can request exists in audio/index.json, and each clip's byte range lies inside its MP3 file
// and starts on an MP3 frame header.
// Two passes: (1) static: every key driveScript() could build for any deck item, staff item, piece and coach line;
// (2) dynamic: driveScript('review'|'preview', 30) at every point of the course, keys collected from the real scripts.
// Optional clips (new-word clips and staff replies, which Drive skips when absent) are reported, not failed.
// (3) lessons: a learner walks the whole plan (fake clock, fake <audio>); every line the app says is logged with its step and whether it
// resolves to a recorded clip or to text-to-speech. Every line that names a clip must have one (100%), and the steps that must be
// fully recorded (learn, meaning, warm, sayback, review, quiz, cards, listen, guided Speak except its closing questions) may not use
// text-to-speech at all. Rule 4: when a Japanese clip plays, the romaji visible in the player matches the clip's romaji.
// The text-to-speech lines (the phase-4 recording list) are printed by category and written to /home/claude/out/tts-needed.json,
// from the walk plus a full static listing (all conversation lines, questions and answers, introduction, build combinations, drills).
const fs = require('fs'), path = require('path');
const { run, REPO, openPage } = require('./lib');
const { walkCourse, playThrough } = require('./walker');
const TTS_OUT = process.env.SJ_TTS_OUT || '/home/claude/out/tts-needed.json';
const RECORDED_STEPS = new Set(['learn', 'meaning', 'warm', 'sayback', 'review', 'quiz', 'cards', 'listen', 'speak']);
// lines being recorded now (conversation, questions/answers, introduction, build sentences): they name their clip (k: for the other
// speaker, j: for the learner) and use text-to-speech until it exists
const TO_RECORD = new Set(['dialogue', 'qa', 'intro', 'build']);

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
      if (c.num) return;   // number/time words: recordings pending (see pendingLines)
      if (c.staff) { add(need, DRK.k(c.ro), 'staff ' + c.id); add(need, DRK.e(c.en), 'staff meaning ' + c.id); if (c.reply && !c.reply.startsWith('(')) add(opt, DRK.j(c.reply), 'staff reply ' + c.id); return; }
      add(need, DRK.j(c.ro), c.id); add(need, DRK.e(c.en), 'meaning ' + c.id); add(need, DRK.s(c.ro), 'slow ' + c.id);
      const parts = PARTS[c.ro] ? partsOf(c.ro) : [];
      if (parts.length > 1 || (parts.length === 1 && /sound it out/.test(parts[0][2]))) parts.forEach(x => { if (!/sound it out|the whole phrase/.test(x[2])) add(need, DRK.e(x[2]), 'piece meaning ' + c.id); add(need, DRK.s(x[0]), 'piece ' + c.id); });
      if (!c.word) newWordsFor(c.id, c.ro).forEach(w => { if (dclip(DRK.w(w.ro))) add(need, DRK.e(w.en), 'word meaning ' + w.ro); else add(opt, DRK.w(w.ro), 'new word in ' + c.id); });
    });
    // dynamic: the real scripts at every point of the course
    const keep = { PLAN, player }, used = new Set(), missingDyn = new Map();
    const q = courseOrder(), log = [], realSrs = JSON.stringify(srsMap());
    for (let i = 0; i <= q.length; i += 1) {
      PLAN = { v: 2, queue: courseOrder(), pos: i, log: log.slice(), focus: {}, created: todayIso(), startedAt: todayIso(), choice: 'done' }; player = null;
      for (const mode of ['review', 'preview']) for (let rep = 0; rep < 2; rep++) driveScript(mode, 30).forEach(s => { if (s.k) { used.add(s.k); if (!dclip(s.k)) missingDyn.set(s.k, `W${(q[i] || q[q.length - 1]).w + 1} ${mode}`); } });
      if (q[i]) { if (isLearnDay(q[i])) srsLearn(sessionItems(q[i].w, q[i].d), todayIso()); log.push({ date: iso(new Date(2026, 10, 14 + i)), key: skey(q[i]), w: q[i].w, d: q[i].d, rating: 'ok' }); }
    }
    PLAN = keep.PLAN; player = keep.player; store.set('srs', JSON.parse(realSrs));
    const pend = new Set(pendingLines().map(x => x.key));   // new words waiting for a recording: Drive leaves them out until then
    const miss = m => [...m].filter(([k]) => !dclip(k) && !pend.has(k));
    return { need: need.size, opt: opt.size, missNeed: miss(need), missOpt: miss(opt), missingDyn: [...missingDyn], used: [...used], keys: [...need.keys(), ...opt.keys()] };
  });
  r.keys.concat(r.used).forEach(k => unused.delete(k));
  r.missNeed.forEach(([k, why]) => report.fail(`missing clip ${k} (${why})`));
  r.missingDyn.forEach(([k, where]) => report.fail(`drive script asked for missing clip ${k} (${where})`));
  report.info(`static: ${r.need} required keys, ${r.missNeed.length} missing; dynamic: ${r.used.length} distinct keys requested, ${r.missingDyn.length} missing`);
  report.info(`optional clips missing (Drive skips them): ${r.missOpt.length}${r.missOpt.length ? ' e.g. ' + r.missOpt.slice(0, 8).map(([k, w]) => `${k} (${w})`).join(', ') : ''}`);
  report.info(`clips in index.json that Drive never requests: ${unused.size}${unused.size ? ' e.g. ' + [...unused].slice(0, 8).join(', ') : ''}`);

  // (3) the lessons
  const L = await openPage({ time: new Date(2026, 10, 14, 8), storage: { trip: '2026-12-17', autoNext: true } });
  const norm = t => String(t || '').toLowerCase().replace(/[\[\]]/g, '').replace(/[.,!?…·]/g, ' ').replace(/\s+/g, ' ').trim();
  const lines = [], perSession = [];
  const install = page => page.evaluate(() => { window.__vlog = []; const orig = voice;
    window.voice = async function (Ln) { if (Ln && Ln.key && AX.state === 'loading') try { await Promise.race([AX.p, sleep(LOAD_MS)]); } catch (e) {}   // as voice() does: judge the line once the index is in
      const st = player ? player.stages[player.idx] : null;
      const k = lineKey(Ln), derived = k || (Ln && Ln.text ? (Ln.lang === 'en' ? 'e:' + sayable(Ln.text) : 'j:' + (Ln.ro || Ln.text)) : null);
      const rec = { step: st ? st.kind : 'screen', key: k || null, base: (Ln && Ln.key) || null, voice: Ln && Ln.voice, clip: !!(k && clipOf(k)), derived, derivedClip: !!(derived && (clipOf(derived) || clipOf(derived.toLowerCase()))), text: Ln && Ln.text, ro: Ln && Ln.ro, cat: Ln && Ln.cat, lang: Ln && Ln.lang };
      if (rec.clip && /^[jswk]:/.test(rec.key)) rec.shown = [...document.querySelectorAll('.player .ro')].filter(e => e.offsetParent && getComputedStyle(e).visibility !== 'hidden').map(e => e.textContent);
      window.__vlog.push(rec); return orig.apply(this, arguments); }; });
  const r3 = await walkCourse(L.page, { start: '2026-11-14', report, errors: L.errors, afterLoad: install,
    onSession: async ({ page, title, date }) => { const v = await page.evaluate(() => { const x = window.__vlog || []; window.__vlog = []; return x; });
      v.forEach(x => { x.where = title; lines.push(x); }); perSession.push([date, title, v.length, v.filter(x => x.clip).length, v.filter(x => !x.clip).length]); } });
  // the optional More-practice sessions of every week (reached from Lessons, after the course)
  const more = await L.page.evaluate(() => { const out = []; for (let w = 0; w < 10; w++) for (let d = learnDays(w); d < USE_D; d++) out.push([w, d]); return out; });
  for (const [w, d] of more) {
    await L.page.evaluate(([w, d]) => playSession(w, d), [w, d]);
    const title = await L.page.evaluate(([w, d]) => sessionName({ w, d }), [w, d]);
    const kinds = await playThrough(L.page, report, title);
    const v = await L.page.evaluate(() => { const x = window.__vlog || []; window.__vlog = []; return x; });
    v.forEach(x => { x.where = title; lines.push(x); }); perSession.push(['more', title + ' (' + kinds.join(' > ') + ')', v.length, v.filter(x => x.clip).length, v.filter(x => !x.clip).length]);
  }
  await L.browser.close();
  report.info(`lessons: ${r3.sessions} sessions walked plus ${more.length} More-practice sessions, ${lines.length} lines spoken`);
  perSession.forEach(([d, t, n, c, tts]) => report.info(`  ${d} ${t}: ${n} lines · ${c} recorded · ${tts} text-to-speech`));
  // lines waiting for a recording (phase 4: number/time words, the numbers demonstration, drill values): text-to-speech until recorded
  const pending = await page.evaluate(() => pendingLines());
  const pendKeys = new Set(pending.map(x => x.key));
  lines.forEach(x => { if (x.key && !x.clip && pendKeys.has(x.key)) x.cat = x.cat === 'drill' || x.cat === 'demo' ? x.cat : 'pending'; x.pending = !!(x.key && !x.clip && pendKeys.has(x.key)); });
  report.info(`waiting for a recording (allowed, text-to-speech until recorded): ${new Set(lines.filter(x => x.pending).map(x => x.key)).size} distinct lines heard in the walk, ${pending.length} in all`);
  const missingKey = lines.filter(x => x.key && !x.clip && x.cat !== 'staff-word' && !x.pending && !TO_RECORD.has(x.cat));
  // the other speaker (conversation speaker A, the questions) names a k: clip and falls back to j: for the same romaji, then text-to-speech;
  // the learner's lines name j:
  const kBad = lines.filter(x => TO_RECORD.has(x.cat) && x.lang === 'ja' && x.base && (x.voice === 'other' ? !(x.base === 'k:' + x.ro && (x.key === x.base || x.key === 'j:' + x.ro)) : !(x.base === 'j:' + x.ro && x.key === x.base)));
  [...new Set(kBad.map(x => `${x.base} → ${x.key} (${x.voice}, ${x.cat}: ${x.ro})`))].slice(0, 20).forEach(k => report.fail('wrong voice key: ' + k));
  const oth = lines.filter(x => x.voice === 'other'), lrn = lines.filter(x => x.voice === 'learner');
  report.info(`voices: ${oth.length} other-speaker lines heard (${oth.filter(x => /^k:/.test(x.key) && x.clip).length} k: clips, ${oth.filter(x => /^j:/.test(x.key)).length} j: fallbacks, ${oth.filter(x => !x.clip).length} text-to-speech); ${lrn.length} learner lines on j:; ${kBad.length} wrong`);
  if (!oth.length) report.fail('no other-speaker (k:) line was heard in the walk');
  const staffWords = [...new Set(lines.filter(x => x.cat === 'staff-word').map(x => x.key))];
  report.info(`not recorded yet (taught as single words before staff phrases; text-to-speech for now): ${staffWords.length} lines: ${staffWords.join(', ')}`);
  [...new Set(missingKey.map(x => `${x.key} (${x.step})`))].slice(0, 30).forEach(k => report.fail('line names a clip that does not exist: ' + k));
  // with the default profile every lesson line has a recording: text-to-speech while a clip exists for the line's derived key is a bug,
  // and so is a line with no clip at all
  const ttsWithClip = lines.filter(x => !x.clip && x.derivedClip), noClip = lines.filter(x => !x.clip && !x.derivedClip);
  [...new Set(ttsWithClip.map(x => `${x.step}/${x.cat}: ${x.derived} (spoken as ${x.key || 'no key'})`))].slice(0, 30).forEach(k => report.fail('text-to-speech although a clip exists: ' + k));
  [...new Set(noClip.map(x => `${x.step}/${x.cat}: ${x.derived || x.text}`))].slice(0, 30).forEach(k => report.fail('lesson line with no recording: ' + k));
  report.info(`text-to-speech lines in the whole walk (More practice included): ${lines.filter(x => !x.clip).length} (${ttsWithClip.length} with a clip available, ${noClip.length} with none)`);
  const ttsInRecorded = lines.filter(x => !x.clip && RECORDED_STEPS.has(x.step) && !(x.step === 'speak' && x.cat === 'qa') && x.cat !== 'staff-word' && !x.pending);
  [...new Set(ttsInRecorded.map(x => `${x.step}: ${x.text}`))].slice(0, 30).forEach(k => report.fail('text-to-speech in a recorded step: ' + k));
  const rec = lines.filter(x => RECORDED_STEPS.has(x.step) && !(x.step === 'speak' && x.cat === 'qa') && x.cat !== 'staff-word' && !x.pending);
  report.info(`recorded steps: ${rec.filter(x => x.clip).length} of ${rec.length} lines are clips (${(100 * rec.filter(x => x.clip).length / Math.max(1, rec.length)).toFixed(1)}%)`);
  // rule 4
  let r4 = { match: 0, hidden: 0, bad: [] };
  lines.filter(x => x.shown).forEach(x => { const want = norm(x.key.slice(2)); if (!x.shown.length) { r4.hidden++; return; } if (x.shown.some(t => norm(t) === want)) r4.match++; else r4.bad.push(`${x.key} shown [${x.shown.join(' | ')}] (${x.step}, ${x.where})`); });
  report.info(`rule 4: ${r4.match} Japanese clips played with their romaji on screen, ${r4.hidden} with the romaji hidden (prompt), ${r4.bad.length} mismatches`);
  [...new Set(r4.bad)].slice(0, 20).forEach(b => report.fail('on-screen romaji does not match the clip: ' + b));
  // the recording list: walk lines without a clip + a full static listing
  const st = await page.evaluate(() => { const out = [], add = (kind, jp, ro, en, where, who) => { const L = LN.tts(jp, 'ja', kind, ro, who); out.push({ kind, key: lineKey(L), voice: L.voice, jp, ro, en, where }); };
    WEEKS.forEach((W, w) => { W.dialogue.forEach((l, i) => { const L = dlgLine(l); out.push({ kind: 'dialogue', key: lineKey(L), voice: L.voice, jp: fill(l[1], 1), ro: fill(l[2], 0), en: fill(l[3], 2), where: `W${w + 1} conversation line ${i + 1} (${l[0]})` }); }); });
    QA.forEach((q, i) => { add('qa', fill(q.q[1], 1), fill(q.q[0], 0), fill(q.q[2], 2), `W${q.w + 1} question ${i + 1}`, 'other'); add('qa', fill(q.a[1], 1), fill(q.a[0], 0), fill(q.a[2], 2), `W${q.w + 1} answer ${i + 1}`); out.push({ kind: 'qa', key: 'e:' + sayable(fill(q.a[2], 2)), jp: '', ro: '', en: sayable(fill(q.a[2], 2)), where: `W${q.w + 1} answer cue ${i + 1}` }); });
    INTRO.forEach((l, i) => add('intro', fill(l[1], 1), fill(l[0], 0), fill(l[2], 2), 'introduction line ' + (i + 1)));
    const allTok = new Set(); deck.forEach(c => wordTok(c.ro).concat(TEACH_WITH[c.ro] || []).forEach(t => allTok.add(t))); const taughtEver = b => wordTok(b[0]).every(t => allTok.has(t));   // build sentences only ever use taught swap words
    WEEKS.forEach((W, w) => (W.patterns || []).forEach(p => { const xs = (BANK[p.x] || []).filter(taughtEver), ys = p.y ? BANK[p.y].filter(taughtEver) : [null]; xs.forEach(x => ys.forEach(y => { const sub = (s, k) => s.replace('{x}', '[' + x[k] + ']').replace('{y}', y ? '[' + y[k] + ']' : ''); add('build', sub(p.jp, 1), sub(p.ro, 0), sub(p.en, 2), `W${w + 1} pattern ${p.ro}`); })); }));
    for (let v = 1; v < 100; v++) { const j = jaNum(v); out.push({ kind: 'drill', key: 'j:' + j.r, jp: j.k, ro: j.r, en: String(v), where: 'numbers drill' }); }
    [120, 150, 280, 300, 380, 500, 600, 750, 800, 980, 1200, 1500, 1800, 2400, 3000, 3600, 4800, 6000, 8000, 8800, 9500, 12000, 15000, 26000].forEach(v => { const j = jaNum(v); out.push({ kind: 'drill', key: 'j:' + j.r + ' en', jp: j.k + 'えん', ro: j.r + ' en', en: '¥' + v, where: 'prices drill' }); });
    for (let h = 1; h <= 12; h++) for (const half of [false, true]) out.push({ kind: 'drill', key: 'j:' + HOURR[h] + '-ji' + (half ? ' han' : ''), jp: HOURK[h] + 'じ' + (half ? 'はん' : ''), ro: HOURR[h] + '-ji' + (half ? ' han' : ''), en: h + ':' + (half ? '30' : '00'), where: 'time drill' });
    return out; });
  const need = new Map();
  pending.forEach(x => need.set(x.kind + '|' + x.key, x));
  st.filter(x => x.kind !== 'drill').forEach(x => need.set(x.kind + '|' + x.key, x));
  lines.filter(x => !x.clip).forEach(x => { const kind = x.cat || 'other', key = x.key || ((x.lang === 'en' ? 'e:' : 'j:') + (x.ro || x.text)); if (!need.has(kind + '|' + key)) need.set(kind + '|' + key, { kind, key, voice: x.voice, jp: x.lang === 'en' ? '' : x.text, ro: x.ro || '', en: x.lang === 'en' ? x.text : '', where: x.where }); });
  // lines that already resolve to a recording (e.g. an other-speaker line falling back to a j: clip) are not on the list; the list has the
  // key each line will request; voice: "other" (staff voice, k:) or "learner" (everything else)
  const isClip = await page.evaluate(keys => keys.map(k => !!clipOf(k)), [...need.values()].map(x => x.key));
  [...need.keys()].forEach((k, i) => { if (isClip[i]) need.delete(k); });
  // one entry per key; English-only lines (e:, c:) first and marked, since they can be recorded right away
  const seen = new Set(), list = [...need.values()].filter(x => { if (seen.has(x.key)) return false; seen.add(x.key); return true; }).map(x => Object.assign({ englishOnly: /^[ec]:/.test(x.key) }, x, { voice: /^k:/.test(x.key) ? 'other' : 'learner' }))
    .sort((a, b) => (b.englishOnly - a.englishOnly));
  fs.mkdirSync(path.dirname(TTS_OUT), { recursive: true }); fs.writeFileSync(TTS_OUT, JSON.stringify(list, null, 1));
  const byCat = {}; list.forEach(x => byCat[x.kind] = (byCat[x.kind] || 0) + 1);
  const heard = {}; lines.filter(x => !x.clip).forEach(x => heard[x.cat || 'other'] = (heard[x.cat || 'other'] || 0) + 1);
  report.info('text-to-speech lines heard in the walk, by category: ' + Object.entries(heard).map(([k, n]) => `${k} ${n}`).join(', '));
  report.info(`recording list voices: ${list.filter(x => x.voice === 'other').length} other (k:), ${list.filter(x => x.voice === 'learner').length} learner`);
  report.info(`recording list (${list.length} distinct lines; ${list.filter(x => x.englishOnly).length} English-only first) by category: ` + Object.entries(byCat).map(([k, n]) => `${k} ${n}`).join(', ') + ` → ${TTS_OUT}`);
});