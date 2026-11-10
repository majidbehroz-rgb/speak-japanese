/* ---------- SPACED REVIEW: each item comes back just before you'd forget it ---------- */
// Expanding gaps in days (Pimsleur's graduated interval recall, Leitner boxes, Anki/SM-2): learned → 1 day → 3 → 7 → 14 → 30 → 60.
// Right answers push an item further out; a miss brings it back tomorrow. New items therefore get the most practice and
// well-known ones fade to an occasional check, so nothing has to be revisited by hand.
// Three guards keep the schedule honest: (1) every session has a refresher floor, so a quiet day never means no review;
// (2) when more is due than fits, the newest items go first but older ones are picked by how overdue they are, so none starve;
// (3) due dates are nudged to the quietest nearby day, so the reviews never pile up on one day.
const SRS_GAPS=[1,1,3,7,14,30,60];
const srsAll=()=>store.get("srs",{})||{};
function isoPlus(isoStr,n){const d=_dt(isoStr)||new Date();d.setDate(d.getDate()+n);return iso(d)}
function srsLearn(ids,day){const S=srsAll();let ch=false;ids.forEach(id=>{if(id&&!S[id]){S[id]={s:1,due:isoPlus(day,SRS_GAPS[1]),last:day};ch=true}});if(ch)store.set("srs",S)}
const daysBetween=(a,b)=>{const x=_dt(a),y=_dt(b);return x&&y?Math.round((y-x)/864e5):0};
// spread the reviews: of the few days just before the target date, use the one with the fewest items already due
function srsPlace(target,gap,S){if(gap<3)return target;const load={};Object.values(S).forEach(r=>{load[r.due]=(load[r.due]||0)+1});
  // nothing should rest past the flight: anything that would is brought back during the last ten days before it (a final sweep, spread over those days)
  const fly=iso(TRIP),last=isoPlus(fly,-3),first=isoPlus(fly,-10);
  if(target>last&&isoPlus(todayIso(),2)<=last){let best=null,bc=1e9;for(let d=first>isoPlus(todayIso(),2)?first:isoPlus(todayIso(),2);d<=last;d=isoPlus(d,1)){if((load[d]||0)<bc){best=d;bc=load[d]||0}}return best||last}
  const win=gap>=14?3:gap>=7?2:1;let best=target,bc=load[target]||0;for(let k=1;k<=win;k++){const d=isoPlus(target,-k);if(d>todayIso()&&(load[d]||0)<bc){best=d;bc=load[d]||0}}return best}
// a right answer moves the item up a step (unless it was reviewed early, which just restarts the same gap); a miss brings it back tomorrow
function srsGrade(id,ok){const S=srsAll(),r=S[id]||{s:1},t=todayIso(),early=!!(r.due&&r.due>t);
  if(ok){if(!early)r.s=Math.min(SRS_GAPS.length-1,(r.s||1)+1);const gap=SRS_GAPS[r.s];const nd=srsPlace(isoPlus(t,gap),gap,S);r.due=early&&r.due>nd?r.due:nd}
  else{r.s=1;r.due=isoPlus(t,1)}
  r.last=t;S[id]=r;store.set("srs",S)}
// extra review weight: items that would rest past tomorrow come back tomorrow instead (a Hard rating with no spare day, a skipped step)
function srsBoost(ids){const S=srsAll(),tm=isoPlus(todayIso(),1);let ch=false;(ids||[]).forEach(id=>{const r=S[id];if(r&&r.due>tm){r.due=tm;ch=true}});if(ch)store.set("srs",S)}
// the welcome-back session: learned items, most overdue first, nothing new
function backIds(cap){const S=srsAll(),L=new Set([...learnedIds(),...staffKnown()]);return Object.keys(S).filter(id=>L.has(id)&&byId(id)).sort((a,b)=>S[a].due<S[b].due?-1:S[a].due>S[b].due?1:0).slice(0,cap||BACK_CAP)}
// items learned before this system existed: schedule them from the day they were learned, so they come back gradually
function srsSeed(){const S=srsAll(),known=[...learnedIds(),...staffKnown()].filter(id=>!S[id]&&byId(id));if(!known.length)return;const boxes=store.get("boxes",{});
  const learnedOn=c=>{const need=DAYOF[c.id]||0;const l=PLAN.log.find(l=>l.w===c.w&&l.d>=need);return l?l.date:todayIso()};
  known.forEach(id=>{const c=byId(id),day=learnedOn(c),s=(boxes[id]||0)>=3?2:1;S[id]={s,due:isoPlus(day,SRS_GAPS[s]),last:day}});store.set("srs",S)}
// What to review today. cap = the most items we'll ask for; floor = the fewest (a refresher is guaranteed: if less than the floor is
// due, the items that are next in line come early, which does no harm). Order: newest first, then the most overdue older ones.
function dueIds(cap,floor){srsSeed();const S=srsAll(),t=todayIso(),L=new Set([...learnedIds(),...staffKnown()]);
  const all=Object.keys(S).filter(id=>L.has(id)&&byId(id)),due=all.filter(id=>S[id].due<=t);
  if(due.length>cap*2.2)cap=Math.min(cap+10,25);else if(due.length>cap*1.5)cap=Math.min(cap+5,20);                                   // a long list: do a bit more rather than fall behind
  const lvl=id=>S[id].s||1,gap=id=>Math.max(1,SRS_GAPS[lvl(id)]),late=id=>(daysBetween(S[id].due,t)+gap(id))/gap(id);   // how overdue, as a share of its own gap
  const young=due.filter(id=>lvl(id)<=2).sort((a,b)=>(lvl(a)-lvl(b))||(S[a].due<S[b].due?-1:S[a].due>S[b].due?1:0)),old=due.filter(id=>lvl(id)>2).sort((a,b)=>late(b)-late(a));
  let y=young.slice(0,Math.ceil(cap*0.65)),o=old.slice(0,cap-y.length);                    // two thirds of the slots for new things, the rest for the most overdue old ones
  if(y.length+o.length<cap)y=y.concat(young.slice(y.length,y.length+cap-y.length-o.length));
  let out=y.concat(o);
  if(out.length<(floor||0)){const next=all.filter(id=>S[id].due>t).sort((a,b)=>(S[a].due<S[b].due?-1:S[a].due>S[b].due?1:0)||(lvl(a)-lvl(b)));out=out.concat(next.slice(0,floor-out.length))}
  return out}
function dueCount(){srsSeed();const S=srsAll(),t=todayIso(),L=new Set([...learnedIds(),...staffKnown()]);return Object.keys(S).filter(id=>L.has(id)&&S[id].due<=t).length}
// "tomorrow 4 · in 3 days 5 · in a week 3": where the items you just did were scheduled to
function srsSummary(ids){const S=srsAll(),t=todayIso(),b={};ids.forEach(id=>{const r=S[id];if(!r)return;const d=daysBetween(t,r.due);const k=d<=1?"tomorrow":d<=4?"in 3 days":d<=9?"in a week":d<=20?"in 2 weeks":"in a month or more";b[k]=(b[k]||0)+1});
  const order=["tomorrow","in 3 days","in a week","in 2 weeks","in a month or more"];const parts=order.filter(k=>b[k]).map(k=>b[k]+" "+k);return parts.length?"Coming back: "+parts.join(" · ")+". The better you know one, the longer it rests.":"Each one is now scheduled to come back later."}
// the memory schedule for the Plan screen: how many items are due when
function srsBuckets(){srsSeed();const S=srsAll(),t=todayIso(),L=new Set([...learnedIds(),...staffKnown()]),b={today:0,tomorrow:0,week:0,month:0,later:0,known:0,total:0};
  Object.keys(S).filter(id=>L.has(id)&&byId(id)).forEach(id=>{const r=S[id],d=daysBetween(t,r.due);b.total++;if((r.s||1)>=4)b.known++;if(d<=0)b.today++;else if(d===1)b.tomorrow++;else if(d<=7)b.week++;else if(d<=30)b.month++;else b.later++});return b}
// The review, audio first and hands-free (Pimsleur-style): prompt → your turn (Time to answer) → the answer, then the next item.
// "Say" direction: the English meaning plays (the coach line "Say it in Japanese." before the first two), the romaji stays hidden,
// then the Japanese plays and the romaji appears. "Understand": the Japanese plays, then the English meaning with the text.
// It counts as "got it" unless Missed it is tapped (from the pause until the item ends): then it is graded wrong and comes back once
// at the end in the other direction. Pairs (Hai / Iie …) are asked one member at a time. A clean run needs no taps.
function reviewWidget(box,ids,onDone){let queue=ids.map(byId).filter(Boolean).map(c=>({c,dir:c.staff?"und":(srsAll()[c.id]||{}).s<=2?(Math.random()<0.75?"say":"und"):(Math.random()<0.5?"say":"und"),again:false})),
    done=0,total=queue.length,cur=null,phase="",missed=false,paused=false,coach=0,my=0,member=null,finished=false;
  if(!total){box.innerHTML=`<div class="flash"><div class="phase">All caught up ✓</div><p class="small muted">Nothing is due today.</p></div>`;onDone();return}
  const PH={prompt:"Listen",pause:"Your turn: say it",answer:"Answer",hold:"Answer"};
  function draw(){if(finished)return;const c=cur.c,und=cur.dir==="und",rev=phase==="answer"||phase==="hold",S=srsAll()[c.id]||{s:1},x=member||c,canMiss=phase==="pause"||rev;
    const ro=`<div class="ro" style="font-size:1.4rem;color:var(--ai)">${hl(x.ro)}</div><div class="jpw">${hl(x.jp)}</div>`,en=`<div class="big">${hl(x.en)}</div>`,hidden=`<div style="opacity:.25;font-size:1.5rem">・・・</div>`;
    box.innerHTML=`<div class="flash" id="rv-card"><div class="small muted" style="font-variant-numeric:tabular-nums"><span id="rv-prog">${done+1} / ${total}</span>${cur.again?" · again":""} · W${c.w+1} · ${und?"Japanese → English":"English → Japanese"}</div>
      <div class="phase" id="rv-phase">${paused?"Paused":esc(PH[phase]||"")}</div>
      ${und?ro+(rev?en+(c.staff&&c.reply&&!c.reply.startsWith("(")?`<div class="small muted">You can answer: ${hl(c.reply)}</div>`:""):hidden):en+(rev?ro:hidden)}
      <button class="btn bigbtn missbtn" id="rv-miss" ${canMiss&&!missed?"":"disabled"}>${missed?"Marked: missed":"Missed it"}</button>
      <div class="row" style="justify-content:center"><button class="btn" id="rv-replay" aria-label="Replay this one">↺ Replay</button><button class="btn primary" id="rv-play" style="min-width:110px">${paused?"Play":"Pause"}</button></div>
      <p class="small muted" style="margin:6px 0 0">${S.s>=4?"You know this one well: it'll come back in a while.":S.s>=2?"Getting there.":"Still new: it'll come back soon."}</p></div>`;
    box.querySelector("#rv-miss").onclick=()=>{if(phase==="pause"||phase==="answer"||phase==="hold"){missed=true;if(player)player.reviewMisses=(player.reviewMisses||0)+1;const b=box.querySelector("#rv-miss");b.disabled=true;b.textContent="Marked: missed"}};
    box.querySelector("#rv-play").onclick=()=>{if(paused){paused=false;run()}else{paused=true;runId++;stopSpeech();draw()}};
    box.querySelector("#rv-replay").onclick=()=>{paused=false;run()}}
  // one item, start to end; returns false when stopped (a re-render, Pause, Replay)
  async function playItem(m){const c=cur.c,und=cur.dir==="und",ok=()=>m===runId;missed=false;member=null;
    const J=LN.item(c),E=eLine(c.en),mem=!und?membersOf(c):null,steps=mem?mem.map(x=>({x,q:x.enL,a:x.ja})):[{x:null,q:und?J:E,a:und?E:J}];
    for(const st of steps){member=st.x;phase="prompt";draw();
      if(!und&&coach<2&&steps.indexOf(st)===0){coach++;await voice(LN.c(DRP.say));if(!ok())return false}
      await voice(st.q);if(!ok())return false;phase="pause";draw();await yourTurn(st.a);if(!ok())return false;
      phase="answer";draw();await voice(st.a);if(!ok())return false;phase="hold";draw();await tsleep(1200);if(!ok())return false}
    return true}
  async function run(){const m=++runId;stopSpeech();await sleep(60);if(m!==runId)return;
    while(m===runId&&!paused){if(!cur){cur=queue.shift();if(!cur)return end()}
      const ok=await playItem(m);if(!ok)return;const c=cur.c;
      if(!missed){if(!cur.again)srsGrade(c.id,true);bump(c.id,1)}
      else{srsGrade(c.id,false);bump(c.id,-1);if(!cur.again){queue.push({c,dir:cur.dir==="say"?"und":"say",again:true});total++}}
      done++;cur=null}}
  function bump(id,d){const bx=store.get("boxes",{});bx[id]=d>0?Math.min(5,(bx[id]||0)+1):Math.max(0,(bx[id]||0)-2);store.set("boxes",bx)}
  function end(){finished=true;box.innerHTML=`<div class="flash"><div class="phase">Review done ✓</div><div class="big">${ids.length} reviewed</div><p class="small muted">${srsSummary(ids)}</p></div>`;onDone()}
  cur=queue.shift();phase="prompt";draw();run()}

