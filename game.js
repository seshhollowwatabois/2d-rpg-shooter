const c=document.getElementById('game'),x=c.getContext('2d'),$=id=>document.getElementById(id);
let W,H,last=0,spawn=0,over=false,p,en=[],bs=[],ebs=[],ps=[],dmgTexts=[],walls=[];
let wave=1,waveRemaining=0,waveStarted=false,waveClearTimer=0;
let gameScreen='menu',autoSaveTimer=0;
const keys=new Set(),mouse={x:0,y:0,down:false},touch={active:false,x:0,y:0};
const mobileDrive={up:false,down:false,left:false,right:false};
let mobileFire=false;
const hulls=[
  {id:'scout',name:'Wasp',cost:50,hp:90,speed:155,reverse:95,turn:2.1,scale:1},
  {id:'standard',name:'Hornet',cost:0,hp:120,speed:120,reverse:75,turn:1.65,scale:1},
  {id:'heavy',name:'Titan',cost:80,hp:180,speed:90,reverse:60,turn:1.15,scale:1.12}
];
const turrets=[
  {id:'standard',name:'Smoky',cost:0,turn:1.25,hp:0,scale:1},
  {id:'rapid',name:'Twins',cost:0,turn:2.4,scale:.9},
  {id:'fast',name:'Firebird',cost:0,turn:3.4,scale:.82},
  {id:'railgun',name:'Railgun',cost:0,turn:1.05,scale:1.08}
];
const engines=[
  {id:'standard',name:'Standard Engine',cost:0,speed:1,turn:1},
  {id:'upgraded',name:'Upgraded Engine',cost:0,speed:1.10,turn:1.10},
  {id:'better',name:'Better Engine',cost:0,speed:1.20,turn:1.20}
];
const barrels=[
  {id:'57mm',name:'57mm Barrel',cost:0,minDamage:30,maxDamage:35,reloadTime:2,scale:.82,length:.82,instant:true,critChance:.10},
  {id:'85mm',name:'Twin 85mm Barrels',cost:0,minDamage:8,maxDamage:10,reloadTime:.3,scale:1,length:1},
  {id:'122mm',name:'Firebird',cost:0,minDamage:20,maxDamage:21,reloadTime:0.5,scale:1.05,length:1.05,flame:true,range:230,cone:.42},
  {id:'122mmLong',name:'Railgun',cost:0,minDamage:90,maxDamage:110,reloadTime:10,scale:1.28,length:1.65,instant:true,railTier:0}
];
function gunForTurret(turretId){
  if(turretId==='rapid')return barrels.find(v=>v.id==='85mm')||barrels[1];
  if(turretId==='fast')return barrels.find(v=>v.id==='122mm')||barrels[2];
  if(turretId==='railgun')return barrels.find(v=>v.id==='122mmLong')||barrels[3];
  return barrels.find(v=>v.id==='57mm')||barrels[0];
}
function turretForPlayer(){
  const t=turrets.find(v=>v.id===p?.turretId)||turrets[0];
  if(t.id==='railgun'){
    const tier=railgunTiers[Math.max(0,Math.min(3,railgunTier))];
    return {...t,turn:t.turn*(tier.turnMult||1)};
  }
  return t;
}
const railgunTiers=[
  {tier:0,name:'Standard Railgun',beam:'#79faff',glow:'#bffcff',damageMult:1,reloadMult:1,pierceDamageMult:.50,hullMoveMult:1,turnMult:1},
  {tier:1,name:'Railgun Tier 1',beam:'#145dff',glow:'#5c8dff',damageMult:1.2,reloadMult:.75,pierceDamageMult:.67,hullMoveMult:.80,turnMult:1.8},
  {tier:2,name:'Railgun Tier 2',beam:'#a13cff',glow:'#d58cff',damageMult:1.44,reloadMult:.50,pierceDamageMult:.83,hullMoveMult:.60,turnMult:2.8},
  {tier:3,name:'Railgun Tier 3',beam:'#ffd23f',glow:'#fff0a0',damageMult:1.728,reloadMult:.30,pierceDamageMult:1,hullMoveMult:.40,turnMult:4}
];
const firebirdTiers=[
  {tier:0,name:'Standard Firebird',directBonus:0,burnBonus:0,range:230,flame:'#ff5a18',core:'#fff1a6',accent:'#ffb52e'},
  {tier:1,name:'Firebird Tier 1',directBonus:5,burnBonus:1,range:280,flame:'#b83b16',core:'#ffd08a',accent:'#d86a22'},
  {tier:2,name:'Firebird Tier 2',directBonus:10,burnBonus:2,range:330,flame:'#8d35d6',core:'#e2a0ff',accent:'#b85cff'},
  {tier:3,name:'Firebird Tier 3',directBonus:15,burnBonus:3,range:380,flame:'#d51f24',core:'#ffb0a0',accent:'#ff4a32'}
];
let ownedHulls=JSON.parse(localStorage.getItem('tankOwnedHulls')||'["standard"]');
let ownedTurrets=JSON.parse(localStorage.getItem('tankOwnedTurrets')||'["standard"]');
let ownedEngines=JSON.parse(localStorage.getItem('tankOwnedEngines')||'["standard"]');
let equippedHull=localStorage.getItem('tankEquippedHull')||'standard';
let equippedTurret=localStorage.getItem('tankEquippedTurret')||'standard';
let equippedEngine=localStorage.getItem('tankEquippedEngine')||'standard';
let railgunTier=Number(localStorage.getItem('tankRailgunTier')||0);
let railgunOwnedTier=Math.max(railgunTier,Number(localStorage.getItem('tankRailgunOwnedTier')||0));
let firebirdTier=Number(localStorage.getItem('tankFirebirdTier')||0);
let firebirdOwnedTier=Math.max(firebirdTier,Number(localStorage.getItem('tankFirebirdOwnedTier')||0));

// All turret variants are free equipment. Normalize older saves so newer turrets
// (including Railgun) cannot disappear from the player's equipment list.
function normalizeOwnedEquipment(){
  for(const t of turrets)if(!ownedTurrets.includes(t.id))ownedTurrets.push(t.id);
  for(const h of hulls)if(h.cost===0&&!ownedHulls.includes(h.id))ownedHulls.push(h.id);
  for(const e of engines)if(e.cost===0&&!ownedEngines.includes(e.id))ownedEngines.push(e.id);
}
normalizeOwnedEquipment();

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
function impactExplosion(a,b,col='#ffd27a',n=20){
  burst(a,b,col,n);
  for(let i=0;i<6;i++){
    const q=Math.random()*6.283,s=55+Math.random()*120;
    ps.push({x:a,y:b,vx:Math.cos(q)*s,vy:Math.sin(q)*s,life:.18+Math.random()*.22,col});
  }
}
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


function saveCurrent(){ saveShop(); }
function showMenu(){
  stopEngineSound();
  gameScreen='menu';over=true;$('mainMenu').hidden=false;$('shop').classList.remove('open');$('death').hidden=true;$('cursorReload').hidden=true;
}
function showGame(){
  gameScreen='game';$('mainMenu').hidden=true;$('shop').classList.remove('open');$('death').hidden=true;over=false;autoSaveTimer=0;
}
document.querySelectorAll('.shopTab').forEach(tab=>{tab.onclick=()=>{initAudio();soundUi();shopCategory=tab.dataset.shopCategory;renderShop()}});

function openMenuShop(){
  initAudio();soundUi();$('mainMenu').hidden=true;$('shop').classList.add('open');renderShop();
}
function startNewGame(){ initAudio();soundUi(); reset();p.coins=0;p.lv=1;p.xp=0;p.next=120;p.kills=0;saveShop();showGame(); }
function reset(){
  const hull=hulls.find(v=>v.id===equippedHull)||hulls[0], turret=turrets.find(v=>v.id===equippedTurret)||turrets[0], engine=engines.find(v=>v.id===equippedEngine)||engines[0];
  const totalHp=hull.hp;
  p={x:W/2,y:H/2,r:20*hull.scale,speed:hull.speed*engine.speed,hp:totalHp,max:totalHp,lv:1,xp:0,next:120,coins:0,kills:0,cd:0,inv:0,angle:0,turretAngle:0,burnStacks:0,burnTick:1,railCharging:false,railCharge:0,firebirdFuel:5,firebirdMaxFuel:5,firebirdActive:false,firebirdTier:firebirdTier,hullId:hull.id,turretId:turret.id};
  en=[];deadTanks=[];bs=[];ebs=[];ps=[];dmgTexts=[];spawn=.8;over=false;wave=1;waveRemaining=waveSize(wave);waveStarted=true;waveClearTimer=0;
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
$('mainMenuButton').onclick=()=>{initAudio();soundUi();showMenu()};
$('shopClose').onclick=()=>{initAudio();soundUi();$('shop').classList.remove('open');$('mainMenu').hidden=false};
$('shopBack').onclick=()=>{initAudio();soundUi();showMenu()};
$('menuShop').onclick=openMenuShop;
$('startGame').onclick=startNewGame;
$('restart').onclick=()=>{initAudio();soundUi();reset();showGame()};
$('deathMenu').onclick=()=>{initAudio();soundUi();showMenu()};

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
    const engineId=pickEnemyEngine();
  const hull=hulls.find(v=>v.id===hullId)||hulls[0];
  const turret=turrets.find(v=>v.id===turretId)||turrets[0];
  const engine=engines.find(v=>v.id===engineId)||engines[0];
  const heavy=hullId==='heavy';
  const mass=hullId==='heavy'?1.8:hullId==='scout'?0.65:1;
  const enemyFirebirdTier=turretId==='fast'?Math.min(3,Math.floor((wave-1)/4)):0;

  // Enemy HP matches the selected hull's HP exactly; turrets provide no HP bonus.
  const hp=hull.hp;

  en.push({
    x:a,y:b,
    r:20*hull.scale,
    speed:hull.speed*.4*engine.speed,
    turnRate:hull.turn*engine.turn,
    hp,max:hp,dmg:heavy?35:20,
    heavy,hullId,turretId,engineId,
    angle:0,turretAngle:0,fire:.8+Math.random()*1.5,hitFlash:0,burnStacks:0,burnDamage:3,firebirdTier:enemyFirebirdTier,
    wanderX:Math.random()*W,wanderY:Math.random()*H,wanderTime:1+Math.random()*3,
    idle:Math.random()<.3
  });
  waveRemaining--;
}
function playerTurretWorldPosition(){
  const hull=p?.hullId||equippedHull||'standard';
  const isWasp=hull==='scout',isTitan=hull==='heavy';
  const L=p.r*2.55*(isTitan?1.10:isWasp?.94:1);
  const turretX=isWasp?-L*.22:isTitan?L*.18:0;
  const ca=Math.cos(p.angle),sa=Math.sin(p.angle);
  return {x:p.x+ca*turretX,y:p.y+sa*turretX};
}
function playerMuzzlePosition(barrel,angle){
  const t=playerTurretWorldPosition();
  const d=p.r*(.35+1.16*(barrel.length||1));
  return {x:t.x+Math.cos(angle)*d,y:t.y+Math.sin(angle)*d};
}
function fireRailgun(){
  const barrel=gunForTurret(p.turretId);
  const fireAngle=p.turretAngle;
  // Start the beam at the actual end of the long gun barrel, not at the turret center.
  const muzzle=playerMuzzlePosition(barrel,fireAngle);
  const muzzleX=muzzle.x,muzzleY=muzzle.y;
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

  const railTier=railgunTiers[Math.max(0,Math.min(3,railgunTier))];
  const baseDamage=(barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage))*railTier.damageMult;
  for(let i=0;i<pierced.length;i++){
    const target=pierced[i].e;
    if(!en.includes(target))continue;
    const damage=baseDamage*Math.pow(railTier.pierceDamageMult||.5,i);
    applyBulletHit(target,damage,target.x,target.y);
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
  const barrel=gunForTurret(p.turretId);
  if(barrel.id==='122mm'&&barrel.flame&&p.firebirdFuel<=0)return;
  if(barrel.id==='122mmLong'){
    if(!p.railCharging){p.railCharging=true;p.railCharge=1;soundRailCharge();}
    return;
  }
  const fireAngle=p.turretAngle;
  const ca=Math.cos(fireAngle),sa=Math.sin(fireAngle);
  const muzzle=playerMuzzlePosition(barrel,fireAngle);

  // Smoky fires an instant shell: no travel time or projectile velocity.
  // The first enemy in the line of fire is hit immediately, unless a wall blocks it.
  if(barrel.id==='57mm'&&barrel.instant){
    let best=null,bestDist=1400;
    for(const e of en){
      const dx=e.x-muzzle.x,dy=e.y-muzzle.y;
      const along=dx*ca+dy*sa,side=Math.abs(dx*sa-dy*ca);
      if(along<=0||along>=bestDist||side>e.r)continue;
      if(wallRayHit(muzzle.x,muzzle.y,fireAngle,along))continue;
      best=e;bestDist=along;
    }
    if(best){
      const hitX=muzzle.x+ca*bestDist,hitY=muzzle.y+sa*bestDist;
      const dmg=barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage);
      applyBulletHit(best,dmg,hitX,hitY,null,barrel.critChance||0);
      impactExplosion(hitX,hitY,'#ffd27a',24);
      if(best.hp<=0){
        const j=en.indexOf(best);
        if(j>=0)killEnemy(best,j);
      }
    }else{
      impactExplosion(muzzle.x+ca*34,muzzle.y+sa*34,'#ffd27a',10);
    }
    soundFire(barrel.id);
    p.cd=barrel.reloadTime;
    return;
  }

  // Firebird is a continuous flamethrower: visual flame stays active while held,
  // but damage is applied only on each 0.50s tick (including the first tick).
  if(barrel.id==='122mm'&&barrel.flame){
    const tier=firebirdTiers[Math.max(0,Math.min(3,firebirdTier))]||firebirdTiers[0];
    const range=tier.range||barrel.range||230;
    for(const e of [...en]){
      // The rendered Firebird particles are the hitbox.
      if(!flameParticleHit(e,p))continue;
      const dist=Math.hypot(e.x-muzzle.x,e.y-muzzle.y);
      const damageFalloff=1-Math.min(1,dist/range);
      const minDamage=10+tier.directBonus,maxDamage=21+tier.directBonus;
      const dmg=minDamage+(maxDamage-minDamage)*damageFalloff;
      applyBulletHit(e,dmg,e.x,e.y,null,0);
      applyBurn(e,firebirdTier);
      if(e.hp<=0){
        const j=en.indexOf(e);
        if(j>=0)killEnemy(e,j);
      }
    }
    soundFire(barrel.id);
    p.cd=barrel.reloadTime;
    return;
  }

  const speed=({"85mm":900,"122mm":1600}[barrel.id]||1300);
  if(p.turretId==='rapid'){
    // Twins: one click fires ONE barrel. Alternate left/right on each shot.
    const side=.12*p.r;
    const offset=p.twinsNextBarrel===1?side:-side;
    const muzzleX=muzzle.x-sa*offset,muzzleY=muzzle.y+ca*offset;
    const dmg=barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage);
    bs.push({x:muzzleX,y:muzzleY,vx:ca*speed,vy:sa*speed,r:2.8,life:1.8,dmg,trail:[],col:'#3da9ff'});
    burst(muzzleX,muzzleY,'#3da9ff',5);
    soundFire(barrel.id);
    p.twinsNextBarrel=p.twinsNextBarrel===1?-1:1;
  }else{
    const muzzleX=muzzle.x,muzzleY=muzzle.y;
    const dmg=barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage);
    bs.push({x:muzzleX,y:muzzleY,vx:ca*speed,vy:sa*speed,r:2.8,life:1.8,dmg,trail:[]});
    burst(muzzleX,muzzleY,'#ffd27a',6);
  }
  const actualReloadTime=barrel.reloadTime;
  p.cd=actualReloadTime;if(p.turretId!=='rapid')soundFire(barrel.id);
}
function getHitProfile(target,bx,by){
  const hitAngle=Math.atan2(by-target.y,bx-target.x);
  const local=((hitAngle-target.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
  const c=Math.cos(local);
  if(c>=.5)return {rear:false,zone:'front'};
  if(c<=-.5)return {rear:true,zone:'rear'};
  return {rear:false,zone:'side'};
}
function applyBurn(target,tierIndex=0){
  // Each Firebird hit applies 1 burn stack, up to 5 stacks.
  // Firebird tiers also increase the damage dealt by each burn tick.
  target.burnStacks=Math.min(5,(target.burnStacks||0)+1);
  target.burnDamage=3+(firebirdTiers[Math.max(0,Math.min(3,tierIndex))]?.burnBonus||0);
  target.burnTick=1;
  const tier=firebirdTiers[Math.max(0,Math.min(3,tierIndex))]||firebirdTiers[0];
  burst(target.x,target.y,tier.flame,10);
  target.hitFlash=.05;
}
function flameParticleHit(target,owner){
  // The flame's visible circles ARE its hitboxes. Use the exact same center/radius
  // that draw() uses, with no separate range/cone approximation.
  for(const q of ps){
    if(!q.flameHit||q.flameOwner!==owner||q.life<=0)continue;
    const rr=q.size||3.5;
    const dx=target.x-q.x,dy=target.y-q.y;
    if(dx*dx+dy*dy<=(target.r+rr)*(target.r+rr))return true;
  }
  return false;
}
function spawnFlameParticles(owner,muzzle,angle,tier,cone,range,count=18){
  // Build the visible flame and its collider from the same data. A terminal
  // particle guarantees the rendered flame and effective maximum reach agree.
  const particles=[];
  for(let i=0;i<count;i++){
    const t=count<=1?1:(i+1)/count;
    const d=18+t*(range-18);
    const spread=(Math.random()-.5)*cone*1.7*(.35+.65*t);
    const a=angle+spread;
    if(wallRayHit(muzzle.x,muzzle.y,a,d))continue;
    const size=5+Math.random()*5;
    particles.push({x:muzzle.x+Math.cos(a)*d,y:muzzle.y+Math.sin(a)*d,vx:0,vy:0,life:.12+Math.random()*.18,col:Math.random()<.55?tier.flame:Math.random()<.7?tier.accent:tier.core,size,flameHit:true,flameOwner:owner});
  }
  for(const q of particles)ps.push(q);
}
function applyBulletHit(target,baseDamage,bx,by,b=null,critChance=0){
  const profile=getHitProfile(target,bx,by);
  const critical=critChance>0&&Math.random()<critChance;
  const damage=critical?baseDamage*2:baseDamage;
  target.hp-=damage;
  target.hitFlash=.08;
  dmgTexts.push({x:target.x,y:target.y-target.r-8,text:Math.round(damage)+(critical?' CRIT':''),life:.7,col:'#ff3b3b'});
  impactExplosion(bx,by,critical?'#fff07a':'#ffd27a',critical?26:18);
  soundImpact(true);
  return {profile,ricochet:false,critical};
}
function enemyShoot(e){
  const a=Math.atan2(p.y-e.y,p.x-e.x);e.turretAngle=a;
  const barrel=gunForTurret(e.turretId);
  const ca=Math.cos(a),sa=Math.sin(a);
  if(barrel.id==='122mm'&&barrel.flame){
    // The visible flame particles are also the only damage hitbox.
    const range=(firebirdTiers[Math.max(0,Math.min(3,e.firebirdTier||0))]||firebirdTiers[0]).range||barrel.range||230;
    const cone=barrel.cone||.42;
    const tierIndex=Math.max(0,Math.min(3,e.firebirdTier||0));
    const tier=firebirdTiers[tierIndex]||firebirdTiers[0];
    spawnFlameParticles(e,{x:e.x,y:e.y},a,tier,cone,range,18);
    if(flameParticleHit(p,e)&&e.fire<=0){
      const dist=Math.hypot(p.x-e.x,p.y-e.y);
      const damageFalloff=1-Math.min(1,dist/range);
      const minDamage=10+tier.directBonus,maxDamage=21+tier.directBonus;
      const damage=minDamage+(maxDamage-minDamage)*damageFalloff;
      applyBulletHit(p,damage,p.x,p.y,null,0);
      applyBurn(p,tierIndex);
      e.fire=barrel.reloadTime;
      if(p.hp<=0){p.hp=0;die();return;}
    }
    if(flameParticleHit(p,e))burst(e.x+ca*e.r,e.y+sa*e.r,'#ff6a22',2);
    return;
  }else if(barrel.instant){
    const damage=barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage);
    const range=1400,dx=p.x-e.x,dy=p.y-e.y,along=dx*ca+dy*sa,side=Math.abs(dx*sa-dy*ca);
    if(along>0&&along<range&&side<=p.r&&!wallRayHit(e.x,e.y,a,along)){
      applyBulletHit(p,damage,p.x,p.y,null,barrel.critChance||0);
      // Instant-hit enemy weapons must also trigger the player's death check.
      if(p.hp<=0){
        p.hp=0;
        die();
        return;
      }
    }
  }else{
    const speed=({"57mm":1000,"85mm":900,"122mm":1600}[barrel.id]||1300);
    if(e.turretId==='rapid'){
      // Enemy Twins: one projectile per reload, alternating barrels.
      const side=.12*e.r;
      const offset=e.twinsNextBarrel===1?side:-side;
      const damage=barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage);
      const mx=e.x+ca*(e.r+10)-sa*offset,my=e.y+sa*(e.r+10)+ca*offset;
      ebs.push({x:mx,y:my,vx:ca*speed,vy:sa*speed,r:2.5,life:2.4,dmg:damage,trail:[],col:'#3da9ff'});
      burst(mx,my,'#3da9ff',3);
      soundFire(barrel.id);
      e.twinsNextBarrel=e.twinsNextBarrel===1?-1:1;
    }else{
      const damage=barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage);
      ebs.push({x:e.x+ca*(e.r+10),y:e.y+sa*(e.r+10),vx:ca*speed,vy:sa*speed,r:2.5,life:2.4,dmg:damage,trail:[]});
    }
  }
  e.fire=barrel.reloadTime;
  burst(e.x+ca*e.r,e.y+sa*e.r,barrel.instant?'#ffd27a':'#ff875f',barrel.instant?9:4);if(e.turretId!=='rapid')soundFire(barrel.id);
}
function killEnemy(e,j){
  // Keep the tank's momentum for one second after death, then ease it smoothly to a stop.
  // This makes moving tanks feel like they have weight instead of freezing instantly.
  e.deathDrift=1;
  e.deathVx=Number.isFinite(e.vx)?e.vx:0;
  e.deathVy=Number.isFinite(e.vy)?e.vy:0;
  p.kills++;p.coins+=e.heavy?15:7;addXp(e.heavy?70:35);
  burst(e.x,e.y,e.heavy?'#c77d52':'#d85b68',28);soundExplosion();
  e.dead=true;e.corpseTime=5;e.hitFlash=0;e.fire=0;
  deadTanks.push(e);en.splice(j,1);
}
function die(){saveCurrent();gameScreen='game';over=true;stopEngineSound();$('deathStats').textContent='Wave '+wave+' • Level '+p.lv+' • '+p.kills+' kills • '+p.coins+' coins';$('death').hidden=false;$('cursorReload').hidden=true;}
function hullForPlayer(){return hulls.find(v=>v.id===p.hullId)||hulls[0]}
function saveShop(){
  localStorage.setItem('tankOwnedHulls',JSON.stringify(ownedHulls));
  localStorage.setItem('tankOwnedTurrets',JSON.stringify(ownedTurrets));
    localStorage.setItem('tankEquippedHull',equippedHull);
  localStorage.setItem('tankEquippedTurret',equippedTurret);
    localStorage.setItem('tankOwnedEngines',JSON.stringify(ownedEngines));
  localStorage.setItem('tankEquippedEngine',equippedEngine);
  localStorage.setItem('tankRailgunTier',String(railgunTier));
  localStorage.setItem('tankRailgunOwnedTier',String(railgunOwnedTier));
  localStorage.setItem('tankFirebirdTier',String(firebirdTier));
  localStorage.setItem('tankFirebirdOwnedTier',String(firebirdOwnedTier));
}
let shopCategory='hull',selectedShopItem=null;

function renderShop(){
  const box=$('shopItems'); if(!box)return;
  box.innerHTML='';
  document.querySelectorAll('.shopTab').forEach(tab=>tab.classList.toggle('active',tab.dataset.shopCategory===shopCategory));

  const preview=(type,item)=>{
    const cv=document.createElement('canvas');cv.width=120;cv.height=64;cv.className='shopPreview';
    const q=cv.getContext('2d');q.clearRect(0,0,120,64);q.translate(60,32);
    q.fillStyle='#d9dee1';q.fillRect(-60,-32,120,64);
    q.fillStyle='rgba(255,255,255,.45)';q.fillRect(-60,-32,120,64);
    q.strokeStyle='rgba(120,130,135,.25)';q.strokeRect(-58,-30,116,60);

    if(type==='hull'){
      // Shop hull preview mirrors the same chassis proportions and geometry
      // used by tankBody(), including tracks, wheel count and turret placement.
      const sc=item.scale*.78;
      const isWasp=item.id==='scout',isHornet=item.id==='standard',isTitan=item.id==='heavy';
      const rr=22*sc;
      const L=rr*2.55*(isTitan?1.10:isWasp?.94:1);
      const B=rr*1.18*(isTitan?1.08:isWasp?.90:1);
      const trackW=rr*(isTitan?.42:isWasp?.25:.34);
      const trackL=L*(isTitan?1.02:isWasp?.82:.94);
      const hullB=B*(isTitan?1.02:isWasp?.84:1);
      const turretX=isWasp?-L*.22:isTitan?L*.18:0;

      q.save();
      q.rotate(0);
      q.fillStyle='rgba(0,0,0,.24)';
      q.beginPath();q.ellipse(3,5,rr*(isTitan?1.65:1.40),rr*(isTitan?1.0:.80),0,0,6.283);q.fill();

      const trackDark='#202520',trackEdge='#4a5148',wheelOuter='#596158',wheelInner='#303530';
      for(const sy of [-1,1]){
        const ty=sy*(hullB/2+trackW/2);
        q.fillStyle=trackDark;
        q.beginPath();q.roundRect(-trackL/2,ty-trackW/2,trackL,trackW,7);q.fill();
        q.strokeStyle=trackEdge;q.lineWidth=1.5;q.stroke();
        const wheels=isWasp?4:isTitan?6:5;
        for(let i=0;i<wheels;i++){
          const wx=-trackL*.38+i*(trackL*.76/Math.max(1,wheels-1));
          const wr=rr*(isTitan?.18:isWasp?.13:.16);
          q.fillStyle=wheelOuter;q.beginPath();q.arc(wx,ty,wr,0,6.283);q.fill();
          q.strokeStyle='#202320';q.lineWidth=1;q.stroke();
          q.fillStyle=wheelInner;q.beginPath();q.arc(wx,ty,wr*.34,0,6.283);q.fill();
        }
      }

      const body=isTitan?'#4b5747':isWasp?'#506347':'#566b4c';
      const bodyDark=isTitan?'#30382f':isWasp?'#354238':'#384337';
      const bodyLight=isTitan?'#687563':isWasp?'#758267':'#74836a';
      const metal='#a3aaa3';

      q.fillStyle=body;q.beginPath();
      if(isWasp){
        q.moveTo(L*.54,0);q.lineTo(L*.27,-hullB*.38);q.lineTo(-L*.30,-hullB*.34);
        q.lineTo(-L*.49,-hullB*.20);q.lineTo(-L*.49,hullB*.20);q.lineTo(-L*.30,hullB*.34);
        q.lineTo(L*.27,hullB*.38);
      }else if(isTitan){
        q.moveTo(L*.43,-hullB*.30);q.lineTo(L*.22,-hullB*.52);q.lineTo(-L*.42,-hullB*.56);
        q.lineTo(-L*.56,-hullB*.36);q.lineTo(-L*.56,hullB*.36);q.lineTo(-L*.42,hullB*.56);
        q.lineTo(L*.22,hullB*.52);q.lineTo(L*.43,hullB*.30);
      }else{
        q.moveTo(L*.55,-hullB*.13);q.quadraticCurveTo(L*.40,-hullB*.46,L*.08,-hullB*.50);
        q.lineTo(-L*.35,-hullB*.42);q.lineTo(-L*.51,-hullB*.20);q.lineTo(-L*.51,hullB*.20);
        q.lineTo(-L*.35,hullB*.42);q.lineTo(L*.08,hullB*.50);
        q.quadraticCurveTo(L*.40,hullB*.46,L*.55,hullB*.13);
      }
      q.closePath();q.fill();

      q.fillStyle=bodyLight;q.beginPath();
      if(isWasp){
        q.moveTo(L*.38,0);q.lineTo(L*.18,-hullB*.28);q.lineTo(-L*.27,-hullB*.25);
        q.lineTo(-L*.34,0);q.lineTo(-L*.27,hullB*.25);q.lineTo(L*.18,hullB*.28);
      }else if(isTitan){
        q.moveTo(L*.28,-hullB*.32);q.lineTo(-L*.30,-hullB*.38);q.lineTo(-L*.43,-hullB*.24);
        q.lineTo(-L*.43,hullB*.24);q.lineTo(-L*.30,hullB*.38);q.lineTo(L*.28,hullB*.32);
        q.lineTo(L*.35,hullB*.15);q.lineTo(L*.35,-hullB*.15);
      }else{
        q.moveTo(L*.38,-hullB*.34);q.lineTo(L*.02,-hullB*.39);q.lineTo(-L*.32,-hullB*.27);
        q.quadraticCurveTo(-L*.42,0,-L*.32,hullB*.27);q.lineTo(L*.02,hullB*.39);
        q.lineTo(L*.38,hullB*.34);q.lineTo(L*.46,0);
      }
      q.closePath();q.fill();

      if(isWasp){
        q.fillStyle=metal;
        q.beginPath();q.moveTo(L*.31,-hullB*.33);q.lineTo(L*.54,0);q.lineTo(L*.31,hullB*.33);
        q.lineTo(L*.18,hullB*.22);q.lineTo(L*.39,0);q.lineTo(L*.18,-hullB*.22);q.closePath();q.fill();
        q.fillStyle=bodyDark;q.fillRect(-L*.34,-hullB*.42,L*.58,hullB*.07);q.fillRect(-L*.34,hullB*.35,L*.58,hullB*.07);
        q.fillStyle=metal;q.fillRect(-L*.40,-hullB*.29,L*.16,hullB*.58);
      }else if(isHornet){
        q.fillStyle=metal;
        q.beginPath();q.moveTo(L*.27,-hullB*.47);q.lineTo(L*.02,-hullB*.36);q.lineTo(-L*.12,-hullB*.22);q.lineTo(L*.28,-hullB*.29);q.closePath();q.fill();
        q.beginPath();q.moveTo(L*.27,hullB*.47);q.lineTo(L*.02,hullB*.36);q.lineTo(-L*.12,hullB*.22);q.lineTo(L*.28,hullB*.29);q.closePath();q.fill();
        q.fillStyle=bodyDark;
        q.beginPath();q.moveTo(-L*.28,-hullB*.48);q.lineTo(L*.02,-hullB*.44);q.lineTo(-L*.18,-hullB*.63);q.lineTo(-L*.46,-hullB*.48);q.closePath();q.fill();
        q.beginPath();q.moveTo(-L*.28,hullB*.48);q.lineTo(L*.02,hullB*.44);q.lineTo(-L*.18,hullB*.63);q.lineTo(-L*.46,hullB*.48);q.closePath();q.fill();
      }else{
        q.fillStyle=metal;
        q.beginPath();q.moveTo(L*.40,-hullB*.31);q.lineTo(L*.20,-hullB*.48);q.lineTo(-L*.05,-hullB*.42);q.lineTo(L*.13,-hullB*.25);q.closePath();q.fill();
        q.beginPath();q.moveTo(L*.40,hullB*.31);q.lineTo(L*.20,hullB*.48);q.lineTo(-L*.05,hullB*.42);q.lineTo(L*.13,hullB*.25);q.closePath();q.fill();
        q.fillStyle=bodyDark;q.fillRect(-L*.46,-hullB*.46,L*.54,hullB*.92);
        q.fillStyle=bodyLight;q.fillRect(-L*.36,-hullB*.34,L*.26,hullB*.68);
        q.fillStyle=metal;q.fillRect(-L*.50,-hullB*.38,L*.10,hullB*.76);
      }

      q.fillStyle=bodyDark;
      if(isTitan){
        q.fillRect(-L*.46,-hullB*.34,L*.30,hullB*.68);
        q.fillStyle=metal;for(let i=0;i<5;i++)q.fillRect(-L*.42+i*L*.045,-hullB*.23,L*.018,hullB*.46);
      }else if(isHornet){
        q.fillRect(-L*.40,-hullB*.29,L*.22,hullB*.58);
        q.fillStyle=metal;q.fillRect(-L*.36,-hullB*.20,L*.13,hullB*.06);q.fillRect(-L*.36,hullB*.14,L*.13,hullB*.06);
      }else{
        q.fillRect(-L*.39,-hullB*.22,L*.18,hullB*.44);
        q.fillStyle=metal;for(let i=0;i<3;i++)q.fillRect(-L*.35+i*L*.045,-hullB*.15,L*.014,hullB*.30);
      }

      q.strokeStyle='#788478';q.lineWidth=1;
      q.beginPath();q.moveTo(-L*.20,-hullB*.38);q.lineTo(-L*.20,hullB*.38);q.stroke();
      q.beginPath();q.moveTo(L*.18,-hullB*.30);q.lineTo(L*.18,hullB*.30);q.stroke();
      q.fillStyle='#aeb7ad';
      for(const px of [-L*.25,L*.14])for(const py of [-hullB*.32,hullB*.32]){
        q.beginPath();q.arc(px,py,rr*.035,0,6.283);q.fill();
      }
      q.fillStyle='#46d9df';q.fillRect(L*.39,-rr*.045,rr*.11,rr*.09);

      // Match the actual hull's turret ring and placement.
      q.fillStyle='#343c34';q.beginPath();q.arc(turretX,0,rr*(isTitan?.62:isWasp?.50:.57),0,6.283);q.fill();
      q.strokeStyle='#697760';q.lineWidth=1.2;q.stroke();

      q.fillStyle='#424d3f';q.beginPath();
      q.roundRect(turretX-rr*.43,-rr*.27,rr*.86,rr*.54,rr*.16);q.fill();
      q.fillStyle='#292f2a';q.roundRect(turretX+rr*.18,-rr*.10,rr*.38,rr*.20,rr*.05);q.fill();

      q.restore();
    }else if(type==='turret'){
      // Render the exact same turret geometry used by tankBody(), just on the
      // shop canvas. This keeps the shop preview visually identical to gameplay.
      const r=20;
      const fireTier=item.id==='fast'?firebirdTiers[Math.max(0,Math.min(3,firebirdTier))]:null;
      const railTier=item.id==='railgun'?railgunTiers[Math.max(0,Math.min(3,railgunTier))]:null;
      const railAccent=railTier?.beam||null;

      q.fillStyle='#343c34';
      q.beginPath();q.arc(0,0,r*.57,0,6.283);q.fill();
      q.strokeStyle='#697760';q.lineWidth=1.4;q.stroke();

      q.save();q.translate(0,0);q.rotate(0);
      const visualBarrel=gunForTurret(item.id);
      const visualTurret=item;
      q.fillStyle=item.id==='railgun'?'#202725':item.id==='fast'?'#424d3f':item.id==='rapid'?'#424d3f':'#424d3f';
      q.beginPath();
      if(visualTurret.id==='railgun'){
        q.moveTo(-r*.50,-r*.30);q.lineTo(r*.08,-r*.36);q.quadraticCurveTo(r*.42,-r*.27,r*.48,0);
        q.quadraticCurveTo(r*.42,r*.27,r*.08,r*.36);q.lineTo(-r*.50,r*.30);q.quadraticCurveTo(-r*.60,0,-r*.50,-r*.30);
      }else if(visualTurret.id==='fast'){
        q.moveTo(-r*.52,-r*.36);
        q.lineTo(-r*.12,-r*.49);
        q.lineTo(r*.34,-r*.40);
        q.quadraticCurveTo(r*.55,-r*.20,r*.55,0);
        q.quadraticCurveTo(r*.55,r*.20,r*.34,r*.40);
        q.lineTo(-r*.12,r*.49);
        q.lineTo(-r*.52,r*.36);
        q.quadraticCurveTo(-r*.63,0,-r*.52,-r*.36);
      }else if(visualTurret.id==='rapid'){
        q.moveTo(-r*.50,-r*.34);q.quadraticCurveTo(-r*.18,-r*.45,r*.24,-r*.39);
        q.quadraticCurveTo(r*.52,-r*.24,r*.52,0);q.quadraticCurveTo(r*.52,r*.24,r*.24,r*.39);
        q.quadraticCurveTo(-r*.18,r*.45,-r*.50,r*.34);q.quadraticCurveTo(-r*.58,0,-r*.50,-r*.34);
      }else{
        q.moveTo(-r*.48,-r*.30);q.quadraticCurveTo(-r*.28,-r*.46,r*.02,-r*.43);
        q.lineTo(r*.31,-r*.30);q.quadraticCurveTo(r*.48,-r*.15,r*.50,0);
        q.quadraticCurveTo(r*.48,r*.15,r*.31,r*.30);q.lineTo(r*.02,r*.43);
        q.quadraticCurveTo(-r*.28,r*.46,-r*.48,r*.30);q.quadraticCurveTo(-r*.57,0,-r*.48,-r*.30);
      }
      q.closePath();q.fill();

      if(visualTurret.id==='railgun'){
        q.strokeStyle=railAccent||'#8eeaff';q.lineWidth=1.7;
        q.beginPath();q.moveTo(-r*.34,-r*.27);q.lineTo(r*.20,-r*.23);q.lineTo(r*.35,-r*.10);q.stroke();
        q.beginPath();q.moveTo(-r*.34,r*.27);q.lineTo(r*.20,r*.23);q.lineTo(r*.35,r*.10);q.stroke();
      }else if(visualTurret.id==='fast'){
        const fireAccent=fireTier.accent,fireFlame=fireTier.flame,fireCore=fireTier.core;
        q.fillStyle='#343a31';
        q.beginPath();q.moveTo(-r*.34,-r*.27);q.lineTo(r*.18,-r*.31);q.lineTo(r*.38,-r*.15);
        q.lineTo(r*.38,r*.15);q.lineTo(r*.18,r*.31);q.lineTo(-r*.34,r*.27);q.closePath();q.fill();
        q.fillStyle=fireFlame;q.globalAlpha=.95;
        q.beginPath();q.moveTo(-r*.34,-r*.27);q.lineTo(r*.18,-r*.31);q.lineTo(r*.28,-r*.20);q.lineTo(-r*.25,-r*.16);q.closePath();q.fill();
        q.beginPath();q.moveTo(-r*.34,r*.27);q.lineTo(r*.18,r*.31);q.lineTo(r*.28,r*.20);q.lineTo(-r*.25,r*.16);q.closePath();q.fill();
        q.globalAlpha=1;
        q.fillStyle=fireAccent;
        for(const sy of [-1,1])for(let j=0;j<4;j++){
          const vx=-r*.20+j*r*.105;
          q.beginPath();q.ellipse(vx,sy*r*.30,r*.035,r*.065,0,0,6.283);q.fill();
        }
        q.strokeStyle=fireAccent;q.lineWidth=r*.065;
        q.beginPath();q.moveTo(-r*.18,-r*.22);q.lineTo(r*.30,-r*.11);q.stroke();
        q.beginPath();q.moveTo(-r*.18,r*.22);q.lineTo(r*.30,r*.11);q.stroke();
        q.strokeStyle=fireCore;q.lineWidth=r*.045;q.globalAlpha=.9;
        q.beginPath();q.moveTo(-r*.08,0);q.lineTo(r*.36,0);q.stroke();q.globalAlpha=1;
      }

      q.strokeStyle=railAccent||'#7f8b75';q.lineWidth=1.25;
      q.beginPath();q.moveTo(-r*.28,-r*.40);q.quadraticCurveTo(-r*.08,-r*.29,r*.04,-r*.28);q.stroke();
      q.beginPath();q.moveTo(-r*.28,r*.40);q.quadraticCurveTo(-r*.08,r*.29,r*.04,r*.28);q.stroke();

      q.fillStyle='#292e2a';q.beginPath();q.ellipse(-r*.18,0,r*.17,r*.12,0,0,6.283);q.fill();
      q.strokeStyle='#89967c';q.stroke();
      q.fillStyle='#292f2a';
      q.beginPath();q.roundRect(r*.08,-r*.18,r*.34,r*.36,5);q.fill();

      const barrelScale=visualBarrel.scale,barrelLength=visualBarrel.length;
      const barrelWidth=.15*barrelScale;
      if(visualTurret.id==='rapid'){
        q.fillStyle='#151819';
        for(const sy of [-1,1]){
          const yy=sy*r*.115;
          q.fillRect(r*.35,yy-r*barrelWidth*.32,r*1.16*barrelLength,r*barrelWidth*.64);
          q.fillStyle='#0e1112';q.fillRect(r*(1.46*barrelLength),yy-r*.07,r*.14,r*.14);
          q.fillStyle='#151819';
        }
      }else if(visualTurret.id==='fast'){
        const fireAccent=fireTier.accent,fireFlame=fireTier.flame;
        q.fillStyle='#171a18';
        q.beginPath();
        q.moveTo(r*.30,-r*.105);q.lineTo(r*.83,-r*.115);q.lineTo(r*1.08,-r*.19);
        q.lineTo(r*1.22,-r*.19);q.lineTo(r*1.31,-r*.11);q.lineTo(r*1.31,r*.11);
        q.lineTo(r*1.22,r*.19);q.lineTo(r*1.08,r*.19);q.lineTo(r*.83,r*.115);
        q.lineTo(r*.30,r*.105);q.closePath();q.fill();
        q.fillStyle='#4a5049';q.fillRect(r*.45,-r*.13,r*.13,r*.26);
        q.fillStyle='#0b0d0c';q.beginPath();q.ellipse(r*1.28,0,r*.10,r*.105,0,0,6.283);q.fill();
        q.fillStyle=fireFlame;q.globalAlpha=.9;q.fillRect(r*.78,-r*.13,r*.07,r*.26);q.globalAlpha=1;
        q.strokeStyle=fireAccent;q.lineWidth=1.6;
        q.beginPath();q.moveTo(r*.58,-r*.12);q.lineTo(r*.98,-r*.17);q.stroke();
        q.beginPath();q.moveTo(r*.58,r*.12);q.lineTo(r*.98,r*.17);q.stroke();
      }else{
        q.fillStyle='#151819';
        q.fillRect(r*.35,-r*barrelWidth/2,r*1.16*barrelLength,r*barrelWidth);
        if(visualBarrel.id==='122mm'){
          q.fillStyle='#0e1112';q.fillRect(r*(1.32*barrelLength),-r*.065,r*.10,r*.13);
        }else{
          q.fillStyle='#0e1112';q.fillRect(r*(1.46*barrelLength),-r*.105,r*.14,r*.21);
        }
      }

      q.fillStyle=railAccent||'#849176';
      q.beginPath();q.arc(-r*.36,-r*.23,r*.04,0,6.283);q.fill();
      q.beginPath();q.arc(-r*.36,r*.23,r*.04,0,6.283);q.fill();
      q.restore();
    }else if(type==='engine'){
      const sc=1.05;
      q.fillStyle='#252a27';q.beginPath();q.roundRect(-32*sc,-17*sc,64*sc,34*sc,7*sc);q.fill();
      q.fillStyle='#3f493e';q.beginPath();q.roundRect(-25*sc,-12*sc,50*sc,24*sc,5*sc);q.fill();
      q.fillStyle='#687264';
      for(let i=-1;i<=1;i++){q.beginPath();q.arc(i*15*sc,-7*sc,5*sc,0,6.283);q.fill();q.beginPath();q.arc(i*15*sc,7*sc,5*sc,0,6.283);q.fill()}
      q.fillStyle='#181c1a';q.fillRect(-36*sc,-7*sc,8*sc,14*sc);q.fillRect(28*sc,-7*sc,8*sc,14*sc);
      q.fillStyle=item.id==='better'?'#9b7348':item.id==='upgraded'?'#6f7f65':'#555d57';
      q.beginPath();q.arc(0,0,9*sc,0,6.283);q.fill();
      q.fillStyle='#c8cfcc';q.beginPath();q.arc(0,0,3.5*sc,0,6.283);q.fill();
      q.strokeStyle='#151819';q.lineWidth=3;q.beginPath();q.moveTo(0,-14*sc);q.lineTo(0,-21*sc);q.stroke();
    }
    return cv;
  };

  const equipShopItem=(type,item)=>{
    // Equipment can be switched directly from the shop. Keep the button usable
    // even when the shop was opened from the main menu before a game is running.
    if(type==='hull'){
      if(!ownedHulls.includes(item.id))ownedHulls.push(item.id);
      equippedHull=item.id;
      if(p){
        const engine=engines.find(v=>v.id===equippedEngine)||engines[0];
        p.hullId=item.id;
        p.r=20*item.scale;
        p.max=item.hp;
        p.hp=Math.min(p.hp,p.max);
      }
     }else if(type==='turret'){
      if(!ownedTurrets.includes(item.id))ownedTurrets.push(item.id);
      equippedTurret=item.id;
      if(p){
        p.turretId=item.id;
        p.railCharging=false;
        p.railCharge=0;
        p.firebirdTier=firebirdTier;
      }
    }else if(type==='engine'){
      if(!ownedEngines.includes(item.id))ownedEngines.push(item.id);
      equippedEngine=item.id;
    }
    saveShop();
    if(p)saveCurrent();
    renderShop();
  };

  const add=(type,item,owned,equipped)=>{
    const row=document.createElement('div');
    const isSelected=selectedShopItem===item.id;
    row.className='shopItem'+(isSelected?' selected':'');
    const info=document.createElement('div');info.className='shopInfo';
    info.appendChild(preview(type,item));
    const text=document.createElement('div');text.className='shopItemName';
    text.innerHTML='<b>'+item.name+'</b>';
    info.appendChild(text);
    if(type==='turret'&&item.id==='railgun'&&isSelected){
      const tiers=document.createElement('div');tiers.className='railgunTierMini';
      railgunTiers.forEach(t=>{
        const owned=t.tier<=railgunOwnedTier;
        const tier=document.createElement('div');
        tier.className='railgunTierMiniRow'+(t.tier===railgunTier?' current':'');
        const label=document.createElement('span');
        label.innerHTML='<b>T'+t.tier+'</b><small>'+t.name+'</small>';
        const b=document.createElement('button');
        b.className='tierInlineButton';
        b.textContent=t.tier===railgunTier?'CURRENT':owned?'SELECT':t.tier===railgunOwnedTier+1?'UPGRADE':'LOCKED';
        b.disabled=t.tier===railgunTier||(!owned&&t.tier!==railgunOwnedTier+1);
        b.onclick=e=>{e.stopPropagation();initAudio();soundUi();if(!owned&&t.tier===railgunOwnedTier+1)railgunOwnedTier=t.tier;railgunTier=t.tier;saveShop();renderShop()};
        tier.appendChild(label);tier.appendChild(b);tiers.appendChild(tier);
      });
      info.appendChild(tiers);
    }
    if(type==='turret'&&item.id==='fast'&&isSelected){
      const tiers=document.createElement('div');tiers.className='railgunTierMini';
      firebirdTiers.forEach(t=>{
        const owned=t.tier<=firebirdOwnedTier;
        const tier=document.createElement('div');
        tier.className='railgunTierMiniRow'+(t.tier===firebirdTier?' current':'');
        const label=document.createElement('span');
        label.innerHTML='<b>T'+t.tier+'</b><small>'+t.name+'</small>';
        const b=document.createElement('button');
        b.className='tierInlineButton';
        b.textContent=t.tier===firebirdTier?'CURRENT':owned?'SELECT':t.tier===firebirdOwnedTier+1?'UPGRADE':'LOCKED';
        b.disabled=t.tier===firebirdTier||(!owned&&t.tier!==firebirdOwnedTier+1);
        b.onclick=e=>{e.stopPropagation();initAudio();soundUi();if(!owned&&t.tier===firebirdOwnedTier+1)firebirdOwnedTier=t.tier;firebirdTier=t.tier;if(p)p.firebirdTier=firebirdTier;saveShop();renderShop()};
        tier.appendChild(label);tier.appendChild(b);tiers.appendChild(tier);
      });
      info.appendChild(tiers);
    }
    row.appendChild(info);
    const btn=document.createElement('button');
    btn.textContent=equipped?'EQUIPPED':'EQUIP';
    btn.disabled=equipped;
    btn.onclick=e=>{e.stopPropagation();initAudio();soundUi();equipShopItem(type,item)};
    row.appendChild(btn);
    row.onclick=()=>{selectedShopItem=isSelected?null:item.id;renderShop()};
    box.appendChild(row);
    if(isSelected){
      const details=document.createElement('div');details.className='shopDetails';
      const heading=document.createElement('div');heading.className='shopDetailsTitle';heading.innerHTML='<b>'+item.name+'</b><span>'+ (equipped?'EQUIPPED':'SELECTED') +'</span>';details.appendChild(heading);
      const grid=document.createElement('div');grid.className='shopStatGrid';
      const addStat=(label,value,accent=false)=>{const d=document.createElement('div');d.className='shopStat'+(accent?' accent':'');d.innerHTML='<span>'+label+'</span><b>'+value+'</b>';grid.appendChild(d)};
      if(type==='hull'){
        addStat('Hit Points',item.hp,true);addStat('Forward Speed',item.speed);addStat('Reverse Speed',item.reverse);addStat('Hull Turn',item.turn.toFixed(2));
        addStat('Size',item.scale.toFixed(2)+'x');
      }else if(type==='turret'){
        const gun=gunForTurret(item.id);const rt=item.id==='railgun'?railgunTiers[Math.max(0,Math.min(3,railgunTier))]:null;const turn=item.id==='railgun'?item.turn*(rt?.turnMult||1):item.turn;const min=Math.round(gun.minDamage*(rt?.damageMult||1));const max=Math.round(gun.maxDamage*(rt?.damageMult||1));const reload=gun.reloadTime*(rt?.reloadMult||1);addStat('Turret Rotation',turn.toFixed(2),true);addStat('Gun',gun.name);addStat('Damage',min+'-'+max);addStat('Reload Time',reload.toFixed(2)+'s');addStat('Size',item.scale.toFixed(2)+'x');
      }else if(type==='engine'){
        addStat('Forward Speed', '+'+Math.round((item.speed-1)*100)+'%',true);addStat('Reverse Speed','+'+Math.round((item.speed-1)*100)+'%');addStat('Hull Rotation','+'+Math.round((item.turn-1)*100)+'%');
      }else{
        const activeRailTier=item.id==='122mmLong'?railgunTiers[Math.max(0,Math.min(3,railgunTier))]:null;
        const displayedMinDamage=item.id==='122mmLong'?Math.round(item.minDamage*(activeRailTier?.damageMult||1)):item.minDamage;
        const displayedMaxDamage=item.id==='122mmLong'?Math.round(item.maxDamage*(activeRailTier?.damageMult||1)):item.maxDamage;
        addStat('Damage',displayedMinDamage+'-'+displayedMaxDamage,true);addStat('Pierced Tank Damage',item.id==='122mmLong'?Math.round((activeRailTier?.pierceDamageMult??.5)*100)+'%':'—');addStat('Reload Time',item.id==='122mmLong'?((Number(item.reloadTime)||0)*(activeRailTier?.reloadMult||1)).toFixed(2)+'s':((Number(item.reloadTime)||0).toFixed(2)+'s'));addStat('Barrel Scale',item.scale.toFixed(2)+'x');addStat('Barrel Length',item.length.toFixed(2)+'x');
      }
      details.appendChild(grid);
      box.appendChild(details);
    }
  };

  const sectionTitle=document.createElement('div');
  sectionTitle.className='shopSectionTitle';
  sectionTitle.textContent=shopCategory==='hull'?'HULLS':shopCategory==='turret'?'TURRETS':'ENGINES';
  box.appendChild(sectionTitle);

  const list=shopCategory==='hull'?hulls:shopCategory==='turret'?turrets:engines;
  list.forEach(v=>add(shopCategory,v,
    shopCategory==='hull'?ownedHulls.includes(v.id):
    shopCategory==='turret'?ownedTurrets.includes(v.id):ownedEngines.includes(v.id),
    shopCategory==='hull'?equippedHull===v.id:
    shopCategory==='turret'?equippedTurret===v.id:equippedEngine===v.id
  ));

  // Second tier row: reserved for future higher-tier equipment.
  const coming=document.createElement('div');
  coming.className='shopTierComing';
  coming.innerHTML='<b>HIGHER TIER</b><span>COMING SOON</span>';
  box.appendChild(coming);
}

function update(dt){
  if(over||gameScreen!=='game'){stopEngineSound();return;}
  autoSaveTimer+=dt;if(autoSaveTimer>=5){autoSaveTimer=0;saveCurrent();}
  p.cd=Math.max(0,p.cd-dt);p.inv=Math.max(0,p.inv-dt);
  if(p.railCharging){
    p.railCharge=Math.max(0,p.railCharge-dt);
    if(p.railCharge<=0){
      const barrelNow=gunForTurret(p.turretId);
      fireRailgun();
      p.railCharging=false;
      const activeRailTier=railgunTiers[Math.max(0,Math.min(3,railgunTier))];
      p.cd=barrelNow.reloadTime*(activeRailTier?.reloadMult||1);
    }
  }
  for(let i=railBeams.length-1;i>=0;i--){railBeams[i].life-=dt;if(railBeams[i].life<=0)railBeams.splice(i,1);}
  // Dead tanks coast for one extra second. Their momentum is reduced linearly to zero,
  // while walls still block the wreck so it cannot slide through cover.
  for(let i=deadTanks.length-1;i>=0;i--){
    const e=deadTanks[i];
    if((e.deathDrift||0)>0){
      const factor=Math.max(0,e.deathDrift);
      moveWithWalls(e,(e.deathVx||0)*factor*dt,(e.deathVy||0)*factor*dt);
      e.deathDrift=Math.max(0,e.deathDrift-dt);
      e.deathVx=(e.deathVx||0)*Math.max(0,1-dt);
      e.deathVy=(e.deathVy||0)*Math.max(0,1-dt);
    }
    // Wrecks remain for the normal corpse lifetime, then are removed.
    e.corpseTime=Math.max(0,(e.corpseTime||0)-dt);
    if(e.corpseTime<=0)deadTanks.splice(i,1);
  }

  // Firebird fuel: 5 seconds of firing capacity, recovering fully in 10 seconds when not firing.
  if(p.turretId==='fast' && p.firebirdFuel<8 && !mouse.down && !mobileFire && !keys.has(' ')){
    p.firebirdFuel=Math.min(5,p.firebirdFuel+dt*.5);
  }
  // Burning tanks take 3 damage every 1 second per stack, up to 5 stacks.
  if(p.burnStacks>0){
    p.burnTick=(p.burnTick||1)-dt;
    if(p.burnTick<=0){
      const burnHit=(p.burnDamage||3)*p.burnStacks;
      p.hp-=burnHit;
      dmgTexts.push({x:p.x+(Math.random()-.5)*p.r+24,y:p.y-p.r-38,text:burnHit.toFixed(0),life:.9,col:'#ff8a3d',kind:'burn'});
      p.hitFlash=.05;
      p.burnStacks=Math.max(0,p.burnStacks-1);
      p.burnTick=1;
    }
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
  const hull=hulls.find(v=>v.id===p.hullId)||hulls[0], turret=turretForPlayer();
  const engine=engines.find(v=>v.id===equippedEngine)||engines[0];
  const hullTurnRate=hull.turn*engine.turn;
  const driveSpeed=hull.speed*engine.speed;
  const reverseSpeed=hull.reverse*engine.speed;
  p.currentDriveSpeed=drive* (drive>=0?driveSpeed:reverseSpeed);
  if(drive||turn)startEngineSound();else stopEngineSound();
  let hullTurnDelta=0;
  if(turn){
    // When reversing, left/right steering reverses naturally.
    const reverseFactor=drive<0?-1:1;
    hullTurnDelta=turn*hullTurnRate*dt*reverseFactor;
    p.angle+=hullTurnDelta;
  }
  if(drive){
    const moveSpeed=drive<0?reverseSpeed:driveSpeed;
    moveWithWalls(p,Math.cos(p.angle)*drive*moveSpeed*dt,Math.sin(p.angle)*drive*moveSpeed*dt);
  }
  p.x=Math.max(p.r+8,Math.min(W-p.r-8,p.x));p.y=Math.max(p.r+8,Math.min(H-p.r-8,p.y));
  // The turret is mounted to the hull, so hull rotation carries the turret with it.
  // If the turret is also rotating toward the same direction, the two angular
  // speeds combine instead of making the turret fight the hull rotation.
  p.turretAngle+=hullTurnDelta;
  const targetTurret=Math.atan2(mouse.y-p.y,mouse.x-p.x);
  let turretDa=((targetTurret-p.turretAngle+Math.PI*3)%(Math.PI*2))-Math.PI;
  const playerTurretTurnRate=turret.turn;
  const turretStep=Math.max(-playerTurretTurnRate*dt,Math.min(playerTurretTurnRate*dt,turretDa));
  p.turretAngle+=turretStep;

  const fireHeld=mouse.down||mobileFire||keys.has(' ');
  const firebird=gunForTurret(p.turretId);
  if(firebird.id==='122mm'&&firebird.flame){
    if(fireHeld&&p.firebirdFuel>0){
      const fireAngle=p.turretAngle,muzzle=playerMuzzlePosition(firebird,fireAngle);
      const fireTier=firebirdTiers[Math.max(0,Math.min(3,firebirdTier))]||firebirdTiers[0];
      const range=fireTier.range||firebird.range||230,cone=firebird.cone||.42;
      spawnFlameParticles(p,muzzle,fireAngle,fireTier,cone,range,18);
      if(!p.firebirdActive){
        p.firebirdActive=true;
        p.cd=.5;
    }
    }else{
      p.firebirdActive=false;
    }
  }
  if(firebird.id==='122mm'&&firebird.flame&&fireHeld&&p.firebirdFuel>0){
    p.firebirdFuel=Math.max(0,p.firebirdFuel-dt);
  }
  if(fireHeld)shoot();

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
        const result=applyBulletHit(firstHit,b.dmg,b.x,b.y,b);
        hit=true;
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
        const damage=b.dmg;
        p.hp-=damage;p.inv=.28; soundHit();
        dmgTexts.push({x:p.x,y:p.y-p.r-8,text:Math.round(damage),life:.7});
        burst(b.x,b.y,b.col||'#ff765d',14);
        if(p.hp<=0)die();
      }
      ebs.splice(i,1);continue;
    }
    if(b.life<=0||b.x<-60||b.x>W+60||b.y<-60||b.y>H+60)ebs.splice(i,1);
  }

  for(const e of en){
    const d=Math.hypot(p.x-e.x,p.y-e.y);
    e.fire-=dt;e.hitFlash=Math.max(0,e.hitFlash-dt);
    if(e.burnStacks>0){
      e.burnTick=(e.burnTick||1)-dt;
      if(e.burnTick<=0){
        const burnHit=(e.burnDamage||3)*e.burnStacks;
        e.hp-=burnHit;
        dmgTexts.push({x:e.x+(Math.random()-.5)*e.r+24,y:e.y-e.r-38,text:burnHit.toFixed(0),life:.9,col:'#ff8a3d',kind:'burn'});
        e.hitFlash=.05;
        e.burnStacks=Math.max(0,e.burnStacks-1);
        e.burnTick=1;
      }
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
    e.vx=0;e.vy=0;
    if(!e.idle){
      const wa=Math.atan2(e.wanderY-e.y,e.wanderX-e.x);
      const wda=((wa-e.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
      const turnRate=2.1;
      e.angle+=Math.max(-turnRate*dt,Math.min(turnRate*dt,wda));
      const wd=Math.hypot(e.wanderX-e.x,e.wanderY-e.y);
      if(wd>28){
        const moveVx=Math.cos(e.angle)*e.speed;
        const moveVy=Math.sin(e.angle)*e.speed;
        const moved=moveWithWalls(e,moveVx*dt,moveVy*dt);
        if(moved){e.vx=moveVx;e.vy=moveVy;}
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
    // Firebird is called every frame so its flame remains visually continuous;
    // enemyShoot() itself controls the actual 0.50s damage/burn tick.
    const enemyBarrel=gunForTurret(e.turretId);
    if(enemyBarrel.id==='122mm'&&enemyBarrel.flame){
      if(d<620)enemyShoot(e);
    }else if(d<620&&e.fire<=0)enemyShoot(e);
    // Ram damage is handled once below for both tanks.
  }

  // Every tank collision is mutual: both tanks take ram damage, with a short cooldown.
  for(let pass=0;pass<3;pass++){
    for(let i=0;i<en.length;i++)for(let j=i+1;j<en.length;j++){
      const a=en[i],b=en[j];
      if(Math.hypot(a.x-b.x,a.y-b.y)<a.r+b.r){
        // Enemy tanks physically collide and separate, but never damage each other.
        // Their collision is only a movement/position constraint.
        safeSeparateTanks(a,b);
      }
    }
  }
  // Tank collisions are purely physical. They never deal collision/ram damage.
  for(const e of [...en]){
    if(!en.includes(e))continue;
    const d=Math.hypot(p.x-e.x,p.y-e.y),min=p.r+e.r;
    if(d<min)safeSeparateTanks(p,e);
  }
  for(let i=ps.length-1;i>=0;i--){const q=ps[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.94;q.vy*=.94;q.life-=dt;if(q.life<=0)ps.splice(i,1)}
  for(let i=dmgTexts.length-1;i>=0;i--){const q=dmgTexts[i];q.y-=24*dt;q.life-=dt;if(q.life<=0)dmgTexts.splice(i,1)}
}

function tankBody(cx,cy,r,hullAngle,turretAngle,enemy=false,heavy=false,flash=false,turretId='standard',hullId='standard',firebirdTierVisual=0){
  x.save();x.translate(cx,cy);x.rotate(hullAngle);

  const isWasp=hullId==='scout',isHornet=hullId==='standard',isTitan=hullId==='heavy';
  const L=r*2.55*(isTitan?1.10:isWasp?.94:1);
  const B=r*1.18*(isTitan?1.08:isWasp?.90:1);
  const trackW=r*(isTitan?.42:isWasp?.25:.34);
  const trackL=L*(isTitan?1.02:isWasp?.82:.94);
  const hullB=B*(isTitan?1.02:isWasp?.84:1);
  const turretX=isWasp?-L*.22:isTitan?L*.18:0;

  x.save();x.rotate(-hullAngle);
  x.fillStyle='rgba(0,0,0,.30)';
  x.beginPath();x.ellipse(3,5,r*(isTitan?1.65:1.40),r*(isTitan?1.0:.80),0,0,6.283);x.fill();
  x.restore();

  const trackDark=flash?'#b89d84':(enemy?(heavy?'#292b2c':'#4b3033'):'#202520');
  const trackEdge=enemy?(heavy?'#5b5954':'#704347'):'#4a5148';
  const wheelOuter=enemy?(heavy?'#66635d':'#75464a'):'#596158';
  const wheelInner=enemy?(heavy?'#353735':'#303530'):'#303530';

  for(const sy of [-1,1]){
    const ty=sy*(hullB/2+trackW/2);
    x.fillStyle=trackDark;
    x.beginPath();x.roundRect(-trackL/2,ty-trackW/2,trackL,trackW,7);x.fill();
    x.strokeStyle=trackEdge;x.lineWidth=2;x.stroke();
    const wheels=isWasp?4:isTitan?6:5;
    for(let i=0;i<wheels;i++){
      const wx=-trackL*.38+i*(trackL*.76/Math.max(1,wheels-1));
      const wr=r*(isTitan?.18:isWasp?.13:.16);
      x.fillStyle=wheelOuter;x.beginPath();x.arc(wx,ty,wr,0,6.283);x.fill();
      x.strokeStyle='#202320';x.lineWidth=1.5;x.stroke();
      x.fillStyle=wheelInner;x.beginPath();x.arc(wx,ty,wr*.34,0,6.283);x.fill();
    }
  }

  const body=flash?'#e5c6a8':(enemy?(heavy?'#4e4942':'#713d41'):(isTitan?'#4b5747':isWasp?'#506347':'#566b4c'));
  const bodyDark=enemy?(heavy?'#373532':'#593337'):(isTitan?'#30382f':isWasp?'#354238':'#384337');
  const bodyLight=enemy?(heavy?'#625a50':'#758267'):(isTitan?'#687563':isWasp?'#758267':'#74836a');
  const metal=enemy?(heavy?'#756f66':'#9b5559'):'#a3aaa3';

  // Distinct chassis identities:
  // Wasp = tiny rear-turret scout with a sharp nose and exposed engine rails.
  // Hornet = balanced center-turret wedge with pronounced "wing" fenders.
  // Titan = heavy front-turret assault hull with a huge rear engine block.
  x.fillStyle=body;x.beginPath();
  if(isWasp){
    x.moveTo(L*.54,0);
    x.lineTo(L*.27,-hullB*.38);
    x.lineTo(-L*.30,-hullB*.34);
    x.lineTo(-L*.49,-hullB*.20);
    x.lineTo(-L*.49,hullB*.20);
    x.lineTo(-L*.30,hullB*.34);
    x.lineTo(L*.27,hullB*.38);
  }else if(isTitan){
    x.moveTo(L*.43,-hullB*.30);
    x.lineTo(L*.22,-hullB*.52);
    x.lineTo(-L*.42,-hullB*.56);
    x.lineTo(-L*.56,-hullB*.36);
    x.lineTo(-L*.56,hullB*.36);
    x.lineTo(-L*.42,hullB*.56);
    x.lineTo(L*.22,hullB*.52);
    x.lineTo(L*.43,hullB*.30);
  }else{
    x.moveTo(L*.55,-hullB*.13);
    x.quadraticCurveTo(L*.40,-hullB*.46,L*.08,-hullB*.50);
    x.lineTo(-L*.35,-hullB*.42);
    x.lineTo(-L*.51,-hullB*.20);
    x.lineTo(-L*.51,hullB*.20);
    x.lineTo(-L*.35,hullB*.42);
    x.lineTo(L*.08,hullB*.50);
    x.quadraticCurveTo(L*.40,hullB*.46,L*.55,hullB*.13);
  }
  x.closePath();x.fill();

  // Upper deck is intentionally different on each hull.
  x.fillStyle=bodyLight;x.beginPath();
  if(isWasp){
    x.moveTo(L*.38,0);x.lineTo(L*.18,-hullB*.28);x.lineTo(-L*.27,-hullB*.25);
    x.lineTo(-L*.34,0);x.lineTo(-L*.27,hullB*.25);x.lineTo(L*.18,hullB*.28);
  }else if(isTitan){
    x.moveTo(L*.28,-hullB*.32);x.lineTo(-L*.30,-hullB*.38);x.lineTo(-L*.43,-hullB*.24);
    x.lineTo(-L*.43,hullB*.24);x.lineTo(-L*.30,hullB*.38);x.lineTo(L*.28,hullB*.32);
    x.lineTo(L*.35,hullB*.15);x.lineTo(L*.35,-hullB*.15);
  }else{
    x.moveTo(L*.38,-hullB*.34);x.lineTo(L*.02,-hullB*.39);x.lineTo(-L*.32,-hullB*.27);
    x.quadraticCurveTo(-L*.42,0,-L*.32,hullB*.27);x.lineTo(L*.02,hullB*.39);x.lineTo(L*.38,hullB*.34);
    x.lineTo(L*.46,0);
  }
  x.closePath();x.fill();

  // Wasp gets obvious silver nose armor; Hornet gets side wings; Titan gets layered glacis.
  if(isWasp){
    x.fillStyle=metal;
    x.beginPath();x.moveTo(L*.31,-hullB*.33);x.lineTo(L*.54,0);x.lineTo(L*.31,hullB*.33);x.lineTo(L*.18,hullB*.22);x.lineTo(L*.39,0);x.lineTo(L*.18,-hullB*.22);x.closePath();x.fill();
    x.fillStyle=bodyDark;
    x.fillRect(-L*.34,-hullB*.42,L*.58,hullB*.07);
    x.fillRect(-L*.34,hullB*.35,L*.58,hullB*.07);
    x.fillStyle=metal;x.fillRect(-L*.40,-hullB*.29,L*.16,hullB*.58);
  }else if(isHornet){
    x.fillStyle=metal;
    x.beginPath();x.moveTo(L*.27,-hullB*.47);x.lineTo(L*.02,-hullB*.36);x.lineTo(-L*.12,-hullB*.22);x.lineTo(L*.28,-hullB*.29);x.closePath();x.fill();
    x.beginPath();x.moveTo(L*.27,hullB*.47);x.lineTo(L*.02,hullB*.36);x.lineTo(-L*.12,hullB*.22);x.lineTo(L*.28,hullB*.29);x.closePath();x.fill();
    x.fillStyle=bodyDark;
    x.beginPath();x.moveTo(-L*.28,-hullB*.48);x.lineTo(L*.02,-hullB*.44);x.lineTo(-L*.18,-hullB*.63);x.lineTo(-L*.46,-hullB*.48);x.closePath();x.fill();
    x.beginPath();x.moveTo(-L*.28,hullB*.48);x.lineTo(L*.02,hullB*.44);x.lineTo(-L*.18,hullB*.63);x.lineTo(-L*.46,hullB*.48);x.closePath();x.fill();
  }else{
    x.fillStyle=metal;
    x.beginPath();x.moveTo(L*.40,-hullB*.31);x.lineTo(L*.20,-hullB*.48);x.lineTo(-L*.05,-hullB*.42);x.lineTo(L*.13,-hullB*.25);x.closePath();x.fill();
    x.beginPath();x.moveTo(L*.40,hullB*.31);x.lineTo(L*.20,hullB*.48);x.lineTo(-L*.05,hullB*.42);x.lineTo(L*.13,hullB*.25);x.closePath();x.fill();
    x.fillStyle=bodyDark;
    x.fillRect(-L*.46,-hullB*.46,L*.54,hullB*.92);
    x.fillStyle=bodyLight;
    x.fillRect(-L*.36,-hullB*.34,L*.26,hullB*.68);
    x.fillStyle=metal;
    x.fillRect(-L*.50,-hullB*.38,L*.10,hullB*.76);
  }

  // Rear engine / vents: Wasp compact, Hornet split vents, Titan oversized.
  x.fillStyle=bodyDark;
  if(isTitan){
    x.fillRect(-L*.46,-hullB*.34,L*.30,hullB*.68);
    x.fillStyle=metal;
    for(let i=0;i<5;i++)x.fillRect(-L*.42+i*L*.045,-hullB*.23,L*.018,hullB*.46);
  }else if(isHornet){
    x.fillRect(-L*.40,-hullB*.29,L*.22,hullB*.58);
    x.fillStyle=metal;
    x.fillRect(-L*.36,-hullB*.20,L*.13,hullB*.06);
    x.fillRect(-L*.36,hullB*.14,L*.13,hullB*.06);
  }else{
    x.fillRect(-L*.39,-hullB*.22,L*.18,hullB*.44);
    x.fillStyle=metal;
    for(let i=0;i<3;i++)x.fillRect(-L*.35+i*L*.045,-hullB*.15,L*.014,hullB*.30);
  }

  // Hull seams and fasteners.
  x.strokeStyle=enemy?(heavy?'#81796d':'#9a5559'):'#788478';x.lineWidth=1.1;
  x.beginPath();x.moveTo(-L*.20,-hullB*.38);x.lineTo(-L*.20,hullB*.38);x.stroke();
  x.beginPath();x.moveTo(L*.18,-hullB*.30);x.lineTo(L*.18,hullB*.30);x.stroke();
  x.fillStyle=enemy?(heavy?'#aaa092':'#ad5d60'):'#aeb7ad';
  for(const px of [-L*.25,L*.14])for(const py of [-hullB*.32,hullB*.32]){
    x.beginPath();x.arc(px,py,r*.035,0,6.283);x.fill();
  }
  if(!enemy){x.fillStyle='#46d9df';x.fillRect(L*.39,-r*.045,r*.11,r*.09)}

  // One turret ring only. Placement is part of the hull silhouette.
  x.fillStyle=enemy?(heavy?'#363432':'#513033'):'#343c34';
  x.beginPath();x.arc(turretX,0,r*(isTitan?.62:isWasp?.50:.57),0,6.283);x.fill();
  x.strokeStyle=enemy?(heavy?'#696258':'#8c4b4f'):'#697760';x.lineWidth=1.4;x.stroke();

  x.save();x.translate(turretX,0);x.rotate(turretAngle-hullAngle);
  const visualBarrel=gunForTurret(turretId);
  const visualTurret=turrets.find(v=>v.id===turretId)||turrets[0];
  const railAccent=visualTurret.id==='railgun'?railgunTiers[Math.max(0,Math.min(3,railgunTier))].beam:null;

  // Turret silhouette varies with weapon class.
  x.fillStyle=enemy?(heavy?'#45413b':'#61373a'):'#424d3f';x.beginPath();
  if(visualTurret.id==='railgun'){
    x.moveTo(-r*.50,-r*.30);x.lineTo(r*.08,-r*.36);x.quadraticCurveTo(r*.42,-r*.27,r*.48,0);
    x.quadraticCurveTo(r*.42,r*.27,r*.08,r*.36);x.lineTo(-r*.50,r*.30);x.quadraticCurveTo(-r*.60,0,-r*.50,-r*.30);
  }else if(visualTurret.id==='fast'){
    // Firebird: old Tanki-style low, armored flamethrower body.
    // Broad wedge, sloped nose, recessed center channel and heavy side armor.
    x.moveTo(-r*.52,-r*.36);
    x.lineTo(-r*.12,-r*.49);
    x.lineTo(r*.34,-r*.40);
    x.quadraticCurveTo(r*.55,-r*.20,r*.55,0);
    x.quadraticCurveTo(r*.55,r*.20,r*.34,r*.40);
    x.lineTo(-r*.12,r*.49);
    x.lineTo(-r*.52,r*.36);
    x.quadraticCurveTo(-r*.63,0,-r*.52,-r*.36);
  }else if(visualTurret.id==='rapid'){
    // Twins: compact rounded turret with a broad front and twin gun mounts.
    x.moveTo(-r*.50,-r*.34);x.quadraticCurveTo(-r*.18,-r*.45,r*.24,-r*.39);
    x.quadraticCurveTo(r*.52,-r*.24,r*.52,0);x.quadraticCurveTo(r*.52,r*.24,r*.24,r*.39);
    x.quadraticCurveTo(-r*.18,r*.45,-r*.50,r*.34);x.quadraticCurveTo(-r*.58,0,-r*.50,-r*.34);
  }else{
    // Smoky: classic Tanki-style compact, rounded turret with a distinct sloped front.
    x.moveTo(-r*.48,-r*.30);x.quadraticCurveTo(-r*.28,-r*.46,r*.02,-r*.43);
    x.lineTo(r*.31,-r*.30);x.quadraticCurveTo(r*.48,-r*.15,r*.50,0);
    x.quadraticCurveTo(r*.48,r*.15,r*.31,r*.30);x.lineTo(r*.02,r*.43);
    x.quadraticCurveTo(-r*.28,r*.46,-r*.48,r*.30);x.quadraticCurveTo(-r*.57,0,-r*.48,-r*.30);
  }
  x.closePath();x.fill();

  if(visualTurret.id==='railgun'){
    x.strokeStyle=railAccent||'#8eeaff';x.lineWidth=1.7;
    x.beginPath();x.moveTo(-r*.34,-r*.27);x.lineTo(r*.20,-r*.23);x.lineTo(r*.35,-r*.10);x.stroke();
    x.beginPath();x.moveTo(-r*.34,r*.27);x.lineTo(r*.20,r*.23);x.lineTo(r*.35,r*.10);x.stroke();
  }else if(visualTurret.id==='fast'){
    // Firebird armor accents use the exact same palette as the active flame tier.
    // This keeps the turret visually tied to its flame instead of using one fixed accent color.
    const fireAccentTier=firebirdTiers[Math.max(0,Math.min(3,firebirdTierVisual||0))]||firebirdTiers[0];
    const fireAccent=fireAccentTier.accent;
    const fireFlame=fireAccentTier.flame;
    const fireCore=fireAccentTier.core;

    // Strong, unmistakable Firebird tier accents.
    x.fillStyle=enemy?'#352d29':'#343a31';
    x.beginPath();
    x.moveTo(-r*.34,-r*.27);x.lineTo(r*.18,-r*.31);x.lineTo(r*.38,-r*.15);
    x.lineTo(r*.38,r*.15);x.lineTo(r*.18,r*.31);x.lineTo(-r*.34,r*.27);
    x.closePath();x.fill();

    // Bright tier-colored side armor plates.
    x.fillStyle=fireFlame;
    x.globalAlpha=.95;
    x.beginPath();x.moveTo(-r*.34,-r*.27);x.lineTo(r*.18,-r*.31);x.lineTo(r*.28,-r*.20);
      x.lineTo(-r*.25,-r*.16);x.closePath();x.fill();
    x.beginPath();x.moveTo(-r*.34,r*.27);x.lineTo(r*.18,r*.31);x.lineTo(r*.28,r*.20);
      x.lineTo(-r*.25,r*.16);x.closePath();x.fill();
    x.globalAlpha=1;

    // Large tier-colored heat vents.
    x.fillStyle=fireAccent;
    for(const sy of [-1,1]){
      for(let j=0;j<4;j++){
        const vx=-r*.20+j*r*.105;
        x.beginPath();x.ellipse(vx,sy*r*.30,r*.035,r*.065,0,0,6.283);x.fill();
      }
    }

    // Raised twin fuel channels.
    x.strokeStyle=fireAccent;x.lineWidth=r*.065;
    x.beginPath();x.moveTo(-r*.18,-r*.22);x.lineTo(r*.30,-r*.11);x.stroke();
    x.beginPath();x.moveTo(-r*.18,r*.22);x.lineTo(r*.30,r*.11);x.stroke();

    // Bright core stripe.
    x.strokeStyle=fireCore;x.lineWidth=r*.045;
    x.globalAlpha=.9;
    x.beginPath();x.moveTo(-r*.08,0);x.lineTo(r*.36,0);x.stroke();
    x.globalAlpha=1;
  }

  x.strokeStyle=railAccent||(enemy?(heavy?'#746c61':'#925055'):'#7f8b75');x.lineWidth=1.25;
  x.beginPath();x.moveTo(-r*.28,-r*.40);x.quadraticCurveTo(-r*.08,-r*.29,r*.04,-r*.28);x.stroke();
  x.beginPath();x.moveTo(-r*.28,r*.40);x.quadraticCurveTo(-r*.08,r*.29,r*.04,r*.28);x.stroke();

  // Hatch and mantlet.
  x.fillStyle='#292e2a';x.beginPath();x.ellipse(-r*.18,0,r*.17,r*.12,0,0,6.283);x.fill();
  x.strokeStyle='#89967c';x.stroke();
  x.fillStyle=enemy?'#252729':'#292f2a';
  x.beginPath();x.roundRect(r*.08,-r*.18,r*.34,r*.36,5);x.fill();

  const barrelScale=visualBarrel.scale,barrelLength=visualBarrel.length;
  const barrelWidth=.15*barrelScale;
  if(visualTurret.id==='rapid'){
    // Two parallel cannons, mounted high/low like the classic Twins turret.
    x.fillStyle='#151819';
    for(const sy of [-1,1]){
      const yy=sy*r*.115;
      x.fillRect(r*.35,yy-r*barrelWidth*.32,r*1.16*barrelLength,r*barrelWidth*.64);
      x.fillStyle='#0e1112';x.fillRect(r*(1.46*barrelLength),yy-r*.07,r*.14,r*.14);
      x.fillStyle='#151819';
    }
  }else if(visualTurret.id==='fast'){
    // Thick Firebird nozzle with tier-matched heat bands.
    const fireAccentTier=firebirdTiers[Math.max(0,Math.min(3,firebirdTierVisual||0))]||firebirdTiers[0];
    const fireAccent=fireAccentTier.accent;
    const fireFlame=fireAccentTier.flame;
    x.fillStyle='#171a18';
    x.beginPath();
    x.moveTo(r*.30,-r*.105);x.lineTo(r*.83,-r*.115);x.lineTo(r*1.08,-r*.19);
    x.lineTo(r*1.22,-r*.19);x.lineTo(r*1.31,-r*.11);x.lineTo(r*1.31,r*.11);
    x.lineTo(r*1.22,r*.19);x.lineTo(r*1.08,r*.19);x.lineTo(r*.83,r*.115);
    x.lineTo(r*.30,r*.105);x.closePath();x.fill();
    x.fillStyle='#4a5049';x.fillRect(r*.45,-r*.13,r*.13,r*.26);
    x.fillStyle='#0b0d0c';
    x.beginPath();x.ellipse(r*1.28,0,r*.10,r*.105,0,0,6.283);x.fill();

    // Hot-metal band around the nozzle and matching tier-colored rails.
    x.fillStyle=fireFlame;
    x.globalAlpha=.9;
    x.fillRect(r*.78,-r*.13,r*.07,r*.26);
    x.globalAlpha=1;
    x.strokeStyle=fireAccent;x.lineWidth=1.6;
    x.beginPath();x.moveTo(r*.58,-r*.12);x.lineTo(r*.98,-r*.17);x.stroke();
    x.beginPath();x.moveTo(r*.58,r*.12);x.lineTo(r*.98,r*.17);x.stroke();
  }else{
    x.fillStyle='#151819';x.fillRect(r*.35,-r*barrelWidth/2,r*1.16*barrelLength,r*barrelWidth);
    if(visualBarrel.id==='122mm'){
      x.fillStyle='#0e1112';x.fillRect(r*(1.32*barrelLength),-r*.065,r*.10,r*.13);
    }else{
      x.fillStyle='#0e1112';x.fillRect(r*(1.46*barrelLength),-r*.105,r*.14,r*.21);
    }
  }

  x.fillStyle=railAccent||(enemy?(heavy?'#746a5d':'#9b5458'):'#849176');
  x.beginPath();x.arc(-r*.36,-r*.23,r*.04,0,6.283);x.fill();
  x.beginPath();x.arc(-r*.36,r*.23,r*.04,0,6.283);x.fill();

  x.restore();x.restore();
}
function draw(){
  if(!p)return;
  x.save();x.clearRect(0,0,W,H);x.translate(0,0);
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
    // Charge effect is attached to the actual gun direction, not the cursor.
    const a=p.turretAngle;
    const chargeBarrel=gunForTurret(p.turretId);
    const muzzle=playerMuzzlePosition(chargeBarrel,a);
    const mx=muzzle.x,my=muzzle.y;
    const progress=1-p.railCharge;
    x.save();x.translate(mx,my);x.rotate(a);x.globalAlpha=.35+.65*progress;
    const chargeTier=railgunTiers[Math.max(0,Math.min(3,railgunTier))];
    x.strokeStyle=chargeTier.beam;x.lineWidth=3+5*progress;x.beginPath();x.arc(0,0,8+14*progress,0,6.283);x.stroke();
    x.strokeStyle='#ffffff';x.lineWidth=2;x.beginPath();x.moveTo(5,0);x.lineTo(22+18*progress,0);x.stroke();
    x.fillStyle='#dfffff';x.globalAlpha=.5+.5*progress;x.beginPath();x.arc(0,0,4+7*progress,0,6.283);x.fill();
    x.restore();
  }
  // Railgun beams linger and fade smoothly for 2 seconds.
  for(const b of railBeams){
    const a=Math.max(0,b.life/b.maxLife);
    x.save();x.globalAlpha=a;
    x.lineCap='round';const railTierVisual=railgunTiers[Math.max(0,Math.min(3,railgunTier))];
    x.strokeStyle=railTierVisual.beam;x.lineWidth=4*a;x.beginPath();x.moveTo(b.x1,b.y1);x.lineTo(b.x2,b.y2);x.stroke();
    x.strokeStyle='#ffffff';x.lineWidth=1*a;x.beginPath();x.moveTo(b.x1,b.y1);x.lineTo(b.x2,b.y2);x.stroke();
    x.restore();
  }
  // Destroyed tanks keep the exact normal tank geometry, but are rendered black.
  // Multiply only affects pixels actually painted by the tank, so it cannot create
  // rectangular black patches on the battlefield.
  for(const e of deadTanks){
    x.save();
    x.globalAlpha=1;
    x.globalCompositeOperation='multiply';
    tankBody(e.x,e.y,e.r,e.angle,e.turretAngle,true,e.heavy,false,e.turretId||'standard',e.hullId||'standard',e.firebirdTier||0);
    x.globalCompositeOperation='source-over';
    x.restore();
  }
  // shell trails / explosions
  for(const q of ps){x.globalAlpha=Math.max(0,q.life*2);x.fillStyle=q.col;x.beginPath();x.arc(q.x,q.y,q.size||3.5,0,6.283);x.fill()}x.globalAlpha=1;
  for(const b of bs){
    const col=b.col||'#ff8a00',trailCol=b.col?'#72c5ff':'#ff9d24',coreCol=b.col?'#d9f1ff':'#fff4c2';
    for(let i=b.trail.length-1;i>=0;i--){const t=b.trail[i],a=t.life/.16*.55;x.globalAlpha=a;x.fillStyle=trailCol;x.beginPath();x.arc(t.x,t.y,b.r*(1.0+.9*a),0,6.283);x.fill();x.fillStyle=coreCol;x.globalAlpha=a*.9;x.beginPath();x.arc(t.x,t.y,b.r*(.55+.7*a),0,6.283);x.fill()}
    x.globalAlpha=1;x.fillStyle=col;x.beginPath();x.arc(b.x,b.y,b.r*1.7,0,6.283);x.fill();x.fillStyle=coreCol;x.beginPath();x.arc(b.x,b.y,b.r*1.05,0,6.283);x.fill();
  }
  for(const b of ebs){
    const col=b.col||'#ff3b18',trailCol=b.col?'#72c5ff':'#ff4f2f',coreCol=b.col?'#d9f1ff':'#fff0d8';
    for(let i=b.trail.length-1;i>=0;i--){const t=b.trail[i],a=t.life/.16*.5;x.globalAlpha=a;x.fillStyle=trailCol;x.beginPath();x.arc(t.x,t.y,b.r*(.9+.8*a),0,6.283);x.fill();x.fillStyle=coreCol;x.globalAlpha=a*.85;x.beginPath();x.arc(t.x,t.y,b.r*(.5+.6*a),0,6.283);x.fill()}
    x.globalAlpha=1;x.fillStyle=col;x.beginPath();x.arc(b.x,b.y,b.r*1.65,0,6.283);x.fill();x.fillStyle=coreCol;x.beginPath();x.arc(b.x,b.y,b.r,0,6.283);x.fill();
  }
  // Shell impact flashes/explosions are represented by the particle bursts created on impact.
  for(const e of en){
    tankBody(e.x,e.y,e.r,e.angle,e.turretAngle,true,e.heavy,e.hitFlash>0,e.turretId||'standard',e.hullId||'standard',e.firebirdTier||0);
    // Identify the complete enemy loadout directly above the tank.
    const enemyHull=hulls.find(v=>v.id===e.hullId)||hulls[0];
    const enemyTurret=turrets.find(v=>v.id===e.turretId)||turrets[0];
    const enemyGun=gunForTurret(e.turretId);
    const enemyEngine=engines.find(v=>v.id===e.engineId)||engines[0];
    x.font='bold 12px system-ui';
    x.textAlign='center';
    x.textBaseline='bottom';
    x.fillStyle='#20252a';
    x.fillText(enemyHull.name+' • '+enemyTurret.name.replace(' Turret','')+' • '+enemyGun.name.replace(' Barrel','')+' • '+enemyEngine.name.replace(' Engine',''),e.x,e.y-e.r-15);
    const bw=e.r*2.7;x.fillStyle='#252c35';x.fillRect(e.x-bw/2,e.y-e.r-11,bw,5);
    x.fillStyle=e.heavy?'#d28a55':'#d85b68';x.fillRect(e.x-bw/2,e.y-e.r-11,bw*Math.max(0,e.hp/e.max),5);
  }
  tankBody(p.x,p.y,p.r,p.angle,p.turretAngle,false,false,p.inv>0,p.turretId,p.hullId,firebirdTier);
  const barW=p.r*2.7, barX=p.x-barW/2, hpY=p.y-p.r-18, reloadY=p.y-p.r-10;
  const turret=turrets.find(v=>v.id===p.turretId)||turrets[0], barrel=gunForTurret(p.turretId);
  const activeRailTier=railgunTiers[Math.max(0,Math.min(3,railgunTier))];
  const actualReloadTime=barrel.id==='122mmLong'
    ? barrel.reloadTime*(activeRailTier?.reloadMult||1)
    : barrel.reloadTime;
  // Railgun charge drains the reload bar toward zero before the shot,
  // then the normal reload cycle starts from empty after firing.
  const reloadPct=barrel.id==='122mm'&&barrel.flame
    ?Math.max(0,Math.min(1,p.firebirdFuel/(p.firebirdMaxFuel||8)))
    :p.railCharging
      ?Math.max(0,Math.min(1,p.railCharge))
      :(actualReloadTime>0?Math.max(0,Math.min(1,1-p.cd/actualReloadTime)):1);
  x.fillStyle='#252c35';x.fillRect(barX,hpY,barW,4);x.fillStyle='#e15b64';x.fillRect(barX,hpY,barW*Math.max(0,p.hp/p.max),4);
  x.fillStyle='#252c35';x.fillRect(barX,reloadY,barW,3);x.fillStyle='#ffd21a';x.fillRect(barX,reloadY,barW*reloadPct,3);
  for(const q of dmgTexts){x.globalAlpha=Math.max(0,q.life/(q.kind==='burn'?.9:.7));x.fillStyle=q.col||'#ff3b3b';x.font=q.kind==='burn'?'bold 14px system-ui':'bold 18px system-ui';x.textAlign='center';x.fillText(q.kind==='burn'?'🔥 -'+q.text:'-'+q.text,q.x,q.y);x.globalAlpha=1}
  x.restore();

  const hp=Math.max(0,p.hp/p.max),xp=Math.max(0,p.xp/p.next);
  $('hpBar').style.width=hp*100+'%';$('xpBar').style.width=xp*100+'%';$('coinsText').textContent=p.coins;
  $('hpText').textContent=Math.ceil(Math.max(0,p.hp))+'/'+p.max;$('xpText').textContent=p.xp+'/'+p.next;
  $('levelText').textContent=p.lv;$('coinsText').textContent=p.coins;$('killsText').textContent=p.kills;
  $('reloadBar').style.width=(reloadPct*100)+'%';$('damageText').textContent=barrel.damage;
  if(barrel.id==='122mm'&&barrel.flame){
    $('reloadText').textContent='FUEL';
    $('reloadText').style.color='#ffd21a';
  }else{
    $('reloadText').textContent=p.cd>0?'RELOADING':'RELOAD TIME';
    $('reloadText').style.color=p.cd>0?'#ff4b4b':'#39e66b';
  }
  // Reload countdown only; aiming/dispersion UI removed.
  const cursorReload=$('cursorReload');
  if(cursorReload){
    const activeBarrel=gunForTurret(p.turretId);
    const activeRailTier=railgunTiers[Math.max(0,Math.min(3,railgunTier))];
    const actualReloadTime=activeBarrel.id==='122mmLong'
      ? activeBarrel.reloadTime*(activeRailTier?.reloadMult||1)
      : activeBarrel.reloadTime;
    cursorReload.textContent=p.cd>0?Math.max(0,p.cd).toFixed(2):actualReloadTime.toFixed(2);
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