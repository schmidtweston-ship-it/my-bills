'use strict';
const KEY='mybills',VER=1,V=document.getElementById('view'),O=document.getElementById('over');
const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
let S,memOnly=false;
function blank(){return{v:VER,bills:[],seen:''};}
function clean(s,n){return String(s==null?'':s).replace(/[\u0000-\u001f\u007f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,n||80);}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function pd(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');if(!m)return null;const d=new Date(+m[1],m[2]-1,+m[3]);return d.getMonth()==m[2]-1?d:null;}
function today(){const d=new Date();d.setHours(0,0,0,0);return d;}
function dim(y,m){return new Date(y,m+1,0).getDate();}
function fixBill(b){ // validate + normalize one bill; returns null if unusable
  if(!b||typeof b!=='object')return null;const o={};
  o.id=clean(b.id,40)||String(Date.now()+Math.random());o.name=clean(b.name,40);if(!o.name)return null;
  o.kind=['month','every','once'].includes(b.kind)?b.kind:'month';
  o.day=Math.min(31,Math.max(1,parseInt(b.day)||1));o.months=Math.min(24,Math.max(1,parseInt(b.months)||1));
  o.start=pd(b.start)?b.start:iso(today());o.date=pd(b.date)?b.date:'';if(o.kind==='once'&&!o.date)return null;
  o.amount=clean(b.amount,20);o.how=clean(b.how,120);o.phone=clean(b.phone,25).replace(/[^\d+()\- ]/g,'');
  o.ahead=Math.min(30,Math.max(0,parseInt(b.ahead)));if(isNaN(o.ahead))o.ahead=3;
  o.paid=Array.isArray(b.paid)?b.paid.filter(x=>x&&pd(x.due)&&pd(x.on)).slice(-60).map(x=>({due:x.due,on:x.on})):[];
  return o;}
function fixAll(x){if(!x||typeof x!=='object'||!Array.isArray(x.bills))return null;const o=blank();o.bills=x.bills.map(fixBill).filter(Boolean).slice(0,200);o.seen=typeof x.seen==='string'?x.seen.slice(0,10):'';return o;}
function load(){try{const r=localStorage.getItem(KEY);S=r?(fixAll(JSON.parse(r))||blank()):blank();}catch(e){S=blank();memOnly=true;}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));memOnly=false;}catch(e){memOnly=true;}}
// due dates. Short-month fix: day 31 becomes the last day of short months.
function occ(b,k){ // k-th occurrence from start
  if(b.kind==='once')return k===0?pd(b.date):null;
  const s=pd(b.start),step=b.kind==='month'?1:b.months,m=s.getMonth()+k*step,y=s.getFullYear()+Math.floor(m/12),mm=((m%12)+12)%12;
  return new Date(y,mm,Math.min(b.day,dim(y,mm)));}
function firstK(b){if(b.kind==='once')return 0;const s=pd(b.start);let k=0;while(occ(b,k)<s)k++;return k;}
function isPaid(b,d){const i=iso(d);return b.paid.some(p=>p.due===i);}
function nextOpen(b){let k=firstK(b);for(let n=0;n<400;n++,k++){const d=occ(b,k);if(!d)return null;if(!isPaid(b,d))return d;}return null;}
function days(d){return Math.round((d-today())/864e5);}
function when(n){return n===0?'today':n===1?'tomorrow':n>1?'in '+n+' days':n===-1?'was due yesterday':'was due '+(-n)+' days ago';}
function nice(d){return MON[d.getMonth()]+' '+d.getDate();}
function paidThisMonth(b){const t=today();return b.paid.some(p=>{const d=pd(p.on);return d.getMonth()===t.getMonth()&&d.getFullYear()===t.getFullYear();});}
function status(b){const d=nextOpen(b);if(!d)return{d:null,n:9999,txt:esc(b.name)+' is all paid. Well done.',cls:'paidok'};
  const n=days(d);if(n>b.ahead&&paidThisMonth(b))return{d,n,txt:esc(b.name)+': Paid this month. Well done.',sub:'Next one is '+nice(d)+'.',cls:'paidok'};
  return{d,n,txt:n<0?esc(b.name)+' '+when(n)+'.':esc(b.name)+' is due '+when(n)+'.',sub:nice(d)+(b.amount?' · '+esc(b.amount):''),cls:n<0?'late':''};}
function sorted(){return S.bills.map(b=>({b,s:status(b)})).sort((a,c)=>a.s.n-c.s.n);}
function go(h){V.innerHTML=h;window.scrollTo(0,0);const f=V.querySelector('h1');if(f){f.tabIndex=-1;f.focus();}}
function warnMem(){return memOnly?'<div class="card warn"><p>I could not keep your list on this phone. Please tap Save a copy.</p></div>':'';}
// HOME
function home(){const L=sorted();let h='<h1>My Bills</h1>'+warnMem();
  if(!L.length)h+='<div class="card"><p>No bills yet.</p><p>Tap the button below to add your first one.</p></div>';
  L.forEach(({b,s})=>{h+='<div class="card '+(s.n<0?'warn':s.cls==='paidok'?'good':'')+'"><p class="due '+s.cls+'">'+s.txt+'</p>'+(s.sub?'<p>'+s.sub+'</p>':'')+
   (s.d&&s.cls!=='paidok'?'<button class="bills" onclick="paid(\''+esc(b.id)+'\')">Paid</button>':'')+
   '<button class="light" onclick="detail(\''+esc(b.id)+'\')">More about '+esc(b.name)+'</button></div>';});
  h+='<button class="pills big" onclick="edit()">Add a bill</button><button class="light" onclick="more()">Save a copy, bring one back, and more</button>'+
   '<p class="note">This helps you remember. It does not pay for you.</p>';go(h);}
function find(id){return S.bills.find(b=>b.id===id);}
function paid(id){const b=find(id);if(!b)return;const d=nextOpen(b);if(!d)return;b.paid.push({due:iso(d),on:iso(today())});save();
  go('<h1>Well done.</h1><div class="card good"><p class="due paidok">'+esc(b.name)+' is marked paid.</p><p>Paid this month. Well done.</p></div><button class="bills big" onclick="home()">Back to my bills</button><button class="light" onclick="undo(\''+esc(b.id)+'\')">Oops, I did not pay it yet</button>');bell(1);}
function undo(id){const b=find(id);if(b&&b.paid.length){b.paid.pop();save();}home();}
// DETAIL
function detail(id){const b=find(id);if(!b)return home();const s=status(b);
  const rep=b.kind==='once'?'One time, on '+nice(pd(b.date))+'.':b.kind==='month'?'Every month, on day '+b.day+'.':'Every '+b.months+' months, on day '+b.day+'.';
  const yr=new Date(today());yr.setFullYear(yr.getFullYear()-1);const hist=b.paid.filter(p=>pd(p.on)>=yr).slice().reverse();
  let h='<h1>'+esc(b.name)+'</h1><div class="card"><p class="due '+s.cls+'">'+s.txt+'</p>'+(s.sub?'<p>'+s.sub+'</p>':'')+'<p>'+rep+'</p>'+
   (b.amount?'<p>About '+esc(b.amount)+'.</p>':'')+'<p>I will tell you '+(b.ahead?b.ahead+' day'+(b.ahead>1?'s':'')+' before.':'on the day.')+'</p>'+
   (b.how?'<p>How I pay it: '+esc(b.how)+'</p>':'')+'</div>';
  if(b.phone)h+='<a class="btn talk" href="tel:'+esc(b.phone.replace(/[^\d+]/g,''))+'">Call about '+esc(b.name)+'</a>';
  h+='<button class="sage" onclick="ics(\''+esc(b.id)+'\')">Put it on my calendar</button><p class="note">Then your phone will remind you, even when this is closed.</p>';
  h+='<h2>Paid this past year</h2><div class="card">'+(hist.length?hist.map(p=>'<p>Due '+nice(pd(p.due))+' — paid '+nice(pd(p.on))+'</p>').join(''):'<p>Nothing marked paid yet.</p>')+'</div>';
  h+='<button onclick="edit(\''+esc(b.id)+'\')">Change this bill</button><button class="helpnow" onclick="del(\''+esc(b.id)+'\')">Take this bill off my list</button><button class="light" onclick="home()">Back to my bills</button>';go(h);}
function del(id){const b=find(id);if(!b)return;go('<h1>Take off '+esc(b.name)+'?</h1><p>It will be gone from your list.</p><button class="helpnow" onclick="delYes(\''+esc(id)+'\')">Yes, take it off</button><button class="light" onclick="detail(\''+esc(id)+'\')">No, keep it</button>');}
function delYes(id){S.bills=S.bills.filter(b=>b.id!==id);save();home();}
// EDIT
function edit(id){const b=find(id)||{name:'',kind:'month',day:1,months:3,date:'',amount:'',how:'',phone:'',ahead:3};
  const opt=(v,t)=>'<label class="check"><input type="radio" name="kind" value="'+v+'"'+(b.kind===v?' checked':'')+' onchange="kindShow()"> '+t+'</label>';
  go('<h1>'+(id?'Change '+esc(b.name):'Add a bill')+'</h1><form onsubmit="return keep(event,\''+esc(id||'')+'\')">'+
  '<label>What is it called?<input id="f-name" maxlength="40" value="'+esc(b.name)+'" placeholder="Electric" required></label>'+
  '<p>How often?</p>'+opt('month','Every month')+opt('every','Every few months')+opt('once','Just one time')+
  '<div id="k-day"><label>What day of the month is it due?<input id="f-day" type="number" min="1" max="31" inputmode="numeric" value="'+b.day+'"></label><p class="note">If the month is short, I use its last day.</p></div>'+
  '<div id="k-every"><label>Every how many months?<select id="f-months">'+[[2,'Every 2 months'],[3,'Every 3 months'],[4,'Every 4 months'],[6,'Twice a year'],[12,'Once a year']].map(([v,t])=>'<option value="'+v+'"'+(b.months==v?' selected':'')+'>'+t+'</option>').join('')+'</select></label>'+
  '<label>Which month is the next one due?<select id="f-mon">'+MON.map((m,i)=>'<option value="'+i+'"'+((b.start?pd(b.start).getMonth():today().getMonth())===i?' selected':'')+'>'+m+'</option>').join('')+'</select></label></div>'+
  '<div id="k-once"><label>What day is it due?<input id="f-date" type="date" value="'+esc(b.date)+'"></label></div>'+
  '<label>How much, about? (you can leave this empty)<input id="f-amount" maxlength="20" value="'+esc(b.amount)+'" placeholder="$80"></label>'+
  '<label>How many days before should I tell you?<input id="f-ahead" type="number" min="0" max="30" inputmode="numeric" value="'+b.ahead+'"></label>'+
  '<label>How I pay it (you can leave this empty)<input id="f-how" maxlength="120" value="'+esc(b.how)+'" placeholder="Check in the mail"></label>'+
  '<label>Phone number for this bill (you can leave this empty)<input id="f-phone" type="tel" maxlength="25" value="'+esc(b.phone)+'"></label>'+
  '<p id="f-msg" class="late"></p><button class="bills big" type="submit">Keep it</button><button class="light" type="button" onclick="'+(id?'detail(\''+esc(id)+'\')':'home()')+'">Never mind</button></form>');kindShow();}
function kindShow(){const k=(V.querySelector('input[name=kind]:checked')||{}).value;['day','every','once'].forEach(x=>{const e=document.getElementById('k-'+x);if(e)e.style.display=(x==='day'?k!=='once':x==='every'?k==='every':k==='once')?'':'none';});}
function keep(ev,id){ev.preventDefault();const g=x=>document.getElementById('f-'+x).value,msg=document.getElementById('f-msg');
  const kind=(V.querySelector('input[name=kind]:checked')||{}).value||'month',day=parseInt(g('day'));
  if(!clean(g('name'),40)){msg.textContent='Please write a name.';return false;}
  if(kind!=='once'&&!(day>=1&&day<=31)){msg.textContent='Please pick a day from 1 to 31.';return false;}
  if(kind==='once'&&!pd(g('date'))){msg.textContent='Please pick the day it is due.';return false;}
  const old=find(id),t=today();let start;
  if(kind==='every'){const m=+g('mon');let y=t.getFullYear();if(new Date(y,m,Math.min(day,dim(y,m)))<t)y++;start=iso(new Date(y,m,1));}
  else start=old&&old.kind===kind?old.start:iso(new Date(t.getFullYear(),t.getMonth(),1));
  const b=fixBill({id:id||String(Date.now()),name:g('name'),kind,day,months:g('months'),start,date:g('date'),amount:g('amount'),how:g('how'),phone:g('phone'),ahead:g('ahead'),paid:old?old.paid:[]});
  if(!b){msg.textContent='Something is missing. Please look again.';return false;}
  if(old)Object.assign(old,b);else S.bills.push(b);save();detail(b.id);return false;}
// CALENDAR (.ics) — works even when this page is closed
function icsTxt(b){const z=s=>s.replace(/[\\;,]/g,m=>'\\'+m),d0=nextOpen(b)||occ(b,firstK(b)),ds=x=>iso(x).replace(/-/g,''),e=new Date(d0);e.setDate(e.getDate()+1);
  let rr='';if(b.kind!=='once'){const iv=b.kind==='month'?1:b.months;rr='RRULE:FREQ=MONTHLY;INTERVAL='+iv+(b.day>28?';BYMONTHDAY='+Array.from({length:b.day-27},(_,i)=>28+i).join(',')+';BYSETPOS=-1':';BYMONTHDAY='+b.day)+'\r\n';}
  const al=(tr,txt)=>'BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:'+z(txt)+'\r\nTRIGGER:'+tr+'\r\nEND:VALARM\r\n';
  const now=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
  return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//My Bills//EN\r\nCALSCALE:GREGORIAN\r\nBEGIN:VEVENT\r\nUID:'+z(b.id)+'@mybills\r\nDTSTAMP:'+now+'\r\nDTSTART;VALUE=DATE:'+ds(d0)+'\r\nDTEND;VALUE=DATE:'+ds(e)+'\r\n'+rr+
   'SUMMARY:'+z(b.name+' is due')+'\r\nDESCRIPTION:'+z((b.amount?'About '+b.amount+'. ':'')+(b.how?'How I pay it: '+b.how+'. ':'')+(b.phone?'Phone: '+b.phone:''))+'\r\n'+
   (b.ahead?al('-P'+b.ahead+'D',b.name+' is due in '+b.ahead+' days'):'')+al('PT9H',b.name+' is due today')+'END:VEVENT\r\nEND:VCALENDAR\r\n';}
function dl(name,txt,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1500);}
function ics(id){const b=find(id);if(!b)return;dl(b.name.replace(/[^\w]+/g,'-')+'.ics',icsTxt(b),'text/calendar');
  go('<h1>Almost done</h1><div class="card"><p>Your phone will ask to add '+esc(b.name)+'.</p><p>Tap Add. Then it reminds you before each one.</p></div><button class="bills big" onclick="detail(\''+esc(id)+'\')">All right</button>');}
// MORE: copies, ring
function more(){go('<h1>More</h1>'+warnMem()+'<div class="card"><h3>Keep a spare copy</h3><p>Save a copy, and keep it somewhere you trust. If you get a new phone, bring it back.</p>'+
  '<button class="bills" onclick="saveCopy()">Save a copy</button><label class="btn light" for="restore">Bring back a copy</label><input id="restore" type="file" accept=".json,application/json" style="display:none" onchange="bring(this)"><p id="m-msg"></p></div>'+
  '<div class="card"><h3>Ring my phone</h3><p>I can also ring your phone when a bill is close, while this is open.</p><button class="talk" onclick="askRing()">Yes, ring my phone</button><p id="r-msg"></p></div>'+
  '<div class="card"><h3>Put all my bills on my calendar</h3><button class="sage" onclick="icsAll()">Put them all on</button></div>'+
  '<p class="note">This helps you remember. It does not pay for you. Your list stays on this phone. Nobody else sees it.</p><button class="light" onclick="home()">Back to my bills</button>');}
function saveCopy(){dl('my-bills-copy-'+iso(today())+'.json',JSON.stringify(S,null,1),'application/json');document.getElementById('m-msg').textContent='Done. Your copy is saved.';}
function bring(inp){const f=inp.files&&inp.files[0],m=document.getElementById('m-msg');if(!f)return;if(f.size>2e6){m.textContent='That is not a copy from My Bills.';return;}
  const r=new FileReader();r.onload=()=>{let x=null,raw=null;try{raw=JSON.parse(r.result);x=fixAll(raw);}catch(e){}
   if(!x||(x.bills.length===0&&raw.bills.length>0)){m.textContent='That is not a copy from My Bills. Nothing was changed.';return;}
   go('<h1>Bring back this copy?</h1><p>It has '+x.bills.length+' bill'+(x.bills.length===1?'':'s')+'. It will take the place of your list now.</p><button class="bills big" id="yes">Yes, bring it back</button><button class="light" onclick="more()">No, leave it</button>');
   document.getElementById('yes').onclick=()=>{S=x;save();home();};};r.readAsText(f);}
function icsAll(){if(!S.bills.length)return home();const parts=S.bills.map(icsTxt).map(t=>t.split('BEGIN:VEVENT')[1].split('END:VEVENT')[0]);
  dl('my-bills.ics','BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//My Bills//EN\r\n'+parts.map(p=>'BEGIN:VEVENT'+p+'END:VEVENT\r\n').join('')+'END:VCALENDAR\r\n','text/calendar');}
function askRing(){const m=document.getElementById('r-msg');if(!('Notification' in window)){m.textContent='This phone cannot do that. Use Put it on my calendar instead.';return;}
  Notification.requestPermission().then(p=>{m.textContent=p==='granted'?'Good. I will ring when a bill is close.':'All right. I will not ring. Put it on my calendar works too.';
   if(p==='granted'&&navigator.serviceWorker)navigator.serviceWorker.ready.then(r=>r.periodicSync&&r.periodicSync.register('bills',{minInterval:864e5})).catch(()=>{});});}
// REMINDER
let AC;function bell(soft){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();[0,.5,1].slice(0,soft?1:3).forEach((t,i)=>{const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=[660,880,660][i];g.gain.setValueAtTime(.0001,AC.currentTime+t);g.gain.exponentialRampToValueAtTime(.25,AC.currentTime+t+.05);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+t+1.4);o.connect(g).connect(AC.destination);o.start(AC.currentTime+t);o.stop(AC.currentTime+t+1.5);});}catch(e){}}
function close_(){return sorted().filter(({b,s})=>s.d&&s.cls!=='paidok'&&s.n<=b.ahead);}
function check(){const L=close_(),t=iso(today());if(!L.length||S.seen===t)return;S.seen=t;save();
  O.innerHTML='<h1>A gentle reminder</h1><ul>'+L.map(({s})=>'<li>'+s.txt+'</li>').join('')+'</ul><p style="font-size:30px">This helps you remember. It does not pay for you.</p><button onclick="O.style.display=\'none\';home()">I see it</button>';O.style.display='block';bell();
  try{if('Notification' in window&&Notification.permission==='granted'&&document.hidden&&navigator.serviceWorker)navigator.serviceWorker.ready.then(r=>r.showNotification('My Bills',{body:L.map(x=>x.s.txt.replace(/&[^;]+;/g,"'")).join(' '),tag:'bills'}));}catch(e){}}
window.addEventListener('error',()=>{try{home();}catch(e){V.innerHTML='<h1>My Bills</h1><p>Something went wrong. Please close this and open it again.</p>';}});
load();home();check();setInterval(check,36e5);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
