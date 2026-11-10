/* ---------- PLAN v2 ----------
   The course order: each week's learning days (LP packing, 3 or 4), then ONE "Use it" session (d=6, so old logs of a finished
   week still count); after week 10, up to 3 final rehearsals (w=9, d=7..9).
   PLAN = {v:2, queue:[{w,d,rep?,k?}], pos, log:[{date,key,w,d,rating,k?,again?}], focus:{w:true}, created, startedAt, resetAt?,
           choice:"pending"|"done", pending:{date,label,streak}|null}
   "Learned" = the item has a spaced-review record (srs). The queue starts at the first learning session holding an unlearned item.
   Capacity (planSchedule) is computed fresh from the queue and the calendar, is memoised, and never writes anything.
   A virtual "welcome back" session is put in front when the last session was 7+ days ago. */
const PLAN_V=2,USE_D=6,FINALS=3,BACK_GAP=7,BACK_CAP=30;
function todayIso(){return iso(new Date())}
const srsMap=()=>store.get("srs",{})||{};
const plusDays=(isoStr,n)=>{const d=_dt(isoStr)||new Date();d.setDate(d.getDate()+n);return iso(d)};
function courseOrder(){const q=[];for(let w=0;w<10;w++){for(let d=0;d<LP[w].length;d++)q.push({w,d});q.push({w,d:USE_D})}for(let i=0;i<FINALS;i++)q.push({w:9,d:7+i});return q}
const isLearnDay=s=>s&&!s.k&&s.d>=0&&s.d<learnDays(s.w);
const isUseIt=s=>s&&!s.k&&s.d===USE_D;
const isMore=s=>s&&!s.k&&s.d>=learnDays(s.w)&&s.d<USE_D;   // the old use days: optional "More practice" in Lessons
function sessionItems(w,d){const D=LP[w]&&LP[w][d];if(!D)return[];return D.ph.concat(D.fl,D.st)}
// learned = has a spaced-review record; staff phrases are kept apart (they are recognised, not said)
function learnedIds(){const S=srsMap(),s=new Set();for(const id in S){const c=byId(id);if(c&&!c.staff)s.add(id)}if(player&&player.learnIds)player.learnIds.forEach(i=>s.add(i));return s}
function staffKnown(){const S=srsMap(),s=new Set();for(const id in S){const c=byId(id);if(c&&c.staff)s.add(id)}return s}
// the words a swap slot may use: every word taught so far (word cards and words inside learned phrases), as lower-case tokens
function knownWords(){return knownTokens(player&&player.learnIds)}
function nextLessonIndex(S){S=S||srsMap();const q=courseOrder();const i=q.findIndex(s=>isLearnDay(s)&&sessionItems(s.w,s.d).some(id=>!S[id]));return i<0?q.length-FINALS:i}
function newPlan(from,o){o=o||{};const q=courseOrder().slice(from||0);if(o.back&&q.length)q.unshift({w:q[0].w,d:-1,k:"back"});
  return{v:PLAN_V,queue:q,pos:0,log:o.log||[],focus:o.focus||{},created:o.created||todayIso(),startedAt:todayIso(),choice:o.choice||"done",pending:null}}
// what the old (v1) app counted as learned, used once to seed review records at migration
function legacyLearned(p){const s=new Set(),c=p.queue&&p.queue[p.pos],cw=c?Math.min(9,c.w):9;
  // uses the v1 packing (LP_V1), whatever the packing is now; ids that no longer exist are ignored
  for(let w=0;w<cw;w++)LP_V1[w].forEach(ids=>ids.forEach(i=>s.add(i)));
  (p.log||[]).forEach(l=>{if(l.key==="rest"||l.w===undefined||!LP_V1[l.w])return;LP_V1[l.w].forEach((ids,k)=>{if(k<=l.d)ids.forEach(i=>s.add(i))})});return new Set([...s].filter(id=>byId(id)))}
// v1 → v2 without writing anything. S (srs) is copied and seeded for items v1 counted as learned but has no record for.
function planFromAny(p,S,boxes){S=Object.assign({},S||{});if(p&&p.v===PLAN_V&&Array.isArray(p.queue))return{plan:p,srs:S};
  const log=p&&Array.isArray(p.log)?p.log.slice():[],has=log.some(l=>l.key!=="rest"&&!l.again);
  if(p&&Array.isArray(p.queue)&&has){boxes=boxes||{};legacyLearned(p).forEach(id=>{if(S[id]||!byId(id))return;const c=byId(id),need=DAYOF_V1[id]||0,l=log.find(l=>l.w===c.w&&l.d>=need&&l.key!=="rest");
      const day=l?l.date:todayIso(),lv=(boxes[id]||0)>=3?2:1;S[id]={s:lv,due:plusDays(day,[1,1,3][lv]),last:day}})}
  const learned=Object.keys(S).some(id=>byId(id));
  return{plan:newPlan(has?nextLessonIndex(S):0,{log,focus:(p&&p.focus)||{},choice:has?"pending":"done",back:has&&learned}),srs:S}}
function loadPlan(){const p=store.get("plan",null);if(p&&p.v===PLAN_V&&Array.isArray(p.queue))return p;
  const S=srsMap(),m=planFromAny(p,S,store.get("boxes",{}));if(JSON.stringify(m.srs)!==JSON.stringify(S))store.set("srs",m.srs);store.set("plan",m.plan);return m.plan}
let PLAN=loadPlan();
function savePlan(){_sched=null;store.set("plan",PLAN)}
// the migration card's two answers, and Plan → Settings → Start the course over
function planContinue(){PLAN.choice="done";PLAN.startedAt=todayIso();savePlan()}
function planStartOver(){const np=newPlan(0,{log:PLAN.log});np.resetAt=new Date().toISOString();np.created=todayIso();PLAN=np;try{store.set("resume",null)}catch(e){}savePlan()}
const skey=s=>s.k==="back"?"back":s.w+"-"+s.d+(s.rep?"-r"+s.rep:"");
function sessionName(s){if(!s)return"";if(s.k==="back")return"Welcome back: warm-up review";if(s.d>=7)return"Final review "+(s.d-6)+" of "+FINALS;const T=WEEKS[s.w].title;
  return(s.rep?"Repeat · ":"")+T+(s.d===USE_D?", use it":isMore(s)?", more practice "+(s.d-learnDays(s.w)+1):", day "+(s.d+1))}
function sessionTitle(s){return sessionName(s)}
function doneToday(){const t=todayIso();return PLAN.log.filter(l=>l.date===t&&l.key!=="rest"&&!l.again).length}
function restedToday(){const t=todayIso();return PLAN.log.some(l=>l.date===t&&l.key==="rest")}
function lastActivity(){const d=PLAN.log.filter(l=>l.key!=="rest").map(l=>l.date).concat(PLAN.startedAt||[]).sort();return d.length?d[d.length-1]:null}
function planStart(){return _dt(CFG.start)||_dt(PLAN.created)||mid(new Date())}
function needsBack(){if(PLAN.choice==="pending")return false;const q=PLAN.queue[PLAN.pos];if(!q||q.k==="back")return false;
  const la=lastActivity();if(!la||dayDiff(_dt(la),new Date())<BACK_GAP)return false;const S=srsMap();for(const id in S)if(byId(id))return true;return false}
const backSession=()=>({w:(PLAN.queue[PLAN.pos]||{w:9}).w,d:-1,k:"back",virtual:true});
// ---- capacity: days = max(today, plan start) .. the day before the flight; needed = sessions left ----
let _sched=null;
function planSchedule(){const key=[todayIso(),PLAN.pos,PLAN.queue.length,PLAN.log.length,iso(TRIP),PLAN.created,PLAN.startedAt,PLAN.choice,CFG.start,Object.keys(srsMap()).length].join("|");
  if(_sched&&_sched.key===key)return _sched.v;const v=computeSchedule();_sched={key,v};return v}
function computeSchedule(){const today=mid(new Date()),start=planStart(),d0=today<start?new Date(start):new Date(today),t=todayIso();
  const rem=(needsBack()?[backSession()]:[]).concat(PLAN.queue.slice(PLAN.pos)),dT=doneToday(),rested=restedToday()&&dT===0;
  const days=[];for(const d=new Date(d0);dayDiff(d,TRIP)>=1;d.setDate(d.getDate()+1)){const isT=iso(d)===t;days.push({date:iso(d),wd:d.getDay(),used:isT?dT:0,off:isT&&rested})}
  const fin=rem.filter(s=>s.d>=7&&!s.k).length,room=(i,a)=>!days[i].off&&a[i]+days[i].used<2;
  const fit=R=>{const avail=days.map(x=>x.off?0:Math.max(0,1-x.used)),dbl=new Set();let need=R-avail.reduce((a,b)=>a+b,0);const spare=Math.max(0,-need);
    for(let i=0;i<days.length&&need>0;i++)if((days[i].wd===0||days[i].wd===6)&&room(i,avail)){avail[i]++;need--;dbl.add(i)}return{avail,need,dbl,spare,wk:dbl.size,wd:0}};
  let cut=0,r=fit(rem.length);
  // still short: the final rehearsal goes from 3 sessions to 1 (counting any final already done)
  const finDone=PLAN.log.some(l=>l.d>=7&&!l.again&&l.key!=="rest"),keep=finDone?0:1;
  if(r.need>0&&fin>keep){cut=fin-keep;r=fit(rem.length-cut)}
  if(r.need>0){const cand=days.map((x,i)=>i).filter(i=>!r.dbl.has(i)&&room(i,r.avail)),k=Math.min(r.need,cand.length);
    for(let j=0;j<k;j++){const i=cand[Math.floor((j+0.5)*cand.length/k)];r.avail[i]++;r.dbl.add(i)}r.need-=k;r.wd=k}
  const R=rem.length-cut,out=[],dateOf=[];let qi=0;
  days.forEach((x,i)=>{const n=Math.min(r.avail[i],R-qi);for(let j=0;j<n;j++)dateOf[qi++]=x.date;out.push({date:x.date,done:x.used,n,two:x.used+n>=2,off:x.off})});
  const planned=out.filter(x=>x.n>0),T=out[0]&&out[0].date===t?out[0]:null;
  return{start:iso(start),beforeStart:today<start,days:out,rem,R,cut,finalsKept:fin-cut,spare:r.spare,overflow:Math.max(0,R-qi),
    finish:planned.length?planned[planned.length-1].date:(dT?t:null),weekendDbl:r.wk,weekdayDbl:r.wd,doubled:out.filter(x=>x.two&&x.n>0).map(x=>x.date),
    todayPlanned:T?T.done+T.n:0,dateOf,nextDate:planned.length?planned[0].date:null}}
function current(){const s=planSchedule();if(PLAN.pos>=PLAN.queue.length-s.cut)return null;return needsBack()?backSession():PLAN.queue[PLAN.pos]}
function curWeek(){const c=current();return c?Math.min(9,c.w):9}
function remaining(){return planSchedule().R}
function daysLeft(){return Math.max(0,dayDiff(new Date(),TRIP))}
function sessionsToday(){return planSchedule().todayPlanned}
function spareDays(){return planSchedule().spare}
// the planned date of queue index i (null when it does not fit or is cut)
function dateOfQueue(i){const s=planSchedule(),k=i-PLAN.pos+(needsBack()?1:0);return k>=0?s.dateOf[k]||null:null}
const dfmt=isoStr=>{const d=_dt(isoStr);return d?d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}):""};
// one calm line: no red, no "behind", no "missed"
function statusText(){const s=planSchedule();if(!current())return"Course complete";
  if(s.beforeStart)return`Day 1 is ${dfmt(s.start)} · start early if you like`;
  if(s.overflow)return`${s.overflow} session${s.overflow>1?"s":""} won't fit before ${fmt(TRIP)} · the plan keeps the order`;
  const fin=s.finish?" · finishes "+fmt(_dt(s.finish)):"";
  if(!s.doubled.length)return`On track${fin}${s.spare?` · ${s.spare} spare day${s.spare>1?"s":""}`:""}`;
  const wkDays=s.days.filter(x=>(new Date(_dt(x.date)).getDay()%6===0)&&!x.off&&x.n>0);
  if(!s.weekdayDbl)return wkDays.every(x=>x.two)?`One session a day, two on Sat and Sun${fin}`:`One session a day, two on ${s.weekendDbl} weekend day${s.weekendDbl>1?"s":""}${fin}`;
  return`Two sessions on ${s.doubled.length} more day${s.doubled.length>1?"s":""}, one on the rest${fin}`}
// ---- finishing, repeats, rest days ----
function finishSession(rating,checks){const s=current();if(!s)return"";const t=todayIso();
  const learn=player&&player.stages?player.stages.filter(x=>x.kind==="learn").flatMap(x=>x.ids):[];srsLearn(learn,t);
  const e={date:t,key:skey(s),w:s.w,d:s.d,rating:rating||"ok"};if(s.k)e.k=s.k;PLAN.log.push(e);if(!s.virtual)PLAN.pos++;_sched=null;
  const spare=()=>{_sched=null;return planSchedule().spare};let msg="";
  if(checks){const ratio=checks.filter(Boolean).length/Math.max(1,checks.length);
    if(ratio>=0.99)msg="Week "+(s.w+1)+" done. Everything checked.";
    else if(ratio>=0.5){PLAN.focus[s.w]=true;msg="Week "+(s.w+1)+" done. Its phrases get a little extra review."}
    else if(spare()>=1){PLAN.queue.splice(PLAN.pos,0,{w:s.w,d:USE_D,rep:1});msg="Next time repeats this Use-it session, so it settles."}
    else{PLAN.focus[s.w]=true;srsBoost(partIds(s.w,"all").concat(wordIds(s.w),staffIds(s.w)));msg="Week "+(s.w+1)+" done. Its phrases come back in tomorrow's review."}}
  else if(rating==="hard"&&s.d>=0){if(spare()>=1){PLAN.queue.splice(PLAN.pos,0,{w:s.w,d:s.d,rep:1});msg="Next time repeats this session."}
    else{PLAN.focus[s.w]=true;srsBoost(learn.length?learn:(player&&player.stages||[]).flatMap(x=>x.ids||[]));msg="These come back in tomorrow's review."}}
  else msg=rating==="easy"?"Nice.":"Good.";
  PLAN.pending={date:t,label:sessionName(s),streak:streak()};savePlan();try{store.set("resume",null)}catch(x){}
  const n=current();return msg+(n?" Next: "+sessionName(n)+".":" That was the last session. Have a great trip!")}
function restDay(){if(spareDays()<1)return false;PLAN.log.push({date:todayIso(),key:"rest"});savePlan();return true}
function logAgain(s){const n=PLAN.log.filter(l=>l.again&&l.w===s.w&&l.d===s.d).length+1;PLAN.log.push({date:todayIso(),key:skey(s)+"-x"+n,w:s.w,d:s.d,rating:"again",again:true});
  PLAN.pending={date:todayIso(),label:"extra practice · "+sessionName(s),streak:streak()};savePlan();return"Logged as extra practice."}
function streak(){const set=new Set(PLAN.log.map(l=>l.date));let d=mid(new Date()),n=0;if(!set.has(iso(d)))d.setDate(d.getDate()-1);while(set.has(iso(d))){n++;d.setDate(d.getDate()-1)}return n}
// where a plan stands in the course (for sync merges and the Plan screen): index in courseOrder of the next real session
function coursePos(p){const q=courseOrder();let i=p.pos;while(i<p.queue.length&&(p.queue[i].k||p.queue[i].rep))i++;const s=p.queue[i];if(!s)return q.length;const k=q.findIndex(x=>x.w===s.w&&x.d===s.d);return k<0?q.length:k}
// the planned dates of a week's sessions in the course order (first, last) and whether it is done
function weekPlan(w){const out=[];PLAN.queue.forEach((s,i)=>{if(i>=PLAN.pos&&s.w===w&&!s.k&&s.d<7){const d=dateOfQueue(i);if(d)out.push(d)}});return out}
