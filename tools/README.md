# Speak Japanese: build and tests

`index.html` is a **built file**. Edit the parts in `src/`, then rebuild.

## Source

`src/*.html` and `src/*.js` are the page body (from `<title>` to `</script>`), split at top-level boundaries.
They are concatenated in file-name order with no separators, so the numeric prefixes set the order.
`src/public/head.html` and `src/public/tail.html` are the wrapper the public page adds around them. `src/public/sw.js` is the service worker template.
What each part holds is in [`CODEMAP.md`](CODEMAP.md).

## Build

```
python3 tools/build.py                       # both builds
python3 tools/build.py --public-only         # only index.html
python3 tools/build.py --cfg PATH            # private CFG from PATH (or SJ_CFG=PATH)
python3 tools/build.py --private-out PATH    # private output path (or SJ_PRIVATE_OUT=PATH)
```

| Build   | Output                               | Content |
|---------|--------------------------------------|---------|
| public  | `index.html` (GitHub Pages)          | `src/public/head.html` + parts + `src/public/tail.html`, with the empty public `CFG` |
| private | `/home/claude/out/japan-trainer.html` (published as a Claude artifact) | parts with the substitutions applied, plus one trailing newline. There is no `<head>` and no `</body></html>`, because the artifact publisher adds them. |

**Private CFG.** The private `CFG` line (start date, flight date, Discord channel links, app links) lives outside the repo,
default `/home/claude/private/cfg.js`. It is a single line `const CFG={...};`. The build wraps it as `/*CFG*/.../*END CFG*/`.
Never commit it or paste it into the repo.

**Public/private differences** are listed in one place: `SUBSTITUTIONS` in `tools/build.py`. Each entry is the text
from the public parts and its private replacement. Each public text must occur exactly once, otherwise the build fails.
Today there are two entries: the `CFG` line, and `NAME_WORDS` (the private build also lists `"sam"`).

**Safety checks.** The build fails loudly if the public output contains a Discord channel, webhook or invite link, a claude.ai artifact link,
the `/*CFG*/` marker, any URL from the private CFG (except its `publicLink`) or the private start/trip date, or if its `CFG` has a non-empty
`start`, `trip`, `appLink` or `ch`. Both outputs have their `<script>` block syntax-checked with `node --check`.

**Baseline (phase 1 only).** `tools/baseline.sh` rebuilds with `cfg.v42.js` into a temporary folder and compares the result byte for byte
with `build-inputs/private-v42.html` (lines 2 to the end, minus the publisher's trailing `</body></html>`) and with `git HEAD:index.html`.

## Tests

```
tools/test.sh                    # all: public audio rules doses state walk (public build)
tools/test.sh rules walk         # some
tools/test.sh --private walk     # against the private build
node tools/tests/<name>.js       # one test directly
```

The tests are plain Node scripts using Playwright (`require('playwright')`, Chromium preinstalled). Each one serves the repo on
`http://localhost:8765/` with the chosen page as `/index.html` (`SJ_PAGE`, `SJ_PORT`), and stops the server when it finishes. Web fonts are blocked.
The browser's `speechSynthesis` is replaced by a fake that finishes at once. The app's own speech code is left as it is.

| Test | What it checks | Options |
|------|----------------|---------|
| `audiocache` | Audio updates reach phones. `index.json` is revalidated (`cache: "no-cache"`). A sprite shorter than the index needs (an old copy) is fetched once more with `cache: "reload"` and its clip then plays; if it stays short, the clip falls back to text-to-speech. | |
| `offline` | Public build, with its own server: Save for offline, then offline reload. The page renders, Translate works, and a lesson plays a recorded clip. Back online, a changed `index.html` wins. The private build registers no service worker. | |
| `practice` | Listen, Cards, Talk and Drive offer only learned items. A new learner sees a note pointing to Today; Play sits above the folded options; the Cards counter never reads "/ 9999". | |
| `heights` | Page heights at 390 px wide for Today, Plan and Lessons (fresh learner and the owner). Reports only. | |
| `public` | `index.html` has no private strings or analytics, and has an empty CFG. It also runs the same checker on the private build, which must be flagged (self-test). | `SJ_CFG`, `SJ_PRIVATE_OUT` |
| `unlock` | Real audio in real time, with nothing stubbed: the silent unlock clip and the first clips fire `ended` and never `error`. | |
| `audio` | Clip byte ranges and Drive keys (static plus the real `driveScript()`). A hands-free walk of the whole plan plus every More-practice session logs every line spoken by step: lines naming a clip must have one, recorded steps must be 100% clips, and rule 4 requires the romaji on screen to match the clip's romaji. The text-to-speech lines are printed by category and written to `/home/claude/out/tts-needed.json` (the recording list: walk plus a full static listing). Other-speaker lines (conversation speaker A, questions) must name `k:` and resolve to it, or to `j:` for the same romaji, or text-to-speech; learner lines name `j:`. `tts-needed.json` lists the key each line will request plus `voice` ("other"/"learner"). Since phase 7 it FAILS on any lesson line spoken by text-to-speech with the default profile (a clip exists for its derived key, or none exists). | `SJ_TTS_OUT` |
| `timing` | Rule 5, with stub clip lengths, Time to answer 5 s and Voice speed 90%: no overlapping voices, no line starts before the previous ends, every your-turn pause equals the slider-based value, and there is silence during pauses. | `SJ_TIMING_SESSIONS` |
| `minutes` | Session lengths from the real clip lengths plus pauses at default settings, for every session of the plan. It fails on a session over 16 min, reports learning days under 5, and proposes trims. | `SJ_MINUTES_STRICT=1` |
| `rules` | Walks the v2 course order, including each week's optional More-practice sessions once they become available. Every word on screen outside a teaching step must have been taught before. Number words are checked like any other word. Drill values must be built from number words already taught, and build sentences may only use taught swap words. Names and the place slot are reported as exempt. | `SJ_RULES_SELFTEST=1` |
| `doses` | Prints new words and items for each learning day (`newToday`). FAILS if a day has more than 7 new words or more than 12 new items (hard caps since phase 4). | |
| `state` | The owner's saved progress (read at run time): the "New plan" card appears. After Continue the warm-up comes first, then week 2 day 3. Learned stays 25, and nothing is re-queued or skipped. | `SJ_STATE`, `SJ_STATE_NOW` |
| `plan` | Plan v2 capacity for a flight on Dec 17, cases (a)–(e). Checks: at most 2 a day; weekday doubles only after weekends; finish by Dec 16 or the overflow is stated; no "behind"/"missed" wording; rendering Today twice changes no storage. Prints the numbers. | |
| `flow` | Phase 3 checks: a learning day hands-free with only quick-check taps, the review grading itself, Missed it re-queuing and rescheduling, and the no-index fallback completing on text-to-speech. Phase 2 checks: the auto-advance countdown and Stay here; Resume after a reload; skip prompt only on unfinished steps; the feedback box is closed by default and gone the next day; the gear is collapsed; step help moves behind "?". | |
| `sync` | A v2 progress code round-trips. Merging with v1 plans (behind or ahead, both directions) stays v2 and never moves backwards. The owner's v1 code keeps a device on v2. | |
| `regress` | Phase 6: one check per review finding — stalled sprite/index falls back to text-to-speech; a quiz timer never acts on the next step; leaving Today cancels countdowns and audio; migration from an old-build state (`fixtures/old-pub-w3d5.json`) leaves no fully learned day queued and names the session after the warm-up; the warm-up is a prelude (only after a 7-day gap); Hard repeats at most once and a suggested Hard needs a tap; Start over closes an open session; closing questions use profile answers only once taught; a session past midnight logs on its start day; Drive pauses = Time to answer at 70/100/120%; a malformed plan is rebuilt and a render error offers "Rebuild my plan"; stale resume, progress-code flight date, past flight date, Lessons states. | |
| `walk` | A fresh learner from Nov 14 does what Today offers each day and completes the course by Dec 16 with no page errors. `SJ_WALK_MODE=manual` taps Next (confirming Skip); `auto` never taps Next and relies on auto-advance (`tools/test.sh` runs both as `walk` and `walk-auto`). | `SJ_WALK_MODE`, `SJ_WALK_DAYS`, `SJ_WALK_START`, `SJ_WALK_TRIP`, `SJ_WALK_HARD`, `SJ_WALK_VERBOSE` |

`tools/shots.sh [--private]` saves phone-size screenshots to `/home/claude/out/shots/phase4/` for review by eye.

The tests share `tools/tests/walker.js` (the simulated learner) and `lib.js`. `lib.js` serves the page and fakes speech and the `<audio>` element: each clip "plays" for its index length on the page's timers and is logged in `window.__clipLog`; text-to-speech lines are logged in `window.__ttsLog`.
`tools/baseline.sh` was the phase-1 byte-for-byte check against v42; the builds intentionally differ from v42 since phase 2.

## Public build: offline

The public page has a web app manifest and icons at the repo root: `manifest.webmanifest`, `icon-192.png` and `icon-512.png`.
`tools/build.py` writes `sw.js` from `src/public/sw.js`, versioned by a hash of the built page.

The service worker:
- is registered only when `CFG.pub` is true and the page is on https or localhost, so the private build never has one;
- fetches network first and falls back to the cache;
- carries saved audio over to a new version's cache and deletes the old caches.

Plan → Settings shows "Works offline: ready ✓" or a "Save for offline" button. The page itself stores every file in the cache.

## Adding recordings

Recordings are appended, never moved. Run `python3 /home/claude/tts/append_clips.py --audio audio --clips new.json` (add `--dry` first to check):
- It appends each clip to the end of its week sprite (or `coach.mp3`) and adds its key to `audio/index.json`.
- Existing byte ranges stay valid.
- The list of what is missing is `/home/claude/out/tts-needed.json`, written by the `audio` test. English-only lines (`e:`/`c:`) come first and can be recorded with Kokoro alone.

Phones pick up the new clips without a reinstall:
- The index is revalidated on every load.
- A sprite shorter than the new index needs is fetched again, bypassing the cache.
- Lines whose key now has a clip play it instead of text-to-speech; there is nothing to change in the code.

Then re-run `tools/test.sh audio`. Lines that now have a clip leave the recording list.

## Audio

Lessons and Drive share one audio layer, `src/31-audio.js`: `voice(line)` plays the clip, or falls back to text-to-speech when there is none. See CODEMAP.


`audio/index.json` is `{frame, silence, clips}`:

- `frame` is the duration of one MP3 frame in seconds (0.036).
- `silence` is one silent frame, base64.
- `clips` maps each key to `[file, byteOffset, byteLength, nFrames]`.

The files are `w1.mp3`..`w10.mp3` (the clips of each week) and `coach.mp3`. All of them are constant-bitrate frames, so Drive mode cuts the byte ranges out and joins them with silent frames into one MP3 (`driveBuild`).

The key prefixes are:

| Prefix | Content |
|--------|---------|
| `j:<romaji>` | Phrase at normal speed. |
| `s:<romaji>` | Slow phrase, or a piece of one (from `PARTS`). |
| `w:<romaji>` | Single word. |
| `k:<romaji>` | Staff voice. |
| `e:<english>` | English meaning, spoken as `sayable(en)`. |
| `c:<text>` | Coach line (`DRP`). |

The voice pipeline that made these clips was lost. `build-inputs/tts-old/` only holds parts of an older one, and phase 4 rebuilds it.
