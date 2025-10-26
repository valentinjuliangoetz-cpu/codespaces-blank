// v6.2 — In-app reports & backups; no file downloads or new tabs
const STATS=[
 {key:'Vitality', icon:'🩸', color:'#e74c3c', tasks:['Sleep 7–8h','Train / Move','Hydrate + whole foods']},
 {key:'Essence',  icon:'🔥', color:'#ff6bd6', tasks:['Intentional control','Redirect urges','Open posture']},
 {key:'Flow',     icon:'💨', color:'#3ddc84', tasks:['5–10m breathwork','Hourly 3 slow breaths','Calm post-training']},
 {key:'Focus',    icon:'🧠', color:'#5aa7ff', tasks:['Write day focus','<30m scrolling','Deep work block']},
 {key:'Spirit',   icon:'❤️', color:'#f2a365', tasks:['Gratitude','Honest expression','Deep listening']},
 {key:'Faith',    icon:'🕊️', color:'#b695ff', tasks:['5m silence','Purpose-aligned act','Remember your why']},
 {key:'Field',    icon:'🌍', color:'#f7d154', tasks:['Clean space','Sunlight / nature','Positive circle']},
];
const LEVELS=[20,40,60,80], DAYS=30, STORE='ascendant_rpg_v6_2', BSTORE='ascendant_backups_v6_2';

function initState(){
  const raw=localStorage.getItem(STORE); if(raw){try{return JSON.parse(raw)}catch(e){}}
  const s={start:new Date().toISOString().slice(0,10),days:Array.from({length:DAYS},()=>({})),xp:Object.fromEntries(STATS.map(s=>[s.key,0])),sleep:{}};
  localStorage.setItem(STORE, JSON.stringify(s)); return s;
}
let state=initState();
const todayStr=()=> new Date().toISOString().slice(0,10);
const dayIndex=(dstr)=>{ const s=new Date(state.start), d=new Date(dstr); return Math.min(DAYS-1, Math.max(0, Math.floor((d-s)/86400000))); };
const levelFromXP=(xp)=> xp>=LEVELS[3]?5: xp>=LEVELS[2]?4: xp>=LEVELS[1]?3: xp>=LEVELS[0]?2:1;
const pct=(xp)=> Math.min(100, (xp % 20) * 5);
const save=()=> localStorage.setItem(STORE, JSON.stringify(state));

// Clock
function renderClock(){ const now=new Date(); const h=String(now.getHours()).padStart(2,'0'),m=String(now.getMinutes()).padStart(2,'0'); const greet=now.getHours()<12?'Good morning':now.getHours()<18?'Good afternoon':'Good evening'; document.getElementById('timeLine').textContent=`${greet} • ${now.toDateString()} • ${h}:${m}`;}
setInterval(renderClock, 30e3); renderClock();

// Character (simple placeholder) & aura for brevity
function characterSVG(){ return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="340" height="408"><circle cx="100" cy="60" r="22" fill="#f0d0b0"/><circle cx="90" cy="62" r="4" fill="#4aa3ff"/><circle cx="110" cy="62" r="4" fill="#4aa3ff"/><path d="M78,92 L122,92 L132,138 L120,178 L80,178 L68,138 Z" fill="#1a1d26"/></svg>`;}
function drawAura(){ const c=document.getElementById('auraCanvas'); const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); const di=dayIndex(todayStr()); STATS.forEach((s,i)=>{ const day=state.days[di]||{}; const n=s.tasks.reduce((a,_,j)=>a+(day[`${s.key}_${j}`]?1:0),0); if(n>0){ const grd=ctx.createRadialGradient(180,170,10,180,170,120+i*6); grd.addColorStop(0, hexToRgba(s.color, 0.20*Math.min(1,n/3))); grd.addColorStop(1, hexToRgba(s.color, 0)); ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(180,170,140+i*6,0,Math.PI*2); ctx.fill(); } })}
function hexToRgba(hex,a){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); if(!m) return `rgba(255,255,255,${a})`; return `rgba(${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)},${a})`; }

function render(){
  const levels = STATS.map(s=>levelFromXP(state.xp[s.key]||0));
  const avgLevel = Math.floor(levels.reduce((a,b)=>a+b,0)/levels.length)||1;
  const totalXP = Object.values(state.xp).reduce((a,b)=>a+b,0);
  document.getElementById('charLevel').textContent = `Level ${avgLevel} • ${totalXP} XP`;
  const globalPct = Math.min(100, (totalXP % (STATS.length*20)) / (STATS.length*20) * 100);
  document.getElementById('globalXP').style.width = `${globalPct}%`;
  document.getElementById('characterSvg').innerHTML = characterSVG();
  drawAura();

  // Stats
  const stats=document.getElementById('stats'); stats.innerHTML=''; const di=dayIndex(todayStr());
  STATS.forEach(s=>{
    const xp=state.xp[s.key]||0, lv=levelFromXP(xp);
    const card=document.createElement('div'); card.className='stat card';
    card.innerHTML=`<div class="title"><div><strong>${s.icon} ${s.key}</strong> <span class="badge">Lv ${lv} • ${xp} XP</span></div></div>
      <div class="progress"><div class="fill" style="width:${pct(xp)}%"></div></div>`;
    const tasks=document.createElement('div'); tasks.className='tasks';
    s.tasks.forEach((t,i)=>{
      const id=`${s.key}_${i}`, checked=!!(state.days[di][id]);
      const row=document.createElement('label'); row.className='task';
      row.innerHTML=`<input type="checkbox" ${checked?'checked':''}><span>${t}</span>`;
      row.querySelector('input').addEventListener('change',e=>{
        const was=!!state.days[di][id]; state.days[di][id]=e.target.checked;
        if(e.target.checked && !was) state.xp[s.key]=(state.xp[s.key]||0)+1;
        if(!e.target.checked && was) state.xp[s.key]=Math.max(0,(state.xp[s.key]||0)-1);
        save(); render();
      });
      tasks.appendChild(row);
    });
    card.appendChild(tasks); stats.appendChild(card);
  });

  // Grid
  const grid=document.getElementById('grid'); grid.innerHTML='';
  for(let d=0; d<DAYS; d++){ const day=state.days[d]||{}; const cell=document.createElement('div'); cell.className='cell'; if(Object.values(day).some(Boolean)) cell.classList.add('done'); cell.textContent=d+1; grid.appendChild(cell); }

  drawXPChart();
  refreshJSON(); refreshCSV(); refreshPreview();
  renderBackups();
}
function drawXPChart(){ const c=document.getElementById('xpChart'), ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); const w=c.width,h=c.height,m=40;
  ctx.strokeStyle='#2b2b35'; ctx.beginPath(); ctx.moveTo(m,10); ctx.lineTo(m,h-30); ctx.lineTo(w-10,h-30); ctx.stroke();
  ctx.fillStyle='#9aa0a6'; ctx.font='12px system-ui'; for(let y=0;y<=6;y++){ const yy=(h-30)-((h-40)/6)*y; ctx.fillText(String(y),10,yy+4); ctx.strokeStyle='#1b1b23'; ctx.beginPath(); ctx.moveTo(m,yy); ctx.lineTo(w-10,yy); ctx.stroke(); }
  const di=dayIndex(todayStr()); let baseline=h-30; STATS.forEach((s,si)=>{ const day=state.days[di]||{}; const gain=s.tasks.reduce((acc,_,i)=> acc + (day[`${s.key}_${i}`]?1:0), 0); const barH=((h-40)/6)*gain; if(gain>0){ ctx.fillStyle=s.color; const x=m + (6*(w-m-20))/6 + 6; ctx.fillRect(x, baseline-barH, (w-m-40)/7*0.8, barH); baseline-=barH; } });
}

// --- Reports (JSON/CSV in app) ---
function toCSV(){
  let rows=['date,stat,taskIndex,checked'];
  for(let d=0; d<DAYS; d++){
    const date=new Date(state.start); date.setDate(date.getDate()+d); const dateStr=date.toISOString().slice(0,10);
    const day=state.days[d]||{};
    STATS.forEach(s=> s.tasks.forEach((_,i)=> rows.push(`${dateStr},"${s.key}",${i},${day[`${s.key}_${i}`]?1:0}`)));
  }
  return rows.join('\\n');
}
function refreshJSON(){ document.getElementById('jsonBox').value = JSON.stringify(state,null,2); }
function refreshCSV(){ document.getElementById('csvBox').value = toCSV(); }
function refreshPreview(){
  const container=document.getElementById('csvPreview'); container.innerHTML='';
  const csv=toCSV().split('\\n').slice(0, 51); // header + first 50 rows
  const table=document.createElement('table');
  const thead=document.createElement('thead'), tbody=document.createElement('tbody');
  const header=csv[0].split(',');
  const trh=document.createElement('tr'); header.forEach(h=>{ const th=document.createElement('th'); th.textContent=h; trh.appendChild(th); }); thead.appendChild(trh);
  csv.slice(1).forEach(line=>{
    const tr=document.createElement('tr');
    line.split(',').forEach(cell=>{ const td=document.createElement('td'); td.textContent=cell.replace(/^"|"$/g,''); tr.appendChild(td); });
    tbody.appendChild(tr);
  });
  table.appendChild(thead); table.appendChild(tbody); container.appendChild(table);
}

// Tabs
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
  });
});

// Buttons to show panels
document.getElementById('showJson').addEventListener('click',()=>{
  document.querySelector('[data-tab="json"]').click();
  refreshJSON();
});
document.getElementById('showCsv').addEventListener('click',()=>{
  document.querySelector('[data-tab="csv"]').click();
  refreshCSV();
});

// Copy & Share (no files)
async function copyText(elId){ try{ await navigator.clipboard.writeText(document.getElementById(elId).value); }catch(e){ alert('Copy failed. You can select the text and copy manually.'); } }
async function shareText(title, text){ if(navigator.share){ try{ await navigator.share({title, text}); }catch(e){} } else { await copyText(title==='JSON'? 'jsonBox':'csvBox'); alert('Sharing not supported — copied to clipboard instead.'); } }
document.getElementById('copyJson').onclick=()=>copyText('jsonBox');
document.getElementById('copyCsv').onclick=()=>copyText('csvBox');
document.getElementById('shareJson').onclick=()=>shareText('JSON', document.getElementById('jsonBox').value);
document.getElementById('shareCsv').onclick=()=>shareText('CSV', document.getElementById('csvBox').value);
document.getElementById('refreshJson').onclick=refreshJSON;
document.getElementById('refreshCsv').onclick=refreshCSV;
document.getElementById('refreshPreview').onclick=refreshPreview;

// Import (optional)
document.getElementById('importFile').addEventListener('change',e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ state=JSON.parse(r.result); save(); render(); }catch(err){ alert('Invalid file.'); } }; r.readAsText(f); });

// Backups (in-app, localStorage)
function readBackups(){ try{ return JSON.parse(localStorage.getItem(BSTORE)||'[]'); }catch(e){ return []; } }
function writeBackups(arr){ localStorage.setItem(BSTORE, JSON.stringify(arr)); }
function renderBackups(){
  const list=document.getElementById('backupList'); list.innerHTML='';
  const backups=readBackups();
  if(backups.length===0){ list.innerHTML='<div class="muted small">No backups yet.</div>'; return; }
  backups.forEach((b,idx)=>{
    const item=document.createElement('div'); item.className='backupItem';
    const left=document.createElement('div'); left.innerHTML=`<strong>${b.name}</strong><div class="muted small">${b.date}</div>`;
    const right=document.createElement('div');
    const restore=document.createElement('button'); restore.textContent='Restore'; restore.onclick=()=>{ state=b.data; save(); render(); };
    const del=document.createElement('button'); del.textContent='Delete'; del.onclick=()=>{ const arr=readBackups(); arr.splice(idx,1); writeBackups(arr); renderBackups(); };
    right.appendChild(restore); right.appendChild(del);
    item.appendChild(left); item.appendChild(right); list.appendChild(item);
  });
}
document.getElementById('saveBackup').addEventListener('click',()=>{
  const name=(document.getElementById('backupName').value||'Backup').trim();
  const backups=readBackups();
  backups.unshift({name, date:new Date().toLocaleString(), data:state});
  writeBackups(backups.slice(0,50)); // keep up to 50
  document.getElementById('backupName').value='';
  renderBackups();
  document.querySelector('[data-tab="backups"]').click();
});

// Reset today
document.getElementById('resetToday').addEventListener('click',()=>{
  const di=dayIndex(todayStr()); const day=state.days[di]||{};
  Object.keys(day).forEach(id=>{ if(day[id]){ const k=id.split('_')[0]; state.xp[k]=Math.max(0,(state.xp[k]||0)-1);} });
  state.days[di]={}; save(); render();
});

// PWA install & SW
let deferredPrompt; window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; const b=document.getElementById('installBtn'); b.hidden=false; b.onclick=async()=>{ b.hidden=true; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; }; });
if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js'); }

render();
