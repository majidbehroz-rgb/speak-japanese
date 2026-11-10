"""Check that VOICEVOX reads a Japanese line the way its romaji says (rule: on-screen text matches the audio)."""
import re, vv
K = {'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o','カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko','サ':'sa','シ':'shi','ス':'su','セ':'se','ソ':'so',
 'タ':'ta','チ':'chi','ツ':'tsu','テ':'te','ト':'to','ナ':'na','ニ':'ni','ヌ':'nu','ネ':'ne','ノ':'no','ハ':'ha','ヒ':'hi','フ':'fu','ヘ':'he','ホ':'ho',
 'マ':'ma','ミ':'mi','ム':'mu','メ':'me','モ':'mo','ヤ':'ya','ユ':'yu','ヨ':'yo','ラ':'ra','リ':'ri','ル':'ru','レ':'re','ロ':'ro','ワ':'wa','ヲ':'o','ン':'n',
 'ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go','ザ':'za','ジ':'ji','ズ':'zu','ゼ':'ze','ゾ':'zo','ダ':'da','ヂ':'ji','ヅ':'zu','デ':'de','ド':'do',
 'バ':'ba','ビ':'bi','ブ':'bu','ベ':'be','ボ':'bo','パ':'pa','ピ':'pi','プ':'pu','ペ':'pe','ポ':'po','ヴ':'vu'}
Y = {'ャ':'a','ュ':'u','ョ':'o','ァ':'a','ィ':'i','ゥ':'u','ェ':'e','ォ':'o'}
def kata2ro(s):
    out = ''; i = 0; gem = False
    while i < len(s):
        c = s[i]; nx = s[i+1] if i+1 < len(s) else ''
        if c == 'ッ': gem = True; i += 1; continue
        if c == 'ー': out += out[-1] if out else ''; i += 1; continue
        if c not in K: i += 1; continue
        r = K[c]
        if nx in Y:
            if nx in 'ャュョ':
                base = r[:-1]
                r = (base if base in ('sh', 'ch', 'j') else base + 'y') + Y[nx]
            else:   # small vowel: ファ ティ ウィ etc.
                r = {'フ':'f','テ':'t','デ':'d','ウ':'w','ト':'t','ド':'d','シ':'sh','チ':'ch','ジ':'j','ツ':'ts','ヴ':'v'}.get(c, r[:-1]) + Y[nx]
            i += 1
        if gem: r = ('t' if r.startswith('ch') else r[0]) + r; gem = False
        out += r; i += 1
    return out
def norm(r):
    r = re.sub(r'[^a-z]', '', r.lower())
    return r.replace('ou', 'oo').replace('ei', 'ee').replace('wo', 'o')
def strip(jp): return re.sub(r'[\[\]]', '', jp)
def check(ro, jp, kind='j'):
    rd = vv.reading(strip(jp), kind)
    got = norm(kata2ro(rd.replace(' ', '')))
    want = norm(re.sub(r'\([^)]*\)', '', ro))
    return got == want, rd, got, want
if __name__ == '__main__':
    import json, sys
    d = json.load(open(sys.argv[1] if len(sys.argv) > 1 else '/home/claude/out/tts-needed.json'))
    ja = [x for x in d if not x.get('englishOnly')]
    bad = []
    for x in ja:
        ok, rd, got, want = check(x['ro'], x['jp'], x['key'][0])
        if not ok: bad.append((x['key'], x['jp'], rd, got, want))
    print(len(ja), 'lines;', len(bad), 'reading mismatches')
    for b in bad: print('  ', b[0][:44].ljust(44), '|', b[1][:22], '|', b[2][:26], '| got', b[3][:30], '| want', b[4][:30])
