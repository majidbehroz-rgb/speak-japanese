/* ---------- speech ---------- */
let voices=[];
const hasTTS="speechSynthesis" in window;
function loadVoices(){try{voices=speechSynthesis.getVoices()||[]}catch(e){voices=[]}}
if(hasTTS){loadVoices();speechSynthesis.onvoiceschanged=()=>{loadVoices();renderVoiceWarn()}}
function pickVoice(lang){const l=voices.filter(v=>(v.lang||"").toLowerCase().replace("_","-").startsWith(lang));return l.find(v=>v.localService)||l[0]}
const clean=t=>t.replace(/[\[\]]/g,"").replace(/ \/ /g,"、");
let rate=store.get("rate2",0.75);
function speak(text,lang,r){return new Promise(res=>{
  if(!hasTTS) return setTimeout(res,Math.max(1500,text.length*120));
  const u=new SpeechSynthesisUtterance(lang==="ja"?clean(text):text.replace(/[\[\]]/g,""));
  u.lang=lang==="ja"?"ja-JP":"en-US";const v=pickVoice(lang);if(v)u.voice=v;
  const base=lang==="ja"?rate:Math.min(1,0.35+rate*0.75);u.rate=Math.max(0.3,Math.min(1.5,base*(r||1)));let done=false;const fin=()=>{if(!done){done=true;res()}};
  u.onend=fin;u.onerror=fin;try{speechSynthesis.resume();speechSynthesis.speak(u)}catch(e){fin()}
  // safety net if onend never fires: wait the expected length for this speed, then keep waiting while the voice is still talking
  const est=Math.max(3000,text.length*(lang==="ja"?420:110)/u.rate)+1500;let extra=0;
  const chk=()=>{if(done)return;let busy=false;try{busy=speechSynthesis.speaking||speechSynthesis.pending}catch(e){}if(!busy||extra>=Math.min(20000,est)){fin();return}extra+=300;setTimeout(chk,300)};setTimeout(chk,est);
})}
function stopSpeech(){try{speechSynthesis.cancel()}catch(e){}}
// iOS needs one utterance started inside a tap before speech works from timers
let unlocked=false;
document.addEventListener("click",()=>{if(unlocked||!hasTTS)return;unlocked=true;try{const u=new SpeechSynthesisUtterance(" ");u.volume=0;speechSynthesis.speak(u)}catch(e){}},true);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let runId=0;
function sayNow(t,btn){runId++;stopSpeech();document.querySelectorAll(".say.on").forEach(b=>b.classList.remove("on"));if(btn)btn.classList.add("on");
  setTimeout(()=>speak(t,"ja").then(()=>btn&&btn.classList.remove("on")),60)}
const SPK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
const VOICE_WARN='<p class="warnbox" data-voicewarn hidden>No Japanese voice found on this device. On iPhone: Settings → Accessibility → Spoken Content → Voices → Japanese. On Android: add Japanese in Text-to-speech settings.</p>';
function renderVoiceWarn(){document.querySelectorAll("[data-voicewarn]").forEach(el=>{
  if(!hasTTS){el.hidden=false;el.textContent="This browser can't speak. Open the page in Safari or Chrome to hear Japanese audio.";return}
  const has=voices.some(v=>(v.lang||"").toLowerCase().startsWith("ja"));el.hidden=has||voices.length===0})}

/* ---------- numbers ---------- */
const DK=["","いち","に","さん","よん","ご","ろく","なな","はち","きゅう"],DR=["","ichi","ni","san","yon","go","roku","nana","hachi","kyuu"];
const HK=["","ひゃく","にひゃく","さんびゃく","よんひゃく","ごひゃく","ろっぴゃく","ななひゃく","はっぴゃく","きゅうひゃく"],HR=["","hyaku","nihyaku","sanbyaku","yonhyaku","gohyaku","roppyaku","nanahyaku","happyaku","kyuuhyaku"];
const TK=["","せん","にせん","さんぜん","よんせん","ごせん","ろくせん","ななせん","はっせん","きゅうせん"],TR=["","sen","nisen","sanzen","yonsen","gosen","rokusen","nanasen","hassen","kyuusen"];
function small(n){const t=Math.floor(n/1000),h=Math.floor(n%1000/100),d=Math.floor(n%100/10),o=n%10;const k=[],r=[];
  if(t){k.push(TK[t]);r.push(TR[t])}if(h){k.push(HK[h]);r.push(HR[h])}
  if(d){k.push((d>1?DK[d]:"")+"じゅう");r.push((d>1?DR[d]+"-":"")+"juu")}
  if(o){k.push(DK[o]);r.push(DR[o])}return{k:k.join(""),r:r.join(" ")}}
function jaNum(n){if(n>=10000){const m=small(Math.floor(n/10000)),rest=small(n%10000);return{k:m.k+"まん"+rest.k,r:(m.r+"-man "+rest.r).trim()}}return small(n)}

/* ---------- romaji → katakana (a guess the user can fix) ---------- */
const KT={a:"ア",i:"イ",u:"ウ",e:"エ",o:"オ",ka:"カ",ki:"キ",ku:"ク",ke:"ケ",ko:"コ",sa:"サ",shi:"シ",su:"ス",se:"セ",so:"ソ",ta:"タ",chi:"チ",tsu:"ツ",te:"テ",to:"ト",na:"ナ",ni:"ニ",nu:"ヌ",ne:"ネ",no:"ノ",ha:"ハ",hi:"ヒ",fu:"フ",hu:"フ",he:"ヘ",ho:"ホ",ma:"マ",mi:"ミ",mu:"ム",me:"メ",mo:"モ",ya:"ヤ",yu:"ユ",yo:"ヨ",ye:"イェ",yi:"イ",ra:"ラ",ri:"リ",ru:"ル",re:"レ",ro:"ロ",wa:"ワ",wi:"ウィ",wu:"ウ",we:"ウェ",wo:"ウォ",ga:"ガ",gi:"ギ",gu:"グ",ge:"ゲ",go:"ゴ",za:"ザ",ji:"ジ",zu:"ズ",ze:"ゼ",zo:"ゾ",zi:"ズィ",da:"ダ",di:"ディ",du:"ドゥ",de:"デ",do:"ド",ba:"バ",bi:"ビ",bu:"ブ",be:"ベ",bo:"ボ",pa:"パ",pi:"ピ",pu:"プ",pe:"ペ",po:"ポ",sha:"シャ",shu:"シュ",she:"シェ",sho:"ショ",cha:"チャ",chu:"チュ",che:"チェ",cho:"チョ",ja:"ジャ",ju:"ジュ",je:"ジェ",jo:"ジョ",fa:"ファ",fi:"フィ",fe:"フェ",fo:"フォ",ti:"ティ",tu:"トゥ",si:"スィ",kya:"キャ",kyu:"キュ",kyo:"キョ",gya:"ギャ",gyu:"ギュ",gyo:"ギョ",nya:"ニャ",nyu:"ニュ",nyo:"ニョ",hya:"ヒャ",hyu:"ヒュ",hyo:"ヒョ",mya:"ミャ",myu:"ミュ",myo:"ミョ",rya:"リャ",ryu:"リュ",ryo:"リョ",bya:"ビャ",byu:"ビュ",byo:"ビョ",pya:"ピャ",pyu:"ピュ",pyo:"ピョ"};
function kata(s){const V="aiueo";
  s=s.toLowerCase().replace(/[^a-z\s-]/g,"").replace(/ee|ey|ie/g,"ii").replace(/oo/g,"uu").replace(/ay/g,"ei")
   .replace(/l/g,"r").replace(/v/g,"b").replace(/ph/g,"f").replace(/th/g,"s").replace(/ck/g,"kk")
   .replace(/ch(?![aiueo])/g,"k").replace(/c(?!h)(?=[ei])/g,"s").replace(/c(?!h)/g,"k").replace(/q/g,"k").replace(/x/g,"kus").replace(/y(?![aiueo])/g,"i");
  let out="",i=0;
  while(i<s.length){const c=s[i];
    if(c===" "||c==="-"){out+="・";i++;continue}
    if(V.includes(c)){if(i>0&&s[i-1]===c){out+="ー"}else out+=KT[c];i++;continue}
    const nx=s[i+1]||"";
    if(c==="n"&&!(nx&&V.includes(nx))&&nx!=="y"){out+="ン";i++;continue}
    if(nx===c&&c!=="n"){out+="ッ";i++;continue}
    let m=null;for(const len of [3,2]){const seg=s.substr(i,len);if(KT[seg]&&V.includes(seg[seg.length-1])){m=seg;break}}
    if(m){out+=KT[m];i+=m.length;continue}
    let cons=c;const two=s.substr(i,2);if(["sh","ch","ts"].includes(two))cons=two;
    const def=(cons==="t"||cons==="d")?"o":(cons==="ch"||cons==="sh"||cons==="j")?"i":"u";
    out+=KT[cons+def]||KT[cons+"u"]||"";i+=cons.length}
  return out.replace(/ンン$/,"ン").replace(/・$/,"")}

