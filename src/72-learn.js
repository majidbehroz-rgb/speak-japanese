/* ---------- LEARN: words → phrase, one phrase at a time ---------- */
function wordsHTML(p){const ws=[...new Set(wordTok(p[0]))].filter(t=>WORDS[t]&&!NAME_WORDS.has(t));if(ws.length<2)return"";
  return`<div class="parts" aria-label="Words">${ws.map(t=>`<button class="part" data-pjp="${esc(WORDS[t][2]||WORDS[t][0])}"><span class="ro">${esc(t)}</span><span class="r">${esc(WORDS[t][1])}</span></button>`).join("")}</div>`}
function partsHTML(p){const parts=partsOf(p[0]);if(parts.length<2&&!parts[0][1])return"";const hooks=parts.map(x=>hookFor(x[0])).filter(Boolean);return`<div class="parts">${parts.map(x=>`<button class="part" data-pjp="${esc(x[1]||p[1])}" title="${esc(x[2])}"><span class="ro">${hl(x[0])}</span><span class="r">${esc(x[2])}</span></button>`).join("")}</div>${hooks.length?`<div class="hook" style="grid-column:2;text-align:left;max-width:none;margin-top:2px">${esc(hooks[0])}</div>`:""}`}
let learnItems=[],learnIdx=0,learnOn=false,onLearnDone=null,learnPart=-1,learnWord=null;
function drawLearn(phase,o){o=o||{};const st=document.getElementById("ln-stage");if(!st)return;const c=learnItems[learnIdx];if(!c)return;
  if(learnWord){const wd=learnWord;st.innerHTML=`<div class="small muted" style="font-variant-numeric:tabular-nums">${learnIdx+1} / ${learnItems.length} · ${wd.recall?"earlier in this lesson":`words in “${esc(c.en)}”`}</div><div class="phase">${esc(phase||"")}</div>
     ${o.hideEn?`<div class="en" style="opacity:.25">・・・</div>`:`<div class="en">${hl(wd.en)}</div>`}${o.hideRo?`<div style="opacity:.25;font-size:1.5rem">・・・</div>`:`<div class="ro">${hl(wd.ro)}</div><div class="jpw">${hl(wd.jp)}</div>`}
     <p class="small" style="margin:0;color:var(--rail);font-weight:600;min-height:1.2em">${esc(o.say||"")}</p>`;const bar=document.getElementById("ln-bar");if(bar)bar.style.width=((learnIdx+1)/learnItems.length*100)+"%";return}const parts=partsOf(c.ro);const hook=learnPart>=0?hookFor(parts[learnPart][0]):"";
  st.innerHTML=`<div class="small muted" style="font-variant-numeric:tabular-nums">${learnIdx+1} / ${learnItems.length}</div><div class="phase">${esc(phase||"")||"&nbsp;"}</div>
   ${o.hideEn?`<div class="en" style="opacity:.25">・・・</div>`:`<div class="en">${hl(c.en)}</div>`}${o.hideRo?`<div style="opacity:.25;font-size:1.5rem">・・・</div>`:`<div class="ro">${hl(c.ro)}</div><div class="jpw">${hl(c.jp)}</div>`}
   ${(o.hideRo&&o.hideEn)||o.noParts?"":`<div class="parts">${parts.map((x,i)=>`<button class="part ${i===learnPart?"on":""}" data-part="${i}"><span class="ro">${hl(x[0])}</span><span class="r">${esc(x[2])}</span></button>`).join("")}</div>`}
   ${hook?`<div class="hook">${esc(hook)}</div>`:""}
   <p class="small" style="margin:0;color:var(--rail);font-weight:600;min-height:1.2em">${esc(o.say||"")}</p>`;
  st.querySelectorAll("[data-part]").forEach(b=>b.onclick=()=>{const x=parts[+b.dataset.part];stopLearn();learnPart=+b.dataset.part;drawLearn("Tap ▶︎ Play to continue",{say:x[0]});sayNow(x[1]||c.jp)});
  const bar=document.getElementById("ln-bar");if(bar)bar.style.width=((learnIdx+1)/learnItems.length*100)+"%"}
function restartLearnIf(){if(learnOn){stopLearn();startLearn()}else{learnPart=-1;drawLearn("")}}
async function startLearn(){learnOn=true;const btn=document.getElementById("ln-play");if(btn)btn.textContent="Pause";
  const my=++runId;stopSpeech();await sleep(80);try{wake=await navigator.wakeLock.request("screen")}catch(e){}
  const ok=()=>my===runId&&learnOn,slow=f=>f,pause=len=>sleep(Math.min(14000,(store.get("gap",3)*900+len*120)*groupMul()*Math.max(1,0.75/Math.max(0.3,rate))));
  // each new word on its own (meaning → word → your turn → once more), then a quick meaning check; returns the words taught, or null if stopped
  const teachWords=async nw=>{for(let k=0;k<nw.length;k++){const wd=nw[k];learnWord=wd;learnPart=-1;
      drawLearn(`New word ${k+1} of ${nw.length}`,{say:"Listen"});await speak(sayable(wd.en),"en",1);if(!ok())return null;await tsleep(300);if(!ok())return null;await speak(wd.say,"ja",0.8);if(!ok())return null;await tsleep(400);if(!ok())return null;
      drawLearn(`New word ${k+1} of ${nw.length}`,{say:"Say: "+wd.ro});await speak(wd.say,"ja",0.8);if(!ok())return null;await pause(wd.say.length);if(!ok())return null;
      drawLearn(`New word ${k+1} of ${nw.length}`,{say:"Once more: "+wd.ro+" = "+wd.en});await speak(wd.say,"ja",0.8);if(!ok())return null;await pause(wd.say.length);if(!ok())return null}
    if(nw.length>1)for(const wd of shuffle(nw)){learnWord=wd;drawLearn("What does it mean?",{hideEn:true,say:"Say the English"});await speak(wd.say,"ja",0.9);if(!ok())return null;await pause(3);if(!ok())return null;
      drawLearn("It means…",{say:wd.ro+" = "+wd.en});await speak(sayable(wd.en),"en",1);if(!ok())return null;await tsleep(600);if(!ok())return null}
    learnWord=null;return new Set(nw.map(w=>w.ro))};
  // Pimsleur-style recall: after each new item, bring back earlier ones from this lesson at growing distances
  const recallEarlier=async backs=>{for(const back of backs){const p=learnItems[learnIdx-back];if(!p||p.staff)continue;learnWord={ro:p.ro,jp:p.jp,en:p.en,recall:true};
      drawLearn("Remember this one?",{hideRo:true,say:"Say it in Japanese"});await speak(sayable(p.en),"en",1);if(!ok())return false;await sleep(answerMs(p.jp.length));if(!ok())return false;
      drawLearn("Remember this one?",{say:p.ro+" = "+p.en});await speak(p.jp,"ja");if(!ok())return false;await tsleep(700);if(!ok())return false}
    learnWord=null;return true};
  while(ok()){const c=learnItems[learnIdx],parts=partsOf(c.ro),multi=parts.length>1,enSay=sayable(c.en);
    if(c.staff){const reply=c.reply&&!c.reply.startsWith("(")?c.reply:"";const nw=newWordsFor(c.id,c.ro+" "+reply);const taught=await teachWords(nw);if(!taught)return;
      learnPart=-1;drawLearn(nw.length?"Now what staff say: the meaning, then the Japanese":"Listen: the meaning, then what they say",{say:"Just listen"});await speak(enSay,"en",1);if(!ok())return;await tsleep(300);if(!ok())return;await speak(c.jp,"ja",1);if(!ok())return;await tsleep(700);if(!ok())return;
      for(let i=0;i<parts.length;i++){const x=parts[i],jp=x[1]||c.jp,sound=/sound it out/.test(x[2]),pw=wordTok(x[0]);if(!sound&&pw.length===1&&taught.has(pw[0]))continue;
        if(!sound&&pw.every(t=>!WORDS[t]||WORD_FIRST[t]!==undefined)&&pw.length===1)continue;
        learnPart=i;drawLearn(multi?`Piece ${i+1} of ${parts.length} · ${x[2]}`:x[2],{say:"Say: "+x[0]});if(!sound){await speak(sayable(x[2]),"en",1);if(!ok())return;await tsleep(250);if(!ok())return}
        await speak(jp,"ja",slow(0.8));if(!ok())return;await pause(jp.length);if(!ok())return}
      learnPart=-1;drawLearn("Normal speed, the way staff say it",{say:"Listen, then say it under your breath"});await speak(c.jp,"ja",1);if(!ok())return;await pause(c.jp.length);if(!ok())return;
      drawLearn("What do they want?",{hideRo:true,hideEn:true,say:"Say the meaning in English"});await speak(c.jp,"ja",1);if(!ok())return;await pause(c.en.length/3+4);if(!ok())return;
      drawLearn("It means…",{say:c.ro+" = "+c.en});await speak(enSay,"en",1);if(!ok())return;await tsleep(600);if(!ok())return;
      if(reply){const ro=reply.split(/\s*\/\s*/),en=(c.replyEn||"").split(/\s*\/\s*/),jp=(c.replyJp||"").split(/\s*\/\s*/);
        for(let i=0;i<ro.length;i++){drawLearn(ro.length>1?`Your reply, option ${i+1} of ${ro.length}`:"Your reply",{say:"Say: "+ro[i]+(en[i]?" = "+en[i]:"")});
          if(en[i]){await speak(sayable(en[i]),"en",1);if(!ok())return;await tsleep(250);if(!ok())return}await speak(jp[i]||ro[i],"ja");if(!ok())return;await pause((jp[i]||ro[i]).length);if(!ok())return}}
      else{drawLearn("Nothing to say back",{say:c.reply||""});await tsleep(1500);if(!ok())return}
      learnIdx++;if(learnIdx>=learnItems.length){learnIdx=0;stopLearn();learnPart=-1;drawLearn("All done",{say:"Next: tap what they want."});if(onLearnDone)onLearnDone();return}continue}
    if(c.word&&!PARTS[c.ro]){learnPart=-1;drawLearn("Listen: the meaning, then the word",{say:"Just listen",noParts:true});await speak(enSay,"en",1);if(!ok())return;await tsleep(200);if(!ok())return;await speak(c.jp,"ja",slow(0.85));if(!ok())return;await tsleep(400);if(!ok())return;
      drawLearn(c.en,{say:"Say: "+c.ro,noParts:true});await speak(c.jp,"ja",slow(0.85));if(!ok())return;await pause(c.jp.length);if(!ok())return;
      drawLearn("Now from the English",{hideRo:true,say:"Say it in Japanese",noParts:true});await speak(enSay,"en",1);if(!ok())return;await pause(c.jp.length+2);if(!ok())return;
      drawLearn("Answer · "+c.en,{say:"Repeat after it",noParts:true});await speak(c.jp,"ja");if(!ok())return;await tsleep(600);if(!ok())return;
      if(!(await recallEarlier([2])))return;
      learnIdx++;if(learnIdx>=learnItems.length){learnIdx=0;stopLearn();learnPart=-1;drawLearn("All done",{say:"Next: hear each one and say what it means.",noParts:true});if(onLearnDone)onLearnDone();return}continue}
    const nw=newWordsFor(c.id,c.ro);const taught=await teachWords(nw);if(!taught)return;
    // 2) now the phrase
    learnPart=-1;drawLearn(nw.length?"Now the phrase: the meaning, then the Japanese":"Listen: the meaning, then the Japanese",{say:"Just listen"});await speak(enSay,"en",1);if(!ok())return;await tsleep(250);if(!ok())return;await speak(c.jp,"ja");if(!ok())return;await tsleep(500);if(!ok())return;
    for(let i=0;i<parts.length;i++){const x=parts[i],jp=x[1]||c.jp,sound=/sound it out/.test(x[2]),label=multi?`Piece ${i+1} of ${parts.length} · ${x[2]}`:x[2];learnPart=i;
      const pw=wordTok(x[0]);if(!sound&&pw.length===1&&taught.has(pw[0]))continue; // a single word you just learned: no need to drill it again
      drawLearn(label,{say:"Say: "+x[0]});if(!sound){await speak(sayable(x[2]),"en",1);if(!ok())return;await tsleep(200);if(!ok())return}await speak(jp,"ja",slow(0.8));if(!ok())return;await pause(jp.length);if(!ok())return;
      if(!sound&&pw.every(t=>WORD_FIRST[t]!==undefined&&(taught.has(t)||!WORDS[t]||WORD_FIRST[t]!==c.id)))continue; // every word in it is already known: once is enough
      drawLearn(label,{say:"Once more: "+x[0]+(sound?"":" = "+x[2])});await speak(jp,"ja",slow(0.8));if(!ok())return;await pause(jp.length);if(!ok())return}
    learnPart=-1;
    if(multi){drawLearn("All together, slowly",{say:"Say: "+c.ro});await speak(c.jp,"ja",slow(0.75));if(!ok())return;await pause(c.jp.length);if(!ok())return}
    drawLearn("Normal speed · "+c.en,{say:"Say: "+c.ro});await speak(c.jp,"ja");if(!ok())return;await pause(c.jp.length);if(!ok())return;
    drawLearn("Now from the English",{hideRo:true,say:"Say it in Japanese"});await speak(enSay,"en",1);if(!ok())return;await pause(c.jp.length+6);if(!ok())return;
    drawLearn("Answer",{say:"Repeat after it"});await speak(c.jp,"ja");if(!ok())return;await tsleep(700);if(!ok())return;
    drawLearn("Got it: "+c.en,{say:c.ro+" = "+c.en});await tsleep(600);if(!ok())return;
    if(!(await recallEarlier(learnIdx>=2?[2]:[1])))return;
    learnIdx++;
    if(learnIdx>=learnItems.length){learnIdx=0;stopLearn();learnPart=-1;drawLearn("All done",{say:"Next: hear each one and say what it means."});if(onLearnDone)onLearnDone();return}}}
function stopLearn(){stopAll();learnOn=false;learnWord=null;const btn=document.getElementById("ln-play");if(btn)btn.textContent="Play"}

