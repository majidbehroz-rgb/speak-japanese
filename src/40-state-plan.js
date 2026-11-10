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
// phrases the learner has actually met: whole weeks already passed, part 1 after day 1 of a week, part 2 after day 2
function learnedIds(){const s=new Set(),cw=curWeek();for(let w=0;w<cw;w++){partIds(w,"all").forEach(i=>s.add(i));wordIds(w).forEach(i=>s.add(i))}
  PLAN.log.forEach(l=>{if(l.key==="rest"||l.w===undefined)return;LP[l.w].forEach((D,k)=>{if(k<=l.d){D.ph.forEach(i=>s.add(i));if(D.x)wordIds(l.w).forEach(i=>s.add(i))}})});
  if(player&&player.learnIds)player.learnIds.forEach(i=>s.add(i));return s}
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
function knownWords(){const s=new Set(),cw=curWeek();const doneD2=new Set(PLAN.log.filter(l=>l.w!==undefined&&l.d>=xDay(l.w)).map(l=>l.w));
  for(let w=0;w<10;w++)if(w<cw||doneD2.has(w)||(player&&player.s&&player.s.w===w&&player.s.d>=xDay(w)))swapWords(w).forEach(x=>s.add(x.ro));
  const p=prof();["job","hobby","food","city"].forEach(k=>{if(p[k])s.add(p[k])});return s}
function hearHTML(w,compact){const H=wordsFor(w);if(!H.length)return"";return`<div class="panel" style="gap:8px"><div class="label">This week's extra words · learned on day ${xDay(w)+1}</div><div class="words">${H.map(h=>`<button class="word" data-word="${esc(h.jp)}"><span class="ro" style="font-size:1rem">${esc(h.ro)}</span><span class="r">${esc(h.en)}</span></button>`).join("")}</div>${compact?"":`<p class="small muted">Tap to hear. Everything in the conversation is either one of these or a phrase you've learned.</p>`}</div>`}
function takeSome(arr,n){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a.slice(0,n)}
const _dch=()=>Object.assign({},CFG.ch,(store.get("discord",{})||{}).ch||{});
const CH=_dch();
const chLink=(k,text)=>CH[k]?`<a class="link" href="${esc(CH[k])}" target="_blank" rel="noopener">${text||"#"+({today:"lesson-today",feedback:"app-feedback"})[k]}</a>`:`<b>${esc(text||"#"+({today:"lesson-today",feedback:"app-feedback"})[k])}</b>`;
const ctlHTML=()=>`<div class="ctl"><label class="small" for="pl-rate">Speed</label><input id="pl-rate" type="range" min="0.3" max="1.1" step="0.05" value="${rate}"><span class="small" id="pl-ratev" style="font-variant-numeric:tabular-nums">${Math.round(rate*100)}%</span></div><div class="ctl"><label class="small" for="pl-gap">Pause</label><input id="pl-gap" type="range" min="1" max="8" step="1" value="${store.get("gap",3)}"><span class="small" id="pl-gapv" style="font-variant-numeric:tabular-nums">${store.get("gap",3)}s</span></div>`;
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

/* ---------- planner ----------
   The course is a queue of 73 sessions (10 weeks × 7 days + 3 buffer days). You work through the queue
   one session a day; the calendar only decides whether you are ahead or behind. */
function baseQueue(){const q=[];for(let w=0;w<10;w++)for(let d=0;d<7;d++)q.push({w,d,rep:0});for(let i=0;i<3;i++)q.push({w:9,d:7+i,rep:0});return q}
function loadPlan(){const p=store.get("plan",null);if(p&&p.queue&&typeof p.pos==="number")return p;const np={queue:baseQueue(),pos:0,log:[],focus:{},lastAdjust:null};store.set("plan",np);return np}
let PLAN=loadPlan();
function savePlan(){store.set("plan",PLAN)}
const skey=s=>s.w+"-"+s.d+(s.rep?"-r"+s.rep:"");
function sessionTitle(s){if(s.d>=7)return"Final review "+(s.d-6)+" of 3";return(s.rep?"Repeat · ":"")+WEEKS[s.w].title+" · day "+(s.d+1)}
function todayIso(){return iso(new Date())}
function daysLeft(){return Math.max(0,dayDiff(new Date(),TRIP))}
function remaining(){return PLAN.queue.length-PLAN.pos}
function daysAvail(){return daysLeft()-(doneToday()>0?1:0)}
function slackRaw(){return daysAvail()-remaining()}
function bufferLeft(){return PLAN.queue.filter((s,i)=>i>=PLAN.pos&&s.d>=7).length}
function spare(){return slackRaw()+bufferLeft()}
function useSpare(){if(slackRaw()>=1)return true;for(let i=PLAN.queue.length-1;i>=PLAN.pos;i--)if(PLAN.queue[i].d>=7){PLAN.queue.splice(i,1);return true}return false}
function current(){return PLAN.queue[PLAN.pos]||null}
function curWeek(){const c=current();return c?Math.min(9,c.w):9}
function doneToday(){const t=todayIso();return PLAN.log.filter(l=>l.date===t&&l.key!=="rest"&&!l.again).length}
function restedToday(){const t=todayIso();return PLAN.log.some(l=>l.date===t&&l.key==="rest")}
let extraSession=false;
function sessionsToday(){const base=Math.min(2,Math.max(1,Math.ceil((remaining()+doneToday())/Math.max(1,daysLeft()))));return extraSession?Math.max(base,doneToday()+1):base}
function lastActivity(){const l=PLAN.log[PLAN.log.length-1];return l?l.date:null}
function missedDays(){const la=lastActivity();const t=new Date();if(!la)return 0;const d=la.split("-").map(Number);return Math.max(0,dayDiff(new Date(d[0],d[1]-1,d[2]),t)-1)}
function rebalance(){let need=remaining()-daysAvail();if(need<=0||daysLeft()===0)return null;const what={buffer:0,repeat:0,sat:0,dbl:0};
  for(let i=PLAN.queue.length-1;i>=PLAN.pos&&need>0;i--)if(PLAN.queue[i].d>=7){PLAN.queue.splice(i,1);need--;what.buffer++}
  for(let i=PLAN.queue.length-1;i>=PLAN.pos&&need>0;i--)if(PLAN.queue[i].rep){PLAN.queue.splice(i,1);need--;what.repeat++}
  for(let i=PLAN.queue.length-1;i>PLAN.pos&&need>0;i--)if(PLAN.queue[i].d===5&&!PLAN.queue[i].rep){PLAN.queue.splice(i,1);need--;what.sat++}
  what.dbl=Math.max(0,need);const parts=[];
  if(what.buffer)parts.push(`used ${what.buffer} buffer day${what.buffer>1?"s":""} from the final week`);
  if(what.repeat)parts.push(`dropped ${what.repeat} planned repeat${what.repeat>1?"s":""}`);
  if(what.sat)parts.push(`dropped ${what.sat} Saturday drill session${what.sat>1?"s":""}`);
  if(what.dbl)parts.push(`the next ${what.dbl} day${what.dbl>1?"s":""} get two short sessions`);
  const text="Plan adjusted: "+parts.join(", ")+". You still finish before "+fmt(TRIP)+".";PLAN.lastAdjust={date:todayIso(),text};savePlan();return text}
function finishSession(rating,checks){const s=current();if(!s)return"";if(player&&player.stages)srsLearn(player.stages.filter(x=>x.kind==="learn").flatMap(x=>x.ids),todayIso());PLAN.log.push({date:todayIso(),key:skey(s),w:s.w,d:s.d,rating});PLAN.pos++;let msg;
  const canRepeat=s.d<7&&!s.rep&&spare()>=1;
  if(checks){const ratio=checks.filter(Boolean).length/checks.length;
    if(ratio>=0.99)msg="Week "+(s.w+1)+" done. Everything checked, so straight on to the next week.";
    else if(ratio>=0.5)msg="Week "+(s.w+1)+" done. Moving on; this week's phrases get extra weight in your review.";
    else if(spare()>=2){useSpare();useSpare();PLAN.queue.splice(PLAN.pos,0,{w:s.w,d:2,rep:1},{w:s.w,d:3,rep:1});msg="Let's firm this up before moving on: the next two days repeat the dialogue and question sessions. You still finish before "+fmt(TRIP)+"."}
    else msg="No spare days left, so we move on. This week's phrases get extra weight in your review cards, and the questions keep coming back.";
    if(ratio<0.99)PLAN.focus[s.w]=true}
  else if(rating==="hard"){if(canRepeat){const usedBuffer=slackRaw()<1;useSpare();PLAN.queue.splice(PLAN.pos,0,{w:s.w,d:s.d,rep:1});msg="Tough one. Tomorrow repeats this session, then you carry on."+(usedBuffer?" That uses one of your buffer days; you still finish before "+fmt(TRIP)+".":" You still finish before "+fmt(TRIP)+".")}
    else{PLAN.focus[s.w]=true;msg=s.rep?"Moving on; a third pass rarely helps more than daily review. This week's phrases get extra weight in your cards.":"No spare days left, so we move on. This week's phrases get extra weight in your review cards."}}
  else if(rating==="easy")msg="Nice. Moving on."+(slackRaw()>=1?" You're ahead, so a rest day is fine any time.":"");
  else msg="Good. Moving on.";
  PLAN.pending={day:PLAN.pos,total:PLAN.queue.length,label:sessionTitle(s),rating,checks:!!checks,streak:streak(),left:daysLeft()};
  const n=current();savePlan();return msg+(n?" Next: "+sessionTitle(n)+".":" That was the last session. Have a great trip!")}
function restDay(){if(!useSpare())return false;PLAN.log.push({date:todayIso(),key:"rest"});savePlan();return true}
function logAgain(s){const n=PLAN.log.filter(l=>l.again&&l.w===s.w&&l.d===s.d).length+1;PLAN.log.push({date:todayIso(),key:skey(s)+"-x"+n,w:s.w,d:s.d,rating:"again",again:true});
  PLAN.pending={day:PLAN.pos,total:PLAN.queue.length,label:"revisit · "+sessionTitle(s),rating:"again",checks:false,streak:streak(),left:daysLeft()};savePlan();return"Logged as extra practice."}
function streak(){const set=new Set(PLAN.log.map(l=>l.date));let d=mid(new Date()),n=0;if(!set.has(iso(d)))d.setDate(d.getDate()-1);while(set.has(iso(d))){n++;d.setDate(d.getDate()-1)}return n}
const pd=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
function discordCfg(){const d=Object.assign({name:"",feedback:""},store.get("discord",{}));if(!d.name)d.name=prof().name;return d}
function discordReady(){const d=discordCfg();return !!(d.feedback||IN_CLAUDE)}
async function discordPost(url,content,name){const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:name,content,allowed_mentions:{parse:[]}})});if(!r.ok)throw new Error("HTTP "+r.status)}
function projectedDate(idx){let i=PLAN.pos-doneToday(),day=0,left=daysLeft();
  while(day<120){const remain=PLAN.queue.length-i;const cap=Math.min(2,Math.max(1,Math.ceil(remain/Math.max(1,left))));if(idx<i+cap)break;i+=cap;day++;left--}
  const d=new Date();d.setDate(d.getDate()+day);return d}

