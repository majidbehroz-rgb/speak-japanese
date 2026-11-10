/* ---------- dates ---------- */
const CFG={pub:true,start:"",trip:"",ch:{},appLink:"",publicLink:""};
// personal values live only in CFG; the public build ships an empty CFG and reads the trip date and Discord links from this phone (set by the group's setup link)
const _ls=k=>{try{return JSON.parse(localStorage.getItem("jp17:"+k))}catch(e){return null}};
const _dt=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||"");return m?new Date(+m[1],m[2]-1,+m[3]):null};
let TRIP_SET=!!(_dt(_ls("trip"))||_dt(CFG.trip));
const START=_dt(CFG.start)||_dt(_ls("start"))||(()=>{const p=_ls("plan"),first=p&&p.log&&p.log.map(l=>l.date).filter(Boolean).sort()[0];const t=new Date(),d=_dt(first)||new Date(t.getFullYear(),t.getMonth(),t.getDate());
  try{localStorage.setItem("jp17:start",JSON.stringify(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")))}catch(e){}return d})();
const tripFromStore=()=>_dt(_ls("trip"))||_dt(CFG.trip)||(()=>{const d=new Date(START);d.setDate(d.getDate()+76);return d})();
let TRIP=tripFromStore();
// re-read the flight date after it changes underneath the page (a progress code, sync, or the date form): no reload needed
function refreshDates(){TRIP_SET=!!(_dt(_ls("trip"))||_dt(CFG.trip));TRIP=tripFromStore();if(typeof _sched!=="undefined")_sched=null}
function mid(d){return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
function dayDiff(a,b){return Math.round((mid(b)-mid(a))/864e5)}
function iso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function fmt(d){return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})}

