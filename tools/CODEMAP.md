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
- `HEAR` is all empty (dead, kept for shape). `swapWords(w)` gives up to 8 swap words for the week's pattern slots. `wordsFor(w)` returns them plus `HEAR`: these are "the extras".
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
- Date helpers: `iso`, `fmt`, `dayDiff`, `mid`, `weekRange`. `infoFor` is unused.

## 21-storage-errors.js
- `store.get/set` holds JSON in `localStorage["jp17:"+key]` with an in-memory `mem` cache. `set` calls `SYNC.dirty(key)`.
- `showError` / `safe(where, fn)` show errors in `#errbox` and record them in `lastError`. Global `error` and `unhandledrejection` hooks are set here too.

## 30-speech-numbers-kana.js: speech layer (TTS only today)
- `speak(text, lang, r)` returns a promise. It uses `speechSynthesis` with a ja-JP or en-US voice from `pickVoice`, and `rate` (the Speed slider, `rate2`).
- A safety net polls `speechSynthesis.speaking`, so speech never moves on while the voice talks (rule 5). Without TTS it waits `len*120` ms.
- `stopSpeech`, `sleep`, `sayNow(t, btn)` (tap to hear). `runId` is the global cancel token: every loop checks `my!==runId` after each await.
- `unlocked` is the iOS first-tap unlock. `VOICE_WARN` / `renderVoiceWarn` handle the no-voice warning.
- Numbers: `jaNum(n)` gives `{k: kana, r: romaji}` (used by drills). `kata(romaji)` guesses katakana for the name and hometown.

## 40-state-plan.js: profile, deck, learning plan, planner
- Profile: `prof()`, `val(slot,k)`, `fill(s,k)` (`k` 0 = romaji, 1 = Japanese, 2 = English). The default name is Kuma/クマ and the default origin Denver/デンバー.
  Note that the **romaji value for origin is "Denver"** while the audio says デンバー, and the phrase says `[Denbaa]`.
- `deck` holds every item: phrases `w-i`, extras `w-xk` (`word:true`) and staff `w-sk` (`staff:true`, `reply…`). Lookup is `byId`. `wordIds(w)`, `staffIds(w)`, `partIds(w, half)`.
- `learnedIds()` covers all weeks before `curWeek()`, plus the items of each logged session's day ≤ `d` in `LP`, plus `player.learnIds`.
- **`LP[w]`** is the learning-day packing, computed at load. W1 has fixed halves. Other weeks put phrases, then extras (counted as half), then staff phrases into 3 days, or 4 days when the week is heavy (`HEAVY=35` or more than 18 words). The cuts minimise the costliest day using an exhaustive cut search. Each day is `{ph:[ids], x:bool (extras day), st:[staff ids], cost}`.
  `DAYOF[id]` gives the learning day of an item. `learnDays(w)` = `LP[w].length`. `xDay(w)` is the extras day. `MAXNEW` is unused.
- `knownWords()` gives the swap words known so far (used by Build).
- **Planner**:
  - `baseQueue()` is 10×7 `{w,d,rep}` plus 3 final reviews (`w:9, d:7..9`).
  - `PLAN = {queue, pos, log:[{date,key,w,d,rating,again?}], focus, lastAdjust, pending}` is stored under `plan`.
  - `current()` = `queue[pos]`. `curWeek()`, `remaining()`, `daysLeft()`, `doneToday()`, `sessionsToday()` (1–2 a day, from what remains and the days left), `slackRaw`/`spare`/`useSpare`.
  - `rebalance()` runs when behind. It drops buffer days, then repeats, then Saturday (`d===5`) sessions, then doubles days. **It is called from `renderToday()`, so rendering Today can change and save the plan.**
  - `finishSession(rating, checks)` logs the session and moves `pos` on. It also adds the session's learn ids to the spaced review (`srsLearn`). "Hard" inserts a repeat when a spare day exists. Self-check under 50% inserts repeats of d2 and d3. It sets `PLAN.focus[w]` and `PLAN.pending` (the done card).
  - `restDay`, `logAgain` (revisits), `streak()`, `projectedDate(i)`.
- Misc: `esc`, `hl` (brackets become the swap highlight), `lines()` (romaji/English/Japanese block), `ctlHTML` (Speed and Pause sliders; the Pause slider is `gap`), `stopAll()`, Discord helpers `CH`, `chLink`, `discordCfg`, `discordPost`.

## 41-tabs.js
- `VIEWS`, `SECTION`, `show(tab)` (calls `stopAll`, hides the other sections, renders). Practice sub-modes are listen, talk, cards and drive (`pmode`).
- `openWeek`, `openTalk`, `playSession(w,d,at)` (the current session or a revisit), `bindLinks` (`data-goweek`/`data-gotab`/`data-play`), `practiceNav`.

## 50-session-stages.js: what a session contains
- **`stagesFor(w,d)`** returns stage objects `{kind, title, min, ids?, …}`.
  - Learning day (`d < learnDays(w)`): review `rv(12, floor)`, optional tip, learn (phrases), learn (extras), learn (staff), meaning, quiz (today's items plus 3 from earlier days), build (W1 only), speak (with hints).
  - Use days: `conv()` (dialogue then B, build, answer, quiz), `ears()`/`earsAnswers()` (warm "und", answer, quiz), `trav()` (dialogue as B, drill, build, speak with no hints).
  - d6 `wrap()`: roleplay and selfcheck. Finals (d ≥ 7): review(25), answer, listen-all, intro.
  - The review floor is 8 on d0 of weeks after the first, otherwise 5. `takeSome` is the only source of randomness.
  - Unused inside it: `review` (kind `cards`), `meaning()`, `learn()`, `sayback()`, `learnedUpTo()`.
- `newToday(stages)` gives the "New today: X words, Y phrases" text (the doses test uses it). `stageDesc(stage)` gives the one-line help for each kind.
- Globals for the Lessons, Listen, Cards and Talk screens: `lessonWeek`, `listenSel`, `cardMax`, `talk`, `toast`.

## 51-today.js: Today screen
- `renderToday()` shows the player if `player` is set. Otherwise it renders the countdown, setup and trip prompts, status line (`statusLine`), station sign, rail map (`railSVG`), done/feedback card (`shareCard`/`feedbackCard` from `PLAN.pending`), missed-days nudge, session card (stage list, `#start`, group start, log-only, rest day), up-next list and group panel.
- `sendFeedback` writes to `feedbackLog`. It goes to the Claude `db` `feedback` collection when available, and to the `#app-feedback` webhook on the web.

## 52-session-player.js: session player and widgets
- `startSession(opt)` builds `player = {s, stages (+rate unless d6), idx, done, group, turn, logOnly, learnIds}`. A sound check comes first until `soundOK`. `startRevisit` drops review and selfcheck.
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

  Every render calls `stopAll()`. Step state is `player.idx`, and Next/Back re-render. `stageDone()` marks the step done.
- `answerMs(len)` is the "your turn" pause: the Pause slider plus 300 ms per character, scaled for slow Speed and doubled in groups. `tsleep` is a short gap.
- Widgets: `cardsWidget` (`boxes` levels 0–5), `quizWidget` (options from learned items of the same kind; a miss comes back once, a right first-round "say" answer on a due item counts as an SRS review), `buildWidget` (`buildItem`).

## 60-spaced-review.js (rule 7)
- `srs` = `{id: {s: level, due: iso, last}}`. `SRS_GAPS=[1,1,3,7,14,30,60]`.
- `srsLearn(ids, day)` sets level 1, due the next day.
- `srsGrade(id, ok)`: a right answer goes up a level, a miss resets to 1 and comes back tomorrow. `srsPlace` spreads due dates to the quietest nearby day, and pulls anything that would rest past the flight into the last 10 days before it.
- `srsSeed()` backfills learned items that have no record. `dueIds(cap, floor)` gives about 65% young items and the rest the most-overdue old ones, topped up to `floor` with items next in line. `dueCount`, `srsBuckets` (Plan), `srsSummary`.
- `reviewWidget` is say/understand recall-before-reveal, with misses re-queued once.

## 70-dialogue-lessons-phrases.js
- `dialogueHTML`, `bindDialogue`, `runDialogue(role)`: role lines hide the romaji, wait `answerMs`, then play.
- `catalogHTML(w)` is the session list (Start/Revisit/Preview). `renderLessons()` is the Lessons tab: phrases, words, pieces, tip, patterns, swap words, dialogue, drill and speak prompts.
- `renderIntro`, `renderDrill(kind, n, onDone)` (numbers 1–99, prices, times; it says the kana answer).

## 71-listen.js
- `buildListen()` builds the items from `listenSel` (`{ids}` or week/half/all-learned). `startListen()` is the say/understand loop with a Pause gap. `drawStage`. Used by Practice → Listen and the listen-type session steps.

## 72-learn.js: the teaching step (rule 3)
- `startLearn()`: for each item it first teaches `newWordsFor` words (`teachWords`: meaning → word → your turn → once more, then a meaning check). Then the phrase: meaning → whole → pieces (`PARTS`) → slow → normal → from English → answer → `recallEarlier`.
- Staff items: words → what they say → meaning → reply options. Extras that are plain words get a shorter path. `wordsHTML` / `partsHTML` are used for the Lessons tab.

## 73-drive.js: Drive mode (recorded audio)
- `DRK` builds the clip keys (`w: j: s: k: e: c:`). `DRP` holds the coach lines. `driveLoad()` fetches `audio/index.json` and the needed MP3s.
- `staffKnown()` is defined here but used widely (`knownTokens`, `dueIds`). `drivePools()` returns learned, staff, and fresh (up to 6 not-yet-learned items of this week or the next).
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
  - settings (show Japanese writing, sound check again, reset)
- `checkReminder()` runs every 30 s.

## 95-boot-sync.js
- Boot: the `nojp` class and `show("today")`. This runs **before** `SYNC_KEYS` and the sync code below are defined, so the first render must not touch them.
- `SYNC_KEYS` / `SHARE_KEYS`: progress codes leave out `discord`, `feedbackLog` and `groupNames`.
- `mergeProgress(local, remote)`: the log is a union, the higher position wins, `boxes`/`srs` take the max, and checklists are a union. `progressCode()` is `"JP1."` + base64url JSON. `loadProgressCode`.
- Claude-only per-account sync (async IIFE) stores `db.doc("data/users/<uid>/app")` = `{v, at, dev, keys}`. It is last-writer-wins plus the merge, and is applied only when idle (no player or loops running). `SYNC.dirty` pushes after 1.5 s. Keys in `LOCAL_ONLY` (`soundOK`, `notified`, `lastError`, `_dev`, `_t`) are not synced.

## Public/private differences
They all live in `tools/build.py` `SUBSTITUTIONS` (the `CFG` line and `NAME_WORDS`), plus the public wrapper `src/public/{head,tail}.html`.
At run time the builds also differ through `CFG` (start/trip dates, Discord channel links, app link) and through `IN_CLAUDE` (sync, feedback to the db, Claude extras).

## Fragile spots to remember
- Global mutable state is shared by screens and the player (`talk`, `listenSel`, `listenItems`, `cardIds`, `lessonWeek`, `runId`). Session steps set them, and screens read them.
- `renderToday()` → `rebalance()` mutates and saves `PLAN` while rendering. Opening the app after missed days permanently drops Saturday sessions and buffer days.
- `LP` packing depends on `WORD_FIRST`, so it depends on `NAME_WORDS` and every content table. Editing a phrase can reshuffle which day teaches what, and saved `PLAN.log` entries refer to `w`/`d` only.
- `learnedIds()` treats every item of earlier weeks as learned, whether or not it was done.
- Sync and progress codes copy the raw `plan` object, so a later plan format needs a migration in `loadPlan`, `mergeProgress` and `progScore`.
