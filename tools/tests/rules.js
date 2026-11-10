// rules: for every session of the course, in order, every Japanese word used outside a teaching step
// has been taught earlier in the course or earlier in that session (product rules 3 and 11).
// It walks the plan queue with the app's own data and helpers (stagesFor, LP, learnedIds, knownTokens, buildTalkItems, ...).
// Random picks are made exhaustive by swapping the page's takeSome() for "take everything" while the test runs.
// Documented exemptions (names, number words) are reported, not failed.
const { run } = require('./lib');

// SJ_RULES_SELFTEST=1 adds a line with an untaught word to week 1's conversation, to prove the check catches it.
run('rules', async ({ page, report }) => {
  const r = await page.evaluate(async (selftest) => { await audioIndex();
    if (selftest) WEEKS[0].dialogue.push(['A', '', 'Zettai muzukashii desu', 'self-test line']);
    const out = { violations: [], exempt: { name: {}, place: {}, number: {} }, sessions: 0, lines: 0, drills: [], untaughtInPhrases: {}, closing: 0, pairs: [] };
    const realTake = window.takeSome;
    window.takeSome = (a) => a.slice();
    localStorage.clear(); Object.keys(mem).forEach(k => delete mem[k]);
    const slotVals = { name: new Set(wordTok(val('name', 0))), place: new Set(wordTok(val('origin', 0))) };
    const q = courseOrder(), log = [];
    const isoDay = i => { const d = new Date(2026, 10, 14 + i); return iso(d); };
    const sessions = [];   // the v2 course order, with each week's optional More-practice sessions where they become available (after its learning days)
    q.forEach((s, i) => { if (isUseIt(s)) for (let d = learnDays(s.w); d < USE_D; d++) sessions.push({ s: { w: s.w, d }, i, more: true }); sessions.push({ s, i }); });
    try {
      for (const { s, i, more } of sessions) {
        const tag = s.d >= 7 ? `W10 final ${s.d - 6}` : more ? `W${s.w + 1} more ${s.d - learnDays(s.w) + 1}` : s.d === USE_D ? `W${s.w + 1} use-it` : `W${s.w + 1}D${s.d + 1}`;
        PLAN = { v: 2, queue: courseOrder(), pos: i, log: log.slice(), focus: {}, created: todayIso(), startedAt: todayIso(), choice: 'done', pending: null }; player = null;
        const stages = stagesFor(s.w, s.d);
        let before = [];
        out.sessions++;
        stages.forEach((st, si) => {
          if (st.kind === 'learn') { before = before.concat(st.ids); return; }
          player = { s, stages, idx: si, done: {}, learnIds: before.filter(id => !byId(id).staff) };
          const K = knownTokens(before);
          const where = `${tag} step ${si + 1} ${st.kind}`;
          const check = (line, what) => {
            if (!line) return; out.lines++;
            wordTok(String(line).replace(/\{[^}]*\}/g, ' ')).forEach(t => {
              if (K.has(t)) return;
              if (NAME_WORDS.has(t) || slotVals.name.has(t)) { out.exempt.name[t] = (out.exempt.name[t] || 0) + 1; return; }
              if (slotVals.place.has(t)) { out.exempt.place[t] = (out.exempt.place[t] || 0) + 1; return; }
              if (NUM_WORDS.test(t) || /^\d/.test(t)) { out.exempt.number[t] = (out.exempt.number[t] || 0) + 1; return; }
              out.violations.push(`${where}: "${t}" in ${what}: ${line}`);
            });
          };
          const item = (id, what) => { const c = byId(id); if (!c) return; check(c.ro, what); if (c.staff && c.reply && !c.reply.startsWith('(')) check(c.reply, what + ' (reply)'); };
          const W = WEEKS[st.w !== undefined && st.w !== 'all' ? st.w : s.w];
          switch (st.kind) {
            case 'review': case 'meaning': case 'sayback': case 'warm': (st.ids || []).forEach(id => item(id, st.kind)); break;
            case 'listen': listenSel = st.ids ? { ids: st.ids } : { w: String(st.w), half: st.half || 'all' }; buildListen().forEach(c => item(c.id, 'listen')); break;
            case 'quiz': {
              const items = st.ids.map(byId).filter(Boolean); items.forEach(c => item(c.id, 'quiz item'));
              const L = learnedIds();
              deck.filter(c => (L.has(c.id) && !!c.staff === !!(items[0] && items[0].staff)) || st.ids.includes(c.id)).forEach(c => item(c.id, 'quiz option'));
              break;
            }
            case 'dialogue': case 'roleplay':
              WEEKS[st.w].dialogue.forEach(l => check(fill(l[2], 0), 'conversation'));
              wordsFor(st.w).forEach(h => check(h.ro, 'extra-words panel'));
              break;
            case 'answer':
              talk = { mode: 'answer', max: st.max, only: st.only, hide: !!st.hide };
              buildTalkItems().forEach(x => { check(fill(x.q[0], 0), 'question'); check(fill(x.a[0], 0), 'answer'); });
              if (st.only) wordsFor(st.max).forEach(h => check(h.ro, 'extra-words panel'));
              break;
            case 'build': {
              talk = { mode: 'build', max: st.max, only: st.only, hide: false };
              let pats = WEEKS.flatMap(w => w.patterns || []).filter(p => talk.only ? p.w === talk.max : p.w <= talk.max);
              if (!pats.length) pats = WEEKS.flatMap(w => w.patterns || []).filter(p => p.w <= talk.max);
              const KW = knownWords();
              const cands = (p, slot) => { const known = BANK[slot].filter(b => KW.has(b[0])); if (known.length) return known; const intro = swapWords(p.w).filter(x => x.slot === slot).map(x => [x.ro, x.jp, x.en]); return intro.length ? intro : BANK[slot].slice(0, 4); };
              pats.forEach(p => { check(p.ro.replace(/\{[xy]\}/g, ' '), 'build pattern'); cands(p, p.x).forEach(x => check(x[0], 'build swap word')); if (p.y) cands(p, p.y).forEach(y => check(y[0], 'build swap word')); });
              break;
            }
            case 'drill': out.drills.push(`${tag} ${st.drill}`); break;
            case 'speak': { (st.ids || []).forEach(id => item(id, 'guided speak'));
              // the closing exchange: every question/answer pair the app may pick (all of them, not a random 3)
              const k = knownTokens(player.learnIds); wordTok(val('name', 0) + ' ' + val('origin', 0)).forEach(t => k.add(t)); QA.filter(q => q.w <= st.w && lineKnown(fill(q.q[0], 0), k) && lineKnown(fill(q.a[0], 0), k)).forEach(q => { out.closing++; check(fill(q.q[0], 0), 'closing question'); check(fill(q.a[0], 0), 'closing answer'); });
              break; }
            case 'intro': INTRO.forEach(l => check(fill(l[0], 0), 'introduction')); break;
            case 'cards': out.violations.push(`${where}: stage kind "cards" is not covered by this test`); break;
            case 'tip': case 'selfcheck': case 'rate': case 'sound': break;
            default: out.violations.push(`${where}: unknown stage kind "${st.kind}"`);
          }
        });
        player = null;
        if (!more) { srsLearn(stages.filter(x => x.kind === 'learn').flatMap(x => x.ids), todayIso()); log.push({ date: isoDay(i), key: skey(s), w: s.w, d: s.d, rating: 'ok' }); }
      }
      // pairs (Hai / Iie …) must be prompted one member at a time: every slash item resolves to members with their own clips
      deck.filter(c => !c.staff && / \/ /.test(c.ro)).forEach(c => { const m = membersOf(c); out.pairs.push(c.ro + (m ? ' → ' + m.map(x => x.ja.key + '+' + x.enL.key).join(', ') : ' → NO MEMBERS')); if (!m) out.violations.push(`pair ${c.ro} is not split into members`); });
      // informational: words inside phrases that never get a single-word teaching step (no WORDS entry)
      deck.filter(c => !c.word).forEach(c => wordTok(c.ro + ' ' + (c.staff && c.reply && !c.reply.startsWith('(') ? c.reply : '')).forEach(t => {
        if (WORD_FIRST[t] == null && !WORDS[t] && !NAME_WORDS.has(t) && !NUM_WORDS.test(t) && !/^\d/.test(t)) (out.untaughtInPhrases[t] = out.untaughtInPhrases[t] || []).push(c.id);
      }));
    } finally { window.takeSome = realTake; localStorage.clear(); Object.keys(mem).forEach(k => delete mem[k]); }
    out.violations = [...new Set(out.violations)];
    return out;
  }, !!process.env.SJ_RULES_SELFTEST);
  report.info(`${r.sessions} sessions, ${r.lines} on-screen lines checked; ${r.closing} closing-exchange candidates checked`);
  report.info('pairs: ' + r.pairs.join(' | '));
  const ex = o => Object.entries(o).map(([t, n]) => `${t}×${n}`).join(', ') || 'none';
  report.info(`exempt (names): ${ex(r.exempt.name)}`);
  report.info(`exempt (place slot): ${ex(r.exempt.place)}`);
  report.info(`exempt (number words, to be taught in phase 4): ${ex(r.exempt.number)}`);
  report.info(`number/price/time drills (exempt): ${r.drills.join(', ') || 'none'}`);
  const ut = Object.entries(r.untaughtInPhrases);
  report.info(`info: ${ut.length} tokens appear only inside phrases (no single-word step): ` + ut.slice(0, 40).map(([t, ids]) => `${t}(${ids[0]})`).join(' '));
  r.violations.forEach(v => report.fail(v));
  if (!r.violations.length) report.info('no untaught words outside teaching steps');
});
