# Speak Japanese: build and tests

`index.html` is a **built file**. Edit the parts in `src/`, then rebuild.

## Source

`src/*.html` and `src/*.js` are the page body (from `<title>` to `</script>`), split at top-level boundaries.
They are concatenated in file-name order with no separators, so the numeric prefixes set the order.
`src/public/head.html` and `src/public/tail.html` are the wrapper the public page adds around them.
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

**Baseline (phase 1).** `tools/baseline.sh` rebuilds with `cfg.v42.js` into a temporary folder and compares the result byte for byte
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
| `public` | `index.html` has no private strings or analytics, and has an empty CFG. It also runs the same checker on the private build, which must be flagged (self-test). | `SJ_CFG`, `SJ_PRIVATE_OUT` |
| `audio`  | Every clip in `audio/index.json` lies inside its MP3 file and starts on a frame header. Every key Drive mode can request exists: a static pass over all items, plus the real `driveScript()` at every point of the course. | |
| `rules`  | For every session in order, every word on screen outside a teaching step has been taught before. This covers review, meaning, warm, listen, quiz items and options, conversation, questions and answers, build patterns and swap words, speak hints and the introduction. Name, place-slot and number words are exempt and listed separately; drills are listed as exempt. Random picks are made exhaustive. | `SJ_RULES_SELFTEST=1` adds an untaught line to prove the check fails |
| `doses`  | Prints new words and items for each learning day (`newToday`). It flags days with more than 7 words or more than 12 items, but only reports them. | `SJ_DOSES_STRICT=1` to fail on flags |
| `state`  | Loads the owner's saved progress (read at run time, never copied) into localStorage. It expects week 2, day 3 next and 25 learned items (`learnedIds` + `staffKnown`). | `SJ_STATE`, `SJ_STATE_NOW` |
| `walk`   | Uses a fake clock. A learner does one session a day from day 1 by clicking: Start, each step (answers quizzes and reviews), then rate or self-check. It checks that there are no page errors and that every session finishes. If the flight day arrives first, it stops with a NOTE. | `SJ_WALK_DAYS`, `SJ_WALK_START`, `SJ_WALK_PER_DAY=app`, `SJ_WALK_HARD=n`, `SJ_WALK_VERBOSE=1` |

## Audio

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
