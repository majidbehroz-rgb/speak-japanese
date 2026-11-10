/* ---------- Claude-powered extras (only when the viewer's app offers them) ---------- */
let SAMPLE=null;
function aiError(e){const c=e&&e.code;if(c==="not_granted"||c==="sampling_disabled"||c==="not_declared"||c==="capability_disabled"){SAMPLE=null;return"Claude isn't available for this page, so this feature is off."}
  if(c==="rate_limited")return"Too many requests for now. Try again in a minute.";if(c==="session_expired")return"Please sign in to Claude again, then retry.";
  if(c==="invalid_json"||c==="empty_completion")return"Didn't get a clean answer. Try once more or rephrase.";if(c==="refused")return"Claude declined that one. Try different wording.";if(c==="cancelled")return"";return"Something went wrong. Try again."}
let DB=null;
(async()=>{try{if(window.claude&&typeof claude.use==="function"){SAMPLE=await claude.use("sample")}}catch(e){SAMPLE=null}
  if(SAMPLE&&(curTab==="translate"||(curTab==="practice"&&practiceMode==="talk")))VIEWS[curTab]()})();
(async()=>{try{if(window.claude&&typeof claude.use==="function"){DB=await claude.use("db")}}catch(e){DB=null}})();
// group setup link: ?setup=<base64url json {done,wins,feedback,link,ch:{today,done,wins,board,feedback},trip:"YYYY-MM-DD"}>
// Nothing from the link is saved until the person reads what it contains and taps Save.
var setupPending=null;
const isHook=u=>typeof u==="string"&&/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/.test(u);
const isChan=u=>typeof u==="string"&&/^https:\/\/(discord\.com|discordapp\.com)\/channels\/\d+\/\d+$/.test(u);
const b64u=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const unb64u=s=>decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/"))));
(function(){try{const q=new URLSearchParams(location.search).get("setup");if(!q)return;history.replaceState(null,"",location.pathname);const v=JSON.parse(unb64u(q));
  const p={hooks:{},ch:{},trip:""};["feedback"].forEach(k=>{if(isHook(v[k]))p.hooks[k]=v[k]});
  if(v.ch&&typeof v.ch==="object")["today","feedback"].forEach(k=>{if(isChan(v.ch[k]))p.ch[k]=v.ch[k]});
  if(typeof v.trip==="string"&&_dt(v.trip))p.trip=v.trip;
  if(Object.keys(p.hooks).length||Object.keys(p.ch).length||p.trip)setupPending=p;else toast="That setup link didn't contain anything this app can use."}catch(e){toast="That setup link couldn't be read. Ask the group for a fresh one."}})();
const CHNAME={today:"#lesson-today",feedback:"#app-feedback"};
const hookShort=u=>u.replace(/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/(\d{4})\d*\/.*$/,"discord.com/api/webhooks/$2…");
function setupHTML(){const p=setupPending;if(!p)return"";const hk=Object.keys(p.hooks),cs=Object.keys(p.ch);
  return`<div class="panel" style="border:2px solid var(--ai)"><div class="label">Group setup link</div><p class="small" style="margin:0">This link wants to save the following on this phone. Nothing is saved until you tap Save.</p><ul class="prompts small">
   ${hk.length?`<li><b>Posting addresses (webhooks)</b> for ${hk.map(k=>CHNAME[k]).join(", ")}: ${hk.map(k=>`<code>${esc(hookShort(p.hooks[k]))}</code>`).join(", ")}. The app uses it only when you tap Send feedback.</li>`:""}
   ${cs.length?`<li><b>Channel links</b> for ${cs.map(k=>CHNAME[k]).join(", ")}, so the app can link to them.</li>`:""}
   ${p.trip?`<li><b>Flight date:</b> ${esc(fmt(_dt(p.trip)))}. The 10-week plan is timed to finish before it; you can change it in Plan.</li>`:""}</ul>
   <p class="small muted" style="margin:0">Only save it if the link came from your study group's Discord.</p>
   <div class="row"><button class="btn primary" id="su-save">Save</button><button class="btn" id="su-no">Don't save</button></div></div>`}
function tripAskHTML(){if(TRIP_SET||setupPending)return"";
  return`<div class="panel"><div class="label">When do you fly?</div><p class="small" style="margin:0">The plan fits the 10 weeks before your flight. Until you set it, it assumes ${esc(fmt(TRIP))}.</p>
   <div class="row"><input type="date" id="trip-in" value="${iso(TRIP)}" min="${todayIso()}"><button class="btn primary" id="trip-save">Save</button></div></div>`}
function bindSetup(el){const s=el.querySelector("#su-save");if(s)s.onclick=()=>{const p=setupPending;if(!p)return;const cur=store.get("discord",{})||{};Object.assign(cur,p.hooks);delete cur.done;delete cur.wins;delete cur.link;cur.ch=Object.assign({},p.ch);store.set("discord",cur);if(p.trip)store.set("trip",p.trip);setupPending=null;location.replace(location.pathname)};
  const n=el.querySelector("#su-no");if(n)n.onclick=()=>{setupPending=null;toast="Nothing was saved.";renderToday()};
  const t=el.querySelector("#trip-save");if(t)t.onclick=()=>{const v=el.querySelector("#trip-in").value;if(!_dt(v))return;store.set("trip",v);location.reload()}}
function setupLinkFor(dc,ch){const o={};if(isHook(dc.feedback))o.feedback=dc.feedback;const c={};Object.keys(CHNAME).forEach(k=>{if(isChan(ch[k]))c[k]=ch[k]});if(Object.keys(c).length)o.ch=c;o.trip=iso(TRIP);
  return(PUBLIC_LINK||location.href.split(/[?#]/)[0])+"?setup="+b64u(JSON.stringify(o))}


/* chat with a local */
const SCENES={restaurant:"a server at a small ramen restaurant in Tokyo",shop:"a clerk at a clothing shop",station:"a station attendant at Shinjuku Station",hotel:"a hotel front-desk clerk",chat:"a friendly local the traveler met at an izakaya who makes small talk"};
let chat={scene:"chat",turns:[],log:[],busy:false};
function chatRules(){const p=prof();return`You are helping an English-speaking beginner practice simple spoken Japanese for a trip to Japan. Scene: you are ${SCENES[chat.scene]}. Stay in character and keep it realistic. The learner writes in romaji or Japanese, sometimes mixed with English. Use very simple polite Japanese (desu/masu), one or two short sentences, and usually end with a natural question so the conversation continues. Never switch to English in your spoken reply.
Reply with ONLY a JSON object with these keys: "jp" (your reply in Japanese), "ro" (romaji of your reply), "en" (English meaning of your reply), "verdict" (one of "good", "ok", "retry" judging the learner's LAST line: good = understandable and natural enough for a tourist; ok = understandable with a small slip; retry = would not be understood, or was mostly English), "fix_ro" (the learner's last line corrected and natural, in romaji; empty if it was fine), "fix_jp" (the same in Japanese; empty if fine), "tip" (one short English sentence of feedback; empty if fine). For your very first line there is no learner line yet: use verdict "good" and empty fixes.
Learner: first name ${p.name||"Kuma"}, from ${p.origin||"Denver"}, job ${val("job",2)}, likes ${val("food",2)}, hobby ${val("hobby",2)}.`}
function chatBody(){return`<p class="small muted">Type what you'd say (romaji is fine). Claude plays the other person, answers in simple Japanese, and tells you whether to move on or try that line again. Uses your own Claude account; the first message asks you to allow it.</p>
   <div class="row"><label class="small" for="ch-scene">Scene</label><select id="ch-scene"><option value="chat">Small talk at an izakaya</option><option value="restaurant">Ordering at a restaurant</option><option value="shop">Buying something in a shop</option><option value="station">Asking at the station</option><option value="hotel">Hotel front desk</option></select><button class="btn" id="ch-new">New conversation</button></div>
   <div class="panel"><div class="chat" id="ch-log">${chat.log.length?chat.log.map(chatBubble).join(""):`<p class="small muted">Tap Start and the other person will open the conversation.</p>`}</div>
    <div class="row"><input type="text" id="ch-in" placeholder="Say something in Japanese…" style="flex:1;min-width:0" autocomplete="off" ${chat.busy?"disabled":""}><button class="btn primary" id="ch-send" ${chat.busy?"disabled":""}>${chat.log.length?"Send":"Start"}</button></div>
    <p class="small muted" id="ch-msg"></p></div>`}
function chatBubble(m,i){if(m.me)return`<div class="bub me"><div>${esc(m.text)}</div>${m.verdict?`<span class="verdict ${m.verdict}">${m.verdict==="good"?"Good, move on":m.verdict==="ok"?"OK, small fix":"Try again"}</span>`:""}${m.tip?`<div class="small">${esc(m.tip)}</div>`:""}${m.fix_ro&&m.verdict!=="good"?`<div class="small"><b>Say:</b> ${esc(m.fix_ro)}<span class="jpw"> · ${esc(m.fix_jp)}</span></div>`:""}</div>`;
  if(m.pending)return`<div class="bub"><div class="muted">Thinking…</div></div>`;
  return`<div class="bub"><div class="ro">${esc(m.ro)}</div><div class="small muted">${esc(m.en)}</div><div class="jpw">${esc(m.jp)}</div><div><button class="say" data-chs="${i}" aria-label="Hear it">${SPK}</button></div></div>`}
function bindChat(el){const sc=el.querySelector("#ch-scene");sc.value=chat.scene;sc.onchange=()=>{chat={scene:sc.value,turns:[],log:[],busy:false};renderTalk()};
  el.querySelector("#ch-new").onclick=()=>{chat={scene:chat.scene,turns:[],log:[],busy:false};renderTalk()};
  el.querySelectorAll("[data-chs]").forEach(b=>b.onclick=()=>sayNow(chat.log[+b.dataset.chs].jp,b));
  const inp=el.querySelector("#ch-in"),send=el.querySelector("#ch-send");
  const go=()=>chatSend(inp.value.trim());send.onclick=go;inp.onkeydown=e=>{if(e.key==="Enter")go()};
  const log=el.querySelector("#ch-log");log.scrollTop=log.scrollHeight}
async function chatSend(text){if(!SAMPLE||chat.busy)return;const first=chat.turns.length===0;if(!first&&!text)return;
  if(first)chat.turns.push({role:"user",content:chatRules()+"\n\nOpen the conversation with your first line."});
  else{chat.turns.push({role:"user",content:text});chat.log.push({me:true,text})}
  chat.log.push({pending:true});chat.busy=true;renderTalk();
  try{const r=await SAMPLE.json(chat.turns,{modelTier:"quick",cache:false});chat.log.pop();
    const rep={jp:String(r.jp||""),ro:String(r.ro||""),en:String(r.en||""),verdict:["good","ok","retry"].includes(r.verdict)?r.verdict:"ok",fix_ro:String(r.fix_ro||""),fix_jp:String(r.fix_jp||""),tip:String(r.tip||"")};
    if(!first){const mine=chat.log[chat.log.length-1];Object.assign(mine,{verdict:rep.verdict,tip:rep.tip,fix_ro:rep.fix_ro,fix_jp:rep.fix_jp})}
    chat.log.push(rep);chat.turns.push({role:"assistant",content:JSON.stringify(r)});if(chat.turns.length>20)chat.turns.splice(1,2);
    chat.busy=false;renderTalk();sayNow(rep.jp)}
  catch(e){chat.log.pop();if(!first)chat.turns.pop();chat.busy=false;renderTalk();const m=document.getElementById("ch-msg");if(m)m.textContent=aiError(e)}}

