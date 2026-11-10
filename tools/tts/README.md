# Recording new lines

The app's audio is recorded, not synthesized on the phone. Voices:

- **VOICEVOX:冥鳴ひまり** (style 14, model `1.vvm`): the learner's lines (`j:` normal, `s:` slow, `w:` single words).
- **VOICEVOX:玄野武宏** (style 11, model `4.vvm`): staff and the other speaker (`k:`).
- **Kokoro** `af_heart` (English meanings, `e:`) and `am_michael` (coach lines, `c:`).

Both VOICEVOX voices are free to use with the credit shown in the app (Plan → Settings and Drive). Keep that credit wherever the audio is used.

## Set up (nothing here is in the repo; about 500 MB)

Put everything in one folder and point `SJ_TTS_HOME` at it (or copy these scripts into it).

```
pip install kokoro-onnx soundfile numpy
# English voice
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
# Japanese voices (into a subfolder named vv/)
mkdir vv && cd vv
V=0.16.4
curl -LO https://github.com/VOICEVOX/voicevox_core/releases/download/$V/voicevox_core-$V-cp310-abi3-manylinux_2_34_x86_64.whl
curl -LO https://github.com/VOICEVOX/onnxruntime-builder/releases/download/voicevox_onnxruntime-1.17.3/voicevox_onnxruntime-linux-x64-1.17.3.tgz
curl -L -o 1.vvm https://github.com/VOICEVOX/voicevox_vvm/releases/download/$V/1.vvm
curl -L -o 4.vvm https://github.com/VOICEVOX/voicevox_vvm/releases/download/$V/4.vvm
curl -LO https://github.com/r9y9/open_jtalk/releases/download/v1.11.1/open_jtalk_dic_utf_8-1.11.tar.gz
tar xzf voicevox_onnxruntime-linux-x64-1.17.3.tgz && tar xzf open_jtalk_dic_utf_8-1.11.tar.gz
pip install ./voicevox_core-$V-cp310-abi3-manylinux_2_34_x86_64.whl
```

Downloading the VOICEVOX models means accepting the VOICEVOX terms (the owner approved this on Nov 10, 2026).
`ffmpeg` must be on the path.

## Record

1. `tools/test.sh audio` writes the list of lines with no recording to `/home/claude/out/tts-needed.json` (`SJ_TTS_OUT` changes the path). The test fails while a lesson line has no clip.
2. English lines (`e:`, `c:`): put them in a clips file `[{"k": key, "w": week 0-9 or "c", "text": what to say}]` and run
   `python3 append_clips.py --audio ../../audio --clips english.json`.
3. Japanese lines: `python3 record_ja.py NEEDED.json ja_clips.json` checks how VOICEVOX reads each line against its romaji
   (rule: on-screen text matches the audio). A line it misreads from the written form (for example はち read as "wachi") is
   recorded from katakana instead; a line it cannot match is left out and reported. Then
   `python3 append_clips.py --audio ../../audio --clips ja_clips.json`.
4. `append_clips.py` only appends: existing clips keep their byte ranges, so phones with older audio keep working and fetch the longer files when the index asks for more.
5. Rebuild and run `tools/test.sh audio audiocache unlock minutes`.

## Matching the existing recordings

`vv_speed.json` holds the VOICEVOX speed for each kind, measured against the original clips with `calibrate.py`
(`j` 0.95, `s` 0.75, `w` 0.75, `k` 0.95). Median pitch of new and old clips matched (about 255 Hz for ひまり, about 125 Hz for 玄野).
Clips are trimmed, levelled to -19 dB RMS and encoded as 16 kHz mono MP3 at 32 kbps, the same as the originals.

`other_lines.js` lists every line spoken by the other person with the `k:` key it should have, including lines that would otherwise fall back to a `j:` clip.
