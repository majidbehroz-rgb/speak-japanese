/* ---------- TODAY overview ---------- */
function statusLine(){const s=slackRaw(),b=bufferLeft();if(!current())return`<span class="status good">Course complete</span>`;
  if(s<0)return`<span class="status bad">${-s} session${-s>1?"s":""} behind · catch-up mode</span>`;
  const buf=b?` · ${b} buffer day${b>1?"s":""}`:"";
  if(s===0)return`<span class="status">On track${buf}${b?"":" · no spare days"}</span>`;
  return`<span class="status good">${s} day${s>1?"s":""} ahead${buf}</span>`}
function railSVG(){const cur=curWeek(),n=10,x0=30,x1=560,step=(x1-x0)/(n-1),fin=!current();let s=`<svg viewBox="0 0 640 86" role="img" aria-label="Progress: week ${cur+1} of 10"><line x1="${x0}" y1="34" x2="610" y2="34" stroke="var(--line)" stroke-width="6" stroke-linecap="round"/>`;
  const doneX=fin?610:x0+step*cur;s+=`<line x1="${x0}" y1="34" x2="${doneX}" y2="34" stroke="var(--rail)" stroke-width="6" stroke-linecap="round"/>`;
  for(let i=0;i<n;i++){const x=x0+step*i,past=i<cur||fin,now=i===cur&&!fin;
    s+=`<g data-goweek="${i}" role="link" aria-label="Week ${i+1}: ${esc(WEEKS[i].title)}"><title>Week ${i+1} · ${esc(WEEKS[i].title)}</title><rect x="${x-18}" y="12" width="36" height="60" fill="transparent"/><circle cx="${x}" cy="34" r="${now?10:7}" fill="${past||now?"var(--rail)":"var(--card)"}" stroke="var(--rail)" stroke-width="3"/>`;
    if(now)s+=`<circle cx="${x}" cy="34" r="4" fill="var(--card)"/>`;
    s+=`<text x="${x}" y="64" text-anchor="middle" font-size="12" font-weight="${now?700:400}" fill="${now?"var(--ink)":"var(--muted)"}" font-family="var(--body)">W${i+1}</text></g>`}
  s+=`<rect x="596" y="20" width="28" height="28" rx="6" fill="var(--ai)"/><text x="610" y="39" text-anchor="middle" font-size="14" font-weight="700" fill="var(--card)" font-family="var(--jp)">日</text><text x="610" y="64" text-anchor="middle" font-size="12" fill="var(--muted)" font-family="var(--body)">${fmt(TRIP)}</text></svg>`;return s}
function renderToday(){const el=document.getElementById("v-today");if(player){try{return renderPlayer(el)}catch(e){showError(e,"showing step "+(player.idx+1));const n=player.stages.length;el.innerHTML=`<div class="wrap player"><div class="head"><button class="btn" id="pl-exit">Exit</button><span class="label">Step ${player.idx+1} of ${n}</span></div><div class="panel"><p>This step couldn't be shown. Skip it and carry on.</p><div class="row"><button class="btn" id="pl-back" ${player.idx===0?"disabled":""}>Back</button><button class="btn primary" id="pl-next">${player.idx===n-1?"Finish":"Next step"}</button></div></div></div>`;el.querySelector("#pl-exit").onclick=()=>{player=null;extraSession=false;renderToday()};const bk=el.querySelector("#pl-back");if(bk)bk.onclick=()=>{player.idx--;renderToday()};el.querySelector("#pl-next").onclick=()=>{if(player.idx<n-1){player.idx++;renderToday()}else{toast=finishSession("ok");player=null;renderToday();window.scrollTo(0,0)}};return}}
  const adj=rebalance();const c=current(),left=daysLeft(),n=sessionsToday(),dt=doneToday(),missed=missedDays(),W=WEEKS[curWeek()];
  let body="";
  if(left===0)body=`<div class="panel"><h2>行ってらっしゃい</h2><p>Have a great trip. Open every exchange with Sumimasen, try your line first, and keep the Translate screen handy.</p></div>`;
  else if(!c)body=`${toast?`<div class="toast">${esc(toast)}</div>`:""}${shareCard()}<div class="panel"><h2>Course complete</h2><p>Keep it warm until you fly: answer questions with no text, and say your introduction once a day.</p><div class="row"><button class="btn primary" id="go-talk">Answer questions</button></div></div>`;
  else{const nudge=(missed>=1&&dt===0&&!restedToday())?`<div class="nudge ${slackRaw()<0?"warn":""}"><b>You missed ${missed} day${missed>1?"s":""}.</b><span class="small">${PLAN.lastAdjust&&PLAN.lastAdjust.date===todayIso()?esc(PLAN.lastAdjust.text):spare()>=0?`No change needed: you still have ${spare()} spare day${spare()===1?"":"s"}. Just do today's session.`:"Catch-up mode."}</span></div>`:(PLAN.lastAdjust&&PLAN.lastAdjust.date===todayIso()&&dt===0?`<div class="nudge warn"><span class="small">${esc(PLAN.lastAdjust.text)}</span></div>`:"");
    const stages=stagesFor(c.w,c.d),total=stages.reduce((a,x)=>a+x.min,0);
    const sessionCard=dt>=n||restedToday()?`<div class="panel"><h3>${restedToday()&&dt===0?"Rest day ✓":dt>1?dt+" sessions done today ✓":"Done for today ✓"}</h3><p class="small muted">Next: ${sessLink(c)}.${slackRaw()<0?" You're still behind, so another one now helps.":slackRaw()>0?" You're "+slackRaw()+" day"+(slackRaw()>1?"s":"")+" ahead.":""} Do as many in a day as you like; each one counts. Want to redo an earlier one? <button class="link" data-goweek="${c.w}">All lessons</button>.</p><div class="row"><button class="btn primary" id="extra">Start next session</button><button class="btn" id="extra-group">As a group</button><button class="btn" id="log-only">Did it with the group? Log it</button></div></div>`
     :`<div class="panel"><div><div class="label">${n>1?`Session ${dt+1} of ${n} today · `:""}${esc(sessionTitle(c))} · ${total} min${newToday(stages)?" · "+newToday(stages):""}</div><h3><button class="link" data-goweek="${c.w}" data-goday="${c.d}" style="text-decoration:none">${c.d===6?"Week "+(c.w+1)+" wrap-up":c.d>=7?"Final review":c.rep?"Repeat: "+esc(W.title):esc(W.title)}</button></h3></div>
      <ul class="hints">${stages.map((s,i)=>`<li data-stage="${i}" title="Start at this step"><span class="small muted" style="font-variant-numeric:tabular-nums">${s.min} min</span><span><b>${esc(s.title)}</b> <span class="small muted">${esc(stageDesc(s))}</span></span></li>`).join("")}</ul>
      <button class="btn primary bigbtn" id="start">Start session</button>
      <div class="row" style="justify-content:center"><button class="btn" id="start-group">Start as a group</button><button class="btn" id="log-only">Did it with the group? Log it</button></div>
      <p class="small" style="text-align:center;margin:0">🚗 Driving or out walking? <button class="link" data-gotab="practice" data-mode="drive">Drive mode</button>: audio only, keeps playing with the phone locked.</p>
      ${dt===0&&!restedToday()&&spare()>=1?`<p class="small muted" style="text-align:center">Need a break? <button class="btn" id="rest" style="padding:4px 10px">Take a rest day</button> You have ${spare()} spare.</p>`:""}</div>`;
    const upnext=[];for(let i=PLAN.pos+(dt>=n?0:1);i<Math.min(PLAN.queue.length,PLAN.pos+4);i++)upnext.push([i,PLAN.queue[i]]);
    const gpanel=groupPrompt?`<div class="panel"><div class="label">Group session</div><p class="small">One phone hosts (this one) and plays the audio; everyone says the lines, takes turns answering, and gets a role in the dialogue. Afterwards each person taps <b>Did it with the group? Log it</b> on their own phone so it counts for them.</p>
      <div class="field"><label class="small" for="gp-names">Who's here? (names, comma separated)</label><input type="text" id="gp-names" value="${esc(store.get("groupNames",[discordCfg().name].filter(Boolean)).join(", "))}" placeholder="Names, comma separated"></div>
      <div class="row"><button class="btn primary" id="gp-start">Start group session</button><button class="btn" id="gp-cancel">Cancel</button><span class="small muted" id="gp-msg"></span></div></div>`:"";
    body=`${toast?`<div class="toast">${esc(toast)}</div>`:""}${shareCard()}${gpanel}${nudge}${sessionCard}
     ${upnext.length?`<div class="panel"><div class="label">Up next</div><ul class="upnext">${upnext.map(([i,s])=>`<li><span class="d">${fmt(projectedDate(i))}</span><span><button class="link" data-goweek="${s.w}" data-goday="${s.d}">${esc(sessionTitle(s))}</button></span></li>`).join("")}</ul><p class="small muted">Planned finish: ${fmt(projectedDate(PLAN.queue.length-1))}. <button class="link" data-gotab="plan">Plan</button> has the whole schedule; <button class="link" data-goweek="${c.w}">Lessons</button> lets you revisit any session.</p></div>`:""}`}
  el.innerHTML=`<div class="wrap" style="gap:18px">
   <div class="countdown"><b>${left}</b><span class="muted">${left===1?"day":"days"} until you fly · ${fmt(TRIP)}</span></div>${setupHTML()}${tripAskHTML()}<div>${statusLine()}${streak()>1?`<span class="muted small"> · ${streak()}-day streak</span>`:""}</div>
   <div class="sign"><div class="sign-top" data-goweek="${curWeek()}" role="link" tabindex="0" title="Open this week's lessons"><div class="kanji">${W.kanji}</div><div class="roma">${esc(W.title)}</div><div class="muted small">Week ${curWeek()+1} of 10 · ${esc(W.goal)}</div></div>
    <div class="sign-band"><button data-goweek="${curWeek()-1}" ${curWeek()>0?"":"disabled"}>${curWeek()>0?"←&nbsp;"+esc(WEEKS[curWeek()-1].title):""}</button><button class="num" data-goweek="${curWeek()}">W${curWeek()+1}</button>${curWeek()<9?`<button class="r" data-goweek="${curWeek()+1}">${esc(WEEKS[curWeek()+1].title)}&nbsp;→</button>`:`<span class="r">Japan →</span>`}</div></div>
   <div class="railmap">${railSVG()}</div><p class="small muted" style="margin:-10px 0 0;text-align:center">Tap a week, the sign, or a session name to open the lesson list.</p>
   ${body}
   ${profileSet()?"":`<p class="small muted">Fill in <button class="link" data-gotab="talk" data-mode="me">Your answers</button> so the drills use your real name and hometown.</p>`}
   ${VOICE_WARN}</div>`;
  toast="";
  bindShare(el);bindLinks(el);bindSetup(el);const st=el.querySelector("#start");if(st)st.onclick=safe("starting the session",()=>startSession());el.querySelectorAll("[data-stage]").forEach(li=>li.onclick=()=>startSession({at:+li.dataset.stage}));
  const sg=el.querySelector("#start-group")||el.querySelector("#extra-group");if(sg)sg.onclick=()=>{if(sg.id==="extra-group"){PLAN.log=PLAN.log.filter(l=>!(l.date===todayIso()&&l.key==="rest"));savePlan();extraSession=true}groupPrompt=true;renderToday()};
  const lo=el.querySelector("#log-only");if(lo)lo.onclick=()=>{PLAN.log=PLAN.log.filter(l=>!(l.date===todayIso()&&l.key==="rest"));savePlan();extraSession=true;startSession({logOnly:true})};
  const rs=el.querySelector("#rest");if(rs)rs.onclick=()=>{if(restDay())toast="Rest day logged. See you tomorrow.";renderToday()};
  const ex=el.querySelector("#extra");if(ex)ex.onclick=()=>{PLAN.log=PLAN.log.filter(l=>!(l.date===todayIso()&&l.key==="rest"));savePlan();extraSession=true;startSession()};
  const gp=el.querySelector("#gp-start");if(gp){gp.onclick=()=>{const names=el.querySelector("#gp-names").value.split(/[,、\n]+/).map(x=>x.trim()).filter(Boolean);if(!names.length){el.querySelector("#gp-msg").textContent="Add at least one name.";return}store.set("groupNames",names);groupPrompt=false;startSession({group:names})};el.querySelector("#gp-cancel").onclick=()=>{groupPrompt=false;renderToday()}}
  const gt=el.querySelector("#go-talk");if(gt)gt.onclick=()=>{talk={mode:"answer",max:9,only:false,hide:true};showPractice("talk")};
  renderVoiceWarn()}

/* ---------- tell the group (Discord) ---------- */
let shareMsg="";
function shareCard(){const sh=PLAN.pending;if(!sh)return"";return feedbackCard(true)}
function feedbackCard(after){const d=discordCfg(),can=IN_CLAUDE||!!d.feedback,sh=PLAN.pending;
  return`<div class="panel"><div class="label">${after&&sh?`Done: ${esc(sh.label)} ✓ · 🔥 ${sh.streak}-day streak`:"Feedback on the app or this lesson"}</div>${after?`<p class="small" style="margin:0">Anything about the app or this lesson? It helps the next round of fixes.</p>`:""}<p class="small muted">Anything confusing, broken, missing, or an idea? It goes to the group's ${chLink("feedback")}${IN_CLAUDE?" (and straight to Claude for the next round of fixes)":""}.</p>
   <textarea id="fb-text" placeholder="e.g. The listening pause is too short on week 3 · I'd love a numbers-only drill"></textarea>
   <div class="row"><button class="btn" id="fb-send" ${can?"":"disabled"}>Send feedback</button>${after?`<button class="btn" id="sh-skip">Done</button>`:""}<span class="small muted" id="fb-msg">${can?"":`Tap the group's setup link in ${chLink("today")} to send.`}</span></div></div>`}
async function sendFeedback(text,label){const d=discordCfg(),entry={text,session:label,date:todayIso(),name:d.name||"Someone",app:IN_CLAUDE?"claude":"web"};
  const log=store.get("feedbackLog",[]);log.unshift(entry);store.set("feedbackLog",log.slice(0,50));
  let where=[];
  if(DB){try{await DB.collection("feedback").add(Object.assign({at:new Date().toISOString()},entry));where.push("Claude")}catch(e){}}
  if(d.feedback&&!IN_CLAUDE){await discordPost(d.feedback,`💬 **${entry.name}** · ${label}\n> ${text.replace(/\n+/g," ")}`,entry.name);where.push("#app-feedback")}
  if(!where.length)throw new Error("nowhere");return where}
function bindShare(el){const sh=PLAN.pending;if(!sh)return;const d=discordCfg();
  const skip=el.querySelector("#sh-skip");if(skip)skip.onclick=()=>{PLAN.pending=null;shareMsg="";savePlan();renderToday()};
  const fb=el.querySelector("#fb-send");if(fb)fb.onclick=async()=>{const t=el.querySelector("#fb-text").value.trim(),m=el.querySelector("#fb-msg");if(!t){m.textContent="Type something first.";return}fb.disabled=true;m.textContent="Sending…";
    try{const where=await sendFeedback(t,sh.label);m.textContent="Sent to "+where.join(" and ")+". Thank you.";el.querySelector("#fb-text").value=""}
    catch(e){fb.disabled=false;if(IN_CLAUDE){try{await navigator.clipboard.writeText(t);m.textContent="Couldn't store it here; copied to your clipboard, paste it in #app-feedback."}catch(x){m.textContent="Couldn't send it. Copy it and paste in #app-feedback."}}else m.textContent="Couldn't send. Check the #app-feedback webhook in Plan."}};
}

