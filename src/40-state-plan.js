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
// the week's extra words (pattern nouns + the other person's phrases) are learned on one of the learning days and live in the deck too
WEEKS.forEach((w,wi)=>wordsFor(wi).forEach((x,k)=>deck.push({id:wi+"-x"+k,w:wi,ro:x.ro,jp:x.jp,en:x.en,word:true})));
const wordIds=w=>deck.filter(c=>c.w===w&&c.word).map(c=>c.id);
STAFF.forEach((arr,wi)=>arr.forEach((x,k)=>deck.push({id:wi+"-s"+k,w:wi,ro:x[0],jp:x[1],en:x[2],reply:x[3],replyEn:x[4],replyJp:x[5]||"",staff:true})));
const staffIds=(w,upTo)=>deck.filter(c=>c.staff&&(upTo?c.w<=w:c.w===w)).map(c=>c.id);
const halfOf=w=>Math.ceil(WEEKS[w].phrases.length/2);
function partIds(w,half){const n=WEEKS[w].phrases.length,h=halfOf(w),ids=[];for(let i=0;i<n;i++)if(half==="all"||(half==="a"?i<h:i>=h))ids.push(w+"-"+i);return ids}
const byId=id=>deck.find(c=>c.id===id);
// ---- learning plan: what is met on which day ----
// Week 1 stays as it was: the phrases in two halves, then the extra words and what staff say. Every later week is packed so no day brings more than
// about 12 new things (a word, a phrase and a staff phrase each count as one). Light weeks use three days; heavy ones take a fourth, and use days shrink to match.
const MAXNEW=12,HEAVY=35;
const LP=WEEKS.map((W,w)=>{
  const WW=1.5,sc=c=>1+WW*newWordsFor(c.id,c.ro+" "+(c.reply&&!c.reply.startsWith("(")?c.reply:"")).length;   // a new word weighs a little more than a phrase it sits in: too many words in one day was what made week 2 hard
  const U=W.phrases.map((p,i)=>({k:"p",id:w+"-"+i,c:1+WW*newWordsFor(w+"-"+i,p[0]).length,n:1+newWordsFor(w+"-"+i,p[0]).length}));
  const xs=wordIds(w);if(xs.length)U.push({k:"x",c:Math.round(xs.length*0.5),n:Math.round(xs.length*0.5)});
  staffIds(w).forEach(id=>U.push({k:"s",id,c:sc(byId(id)),n:1+newWordsFor(id,byId(id).ro+" "+(byId(id).reply&&!byId(id).reply.startsWith("(")?byId(id).reply:"")).length}));
  const mk=cuts=>{const days=[];let from=0;[...cuts,U.length].forEach(to=>{const g=U.slice(from,to);days.push({ph:g.filter(u=>u.k==="p").map(u=>u.id),x:g.some(u=>u.k==="x"),st:g.filter(u=>u.k==="s").map(u=>u.id),cost:g.reduce((a,u)=>a+u.c,0)});from=to});return days};
  if(w===0){const h=halfOf(0);return mk([h,W.phrases.length])}
  const total=U.reduce((a,u)=>a+(u.n||u.c),0),words=U.reduce((a,u)=>a+(u.n?u.n-(u.k==="p"||u.k==="s"?1:0):0),0),L=(total>HEAVY||words>18)?4:3,n=U.length;let best=null;
  const score=days=>[Math.max(...days.map(d=>d.cost)),days.reduce((a,d)=>a+d.cost*d.cost,0)];
  const try_=cuts=>{const days=mk(cuts),s=score(days);if(!best||s[0]<best.s[0]||(s[0]===best.s[0]&&s[1]<best.s[1]))best={s,days}};
  for(let i=1;i<n;i++)for(let j=i+1;j<n;j++){if(L===3)try_([i,j]);else for(let k=j+1;k<n;k++)try_([i,j,k])}
  return best.days});
const DAYOF={};LP.forEach((days,w)=>days.forEach((D,k)=>{D.ph.forEach(id=>DAYOF[id]=k);if(D.x)wordIds(w).forEach(id=>DAYOF[id]=k);D.st.forEach(id=>DAYOF[id]=k)}));
const learnDays=w=>LP[w].length;
const xDay=w=>{const k=LP[w].findIndex(D=>D.x);return k<0?LP[w].length-1:k};
function hearHTML(w,compact){const H=wordsFor(w);if(!H.length)return"";return`<div class="panel" style="gap:8px"><div class="label">This week's extra words · learned on day ${xDay(w)+1}</div><div class="words">${H.map(h=>`<button class="word" data-word="${esc(h.jp)}"><span class="ro" style="font-size:1rem">${esc(h.ro)}</span><span class="r">${esc(h.en)}</span></button>`).join("")}</div>${compact?"":`<p class="small muted">Tap to hear. Everything in the conversation is either one of these or a phrase you've learned.</p>`}</div>`}
function takeSome(arr,n){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,n)}
const _dch=()=>Object.assign({},CFG.ch,(store.get("discord",{})||{}).ch||{});
const CH=_dch();
const chLink=(k,text)=>CH[k]?`<a class="link" href="${esc(CH[k])}" target="_blank" rel="noopener">${text||"#"+({today:"lesson-today",feedback:"app-feedback"})[k]}</a>`:`<b>${esc(text||"#"+({today:"lesson-today",feedback:"app-feedback"})[k])}</b>`;
const ctlHTML=()=>`<div class="ctl"><label class="small" for="pl-rate">Speed</label><input id="pl-rate" type="range" min="0.3" max="1.1" step="0.05" value="${rate}"><span class="small" id="pl-ratev" style="font-variant-numeric:tabular-nums">${Math.round(rate*100)}%</span></div><div class="ctl"><label class="small" for="pl-gap">Time to answer</label><input id="pl-gap" type="range" min="1" max="8" step="1" value="${store.get("gap",3)}"><span class="small" id="pl-gapv" style="font-variant-numeric:tabular-nums">${store.get("gap",3)}s</span></div>`;
function bindCtl(el){const r=el.querySelector("#pl-rate");if(r)r.oninput=e=>{rate=+e.target.value;store.set("rate2",rate);el.querySelector("#pl-ratev").textContent=Math.round(rate*100)+"%"};const g=el.querySelector("#pl-gap");if(g)g.oninput=e=>{store.set("gap",+e.target.value);el.querySelector("#pl-gapv").textContent=e.target.value+"s"}}
const SOUND_TIPS='<div class="note"><b>Hearing nothing?</b><ul><li><b>iPhone:</b> the Ring/Silent switch on the left side must be on ring (or turn Silent mode off in Control Center), and turn the volume up. Japanese audio follows that switch.</li><li>Check that audio isn\'t going to earbuds or a speaker over Bluetooth.</li><li>No Japanese voice yet? iPhone: Settings → Accessibility → Spoken Content → Voices → Japanese → download Kyoko. Android: Settings → Text-to-speech → add Japanese.</li><li>Opened inside another app (Claude, Discord, Instagram)? Use its "open in browser" option: Safari and Chrome always work.</li></ul></div>';
const NOSOUND='<details class="nosound small"><summary>🔇 No sound?</summary>'+SOUND_TIPS+'</details>';
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
