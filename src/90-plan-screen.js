/* ---------- PLAN ---------- */
const BUILD="16";const IN_CLAUDE=!!(window.claude&&typeof claude.use==="function");const PUBLIC_LINK=CFG.publicLink||(location.protocol.startsWith("http")?location.origin+location.pathname:""),CLAUDE_LINK=CFG.appLink;const APP_LINK=IN_CLAUDE&&CLAUDE_LINK?CLAUDE_LINK:PUBLIC_LINK;
let resetArmed=false;
function renderPlan(){const el=document.getElementById("v-plan"),S=planSchedule(),total=courseOrder().length-S.cut,done=Math.min(total,coursePos(PLAN)),cd=store.get("cando",{}),cdTotal=CANDO.flat().length,cdDone=Object.keys(cd).length;
  const weeks=WEEKS.map((W,w)=>{const d=weekPlan(w),ci=coursePos(PLAN),q=courseOrder(),first=q.findIndex(s=>s.w===w),last=first+learnDays(w);
    let st;if(ci>last)st=`<span class="status good">Done</span>`;else if(ci>=first)st=`<span class="status">In progress</span>`;else st=d.length?`<span class="small muted">${fmt(_dt(d[0]))}${d.length>1?" – "+fmt(_dt(d[d.length-1])):""}</span>`:`<span class="small muted">doesn't fit</span>`;
    return`<div class="sched" data-goweek="${w}" role="link"><span class="wk">W${w+1}</span><span><span class="jp">${W.kanji}</span> ${esc(W.title)}</span><span style="text-align:right">${st}</span></div>`}).join("");
  const dc=discordCfg();const remindAt=store.get("remindAt","08:00"),notifOK=(()=>{try{return"Notification" in window&&Notification.permission==="granted"}catch(e){return false}})();
  el.innerHTML=`<div class="wrap"><div><div class="label">Your course</div><h2>Plan</h2></div>
   <div class="panel"><div class="row" style="justify-content:space-between"><b>${done} of ${total} sessions done</b></div><div>${statusLine()}</div><div class="prog"><i style="width:${Math.round(done/Math.max(1,total)*100)}%"></i></div>
    <p class="small muted" style="margin:0">${current()?`${S.finish?"Planned finish: "+esc(dfmt(S.finish))+". ":""}You fly ${fmt(TRIP)}.${S.finalsKept<FINALS&&S.finalsKept>0?" The final rehearsal is shortened to "+S.finalsKept+" session"+(S.finalsKept>1?"s":"")+" to fit.":""}`:"Course complete."}</p></div>
   <div class="panel"><div class="label">How this works</div>
    <ul class="prompts"><li><b>One session a day, 10–15 minutes.</b> Today shows one Start button; the steps play one after another on their own.</li>
     <li><b>Learning days, then one Use-it session.</b> Each week teaches its new words and phrases over three or four short learning days, a few at a time. Then one Use-it session puts them to work: the week's conversation, questions people will ask you, a quick check and a self-check.</li>
     <li><b>Two on a weekend day only when needed.</b> If the days left before your flight are fewer than the sessions left, Saturdays and Sundays get a second session first; weekdays only if that is still not enough. You can always do another session; each one counts.</li>
     <li><b>Everything comes back.</b> What you learn returns on a memory schedule (1, 3, 7, 14, 30 days…), so every session starts with a short review.</li>
     <li><b>After a break, a warm-up.</b> If a week or more has passed since your last session, the next one is a review of what you know, with nothing new.</li>
     <li><b>Hard is fine.</b> Rate a session Hard and it is repeated if there is a spare day; otherwise its phrases come back in tomorrow's review.</li>
     <li><b>Speaking only.</b> Everything is shown as it sounds (romaji) with audio; no reading or writing. You can turn on Japanese writing in Settings if you're curious.</li>
     <li><b>Realistic target.</b> Polite, able to handle daily travel situations in Japanese, and a 2–3 minute friendly exchange about yourself and your trip. Not fluent.</li></ul></div>
   ${(()=>{const b=srsBuckets();return b.total?`<div class="panel"><div class="label">Your memory schedule</div>
    <p class="small">Everything you've learned comes back on an expanding schedule: 1 day, 3 days, 1 week, 2 weeks, a month. Things you know well rest longer, so you never redo whole lessons.</p>
    <div class="grid2" style="gap:6px 14px"><span class="small">Due today</span><b>${b.today}</b><span class="small">Tomorrow</span><b>${b.tomorrow}</b><span class="small">Within a week</span><b>${b.week}</b><span class="small">Within a month</span><b>${b.month}</b><span class="small">Resting a month or more</span><b>${b.later}</b><span class="small">Known well (rest 2+ weeks)</span><b>${b.known} of ${b.total}</b></div></div>`:""})()}
   <div class="panel"><div class="label">Schedule</div><div>${weeks}</div>${S.doubled.length?`<p class="small muted" style="margin:0">Two sessions on: ${S.doubled.map(d=>esc(dfmt(d))).join(", ")}.</p>`:""}${S.overflow?`<p class="small" style="margin:0">${S.overflow} session${S.overflow>1?"s":""} won't fit before your flight. The order stays the same; do extra sessions when you can.</p>`:""}</div>
   <div class="panel"><div class="label">What you'll be able to do · ${cdDone} of ${cdTotal}</div><div class="prog"><i style="width:${Math.round(cdDone/cdTotal*100)}%"></i></div>
    <div>${CANDO.map((items,w)=>items.map((c,i)=>`<label class="check"><input type="checkbox" data-cando="${w}-${i}" ${cd[w+"-"+i]?"checked":""}><span>${esc(c)} <button class="link small" data-goweek="${w}">W${w+1}</button></span></label>`).join("")).join("")}</div></div>
   <div class="panel"><div class="label">Open it like an app</div>
    <p class="small">${IN_CLAUDE?"You're using the Claude version: your progress syncs to your Claude account, so phone, laptop and the Claude app all show the same place. Sign in with the same Claude account on each device and open this same Claude link. To add someone, the owner invites their email from Share (they need their own Claude account); each person gets their own progress.":"The app lives at this link. Put an icon on your phone so it's one tap away, for you and anyone you share it with:"}</p>
    <div class="row"><input type="text" id="applink" value="${APP_LINK}" readonly style="flex:1;min-width:0;font-size:.85rem"><button class="btn" id="copylink">Copy link</button></div>
    <ul class="prompts small"><li><b>iPhone:</b> open the link in Safari, tap Share, then <b>Add to Home Screen</b>.</li><li><b>Android:</b> open it in Chrome, tap the menu, then <b>Add to Home screen</b>.</li></ul></div>
   <div class="panel"><div class="label">Your trip</div><div class="row"><label class="small" for="pl-trip">Flight date</label><input type="date" id="pl-trip" value="${iso(TRIP)}"><button class="btn" id="pl-trip-save">Save</button></div><p class="small muted" style="margin:0">The plan is timed to finish before this date.</p></div>
   <div class="panel"><div class="label">Discord group</div>
    <p class="small">The group's Language Bot posts each day's lesson in ${chLink("today")}. Feedback you send from the app goes to ${chLink("feedback")}. ${SYNC.on?"Settings sync to your Claude account.":"Settings are stored on this phone only."}</p>
    <div class="grid2"><div class="field"><label class="small" for="dc-name">Your name (shown with your feedback)</label><input type="text" id="dc-name" value="${esc(dc.name)}" placeholder="Your first name"></div>
     <div class="field"><label class="small" for="dc-feedback">#app-feedback webhook URL (optional)</label><input type="text" id="dc-feedback" value="${esc(dc.feedback)}" placeholder="https://discord.com/api/webhooks/…" autocomplete="off"></div>
</div>
    <details class="small"><summary>Make the group's setup link</summary><p class="small">One link that fills in the #app-feedback webhook above, these channel links and the flight date. Post it in the group's Discord; each person taps it once and confirms before anything is saved. It contains the webhook addresses, so share it only inside the group.</p>
     <div class="grid2">${Object.keys(CHNAME).map(k=>`<div class="field"><label class="small" for="dc-ch-${k}">${CHNAME[k]} channel link</label><input type="text" id="dc-ch-${k}" value="${esc(CH[k]||"")}" placeholder="https://discord.com/channels/…" autocomplete="off"></div>`).join("")}</div>
     <div class="row"><button class="btn" id="dc-mklink">Copy setup link</button><span class="small muted" id="dc-mkmsg"></span></div><textarea id="dc-setup-out" readonly rows="3" style="width:100%;font-size:.75rem" hidden></textarea></details>
    <div class="row"><button class="btn primary" id="dc-save">Save</button><span class="small muted" id="dc-msg"></span></div>

    ${(store.get("feedbackLog",[])).length?`<details><summary class="small">Feedback you've sent (${store.get("feedbackLog",[]).length})</summary><ul class="prompts small">${store.get("feedbackLog",[]).slice(0,10).map(f=>`<li>${esc(f.date)} · ${esc(f.session)}: ${esc(f.text)}</li>`).join("")}</ul></details>`:""}</div>
   <div class="panel"><div class="label">Daily reminder</div>
    <div class="row"><label class="small" for="remind">Study time</label><input type="time" id="remind" value="${esc(remindAt)}"></div>
    <p class="small">A web page can't wake a locked phone on its own, so the reminder comes from your phone. Pick one:</p>
    <ul class="prompts small"><li><b>Reminders app (iPhone):</b> new reminder "Japanese", repeat daily at ${esc(remindAt)}, and paste the app link into it. Tapping the notification opens the app.</li>
     <li><b>Shortcuts app (iPhone):</b> Automation → Time of Day → daily at ${esc(remindAt)} → action "Open URLs" with the app link → Run Immediately. The app opens itself every morning.</li>
     <li><b>Android:</b> a daily alarm or a Google Calendar event with the link in it.</li></ul>
    <p class="small muted">Whichever you use, the Today screen already knows what's due when the app opens.</p>
    <div class="row"><button class="btn" id="notif">${notifOK?"Browser reminders on":"Turn on browser reminders"}</button><span class="small muted">Extra: fires only while this page is open in a tab.</span></div></div>
   <div class="panel"><div class="label">Settings</div>
    <label class="row small"><input type="checkbox" id="pl-jp" ${store.get("showJp",false)?"checked":""}> Show Japanese writing under each phrase</label>
    <div id="offline-line" hidden></div>
    <label class="row small"><input type="checkbox" id="pl-auto" ${store.get("autoNext",true)?"checked":""}> In a session, move to the next step on its own</label>
    <div class="row"><button class="btn" id="reset">Start the course over</button></div>${resetArmed?`<div class="panel skipq"><p style="margin:0">Start again from week 1? Your review history and settings are kept.</p><div class="row"><button class="btn" id="reset-yes">Yes, start over</button><button class="btn" id="reset-no">Cancel</button></div></div>`:""}
    <p class="small muted">Lessons play recorded voices; lines not recorded yet use the phone's Japanese voice (iPhone: Settings → Accessibility → Spoken Content → Voices → Japanese; Android: add Japanese in Text-to-speech settings). ${SYNC.on?"Progress syncs to your Claude account ("+esc(SYNC.status)+"). Each person has their own.":IN_CLAUDE?"Not signed in to Claude, so progress is saved on this device only. Sign in to sync it across devices.":"Progress is saved on this device only."}</p>
    <div class="label" style="margin-top:14px">Move progress to another device</div>
    <p class="small">Your phone and laptop share progress only when both open the same Claude link, signed in to the same account. If one shows less than the other, copy the code on the device that is further along and load it on the other. Loading never loses anything: it keeps whichever side has more.</p>
    <div class="row"><button class="btn" id="pg-copy">Copy progress code</button><button class="btn" id="pg-load">Load a code</button></div>
    <textarea id="pg-box" rows="3" hidden style="width:100%;font-size:.8rem" placeholder="Paste the code here" autocomplete="off"></textarea>
    <div class="row"><button class="btn primary" id="pg-apply" hidden>Load it</button></div><p class="small" id="pg-msg" role="status"></p>
    <div class="row"><button class="btn" id="appcheck">Check this phone</button><button class="btn" id="soundagain">Run the sound check again</button></div><div id="appcheck-out" class="small" hidden></div>
    <p class="small muted">Something not working? Tap <b>Check this phone</b> and paste the result into the Feedback box after a session (or #app-feedback). Build ${BUILD}.</p></div>
   ${VOICE_WARN}</div>`;
  // about two phone screens: progress and status, the dated schedule, then everything else folded
  {const sched=[...el.querySelectorAll(".panel")].find(p=>(p.querySelector(".label")||{}).textContent==="Schedule"),first=el.querySelector(".wrap > .panel");if(sched&&first)first.after(sched);
   foldPanels(el,["How this works","Your memory schedule","What you'll be able to do","Open it like an app","Your trip","Discord group","Daily reminder","Settings"])}
  bindLinks(el);el.querySelectorAll("[data-cando]").forEach(c=>c.onchange=()=>{const m=store.get("cando",{});if(c.checked)m[c.dataset.cando]=true;else delete m[c.dataset.cando];store.set("cando",m);renderPlan()});
  el.querySelector("#remind").onchange=e=>{store.set("remindAt",e.target.value);renderPlan()};
  const dcSave=()=>{const g=id=>el.querySelector("#dc-"+id).value.trim();const ok=u=>!u||/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(u);const m=el.querySelector("#dc-msg");
    if(!ok(g("feedback"))){m.textContent="That doesn't look like a Discord webhook URL.";return null}const v=Object.assign({},store.get("discord",{}),{name:g("name"),feedback:g("feedback")});delete v.done;delete v.wins;delete v.link;store.set("discord",v);m.textContent="Saved.";return v};
  el.querySelector("#dc-save").onclick=()=>{if(dcSave())renderPlan()};
  el.querySelector("#pl-trip-save").onclick=()=>{const v=el.querySelector("#pl-trip").value;if(!_dt(v))return;store.set("trip",v);refreshDates();VIEWS[curTab]()};
  el.querySelector("#dc-mklink").onclick=async()=>{const v=dcSave();const m=el.querySelector("#dc-mkmsg");if(!v)return;const ch={};let bad=false;Object.keys(CHNAME).forEach(k=>{const x=el.querySelector("#dc-ch-"+k).value.trim();if(x&&!isChan(x))bad=true;else if(x)ch[k]=x});
    if(bad){m.textContent="A channel link should look like https://discord.com/channels/123/456.";return}
    const cur=store.get("discord",{});cur.ch=ch;store.set("discord",cur);const link=setupLinkFor(cur,ch);const out=el.querySelector("#dc-setup-out");out.hidden=false;out.value=link;
    try{await navigator.clipboard.writeText(link);m.textContent="Copied. Paste it into the group's Discord."}catch(e){out.select();m.textContent="Select the link below and copy it."}};
  el.querySelector("#copylink").onclick=()=>{const b=el.querySelector("#copylink"),inp=el.querySelector("#applink");const ok=()=>{b.textContent="Copied";setTimeout(()=>b.textContent="Copy link",1500)};const fb=()=>{inp.focus();inp.select();b.textContent="Select and copy"};try{navigator.clipboard.writeText(inp.value).then(ok,fb)}catch(e){fb()}};
  el.querySelector("#notif").onclick=async()=>{try{const p=await Notification.requestPermission();if(p!=="granted")el.querySelector("#notif").textContent="Not allowed here. Use a phone alarm."}catch(e){el.querySelector("#notif").textContent="Not available here. Use a phone alarm."}renderPlan()};
  el.querySelector("#pl-jp").onchange=e=>{setShowJp(e.target.checked)};
  el.querySelector("#soundagain").onclick=()=>{store.set("soundOK",false);const o=el.querySelector("#appcheck-out");o.hidden=false;o.textContent="The sound check will run at the start of your next session."};
  el.querySelector("#appcheck").onclick=()=>{const o=el.querySelector("#appcheck-out");o.hidden=false;const ua=navigator.userAgent||"";const inApp=/FBAN|FBAV|Instagram|Discord|Line\/|Twitter|Snapchat/i.test(ua)||(!/Safari/i.test(ua)&&/iPhone|iPad/i.test(ua));
    const ja=voices.filter(v=>(v.lang||"").toLowerCase().startsWith("ja")).map(v=>v.name);let saved=false;try{localStorage.setItem("jp17:_t","1");saved=localStorage.getItem("jp17:_t")==="1";localStorage.removeItem("jp17:_t")}catch(e){}
    const lines=[`Build ${BUILD} · ${IN_CLAUDE?"Claude version":"web version"} · ${/iPhone|iPad/i.test(ua)?"iPhone/iPad":/Android/i.test(ua)?"Android":"desktop"}${inApp?" · inside another app's browser (open in Safari/Chrome instead)":""}`,
      `Speech: ${hasTTS?"available ✓":"NOT available ✗ — this browser can't speak"}`,`Japanese voice: ${ja.length?ja.slice(0,2).join(", ")+" ✓":voices.length?"none found ✗ — add one in the phone's settings":"voice list not loaded yet, try again after playing something"}`,
      `Saves progress: ${saved?"yes ✓":"no ✗ — private browsing? progress will be lost when you close the page"}`,`Discord feedback: ${discordCfg().feedback?"connected ✓":IN_CLAUDE?"copy-and-paste mode (normal in Claude)":"not connected — tap the group's setup link in #lesson-today"}`,`Sessions done: ${PLAN.log.filter(l=>l.key!=="rest").length} · plan v${PLAN.v} · sound check: ${store.get("soundOK",false)?"passed":"not yet"}`,`Sync: ${SYNC.on?SYNC.status+(SYNC.last?" · last change from "+SYNC.last:""):IN_CLAUDE?"off (not signed in)":"n/a (web version keeps progress on this phone)"}`,`Last error: ${(()=>{const e=store.get("lastError",null);return e?`${e.where||"?"}: ${e.msg} (build ${e.build}, ${e.at})`:"none recorded"})()}`,`Last sessions: ${PLAN.log.slice(-4).map(l=>l.date+" "+l.key+(l.rating?"/"+l.rating:"")).join(", ")||"none"}`];
    o.innerHTML=lines.map(esc).join("<br>")+`<br><button class="btn" id="appcheck-copy" style="margin-top:6px">Copy</button>`;const cb=o.querySelector("#appcheck-copy");cb.onclick=()=>{try{navigator.clipboard.writeText(lines.join("\n")).then(()=>cb.textContent="Copied",()=>cb.textContent="Select the text above and copy")}catch(e){cb.textContent="Select the text above and copy"}}};
  {const box=el.querySelector("#pg-box"),ap=el.querySelector("#pg-apply"),msg=el.querySelector("#pg-msg");
   el.querySelector("#pg-copy").onclick=async()=>{const c=progressCode();box.hidden=false;ap.hidden=true;box.value=c;box.select();try{await navigator.clipboard.writeText(c);msg.textContent="Copied. On the other device, open Plan → Load a code and paste it. Keep it to yourself: it holds your answers and progress."}catch(e){msg.textContent="Select the code above and copy it, then paste it on the other device (Plan → Load a code)."}};
   el.querySelector("#pg-load").onclick=()=>{box.hidden=false;ap.hidden=false;box.value="";box.focus();msg.textContent=""};
   ap.onclick=()=>{const r=loadProgressCode(box.value);msg.textContent=r.msg;if(r.ok){SYNC.dirty("progress");box.hidden=true;ap.hidden=true;setTimeout(()=>renderPlan(),1200)}}}
  el.querySelector("#reset").onclick=()=>{resetArmed=true;renderPlan()};const ry=el.querySelector("#reset-yes");if(ry)ry.onclick=()=>{resetArmed=false;planStartOver();renderPlan()};
  offlineLine(el.querySelector("#offline-line"));
  el.querySelector("#pl-auto").onchange=e=>store.set("autoNext",e.target.checked);
  const rn=el.querySelector("#reset-no");if(rn)rn.onclick=()=>{resetArmed=false;renderPlan()};renderVoiceWarn()}
function checkReminder(){try{if(!("Notification" in window)||Notification.permission!=="granted")return;const at=store.get("remindAt","08:00"),now=new Date(),hm=String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0");
  if(hm>=at&&store.get("notified","")!==todayIso()&&doneToday()===0&&current()){store.set("notified",todayIso());new Notification("Japanese: today's session is ready",{body:sessionTitle(current())+" · about 15 minutes"})}}catch(e){}}
setInterval(checkReminder,30000);

