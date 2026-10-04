const c=document.getElementById('game'),x=c.getContext('2d'),$=id=>document.getElementById(id);
let W,H,last=0,spawn=0,over=false,shake=0,p,en=[],bs=[],ebs=[],ps=[],dmgTexts=[],walls=[];
let wave=1,waveRemaining=0,waveStarted=false,waveClearTimer=0;
let gameScreen='menu',activeSlot=0,autoSaveTimer=0;
const SAVE_KEY='tankSaveSlotsV1';
const keys=new Set(),mouse={x:0,y:0,down:false},touch={active:false,x:0,y:0};
const mobileDrive={up:false,down:false,left:false,right:false};
let mobileFire=false;
const hulls=[
  {id:'scout',name:'BT-7 Scout',cost:50,hp:270,speed:155,reverse:95,turn:2.1,scale:.92,armor:{front:45,side:22,rear:15}},
  {id:'standard',name:'T-34',cost:0,hp:370,speed:120,reverse:75,turn:1.65,scale:1,armor:{front:80,side:32,rear:25}},
  {id:'heavy',name:'KV-1 Heavy',cost:80,hp:610,speed:90,reverse:60,turn:1.15,scale:1.12,armor:{front:120,side:60,rear:45}}
];
const turrets=[
  {id:'standard',name:'Standard Turret',cost:0,turn:1.25,hp:0,scale:1},
  {id:'rapid',name:'Rapid Turret',cost:0,turn:2.4,hp:50,scale:.9},
  {id:'fast',name:'Fast Turret',cost:0,turn:3.4,hp:80,scale:.82}
];
const engines=[
  {id:'standard',name:'Standard Engine',cost:0,speed:1,turn:1},
  {id:'upgraded',name:'Upgraded Engine',cost:0,speed:1.10,turn:1.10},
  {id:'better',name:'Better Engine',cost:0,speed:1.20,turn:1.20}
];
const barrels=[
  {id:'57mm',name:'57mm Barrel',cost:0,minDamage:110,maxDamage:130,penetration:55,precision:.68,reloadTime:4,dispersionTime:4,aimTime:4,scale:.82,length:.82},
  {id:'85mm',name:'85mm Barrel',cost:0,minDamage:240,maxDamage:270,penetration:90,precision:.88,reloadTime:9,dispersionTime:3,aimTime:6,scale:1,length:1},
  {id:'122mm',name:'122mm Heavy Barrel',cost:0,minDamage:390,maxDamage:440,penetration:140,precision:1,reloadTime:16,dispersionTime:2,aimTime:10,scale:1.22,length:1.12},
  {id:'122mmLong',name:'122mm Long Heavy Barrel',cost:0,minDamage:500,maxDamage:700,penetration:160,precision:1,reloadTime:20,dispersionTime:1,aimTime:12,scale:1.28,length:1.65,instant:true}
];
let ownedHulls=JSON.parse(localStorage.getItem('tankOwnedHulls')||'["standard"]');
let ownedTurrets=JSON.parse(localStorage.getItem('tankOwnedTurrets')||'["standard"]');
let ownedBarrels=JSON.parse(localStorage.getItem('tankOwnedBarrels')||'["85mm"]');
let ownedEngines=JSON.parse(localStorage.getItem('tankOwnedEngines')||'["standard"]');
let equippedHull=localStorage.getItem('tankEquippedHull')||'standard';
let equippedTurret=localStorage.getItem('tankEquippedTurret')||'standard';
let equippedBarrel=localStorage.getItem('tankEquippedBarrel')||'85mm';
let equippedEngine=localStorage.getItem('tankEquippedEngine')||'standard';

function resize(){const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;c.width=W*d;c.height=H*d;x.setTransform(d,0,0,d,0,0)}
addEventListener('resize',resize);resize();

// Procedural sound system: no external audio files required.
let audioCtx=null,audioMaster=null,engineOsc=null,engineGain=null;
let railBeams=[];
function initAudio(){
  if(!audioCtx){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    audioCtx=new AC();
    audioMaster=audioCtx.createGain();
    audioMaster.gain.value=.28;
    audioMaster.connect(audioCtx.destination);
  }
  if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
}
function tone(freq,duration,type='square',volume=.08,endFreq=freq){
  initAudio();if(!audioCtx||!audioMaster)return;
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),now=audioCtx.currentTime;
  o.type=type;o.frequency.setValueAtTime(freq,now);
  o.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),now+duration);
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),now+.008);
  g.gain.exponentialRampToValueAtTime(.0001,now+duration);
  o.connect(g);g.connect(audioMaster);o.start(now);o.stop(now+duration+.02);
}
function noise(duration=.12,volume=.08,filterFreq=1800){
  initAudio();if(!audioCtx||!audioMaster)return;
  const len=Math.max(1,Math.floor(audioCtx.sampleRate*duration)),buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate),data=buf.getChannelData(0);
  for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
  const src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),g=audioCtx.createGain(),now=audioCtx.currentTime;
  filter.type='lowpass';filter.frequency.value=filterFreq;
  g.gain.setValueAtTime(Math.max(.0001,volume),now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);
  src.buffer=buf;src.connect(filter);filter.connect(g);g.connect(audioMaster);src.start(now);src.stop(now+duration+.02);
}
function soundRailCharge(){initAudio();tone(95,.9,'sawtooth',.045,520);tone(180,.75,'sine',.035,920)}
function soundRailFire(){initAudio();tone(48,.32,'sawtooth',.18,24);tone(180,.22,'square',.12,55);noise(.28,.16,2400)}
function soundFire(barrelId='85mm'){
  const f=barrelId==='57mm'?150:barrelId==='85mm'?105:barrelId==='122mm'?75:62;
  tone(f,.12,'sawtooth',.12,Math.max(35,f*.45));noise(.16,.10,1200);
}
function soundImpact(penetrated=true){
  if(penetrated){tone(85,.09,'square',.10,45);noise(.13,.10,2600)}
  else{tone(260,.08,'triangle',.06,110);noise(.08,.06,4200)}
}
function soundRicochet(){tone(980,.16,'triangle',.09,1800);tone(1450,.08,'square',.045,900)}
function soundExplosion(){noise(.34,.18,900);tone(62,.28,'sawtooth',.13,38)}
function soundHit(){tone(95,.12,'square',.10,55);noise(.08,.05,1500)}
function soundReloadReady(){tone(720,.07,'sine',.045,980);tone(980,.10,'sine',.035,1240)}
function soundWave(){tone(220,.14,'sine',.07,330);setTimeout(()=>tone(330,.16,'sine',.07,520),110)}
function soundWaveClear(){tone(520,.12,'sine',.06,660);setTimeout(()=>tone(780,.18,'sine',.06,1040),120)}
function soundUi(){tone(500,.05,'sine',.035,620)}
function startEngineSound(){
  initAudio();if(!audioCtx||engineOsc)return;
  engineOsc=audioCtx.createOscillator();engineGain=audioCtx.createGain();
  engineOsc.type='sawtooth';engineOsc.frequency.value=68;engineGain.gain.value=.018;
  engineOsc.connect(engineGain);engineGain.connect(audioMaster);engineOsc.start();
}
function stopEngineSound(){
  if(engineOsc){try{engineOsc.stop()}catch(e){}engineOsc.disconnect();engineOsc=null}
  if(engineGain){engineGain.disconnect();engineGain=null}
}


function getSaveSlots(){try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'[]')}catch(e){return []}}
function writeSaveSlots(slots){localStorage.setItem(SAVE_KEY,JSON.stringify(slots.slice(0,3)))}
function saveCurrent(slot=activeSlot){
  if(!p||!slot)return;
  const slots=getSaveSlots();
  slots[slot-1]={
    version:1,level:p.lv,xp:p.xp,next:p.next,coins:p.coins,kills:p.kills,
    hullId:equippedHull,turretId:equippedTurret,barrelId:equippedBarrel,engineId:equippedEngine,
    ownedHulls:[...ownedHulls],ownedTurrets:[...ownedTurrets],ownedBarrels:[...ownedBarrels],ownedEngines:[...ownedEngines],
    savedAt:Date.now()
  };
  writeSaveSlots(slots);renderSaveSlots();
}
function applySave(slot){
  const slots=getSaveSlots(),data=slots[slot-1];
  if(!data)return false;
  activeSlot=slot;
  ownedHulls=data.ownedHulls||ownedHulls;ownedTurrets=data.ownedTurrets||ownedTurrets;ownedBarrels=data.ownedBarrels||ownedBarrels;ownedEngines=data.ownedEngines||ownedEngines;
  equippedHull=data.hullId||'standard';equippedTurret=data.turretId||'standard';equippedBarrel=data.barrelId||'85mm';equippedEngine=data.engineId||'standard';
  saveShop();
  reset();
  p.lv=Math.max(1,data.level||1);p.xp=Math.max(0,data.xp||0);p.next=Math.max(120,data.next||120);p.coins=Math.max(0,data.coins||0);p.kills=Math.max(0,data.kills||0);
  return true;
}
function renderSaveSlots(){
  const box=$('saveSlots');if(!box)return;
  const slots=getSaveSlots();box.innerHTML='';
  for(let i=1;i<=3;i++){
    const d=slots[i-1],row=document.createElement('div');row.className='saveSlot';
    const info=document.createElement('div');
    info.innerHTML=d?'<b>Slot '+i+'</b><small>Level '+d.level+' • '+d.coins+' coins • '+d.kills+' kills</small>':'<b>Slot '+i+'</b><small>Empty</small>';
    row.appendChild(info);
    const actions=document.createElement('div');
    if(d){const load=document.createElement('button');load.textContent='LOAD';load.onclick=()=>{initAudio();soundUi();if(applySave(i))showGame()};actions.appendChild(load)}
    const save=document.createElement('button');save.textContent='SAVE';save.disabled=!p;save.onclick=()=>{initAudio();soundUi();activeSlot=i;saveCurrent(i)};
    actions.appendChild(save);row.appendChild(actions);box.appendChild(row);
  }
}
function showMenu(){
  stopEngineSound();gameScreen='menu';over=true;$('mainMenu').hidden=false;$('shop').classList.remove('open');$('death').hidden=true;$('cursorReload').hidden=true;renderSaveSlots();
}
function showGame(){
  gameScreen='game';$('mainMenu').hidden=true;$('shop').classList.remove('open');$('death').hidden=true;over=false;autoSaveTimer=0;
}
function openMenuShop(){
  initAudio();soundUi();$('mainMenu').hidden=true;$('shop').classList.add('open');renderShop();
}
function startNewGame(){
  initAudio();soundUi();
  const slots=getSaveSlots();let slot=activeSlot||slots.findIndex(v=>!v)+1;if(!slot)slot=1;
  activeSlot=slot;reset();p.coins=0;p.lv=1;p.xp=0;p.next=120;p.kills=0;saveCurrent(slot);showGame();
}
function reset(){
  const hull=hulls.find(v=>v.id===equippedHull)||hulls[0], turret=turrets.find(v=>v.id===equippedTurret)||turrets[0], barrel=barrels.find(v=>v.id===equippedBarrel)||barrels[0], engine=engines.find(v=>v.id===equippedEngine)||engines[0];
  const totalHp=hull.hp+turret.hp;
  p={x:W/2,y:H/2,r:20*hull.scale,speed:hull.speed*engine.speed,mass:hull.id==='heavy'?1.8:hull.id==='scout'?.65:1,hp:totalHp,max:totalHp,lv:1,aimPrecision:barrel.precision,xp:0,next:120,coins:0,kills:0,cd:0,inv:0,angle:0,turretAngle:0,burnTime:0,burnDamage:0,ramCd:0,railCharging:false,railCharge:0,hullId:hull.id,turretId:turret.id,barrelId:barrel.id};
  en=[];bs=[];ebs=[];ps=[];dmgTexts=[];spawn=.8;over=false;wave=1;waveRemaining=waveSize(wave);waveStarted=true;waveClearTimer=0;
  walls=[
    {x:W*.18,y:H*.22,w:150,h:28},{x:W*.52,y:H*.18,w:190,h:28},{x:W*.76,y:H*.34,w:34,h:145},
    {x:W*.28,y:H*.55,w:190,h:30},{x:W*.58,y:H*.64,w:34,h:150},{x:W*.08,y:H*.70,w:145,h:28},
    {x:W*.42,y:H*.40,w:95,h:26}
  ];
  $('death').hidden=true;
  $('cursorReload').hidden=true;
}

function pos(e){const r=c.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top}
c.addEventListener('pointermove',pos);
c.addEventListener('pointerdown',e=>{initAudio();pos(e);mouse.down=true;c.setPointerCapture?.(e.pointerId)});
addEventListener('pointerup',()=>mouse.down=false);
addEventListener('pointercancel',()=>mouse.down=false);
addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.code==='Space')e.preventDefault();if(over&&(e.key==='Enter'||e.code==='Space')&&gameScreen==='game')reset()});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
$('mainMenuButton').onclick=()=>{initAudio();soundUi();saveCurrent(activeSlot);showMenu()};
$('shopClose').onclick=()=>{initAudio();soundUi();$('shop').classList.remove('open');$('mainMenu').hidden=false;renderSaveSlots()};
$('shopBack').onclick=()=>{initAudio();soundUi();showMenu()};
$('menuShop').onclick=openMenuShop;
$('startGame').onclick=startNewGame;
$('restart').onclick=()=>{initAudio();soundUi();if(activeSlot&&applySave(activeSlot))showGame();else{reset();showGame()}};
$('deathMenu').onclick=()=>{initAudio();soundUi();saveCurrent(activeSlot);showMenu()};
renderSaveSlots();

function burst(a,b,col,n=8){
  for(let i=0;i<n;i++){let q=Math.random()*6.283,s=40+Math.random()*150;
    ps.push({x:a,y:b,vx:Math.cos(q)*s,vy:Math.sin(q)*s,life:.35+Math.random()*.35,col});
  }
}
function wallHitCircle(cx,cy,r){
  for(const w of walls){
    const nx=Math.max(w.x,Math.min(cx,w.x+w.w)),ny=Math.max(w.y,Math.min(cy,w.y+w.h));
    if(Math.hypot(cx-nx,cy-ny)<r)return true;
  }
  return false;
}
function moveWithWalls(obj,dx,dy){
  const dist=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(dist/3));
  const sx=dx/steps,sy=dy/steps;
  let moved=false;
  for(let i=0;i<steps;i++){
    const nx=obj.x+sx,ny=obj.y+sy;
    if(!wallHitCircle(nx,ny,obj.r)){obj.x=nx;obj.y=ny;moved=true;continue;}
    let stepMoved=false;
    if(!wallHitCircle(obj.x+sx,obj.y,obj.r)){obj.x+=sx;stepMoved=true;}
    if(!wallHitCircle(obj.x,obj.y+sy,obj.r)){obj.y+=sy;stepMoved=true;}
    if(!stepMoved){
      const px=-sy,py=sx;
      if(!wallHitCircle(obj.x+px,obj.y+py,obj.r)){obj.x+=px;obj.y+=py;stepMoved=true;}
      else if(!wallHitCircle(obj.x-px,obj.y-py,obj.r)){obj.x-=px;obj.y-=py;stepMoved=true;}
    }
    moved=moved||stepMoved;
    if(!stepMoved)break;
  }
  return moved;
}
function wallSegmentHit(x1,y1,x2,y2,r){
  const dist=Math.hypot(x2-x1,y2-y1),steps=Math.max(1,Math.ceil(dist));
  for(let i=0;i<=steps;i++){const t=i/steps,px=x1+(x2-x1)*t,py=y1+(y2-y1)*t;if(wallHitCircle(px,py,r))return true;}
  return false;
}
function wallRayHit(x1,y1,angle,maxDist){return wallSegmentHit(x1,y1,x1+Math.cos(angle)*maxDist,y1+Math.sin(angle)*maxDist,2.5);}
function segmentCircleHit(x1,y1,x2,y2,cx,cy,r){
  // Swept tank-hit test so fast shells cannot skip over a tank between frames.
  const vx=x2-x1,vy=y2-y1,wx=cx-x1,wy=cy-y1;
  const len2=vx*vx+vy*vy;
  const t=len2?Math.max(0,Math.min(1,(wx*vx+wy*vy)/len2)):0;
  const px=x1+vx*t,py=y1+vy*t;
  return Math.hypot(cx-px,cy-py)<=r;
}
function safeSeparateTanks(a,b){
  const d=Math.hypot(a.x-b.x,a.y-b.y),min=a.r+b.r;
  if(d>=min)return;
  const nx=(b.x-a.x)/(d||1),ny=(b.y-a.y)/(d||1),overlap=min-d;
  const ax=a.x-nx*overlap*.5,ay=a.y-ny*overlap*.5;
  const bx=b.x+nx*overlap*.5,by=b.y+ny*overlap*.5;
  if(!wallHitCircle(ax,ay,a.r))a.x=ax,a.y=ay;
  if(!wallHitCircle(bx,by,b.r))b.x=bx,b.y=by;
  a.x=Math.max(a.r+8,Math.min(W-a.r-8,a.x));a.y=Math.max(a.r+8,Math.min(H-a.r-8,a.y));
  b.x=Math.max(b.r+8,Math.min(W-b.r-8,b.x));b.y=Math.max(b.r+8,Math.min(H-b.r-8,b.y));
}
function hullMassMultiplier(obj){
  const id=obj.hullId||'standard';
  return id==='heavy'?1.8:id==='scout'?.65:1;
}
function collisionDamage(attacker,speed){
  if(speed<18)return 0;
  return 22*hullMassMultiplier(attacker)*Math.min(2.2,Math.max(.65,speed/90));
}
function findOpenPoint(r){
  for(let i=0;i<30;i++){
    const px=r+12+Math.random()*Math.max(1,W-r*2-24),py=r+12+Math.random()*Math.max(1,H-r*2-24);
    if(!wallHitCircle(px,py,r))return {x:px,y:py};
  }
  return {x:W/2,y:H/2};
}
function recoverBotFromWall(e){
  if(!wallHitCircle(e.x,e.y,e.r))return false;
  const step=Math.max(5,e.r*.7);
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8,px=e.x+Math.cos(a)*step,py=e.y+Math.sin(a)*step;
    if(!wallHitCircle(px,py,e.r)){e.x=px;e.y=py;e.wanderTime=0;e.idle=false;return true;}
  }
  return false;
}
function addXp(n){
  p.xp+=n;
  while(p.xp>=p.next){p.xp-=p.next;p.lv++;p.next=Math.floor(p.next*1.28);p.hp=p.max;p.speed+=3;burst(p.x,p.y,'#78b7ff',35)}
}
function waveSize(w){return 3+w*2;}
function startNextWave(){wave++;waveRemaining=waveSize(wave);waveClearTimer=0;soundWave();}

function pickEnemyGun(){
  const roll=Math.random();
  if(roll<.55)return '57mm';
  if(roll<.85)return '85mm';
  if(roll<.97)return '122mm';
  return '122mmLong';
}
function pickEnemyTurret(){
  const roll=Math.random();
  if(roll<.55)return 'standard';
  if(roll<.85)return 'rapid';
  return 'fast';
}
function pickEnemyEngine(){
  const roll=Math.random();
  if(roll<.50)return 'standard';
  if(roll<.85)return 'upgraded';
  return 'better';
}
function pickEnemyHull(){
  const r=Math.random();
  if(wave<=2)return r<.65?'scout':(r<.95?'standard':'heavy');
  if(wave<=5)return r<.25?'scout':(r<.85?'standard':'heavy');
  const kvChance=Math.min(.85,.45+(wave-6)*.08);
  return r<kvChance?'heavy':(r<.5?'scout':'standard');
}
function makeEnemy(){
  if(waveRemaining<=0)return;
  const side=Math.floor(Math.random()*4);let a,b;
  if(side===0){a=-45;b=Math.random()*H}else if(side===1){a=W+45;b=Math.random()*H}
  else if(side===2){a=Math.random()*W;b=-45}else{a=Math.random()*W;b=H+45}

  // Every enemy gets a complete loadout from the same shop equipment pool as the player.
  // Stronger equipment is weighted to be rarer so early waves do not become unfair.
  const hullId=pickEnemyHull();
  const turretId=pickEnemyTurret();
  const enemyBarrelId=pickEnemyGun();
  const engineId=pickEnemyEngine();
  const hull=hulls.find(v=>v.id===hullId)||hulls[0];
  const turret=turrets.find(v=>v.id===turretId)||turrets[0];
  const engine=engines.find(v=>v.id===engineId)||engines[0];
  const heavy=hullId==='heavy';
  const mass=hullId==='heavy'?1.8:hullId==='scout'?.65:1;

  // Enemy HP keeps the existing combat balance, while turret HP is part of the loadout.
  const baseHp=heavy?360:hullId==='standard'?240:170;
  const hp=baseHp+turret.hp;

  en.push({
    x:a,y:b,
    r:20*hull.scale,
    speed:hull.speed*.4*engine.speed,
    turnRate:hull.turn*engine.turn,
    hp,max:hp,dmg:heavy?35:20,
    heavy,hullId,turretId,enemyBarrelId,engineId,mass,
    angle:0,turretAngle:0,fire:.8+Math.random()*1.5,hitFlash:0,burnTime:0,burnDamage:0,ramCd:0,
    wanderX:Math.random()*W,wanderY:Math.random()*H,wanderTime:1+Math.random()*3,
    idle:Math.random()<.3
  });
  waveRemaining--;
}
function fireRailgun(fireAngle,barrel){
  // Start the beam at the actual end of the long gun barrel, not at the turret center.
  const gunMuzzleDistance=p.r*(.38+1.16*(barrel.length||1));
  const muzzleX=p.x+Math.cos(fireAngle)*gunMuzzleDistance;
  const muzzleY=p.y+Math.sin(fireAngle)*gunMuzzleDistance;
  const range=1400,cos=Math.cos(fireAngle),sin=Math.sin(fireAngle);
  let wallDist=range;

  // The beam ends at the first wall, so it can never pass through cover.
  const step=2;
  for(let d=0;d<=range;d+=step){
    const rx=muzzleX+cos*d,ry=muzzleY+sin*d;
    if(wallHitCircle(rx,ry,2.5)){wallDist=d;break;}
  }

  // A railgun can pierce multiple tanks. Each tank after the first
  // receives 50% of the previous tank's damage: 100%, 50%, 25%, 12.5%...
  const pierced=[];
  for(const e of en){
    const dx=e.x-muzzleX,dy=e.y-muzzleY;
    const along=dx*cos+dy*sin;
    const side=Math.abs(dx*sin-dy*cos);
    if(along>0&&along<wallDist&&side<=e.r){
      pierced.push({e,along});
    }
  }
  pierced.sort((a,b)=>a.along-b.along);

  const baseDamage=barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage);
  for(let i=0;i<pierced.length;i++){
    const target=pierced[i].e;
    if(!en.includes(target))continue;
    const damage=baseDamage*Math.pow(.5,i);
    applyBulletHit(target,damage,target.x,target.y,barrel.penetration,null);
    if(target.hp<=0)killEnemy(target,en.indexOf(target));
  }

  railBeams.push({
    x1:muzzleX,y1:muzzleY,
    x2:muzzleX+cos*wallDist,y2:muzzleY+sin*wallDist,
    life:2,maxLife:2,angle:fireAngle
  });
  burst(muzzleX,muzzleY,'#bffcff',24);
  burst(muzzleX,muzzleY,'#ffffff',12);
  soundRailFire();
}
function shoot(){
  const coarse=window.matchMedia?.('(pointer:coarse)').matches;
  if(coarse&&!mobileFire)return;
  if(p.cd>0)return;
  const barrel=barrels.find(v=>v.id===p.barrelId)||barrels[0];
  const a=Math.atan2(mouse.y-p.y,mouse.x-p.x);p.turretAngle=a;
  if(barrel.id==='122mmLong'){
    if(!p.railCharging){p.railCharging=true;p.railCharge=1;soundRailCharge();}
    return;
  }
  const maxDispersion=140,dispersionRadius=maxDispersion*(1-Math.max(0,Math.min(1,p.aimPrecision)));
  const rr=dispersionRadius*Math.sqrt(Math.random()),ra=Math.random()*Math.PI*2;
  const fireAngle=Math.atan2(mouse.y+Math.sin(ra)*rr-p.y,mouse.x+Math.cos(ra)*rr-p.x);
  const muzzleX=p.x+Math.cos(fireAngle)*34,muzzleY=p.y+Math.sin(fireAngle)*34;
  const dmg=barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage);
  const speed=({"57mm":1000,"85mm":1300,"122mm":1600}[barrel.id]||1300);
  bs.push({x:muzzleX,y:muzzleY,vx:Math.cos(fireAngle)*speed,vy:Math.sin(fireAngle)*speed,r:2.8,life:1.8,dmg,penetration:barrel.penetration,trail:[]});
  p.cd=barrel.reloadTime;burst(muzzleX,muzzleY,'#ffd27a',6);soundFire(barrel.id);
}
function getArmor(target,zone){
  if(target===p){
    const h=hulls.find(v=>v.id===p.hullId)||hulls[0];
    return h.armor[zone];
  }
  return target.heavy?120:80;
}
function penetrationChance(penetration,armor){
  const ratio=penetration/Math.max(1,armor);
  const points=[[.5,.10],[.75,.30],[1,.50],[1.25,.70],[1.5,.85],[2,.95]];
  if(ratio<=points[0][0])return .05;
  if(ratio>=points[points.length-1][0])return .95;
  for(let i=1;i<points.length;i++){
    const [r1,c1]=points[i-1],[r2,c2]=points[i];
    if(ratio<=r2)return c1+(c2-c1)*(ratio-r1)/(r2-r1);
  }
  return .95;
}
function getHitProfile(target,bx,by){
  const hitAngle=Math.atan2(by-target.y,bx-target.x);
  const local=((hitAngle-target.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
  const c=Math.cos(local);
  if(c>=.5)return {rear:false,zone:'front'};
  if(c<=-.5)return {rear:true,zone:'rear'};
  return {rear:false,zone:'side'};
}
function ricochetChance(target,bx,by,vx,vy){
  // 0° = shell striking the armor straight on. 90° = a grazing impact.
  // Grazing hits become increasingly likely to bounce instead of penetrating.
  const surfaceAngle=Math.atan2(by-target.y,bx-target.x);
  const shellAngle=Math.atan2(vy,vx);
  let impact=Math.abs(((shellAngle-(surfaceAngle+Math.PI)+Math.PI*3)%(Math.PI*2))-Math.PI);
  impact=Math.min(impact,Math.PI-impact);
  const deg=impact*180/Math.PI;
  if(deg<55)return 0;
  if(deg>=80)return .95;
  return .10+(.95-.10)*(deg-55)/25;
}
function reflectBullet(b,target,bx,by){
  const nx=(bx-target.x)/Math.max(.001,Math.hypot(bx-target.x,by-target.y));
  const ny=(by-target.y)/Math.max(.001,Math.hypot(bx-target.x,by-target.y));
  const dot=b.vx*nx+b.vy*ny;
  b.vx=(b.vx-2*dot*nx)*.82;
  b.vy=(b.vy-2*dot*ny)*.82;
  b.x=bx+nx*(b.r+1.5);
  b.y=by+ny*(b.r+1.5);
  b.life=Math.min(b.life,.9);
}
function applyBulletHit(target,baseDamage,bx,by,penetration=70,b=null){
  const profile=getHitProfile(target,bx,by);
  if(b&&Math.random()<ricochetChance(target,bx,by,b.vx,b.vy)){
    reflectBullet(b,target,bx,by);
    burst(bx,by,'#f5f7f7',12);
    burst(bx,by,'#9aa5ad',6);soundRicochet();
    return {profile,ricochet:true};
  }
  const armor=getArmor(target,profile.zone);
  const chance=penetrationChance(penetration,armor);
  const penetrates=Math.random()<chance;
  const damage=penetrates?baseDamage:0;
  if(penetrates){
    target.hp-=damage;
    target.hitFlash=.08;
    dmgTexts.push({x:target.x,y:target.y-target.r-8,text:Math.round(damage),life:.7});
  }

  // A penetrating rear hit has a 1% chance to ignite the tank. Burning deals 40% of
  // its max HP over 10 seconds, at a steady rate.
  const fireChance=profile.rear?.05:profile.zone==='side'?.02:0;
  if(penetrates&&fireChance>0&&target.burnTime<=0&&Math.random()<fireChance){
    target.burnTime=10;
    target.burnDamage=target.max*.60;
    burst(target.x,target.y,'#ff9b55',16);
  }
  burst(bx,by,penetrates?'#ffd27a':'#b8c0c8',penetrates?14:8);soundImpact(penetrates);
  return {profile,ricochet:false};
}
function enemyShoot(e){
  const a=Math.atan2(p.y-e.y,p.x-e.x);e.turretAngle=a;
  const barrel=barrels.find(v=>v.id===e.enemyBarrelId)||barrels[0];
  const damage=barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage);
  if(barrel.instant){
    const range=1400,cos=Math.cos(a),sin=Math.sin(a);
    const dx=p.x-e.x,dy=p.y-e.y,along=dx*cos+dy*sin,side=Math.abs(dx*sin-dy*cos);
    if(along>0&&along<range&&side<=p.r&&!wallRayHit(e.x,e.y,a,along))applyBulletHit(p,damage,p.x,p.y,barrel.penetration,null);
  }else{
    const speed=({"57mm":1000,"85mm":1300,"122mm":1600}[barrel.id]||1300);
    ebs.push({x:e.x+Math.cos(a)*(e.r+10),y:e.y+Math.sin(a)*(e.r+10),vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:2.5,life:2.4,dmg:damage,penetration:barrel.penetration,trail:[]});
  }
  e.fire=barrel.reloadTime;
  burst(e.x+Math.cos(a)*e.r,e.y+Math.sin(a)*e.r,barrel.instant?'#ffd27a':'#ff875f',barrel.instant?9:4);soundFire(barrel.id);
}
function killEnemy(e,j){
  p.kills++;p.coins+=e.heavy?15:7;addXp(e.heavy?70:35);
  burst(e.x,e.y,e.heavy?'#c77d52':'#d85b68',28);soundExplosion();en.splice(j,1);
}
function die(){saveCurrent(activeSlot);gameScreen='game';over=true;stopEngineSound();$('deathStats').textContent='Wave '+wave+' • Level '+p.lv+' • '+p.kills+' kills • '+p.coins+' coins';$('death').hidden=false;$('cursorReload').hidden=true;}
function hullForPlayer(){return hulls.find(v=>v.id===p.hullId)||hulls[0]}
function saveShop(){
  localStorage.setItem('tankOwnedHulls',JSON.stringify(ownedHulls));
  localStorage.setItem('tankOwnedTurrets',JSON.stringify(ownedTurrets));
  localStorage.setItem('tankOwnedBarrels',JSON.stringify(ownedBarrels));
  localStorage.setItem('tankEquippedHull',equippedHull);
  localStorage.setItem('tankEquippedTurret',equippedTurret);
  localStorage.setItem('tankEquippedBarrel',equippedBarrel);
  localStorage.setItem('tankOwnedEngines',JSON.stringify(ownedEngines));
  localStorage.setItem('tankEquippedEngine',equippedEngine);
}
function renderShop(){
  const box=$('shopItems'); if(!box)return;
  box.innerHTML='';
  const preview=(type,item)=>{
    const cv=document.createElement('canvas');cv.width=120;cv.height=64;cv.className='shopPreview';
    const q=cv.getContext('2d');q.clearRect(0,0,120,64);q.translate(60,32);
    q.fillStyle='#d9dee1';q.fillRect(-60,-32,120,64);
    q.fillStyle='rgba(255,255,255,.45)';q.fillRect(-60,-32,120,64);
    q.strokeStyle='rgba(120,130,135,.25)';q.strokeRect(-58,-30,116,60);
    if(type==='hull'){
      const sc=item.scale;
      q.fillStyle=item.id==='heavy'?'#4e4942':item.id==='scout'?'#526149':'#56644c';
      q.beginPath();q.roundRect(-28*sc,-13*sc,56*sc,26*sc,7*sc);q.fill();
      q.fillStyle='#252923';
      q.fillRect(-32*sc,-18*sc,64*sc,5*sc);q.fillRect(-32*sc,13*sc,64*sc,5*sc);
      q.fillStyle='#687264';
      for(let i=-2;i<=2;i++){q.beginPath();q.arc(i*11*sc,-15.5*sc,4*sc,0,6.283);q.fill();q.beginPath();q.arc(i*11*sc,15.5*sc,4*sc,0,6.283);q.fill()}
      q.fillStyle='#3f493e';q.beginPath();q.arc(-2,0,12*sc,0,6.283);q.fill();
      q.fillStyle='#647258';q.beginPath();q.moveTo(28*sc,0);q.lineTo(17*sc,-9*sc);q.lineTo(3*sc,-11*sc);q.lineTo(3*sc,11*sc);q.lineTo(17*sc,9*sc);q.closePath();q.fill();
    }else if(type==='turret'){
      const sc=item.scale;
      q.fillStyle='#343c34';q.beginPath();q.arc(0,0,19*sc,0,6.283);q.fill();
      q.fillStyle=item.id==='fast'?'#526149':item.id==='rapid'?'#4b5748':'#424d3f';
      q.beginPath();q.roundRect(-15*sc,-10*sc,30*sc,20*sc,8*sc);q.fill();
      q.fillStyle='#292f2a';q.fillRect(12*sc,-4*sc,12*sc,8*sc);
    }else{
      const sc=item.scale;
      q.strokeStyle='#292f2a';q.lineWidth=7*sc;q.lineCap='round';q.beginPath();q.moveTo(-12,0);q.lineTo(34*item.length,0);q.stroke();
      q.strokeStyle='#151819';q.lineWidth=3*sc;q.beginPath();q.moveTo(8,0);q.lineTo(34*item.length,0);q.stroke();
      q.fillStyle='#3f493e';q.beginPath();q.arc(-12,0,10*sc,0,6.283);q.fill();
      q.fillStyle='#e3e8e8';q.font='bold 9px system-ui';q.textAlign='center';q.fillText(item.name.split(' ')[0],0,26);
    }
    return cv;
  };
  const add=(type,item,owned,equipped)=>{
    const row=document.createElement('div');row.className='shopItem';
    const info=document.createElement('div');info.className='shopInfo';
    info.appendChild(preview(type,item));
    const text=document.createElement('div');
    let stat='';
    if(type==='hull')stat='HP '+item.hp+' • Speed '+item.speed;
    else if(type==='turret')stat='Turn speed '+item.turn+' • HP +'+item.hp
    else if(type==='engine')stat='Hull speed +'+Math.round((item.speed-1)*100)+'% • Hull rotation +'+Math.round((item.turn-1)*100)+'%'
    else stat='DMG '+item.minDamage+'-'+item.maxDamage+' • Pen '+item.penetration+' • Precision '+Math.round(item.precision*100)+'% • Dispersion '+(item.dispersionTime||0)+'s • Reload '+item.reloadTime+'s';
    text.innerHTML='<b>'+item.name+'</b><small>'+stat+'</small>';
    info.appendChild(text);row.appendChild(info);
    const btn=document.createElement('button');
    btn.textContent=equipped?'EQUIPPED':owned?'EQUIP':'FREE';
    btn.disabled=equipped;
    btn.onclick=()=>{
      if(!owned){
        if(type==='hull')ownedHulls.push(item.id);
        else if(type==='turret')ownedTurrets.push(item.id);
        else if(type==='barrel')ownedBarrels.push(item.id);
        else ownedEngines.push(item.id);
      }
      if(type==='hull'){equippedHull=item.id;p.hullId=item.id;p.r=20*item.scale;p.max=item.hp;p.hp=Math.min(p.hp,p.max)}
      else if(type==='turret'){equippedTurret=item.id;p.turretId=item.id;const newMax=hullForPlayer().hp+item.hp;p.max=newMax;p.hp=Math.min(p.hp,newMax)}
      else if(type==='barrel'){equippedBarrel=item.id;p.barrelId=item.id;p.aimPrecision=item.precision}
      else {equippedEngine=item.id;}
      saveShop();renderShop();
    };
    row.appendChild(btn);box.appendChild(row);
  };
  const section=t=>{const z=document.createElement('div');z.className='shopSectionTitle';z.textContent=t;box.appendChild(z)};
  section('HULLS');hulls.forEach(v=>add('hull',v,ownedHulls.includes(v.id),equippedHull===v.id));
  section('TURRETS');turrets.forEach(v=>add('turret',v,ownedTurrets.includes(v.id),equippedTurret===v.id));
  section('CANNON BARRELS');barrels.forEach(v=>add('barrel',v,ownedBarrels.includes(v.id),equippedBarrel===v.id));
  section('ENGINES');engines.forEach(v=>add('engine',v,ownedEngines.includes(v.id),equippedEngine===v.id));
}

function update(dt){
  if(over||gameScreen!=='game'){stopEngineSound();return;}
  autoSaveTimer+=dt;if(autoSaveTimer>=5){autoSaveTimer=0;saveCurrent(activeSlot);}
  p.cd=Math.max(0,p.cd-dt);p.inv=Math.max(0,p.inv-dt);p.ramCd=Math.max(0,(p.ramCd||0)-dt);
  if(p.railCharging){
    p.railCharge=Math.max(0,p.railCharge-dt);
    if(p.railCharge<=0){
      const aimAngle=Math.atan2(mouse.y-p.y,mouse.x-p.x);
      const maxDispersion=140,dispersionRadius=maxDispersion*(1-Math.max(0,Math.min(1,p.aimPrecision)));
      const rr=dispersionRadius*Math.sqrt(Math.random()),ra=Math.random()*Math.PI*2;
      const fireAngle=Math.atan2(mouse.y+Math.sin(ra)*rr-p.y,mouse.x+Math.cos(ra)*rr-p.x);
      p.turretAngle=aimAngle;
      const barrelNow=barrels.find(v=>v.id===p.barrelId)||barrels[3];
      fireRailgun(fireAngle,barrelNow);p.railCharging=false;p.cd=barrelNow.reloadTime;
    }
  }
  for(let i=railBeams.length-1;i>=0;i--){railBeams[i].life-=dt;if(railBeams[i].life<=0)railBeams.splice(i,1);}

  // Burning tanks lose exactly 40% of their max HP over 10 seconds.
  if(p.burnTime>0){
    const burnTick=Math.min(p.burnDamage,p.max*.40/10*dt);
    p.hp-=burnTick;p.burnDamage-=burnTick;p.burnTime=Math.max(0,p.burnTime-dt);
    if(Math.random()<dt*10)burst(p.x+(Math.random()-.5)*p.r,p.y+(Math.random()-.5)*p.r,'#ff8a3d',2);
    if(p.hp<=0){p.hp=0;die();return;}
  }
  // A wave cannot advance until every enemy from the current wave is destroyed.
  if(waveRemaining>0){
    spawn-=dt;
    if(spawn<=0 && en.length<4){makeEnemy();spawn=Math.max(2.2,4.2-wave*.06)}
  }else if(en.length===0){
    waveClearTimer+=dt;
    if(waveClearTimer>=2)startNextWave();
  }
  // Tank controls: W/S drive forward and backward; A/D rotate the hull in place.
  let drive=0,turn=0;
  if(keys.has('w')||keys.has('arrowup'))drive+=1;
  if(keys.has('s')||keys.has('arrowdown'))drive-=1;
  if(keys.has('a')||keys.has('arrowleft'))turn-=1;
  if(keys.has('d')||keys.has('arrowright'))turn+=1;
  if(touch.active){
    drive=-touch.y;
    turn=touch.x;
  }
  if(mobileDrive.up)drive=1;
  if(mobileDrive.down)drive=-1;
  if(mobileDrive.left)turn=-1;
  if(mobileDrive.right)turn=1;

  // Keep rotation and movement as separate upgradeable stats.
  const hull=hulls.find(v=>v.id===p.hullId)||hulls[0], turret=turrets.find(v=>v.id===p.turretId)||turrets[0], barrel=barrels.find(v=>v.id===p.barrelId)||barrels[0];
  const engine=engines.find(v=>v.id===equippedEngine)||engines[0];
  const hullTurnRate=hull.turn*engine.turn;
  const driveSpeed=hull.speed*engine.speed;
  const reverseSpeed=hull.reverse*engine.speed;
  if(drive||turn)startEngineSound();else stopEngineSound();
  if(turn){
    // When reversing, left/right steering reverses naturally.
    const reverseFactor=drive<0?-1:1;
    p.angle+=turn*hullTurnRate*dt*reverseFactor;
  }
  if(drive){
    const moveSpeed=drive<0?reverseSpeed:driveSpeed;
    moveWithWalls(p,Math.cos(p.angle)*drive*moveSpeed*dt,Math.sin(p.angle)*drive*moveSpeed*dt);
  }
  p.x=Math.max(p.r+8,Math.min(W-p.r-8,p.x));p.y=Math.max(p.r+8,Math.min(H-p.r-8,p.y));
  // World-of-Tanks-style dispersion: the reticle continuously expands while the hull
  // is moving and smoothly contracts while stationary. The value is never reset every frame.
  const moving=drive!==0;
  const movingFloor=.02;
  const dispersionTime=Math.max(.1,barrel.dispersionTime||1);
  const aimTime=Math.max(.1,barrel.aimTime||dispersionTime);
  const movingRate=(1-movingFloor)/dispersionTime;
  const aimRate=(1-movingFloor)/aimTime;
  if(moving){
    p.aimPrecision=Math.max(movingFloor,p.aimPrecision-movingRate*dt);
  }else{
    p.aimPrecision=Math.min(1,p.aimPrecision+aimRate*dt);
  }
  const targetTurret=Math.atan2(mouse.y-p.y,mouse.x-p.x);
  let turretDa=((targetTurret-p.turretAngle+Math.PI*3)%(Math.PI*2))-Math.PI;
  const playerTurretTurnRate=turret.turn;
  p.turretAngle+=Math.max(-playerTurretTurnRate*dt,Math.min(playerTurretTurnRate*dt,turretDa));
  if(mouse.down||mobileFire||keys.has(' '))shoot();

  for(let i=bs.length-1;i>=0;i--){
    const b=bs[i];b.trail.unshift({x:b.x,y:b.y,life:.16});if(b.trail.length>8)b.trail.pop();
    const ox=b.x,oy=b.y,nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;
    let hit=false;
    if(wallSegmentHit(ox,oy,nx,ny,b.r)){
      // Stop the shell at the wall: shells can never cross or damage through cover.
      hit=true;
      burst(ox+(nx-ox)*.5,oy+(ny-oy)*.5,'#b8c0c8',7);
    }else{
      // Find the FIRST tank crossed by the shell path, not just the tank at the final frame.
      let firstHit=null,firstT=Infinity;
      for(const e of en){
        const vx=nx-ox,vy=ny-oy,wx=e.x-ox,wy=e.y-oy,len2=vx*vx+vy*vy;
        const t=len2?Math.max(0,Math.min(1,(wx*vx+wy*vy)/len2)):0;
        const px=ox+vx*t,py=oy+vy*t;
        if(Math.hypot(e.x-px,e.y-py)<=b.r+e.r && t<firstT){firstHit=e;firstT=t;}
      }
      if(firstHit){
        b.x=ox+(nx-ox)*firstT;b.y=oy+(ny-oy)*firstT;
        const j=en.indexOf(firstHit);
        const result=applyBulletHit(firstHit,b.dmg,b.x,b.y,b.penetration,b);
        hit=!result.ricochet;
        if(firstHit.hp<=0&&j>=0)killEnemy(firstHit,j);
        // A ricochet remains alive and is reflected from the first tank it touched.
      }else{
        b.x=nx;b.y=ny;
      }
    }
    b.life-=dt;b.trail=b.trail.map(t=>({...t,life:t.life-dt})).filter(t=>t.life>0);
    if(hit||b.life<=0||b.x<-60||b.x>W+60||b.y<-60||b.y>H+60)bs.splice(i,1);
  }

  for(let i=ebs.length-1;i>=0;i--){
    const b=ebs[i];b.trail.unshift({x:b.x,y:b.y,life:.16});if(b.trail.length>8)b.trail.pop();
    const ox=b.x,oy=b.y,nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;
    if(wallSegmentHit(ox,oy,nx,ny,b.r)){
      burst(ox+(nx-ox)*.5,oy+(ny-oy)*.5,'#b8c0c8',7);ebs.splice(i,1);continue;
    }
    b.x=nx;b.y=ny;b.life-=dt;b.trail=b.trail.map(t=>({...t,life:t.life-dt})).filter(t=>t.life>0);
    if(Math.hypot(b.x-p.x,b.y-p.y)<b.r+p.r){
      if(p.inv<=0){
        const profile=getHitProfile(p,b.x,b.y);
        if(Math.random()<ricochetChance(p,b.x,b.y,b.vx,b.vy)){
          reflectBullet(b,p,b.x,b.y);
          burst(b.x,b.y,'#f5f7f7',12);
          burst(b.x,b.y,'#9aa5ad',6);soundRicochet();
          continue;
        }
        const armor=getArmor(p,profile.zone);
        const chance=penetrationChance(b.penetration,armor);
        const penetrates=Math.random()<chance;
        const damage=penetrates?b.dmg:0;
        if(penetrates){
          p.hp-=damage;p.inv=.28;shake=10; soundHit();
          dmgTexts.push({x:p.x,y:p.y-p.r-8,text:Math.round(damage),life:.7});
        }else{
          burst(b.x,b.y,'#b8c0c8',8);
        }
        if(penetrates&&profile.rear&&p.burnTime<=0&&Math.random()<.01){
          p.burnTime=10;p.burnDamage=p.max*.40;burst(p.x,p.y,'#ff9b55',16);
        }
        burst(b.x,b.y,'#ff765d',14);
        if(p.hp<=0)die();
      }
      ebs.splice(i,1);continue;
    }
    if(b.life<=0||b.x<-60||b.x>W+60||b.y<-60||b.y>H+60)ebs.splice(i,1);
  }

  for(const e of en){
    const d=Math.hypot(p.x-e.x,p.y-e.y);
    e.fire-=dt;e.ramCd=Math.max(0,(e.ramCd||0)-dt);e.hitFlash=Math.max(0,e.hitFlash-dt);
    if(e.burnTime>0){
      const burnTick=Math.min(e.burnDamage,e.max*.40/10*dt);
      e.hp-=burnTick;e.burnDamage-=burnTick;e.burnTime=Math.max(0,e.burnTime-dt);
      if(Math.random()<dt*10)burst(e.x+(Math.random()-.5)*e.r,e.y+(Math.random()-.5)*e.r,'#ff8a3d',2);
      if(e.hp<=0){
        e.hp=0;
        const idx=en.indexOf(e);
        if(idx>=0)killEnemy(e,idx);
        continue;
      }
    }

    // Bots wander around the battlefield instead of constantly chasing the player.
    e.wanderTime-=dt;
    if(e.wanderTime<=0){
      e.wanderX=60+Math.random()*Math.max(1,W-120);
      e.wanderY=60+Math.random()*Math.max(1,H-120);
      e.wanderTime=1.5+Math.random()*4;
      e.idle=Math.random()<.35;
    }

    const oldEx=e.x,oldEy=e.y;
    if(recoverBotFromWall(e)){}
    if(!e.idle){
      const wa=Math.atan2(e.wanderY-e.y,e.wanderX-e.x);
      const wda=((wa-e.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
      const turnRate=2.1;
      e.angle+=Math.max(-turnRate*dt,Math.min(turnRate*dt,wda));
      const wd=Math.hypot(e.wanderX-e.x,e.wanderY-e.y);
      if(wd>28){
        const moved=moveWithWalls(e,Math.cos(e.angle)*e.speed*dt,Math.sin(e.angle)*e.speed*dt);
        if(!moved){
          const point=findOpenPoint(e.r);
          e.wanderX=point.x;e.wanderY=point.y;e.wanderTime=1.5+Math.random()*2;
          e.angle+=(Math.random()<.5?1:-1)*Math.PI*.35;
        }
      }
    }

    // Keep bots inside the battlefield.
    e.x=Math.max(e.r+10,Math.min(W-e.r-10,e.x));
    e.y=Math.max(e.r+10,Math.min(H-e.r-10,e.y));

    // Bots keep their hull pointed along their movement path while the turret independently tracks the player.
    const targetTurret=Math.atan2(p.y-e.y,p.x-e.x);
    let tda=((targetTurret-e.turretAngle+Math.PI*3)%(Math.PI*2))-Math.PI;
    const turretTurnRate=2.4;
    e.turretAngle+=Math.max(-turretTurnRate*dt,Math.min(turretTurnRate*dt,tda));

    // Bots can engage from range without needing to chase the player.
    if(d<620&&e.fire<=0)enemyShoot(e);
    // Ram damage is handled once below for both tanks.
  }

  // Every tank collision is mutual: both tanks take ram damage, with a short cooldown.
  for(let pass=0;pass<3;pass++){
    for(let i=0;i<en.length;i++)for(let j=i+1;j<en.length;j++){
      const a=en[i],b=en[j];
      if(Math.hypot(a.x-b.x,a.y-b.y)<a.r+b.r){
        safeSeparateTanks(a,b);
        if((a.ramCd||0)<=0&&(b.ramCd||0)<=0){
          const da=collisionDamage(b,Math.max(18,b.speed)),db=collisionDamage(a,Math.max(18,a.speed));
          a.hp-=da;b.hp-=db;a.ramCd=.3;b.ramCd=.3;a.hitFlash=.08;b.hitFlash=.08;shake=5;
          dmgTexts.push({x:a.x,y:a.y-a.r-8,text:Math.round(da),life:.7});dmgTexts.push({x:b.x,y:b.y-b.r-8,text:Math.round(db),life:.7});
          burst((a.x+b.x)/2,(a.y+b.y)/2,'#ff9b55',6);soundHit();
          if(a.hp<=0){const ia=en.indexOf(a);if(ia>=0)killEnemy(a,ia)}
          if(b.hp<=0){const ib=en.indexOf(b);if(ib>=0)killEnemy(b,ib)}
        }
      }
    }
  }
  for(const e of [...en]){
    if(!en.includes(e))continue;
    const d=Math.hypot(p.x-e.x,p.y-e.y),min=p.r+e.r;
    if(d<min){
      safeSeparateTanks(p,e);
      if(p.ramCd<=0&&(e.ramCd||0)<=0){
        const damageToEnemy=collisionDamage(p,Math.max(18,p.speed));
        const damageToPlayer=collisionDamage(e,Math.max(18,e.speed));
        e.hp-=damageToEnemy;p.hp-=damageToPlayer;p.ramCd=.3;e.ramCd=.3;e.hitFlash=.08;shake=8;
        dmgTexts.push({x:e.x,y:e.y-e.r-8,text:Math.round(damageToEnemy),life:.7});dmgTexts.push({x:p.x,y:p.y-p.r-8,text:Math.round(damageToPlayer),life:.7});
        burst((p.x+e.x)/2,(p.y+e.y)/2,'#ff9b55',8);soundHit();
        if(e.hp<=0){const idx=en.indexOf(e);if(idx>=0)killEnemy(e,idx)}
        if(p.hp<=0){die();return;}
      }
    }
  }
  for(let i=ps.length-1;i>=0;i--){const q=ps[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.94;q.vy*=.94;q.life-=dt;if(q.life<=0)ps.splice(i,1)}
  for(let i=dmgTexts.length-1;i>=0;i--){const q=dmgTexts[i];q.y-=24*dt;q.life-=dt;if(q.life<=0)dmgTexts.splice(i,1)}
  shake=Math.max(0,shake-dt*25);
}

function tankBody(cx,cy,r,hullAngle,turretAngle,enemy=false,heavy=false,flash=false,barrelId='85mm',turretId='standard',hullId='standard'){
  x.save();x.translate(cx,cy);x.rotate(hullAngle);

  // T-34-85-inspired top-down proportions:
  // long hull, sharply sloped glacis, rounded rear, wide side tracks and five road wheels.
  const hullScale=hullId==='scout'?.92:hullId==='heavy'?1.12:1;
  const L=r*2.55*hullScale, B=r*1.18*hullScale, trackW=r*.34*hullScale, trackL=L*.92;
  const hullB=r*.88*hullScale;

  // Ground shadow
  x.save();x.rotate(-hullAngle);x.fillStyle='rgba(0,0,0,.34)';
  x.beginPath();x.ellipse(2,5,r*1.48,r*.88,0,0,6.283);x.fill();x.restore();

  // Tracks are on the SIDES of the hull, like a real tank.
  x.fillStyle=flash?'#e2c3a5':(enemy?(heavy?'#292b2c':'#4b3033'):'#242923');
  for(const sy of [-1,1]){
    const ty=sy*(hullB/2+trackW/2);
    x.beginPath();x.roundRect(-trackL/2,ty-trackW/2,trackL,trackW,6);x.fill();
    x.strokeStyle=enemy?(heavy?'#5b5954':'#704347'):'#454c43';x.lineWidth=2;x.stroke();

    // Track inner rail
    x.strokeStyle=enemy?(heavy?'#3c3d3d':'#5b383b'):'#30362f';x.lineWidth=2;
    x.strokeRect(-trackL*.43,ty-trackW*.24,trackL*.86,trackW*.48);

    // Five large T-34-style road wheels.
    for(let i=0;i<5;i++){
      const wx=-trackL*.34+i*(trackL*.17);
      x.fillStyle=enemy?(heavy?'#66635d':'#75464a'):'#555d52';
      x.beginPath();x.arc(wx,ty,r*.16,0,6.283);x.fill();
      x.strokeStyle='#202320';x.lineWidth=1.5;x.stroke();
      x.fillStyle=enemy?(heavy?'#353735':'#4b3033'):'#353b35';
      x.beginPath();x.arc(wx,ty,r*.055,0,6.283);x.fill();
    }

    // Track end/idler hints.
    x.fillStyle=enemy?(heavy?'#77736a':'#875057'):'#697264';
    x.beginPath();x.arc(-trackL*.43,ty,r*.075,0,6.283);x.fill();
    x.beginPath();x.arc(trackL*.43,ty,r*.075,0,6.283);x.fill();
  }

  // Main hull silhouette: pointed/sloped nose, straight sides, rounded rear.
  x.fillStyle=flash?'#e5c6a8':(enemy?(heavy?'#4e4942':'#713d41'):'#526149');
  x.beginPath();
  x.moveTo(L*.50,0);                    // pointed glacis nose
  x.lineTo(L*.34,-hullB*.43);
  x.lineTo(L*.04,-hullB*.54);
  x.lineTo(-L*.32,-hullB*.51);
  x.quadraticCurveTo(-L*.47,-hullB*.43,-L*.48,-hullB*.18);
  x.lineTo(-L*.48,hullB*.18);
  x.quadraticCurveTo(-L*.47,hullB*.43,-L*.32,hullB*.51);
  x.lineTo(L*.04,hullB*.54);
  x.lineTo(L*.34,hullB*.43);
  x.closePath();x.fill();

  // Characteristic sloped glacis.
  x.fillStyle=enemy?(heavy?'#605a52':'#81484c'):'#647258';
  x.beginPath();
  x.moveTo(L*.50,0);x.lineTo(L*.34,-hullB*.43);x.lineTo(L*.04,-hullB*.54);
  x.lineTo(L*.08,-hullB*.22);x.lineTo(L*.31,-hullB*.16);x.closePath();x.fill();

  // Lower hull side bands.
  x.fillStyle=enemy?(heavy?'#393734':'#593337'):'#3f493e';
  x.beginPath();
  x.moveTo(-L*.32,-hullB*.51);x.lineTo(L*.04,-hullB*.54);x.lineTo(L*.08,-hullB*.22);
  x.lineTo(-L*.30,-hullB*.25);x.closePath();x.fill();
  x.beginPath();
  x.moveTo(-L*.32,hullB*.51);x.lineTo(L*.04,hullB*.54);x.lineTo(L*.08,hullB*.22);
  x.lineTo(-L*.30,hullB*.25);x.closePath();x.fill();

  // Engine deck at the rear.
  x.fillStyle=enemy?(heavy?'#373532':'#4f3034'):'#3d473c';
  x.beginPath();
  x.moveTo(-L*.43,-hullB*.34);x.lineTo(-L*.08,-hullB*.39);
  x.lineTo(-L*.02,-hullB*.12);x.lineTo(-L*.36,-hullB*.10);x.closePath();x.fill();
  x.beginPath();
  x.moveTo(-L*.43,hullB*.34);x.lineTo(-L*.08,hullB*.39);
  x.lineTo(-L*.02,hullB*.12);x.lineTo(-L*.36,hullB*.10);x.closePath();x.fill();

  // Engine vents.
  x.strokeStyle=enemy?(heavy?'#625d54':'#744246'):'#5e6a59';x.lineWidth=1.2;
  for(let i=0;i<4;i++){
    const vx=-L*.34+i*r*.075;
    x.beginPath();x.moveTo(vx,-hullB*.30);x.lineTo(vx+.035*r,-hullB*.14);x.stroke();
    x.beginPath();x.moveTo(vx,hullB*.30);x.lineTo(vx+.035*r,hullB*.14);x.stroke();
  }

  // Hull seams and small armor bolts.
  x.strokeStyle=enemy?(heavy?'#777067':'#9a5558'):'#78866d';x.lineWidth=1.2;
  x.beginPath();x.moveTo(-L*.29,-hullB*.50);x.lineTo(-L*.29,hullB*.50);x.stroke();
  x.beginPath();x.moveTo(L*.08,-hullB*.53);x.lineTo(L*.08,hullB*.53);x.stroke();
  x.fillStyle=enemy?(heavy?'#aaa092':'#ad5d60'):'#a1ac91';
  for(const px of [-L*.24,L*.18]){
    for(const py of [-hullB*.42,hullB*.42]){
      x.beginPath();x.arc(px,py,r*.035,0,6.283);x.fill();
    }
  }

  // Turret ring.
  x.fillStyle=enemy?(heavy?'#363432':'#513033'):'#343c34';
  x.beginPath();x.arc(-L*.02,0,r*.57,0,6.283);x.fill();
  x.strokeStyle=enemy?(heavy?'#696258':'#8c4b4f'):'#697760';x.lineWidth=1.4;x.stroke();

  // Rounded T-34-85-inspired turret, independent from hull.
  x.save();x.rotate(turretAngle-hullAngle);
  const visualBarrel=barrels.find(v=>v.id===barrelId)||barrels[0];
  const visualTurret=turrets.find(v=>v.id===turretId)||turrets[0];
  x.fillStyle=enemy?(heavy?'#45413b':'#61373a'):'#424d3f';
  x.beginPath();
  if(visualTurret.id==='fast'){
    x.moveTo(-r*.42,-r*.24);x.lineTo(r*.18,-r*.30);x.quadraticCurveTo(r*.48,-r*.18,r*.48,0);
    x.quadraticCurveTo(r*.48,r*.18,r*.18,r*.30);x.lineTo(-r*.42,r*.24);x.quadraticCurveTo(-r*.52,0,-r*.42,-r*.24);
  }else if(visualTurret.id==='rapid'){
    x.moveTo(-r*.46,-r*.29);x.quadraticCurveTo(-r*.18,-r*.43,r*.18,-r*.38);x.quadraticCurveTo(r*.46,-r*.18,r*.46,0);
    x.quadraticCurveTo(r*.46,r*.18,r*.18,r*.38);x.quadraticCurveTo(-r*.18,r*.43,-r*.46,r*.29);x.quadraticCurveTo(-r*.54,0,-r*.46,-r*.29);
  }else{
    x.moveTo(-r*.48,-r*.30);x.quadraticCurveTo(-r*.28,-r*.48,r*.05,-r*.47);x.lineTo(r*.36,-r*.33);
    x.quadraticCurveTo(r*.55,-r*.17,r*.55,0);x.quadraticCurveTo(r*.55,r*.17,r*.36,r*.33);x.lineTo(r*.05,r*.47);
    x.quadraticCurveTo(-r*.28,r*.48,-r*.48,r*.30);x.quadraticCurveTo(-r*.58,0,-r*.48,-r*.30);
  }
  x.closePath();x.fill();

  // Turret facets / casting details.
  x.strokeStyle=enemy?(heavy?'#746c61':'#925055'):'#7f8b75';x.lineWidth=1.25;
  x.beginPath();x.moveTo(-r*.27,-r*.42);x.quadraticCurveTo(-r*.08,-r*.30,r*.02,-r*.29);x.stroke();
  x.beginPath();x.moveTo(-r*.27,r*.42);x.quadraticCurveTo(-r*.08,r*.30,r*.02,r*.29);x.stroke();

  // Roof hatch.
  x.fillStyle='#292e2a';x.beginPath();x.ellipse(-r*.18,0,r*.17,r*.12,0,0,6.283);x.fill();
  x.strokeStyle='#89967c';x.stroke();

  // Gun mantlet and long 85mm-style barrel.
  x.fillStyle=enemy?'#252729':'#292f2a';
  x.beginPath();x.roundRect(r*.10,-r*.18,r*.34,r*.36,5);x.fill();
  const barrelScale=visualBarrel.scale, barrelLength=visualBarrel.length;
  const barrelWidth=.15*barrelScale;
  x.fillStyle='#151819';x.fillRect(r*.38,-r*barrelWidth/2,r*1.16*barrelLength,r*barrelWidth);
  if(visualBarrel.id==='122mm'){
    x.fillStyle='#0e1112';x.fillRect(r*(1.38*barrelLength),-r*.13,r*.20,r*.26);
    x.fillStyle='#4a5049';x.fillRect(r*.68,-r*.16,r*.16,r*.32);
  }else if(visualBarrel.id==='57mm'){
    x.fillStyle='#0e1112';x.fillRect(r*(1.35*barrelLength),-r*.065,r*.10,r*.13);
  }else{
    x.fillStyle='#0e1112';x.fillRect(r*(1.48*barrelLength),-r*.105,r*.14,r*.21);
  }

  // Small turret fittings.
  x.fillStyle=enemy?(heavy?'#746a5d':'#9b5458'):'#849176';
  x.beginPath();x.arc(-r*.36,-r*.23,r*.04,0,6.283);x.fill();
  x.beginPath();x.arc(-r*.36,r*.23,r*.04,0,6.283);x.fill();

  x.restore();
  x.restore();
}
function draw(){
  if(!p)return;
  x.save();x.clearRect(0,0,W,H);x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  // Cold snowy battlefield background.
  x.fillStyle='#d9dee1';x.fillRect(-20,-20,W+40,H+40);
  x.fillStyle='rgba(255,255,255,.42)';x.fillRect(-20,-20,W+40,H+40);
  x.strokeStyle='rgba(165,174,180,.22)';x.lineWidth=1;
  for(let a=-40;a<W+40;a+=56){x.beginPath();x.moveTo(a,0);x.lineTo(a,H);x.stroke()}
  for(let a=-40;a<H+40;a+=56){x.beginPath();x.moveTo(0,a);x.lineTo(W,a);x.stroke()}
  // Soft snow specks / tracks texture.
  x.fillStyle='rgba(145,155,162,.16)';
  for(let i=0;i<90;i++){const sx=(i*83)%W,sy=(i*47)%H;x.beginPath();x.arc(sx,sy,1.5+(i%3),0,6.283);x.fill()}
  // Static cover walls.
  for(const w of walls){
    x.fillStyle='#7f888c';x.fillRect(w.x+4,w.y+5,w.w,w.h);
    x.fillStyle='#aeb6b9';x.fillRect(w.x,w.y,w.w,w.h);
    x.strokeStyle='#687176';x.lineWidth=2;x.strokeRect(w.x,w.y,w.w,w.h);
    x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=1;x.strokeRect(w.x+3,w.y+3,w.w-6,w.h-6);
    for(let bx=w.x+14;bx<w.x+w.w-8;bx+=28){x.beginPath();x.moveTo(bx,w.y+3);x.lineTo(bx+3,w.y+w.h-3);x.stroke()}
  }
  // 122mm Long charge animation: energy builds around the muzzle for 1 second.
  if(p.railCharging){
    const a=p.turretAngle;
    const chargeBarrel=barrels.find(v=>v.id===p.barrelId)||barrels[3];
    const muzzleDistance=p.r*(.38+1.16*(chargeBarrel.length||1));
    const mx=p.x+Math.cos(a)*muzzleDistance,my=p.y+Math.sin(a)*muzzleDistance;
    const progress=1-p.railCharge;
    x.save();x.translate(mx,my);x.rotate(a);x.globalAlpha=.35+.65*progress;
    x.strokeStyle='#79faff';x.lineWidth=3+5*progress;x.beginPath();x.arc(0,0,8+14*progress,0,6.283);x.stroke();
    x.strokeStyle='#ffffff';x.lineWidth=2;x.beginPath();x.moveTo(5,0);x.lineTo(22+18*progress,0);x.stroke();
    x.fillStyle='#dfffff';x.globalAlpha=.5+.5*progress;x.beginPath();x.arc(0,0,4+7*progress,0,6.283);x.fill();
    x.restore();
  }
  // Railgun beams linger and fade smoothly for 2 seconds.
  for(const b of railBeams){
    const a=Math.max(0,b.life/b.maxLife);
    x.save();x.globalAlpha=a;
    x.lineCap='round';x.strokeStyle='#79faff';x.lineWidth=4*a;x.beginPath();x.moveTo(b.x1,b.y1);x.lineTo(b.x2,b.y2);x.stroke();
    x.strokeStyle='#ffffff';x.lineWidth=1*a;x.beginPath();x.moveTo(b.x1,b.y1);x.lineTo(b.x2,b.y2);x.stroke();
    x.restore();
  }
  // shell trails / explosions
  for(const q of ps){x.globalAlpha=Math.max(0,q.life*2);x.fillStyle=q.col;x.beginPath();x.arc(q.x,q.y,3.5,0,6.283);x.fill()}x.globalAlpha=1;
  for(const b of bs){
    for(let i=b.trail.length-1;i>=0;i--){const t=b.trail[i],a=t.life/.16*.55;x.globalAlpha=a;x.fillStyle='#ff9d24';x.beginPath();x.arc(t.x,t.y,b.r*(1.0+.9*a),0,6.283);x.fill();x.fillStyle='#ffe39a';x.globalAlpha=a*.9;x.beginPath();x.arc(t.x,t.y,b.r*(.55+.7*a),0,6.283);x.fill()}
    x.globalAlpha=1;x.fillStyle='#ff8a00';x.beginPath();x.arc(b.x,b.y,b.r*1.7,0,6.283);x.fill();x.fillStyle='#fff4c2';x.beginPath();x.arc(b.x,b.y,b.r*1.05,0,6.283);x.fill();
  }
  for(const b of ebs){
    for(let i=b.trail.length-1;i>=0;i--){const t=b.trail[i],a=t.life/.16*.5;x.globalAlpha=a;x.fillStyle='#ff4f2f';x.beginPath();x.arc(t.x,t.y,b.r*(.9+.8*a),0,6.283);x.fill();x.fillStyle='#ffc0a8';x.globalAlpha=a*.85;x.beginPath();x.arc(t.x,t.y,b.r*(.5+.6*a),0,6.283);x.fill()}
    x.globalAlpha=1;x.fillStyle='#ff3b18';x.beginPath();x.arc(b.x,b.y,b.r*1.65,0,6.283);x.fill();x.fillStyle='#fff0d8';x.beginPath();x.arc(b.x,b.y,b.r,0,6.283);x.fill();
  }
  // Shell impact flashes/explosions are represented by the particle bursts created on impact.
  for(const e of en){
    tankBody(e.x,e.y,e.r,e.angle,e.turretAngle,true,e.heavy,e.hitFlash>0,e.enemyBarrelId||'85mm',e.turretId||'standard',e.hullId||'standard');
    // Identify the complete enemy loadout directly above the tank.
    const enemyHull=hulls.find(v=>v.id===e.hullId)||hulls[0];
    const enemyTurret=turrets.find(v=>v.id===e.turretId)||turrets[0];
    const enemyGun=barrels.find(v=>v.id===e.enemyBarrelId)||barrels[0];
    const enemyEngine=engines.find(v=>v.id===e.engineId)||engines[0];
    x.font='bold 12px system-ui';
    x.textAlign='center';
    x.textBaseline='bottom';
    x.fillStyle='#20252a';
    x.fillText(enemyHull.name+' • '+enemyTurret.name.replace(' Turret','')+' • '+enemyGun.name.replace(' Barrel','')+' • '+enemyEngine.name.replace(' Engine',''),e.x,e.y-e.r-15);
    if(e.burnTime>0){
      x.globalAlpha=.9;
      x.fillStyle='#ff7a2f';
      x.beginPath();x.arc(e.x-e.r*.25,e.y-e.r*.1,e.r*.32,0,6.283);x.fill();
      x.fillStyle='#ffd35a';
      x.beginPath();x.arc(e.x+e.r*.05,e.y-e.r*.28,e.r*.18,0,6.283);x.fill();
      x.globalAlpha=1;
    }
    const bw=e.r*2.7;x.fillStyle='#252c35';x.fillRect(e.x-bw/2,e.y-e.r-11,bw,5);
    x.fillStyle=e.heavy?'#d28a55':'#d85b68';x.fillRect(e.x-bw/2,e.y-e.r-11,bw*Math.max(0,e.hp/e.max),5);
  }
  if(p.burnTime>0){
    x.globalAlpha=.9;
    x.fillStyle='#ff7a2f';
    x.beginPath();x.arc(p.x-p.r*.25,p.y-p.r*.1,p.r*.32,0,6.283);x.fill();
    x.fillStyle='#ffd35a';
    x.beginPath();x.arc(p.x+p.r*.05,p.y-p.r*.28,p.r*.18,0,6.283);x.fill();
    x.globalAlpha=1;
  }
  tankBody(p.x,p.y,p.r,p.angle,p.turretAngle,false,false,p.inv>0,p.barrelId,p.turretId,p.hullId);
  const barW=p.r*2.7, barX=p.x-barW/2, hpY=p.y-p.r-18, reloadY=p.y-p.r-10;
  const turret=turrets.find(v=>v.id===p.turretId)||turrets[0], barrel=barrels.find(v=>v.id===p.barrelId)||barrels[0];
  const reloadPct=Math.max(0,Math.min(1,1-p.cd/barrel.reloadTime));
  x.fillStyle='#252c35';x.fillRect(barX,hpY,barW,4);x.fillStyle='#e15b64';x.fillRect(barX,hpY,barW*Math.max(0,p.hp/p.max),4);
  x.fillStyle='#252c35';x.fillRect(barX,reloadY,barW,3);x.fillStyle='#ffd21a';x.fillRect(barX,reloadY,barW*reloadPct,3);
  for(const q of dmgTexts){x.globalAlpha=Math.max(0,q.life/.7);x.fillStyle='#ffd27a';x.font='bold 13px system-ui';x.textAlign='center';x.fillText('-'+q.text,q.x,q.y);x.globalAlpha=1}
  x.restore();

  const hp=Math.max(0,p.hp/p.max),xp=Math.max(0,p.xp/p.next);
  $('hpBar').style.width=hp*100+'%';$('xpBar').style.width=xp*100+'%';$('coinsText').textContent=p.coins;
  $('hpText').textContent=Math.ceil(Math.max(0,p.hp))+'/'+p.max;$('xpText').textContent=p.xp+'/'+p.next;
  $('levelText').textContent=p.lv;$('coinsText').textContent=p.coins;$('killsText').textContent=p.kills;
  $('reloadBar').style.width=(reloadPct*100)+'%';$('damageText').textContent=barrel.damage;$('reloadText').textContent=p.cd>0?'RELOADING':'RELOAD TIME';$('reloadText').style.color=p.cd>0?'#ff4b4b':'#39e66b';
  // Show the live reload countdown beside the cursor.
  // Live dispersion reticle: its size directly represents the current shot spread.
  const accuracy=Math.max(0,Math.min(1,p.aimPrecision));
  const precisionRadius=18+122*(1-accuracy);
  x.save();
  x.strokeStyle=accuracy<.5?'#ff4b4b':accuracy<1?'#ffd21a':'#39e66b';
  x.lineWidth=accuracy<.5?2.5:accuracy<1?2:1.5;
  x.globalAlpha=.9;
  x.beginPath();x.arc(mouse.x,mouse.y,precisionRadius,0,6.283);x.stroke();
  x.beginPath();x.moveTo(mouse.x-precisionRadius-5,mouse.y);x.lineTo(mouse.x-precisionRadius+4,mouse.y);x.moveTo(mouse.x+precisionRadius-4,mouse.y);x.lineTo(mouse.x+precisionRadius+5,mouse.y);x.moveTo(mouse.x,mouse.y-precisionRadius-5);x.lineTo(mouse.x,mouse.y-precisionRadius+4);x.moveTo(mouse.x,mouse.y+precisionRadius-4);x.lineTo(mouse.x,mouse.y+precisionRadius+5);x.stroke();x.restore();
  const cursorReload=$('cursorReload');
  if(cursorReload){
    const activeBarrel=barrels.find(v=>v.id===p.barrelId)||barrels[0];
    cursorReload.textContent=p.cd>0?Math.max(0,p.cd).toFixed(2):activeBarrel.reloadTime.toFixed(2);
    cursorReload.hidden=false;
    cursorReload.style.color=p.cd>0?'#ff4b4b':'#39e66b';
    cursorReload.style.left=(mouse.x+18)+'px';
    cursorReload.style.top=(mouse.y+8)+'px';
  }
}
function setMobileButton(id,key){
  const el=$(id); if(!el)return;
  const press=e=>{e.preventDefault();mobileDrive[key]=true;el.classList.add('pressed');el.setPointerCapture?.(e.pointerId)};
  const release=e=>{e.preventDefault();mobileDrive[key]=false;el.classList.remove('pressed')};
  el.addEventListener('pointerdown',press);
  el.addEventListener('pointerup',release);
  el.addEventListener('pointercancel',release);
  el.addEventListener('lostpointercapture',()=>{mobileDrive[key]=false;el.classList.remove('pressed')});
}
setMobileButton('upButton','up');
setMobileButton('downButton','down');
setMobileButton('leftButton','left');
setMobileButton('rightButton','right');
const fireButton=$('fireButton');
if(fireButton){
  const startFire=e=>{
    e.preventDefault();
    mobileFire=true;
    mouse.down=true;
    if(e.pointerId!=null)fireButton.setPointerCapture?.(e.pointerId);
    shoot();
  };
  const stopFire=e=>{
    e.preventDefault();
    mobileFire=false;
    mouse.down=false;
  };
  fireButton.addEventListener('pointerdown',startFire);
  fireButton.addEventListener('pointerup',stopFire);
  fireButton.addEventListener('pointercancel',stopFire);
  fireButton.addEventListener('lostpointercapture',()=>{mobileFire=false});
  fireButton.addEventListener('touchstart',startFire,{passive:false});
  fireButton.addEventListener('touchend',stopFire,{passive:false});
  fireButton.addEventListener('touchcancel',stopFire,{passive:false});
}
function frame(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(frame)}
reset();showMenu();requestAnimationFrame(frame);