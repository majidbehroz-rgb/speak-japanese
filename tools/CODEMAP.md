# Code map

The page is one classic `<script>`. Every top-level `const`/`let`/`function` is global and shared across parts. The order matters
for `const`/`let` values computed at load (for example `LP` needs `WORDS`/`STAFF`, and `PLAN` needs `store`). Functions are hoisted.
Paths are `src/<part>`. Line numbers are left out because they drift.

## 00-head-css.html, 01-markup.html
- `<title>`, Google Fonts link, and all CSS. The design tokens are on `:root` (`--rail`, `--ai`, ...). The JR station-sign header, rail map, player and tab bar are all here.
- `01-markup.html` holds the 8 view sections `#v-today #v-lessons #v-listen #v-talk #v-cards #v-drive #v-translate #v-plan`, the tab bar `nav.tabs` (Today, Practice, Lessons, Translate, Plan) and the opening `<script>`.

## 10-content-weeks.js: `WEEKS[10]`
- Each week has `{kanji, title, goal, phrases:[[ro,jp,en]], note (the tip), patterns:[{en,ro,jp,x,y}], dialogue:[[who,jp,ro,en]], scene, speak:[prompts], drill?}`.
- `drill` is `numbers` (W2), `prices` (W4) or `time` (W6). `[brackets]` mark swap words. `{name}` / `{origin}` / `{job}`… are profile slots that `fill()` fills.
- After the array, a loop stamps `p.w` (the week index) on every pattern.

## 11-content-banks-qa.js
- `BANK` holds the swap-word banks per slot (`ask origin job food drink count thing color size place city sight day hobby past item lost`), each as `[ro,jp,en]`. `BANK_NAMES` holds their labels.
- `KNUM`, `HOURK`/`HOURR` are the kana and romaji for the drills.
- `QA` is the questions people ask you: `{w, q:[ro,jp,en], a:[ro,jp,en]}`.
- `INTRO` is your introduction (slot-filled). `CANDO[w]` is the Sunday self-check list. `KANA_WORDS` is used only by Translate.

## 12-content-parts-hooks-staff.js
- `PARTS[ro]` gives the pieces of each phrase `[ro, jp|null, meaning]`. A single-word phrase is "sounded out". `partsOf(ro)` returns the phrase itself when it has no entry.
- `HOOKS` / `hookFor` hold memory hooks. `sayable(en)` is the English as spoken (no brackets; `/` is read as "or"). It is also the key for `e:` clips.
- `swapWords(w)` gives up to 6 swap words for the week's pattern slots; `PRUNED` marks the ones never taught. `wordsFor(w)` returns the rest.
- `STAFF[w]` is what staff say: `[ro, jp, en, reply, replyEn, replyJp]`. A reply in `(…)` means "nothing to say back".

## 13-content-words.js: the word model (rule 3)
- `WORDS[ro] = [jp, en, say?]` holds the single words.
- `TEACH_WITH[phraseRo]` lists extra words taught with a phrase. `NAME_WORDS` lists names, which are not vocabulary. **This is the only content difference between the builds** (the private build adds `"sam"`).
- `wordTok(s)` is the tokenizer (lower case; strips brackets, `(…)` and punctuation; keeps `-` compounds like `go-ji`).
- `WORD_FIRST[token]` is the deck id where a word is first taught, in course order. A token with no `WORDS` entry, and a token of a one-word phrase, map to `null`, meaning it is never taught on its own.
- `newWordsFor(id, ro)` lists the words to teach right before item `id`.
- `NUM_WORDS` is a regex for number words, which are exempt for now. `knownTokens(extraIds)` is every token of `learnedIds()`, `staffKnown()` and the extras. `lineKnown(ro, known)` checks one line against it (names, numbers and digits pass).

## 20-dates-cfg.js
- `CFG` is the build-specific line. Public: `{pub:true,start:"",trip:"",ch:{},appLink:"",publicLink:""}`. Private: the same wrapped in `/*CFG*/…/*END CFG*/`.
- `START` = `CFG.start` ‖ the `jp17:start` key ‖ the first log date ‖ today. If it falls back to today, it writes `jp17:start`.
- `TRIP` = the `jp17:trip` key ‖ `CFG.trip` ‖ `START`+76 days. Note that the trip set on the phone wins over CFG, while for the start date CFG wins.
- Date helpers: `iso`, `fmt`, `dayDiff`, `mid`.

## 21-storage-errors.js
- `store.get/set` holds JSON in `localStorage["jp17:"+key]` with an in-memory `mem` cache. `set` calls `SYNC.dirty(key)`.
- `showError` / `safe(where, fn)` show errors in `#errbox` and record them in `lastError`. Global `error` and `unhandledrejection` hooks are set here too.

## 30-speech-numbers-kana.js: text-to-speech (the fallback)
- `speak(text, lang, r)` uses `speechSynthesis` at `rate` = 0.75 × Voice speed. A safety net polls `speaking`.
- `stopSpeech()` also stops the clip audio (`audioStop`). `sayNow(t)` goes through `hearNow` as an unrecorded line. `sleep`; `runId` is the global cancel token.
- Also here: `jaNum` (drills) and `kata` (name guess).

## 31-audio.js: recorded voices for lessons and Drive (phase 3)
- `AX` = `{state, meta (index.json), files (sprites), urls (Blob URL per clip)}`. `audioIndex()` runs once at load. `audioFile()` caches sprites. `audioPreload(w)` fetches a week plus coach.mp3; `startSession` calls it for every week its stages use. `audioOK()` is true when the index loaded or is loading.
- `playClip(key)` plays through one reused `<audio>` element with `playbackRate = vrate` and pitch preserved. It resolves on `ended`, or on a safety timeout from the clip length; `audioStop()` cuts it. `audioUnlock()` plays ~0.32 s of decodable silence (nine index silence frames, `silentUrl`) on the first tap (iOS), and `navigator.audioSession.type` is set to `"playback"` where it exists.
- **`voice(line)`** plays `line.key` if the clip exists and plays, else `speak(line.text, line.lang, line.r)`. `hearNow(line)` is for tap buttons (it cancels a pending tap).
- Line builders `LN`: `j` (phrase), `item` (staff items use `k:`), `s` (slow/piece), `w` (word), `e` (meaning), `c` (coach), `reply`, and `tts(text, lang, cat)` for lines with no recording. `cat` is `qa`, `dialogue`, `build`, `drill` or `intro`; `staff-word` is set by the learn step for unrecorded staff words.
  `jaKey(ro, pref)` falls back to the same romaji as another key kind, and `eLine(en)` falls back to lower case.
- `membersOf(c)`: for slash items ("Hai / Iie" …), the members with their own `w:`/`s:` and `e:` clips. It returns them only when every member clip exists.
- `vrate`/`setVrate` is "Voice speed" (0.7–1.2, default 1, stored as `vrate`; the old `rate2` is ignored). `DRK`/`DRP` (clip keys and coach lines) moved here from Drive.

## 40-state-plan.js: profile, deck, learning plan, planner
- Profile: `prof()`, `val(slot,k)`, `fill(s,k)` (`k` 0 = romaji, 1 = Japanese, 2 = English). The default name is Kuma/クマ and the default origin Denver/デンバー.
  Note that the **romaji value for origin is "Denver"** while the audio says デンバー, and the phrase says `[Denbaa]`.
- `deck` holds every item: phrases `w-i`, extras `w-xk` (`word:true`) and staff `w-sk` (`staff:true`, `reply…`). Lookup is `byId`. `wordIds(w)`, `staffIds(w)`, `partIds(w, half)`.
- **`LP[w]`** is the learning-day packing, rebuilt in phase 4. Each week keeps its number of learning days from `LP_V1`, the frozen v1 packing that is used only to migrate old progress (`legacyLearned`, `DAYOF_V1`).
  - Phrases and staff phrases keep their order and carry their bound words (`newWordsFor`).
  - The week's floating word cards (new swap words, and the number/time words `NUMW` from their home week, plus any carry-over) are spread over the days by room.
  - Hard caps per day: `CAP_WORDS=7` new words, `CAP_ITEMS=12` new items. Floating words are filled from the last day back but keep their order; what doesn't fit carries to the next week.
  - The cut search ranks: cap overrun, then own swap words spilled, then words spilled, then the largest day, then balance. Swap words already known are heard on the day with the other words, at no cost.
  - Each day is `{ph, fl, st, words, items}`. `wordIds(w)` = the week's `fl`; `isNewFloat(c)` decides whether a card counts as new (`FIRSTCARD` makes repeated cards free).
  - `DAYOF[id]` gives an item's learning day. `learnDays(w)` = `LP[w].length`. `xDay` is gone.
- Deck: swap-word cards `w-xK` keep their index K (`PRUNED` words leave a gap). Number cards `H-nK` have `num:true` and `say` (kana); their `.w` is set to the week whose days teach them.
- `learnedIds`, `knownWords` and the planner moved to `42-plan.js` in phase 2.
- Misc: `esc`, `hl` (brackets become the swap highlight), `lines()` (romaji/English/Japanese block), `ctlHTML` (the Speed and "Time to answer" sliders; the latter is stored as `gap`), `stopAll()`, Discord helpers `CH`, `chLink`, `discordCfg`, `discordPost`.

## 41-tabs.js
- `VIEWS`, `SECTION`, `show(tab)` (calls `stopAll`, hides the other sections, renders). Practice sub-modes are listen, talk, cards and drive (`pmode`).
- `openWeek`, `openTalk`, `playSession(w,d,at)` (the current session or a revisit), `bindLinks` (`data-goweek`/`data-gotab`/`data-play`), `practiceNav`.

## 42-plan.js: plan v2 (phase 2)
- **Course order** (`courseOrder()`): each week's learning days (`LP`, 3 or 4), then one Use-it session (`d=USE_D=6`), then up to 3 finals (`w:9, d:7..9`); 49 entries.
  Old use days `d = L..5` are "More practice" (`isMore`). They are never scheduled, but can be reached from Lessons and are logged as extra practice.
- **Learned** = the item has a review record (`srs`). `learnedIds()` holds non-staff items (plus `player.learnIds`); `staffKnown()` holds staff items; `knownWords()` holds swap words. `sessionItems(w,d)` lists a learning day's items.
- **`PLAN`** = `{v:2, queue, pos, log, focus, created, startedAt, resetAt?, choice:"pending"|"done", pending}`.
  - `newPlan(from, {back})` starts at a course index.
  - `nextLessonIndex(S)` is the first learning session holding an unlearned item.
  - `loadPlan()` migrates once: `planFromAny()` converts a v1 plan and seeds review records for what v1 counted as learned (`legacyLearned`). Someone with a log gets `choice:"pending"` (the "New plan" card), and a `{k:"back"}` warm-up is put at the head.
  - `planContinue()`, `planStartOver()` (keeps the log and review history; sets `resetAt`).
- **Capacity** (`planSchedule()`, memoised; `computeSchedule()` never writes). The days run from max(today, `planStart()`) to the day before `TRIP`; `planStart` = `CFG.start`, else `PLAN.created`. Sessions already done today use today's slots, and a rest day takes today off. The order of measures:
  1. one a day
  2. a second session on Sat/Sun, earliest first
  3. finals cut to 1 (`cut`; 0 if a final is already done)
  4. weekday doubles spread evenly
  5. `overflow`
  It returns `{days[{date,done,n,two}], rem, R, cut, finalsKept, spare, overflow, finish, doubled, weekendDbl, weekdayDbl, todayPlanned, dateOf[], nextDate, beforeStart}`.
- `current()` gives a virtual welcome-back session (`backSession()`) when `needsBack()` is true: the last activity, or `startedAt`, is 7 or more days ago and something is learned. Otherwise it is `queue[pos]`. It is null past `queue.length - cut`.
  Related: `curWeek`, `remaining`, `sessionsToday` (planned today), `spareDays`, `dateOfQueue(i)`, `weekPlan(w)`, `statusText()` (the one calm status line), `sessionName(s)` (= `sessionTitle`), `skey`, `dfmt`.
- `finishSession(rating, checks)` runs `srsLearn` on the learn-step ids, logs the session, and moves `pos` on (not for the virtual warm-up).
  - Hard, or a self-check under half: insert one repeat if `spare ≥ 1`; otherwise set `focus` and `srsBoost` (due tomorrow).
  - It sets `pending` (the done card, today only) and clears `resume`.
  - Related: `restDay` (only with a spare day), `logAgain`, `streak`, `coursePos(plan)` (used by sync merges and Plan).

## 50-session-stages.js: what a session contains
- **`stagesFor(w,d)`** returns stage objects `{kind, title, min, ids?, …}`.
  - Learning day (`d < learnDays(w)`): review `rv(12, floor)`, optional tip, learn (phrases), learn (extras), learn (staff), meaning, quiz (today's items plus 3 from earlier days), build (W1 only), speak (with hints).
  - d6 = **Use it** (`useIt()`, about 12 min): review, the week's conversation (`then:"B"`, `partner:true` adds an optional role-play box), answer, the drill (n=5) if the week has one, quick check (whole week plus 2 older), self-check.
  - d = L..5 are the old use days, now More practice: `conv()`, `ears()`/`earsAnswers()`, `trav()`. Finals (d ≥ 7): review(25), answer, listen-all, intro.
  - The review floor is 8 on d0 of weeks after the first, otherwise 5. `takeSome` is the only source of randomness. Unused helpers: `review` (kind `cards`), `meaning()`, `learn()`, `sayback()`, `learnedUpTo()`, `wrap()`.
- `sessionStages(s)` is the dispatcher: the warm-up (`k:"back"`) is one review step over `backIds(30)`, most overdue first; everything else goes to `stagesFor`.
- `sessionStages(s)` teaches on a course learning day only what has no record yet (unless the course was started over); revisits and repeats teach everything. The Use-it drill is `W.drill`, or "numbers" for the week that completes 1–10.
- `newToday(stages)` gives the "New today" text. `stageDesc(stage)` gives each kind's help text.
- Globals for the Lessons, Listen, Cards and Talk screens: `lessonWeek`, `listenSel`, `cardMax`, `talk`, `toast`.

## 51-today.js: Today screen (read-only render)
- From top to bottom, `renderToday()` shows:
  1. a compact countdown line and `statusLine()` (= `statusText()`) with the streak
  2. setup and trip prompts
  3. the done card (`PLAN.pending`, today only), with a "Send feedback" link that opens `feedbackBox()` (`fbOpen`, in memory only)
  4. the group panel
  5. the main card, which is one of:
     - the "New plan" migration card (Continue / Start over with an inline confirm)
     - "Done for today ✓" with Do another now
     - the start card: one big `#start` ("Start · <session> · N min", or "Resume · step N of M" from `resumeFor()`), "New today", a collapsed "What's in this session" (tap a step to start there), a collapsed "With the group?", the Drive link, and a rest-day link when a spare day exists
  6. Up next with planned dates
  7. the station sign and rail map
- It writes nothing to storage; the `plan` test checks that.
- `sendFeedback` writes to `feedbackLog`. It goes to the Claude `db` `feedback` collection when available, and to the `#app-feedback` webhook on the web.

## 52-session-player.js: session player and widgets
- `startSession(opt)` builds `player = {s, stages (sessionStages; +rate unless d6 or the warm-up), idx, done, group, turn, logOnly, learnIds, quiz?, reviewMisses?}`. There is no sound check when `audioOK()`. It preloads the session's audio.
- `turnMs(line)` / `yourTurn(line)` is **the** your-turn pause (rule 5): Time to answer + the expected answer's clip length at Voice speed (or 0.2 s per character), ×2 in groups, capped at 16 s. `answerMs(len)` wraps it.
- Phase 3:
  - `guidedSpeak(st, box)`: each item taught today from the English, then up to 3 `closingQA` pairs whose filled lines are known.
  - `suggestRating()`/`scoreLine()` read the quick-check score and review misses. `rateCountdown` takes the suggestion after 5 s when auto-advance is on (not in groups).
  - The warm-up finishes when its review ends. A sound check comes first until `soundOK`. `startRevisit` drops review and selfcheck.
- `renderPlayer(el)` has one `switch(kind)` for the markup and one for the wiring:
  - `learn`: `startLearn`
  - `review`: `reviewWidget`
  - `cards`: `cardsWidget`
  - `quiz`: `quizWidget`
  - `listen`/`warm`/`sayback`/`meaning`: `startListen` with `listenOnce`
  - `dialogue`/`roleplay`: `runDialogue` (`then` replays as B)
  - `build`: `buildWidget`
  - `answer`: `startTalk`
  - `drill`: `renderDrill`
  - `speak`: hints and `#said`
  - `intro`
  - `selfcheck`: `finishSession('ok', checks)`
  - `rate`: `finishSession(rating)`
  - `tip`, `sound`
- Phase 2 additions in `renderPlayer`:
  - `stageDone()` starts `autoCountdown()`: "Next: <step>" with 3 s (8 s for a tip) and Stay here. It waits while speech is still playing, is off in group sessions, and is switched by `autoNext` (in the gear and in Plan → Settings). `autoCancel()` runs on every render.
  - Next on an unfinished step shows the inline `#pl-skipq` (Skip runs `srsBoost` on the step's ids).
  - The gear `<details id="pl-gear">` holds `ctlHTML()` and the auto-advance switch.
  - Help text shows for the first two views of each kind (`seenKinds`), then sits behind `#pl-help` "?".
  - Each render stores `resume {key,date,at,n}`. `resume`, `seenKinds` and `autoNext` are local-only (not synced).

  Every render calls `stopAll()`. Step state is `player.idx`, and Next/Back re-render. `stageDone()` marks the step done.
- `answerMs(len)` is the "your turn" pause: the Pause slider plus 300 ms per character, scaled for slow Speed and doubled in groups. `tsleep` is a short gap.
- Widgets: `cardsWidget` (`boxes` levels 0–5), `quizWidget` (options from learned items of the same kind; a miss comes back once, a right first-round "say" answer on a due item counts as an SRS review), `buildWidget` (`buildItem`).

## 60-spaced-review.js (rule 7)
- `srs` = `{id: {s: level, due: iso, last}}`. `SRS_GAPS=[1,1,3,7,14,30,60]`.
- `srsLearn(ids, day)` sets level 1, due the next day.
- `srsGrade(id, ok)`: a right answer goes up a level, a miss resets to 1 and comes back tomorrow. `srsPlace` spreads due dates to the quietest nearby day, and pulls anything that would rest past the flight into the last 10 days before it.
- `srsSeed()` backfills learned items that have no record. `dueIds(cap, floor)` gives about 65% young items and the rest the most-overdue old ones, topped up to `floor` with items next in line. `dueCount`, `srsBuckets` (Plan), `srsSummary`.
- `srsBoost(ids)` brings records due later than tomorrow back to tomorrow. `backIds(cap)` lists learned items, most overdue first, for the warm-up.
- `reviewWidget` is audio first: prompt (the coach line before the first two "say" items) → `yourTurn` → answer → 1.2 s hold. It counts as got-it unless Missed it is tapped; a miss runs `srsGrade(false)`, counts in `player.reviewMisses` and re-queues the item once in the other direction. Pairs are asked by member. It has Play/Pause and Replay.

## 70-dialogue-lessons-phrases.js
- `dialogueHTML`, `bindDialogue`, `runDialogue(role)`: role lines hide the romaji, wait `answerMs`, then play.
- `catalogHTML(w)` is the session list: learning days, Use it, More practice (`sessionsOfWeekLearned`), finals. It shows planned dates from `dateOfQueue` and Start/Revisit/Preview/Practice buttons. `renderLessons()` is the Lessons tab: phrases, words, pieces, tip, patterns, swap words, dialogue, drill and speak prompts.
- Drills (phase 4) ask only what has been taught. `numKnown()` gives the learned number cards plus known tokens. `numParts(r)` splits a number into the words it is built from (nihyaku → ni + hyaku; sound-changed forms stay whole). `hourOK`, `drillValues(kind)`, `PRICE_POOL`.
  - Numbers drill: the learned subset of 1–10, or 1–99 once all ten are known, after the `NUM_DEMO` spoken examples the first time (`numDemo`).
  - `pendingLines()` lists the lines that wait for a recording (number words, the demo, every drill value) and is the source of `tts-needed.json`.

## 71-listen.js
- `startListen()` speaks by item keys and uses `yourTurn`. `buildListen()` builds the items from `listenSel` (`{ids}` or week/half/all-learned). `startListen()` is the say/understand loop with a Pause gap. `drawStage`. Used by Practice → Listen and the listen-type session steps.

## 72-learn.js: the teaching step (rule 3; phase 3: clips, recall, pairs)
- `startLearn()`: for each item, it first teaches the `newWordsFor` words (`w:` clips). Then the phrase: meaning → whole → pieces (`s:`) → slow (`s:`) → normal (`j:`) → `fromEnglish` (pairs by member).
  Recall: after each item the previous one comes back once from the English, and after the last item, the last one after a 1.5 s gap. Staff items: words (unrecorded ones are `staff-word` TTS), the `k:` voice, pieces only where recorded, and the reply options.
- Staff items: words → what they say → meaning → reply options. Extras that are plain words get a shorter path. `wordsHTML` / `partsHTML` are used for the Lessons tab.

## 73-drive.js: Drive mode (recorded audio)
- `DRK` builds the clip keys (`w: j: s: k: e: c:`). `DRP` holds the coach lines. `driveLoad()` fetches `audio/index.json` and the needed MP3s.
- `drivePools()` returns learned, staff, and fresh (up to 6 not-yet-learned items of this week or the next).
- `driveScript(mode, minutes)` is a list of `{k}` / `{gap}` / `{mark}` entries using `learnItem`, `sayItem`, `undItem` and `staffItem`. Missing clips are skipped silently.
- `driveBuild` concatenates the clip byte ranges and silence frames into one Blob MP3 with time marks. Then `driveEl` (`<audio>`, `driveLog` minutes), Media Session controls, `driveSkip`, `drawDrive`, and the TTS fallback `driveFallback`. `renderDrive()` is the Practice → Drive screen.

## 74-talk-cards.js
- `buildTalkItems()` returns the QA items whose question and answer are `lineKnown`. **If none are known, it falls back to unknown ones** (`concat(all)`), which is a rule-3 escape hatch.
- `buildItem()` fills a pattern with known swap words, else this week's intro words, else the first 4 of the bank. `renderTalk()` handles the answer, build, "Your answers" profile form and chat modes. `startTalk()` is the Q → cue → pause → answer loop.
- Cards: `pool`, `pickCard` (lowest box first, with `PLAN.focus` weeks weighted), `renderCards`.

## 80-claude-extras.js
- `SAMPLE` (Claude sampling) and `DB` (Claude db) come from `claude.use()` and exist only inside the Claude app.
- The group setup link `?setup=…` (base64url JSON of the feedback webhook, `ch.today`/`ch.feedback` and the trip date) is validated (`isHook`/`isChan`) and saved only after the user taps Save. Related: `setupHTML`, `tripAskHTML`, `bindSetup`, `setupLinkFor`.
- Chat with a local: `SCENES`, `chatRules`, `chatSend`. It shows only when `SAMPLE` exists.

## 81-translate.js
- `tIndex()`/`tSearch(q)` search the phrasebook across the deck, QA, staff, `KANA_WORDS` and `myPhrases`, with `SYN` synonyms. `renderTranslate()`. `askAI` uses Claude, only when `SAMPLE` exists.

## 90-plan-screen.js
- `BUILD="16"` (shown in error reports; not the artifact version). `IN_CLAUDE`, `PUBLIC_LINK` (`CFG.publicLink` or the current URL).
- `renderPlan()`:
  - course and schedule panels, memory schedule (`srsBuckets`), can-do list
  - "Open it like an app" (`CFG.appLink`)
  - trip date (`pl-trip` writes `trip`)
  - Discord group (name, feedback webhook, make a setup link)
  - daily reminder (`remindAt`, Notification), progress code (`progressCode`/`loadProgressCode`)
  - settings (show Japanese writing, the auto-advance switch, sound check again, "Start the course over" with an inline confirm that keeps review history)
- `checkReminder()` runs every 30 s.

## 92-offline.js (phase 5)
- `OFFLINE_OK` is true only for the public build on https or localhost; it registers `sw.js`.
- `offlineFiles()` lists the page, the index and every sprite. `offlineReady()` checks the caches for all of them.
- `offlineLine(box)` fills Plan → Settings with "Works offline: ready ✓" or "Save for offline (about N MB)", which fetches each file with `cache:"reload"` and stores it with progress shown.

## 95-boot-sync.js
- Boot: the `nojp` class and `show("today")`. This runs **before** `SYNC_KEYS` and the sync code below are defined, so the first render must not touch them.
- `SYNC_KEYS` / `SHARE_KEYS`: progress codes leave out `discord`, `feedbackLog` and `groupNames`.
- `mergeProgress(local, remote)`: `srs` is merged first (newest record per item). Both plans pass through `planFromAny`, so v1 is converted and v2 is never downgraded.
  The winner is ranked by `planScore` = [`resetAt`, `coursePos`, decided over pending, log length]. Logs are a union, `boxes` take the max, and checklists are a union. `progressCode()` is `"JP1."` + base64url JSON. `loadProgressCode`.
- Claude-only per-account sync (async IIFE) stores `db.doc("data/users/<uid>/app")` = `{v, at, dev, keys}`. It is last-writer-wins plus the merge, and is applied only when idle (no player or loops running). `SYNC.dirty` pushes after 1.5 s. Keys in `LOCAL_ONLY` (`soundOK`, `notified`, `lastError`, `_dev`, `_t`) are not synced.

## Public/private differences
They all live in `tools/build.py` `SUBSTITUTIONS` (the `CFG` line and `NAME_WORDS`), plus the public wrapper `src/public/{head,tail}.html`.
At run time the builds also differ through `CFG` (start/trip dates, Discord channel links, app link) and through `IN_CLAUDE` (sync, feedback to the db, Claude extras).

## Phase 5 notes
- **Catch-up sessions (`42-plan.js`):** learning days that are already partly learned become as few "<week>: catch-up" sessions as the caps allow.
  - The session is `{w, d:-2, k:"catch", ids, n, of}` and its stages come from `stagesFor(w, -2, {ph, fl, st})`.
  - `queueFrom(from, S)` builds them on Continue. `repairPlan(p)` adds them once on load to a v2 plan built for an older packing (`PACK_V=5`).
- **Audio updates:** `audioIndex()` uses `cache:"no-cache"` (falling back to the cache when offline). `audioFile()` refetches a sprite shorter than the index needs (`fileNeed`) with `cache:"reload"`; still short → `AX.short`, and those clips fall back to text-to-speech.
- **Practice:** `practiceIds()` (learned + staffKnown) and `nothingYet()` are in `71-listen.js`. Listen, Cards, Talk and Drive offer only learned items. Play comes first, with options folded. Drive's "Preview the next lesson" is the only labelled peek-ahead.
- **Screens:** `foldPanels(root, labels)` (`40`) turns Plan panels into collapsed sections. Lessons folds its reference blocks; the Lessons drill starts only when opened. Lessons swap words list only taught words (`taughtEver`).
- **Profile:** no "Fill in Your answers" nags. The default hometown shows as "Denbaa" (romaji) with "Denver" as its English meaning.
- **Removed:** `HEAR`, `srsSeed`, `infoFor`, `weekRange`, `DAYNAMES`, `pd`, `NUM_WORDS`, `profileSet`, and the unused `stagesFor` helpers.
- **Migration only (marked):** `LP_V1`, `DAYOF_V1`, `legacyLearned`, and the v1 path of `planFromAny`.

## Phase 4 notes
- The owner's Continue path now goes to W2 day 1 and day 2, which hold only the new number words for him (1–3, then 4). His learned phrases are not re-taught (`sessionStages`).
- W3's swap words hitotsu and sushi spill to W4 days 1–2: W3 has room for only 5 new words, which numbers 6–10 take.

## Phase 3 notes
- Still text-to-speech (no recordings yet): conversation lines, Q&A, build combinations, drills, the introduction, custom profile values, Translate, My phrases, Lessons piece buttons, and 36 staff words/replies. `/home/claude/out/tts-needed.json` lists them.

## Phase 2 notes
- `TRIP` still comes from the phone's `jp17:trip` before `CFG.trip`. `START` (`20-dates-cfg.js`) is now unused except by the unused `weekRange`/`infoFor`.
- `byId` is a linear `deck.find`; `learnedIds()` calls it once per review record.

## Fragile spots to remember
- Global mutable state is shared by screens and the player (`talk`, `listenSel`, `listenItems`, `cardIds`, `lessonWeek`, `runId`). Session steps set them, and screens read them.
- (Fixed in phase 2: rendering Today no longer changes the plan; capacity is computed, not stored.)
- `LP` packing depends on `WORD_FIRST`, so it depends on `NAME_WORDS` and every content table. Editing a phrase can reshuffle which day teaches what, and saved `PLAN.log` entries refer to `w`/`d` only.
- Since phase 2, `learnedIds()` is srs-based. A queue entry for a learning day whose items all already have records simply re-teaches them; `srsLearn` keeps the existing records.
- Sync and progress codes copy the raw `plan` object, so a later plan format needs a migration in `loadPlan`, `mergeProgress` and `progScore`.

## Phase 6 (review fixes)
- Network: `LOAD_MS=2500` in `31-audio.js`: `voice()` waits at most that long for the index, and `playClip()` arms its safety timer before the sprite is fetched (a hung request → text-to-speech). The worker (`src/public/sw.js`) gives the network `NET_MS=3000`, then serves its saved copy.
- Step token: `stepTok` (52) is bumped by every `renderPlayer` and by leaving Today (`show()` in 41); every step's timers, promises and countdowns check it (and `curTab==="today"`) before acting. Leaving Today marks a done step `player.stay` so returning shows Next, not a countdown.
- Plan (42): `normalizeQueue` drops fully learned learning days and merges partly learned ones into catch-ups anywhere in the queue; `planUsable`/`rebuildPlan`/`planRebuild` validate a saved plan on load and rebuild it from `srs` + log; `closeSession()` runs first in Continue and Start over; the warm-up (`k:"back"`) is a prelude, not counted in `doneToday`/capacity, and is added at migration only after a gap of `BACK_GAP` (7) days; a repeat is inserted at most once (never for a repeat); a session logs on `player.started` (the day it began); a past flight date gives `{past:true}` (one a day, no fit warnings).
- Rating: `rateCountdown` never auto-saves a suggested Hard.
- Rule 3: `SLOT_OF`/`slotTokens` (13): a profile answer (name, hometown, job, hobby, food, city) is known only once the phrase that teaches its slot (`[Kuma]`, `[Denbaa]`, `[enjinia]`, `[haikingu]`, `[Raamen]`, `[Kyouto]`) is learned; `closingQA`/`buildTalkItems` no longer add them unconditionally. `NAME_WORDS` (Ken, Sumisu) stay exempt.
- Drive (73): `turn(key)` is the your-turn silence, `turnMs()/1000 × driveRate()`, so it plays as Time to answer at any Voice speed.
- Dates (20): `TRIP`/`TRIP_SET` are `let`; `refreshDates()` re-reads them after a progress code, sync or the date form (no reload).
- Today (51): `renderToday` catches render errors and shows "Rebuild my plan"; `resumeFor` drops a resume point past the session's end; the migration card names the first non-warm-up session.
- Lessons (41/70): `sessState(w,d)` = done | next | more | locked | future. Done → Revisit; next → starts from Today; future/locked → "Contents" only; `playSession` refuses future sessions (returns false, opens the week).
- `minutes` takes `SJ_MINUTES_OWNER=1` to walk the owner's real path from saved progress at default settings.
- Voices (addendum): `LN.tts(text, lang, cat, ro, who)` gives conversation/question/answer lines a key: `who="other"` → `k:<ro>` with `alt:["j:<ro>"]` (staff voice), otherwise `j:<ro>` (`voice:"learner"`). `lineKey(L)` is the clip a line will actually request (key, else the first recorded `alt`, else key → text-to-speech); `voice()` and `turnMs()` use it. `dlgLine(l)` (70): speaker A is "other", B "learner". `qaLines(x)` (31): question "other", answer "learner"; used by guided Speak's closing questions and Talk.
- Offline size (92): `offlineMB()` sums each sprite's furthest byte from the index, rounded to the nearest MB (no fixed figure).
