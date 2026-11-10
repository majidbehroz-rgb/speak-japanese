"""Record new clips and append them to the app's audio sprites without moving any existing clip.

  python3 append_clips.py --audio DIR --clips new.json [--dry]

new.json: [{"k": "<clip key>", "w": <week 0-9 or "c" for coach>, "text": "<what to say>", "jp": "<japanese, for j/s/w/k keys>"}]
Key kinds: e (English meaning, Kokoro af_heart), c (coach, Kokoro am_michael), j/s/w (learner's Japanese voice),
k (staff voice). Japanese kinds need the VOICEVOX engine (vv.py); English kinds need only Kokoro.
Encoding matches the existing sprites: 16 kHz mono MP3, 32 kbps, frames split so byte ranges are exact.
"""
import argparse, base64, json, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf

SR = 16000
ENC = ['-ar', str(SR), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '32k', '-reservoir', '0', '-write_xing', '0', '-id3v2_version', '0', '-f', 'mp3']
EN_VOICE = {'e': ('af_heart', 1.0), 'c': ('am_michael', 1.0)}
_k = None

def kokoro():
    global _k
    if _k is None:
        from kokoro_onnx import Kokoro
        here = os.environ.get('SJ_TTS_HOME') or os.path.dirname(os.path.abspath(__file__))
        _k = Kokoro(os.path.join(here, 'kokoro-v1.0.onnx'), os.path.join(here, 'voices-v1.0.bin'))
    return _k

def frames(b):
    out = []; i = 0
    BR = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
    while i + 4 <= len(b):
        if b[i] == 0xFF and (b[i+1] & 0xE0) == 0xE0:
            bri = b[i+2] >> 4; pad = (b[i+2] >> 1) & 1
            L = 72000 * BR[bri] // SR + pad
            out.append(b[i:i+L]); i += L
        else:
            i += 1
    return out

def enc(a, sr):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: p = f.name
    sf.write(p, a, sr)
    try:
        return subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', p, *ENC, '-'], capture_output=True, check=True).stdout
    finally:
        os.unlink(p)

def trim(a, sr, thr=0.01, keep=0.05):
    idx = np.where(np.abs(a) > thr)[0]
    if not len(idx): return a
    k = int(keep * sr)
    return a[max(0, idx[0]-k): idx[-1]+k]

def norm(a, target_db=-19):
    rms = np.sqrt(np.mean(a**2)) + 1e-9
    a = a * (10 ** (target_db/20) / rms)
    pk = np.max(np.abs(a))
    return a / pk * 0.95 if pk > 0.95 else a

def synth(kind, text, jp):
    if kind in EN_VOICE:
        voice, speed = EN_VOICE[kind]
        a, sr = kokoro().create(text, voice=voice, speed=speed, lang='en-us')
        return np.asarray(a, dtype=np.float32), sr
    import vv  # VOICEVOX wrapper; only present once the engine is installed
    return vv.synth(kind, text, jp)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--audio', required=True); ap.add_argument('--clips', required=True); ap.add_argument('--dry', action='store_true')
    a = ap.parse_args()
    meta = json.load(open(os.path.join(a.audio, 'index.json'), encoding='utf8'))
    clips = json.load(open(a.clips, encoding='utf8'))
    todo = [c for c in clips if c['k'] not in meta['clips']]
    print(f"{len(clips)} requested, {len(clips)-len(todo)} already recorded, {len(todo)} to record")
    if a.dry: return 0
    files = {}
    for c in todo:
        kind = c['k'][0]
        wav, sr = synth(kind, c.get('text') or c['k'][2:], c.get('jp', ''))
        wav = norm(trim(wav, sr))
        wav = np.concatenate([np.zeros(int(0.05*sr), dtype=np.float32), wav, np.zeros(int(0.1*sr), dtype=np.float32)])
        fr = frames(enc(wav, sr)); data = b''.join(fr)
        name = 'coach.mp3' if c['w'] == 'c' else f"w{int(c['w'])+1}.mp3"
        if name not in files:
            p = os.path.join(a.audio, name); files[name] = bytearray(open(p, 'rb').read() if os.path.exists(p) else b'')
        meta['clips'][c['k']] = [name, len(files[name]), len(data), len(fr)]
        files[name] += data
    for n, b in files.items(): open(os.path.join(a.audio, n), 'wb').write(b)
    json.dump(meta, open(os.path.join(a.audio, 'index.json'), 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print('recorded', len(todo), 'clips into', sorted(files))
    return 0

if __name__ == '__main__':
    sys.exit(main())
