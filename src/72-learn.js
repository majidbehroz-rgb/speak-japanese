/* ---------- LEARN: words → phrase, one phrase at a time ---------- */
function wordsHTML(p){const ws=[...new Set(wordTok(p[0]))].filter(t=>WORDS[t]&&!NAME_WORDS.has(t));if(ws.length<2)return"";
  return`<div class="parts" aria-label="Words">${ws.map(t=>`<button class="part" data-pjp="${esc(WORDS[t][2]||WORDS[t][0])}"><span class="ro">${esc(t)}</span><span class="r">${esc(WORDS[t][1])}</span></button>`).join("")}</div>`}
function partsHTML(p){const parts=partsOf(p[0]);if(parts.length<2&&!parts[0][1])return"";const hooks=parts.map(x=>hookFor(x[0])).filter(Boolean);return`<div class="parts">${parts.map(x=>`<button class="part" data-pjp="${esc(x[1]||p[1])}" title="${esc(x[2])}"><span class="ro">${hl(x[0])}</span><span class="r">${esc(x[2])}</span></button>`).join("")}</div>${hooks.length?`<div class="hook" style="grid-column:2;text-align:left;max-width:none;margin-top:2px">${esc(hooks[0])}</div>`:""}`}
let learnItems=[],learnIdx=0,learnOn=false,onLearnDone=null,learnPart=-1,learnWord=null;
function drawLearn(phase,o){o=o||{};const st=document.getElementById("ln-stage");if(!st)return;const c=learnItems[learnIdx];if(!c)return;
  if(learnWord){const wd=learnWord;st.innerHTML=`<div class="small muted" style="font-variant-numeric:tabular-nums">${learnIdx+1} / ${learnItems.length} · ${wd.label?esc(wd.label):`words in “${esc(c.en)}”`}</div><div class="phase">${esc(phase||"")}</div>
     ${o.hideEn?`<div class="en" style="opacity:.25">・・・</div>`:`<div class="en">${hl(wd.en)}</div>`}${o.hideRo?`<div style="opacity:.25;font-size:1.5rem">・・・</div>`:`<div class="ro">${hl(wd.ro)}</div><div class="jpw">${hl(wd.jp)}</div>`}
     <p class="small" style="margin:0;color:var(--rail);font-weight:600;min-height:1.2em">${esc(o.say||"")}</p>`;const bar=document.getElementById("ln-bar");if(bar)bar.style.width=((learnIdx+1)/learnItems.length*100)+"%";return}const parts=partsOf(c.ro);const hook=learnPart>=0?hookFor(parts[learnPart][0]):"";
  st.innerHTML=`<div class="small muted" style="font-variant-numeric:tabular-nums">${learnIdx+1} / ${learnItems.length}</div><div class="phase">${esc(phase||"")||"&nbsp;"}</div>
   ${o.hideEn?`<div class="en" style="opacity:.25">・・・</div>`:`<div class="en">${hl(c.en)}</div>`}${o.hideRo?`<div style="opacity:.25;font-size:1.5rem">・・・</div>`:`<div class="ro">${hl(c.ro)}</div><div class="jpw">${hl(c.jp)}</div>`}
   ${(o.hideRo&&o.hideEn)||o.noParts?"":`<div class="parts">${parts.map((x,i)=>`<button class="part ${i===learnPart?"on":""}" data-part="${i}"><span class="ro">${hl(x[0])}</span><span class="r">${esc(x[2])}</span></button>`).join("")}</div>`}
   ${hook?`<div class="hook">${esc(hook)}</div>`:""}
   <p class="small" style="margin:0;color:var(--rail);font-weight:600;min-height:1.2em">${esc(o.say||"")}</p>`;
  st.querySelectorAll("[data-part]").forEach(b=>b.onclick=()=>{const x=parts[+b.dataset.part];stopLearn();learnPart=+b.dataset.part;drawLearn("Tap ▶︎ Play to continue",{say:x[0]});hearNow(LN.s(x[0],x[1]||c.jp))});
  const bar=document.getElementById("ln-bar");if(bar)bar.style.width=((learnIdx+1)/learnItems.length*100)+"%"}
function restartLearnIf(){if(learnOn){stopLearn();startLearn()}else{learnPart=-1;drawLearn("")}}
async function startLearn(){learnOn=true;const btn=document.getElementById("ln-play");if(btn)btn.textContent="Pause";
  const my=++runId;stopSpeech();await sleep(80);try{wake=await navigator.wakeLock.request("screen")}catch(e){}
  const ok=()=>my===runId&&learnOn;
  const say=async L=>{await voice(L);return ok()};          // play one line (recorded clip, else text-to-speech); false once stopped
  const turn=async L=>{await yourTurn(L);return ok()};      // the learner's turn: the Time to answer pause, sized to the expected answer
  const gap=async ms=>{await tsleep(ms);return ok()};
  const card=(x,label)=>{learnWord={ro:x.ro,jp:x.jp,en:x.en,label}};
  // each new word on its own (meaning → word → your turn → once more), then a quick meaning check; returns the words taught, or null if stopped.
  // Words of staff phrases are not all recorded yet: those lines are marked "staff-word" and use text-to-speech.
  const teachWords=async(nw,staff)=>{for(let k=0;k<nw.length;k++){const wd=nw[k],W=LN.w(wd),E=eLine(wd.en);if(staff){if(!clipOf(W.key))W.cat="staff-word";if(!clipOf(E.key))E.cat="staff-word"}learnWord=wd;learnPart=-1;
      drawLearn(`New word ${k+1} of ${nw.length}`,{say:"Listen"});if(!await say(E)||!await gap(300)||!await say(W)||!await gap(400))return null;
      drawLearn(`New word ${k+1} of ${nw.length}`,{say:"Say: "+wd.ro});if(!await say(W)||!await turn(W))return null;
      drawLearn(`New word ${k+1} of ${nw.length}`,{say:"Once more: "+wd.ro+" = "+wd.en});if(!await say(W)||!await turn(W))return null}
    if(nw.length>1)for(const wd of shuffle(nw)){const W=LN.w(wd),E=eLine(wd.en);if(staff){if(!clipOf(W.key))W.cat="staff-word";if(!clipOf(E.key))E.cat="staff-word"}learnWord=wd;drawLearn("What does it mean?",{hideEn:true,say:"Say the English"});if(!await say(W)||!await turn(E))return null;
      drawLearn("It means…",{say:wd.ro+" = "+wd.en});if(!await say(E)||!await gap(600))return null}
    learnWord=null;return new Set(nw.map(w=>w.ro))};
  // from the English: meaning → your turn → the answer. Pairs (Hai / Iie …) ask for one member at a time.
  const fromEnglish=async(p,label)=>{const m=membersOf(p),list=m?m.map(x=>({ro:x.ro,jp:x.jp,en:x.en,q:x.enL,a:x.ja})):[{ro:p.ro,jp:p.jp,en:p.en,q:eLine(p.en),a:LN.j(p)}];
    for(const x of list){card(x,label);drawLearn(m?"Say it in Japanese · one at a time":"Say it in Japanese",{hideRo:true,say:"Say it in Japanese"});if(!await say(x.q)||!await turn(x.a))return false;
      drawLearn("Answer",{say:x.ro+" = "+x.en});if(!await say(x.a)||!await gap(700))return false}learnWord=null;return true};
  // recall an item taught earlier in this step, once, from the English (staff phrases: hear it, say what they want)
  const recallItem=async p=>{if(p.staff){card(p,"earlier in this lesson");drawLearn("Remember this one? What do they want?",{hideEn:true,say:"Say the English"});
      if(!await say(LN.item(p))||!await turn(eLine(p.en)))return false;drawLearn("It means…",{say:p.ro+" = "+p.en});if(!await say(eLine(p.en))||!await gap(600))return false;learnWord=null;return true}
    return fromEnglish(p,"earlier in this lesson")};
  // after each item, the one before it comes back once; after the last, a short gap and the last one too
  const next=async()=>{if(learnIdx>=1&&!(await recallItem(learnItems[learnIdx-1])))return false;
    if(learnIdx+1>=learnItems.length){if(!await gap(1500)||!(await recallItem(learnItems[learnIdx])))return false;
      learnIdx=0;stopLearn();learnPart=-1;drawLearn("All done",{say:"Next: hear each one and say what it means.",noParts:true});if(onLearnDone)onLearnDone();return false}
    learnIdx++;return true};
  while(ok()){const c=learnItems[learnIdx],parts=partsOf(c.ro),multi=parts.length>1,E=eLine(c.en),J=LN.item(c);
    if(c.staff){const reply=c.reply&&!c.reply.startsWith("(")?c.reply:"";const nw=newWordsFor(c.id,c.ro+" "+reply);const taught=await teachWords(nw,true);if(!taught)return;
      learnPart=-1;drawLearn(nw.length?"Now what staff say: the meaning, then the Japanese":"Listen: the meaning, then what they say",{say:"Just listen"});if(!await say(E)||!await gap(300)||!await say(J)||!await gap(700))return;
      for(let i=0;i<parts.length;i++){const x=parts[i],sound=/sound it out/.test(x[2]),pw=wordTok(x[0]),S=LN.s(x[0],x[1]||c.jp);if(!sound&&pw.length===1&&taught.has(pw[0]))continue;
        if(!sound&&pw.every(t=>!WORDS[t]||WORD_FIRST[t]!==undefined)&&pw.length===1)continue;
        if(AX.state==="ok"&&(!clipOf(S.key)||(!sound&&!clipOf(eLine(x[2]).key))))continue;   // staff pieces are drilled only where they are recorded
        learnPart=i;drawLearn(multi?`Piece ${i+1} of ${parts.length} · ${x[2]}`:x[2],{say:"Say: "+x[0]});if(!sound&&(!await say(eLine(x[2]))||!await gap(250)))return;
        if(!await say(S)||!await turn(S))return}
      learnPart=-1;drawLearn("Normal speed, the way staff say it",{say:"Listen, then say it under your breath"});if(!await say(J)||!await turn(J))return;
      drawLearn("What do they want?",{hideRo:true,hideEn:true,say:"Say the meaning in English"});if(!await say(J)||!await turn(E))return;
      drawLearn("It means…",{say:c.ro+" = "+c.en});if(!await say(E)||!await gap(600))return;
      if(reply){const ro=reply.split(/\s*\/\s*/),en=(c.replyEn||"").split(/\s*\/\s*/),jp=(c.replyJp||"").split(/\s*\/\s*/);
        // each option's own English when recorded, else the whole reply's English once ("no thanks or yes please")
        const each=en.every((x,i)=>!x||clipOf(eLine(x).key))||AX.state!=="ok";
        if(!each&&c.replyEn){drawLearn("Your reply",{say:"You can answer: "+reply+" = "+c.replyEn});if(!await say(eLine(c.replyEn))||!await gap(250))return}
        for(let i=0;i<ro.length;i++){const R=LN.reply(ro[i],jp[i]);if(AX.state==="ok"&&!clipOf(R.key))R.cat="staff-word";card({ro:ro[i],jp:jp[i]||"",en:en[i]||c.replyEn||""},"your reply");drawLearn(ro.length>1?`Your reply, option ${i+1} of ${ro.length}`:"Your reply",{say:"Say: "+ro[i]+(en[i]?" = "+en[i]:"")});
          if(each&&en[i]&&(!await say(eLine(en[i]))||!await gap(250)))return;if(!await say(R)||!await turn(R))return}learnWord=null}
      else{drawLearn("Nothing to say back",{say:c.reply||""});if(!await gap(1500))return}
      if(!await next())return;continue}
    if(c.word&&!PARTS[c.ro]){const S=c.num?LN.j(c):LN.s(c.ro,c.jp);   // number words have one recording (no separate slow one)
      learnPart=-1;drawLearn("Listen: the meaning, then the word",{say:"Just listen",noParts:true});if(!await say(E)||!await gap(200)||!await say(S)||!await gap(400))return;
      drawLearn(c.en,{say:"Say: "+c.ro,noParts:true});if(!await say(S)||!await turn(J))return;
      if(!await fromEnglish(c,"from the English"))return;
      if(!await next())return;continue}
    const nw=newWordsFor(c.id,c.ro);const taught=await teachWords(nw);if(!taught)return;
    // 2) now the phrase
    learnPart=-1;drawLearn(nw.length?"Now the phrase: the meaning, then the Japanese":"Listen: the meaning, then the Japanese",{say:"Just listen"});if(!await say(E)||!await gap(250)||!await say(J)||!await gap(500))return;
    for(let i=0;i<parts.length;i++){const x=parts[i],sound=/sound it out/.test(x[2]),label=multi?`Piece ${i+1} of ${parts.length} · ${x[2]}`:x[2],S=LN.s(x[0],x[1]||c.jp);learnPart=i;
      const pw=wordTok(x[0]);if(!sound&&pw.length===1&&taught.has(pw[0]))continue; // a single word you just learned: no need to drill it again
      drawLearn(label,{say:"Say: "+x[0]});if(!sound&&(!await say(eLine(x[2]))||!await gap(200)))return;if(!await say(S)||!await turn(S))return;
      if(!sound&&pw.every(t=>WORD_FIRST[t]!==undefined&&(taught.has(t)||!WORDS[t]||WORD_FIRST[t]!==c.id)))continue; // every word in it is already known: once is enough
      drawLearn(label,{say:"Once more: "+x[0]+(sound?"":" = "+x[2])});if(!await say(S)||!await turn(S))return}
    learnPart=-1;
    if(multi){drawLearn("All together, slowly",{say:"Say: "+c.ro});const S=LN.s(c.ro,c.jp);if(!await say(S)||!await turn(J))return}
    drawLearn("Normal speed · "+c.en,{say:"Say: "+c.ro});if(!await say(J)||!await turn(J))return;
    if(!await fromEnglish(c,"from the English"))return;
    drawLearn("Got it: "+c.en,{say:c.ro+" = "+c.en});if(!await gap(600))return;
    if(!await next())return}}
function stopLearn(){stopAll();learnOn=false;learnWord=null;const btn=document.getElementById("ln-play");if(btn)btn.textContent="Play"}

