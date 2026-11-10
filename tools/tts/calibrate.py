import json, io, subprocess, numpy as np, soundfile as sf, re, sys
import vv
A='/home/claude/speak-japanese/audio/'
m=json.load(open(A+'index.json'))
import subprocess
def old(key):
    f,off,ln,nf=m['clips'][key];b=open(A+f,'rb').read()[off:off+ln]
    wav=subprocess.run(['ffmpeg','-v','error','-i','pipe:0','-ar','24000','-f','wav','pipe:1'],input=b,capture_output=True).stdout
    a,sr=sf.read(io.BytesIO(wav),dtype='float32');return a,sr
def speech_len(a,sr,thr=0.02):
    idx=np.where(np.abs(a)>thr)[0];return (idx[-1]-idx[0])/sr if len(idx) else 0
def f0(a,sr):
    # crude mean pitch via autocorrelation on voiced frames
    out=[];n=int(0.04*sr)
    for i in range(0,len(a)-n,n):
        x=a[i:i+n]
        if np.sqrt(np.mean(x**2))<0.03: continue
        x=x-np.mean(x);ac=np.correlate(x,x,'full')[n-1:]
        lo,hi=int(sr/450),int(sr/70);k=lo+np.argmax(ac[lo:hi])
        if ac[k]>0.3*ac[0]: out.append(sr/k)
    return float(np.median(out)) if out else 0
# sample phrases with their Japanese from the built page
src=open('/home/claude/speak-japanese/index.html',encoding='utf8').read()
pairs=re.findall(r'\["([A-Z][^"\[\]/]{3,40})","([^"\[\]/]{2,30})","[^"]*"\]',src)
seen=set();rows={'j':[],'s':[],'k':[]}
for ro,jp in pairs:
    if ro in seen or not re.search(r'[぀-ヿ一-鿿]',jp): continue
    seen.add(ro)
    for kind in ('j','s','k'):
        key=kind+':'+ro
        if key in m['clips'] and len(rows[kind])<14:
            a,sr=old(key);b,_=vv.synth(kind,'',jp,speed=1.0)
            rows[kind].append((ro,speech_len(a,sr),speech_len(b,sr),f0(a,sr),f0(b,sr)))
res={}
for kind,r in rows.items():
    if not r: continue
    ratio=np.median([n/o for _,o,n,_,_ in r if o>0])   # new(speed1)/old = speed that was used
    print(kind,'n',len(r),'speed≈',round(float(ratio),3),'| f0 old',round(np.median([x[3] for x in r])),'new',round(np.median([x[4] for x in r])))
    for x in r[:4]: print('   ',x[0][:28].ljust(28),'old',round(x[1],2),'new@1.0',round(x[2],2),'ratio',round(x[2]/x[1],2))
    res[kind]=round(float(ratio),3)
print(res)
