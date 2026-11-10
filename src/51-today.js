/* ---------- TODAY overview ---------- */
function statusLine(){return`<span class="status">${esc(statusText())}</span>`}
function railSVG(){const cur=curWeek(),n=10,x0=30,x1=560,step=(x1-x0)/(n-1),fin=!current();let s=`<svg viewBox="0 0 640 86" role="img" aria-label="Progress: week ${cur+1} of 10"><line x1="${x0}" y1="34" x2="610" y2="34" stroke="var(--line)" stroke-width="6" stroke-linecap="round"/>`;
  const doneX=fin?610:x0+step*cur;s+=`<line x1="${x0}" y1="34" x2="${doneX}" y2="34" stroke="var(--rail)" stroke-width="6" stroke-linecap="round"/>`;
  for(let i=0;i<n;i++){const x=x0+step*i,past=i<cur||fin,now=i===cur&&!fin;
    s+=`<g data-goweek="${i}" role="link" aria-label="Week ${i+1}: ${esc(WEEKS[i].title)}"><title>Week ${i+1} · ${esc(WEEKS[i].title)}</title><rect x="${x-18}" y="12" width="36" height="60" fill="transparent"/><circle cx="${x}" cy="34" r="${now?10:7}" fill="${past||now?"var(--rail)":"var(--card)"}" stroke="var(--rail)" stroke-width="3"/>`;
    if(now)s+=`<circle cx="${x}" cy="34" r="4" fill="var(--card)"/>`;
    s+=`<text x="${x}" y="64" text-anchor="middle" font-size="12" font-weight="${now?700:400}" fill="${now?"var(--ink)":"var(--muted)"}" font-family="var(--body)">W${i+1}</text></g>`}
  s+=`<rect x="596" y="20" width="28" height="28" rx="6" fill="var(--ai)"/><text x="610" y="39" text-anchor="middle" font-size="14" font-weight="700" fill="var(--card)" font-family="var(--jp)">日</text><text x="610" y="64" text-anchor="middle" font-size="12" fill="var(--muted)" font-family="var(--body)">${fmt(TRIP)}</text></svg>`;return s}
let fbOpen=false,overArmed=false;
// what the big button says: "Start · Introducing yourself, day 3 · 12 min", or "Resume · step 3 of 6"
function resumeFor(c){const r=store.get("resume",null);return r&&c&&r.date===todayIso()&&r.key===skey(c)&&r.at>0?r:null}
function renderToday(){const el=document.getElementById("v-today");if(player){try{return renderPlayer(el)}catch(e){showError(e,"showing step "+(player.idx+1));const n=player.stages.length;el.innerHTML=`<div class="wrap player"><div class="head"><button class="btn" id="pl-exit">Exit</button><span class="label">Step ${player.idx+1} of ${n}</span></div><div class="panel"><p>This step couldn't be shown. Skip it and carry on.</p><div class="row"><button class="btn" id="pl-back" ${player.idx===0?"disabled":""}>Back</button><button class="btn primary" id="pl-next">${player.idx===n-1?"Finish":"Next step"}</button></div></div></div>`;el.querySelector("#pl-exit").onclick=()=>{player=null;renderToday()};const bk=el.querySelector("#pl-back");if(bk)bk.onclick=()=>{player.idx--;renderToday()};el.querySelector("#pl-next").onclick=()=>{if(player.idx<n-1){player.idx++;renderToday()}else{toast=finishSession("ok");player=null;renderToday();window.scrollTo(0,0)}};return}}
  // reads only: nothing here writes to storage
  const S=planSchedule(),c=current(),left=daysLeft(),planned=S.todayPlanned,dt=doneToday(),W=WEEKS[curWeek()],pending=PLAN.choice==="pending";
  const sh=PLAN.pending&&PLAN.pending.date===todayIso()?PLAN.pending:null;
  // the done card: what was done and the streak (2 days or more); what comes next is said once, on the Start button or "Done for today"
  const doneCard=sh?`<div class="panel"><div class="label">Done: ${esc(sh.label)} ✓${sh.streak>1?` · 🔥 ${sh.streak}-day streak`:""}</div>
    ${fbOpen?feedbackBox():`<p class="small muted" style="margin:0"><button class="link" id="fb-open">Send feedback</button> on the app or this lesson.</p>`}</div>`:"";
  let main="";
  if(left===0)main=`<div class="panel"><h2>行ってらっしゃい</h2><p>Have a great trip. Open every exchange with Sumimasen, try your line first, and keep the Translate screen handy.</p></div>`;
  else if(pending){const L=new Set([...learnedIds(),...staffKnown()]).size,nx=PLAN.queue.find(q=>!q.k);
    main=`<div class="panel" id="mg-card"><div class="label">New plan</div><p style="margin:0">The course now runs as a few short learning days each week, then one Use-it session. Everything you learned is kept (${L} items on your review schedule).</p>
     <button class="btn primary bigbtn" id="mg-cont">Continue: ${esc(nx?sessionName(nx):"the course")} after a quick warm-up</button>
     ${overArmed?`<div class="panel skipq"><p style="margin:0">Start again from week 1? Your review history is kept.</p><div class="row"><button class="btn" id="mg-over-yes">Yes, start over</button><button class="btn" id="mg-over-no">Cancel</button></div></div>`:`<button class="btn" id="mg-over">Start over from week 1</button>`}</div>`}
  else if(!c)main=`<div class="panel"><h2>Course complete</h2><p>Keep it warm until you fly: answer questions with no text, and say your introduction once a day.</p><div class="row"><button class="btn primary" id="go-talk">Answer questions</button></div></div>`;
  else{const stages=sessionStages(c),total=stages.reduce((a,x)=>a+x.min,0),nt=newToday(stages),rs=resumeFor(c);
    const doneForToday=planned>0&&dt>=planned&&!rs;
    const groupBox=`<details class="small"><summary>With the group?</summary><p class="small">One phone hosts and plays the audio; everyone says the lines and takes turns. Afterwards each person taps <b>Did it with the group? Log it</b> on their own phone.</p><div class="row"><button class="btn" id="start-group">Start as a group</button><button class="btn" id="log-only">Did it with the group? Log it</button></div></details>`;
    if(doneForToday)main=`<div class="panel"><h3 style="margin:0">Done for today ✓</h3><p class="small muted" style="margin:0">Next: <b>${esc(sessionName(c))}</b>${S.nextDate?", "+esc(dfmt(S.nextDate)):""}.</p><div class="row"><button class="btn" id="extra">Do another now</button></div>${groupBox}</div>`;
    else{const which=planned>1?`Session ${Math.min(dt+1,planned)} of ${planned} today`:S.beforeStart?"Before day 1: start early if you like":"";
      const label=rs?`Resume · step ${rs.at+1} of ${rs.n}`:`Start · ${sessionName(c)} · ${total} min`;
      main=`<div class="panel startcard">${which?`<div class="label">${esc(which)}</div>`:""}
       <button class="btn primary bigbtn" id="start">${esc(label)}</button>${rs?`<p class="small muted" style="margin:0;text-align:center">${esc(sessionName(c))} · <button class="link" id="restart">start this session from the beginning</button></p>`:""}
       ${nt?`<p class="small" style="margin:0;text-align:center">${esc(nt)}</p>`:""}
       <details class="small"><summary>What's in this session</summary><ul class="hints">${stages.map((s,i)=>`<li data-stage="${i}" title="Start at this step"><span class="small muted" style="font-variant-numeric:tabular-nums">${s.min} min</span><span><b>${esc(s.title)}</b> <span class="small muted">${esc(stageDesc(s))}</span></span></li>`).join("")}</ul><p class="small muted">Tap a step to start there.</p></details>
       ${groupBox}
       <p class="small" style="margin:0">🚗 Driving or out walking? <button class="link" data-gotab="practice" data-mode="drive">Drive mode</button>: audio only, keeps playing with the phone locked.</p>
       ${dt===0&&!restedToday()&&!S.beforeStart&&S.spare>=1?`<p class="small muted" style="margin:0">Need a break? <button class="link" id="rest">Take a rest day</button> (${S.spare} spare).</p>`:""}</div>`}}
  const gpanel=groupPrompt?`<div class="panel"><div class="label">Group session</div>
      <div class="field"><label class="small" for="gp-names">Who's here? (names, comma separated)</label><input type="text" id="gp-names" value="${esc(store.get("groupNames",[discordCfg().name].filter(Boolean)).join(", "))}" placeholder="Names, comma separated"></div>
      <div class="row"><button class="btn primary" id="gp-start">Start group session</button><button class="btn" id="gp-cancel">Cancel</button><span class="small muted" id="gp-msg"></span></div></div>`:"";
  // up next: the sessions after this one, with their planned dates
  const up=[];if(c&&!pending){const k0=1;for(let k=k0;k<Math.min(S.rem.length,k0+3);k++)if(S.dateOf[k])up.push([S.rem[k],S.dateOf[k]])}
  const upHTML=up.length?`<div class="panel"><div class="label">Up next</div><ul class="upnext">${up.map(([s,d])=>`<li><span class="d">${esc(dfmt(d))}</span><span>${s.k?esc(sessionName(s)):`<button class="link" data-goweek="${s.w}" data-goday="${s.d}">${esc(sessionName(s))}</button>`}</span></li>`).join("")}</ul><p class="small muted" style="margin:0"><button class="link" data-gotab="plan">Plan</button> has the whole schedule.</p></div>`:"";
  el.innerHTML=`<div class="wrap" style="gap:14px">
   <p class="countdown-line"><b>${left}</b> ${left===1?"day":"days"} until you fly · ${fmt(TRIP)}</p>
   <div>${statusLine()}${streak()>1?`<span class="muted small"> · ${streak()}-day streak</span>`:""}</div>
   ${setupHTML()}${tripAskHTML()}${toast?`<div class="toast">${esc(toast)}</div>`:""}${doneCard}${gpanel}${main}${upHTML}
   <div class="sign"><div class="sign-top" data-goweek="${curWeek()}" role="link" tabindex="0" title="Open this week's lessons"><div class="kanji">${W.kanji}</div><div class="roma">${esc(W.title)}</div><div class="muted small">Week ${curWeek()+1} of 10 · ${esc(W.goal)}</div></div>
    <div class="sign-band"><button data-goweek="${curWeek()-1}" ${curWeek()>0?"":"disabled"}>${curWeek()>0?"←&nbsp;"+esc(WEEKS[curWeek()-1].title):""}</button><button class="num" data-goweek="${curWeek()}">W${curWeek()+1}</button>${curWeek()<9?`<button class="r" data-goweek="${curWeek()+1}">${esc(WEEKS[curWeek()+1].title)}&nbsp;→</button>`:`<span class="r">Japan →</span>`}</div></div>
   <div class="railmap">${railSVG()}</div>
   ${VOICE_WARN}</div>`;
  toast="";
  bindShare(el);bindLinks(el);bindSetup(el);
  const st=el.querySelector("#start");if(st)st.onclick=safe("starting the session",()=>{const r=resumeFor(current());startSession(r?{at:r.at}:{})});
  const rr=el.querySelector("#restart");if(rr)rr.onclick=safe("starting the session",()=>startSession());
  el.querySelectorAll("[data-stage]").forEach(li=>li.onclick=()=>startSession({at:+li.dataset.stage}));
  const fo=el.querySelector("#fb-open");if(fo)fo.onclick=()=>{fbOpen=true;renderToday()};
  const mc=el.querySelector("#mg-cont");if(mc)mc.onclick=()=>{planContinue();renderToday()};
  const mo=el.querySelector("#mg-over");if(mo)mo.onclick=()=>{overArmed=true;renderToday()};
  const my=el.querySelector("#mg-over-yes");if(my)my.onclick=()=>{overArmed=false;planStartOver();renderToday()};
  const mn=el.querySelector("#mg-over-no");if(mn)mn.onclick=()=>{overArmed=false;renderToday()};
  const sg=el.querySelector("#start-group");if(sg)sg.onclick=()=>{groupPrompt=true;renderToday();window.scrollTo(0,0)};
  const lo=el.querySelector("#log-only");if(lo)lo.onclick=()=>startSession({logOnly:true});
  const rs=el.querySelector("#rest");if(rs)rs.onclick=()=>{if(restDay())toast="Rest day logged. See you tomorrow.";renderToday()};
  const ex=el.querySelector("#extra");if(ex)ex.onclick=safe("starting the session",()=>startSession());
  const gp=el.querySelector("#gp-start");if(gp){gp.onclick=()=>{const names=el.querySelector("#gp-names").value.split(/[,、\n]+/).map(x=>x.trim()).filter(Boolean);if(!names.length){el.querySelector("#gp-msg").textContent="Add at least one name.";return}store.set("groupNames",names);groupPrompt=false;startSession({group:names})};el.querySelector("#gp-cancel").onclick=()=>{groupPrompt=false;renderToday()}}
  const gt=el.querySelector("#go-talk");if(gt)gt.onclick=()=>{talk={mode:"answer",max:9,only:false,hide:true};showPractice("talk")};
  renderVoiceWarn()}

/* ---------- tell the group (Discord) ---------- */
let shareMsg="";
// the feedback box opens from the small "Send feedback" link on the done card; it never shows by default and never carries over to another day
function feedbackBox(){const d=discordCfg(),can=IN_CLAUDE||!!d.feedback;
  return`<div id="fb-box"><p class="small muted" style="margin:0">Anything confusing, broken, missing, or an idea? It goes to the group's ${chLink("feedback")}${IN_CLAUDE?" (and straight to Claude for the next round of fixes)":""}.</p>
   <textarea id="fb-text" placeholder="e.g. The listening pause is too short on week 3 · I'd love a numbers-only drill"></textarea>
   <div class="row"><button class="btn" id="fb-send" ${can?"":"disabled"}>Send feedback</button><button class="btn" id="fb-close">Close</button><span class="small muted" id="fb-msg">${can?"":`Tap the group's setup link in ${chLink("today")} to send.`}</span></div></div>`}
async function sendFeedback(text,label){const d=discordCfg(),entry={text,session:label,date:todayIso(),name:d.name||"Someone",app:IN_CLAUDE?"claude":"web"};
  const log=store.get("feedbackLog",[]);log.unshift(entry);store.set("feedbackLog",log.slice(0,50));
  let where=[];
  if(DB){try{await DB.collection("feedback").add(Object.assign({at:new Date().toISOString()},entry));where.push("Claude")}catch(e){}}
  if(d.feedback&&!IN_CLAUDE){await discordPost(d.feedback,`💬 **${entry.name}** · ${label}\n> ${text.replace(/\n+/g," ")}`,entry.name);where.push("#app-feedback")}
  if(!where.length)throw new Error("nowhere");return where}
function bindShare(el){const sh=PLAN.pending;if(!sh)return;
  const cl=el.querySelector("#fb-close");if(cl)cl.onclick=()=>{fbOpen=false;renderToday()};
  const fb=el.querySelector("#fb-send");if(fb)fb.onclick=async()=>{const t=el.querySelector("#fb-text").value.trim(),m=el.querySelector("#fb-msg");if(!t){m.textContent="Type something first.";return}fb.disabled=true;m.textContent="Sending…";
    try{const where=await sendFeedback(t,sh.label);m.textContent="Sent to "+where.join(" and ")+". Thank you.";el.querySelector("#fb-text").value=""}
    catch(e){fb.disabled=false;if(IN_CLAUDE){try{await navigator.clipboard.writeText(t);m.textContent="Couldn't store it here; copied to your clipboard, paste it in #app-feedback."}catch(x){m.textContent="Couldn't send it. Copy it and paste in #app-feedback."}}else m.textContent="Couldn't send. Check the #app-feedback webhook in Plan."}}}

