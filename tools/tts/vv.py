"""VOICEVOX wrapper for the app's Japanese voices.
  learner lines (kinds j, s, w): VOICEVOX:冥鳴ひまり (style 14); staff / the other person (kind k): VOICEVOX:玄野武宏 (style 11).
Returns float32 audio at 24 kHz. Credit both voices wherever the audio is used (the app's Settings / Drive screen does)."""
import io, os
import numpy as np, soundfile as sf
from voicevox_core.blocking import Onnxruntime, OpenJtalk, Synthesizer, VoiceModelFile

HERE = os.environ.get('SJ_TTS_HOME') or os.path.dirname(os.path.abspath(__file__))
VV = os.path.join(HERE, 'vv')
STYLE = {'j': 14, 's': 14, 'w': 14, 'k': 11}
SPEED = {'j': 1.0, 's': 0.75, 'w': 0.9, 'k': 1.0}   # overwritten by calibrate.py results when present
try:
    import json
    SPEED.update(json.load(open(os.path.join(HERE, 'vv_speed.json'))))
except Exception:
    pass
_s = None

def synthesizer():
    global _s
    if _s is None:
        ort = Onnxruntime.load_once(filename=os.path.join(VV, 'voicevox_onnxruntime-linux-x64-1.17.3', 'lib', 'libvoicevox_onnxruntime.so.1.17.3'))
        _s = Synthesizer(ort, OpenJtalk(os.path.join(VV, 'open_jtalk_dic_utf_8-1.11')))
        for f in ('1.vvm', '4.vvm'):
            with VoiceModelFile.open(os.path.join(VV, f)) as m:
                _s.load_voice_model(m)
    return _s

def query(text, kind='j'):
    return synthesizer().create_audio_query(text, STYLE[kind])

def reading(text, kind='j'):
    """katakana reading VOICEVOX will speak (moras joined), for checking against the romaji"""
    q = query(text, kind)
    out = ''
    for ap in q.accent_phrases:
        out += ''.join(m.text for m in ap.moras)
        if ap.pause_mora is not None: out += ' '
    return out.strip()

def synth(kind, text, jp='', speed=None):
    s = synthesizer(); q = s.create_audio_query(jp or text, STYLE[kind])
    q.speed_scale = speed if speed is not None else SPEED[kind]
    wav = s.synthesis(q, STYLE[kind])
    a, sr = sf.read(io.BytesIO(wav), dtype='float32')
    if a.ndim > 1: a = a.mean(axis=1)
    return a, sr

if __name__ == '__main__':
    import sys, time
    t = time.time(); a, sr = synth('j', '', 'おはようございます'); b, _ = synth('k', '', '何名様ですか？')
    print('ok', sr, round(len(a)/sr, 2), round(len(b)/sr, 2), 's; took', round(time.time()-t, 1), 's')
    print(reading('おはようございます'), '|', reading('何名様ですか？', 'k'), '|', reading('明日京都に行きます'))
    sf.write('/tmp/vv_test.wav', np.concatenate([a, np.zeros(sr//2, dtype='float32'), b]), sr)
