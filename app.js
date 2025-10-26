// --- Data model ---
const DEFAULT_STATS=[
 {key:'Vitality', icon:'🩸', tasks:['Sleep 7–8h','Train / Move','Hydrate + whole foods']},
 {key:'Essence',  icon:'🔥', tasks:['Intentional control','Redirect urges','Open posture']},
 {key:'Flow',     icon:'💨', tasks:['5–10m breathwork','Hourly 3 slow breaths','Calm post-training']},
 {key:'Focus',    icon:'🧠', tasks:['Write day focus','<30m scrolling','Deep work block']},
 {key:'Spirit',   icon:'❤️', tasks:['Gratitude','Honest expression','Deep listening']},
 {key:'Faith',    icon:'🕊️', tasks:['5m silence','Purpose-aligned act','Remember your why']},
 {key:'Field',    icon:'🌍', tasks:['Clean space','Sunlight / nature','Positive circle']},
];
const LEVELS=[20,40,60,80]; // thresholds -> Lv2..Lv5
const DAYS=30;
const STORE='ascendant_rpg_v4';

function initState(){
  const raw=localStorage.getItem(STORE);
  if(raw){try{return JSON.parse(raw)}catch(e){}}
  const s={
    start:new Date().toISOString().slice(0,10),
    days:Array.from({length:DAYS},()=>({})),
    xp:Object.fromEntries(DEFAULT_STATS.map(s=>[s.key,0])),
    stats:DEFAULT_STATS,
    bonusClaimed:{},
    boss:{date:'', statKey:'', text:'', done:false},
    achievements:{} // key -> date unlocked
  };
  localStorage.setItem(STORE,JSON.stringify(s));
  return s;
}
let state=initState();

// --- Helpers ---
const todayStr=()=>new Date().toISOString().slice(0,10);
const dayIndex=(dstr)=>{
  const start=new Date(state.start);
  const d=new Date(dstr);
  return Math.min(DAYS-1, Math.max(0, Math.floor((d-start)/86400000)));
};
const levelFromXP=(xp)=> xp>=LEVELS[3]?5: xp>=LEVELS[2]?4: xp>=LEVELS[1]?3: xp>=LEVELS[0]?2:1;
const pct=(xp)=> Math.min(100, (xp % 20) * 5);
function save(){ localStorage.setItem(STORE, JSON.stringify(state)); }
function rngPick(arr){ return arr[Math.floor(Math.random()*arr.length)] }
function setAvatar(avgLevel){
  const art = document.getElementById('avatarArt');
  const forms = {1:'🧍',2:'🗡️',3:'🛡️',4:'🧘',5:'✨'};
  art.textContent = forms[Math.min(5,Math.max(1,avgLevel))];
}

// --- Streaks ---
function computeStreaks(){
  let g=0;
  for(let d=dayIndex(todayStr()); d>=0; d--){
    const done=Object.values(state.days[d]||{}).some(Boolean) || (state.bonusClaimed[d] || false) || (state.boss.date && state.boss.date===dateFromIndex(d) && state.boss.done);
    if(done) g++; else break;
  }
  const per={};
  state.stats.forEach(s=>{
    let c=0;
    for(let d=dayIndex(todayStr()); d>=0; d--){
      const day=state.days[d]||{};
      const has = Object.keys(day).some(id=> id.startsWith(s.key+'_') && day[id]);
      if(has) c++; else break;
    }
    per[s.key]=c;
  });
  return {global:g, per};
}
function dateFromIndex(idx){ const d=new Date(state.start); d.setDate(d.getDate()+idx); return d.toISOString().slice(0,10); }

// --- Combo Bonus ---
function checkComboBonus(){
  const di=dayIndex(todayStr());
  if(state.bonusClaimed[di]) return false;
  const allActive = state.stats.every(s=>{
    const day=state.days[di]||{};
    return Object.keys(day).some(id=> id.startsWith(s.key+'_') && day[id]);
  });
  if(allActive){
    state.stats.forEach(s=> state.xp[s.key]=(state.xp[s.key]||0)+1);
    state.bonusClaimed[di]=true;
    unlock('combo_first','First Combo');
    save();
    return true;
  }
  return false;
}

// --- Boss ---
const BOSS_POOL={
  Vitality:[ 'Do 10 rounds of shadowboxing + 100 pushups total','Walk 8,000+ steps after work','Mobility 20 minutes + cold shower 2 minutes'],
  Essence:[ 'Zero sexual content all day + 10 min transmutation breath','Flirt practice: 3 genuine compliments during the day','Posture walk: 20-min tall, slow, open-chest walk'],
  Flow:[ 'Breathwork: 5 rounds box breathing + 3 min slow exhales','Nasal-breath only during training','10-minute breathwalk outside'],
  Focus:[ 'Two 25-min deep work blocks (no phone)','Zero scrolling until 18:00','Read 20 pages of a serious book'],
  Spirit:[ 'Write 5 lines of gratitude to someone and send it','Call or meet one friend with full presence','10 minutes of honest journaling'],
  Faith:[ '15 minutes silent sit with eyes open','Do one purpose-aligned task you’ve avoided','Sunset walk reflecting on your mission'],
  Field:[ 'Deep clean your room for 15 minutes','One hour in nature (park/forest/river)','Declutter 10 items from your space']
};
function ensureBoss(){
  const today=todayStr();
  if(state.boss.date===today) return;
  const stat=rngPick(state.stats);
  const task=rngPick(BOSS_POOL[stat.key]||['Elite self-chosen challenge for this stat.']);
  state.boss={date:today, statKey:stat.key, text:`${stat.icon} ${stat.key}: ${task}`, done:false};
  save();
}
function completeBoss(){
  ensureBoss();
  if(state.boss.done) return;
  const key=state.boss.statKey;
  state.xp[key]=(state.xp[key]||0)+3;
  state.boss.done=true;
  unlock('boss_slayer','Boss Slayer');
  save(); render();
}

// --- Achievements ---
function unlock(key, title){
  if(state.achievements[key]) return;
  state.achievements[key]={title, date: todayStr()};
  save();
}
function evaluateAchievements(){
  const streaks=computeStreaks();
  if(streaks.global>=7) unlock('streak7','7-Day Flame');
  if(streaks.global>=30) unlock('streak30','30-Day Unbroken');
  const totalXP = Object.values(state.xp).reduce((a,b)=>a+b,0);
  if(totalXP>=100) unlock('xp100','100 XP Milestone');
  if(totalXP>=300) unlock('xp300','300 XP Milestone');
  // any stat Lv5
  if(state.stats.some(s=> levelFromXP(state.xp[s.key]||0)>=5 )) unlock('lv5_any','Ascendant Stat');
  // combos
  const comboDays = Object.values(state.bonusClaimed).filter(Boolean).length;
  if(comboDays>=3) unlock('combo3','Combo Trifecta');
}

function renderAchievements(){
  evaluateAchievements();
  const wrap=document.getElementById('achievements');
  const keys=Object.keys(state.achievements);
  if(keys.length===0){ wrap.innerHTML='<span class="muted">No achievements yet — keep stacking.</span>'; return; }
  wrap.innerHTML = keys.map(k=>{
    const a=state.achievements[k];
    return `<div class="ach"><strong>🏆 ${a.title}</strong><div class="muted small">${a.date}</div></div>`;
  }).join('');
}

// --- Render ---
function render(){
  ensureBoss();
  document.getElementById('dayStamp').textContent = `Day ${dayIndex(todayStr())+1} / 30 — ${todayStr()}`;

  // Character level
  const levels = state.stats.map(s=>levelFromXP(state.xp[s.key]||0));
  const avgLevel = Math.floor(levels.reduce((a,b)=>a+b,0)/levels.length);
  const totalXP = Object.values(state.xp).reduce((a,b)=>a+b,0);
  const globalPct = Math.min(100, (totalXP % (state.stats.length*20)) / (state.stats.length*20) * 100);
  document.getElementById('charLevel').textContent = `Level ${avgLevel} • ${totalXP} XP`;
  document.getElementById('globalXP').style.width = `${globalPct}%`;
  setAvatar(avgLevel);

  // Traits unlocks
  const highest = Math.max(...levels);
  const traits = [];
  if(highest>=2) traits.push('Energy Overflow');
  if(highest>=3) traits.push('Magnetic Aura');
  if(highest>=4) traits.push('Mind–Body Link');
  if(highest>=5) traits.push('Full Energy Mode');
  document.getElementById('traits').innerHTML = traits.map(t=>`<span class="badge">${t}</span>`).join('') || '<span class="muted">No traits yet — keep going.</span>';

  // Streaks
  const streaks=computeStreaks();
  document.getElementById('streakLine').textContent = `Global Streak: ${streaks.global} 🔥`;

  // Boss UI
  const bossText=document.getElementById('bossText');
  const bossStatus=document.getElementById('bossStatus');
  bossText.textContent = state.boss.text || 'No boss today yet.';
  if(state.boss.done){ bossStatus.style.display='inline-block'; bossStatus.textContent='Completed'; }
  else { bossStatus.style.display='none'; }

  // Stats cards
  const statsEl=document.getElementById('stats');
  statsEl.innerHTML='';
  const di=dayIndex(todayStr());
  state.stats.forEach(s=>{
    const xp=state.xp[s.key]||0;
    const lv=levelFromXP(xp);
    const bandPct=pct(xp);
    const streak = streaks.per[s.key]||0;
    const card=document.createElement('div');
    card.className='stat card';
    card.innerHTML=`<div class="title">
      <div><strong>${s.icon} ${s.key}</strong> <span class="badge">Lv ${lv} • ${xp} XP</span></div>
      <div class="badge">Streak: ${streak} 🔥</div>
    </div>
    <div class="progress"><div class="fill" style="width:${bandPct}%"></div></div>`;
    const tasks=document.createElement('div');
    tasks.className='tasks';
    s.tasks.forEach((t,i)=>{
      const id=`${s.key}_${i}`;
      const checked=!!(state.days[di][id]);
      const row=document.createElement('label');
      row.className='task';
      row.innerHTML=`<input type="checkbox" ${checked?'checked':''}><span>${t}</span>`;
      row.querySelector('input').addEventListener('change',e=>{
        const was=!!state.days[di][id];
        state.days[di][id]=e.target.checked;
        if(e.target.checked && !was) state.xp[s.key]=(state.xp[s.key]||0)+1;
        if(!e.target.checked && was) state.xp[s.key]=Math.max(0,(state.xp[s.key]||0)-1);
        save(); render();
      });
      tasks.appendChild(row);
    });
    card.appendChild(tasks);
    statsEl.appendChild(card);
  });

  // 30-day grid
  const grid=document.getElementById('grid');
  grid.innerHTML='';
  for(let d=0; d<DAYS; d++){
    const cell=document.createElement('div'); cell.className='cell';
    const done = Object.values(state.days[d]||{}).some(Boolean) || (state.bonusClaimed[d] || false);
    if(done) cell.classList.add('done');
    cell.textContent=d+1;
    grid.appendChild(cell);
  }

  // Combo
  const combo = checkComboBonus();
  const badge=document.getElementById('comboBadge');
  const allActive = state.stats.every(s=>{
    const day=state.days[di]||{};
    return Object.keys(day).some(id=> id.startsWith(s.key+'_') && day[id]);
  });
  badge.style.display = allActive ? 'inline-block' : 'none';
  if(combo){ badge.textContent = 'Combo applied! +1 XP to each stat'; }

  // Weekly chart + Customize + Achievements
  drawXPChart();
  renderCustomize();
  renderAchievements();
}

// Weekly XP Chart
function last7Dates(){
  const today=new Date(todayStr());
  return Array.from({length:7},(_,i)=>{
    const d=new Date(today); d.setDate(d.getDate()- (6-i));
    return d.toISOString().slice(0,10);
  });
}
function xpGainedOn(dateStr, key){
  const di = dayIndex(dateStr);
  const day = state.days[di]||{};
  let gain=0;
  Object.keys(day).forEach(id=>{
    if(id.startsWith(key+'_') && day[id]) gain+=1;
  });
  if(state.bonusClaimed[di]) gain+=1;
  if(state.boss.date===dateStr && state.boss.done && state.boss.statKey===key) gain+=3;
  return gain;
}
function drawXPChart(){
  const c = document.getElementById('xpChart');
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  const dates = last7Dates();
  const margin=40, w=c.width, h=c.height;
  ctx.strokeStyle='#2b2b35'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(margin,10); ctx.lineTo(margin,h-30); ctx.lineTo(w-10,h-30); ctx.stroke();
  ctx.fillStyle='#9aa0a6'; ctx.font='12px system-ui';
  for(let y=0;y<=6;y++){
    const yy = (h-30) - ((h-40)/6)*y;
    ctx.fillText(String(y), 10, yy+4);
    ctx.strokeStyle='#1b1b23'; ctx.beginPath(); ctx.moveTo(margin, yy); ctx.lineTo(w-10, yy); ctx.stroke();
  }
  dates.forEach((d,i)=>{
    const x= margin + (i*(w-margin-20))/6;
    ctx.fillText(d.slice(5), x-12, h-12);
  });
  const colors=['#5aa7ff','#3ddc84','#f2a365','#e85d75','#b695ff','#9ad0c2','#f7d154'];
  dates.forEach((d,idx)=>{
    let baseline = h-30;
    state.stats.forEach((s,si)=>{
      const gain = xpGainedOn(d, s.key);
      const barH = ((h-40)/6)* (gain/1);
      if(gain>0){
        const barW = (w-margin-40)/7 * 0.8;
        const x = margin + idx*((w-margin-20)/7) + 6;
        ctx.fillStyle = colors[si % colors.length];
        ctx.fillRect(x, baseline - barH, barW, barH);
        baseline -= barH;
      }
    });
  });
}

// Customize Tasks
function renderCustomize(){
  const wrap=document.getElementById('customize');
  wrap.innerHTML='';
  state.stats.forEach((s,si)=>{
    const card=document.createElement('div');
    card.className='custom-card';
    const title=document.createElement('h4');
    title.textContent = `${s.icon} ${s.key}`;
    card.appendChild(title);
    s.tasks.forEach((t,ti)=>{
      const row=document.createElement('div'); row.className='custom-row';
      const input=document.createElement('input'); input.type='text'; input.value=t;
      const del=document.createElement('button'); del.textContent='Delete';
      del.onclick=()=>{ s.tasks.splice(ti,1); save(); render(); };
      input.onchange=()=>{ s.tasks[ti]=input.value.trim(); save(); render(); };
      row.appendChild(input); row.appendChild(del);
      card.appendChild(row);
    });
    const addRow=document.createElement('div'); addRow.className='custom-row';
    const newInput=document.createElement('input'); newInput.type='text'; newInput.placeholder='Add a new task...';
    const addBtn=document.createElement('button'); addBtn.textContent='Add';
    addBtn.onclick=()=>{
      const val=newInput.value.trim();
      if(!val) return;
      s.tasks.push(val); newInput.value=''; save(); render();
    };
    addRow.appendChild(newInput); addRow.appendChild(addBtn);
    card.appendChild(addRow);
    wrap.appendChild(card);
  });
}

// Buttons
document.getElementById('resetToday').addEventListener('click',()=>{
  const di=dayIndex(todayStr());
  const day=state.days[di]||{};
  Object.keys(day).forEach(id=>{
    if(day[id]){
      const key=id.split('_')[0];
      state.xp[key]=Math.max(0,(state.xp[key]||0)-1);
    }
  });
  delete state.bonusClaimed[di];
  if(state.boss.date===todayStr() && state.boss.done){
    const k=state.boss.statKey;
    state.xp[k]=Math.max(0,(state.xp[k]||0)-3);
    state.boss.done=false;
  }
  state.days[di]={};
  save(); render();
});

document.getElementById('exportBtn').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ascendant_progress.json'; a.click();
});
document.getElementById('importFile').addEventListener('change',e=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{ try{ state=JSON.parse(r.result); save(); render(); }catch(err){ alert('Invalid file.'); } };
  r.readAsText(f);
});

document.getElementById('exportCsvBtn').addEventListener('click',()=>{
  let rows=['date,stat,taskIndex,checked,comboBonus,bossDone'];
  for(let d=0; d<DAYS; d++){
    const date=new Date(state.start); date.setDate(date.getDate()+d);
    const dateStr=date.toISOString().slice(0,10);
    const day=state.days[d]||{};
    state.stats.forEach(s=>{
      s.tasks.forEach((_,i)=>{
        const key=`${s.key}_${i}`;
        const val=day[key]?1:0;
        const bossDone = (state.boss.date===dateStr && state.boss.statKey===s.key && state.boss.done)?1:0;
        rows.push(`${dateStr},"${s.key}",${i},${val},${state.bonusClaimed[d]?1:0},${bossDone}`);
      });
    });
  }
  const blob=new Blob([rows.join('\\n')],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ascendant_progress.csv'; a.click();
});

// Boss actions
document.getElementById('rerollBoss').addEventListener('click',()=>{ ensureBoss(); state.boss.date=''; save(); render(); });
document.getElementById('completeBoss').addEventListener('click',()=> completeBoss());

// PWA Install
let deferredPrompt;
window.addEventListener('beforeinstallprompt',(e)=>{
  e.preventDefault(); deferredPrompt=e;
  const btn=document.getElementById('installBtn'); btn.hidden=false;
  btn.onclick=async ()=>{ btn.hidden=true; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; };
});

// Chart helpers
function last7DatesArr(){return last7Dates()}
function drawXPChart(){
  const c = document.getElementById('xpChart');
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  const dates = last7Dates();
  const margin=40, w=c.width, h=c.height;
  ctx.strokeStyle='#2b2b35'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(margin,10); ctx.lineTo(margin,h-30); ctx.lineTo(w-10,h-30); ctx.stroke();
  ctx.fillStyle='#9aa0a6'; ctx.font='12px system-ui';
  for(let y=0;y<=6;y++){
    const yy = (h-30) - ((h-40)/6)*y;
    ctx.fillText(String(y), 10, yy+4);
    ctx.strokeStyle='#1b1b23'; ctx.beginPath(); ctx.moveTo(margin, yy); ctx.lineTo(w-10, yy); ctx.stroke();
  }
  dates.forEach((d,i)=>{
    const x= margin + (i*(w-margin-20))/6;
    ctx.fillText(d.slice(5), x-12, h-12);
  });
  const colors=['#5aa7ff','#3ddc84','#f2a365','#e85d75','#b695ff','#9ad0c2','#f7d154'];
  dates.forEach((d,idx)=>{
    let baseline = h-30;
    state.stats.forEach((s,si)=>{
      const gain = (function(dateStr,key){
        const di = dayIndex(dateStr);
        const day = state.days[di]||{};
        let g=0;
        Object.keys(day).forEach(id=>{ if(id.startsWith(key+'_') && day[id]) g+=1; });
        if(state.bonusClaimed[di]) g+=1;
        if(state.boss.date===dateStr && state.boss.done && state.boss.statKey===key) g+=3;
        return g;
      })(d, s.key);
      const barH = ((h-40)/6)* (gain/1);
      if(gain>0){
        const barW = (w-margin-40)/7 * 0.8;
        const x = margin + idx*((w-margin-20)/7) + 6;
        ctx.fillStyle = colors[si % colors.length];
        ctx.fillRect(x, baseline - barH, barW, barH);
        baseline -= barH;
      }
    });
  });
}

// Initial render
render();
