/* ---------- session stages ---------- */
let lessonWeek=curWeek(), listenSel={w:String(curWeek()),half:"all"}, cardMax=curWeek();
let talk={mode:"answer",max:curWeek(),only:false,hide:false};
let toast="";
function stagesFor(w,d){const W=WEEKS[w];
  // minutes come from measured rates: ~0.75 min per phrase learned, ~0.2 per phrase in a listen round, ~0.17 per quiz question, ~0.13 per card
  const mins=x=>Math.max(1,Math.round(x));
  const review={kind:"cards",title:"Review",min:mins(10*0.13),n:10,max:w,dir:"mix"};
  const meaning=(half,title)=>{const ids=partIds(w,half);return{kind:"meaning",title:title||"What do they mean?",min:mins(ids.length*0.2),ids}};
  const quiz=(ids,n,title)=>({kind:"quiz",title:title||"Quick check",min:mins(Math.min(n,ids.length)*0.17+0.3),ids,n});
  // guided Speak: each item from the English (your turn, then the recorded answer), then up to 3 closing questions made only of known words.
  // The week's W.speak situation lines are not shown here: whether everything they ask for has been taught can't be checked (rule 11).
  const speak=ids=>({kind:"speak",title:"Speak: say it from the English",min:mins(ids.length*0.3+0.9),w,ids});
  const warm=(ids,title,dir)=>ids.length?{kind:"warm",title,min:mins(ids.length*0.2),ids,dir:dir||"say"}:null;
  const learn=(half,n)=>({kind:"learn",title:"New words → phrases, part "+n,min:mins(partIds(w,half).length*0.75+partIds(w,half).reduce((a,id)=>a+newWordsFor(id,byId(id).ro).length,0)*0.25),ids:partIds(w,half),w});
  const learnMin=ids=>mins(ids.reduce((a,id)=>{const c=byId(id);return a+(c&&c.word&&!PARTS[c.ro]?0.3:0.75)},0));
  const sayback=(half,title)=>{const ids=partIds(w,half);return{kind:"sayback",title:title||"Say them back",min:mins(ids.length*0.2),ids}};
  // interleaving: a few things from earlier weeks are mixed into this week's checks, so old and new are practised side by side
  const older=n=>takeSome([...learnedIds()].filter(id=>+id.split("-")[0]<w),n);
  const learnedUpTo=()=>[...learnedIds()].filter(id=>+id.split("-")[0]<=w);
  // every session opens with what's due today from the spaced schedule: yesterday's new items, then 3-day, week-old and older ones as they come due
  // floor: the first session of a new week always brings back at least 8 things from before; every other session at least 5
  const rv=(cap,floor)=>{const ids=dueIds(cap,floor==null?5:floor);return ids.length?{kind:"review",title:"Due today: quick review",min:mins(ids.length*0.17),ids}:null};
  if(d>=7)return[rv(25),{kind:"answer",title:"Answer questions",min:5,max:9,only:false,hide:true,limit:12},{kind:"listen",title:"Listen to everything",min:6,w:"all",half:"all",hide:true,limit:20},{kind:"intro",title:"Your introduction",min:3}].filter(Boolean);
  const L=learnDays(w);
  const learnPhr=(ids,n)=>({kind:"learn",title:"New words → phrases, part "+n,min:mins(ids.length*0.75+ids.reduce((a,id)=>a+newWordsFor(id,byId(id).ro).length,0)*0.25),ids,w});
  const conv=()=>[rv(15),{kind:"dialogue",title:"The week's conversation",min:1,w,mode:null,then:"B"},...(w>0&&(W.patterns||[]).length?[{kind:"build",title:"Build your own sentences",min:mins(8*0.17),max:w,only:true,n:8}]:[]),{kind:"answer",title:"Answer questions",min:mins(6*0.35),max:w,only:true,hide:false,limit:6},quiz(wordIds(w).concat(partIds(w,"all"),older(2)),9,"Quick check: the whole week, plus a few older ones")];
  const ears=()=>[rv(15),warm(takeSome(partIds(w,"all").concat(staffIds(w)),8).concat(older(2)),"Ears only: hear it, say the meaning","und")];
  const earsAnswers=()=>ears().concat([{kind:"answer",title:"Answer questions",min:mins(8*0.35),max:w,only:false,hide:true,limit:8},quiz(wordIds(w).concat(partIds(w,"all"),staffIds(w),older(2)),9,"Quick check: the whole week, plus a few older ones")]);
  const trav=(first)=>(first?[]:[rv(15)]).concat([{kind:"dialogue",title:"Be the traveler",min:1,w,mode:"B",then:"A"},W.drill?{kind:"drill",title:(W.drill==="numbers"?"Numbers":W.drill==="prices"?"Prices":"Time")+" drill",min:2,drill:W.drill,n:10}:null,{kind:"build",title:"Build sentences",min:mins(8*0.17),max:w,only:false,n:8},speak(partIds(w,"all"))]);
  // the week's one combined "Use it" session (d=6), 15 minutes or less: review, conversation (hear it, then be the traveler; a partner
  // role-play is an optional button inside), answer questions, the week's drill if it has one (short), a quick check, the self-check
  // the week's drill; the week that completes 1–10 (if not the numbers week itself) gets the numbers drill too, with its first 11–99
  const tenWeek=(deck.find(c=>c.num&&c.ro==="juu")||{}).w,useDrill=W.drill||(tenWeek===w?"numbers":null);
  const useIt=()=>[rv(12),{kind:"dialogue",title:"The week's conversation",min:3,w,mode:null,then:"B",partner:true},{kind:"answer",title:"Answer questions",min:mins(6*0.35),max:w,only:true,hide:false,limit:6},
    useDrill?{kind:"drill",title:(useDrill==="numbers"?"Numbers":useDrill==="prices"?"Prices":"Time")+" drill",min:1,drill:useDrill,n:5}:null,
    quiz(wordIds(w).concat(partIds(w,"all"),staffIds(w),older(2)),8,"Quick check: the whole week, plus a few older ones"),{kind:"selfcheck",title:"Self-check",min:2,w}];
  let st;
  // Learning days bring in everything new, a little at a time (LP): the day's phrases with their words, then its share of the week's
  // other words (swap words, numbers), then what staff say. One Use-it session follows; d = L..5 are optional More practice.
  if(d<L){const D=LP[w][d],phr=D.ph,xs=D.fl,ss=D.st,ids=phr.concat(xs,ss),last=d===L-1,nums=xs.length&&xs.every(id=>byId(id).num);
    const ord=LP[w].slice(0,d+1).filter(x=>x.ph.length).length,before=LP[w].slice(0,d).flatMap(x=>x.ph);
    st=[rv(12,d===0?(w>0?8:0):5),last?{kind:"tip",title:"This week's tip",min:1,w}:null,
     phr.length?learnPhr(phr,ord):null,
     xs.length?{kind:"learn",title:nums?"New words: numbers":"New words",min:learnMin(xs),ids:xs,w}:null,
     ss.length?{kind:"learn",title:"New: what staff will say to you",min:mins(ss.length*0.9+ss.reduce((a,id)=>{const c=byId(id);return a+newWordsFor(id,c.ro+" "+(c.reply&&!c.reply.startsWith("(")?c.reply:"")).length},0)*0.25),ids:ss,w,staff:true}:null,
     {kind:"meaning",title:"What do they mean?",min:mins(ids.length*0.2),ids},
     quiz(ids.concat(phr.length&&before.length?takeSome(before,3):[]),8,phr.length?(before.length?"Quick check: today's and yesterday's":"Quick check: today's phrases"):"Quick check: today's words and staff phrases"),
     (last&&w===0&&(W.patterns||[]).length)?{kind:"build",title:"Build your own sentences",min:mins(8*0.17),max:w,only:true,n:8}:null,
     speak(ids)]}
  else if(d===6)st=useIt();
  // d = L..5: the old use days, now optional "More practice" in Lessons (never scheduled)
  else if(L===3)st=d===3?conv():d===4?earsAnswers():trav(false);
  else st=d===4?conv():ears().concat(trav(true));
  return st.filter(Boolean)}
// the stages of a queue entry: the welcome-back session is review only; everything else comes from stagesFor
function sessionStages(s){if(s&&s.k==="back"){const ids=backIds(BACK_CAP);return[{kind:"review",title:"Welcome back: warm-up review",min:Math.max(1,Math.round(ids.length*0.17)),ids}]}
  const st=stagesFor(s.w,s.d);if(!s||s.rep||s.d<0||s.d>=learnDays(s.w))return st;
  // a learning day teaches only what is not learned yet (someone whose day now also holds new words is not taught their old phrases again);
  // after "Start the course over" everything is taught again
  const S=srsMap(),reset=(PLAN.resetAt||"").slice(0,10),had=id=>S[id]&&!(reset&&(S[id].last||"")<=reset);
  return st.map(x=>x.kind==="learn"?Object.assign({},x,{ids:x.ids.filter(id=>!had(id))}):x).filter(x=>x.kind!=="learn"||x.ids.length)}
// what a learning day brings that is new, in words people use: "4 words, 3 phrases"
function newToday(stages){let w=0,p=0;stages.filter(s=>s.kind==="learn").forEach(s=>(s.ids||[]).forEach(id=>{const c=byId(id);if(!c)return;if(c.word){if(isNewFloat(c))w++}else{p++;w+=newWordsFor(id,c.ro+" "+(c.reply&&!c.reply.startsWith("(")?c.reply:"")).length}}));
  return w||p?`New today: ${w} word${w===1?"":"s"}, ${p} phrase${p===1?"":"s"}`:""}
function stageDesc(s){switch(s.kind){case"review":return"Hands-free: hear it, say it in the pause, then hear the answer. Tap Missed it if you didn't get it; it comes back at the end and again tomorrow. What you know rests longer each time (1, 3, 7, 14, 30, 60 days).";case"sound":return"Ten seconds, once: make sure you can hear the Japanese voice.";case"learn":if(!s.staff&&(s.ids||[]).length&&s.ids.every(id=>byId(id)&&byId(id).word))return"New words, one at a time: the meaning, then the word, then you say it. Each comes back once from the English.";return s.staff?"New words first, then each thing staff say: its meaning, the Japanese, and the reply you can give.":"New words first, one at a time. Then each phrase: its meaning, the pieces, the whole thing, and saying it from the English.";case"warm":return s.dir==="und"?"Hear the Japanese, say what it means, hear the answer.":"Quick recall of what you already met: hear the English, say it, hear the answer.";case"meaning":return"Hear each new phrase and say its English before the answer plays.";case"sayback":return"The phrases you just learned, from the English. Hints stay on screen.";case"quiz":return"Tap the right meaning, or the right Japanese. Misses come straight back.";case"words":return"This week's words.";case"cards":return s.refresh?"A quick refresher: older phrases you know least come up first.":s.dir==="mix"?"Half the cards show English, half show Japanese. Say the other side before you reveal it.":"Say the Japanese before you reveal it.";case"listen":return s.hide?"Audio only. Say each phrase in the pause.":"Hear the English, say it in Japanese, then hear the answer.";case"tip":return"One short note on this week's language.";case"dialogue":return s.then!==undefined?(s.mode?"The app plays the other person and pauses for your line; the second run swaps roles.":"Every word in it is one you've learned. Hear it once, then it runs again with pauses for your lines."):s.mode?"The app plays the other person and pauses for your line.":"Hear the scene, repeating under your breath.";case"build":return"New sentences from this week's patterns.";case"answer":return"Hear a question, get the answer in English, then say it in Japanese before you hear it.";case"drill":return"Say it, then reveal.";case"speak":return"Hear the English, say it in Japanese in the pause, then hear it. No taps needed.";case"roleplay":return"With your partner, or solo as the traveler.";case"selfcheck":return"Honest answers: under half checked repeats this session if there is a spare day.";case"intro":return"Say it from memory, then check.";default:return""}}

