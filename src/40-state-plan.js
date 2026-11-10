/* ---------- your answers (profile) ---------- */
function prof(){return Object.assign({name:"",nameKana:"",nameAuto:true,origin:"",originKana:"",originAuto:true,job:"enjinia",hobby:"haikingu",food:"raamen",city:"Kyouto"},store.get("profile",{}))}
function val(key,k){const p=prof();
  if(key==="name")return [p.name||"Kuma",p.nameKana||"クマ",p.name||"Kuma"][k];
  if(key==="origin")return [p.origin||"Denver",p.originKana||"デンバー",p.origin||"Denver"][k];
  const b=BANK[key].find(x=>x[0]===p[key])||BANK[key][0];return b[k]}
function fill(s,k){return s.replace(/\{(\w+)\}/g,(m,key)=>"["+val(key,k)+"]")}
function profileSet(){const p=prof();return !!(p.name&&p.origin)}

/* ---------- state ---------- */
const deck=[];WEEKS.forEach((w,wi)=>w.phrases.forEach((p,pi)=>deck.push({id:wi+"-"+pi,w:wi,ro:p[0],jp:p[1],en:p[2]})));
// the week's swap words (pattern nouns) are word cards in the deck too: id w-xK keeps the swap word's place K (pruned ones leave a gap)
WEEKS.forEach((w,wi)=>swapWords(wi).forEach((x,k)=>{if(!PRUNED.has(x.ro))deck.push({id:wi+"-x"+k,w:wi,ro:x.ro,jp:x.jp,en:x.en,word:true})}));
// number and time words (NUMW): id H-nK (H = home week); .w becomes the week whose learning days teach it (see LP)
{const k={};NUMW.forEach(([h,ro,jp,en,say])=>{k[h]=k[h]||0;deck.push({id:h+"-n"+(k[h]++),w:h,home:h,ro,jp,en,say,word:true,num:true})})}
STAFF.forEach((arr,wi)=>arr.forEach((x,k)=>deck.push({id:wi+"-s"+k,w:wi,ro:x[0],jp:x[1],en:x[2],reply:x[3],replyEn:x[4],replyJp:x[5]||"",staff:true})));
const staffIds=(w,upTo)=>deck.filter(c=>c.staff&&(upTo?c.w<=w:c.w===w)).map(c=>c.id);
const halfOf=w=>Math.ceil(WEEKS[w].phrases.length/2);
function partIds(w,half){const n=WEEKS[w].phrases.length,h=halfOf(w),ids=[];for(let i=0;i<n;i++)if(half==="all"||(half==="a"?i<h:i>=h))ids.push(w+"-"+i);return ids}
const byId=id=>deck.find(c=>c.id===id);
// ---- learning plan: what is met on which day (phase 4) ----
// Every week keeps the number of learning days it had (3 or 4; LP_V1 is that old packing, kept to migrate old progress).
// Phrases and staff phrases keep their order and bring the words bound to them (newWordsFor). Then the week's floating words (swap words
// that are new, and the number/time words) are spread over the days by the room each has. Hard caps per day: 7 new words and 12 new
// items (a word, a phrase and a staff phrase each count as one). Floating words that do not fit move to the next week's days.
const LP_V1=[[["0-0","0-1","0-2","0-3","0-4","0-5"],["0-6","0-7","0-8","0-9","0-10"],["0-x0","0-x1","0-x2","0-x3","0-x4","0-x5","0-s0","0-s1","0-s2"]],[["1-0","1-1","1-2"],["1-3","1-4"],["1-5","1-6","1-7","1-8"],["1-9","1-x0","1-x1","1-x2","1-x3","1-x4","1-x5","1-s0","1-s1"]],[["2-0","2-1","2-2","2-3"],["2-4","2-5","2-6","2-7","2-8","2-9"],["2-10","2-11","2-12","2-x0","2-x1","2-x2","2-x3","2-x4","2-x5"],["2-s0","2-s1","2-s2","2-s3"]],[["3-0","3-1","3-2"],["3-3","3-4","3-5","3-6"],["3-7","3-8"],["3-9","3-x0","3-x1","3-x2","3-x3","3-x4","3-x5","3-s0","3-s1"]],[["4-0","4-1","4-2"],["4-3","4-4","4-5"],["4-6","4-7","4-8"],["4-9","4-10","4-x0","4-x1","4-x2","4-x3","4-x4","4-x5","4-s0","4-s1"]],[["5-0","5-1","5-2"],["5-3","5-4","5-5"],["5-6","5-7","5-8","5-9"],["5-10","5-x0","5-x1","5-x2","5-x3","5-x4","5-x5","5-s0"]],[["6-0","6-1","6-2","6-3","6-4"],["6-5","6-6","6-7"],["6-8","6-9","6-10","6-11","6-x0","6-x1","6-x2","6-x3","6-x4","6-x5"]],[["7-0","7-1","7-2"],["7-3","7-4","7-5"],["7-6","7-7","7-8","7-9","7-x0","7-x1","7-x2","7-x3","7-x4","7-x5"]],[["8-0","8-1","8-2"],["8-3","8-4","8-5"],["8-6","8-7","8-8","8-9","8-10"],["8-11","8-12","8-13","8-x0","8-x1","8-x2","8-x3","8-x4","8-x5","8-s0","8-s1"]],[["9-0","9-1","9-2","9-3","9-4"],["9-5","9-6","9-7"],["9-8","9-s0"]]];
const CAP_WORDS=7,CAP_ITEMS=12;
// a word card brings a new word unless the word was met before: inside a phrase (WORD_FIRST) or as an earlier week's card
const FIRSTCARD={};deck.forEach(c=>{if(c.word&&!c.num){const k=c.ro.toLowerCase();if(!(k in FIRSTCARD))FIRSTCARD[k]=c.id}});
const isNewFloat=c=>!!(c.num||(WORD_FIRST[wordTok(c.ro)[0]]==null&&FIRSTCARD[c.ro.toLowerCase()]===c.id));
const LP=(()=>{let carry=[];return WEEKS.map((W,w)=>{
  const unit=id=>{const c=byId(id),reply=c.staff&&c.reply&&!c.reply.startsWith("(")?c.reply:"",nw=newWordsFor(id,c.ro+(reply?" "+reply:"")).length;return{id,k:c.staff?"s":"p",words:nw,items:1+nw}};
  const U=W.phrases.map((p,i)=>unit(w+"-"+i)).concat(deck.filter(c=>c.staff&&c.w===w).map(c=>unit(c.id)));
  const ex=deck.filter(c=>c.w===w&&c.word&&!c.num),own=ex.filter(isNewFloat).map(c=>c.id),old=ex.filter(c=>!isNewFloat(c)).map(c=>c.id);
  const fl=carry.concat(own,deck.filter(c=>c.num&&c.home===w).map(c=>c.id)),L=LP_V1[w].length,n=U.length;
  const room=D=>Math.max(0,Math.min(CAP_WORDS-D.words,CAP_ITEMS-D.items));
  const mk=cuts=>{const days=[];let from=0;[...cuts,n].forEach(to=>{const g=U.slice(from,to);days.push({ph:g.filter(u=>u.k==="p").map(u=>u.id),st:g.filter(u=>u.k==="s").map(u=>u.id),fl:[],words:g.reduce((a,u)=>a+u.words,0),items:g.reduce((a,u)=>a+u.items,0)});from=to});
    const over=days.reduce((a,D)=>a+Math.max(0,D.words-CAP_WORDS)+Math.max(0,D.items-CAP_ITEMS),0);
    // each day takes its share of the floating words still to place, never more than its room. Filled from the last learning day back,
    // so the first days stay as they were (and someone who already did them is not sent back); the order of the words is kept.
    const takes=[];let left=fl.length;for(let d=days.length-1;d>=0;d--){const earlier=days.slice(0,d).reduce((a,x)=>a+room(x),0),t=Math.min(room(days[d]),left,Math.max(Math.ceil(left/(d+1)),left-earlier));takes[d]=t;left-=t}
    const rest=fl.slice();days.forEach((D,d)=>{D.fl=rest.splice(0,takes[d]);D.words+=takes[d];D.items+=takes[d]});
    return{days,over,spill:rest,spillOwn:rest.filter(id=>own.includes(id)).length}};
  let best=null;const score=r=>[r.over,r.spillOwn,r.spill.length,Math.max(...r.days.map(D=>D.items)),r.days.reduce((a,D)=>a+D.items*D.items,0)];
  const better=(a,b)=>{for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]<b[i]}return false};
  const tryCuts=cuts=>{const r=mk(cuts),sc=score(r);if(!best||better(sc,best.sc))best={r,sc}};
  if(L===3){for(let i=1;i<n;i++)for(let j=i+1;j<n;j++)tryCuts([i,j])}else for(let i=1;i<n;i++)for(let j=i+1;j<n;j++)for(let k=j+1;k<n;k++)tryCuts([i,j,k]);
  const days=best.r.days;carry=best.r.spill;
  // swap words already known from a phrase are heard again as words on the day that teaches the week's other words (no new load)
  if(old.length){const d=days.map(D=>D.fl.length>0).lastIndexOf(true);days[d<0?days.length-1:d].fl.push(...old)}
  days.forEach(D=>D.fl.forEach(id=>{const c=byId(id);if(c.num)c.w=w}));
  days.spill=carry;return days})})();
const DAYOF={};LP.forEach((days,w)=>days.forEach((D,k)=>D.ph.concat(D.fl,D.st).forEach(id=>DAYOF[id]=k)));
const DAYOF_V1={};LP_V1.forEach(days=>days.forEach((ids,k)=>ids.forEach(id=>DAYOF_V1[id]=k)));
const learnDays=w=>LP[w].length;
// the word cards taught on week w's learning days (swap words and number/time words)
const wordIds=w=>LP[w].flatMap(D=>D.fl);
function hearHTML(w,compact){const L=learnedIds(),H=wordsFor(w).filter(h=>{const c=deck.find(x=>x.w===w&&x.word&&!x.num&&x.ro===h.ro);return c&&L.has(c.id)});if(!H.length)return"";return`<div class="panel" style="gap:8px"><div class="label">This week's words</div><div class="words">${H.map(h=>`<button class="word" data-word="${esc(h.jp)}" data-wro="${esc(h.ro)}"><span class="ro" style="font-size:1rem">${esc(h.ro)}</span><span class="r">${esc(h.en)}</span></button>`).join("")}</div>${compact?"":`<p class="small muted">Tap to hear. Everything in the conversation is either one of these or a phrase you've learned.</p>`}</div>`}
function takeSome(arr,n){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,n)}
const _dch=()=>Object.assign({},CFG.ch,(store.get("discord",{})||{}).ch||{});
const CH=_dch();
const chLink=(k,text)=>CH[k]?`<a class="link" href="${esc(CH[k])}" target="_blank" rel="noopener">${text||"#"+({today:"lesson-today",feedback:"app-feedback"})[k]}</a>`:`<b>${esc(text||"#"+({today:"lesson-today",feedback:"app-feedback"})[k])}</b>`;
const ctlHTML=()=>`<div class="ctl"><label class="small" for="pl-rate">Voice speed</label><input id="pl-rate" type="range" min="0.7" max="1.2" step="0.05" value="${vrate}"><span class="small" id="pl-ratev" style="font-variant-numeric:tabular-nums">${Math.round(vrate*100)}%</span></div><div class="ctl"><label class="small" for="pl-gap">Time to answer</label><input id="pl-gap" type="range" min="1" max="8" step="1" value="${store.get("gap",3)}"><span class="small" id="pl-gapv" style="font-variant-numeric:tabular-nums">${store.get("gap",3)}s</span></div>`;
function bindCtl(el){const r=el.querySelector("#pl-rate");if(r)r.oninput=e=>{setVrate(+e.target.value);el.querySelector("#pl-ratev").textContent=Math.round(vrate*100)+"%"};const g=el.querySelector("#pl-gap");if(g)g.oninput=e=>{store.set("gap",+e.target.value);el.querySelector("#pl-gapv").textContent=e.target.value+"s"}}
const SOUND_TIPS='<div class="note"><b>Hearing nothing?</b><ul><li><b>iPhone:</b> the Ring/Silent switch on the left side must be on ring (or turn Silent mode off in Control Center), and turn the volume up. Japanese audio follows that switch.</li><li>Check that audio isn\'t going to earbuds or a speaker over Bluetooth.</li><li>No Japanese voice yet? iPhone: Settings → Accessibility → Spoken Content → Voices → Japanese → download Kyoko. Android: Settings → Text-to-speech → add Japanese.</li><li>Opened inside another app (Claude, Discord, Instagram)? Use its "open in browser" option: Safari and Chrome always work.</li></ul></div>';
const NOSOUND='<details class="nosound small"><summary>🔇 No sound?</summary>'+SOUND_TIPS+'</details>';
// with recorded voices the per-step "No sound?" boxes go; one short help sits in the session's gear instead
const nosound=()=>audioOK()?"":NOSOUND;
const GEAR_HELP='<details class="small"><summary>🔇 No sound?</summary><ul class="small"><li>Turn the volume up; on iPhone, check the Ring/Silent switch if you hear nothing.</li><li>Check that audio isn\'t going to Bluetooth earbuds or a speaker.</li><li>Opened inside another app (Claude, Discord, Instagram)? Open the page in Safari or Chrome.</li></ul></details>';
let listening=false,talking=false,wake=null;
function stopAll(){runId++;stopSpeech();if(typeof driveStop==="function")driveStop();listening=false;talking=false;learnOn=false;try{wake&&wake.release()}catch(e){}wake=null}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const hl=s=>esc(s).replace(/\[(.+?)\]/g,'<span class="swap">$1</span>');
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
// one phrase, romaji first (Japanese writing only when the viewer turned it on)
const lines=(ro,jp,en,cls)=>`<div style="min-width:0" class="${cls||""}"><div class="ro">${hl(ro)}</div><div class="en muted small">${hl(en)}</div><div class="jpw">${hl(jp)}</div></div>`;

/* planner: see 42-plan.js */
const pd=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
function discordCfg(){const d=Object.assign({name:"",feedback:""},store.get("discord",{}));if(!d.name)d.name=prof().name;return d}
function discordReady(){const d=discordCfg();return !!(d.feedback||IN_CLAUDE)}
async function discordPost(url,content,name){const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:name,content,allowed_mentions:{parse:[]}})});if(!r.ok)throw new Error("HTTP "+r.status)}
