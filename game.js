const GAME_VERSION='2026100740';
const c=document.getElementById('game'),x=c.getContext('2d'),$=id=>document.getElementById(id);
let W,H,last=0,spawn=0,over=false,p,en=[],deadTanks=[],playerDeathTank=null,playerDeathTimer=0,playerDeathElapsed=0,bs=[],ebs=[],ps=[],dmgTexts=[],walls=[],smokyTracers=[];
let wave=1,waveRemaining=0,waveStarted=false,waveClearTimer=0;
let gameScreen='menu',autoSaveTimer=0,menuPausedGame=false;
let enemyStageOverride=null,enemyDifficultyOpen=false;
const keys=new Set(),mouse={x:0,y:0,down:false},touch={active:false,x:0,y:0};
const mobileDrive={up:false,down:false,left:false,right:false};
let mobileFire=false;
const hulls=[
  {id:'scout',name:'Wasp',cost:50,hp:90,speed:155,reverse:95,turn:2.1,scale:1},
  {id:'standard',name:'Hornet',cost:0,hp:120,speed:120,reverse:75,turn:1.65,scale:1},
  {id:'heavy',name:'Titan',cost:80,hp:180,speed:90,reverse:60,turn:1.15,scale:1},
  {id:'mammoth',name:'Mammoth',cost:140,hp:280,speed:65,reverse:42,turn:.85,scale:1.18}
];
// Hull tiers work like turret tiers, but each hull has its own upgrade track.
// T0 is the stock chassis; later tiers improve survivability and mobility.
const hullTiers=[
  {tier:0,name:'Standard Hull',hpMult:1,speedMult:1,reverseMult:1,turnMult:1},
  {tier:1,name:'Hull Tier 1',hpMult:1.20,speedMult:1.10,reverseMult:1.10,turnMult:1.20},
  {tier:2,name:'Hull Tier 2',hpMult:1.44,speedMult:1.20,reverseMult:1.20,turnMult:1.44},
  {tier:3,name:'Hull Tier 3',hpMult:1.728,speedMult:1.30,reverseMult:1.30,turnMult:1.728}
];
const turrets=[
  {id:'standard',name:'Smoky',cost:0,turn:1.25,hp:0,scale:1},
  {id:'rapid',name:'Twins',cost:0,turn:1.45,scale:1},
  {id:'fast',name:'Firebird',cost:0,turn:1.8,scale:1},
  {id:'freeze',name:'Freeze',cost:0,turn:1.7,scale:1},
  {id:'railgun',name:'Railgun',cost:0,turn:1.05,scale:1},
  {id:'thunder',name:'Thunder',cost:0,turn:1.25,scale:1}
];
const engines=[
  {id:'standard',name:'Standard Engine',cost:0,speed:1,turn:1},
  {id:'upgraded',name:'Upgraded Engine',cost:0,speed:1.10,turn:1.10},
  {id:'better',name:'Better Engine',cost:0,speed:1.20,turn:1.20}
];
const barrels=[
  {id:'57mm',name:'57mm Barrel',cost:0,minDamage:20,maxDamage:25,reloadTime:2,scale:.82,length:.82,instant:true,critChance:.10},
  {id:'85mm',name:'Twin 85mm Barrels',cost:0,minDamage:8,maxDamage:10,reloadTime:.3,scale:1,length:1},
  {id:'122mm',name:'Firebird',cost:0,minDamage:20,maxDamage:21,reloadTime:0.5,scale:1.05,length:1.05,flame:true,range:230,cone:.42},
  {id:'122mmFreeze',name:'Freeze',cost:0,minDamage:20,maxDamage:21,reloadTime:0.5,scale:1.05,length:1.05,freeze:true,range:230,cone:.42},
  {id:'122mmLong',name:'Railgun',cost:0,minDamage:90,maxDamage:110,reloadTime:10,scale:1.28,length:1.65,instant:true,railTier:0},
  {id:'thunder',name:'Thunder',cost:0,minDamage:20,maxDamage:25,reloadTime:2,scale:.92,length:.90,instant:true,area:true,areaRadius:70}
];
function gunForTurret(turretId){
  if(turretId==='rapid')return barrels.find(v=>v.id==='85mm')||barrels[1];
  if(turretId==='fast')return barrels.find(v=>v.id==='122mm')||barrels[2];
  if(turretId==='freeze')return barrels.find(v=>v.id==='122mmFreeze')||barrels[3];
  if(turretId==='railgun')return barrels.find(v=>v.id==='122mmLong')||barrels[4];
  if(turretId==='thunder')return barrels.find(v=>v.id==='thunder')||barrels[5];
  return barrels.find(v=>v.id==='57mm')||barrels[0];
}
function turretForPlayer(){
  const t=turrets.find(v=>v.id===p?.turretId)||turrets[0];
  if(t.id==='standard'){
    const tier=smokyTiers[Math.max(0,Math.min(3,smokyTier))]||smokyTiers[0];
    return {...t,turn:t.turn+(tier.turnBonus||0)};
  }
  if(t.id==='railgun'){
    const tier=railgunTiers[Math.max(0,Math.min(3,railgunTier))];
    return {...t,turn:t.turn*(tier.turnMult||1)};
  }
  if(t.id==='rapid'){
    const tier=twinsTiers[Math.max(0,Math.min(3,twinsTier))]||twinsTiers[0];
    return {...t,turn:t.turn*(tier.turnMult||1)};
  }
  if(t.id==='fast'){
    const tier=firebirdTiers[Math.max(0,Math.min(3,firebirdTier))]||firebirdTiers[0];
    return {...t,turn:t.turn*(tier.turnMult||1)};
  }
  if(t.id==='freeze'){
    const tier=freezeTiers[Math.max(0,Math.min(3,freezeTier))]||freezeTiers[0];
    return {...t,turn:t.turn*(tier.turnMult||1)};
  }
  if(t.id==='thunder'){
    const tier=thunderTiers[Math.max(0,Math.min(3,thunderTier))]||thunderTiers[0];
    return {...t,turn:t.turn+(tier.turnBonus||0)};
  }
  return t;
}
const tierVisuals=[{tier:0,accent:'#ffffff',glow:'#ffffff',beam:'#ffffff'},{tier:1,accent:'#20c85a',glow:'#66ef8d',beam:'#20c85a'},{tier:2,accent:'#a13cff',glow:'#d58cff',beam:'#a13cff'},{tier:3,accent:'#ffd23f',glow:'#fff0a0',beam:'#ffd23f'}];
const tierVisual=t=>tierVisuals[Math.max(0,Math.min(3,Number(t)||0))]||tierVisuals[0];
const railgunTiers=[
  {tier:0,name:'Standard Railgun',beam:'#79faff',glow:'#bffcff',damageMult:1,reloadMult:1,pierceDamageMult:.50,hullMoveMult:1,turnMult:1},
  {tier:1,name:'Railgun Tier 1',beam:'#20c85a',glow:'#66ef8d',damageMult:1.2,reloadMult:.75,pierceDamageMult:.67,hullMoveMult:.80,turnMult:1.25},
  {tier:2,name:'Railgun Tier 2',beam:'#a13cff',glow:'#d58cff',damageMult:1.44,reloadMult:.50,pierceDamageMult:.83,hullMoveMult:.60,turnMult:1.5625},
  {tier:3,name:'Railgun Tier 3',beam:'#ffd23f',glow:'#fff0a0',damageMult:1.728,reloadMult:.30,pierceDamageMult:1,hullMoveMult:.40,turnMult:2.1904761905}
];
const twinsTiers=[
  {tier:0,name:'Standard Twins',damageMult:1,reloadTime:.30,speedMult:1,turnMult:1,col:'#3da9ff'},
  {tier:1,name:'Twins Tier 1',damageMult:1.2,reloadTime:.25,speedMult:1.2,turnMult:1.2,col:tierVisuals[1].beam},
  {tier:2,name:'Twins Tier 2',damageMult:1.44,reloadTime:.20,speedMult:1.44,turnMult:1.44,col:tierVisuals[2].beam},
  {tier:3,name:'Twins Tier 3',damageMult:1.728,reloadTime:.15,speedMult:1.728,turnMult:1.728,col:tierVisuals[3].beam}
];
const smokyTiers=[
  {tier:0,name:'Standard Smoky',damageBonus:0,reloadTime:2,turnBonus:0,critBonus:0,accent:null},
  {tier:1,name:'Smoky Tier 1',damageBonus:5,reloadTime:1.75,turnBonus:.20,critBonus:.05,accent:tierVisuals[1].accent},
  {tier:2,name:'Smoky Tier 2',damageBonus:10,reloadTime:1.50,turnBonus:.40,critBonus:.10,accent:tierVisuals[2].accent},
  {tier:3,name:'Smoky Tier 3',damageBonus:25,reloadTime:1.25,turnBonus:1.05,critBonus:.15,accent:tierVisuals[3].accent}
];
const thunderTiers=[
  {tier:0,name:'Standard Thunder',damageBonus:0,radius:70,reloadTime:2,turnBonus:0},
  {tier:1,name:'Thunder Tier 1',damageBonus:5,radius:82,reloadTime:1.75,turnBonus:.20},
  {tier:2,name:'Thunder Tier 2',damageBonus:10,radius:95,reloadTime:1.50,turnBonus:.40},
  {tier:3,name:'Thunder Tier 3',damageBonus:15,radius:110,reloadTime:1.25,turnBonus:1.05}
];
const firebirdTiers=[
  {tier:0,name:'Standard Firebird',directBonus:0,burnBonus:0,range:230,turnMult:1,flame:'#ff5a18',core:'#fff1a6',accent:'#ffb52e'},
  {tier:1,name:'Firebird Tier 1',directBonus:5,burnBonus:1,range:280,turnMult:1.2,flame:tierVisuals[1].beam,core:tierVisuals[1].glow,accent:tierVisuals[1].accent},
  {tier:2,name:'Firebird Tier 2',directBonus:10,burnBonus:2,range:330,turnMult:1.44,flame:tierVisuals[2].beam,core:tierVisuals[2].glow,accent:tierVisuals[2].accent},
  {tier:3,name:'Firebird Tier 3',directBonus:15,burnBonus:3,range:380,turnMult:1.728,flame:tierVisuals[3].beam,core:tierVisuals[3].glow,accent:tierVisuals[3].accent}
];
const freezeTiers=[
  // Freeze projectiles stay blue, while the turret's upgrade accents use the
  // shared tier colors so each tier is immediately distinguishable.
  {tier:0,name:'Standard Freeze',directBonus:0,range:230,turnMult:1,flame:'#59d9ff',core:'#e7fbff',accent:'#7f8b75'},
  {tier:1,name:'Freeze Tier 1',directBonus:5,range:280,turnMult:1.2,flame:'#59d9ff',core:'#e7fbff',accent:tierVisuals[1].accent},
  {tier:2,name:'Freeze Tier 2',directBonus:10,range:330,turnMult:1.44,flame:'#59d9ff',core:'#e7fbff',accent:tierVisuals[2].accent},
  {tier:3,name:'Freeze Tier 3',directBonus:15,range:380,turnMult:1.728,flame:'#59d9ff',core:'#e7fbff',accent:tierVisuals[3].accent}
];
// Storage is optional: blocked/private/corrupted storage must never stop boot.
function safeStorageGet(key,fallback=''){
  try{const value=window.localStorage.getItem(key);return value===null?fallback:value}catch(e){return fallback}
}
function safeStorageSet(key,value){
  try{window.localStorage.setItem(key,String(value));return true}catch(e){return false}
}
function loadArray(key,fallback){
  try{
    const raw=safeStorageGet(key,'');
    const value=raw?JSON.parse(raw):fallback;
    return Array.isArray(value)?value:fallback;
  }catch(e){return fallback}
}
let ownedHulls=loadArray('tankOwnedHulls',['standard']);
let ownedTurrets=loadArray('tankOwnedTurrets',['standard']);
let ownedEngines=loadArray('tankOwnedEngines',['standard']);
let equippedHull=safeStorageGet('tankEquippedHull')||'standard';
let equippedTurret=safeStorageGet('tankEquippedTurret')||'standard';
let equippedEngine=safeStorageGet('tankEquippedEngine')||'standard';
let railgunTier=Number(safeStorageGet('tankRailgunTier')||0);
let railgunOwnedTier=Math.max(railgunTier,Number(safeStorageGet('tankRailgunOwnedTier')||0));
let firebirdTier=Number(safeStorageGet('tankFirebirdTier')||0);
let freezeTier=Math.max(0,Math.min(3,Number(safeStorageGet('tankFreezeTier')||0)));
let freezeOwnedTier=Math.max(freezeTier,Math.min(3,Number(safeStorageGet('tankFreezeOwnedTier')||0)));
let firebirdOwnedTier=Math.max(firebirdTier,Number(safeStorageGet('tankFirebirdOwnedTier')||0));
let twinsTier=Number(safeStorageGet('tankTwinsTier')||0);
let twinsOwnedTier=Math.max(twinsTier,Number(safeStorageGet('tankTwinsOwnedTier')||0));
let smokyTier=Math.max(0,Math.min(3,Number(safeStorageGet('tankSmokyTier')||0)));
let smokyOwnedTier=Math.max(smokyTier,Math.min(3,Number(safeStorageGet('tankSmokyOwnedTier')||0)));
let thunderTier=Math.max(0,Math.min(3,Number(safeStorageGet('tankThunderTier')||0)));
let thunderOwnedTier=Math.max(thunderTier,Math.min(3,Number(safeStorageGet('tankThunderOwnedTier')||0)));
let hullTierById={scout:0,standard:0,heavy:0,mammoth:0};
let hullOwnedTierById={scout:0,standard:0,heavy:0,mammoth:0};
try{
  const savedHullTiers=JSON.parse(safeStorageGet('tankHullTiers','{}'));
  const savedOwnedHullTiers=JSON.parse(safeStorageGet('tankHullOwnedTiers','{}'));
  for(const h of hulls){
    hullTierById[h.id]=Math.max(0,Math.min(3,Number(savedHullTiers?.[h.id]??0)));
    hullOwnedTierById[h.id]=Math.max(hullTierById[h.id],Math.min(3,Number(savedOwnedHullTiers?.[h.id]??0)));
  }
}catch(e){}
function getHullTier(id){return hullTiers[Math.max(0,Math.min(3,hullTierById[id]||0))]||hullTiers[0]}
function effectiveHull(base){
  const t=getHullTier(base.id);
  return {...base,hp:Math.round(base.hp*t.hpMult),speed:base.speed*t.speedMult,reverse:base.reverse*t.reverseMult,turn:base.turn*t.turnMult,tier:t.tier,tierName:t.name};
}

// All turret variants are free equipment. Normalize older saves so newer turrets
// (including Railgun) cannot disappear from the player's equipment list.
function normalizeOwnedEquipment(){
  for(const t of turrets)if(!ownedTurrets.includes(t.id))ownedTurrets.push(t.id);
  for(const h of hulls)if(h.cost===0&&!ownedHulls.includes(h.id))ownedHulls.push(h.id);
  for(const e of engines)if(e.cost===0&&!ownedEngines.includes(e.id))ownedEngines.push(e.id);
}
normalizeOwnedEquipment();

function updateVersionLabel(){const el=document.getElementById('gameVersion');if(el)el.textContent='v'+GAME_VERSION;const w=document.getElementById('waveDisplay');if(w)w.textContent='WAVE '+wave;}
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
function closeEnemyDifficulty(){enemyDifficultyOpen=false;const el=$('enemyDifficulty');if(el)el.hidden=true;}
function openEnemyDifficulty(){initAudio();soundUi();enemyDifficultyOpen=true;const el=$('enemyDifficulty');if(el)el.hidden=false;}
function selectEnemyDifficulty(tier){initAudio();soundUi();enemyStageOverride=tier;enemyDifficultyOpen=false;const el=$('enemyDifficulty');if(el)el.hidden=true;reset();p.coins=0;p.lv=1;p.xp=0;p.next=120;p.kills=0;saveShop();showGame();}
function showMenu(pausedGame=false){
  stopEngineSound();
  menuPausedGame=!!pausedGame;
  gameScreen='menu';over=true;$('mainMenu').hidden=false;$('shop').classList.remove('open');$('death').hidden=true;$('cursorReload').hidden=true;
  closeEnemyDifficulty();
  const startButton=$('startGame');
  if(startButton)startButton.textContent=menuPausedGame?'CONTINUE':'START GAME';
}
function showGame(){
  gameScreen='game';$('mainMenu').hidden=true;$('shop').classList.remove('open');$('death').hidden=true;over=false;autoSaveTimer=0;menuPausedGame=false;
}
document.querySelectorAll('.shopTab').forEach(tab=>{tab.onclick=()=>{initAudio();soundUi();shopCategory=tab.dataset.shopCategory;renderShop()}});

function openMenuShop(){
  initAudio();soundUi();$('mainMenu').hidden=true;$('shop').classList.add('open');renderShop();
}
function startNewGame(){
  initAudio();soundUi();
  if(menuPausedGame){showGame();return;}
  reset();p.coins=0;p.lv=1;p.xp=0;p.next=120;p.kills=0;saveShop();showGame();
}
function reset(){
  const hull=effectiveHull(hulls.find(v=>v.id===equippedHull)||hulls[0]), turret=turrets.find(v=>v.id===equippedTurret)||turrets[0], engine=engines.find(v=>v.id===equippedEngine)||engines[0];
  const totalHp=hull.hp;
  p={x:W/2,y:H/2,r:20*hull.scale,speed:hull.speed*engine.speed,hp:totalHp,max:totalHp,lv:1,xp:0,next:120,coins:0,kills:0,cd:0,inv:0,angle:0,turretAngle:0,burnStacks:0,burnTick:1,freezeStacks:0,freezeTick:2,railCharging:false,railCharge:0,firebirdFuel:5,firebirdMaxFuel:5,freezeFuel:5,freezeMaxFuel:5,firebirdActive:false,freezeActive:false,freezeFireDelay:0,firebirdTier:firebirdTier,freezeTier:freezeTier,smokyTier:smokyTier,thunderTier:thunderTier,hullId:hull.id,turretId:turret.id};
  en=[];deadTanks=[];playerDeathTank=null;playerDeathTimer=0;playerDeathElapsed=0;bs=[];ebs=[];ps=[];dmgTexts=[];smokyTracers=[];spawn=.8;over=false;wave=1;waveRemaining=waveSize(wave);waveStarted=true;waveClearTimer=0;
  const waveDisplay=document.getElementById('waveDisplay');
  if(waveDisplay)waveDisplay.textContent='WAVE 1';
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
$('mainMenuButton').onclick=()=>{initAudio();soundUi();showMenu(true)};
$('shopClose').onclick=()=>{initAudio();soundUi();$('shop').classList.remove('open');$('mainMenu').hidden=false};
$('shopBack').onclick=()=>{initAudio();soundUi();showMenu()};
$('menuShop').onclick=openMenuShop;
$('stageSelect').onclick=openEnemyDifficulty;
$('enemyDifficultyClose').onclick=closeEnemyDifficulty;
document.querySelectorAll('[data-enemy-tier]').forEach(b=>{b.onclick=()=>selectEnemyDifficulty(Number(b.dataset.enemyTier))});
$('startGame').onclick=startNewGame;
$('restart').onclick=()=>{initAudio();soundUi();reset();showGame()};
$('deathMenu').onclick=()=>{initAudio();soundUi();showMenu(false)};

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
function enemyAvoidanceAngle(e,targetX,targetY){
  const desired=Math.atan2(targetY-e.y,targetX-e.x);
  const look=Math.max(70,Math.min(125,e.speed*.8+e.r*1.5));
  if(!wallSegmentHit(e.x,e.y,e.x+Math.cos(desired)*look,e.y+Math.sin(desired)*look,Math.max(2,e.r*.92)))return desired;
  const offsets=[-.35,.35,-.7,.7,-1.05,1.05,-1.4,1.4,-1.75,1.75,-2.1,2.1,-2.55,2.55,Math.PI];
  let best=desired,bestScore=Infinity;
  for(const off of offsets){
    const a=desired+off;
    const ex=e.x+Math.cos(a)*look,ey=e.y+Math.sin(a)*look;
    if(wallSegmentHit(e.x,e.y,ex,ey,Math.max(2,e.r*.92)))continue;
    const targetDist=Math.hypot(targetX-ex,targetY-ey);
    const score=Math.abs(off)*90+targetDist*.012;
    if(score<bestScore){bestScore=score;best=a;}
  }
  return best;
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
function waveSize(w){return 5;}
function startNextWave(){
  // Clearing a wave fully restores the player's health before the next wave.
  if(p){p.hp=p.max;p.burnStacks=0;p.burnTick=1;}
  wave++;
  waveRemaining=waveSize(wave);
  waveClearTimer=0;
  soundWave();
  const el=document.getElementById('waveDisplay');
  if(el){el.textContent='WAVE '+wave;el.classList.remove('wavePulse');void el.offsetWidth;el.classList.add('wavePulse')}
}

function pickEnemyTurret(){
  // Main-menu testing override: when selected, every enemy uses the chosen tier.
  if(enemyStageOverride!==null){
    // Difficulty test rounds use the selected tier, while keeping all four weapons equally likely.
    const weaponRoll=Math.random();
    const id=weaponRoll<1/6?'standard':weaponRoll<2/6?'rapid':weaponRoll<3/6?'fast':weaponRoll<4/6?'freeze':weaponRoll<5/6?'railgun':'thunder';
    return {id,tier:enemyStageOverride};
  }
  // Every 5 waves, one more enemy gets the next tier:
  // W5-9:  1x T1 + 4x T0
  // W10-14: 2x T1 + 3x T0
  // W15-19: 3x T1 + 2x T0
  // W20-24: 4x T1 + 1x T0
  // W25-29: 1x T2 + 4x T1
  // W30-34: 2x T2 + 3x T1
  // W35-39: 3x T2 + 2x T1
  // W40-44: 4x T2 + 1x T1
  // W45+: continue the same pattern until all enemies are T3.
  const spawnIndex=5-waveRemaining;
  if(wave<5){
    const weaponRoll=Math.random();
    const id=weaponRoll<1/6?'standard':weaponRoll<2/6?'rapid':weaponRoll<3/6?'fast':weaponRoll<4/6?'freeze':weaponRoll<5/6?'railgun':'thunder';
    return {id,tier:0};
  }
  const milestone=Math.floor((wave-5)/5);
  const highCount=(milestone%4)+1;
  const highTier=Math.min(3,Math.floor(milestone/4)+1);
  const lowTier=Math.max(0,highTier-1);
  const tier=spawnIndex<highCount?highTier:lowTier;
  const weaponRoll=Math.random();
  const id=weaponRoll<1/6?'standard':weaponRoll<2/6?'rapid':weaponRoll<3/6?'fast':weaponRoll<4/6?'freeze':weaponRoll<5/6?'railgun':'thunder';
  return {id,tier};
}
function pickEnemyEngine(){
  const roll=Math.random();
  if(roll<.50)return 'standard';
  if(roll<.85)return 'upgraded';
  return 'better';
}
function pickEnemyHull(){
  const r=Math.random();
  // Mammoth is a normal-weight hull, but it is only eligible every 5th wave.
  // On eligible waves it gets the same 25% base roll as each of the four hulls.
  if(wave%5===0){
    if(r<.25)return 'mammoth';
    if(r<.50)return 'scout';
    if(r<.75)return 'standard';
    return 'heavy';
  }
  if(wave<=2)return r<.65?'scout':(r<.95?'standard':'heavy');
  if(wave<=5)return r<.25?'scout':(r<.85?'standard':'heavy');
  const kvChance=Math.min(.85,.45+(wave-6)*.08);
  return r<kvChance?'heavy':(r<.5?'scout':'standard');
}
function pickEnemyHullTier(turretTier){
  // Higher turret tiers strongly increase the chance of a higher-tier hull.
  // T0: 85/13/2/0, T1: 55/35/9/1, T2: 25/40/28/7, T3: 5/20/40/35.
  const r=Math.random();
  const chances=[
    [0.85,0.13,0.02,0.00],
    [0.55,0.35,0.09,0.01],
    [0.25,0.40,0.28,0.07],
    [0.05,0.20,0.40,0.35]
  ][Math.max(0,Math.min(3,Number(turretTier)||0))];
  let total=0;
  for(let tier=0;tier<chances.length;tier++){
    total+=chances[tier];
    if(r<total)return tier;
  }
  return 3;
}
function makeEnemy(){
  if(waveRemaining<=0)return;
  const side=Math.floor(Math.random()*4);let a,b;
  if(side===0){a=-45;b=Math.random()*H}else if(side===1){a=W+45;b=Math.random()*H}
  else if(side===2){a=Math.random()*W;b=-45}else{a=Math.random()*W;b=H+45}

  // Every enemy gets a complete loadout from the same shop equipment pool as the player.
  // Stronger equipment is weighted to be rarer so early waves do not become unfair.
  const hullId=pickEnemyHull();
  const enemyTurret=pickEnemyTurret();
  const turretId=enemyTurret.id;
  const turretTier=enemyTurret.tier;
  const hullTier=pickEnemyHullTier(turretTier);
  const engineId=pickEnemyEngine();
  const hull=hulls.find(v=>v.id===hullId)||hulls[0];
  const turret=turrets.find(v=>v.id===turretId)||turrets[0];
  const engine=engines.find(v=>v.id===engineId)||engines[0];
  const hullTierData=hullTiers[Math.max(0,Math.min(3,hullTier))]||hullTiers[0];
  const heavy=hullId==='heavy'||hullId==='mammoth';
  const mass=hullId==='mammoth'?2.5:hullId==='heavy'?1.8:hullId==='scout'?0.65:1;
  const enemyFirebirdTier=turretId==='fast'?turretTier:0;
  const enemyFreezeTier=turretId==='freeze'?turretTier:0;
  const enemyThunderTier=turretId==='thunder'?turretTier:0;

  // Hull tier affects the enemy's actual stats as well as its appearance.
  const hp=Math.round(hull.hp*hullTierData.hpMult);
  const speed=hull.speed*engine.speed*hullTierData.speedMult;
  const turnRate=hull.turn*engine.turn*hullTierData.turnMult;
  const reverseSpeed=hull.reverse*engine.speed*hullTierData.reverseMult;

  en.push({
    x:a,y:b,
    r:20*hull.scale,
    speed,
    reverseSpeed,
    turnRate,
    hp,max:hp,dmg:heavy?35:20,
    heavy,hullId,hullTier,turretId,turretTier,engineId,
    angle:0,turretAngle:0,fire:.8+Math.random()*1.5,hitFlash:0,burnStacks:0,burnDamage:3,freezeStacks:0,freezeTick:1,freezeTier:enemyFreezeTier,firebirdTier:enemyFirebirdTier,smokyTier:turretId==='standard'?turretTier:0,firebirdFuel:5,firebirdMaxFuel:5,freezeFuel:5,freezeMaxFuel:5,freezeExhausted:false,railCharging:false,railCharge:0,
     twinsTier:turretId==='rapid'?turretTier:0,thunderTier:enemyThunderTier,
    wanderX:Math.random()*W,wanderY:Math.random()*H,wanderTime:1+Math.random()*3 ,
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
function enemyTurretWorldPosition(e){
  const hull=e.hullId||'standard';
  const isWasp=hull==='scout',isTitan=hull==='heavy';
  const L=e.r*2.55*(isTitan?1.10:isWasp?.94:1);
  const turretX=isWasp?-L*.22:isTitan?L*.18:0;
  const ca=Math.cos(e.angle),sa=Math.sin(e.angle);
  return {x:e.x+ca*turretX,y:e.y+sa*turretX};
}
function enemyMuzzlePosition(e,barrel,angle){
  const t=enemyTurretWorldPosition(e);
  const d=e.r*(.35+1.16*(barrel.length||1));
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
function visualTierIndexForTurret(turretId){if(turretId==='railgun')return railgunTier;if(turretId==='rapid')return twinsTier;if(turretId==='fast')return firebirdTier;if(turretId==='freeze')return freezeTier;if(turretId==='thunder')return thunderTier;return smokyTier}
function shoot(){
  const coarse=window.matchMedia?.('(pointer:coarse)').matches;
  if(coarse&&!mobileFire)return;
  if(p.cd>0)return;
  const barrel=gunForTurret(p.turretId);
  if(barrel.id==='122mm'&&barrel.flame&&p.firebirdFuel<=0)return;
  if(barrel.id==='122mmFreeze'&&barrel.freeze&&p.freezeFuel<=0)return;
  if(barrel.id==='122mmLong'){
    if(!p.railCharging){p.railCharging=true;p.railCharge=1;soundRailCharge();}
    return;
  }
  const fireAngle=p.turretAngle;
  const ca=Math.cos(fireAngle),sa=Math.sin(fireAngle);
  const muzzle=playerMuzzlePosition(barrel,fireAngle);
  const twinsTierData=twinsTiers[Math.max(0,Math.min(3,twinsTier))]||twinsTiers[0];
  const smokyTierData=smokyTiers[Math.max(0,Math.min(3,smokyTier))]||smokyTiers[0];
  const thunderTierData=thunderTiers[Math.max(0,Math.min(3,thunderTier))]||thunderTiers[0];

  // Thunder fires an instant shell and splashes nearby enemies.
  if(barrel.id==='thunder'&&barrel.instant){
    let best=null,bestDist=1400;
    for(const e of en){
      const dx=e.x-muzzle.x,dy=e.y-muzzle.y,along=dx*ca+dy*sa,side=Math.abs(dx*sa-dy*ca);
      if(along<=0||along>=bestDist||side>e.r)continue;
      if(wallRayHit(muzzle.x,muzzle.y,fireAngle,along))continue;
      best=e;bestDist=along;
    }
    if(best){
      const hitX=muzzle.x+ca*bestDist,hitY=muzzle.y+sa*bestDist;
      const dmg=barrel.minDamage+thunderTierData.damageBonus+Math.random()*((barrel.maxDamage+thunderTierData.damageBonus)-(barrel.minDamage+thunderTierData.damageBonus));
      smokyTracers.push({x1:muzzle.x,y1:muzzle.y,x2:hitX,y2:hitY,life:.13,maxLife:.13,col:'#ffd24a'});
      burst(muzzle.x,muzzle.y,'#ffd24a',14);burst(muzzle.x,muzzle.y,'#fff1a6',8);impactExplosion(hitX,hitY,'#ffd24a',34);
      applyThunderBlast(hitX,hitY,dmg,thunderTierData.radius,best);
    }else{
      const missX=muzzle.x+ca*34,missY=muzzle.y+sa*34;
      smokyTracers.push({x1:muzzle.x,y1:muzzle.y,x2:missX,y2:missY,life:.10,maxLife:.10,col:'#ffd24a'});
      burst(muzzle.x,muzzle.y,'#ffd24a',14);burst(muzzle.x,muzzle.y,'#fff1a6',8);impactExplosion(missX,missY,'#ffd24a',20);
    }
    soundFire(barrel.id);p.cd=thunderTierData.reloadTime;return;
  }

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
      const smokyMin=barrel.minDamage+smokyTierData.damageBonus,smokyMax=barrel.maxDamage+smokyTierData.damageBonus;
      const dmg=smokyMin+Math.random()*(smokyMax-smokyMin);
      smokyTracers.push({x1:muzzle.x,y1:muzzle.y,x2:hitX,y2:hitY,life:.13,maxLife:.13,col:tierVisual(smokyTier).beam});
      burst(muzzle.x,muzzle.y,'#ff9d24',14);burst(muzzle.x,muzzle.y,'#fff3c4',8);
      applyBulletHit(best,dmg,hitX,hitY,{smoky:true},barrel.critChance+(smokyTierData.critBonus||0));
      if(best.hp<=0){
        const j=en.indexOf(best);
        if(j>=0)killEnemy(best,j);
      }
    }else{
      const missX=muzzle.x+ca*34,missY=muzzle.y+sa*34;
      smokyTracers.push({x1:muzzle.x,y1:muzzle.y,x2:missX,y2:missY,life:.10,maxLife:.10,col:tierVisual(smokyTier).beam});
      burst(muzzle.x,muzzle.y,'#ff9d24',14);burst(muzzle.x,muzzle.y,'#fff3c4',8);
      impactExplosion(missX,missY,'#ffd27a',18);
    }
    soundFire(barrel.id);
    p.cd=smokyTierData.reloadTime;
    return;
  }

  // Freeze is a continuous cryo stream. Use a deterministic cone test for damage
  // instead of relying on rendered particles, so damage cannot disappear when a
  // particle misses between frames.
  if(barrel.id==='122mmFreeze'&&barrel.freeze){
    // Freeze has a deliberate 0.5s warm-up while the fire button is held.
    // Keep the stream visible during warm-up, but do not apply damage yet.
    if((p.freezeFireDelay||0)<.5){p.cd=.05;return;}
    const tier=freezeTiers[Math.max(0,Math.min(3,freezeTier))]||freezeTiers[0];
    const range=tier.range||barrel.range||230;
    const cone=barrel.cone||.42;
    // Match Firebird timing: the visible Freeze particles are the hitbox,
    // so damage is applied when the stream reaches the target rather than on fire.
    spawnFreezeParticles(p,muzzle,fireAngle,tier,cone,range,18);
    for(const e of [...en]){
      const dx=e.x-muzzle.x,dy=e.y-muzzle.y,d=Math.hypot(dx,dy);
      const da=Math.abs(((Math.atan2(dy,dx)-fireAngle+Math.PI*3)%(Math.PI*2))-Math.PI);
      const inStream=d<=range+e.r&&da<=cone*.5+Math.asin(Math.min(1,e.r/Math.max(d,1)))&&!wallRayHit(muzzle.x,muzzle.y,Math.atan2(dy,dx),Math.max(0,d-e.r));
      if(!freezeParticleHit(e,p)&&!inStream)continue;
      const dist=d;
      const falloff=1-Math.min(1,dist/range);
      const dmg=(15+tier.directBonus)+(11*falloff);
      applyBulletHit(e,dmg,e.x,e.y,null,0);
      applyFreeze(e);
      if(e.hp<=0){const j=en.indexOf(e);if(j>=0)killEnemy(e,j);}
    }
    soundFire(barrel.id);
    p.cd=barrel.reloadTime;
    return;
  }
  if(barrel.id==='122mm'&&barrel.flame){
    const tier=firebirdTiers[Math.max(0,Math.min(3,firebirdTier))]||firebirdTiers[0];
    const range=tier.range||barrel.range||230;
    for(const e of [...en]){
      // The rendered Firebird particles are the hitbox.
      const dx=e.x-muzzle.x,dy=e.y-muzzle.y,d=Math.hypot(dx,dy);
      const da=Math.abs(((Math.atan2(dy,dx)-fireAngle+Math.PI*3)%(Math.PI*2))-Math.PI);
      const inStream=d<=range+e.r&&da<=(barrel.cone||.42)*.5+Math.asin(Math.min(1,e.r/Math.max(d,1)))&&!wallRayHit(muzzle.x,muzzle.y,Math.atan2(dy,dx),Math.max(0,d-e.r));
      if(!flameParticleHit(e,p)&&!inStream)continue;
      const dist=d;
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

  const speed=({"85mm":900,"122mm":1600}[barrel.id]||1300)*(barrel.id==='85mm'?twinsTierData.speedMult:1);
  if(p.turretId==='rapid'){
    // Twins: one click fires ONE barrel. Alternate left/right on each shot.
    const side=.12*p.r;
    const offset=p.twinsNextBarrel===1?side:-side;
    const muzzleX=muzzle.x-sa*offset,muzzleY=muzzle.y+ca*offset;
    const dmg=(barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage))*twinsTierData.damageMult;
    bs.push({x:muzzleX,y:muzzleY,vx:ca*speed,vy:sa*speed,r:2.8,life:1.8,dmg,trail:[],col:twinsTierData.col,twins:true});
    // Small dedicated muzzle flash for Twins, visually distinct from hit explosions.
    ps.push({x:muzzleX,y:muzzleY,vx:0,vy:0,life:.10,col:twinsTierData.col,size:5.5});
    soundFire(barrel.id);
    p.twinsNextBarrel=p.twinsNextBarrel===1?-1:1;
  }else{
    const muzzleX=muzzle.x,muzzleY=muzzle.y;
    const dmg=barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage);
    bs.push({x:muzzleX,y:muzzleY,vx:ca*speed,vy:sa*speed,r:2.8,life:1.8,dmg,trail:[]});
    burst(muzzleX,muzzleY,'#ffd27a',6);
  }
  const actualReloadTime=barrel.id==='85mm'?twinsTierData.reloadTime:barrel.reloadTime;
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
function applyFreeze(target){
  target.freezeStacks=Math.min(5,(target.freezeStacks||0)+1);
  target.freezeTick=2;
  burst(target.x,target.y,'#59d9ff',12);
  target.hitFlash=.05;
}
function freezeParticleHit(target,owner,muzzle=null,angle=0,range=230,cone=.42){
  if(muzzle){const dx=target.x-muzzle.x,dy=target.y-muzzle.y,d=Math.hypot(dx,dy),da=Math.abs(((Math.atan2(dy,dx)-angle+Math.PI*3)%(Math.PI*2))-Math.PI);if(d<=range+target.r&&da<=cone*.5+Math.asin(Math.min(1,target.r/Math.max(d,1)))&&!wallRayHit(muzzle.x,muzzle.y,Math.atan2(dy,dx),Math.max(0,d-target.r)))return true;}
  for(const q of ps){
    if(!q.freezeHit||q.freezeOwner!==owner||q.life<=0)continue;
    const rr=q.size||3.5,dx=target.x-q.x,dy=target.y-q.y;
    if(dx*dx+dy*dy<=(target.r+rr)*(target.r+rr))return true;
  }
  return false;
}
function spawnFreezeParticles(owner,muzzle,angle,tier,cone,range,count=18){
  const particles=[];
  for(let i=0;i<count;i++){
    const t=count<=1?1:(i+1)/count,d=18+t*(range-18);
    const spread=(Math.random()-.5)*cone*1.7*(.35+.65*t),a=angle+spread;
    if(wallRayHit(muzzle.x,muzzle.y,a,d))continue;
    const size=5+Math.random()*5;
    particles.push({x:muzzle.x+Math.cos(a)*d,y:muzzle.y+Math.sin(a)*d,vx:0,vy:0,life:.12+Math.random()*.18,col:Math.random()<.55?tier.flame:Math.random()<.7?tier.accent:tier.core,size,freezeHit:true,freezeOwner:owner});
  }
  for(const q of particles)ps.push(q);
}
function applyFreeze(target){
  target.freezeStacks=Math.min(5,(target.freezeStacks||0)+1);
  target.freezeTick=2;
  burst(target.x,target.y,'#59d9ff',12);
  target.hitFlash=.05;
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
  target.hitFlash=(critChance>0||b?.smoky) ? .16 : .08;
  dmgTexts.push({x:target.x,y:target.y-target.r-8,text:critical?'CRIT '+Math.round(damage):Math.round(damage),life:(b?.smoky ? .85 : .7),col:critical?'#39d353':'#ff3b3b',kind:critical?'crit':undefined});
  impactExplosion(bx,by,b?.twins?(b.col||'#3da9ff'):(critical?'#fff07a':'#ffd27a'),b?.smoky?34:(critical?26:18));
  if(b?.smoky){
    burst(bx,by,'#fff4c7',18);
    for(let i=0;i<8;i++){const a=Math.random()*6.283,s=90+Math.random()*150;ps.push({x:bx,y:by,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.22+Math.random()*.18,col:'#ff9d24',size:2.5+Math.random()*2.5})}
  }
  soundImpact(true);
  return {profile,ricochet:false,critical};
}
function applyThunderBlast(centerX,centerY,baseDamage,radius,primary){
  for(const target of [...en]){
    if(!en.includes(target))continue;
    const dx=target.x-centerX,dy=target.y-centerY,dist=Math.hypot(dx,dy);
    if(dist>radius+target.r)continue;
    const rayDist=Math.max(0,dist-target.r);
    if(dist>target.r&&wallRayHit(centerX,centerY,Math.atan2(dy,dx),rayDist))continue;
    const falloff=1-Math.min(1,dist/Math.max(1,radius));
    const damage=target===primary?baseDamage:baseDamage*(.50+.50*falloff);
    applyBulletHit(target,damage,target.x,target.y,{thunder:true},0);
    if(target.hp<=0){const j=en.indexOf(target);if(j>=0)killEnemy(target,j);}
  }
}

function enemyShoot(e){
  // Enemy weapons fire along the turret's actual current facing.
  // Never snap the turret to the player when a shot is requested.
  const a=e.turretAngle;
  const barrel=gunForTurret(e.turretId);
  const enemyTwinsTier=Math.max(0,Math.min(3,e.twinsTier||0));
  const enemySmokyTier=Math.max(0,Math.min(3,e.smokyTier||0));
  const enemyRailgunTier=Math.max(0,Math.min(3,e.turretTier||0));
  const enemySmokyTierData=smokyTiers[enemySmokyTier]||smokyTiers[0];
  const enemyTwinsTierData=twinsTiers[enemyTwinsTier]||twinsTiers[0];
  const enemyRailgunTierData=railgunTiers[enemyRailgunTier]||railgunTiers[0];
  const enemyThunderTier=Math.max(0,Math.min(3,e.thunderTier||0));
  const enemyThunderTierData=thunderTiers[enemyThunderTier]||thunderTiers[0];
  const ca=Math.cos(a),sa=Math.sin(a);
  if(barrel.id==='122mmFreeze'&&barrel.freeze){
    const tier=freezeTiers[Math.max(0,Math.min(3,e.freezeTier||0))]||freezeTiers[0],range=tier.range||barrel.range||230,cone=barrel.cone||.42,muzzle=enemyMuzzlePosition(e,barrel,a);
    spawnFreezeParticles(e,muzzle,a,tier,cone,range,18);
    if(freezeParticleHit(p,e,null,a,range,cone)&&e.fire<=0){
      // Match Firebird timing: only a rendered Freeze particle can trigger damage.
      const dist=Math.hypot(p.x-muzzle.x,p.y-muzzle.y),falloff=1-Math.min(1,dist/range);
      applyBulletHit(p,(15+tier.directBonus)+(11*falloff),p.x,p.y,null,0);applyFreeze(p);e.fire=barrel.reloadTime;
      if(p.hp<=0){p.hp=0;die();return;}
    }
    return;
  }
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
      e.fire=barrel.id==='85mm'?enemyTwinsTierData.reloadTime:barrel.id==='57mm'?enemySmokyTierData.reloadTime:barrel.id==='122mmLong'?barrel.reloadTime*(enemyRailgunTierData.reloadMult||1):barrel.reloadTime;
      if(p.hp<=0){p.hp=0;die();return;}
    }
    if(flameParticleHit(p,e))burst(e.x+ca*e.r,e.y+sa*e.r,'#ff6a22',2);
    return;
  }else if(barrel.instant){
    const baseDamage=(barrel.minDamage||0)+Math.random()*((barrel.maxDamage||barrel.minDamage||0)-(barrel.minDamage||0));
    const damage=barrel.id==='122mmLong'
      ?baseDamage*(enemyRailgunTierData.damageMult||1)
      :barrel.id==='85mm'
        ?baseDamage*(enemyTwinsTierData.damageMult||1)
        :baseDamage+(barrel.id==='57mm'?(enemySmokyTierData.damageBonus||0):0);
    const smokyDamage=baseDamage+(barrel.id==='57mm'?(enemySmokyTierData.damageBonus||0):0);
    const range=1400,dx=p.x-e.x,dy=p.y-e.y,along=dx*ca+dy*sa,side=Math.abs(dx*sa-dy*ca);
    const enemyMuzzle=enemyMuzzlePosition(e,barrel,a);
    const muzzleX=enemyMuzzle.x,muzzleY=enemyMuzzle.y;
    if(barrel.id==='122mmLong'){
      const hit=along>0&&along<range&&side<=p.r&&!wallRayHit(e.x,e.y,a,along);
      const beamEnd=hit?along:Math.min(range,Math.max(90,along));
      const beamX=e.x+ca*beamEnd,beamY=e.y+sa*beamEnd;
      railBeams.push({x1:muzzleX,y1:muzzleY,x2:beamX,y2:beamY,life:.35,maxLife:.35,angle:a,tier:enemyRailgunTier});
      burst(muzzleX,muzzleY,enemyRailgunTierData.glow||'#bffcff',18);
      if(hit)applyBulletHit(p,damage,p.x,p.y,null,0);
    }else if(barrel.id==='57mm'){
      const hit=along>0&&along<range&&side<=p.r&&!wallRayHit(e.x,e.y,a,along);
      const endDist=hit?along:Math.min(range,260);
      const hitX=muzzleX+ca*Math.max(0,endDist-(e.r+10)),hitY=muzzleY+sa*Math.max(0,endDist-(e.r+10));
      smokyTracers.push({x1:muzzleX,y1:muzzleY,x2:hit? p.x:hitX,y2:hit? p.y:hitY,life:.13,maxLife:.13,col:enemySmokyTierData.accent});
      burst(muzzleX,muzzleY,enemySmokyTierData.accent,12);burst(muzzleX,muzzleY,enemySmokyTierData.accent,7);
      if(hit)applyBulletHit(p,smokyDamage,p.x,p.y,{smoky:true},(barrel.critChance||0)+(enemySmokyTierData.critBonus||0));
    }else if(barrel.id==='thunder'){
      const hit=along>0&&along<range&&side<=p.r&&!wallRayHit(e.x,e.y,a,along);
      const blastX=hit?p.x:muzzleX+ca*Math.min(range,260),blastY=hit?p.y:muzzleY+sa*Math.min(range,260);
      const thunderBase=baseDamage+enemyThunderTierData.damageBonus;
      smokyTracers.push({x1:muzzleX,y1:muzzleY,x2:blastX,y2:blastY,life:.13,maxLife:.13,col:'#ffd24a'});
      burst(muzzleX,muzzleY,'#ffd24a',12);burst(muzzleX,muzzleY,'#fff1a6',7);impactExplosion(blastX,blastY,'#ffd24a',hit?30:22);
      if(hit)applyBulletHit(p,thunderBase,p.x,p.y,{thunder:true},0);
    }else if(along>0&&along<range&&side<=p.r&&!wallRayHit(e.x,e.y,a,along)){
      applyBulletHit(p,damage,p.x,p.y,null,barrel.critChance||0);
    }
    // Instant-hit enemy weapons must also trigger the player's death check.
    if(p.hp<=0){
      p.hp=0;
      die();
      return;
    }
  }else{
    const speed=({"57mm":1000,"85mm":900,"122mm":1600}[barrel.id]||1300)*(barrel.id==='85mm'?enemyTwinsTierData.speedMult:1);
    if(e.turretId==='rapid'){
      // Enemy Twins: one projectile per reload, alternating barrels.
      const side=.12*e.r;
      const offset=e.twinsNextBarrel===1?side:-side;
      const damage=(barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage))*enemyTwinsTierData.damageMult;
      const baseMuzzle=enemyMuzzlePosition(e,barrel,a);
      const mx=baseMuzzle.x-sa*offset,my=baseMuzzle.y+ca*offset;
      const projectileColor=enemyTwinsTierData.col||tierVisual(enemyTwinsTier).beam; ebs.push({x:mx,y:my,vx:ca*speed,vy:sa*speed,r:2.5,life:2.4,dmg:damage,trail:[],col:projectileColor,twins:true});
      burst(mx,my,projectileColor,14);
      soundFire(barrel.id);
      e.twinsNextBarrel=e.twinsNextBarrel===1?-1:1;
    }else{
      const damage=(barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage))+enemySmokyTierData.damageBonus;
      const enemyMuzzle=enemyMuzzlePosition(e,barrel,a);
      ebs.push({x:enemyMuzzle.x,y:enemyMuzzle.y,vx:ca*speed,vy:sa*speed,r:2.5,life:2.4,dmg:damage,trail:[]});
    }
  }
  e.fire=barrel.id==='85mm'?enemyTwinsTierData.reloadTime:barrel.id==='57mm'?enemySmokyTierData.reloadTime:barrel.id==='thunder'?enemyThunderTierData.reloadTime:barrel.reloadTime;
  burst(e.x+ca*e.r,e.y+sa*e.r,tierVisual(e.turretTier||0).beam,barrel.instant?9:4);if(e.turretId!=='rapid')soundFire(barrel.id);
}
function killEnemy(e,j){
  // Keep the tank's momentum for one second after death, then ease it smoothly to a stop.
  // This makes moving tanks feel like they have weight instead of freezing instantly.
  e.deathDrift=1;
  e.deathVx=Number.isFinite(e.vx)?e.vx:0;
  e.deathVy=Number.isFinite(e.vy)?e.vy:0;
  const mammothReward=e.hullId==='mammoth';
  p.kills++;p.coins+=mammothReward?25:e.heavy?15:7;addXp(mammothReward?100:e.heavy?70:35);
  burst(e.x,e.y,e.heavy?'#c77d52':'#d85b68',28);soundExplosion();
  e.dead=true;e.corpseTime=5;e.hitFlash=0;e.fire=0;
  deadTanks.push(e);en.splice(j,1);
}
function die(){
  if(!p||p.dead)return;
  saveCurrent();
  over=true;
  // Keep the render/update loop alive during the death sequence; only gameplay input is disabled.
  stopEngineSound();
  p.hp=0;p.dead=true;
  playerDeathTank={x:p.x,y:p.y,r:p.r,angle:p.angle,turretAngle:p.turretAngle,turretId:p.turretId,hullId:p.hullId,hullTier:hullTierById[p.hullId]||0,firebirdTier:firebirdTier,twinsTier:twinsTier,smokyTier:smokyTier,railTier:railgunTier};
  playerDeathTimer=3;
  playerDeathElapsed=0;
  // Use the same death burst style as destroyed enemies, centered on the player's tank.
  burst(p.x,p.y,'#d85b68',28);
  burst(p.x,p.y,'#ff9d24',18);
  soundExplosion();
  $('death').hidden=true;
  $('cursorReload').hidden=true;
}
function hullForPlayer(){return effectiveHull(hulls.find(v=>v.id===p.hullId)||hulls[0])}
function saveShop(){
  safeStorageSet('tankOwnedHulls',JSON.stringify(ownedHulls));
  safeStorageSet('tankOwnedTurrets',JSON.stringify(ownedTurrets));
    safeStorageSet('tankEquippedHull',equippedHull);
  safeStorageSet('tankEquippedTurret',equippedTurret);
    safeStorageSet('tankOwnedEngines',JSON.stringify(ownedEngines));
  safeStorageSet('tankEquippedEngine',equippedEngine);
  safeStorageSet('tankRailgunTier',String(railgunTier));
  safeStorageSet('tankRailgunOwnedTier',String(railgunOwnedTier));
  safeStorageSet('tankFirebirdTier',String(firebirdTier)); safeStorageSet('tankTwinsTier',String(twinsTier)); safeStorageSet('tankTwinsOwnedTier',String(twinsOwnedTier));
  safeStorageSet('tankSmokyTier',String(smokyTier)); safeStorageSet('tankSmokyOwnedTier',String(smokyOwnedTier));
  safeStorageSet('tankThunderTier',String(thunderTier)); safeStorageSet('tankThunderOwnedTier',String(thunderOwnedTier));
  safeStorageSet('tankFirebirdOwnedTier',String(firebirdOwnedTier));
  safeStorageSet('tankFreezeTier',String(freezeTier));
  safeStorageSet('tankFreezeOwnedTier',String(freezeOwnedTier));
  safeStorageSet('tankHullTiers',JSON.stringify(hullTierById));
  safeStorageSet('tankHullOwnedTiers',JSON.stringify(hullOwnedTierById));
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
      const isWasp=item.id==='scout',isHornet=item.id==='standard',isTitan=item.id==='heavy',isMammoth=item.id==='mammoth';
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
      q.beginPath();q.ellipse(3,5,rr*(isMammoth?1.82:isTitan?1.65:1.40),rr*(isMammoth?1.10:isTitan?1.0:.80),0,0,6.283);q.fill();

      const trackDark='#202520',trackEdge='#4a5148',wheelOuter='#596158',wheelInner='#303530';
      for(const sy of [-1,1]){
        const ty=sy*(hullB/2+trackW/2);
        q.fillStyle=trackDark;
        q.beginPath();q.roundRect(-trackL/2,ty-trackW/2,trackL,trackW,7);q.fill();
        q.strokeStyle=trackEdge;q.lineWidth=1.5;q.stroke();
        const wheels=isWasp?4:isMammoth?8:isTitan?6:5;
        for(let i=0;i<wheels;i++){
          const wx=-trackL*.38+i*(trackL*.76/Math.max(1,wheels-1));
          const wr=rr*(isMammoth?.19:isTitan?.18:isWasp?.13:.16);
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

      // Show the currently selected hull tier in the shop preview too.
      const previewHullTier=Math.max(0,Math.min(3,hullTierById[item.id]||0));
      if(previewHullTier>0){
        const tierMetal=previewHullTier===1?'#20c85a':previewHullTier===2?'#a13cff':'#ffd23f';
        const tierDark=previewHullTier===1?'#126b32':previewHullTier===2?'#4a176f':'#755300';
        const tierGlow=tierVisual(previewHullTier).glow;
        q.fillStyle=tierDark;
        for(const sy of [-1,1]){q.beginPath();q.roundRect(-L*.30,sy*hullB*.34-rr*.055,L*.62,rr*.11,rr*.045);q.fill()}
        q.strokeStyle=tierGlow;q.lineWidth=Math.max(1.5,rr*.055);
        q.beginPath();q.roundRect(-L*.31,-hullB*.39,L*.64,rr*.15,rr*.05);q.stroke();
        q.beginPath();q.roundRect(-L*.31,hullB*.24,L*.64,rr*.15,rr*.05);q.stroke();
        q.fillStyle=tierMetal;
        for(const sy of [-1,1]){q.beginPath();q.roundRect(-L*.04,sy*hullB*.34-rr*.035,L*.32,rr*.07,rr*.025);q.fill()}
        if(previewHullTier>=2){
          q.fillStyle=tierMetal;q.beginPath();q.moveTo(L*.20,-hullB*.42);q.lineTo(L*.52,-hullB*.16);q.lineTo(L*.52,hullB*.16);q.lineTo(L*.20,hullB*.42);q.lineTo(L*.12,hullB*.30);q.lineTo(L*.39,0);q.lineTo(L*.12,-hullB*.30);q.closePath();q.fill();
          q.fillStyle=tierDark;q.beginPath();q.roundRect(-L*.42,-hullB*.52,L*.30,hullB*.12,rr*.04);q.fill();q.beginPath();q.roundRect(-L*.42,hullB*.40,L*.30,hullB*.12,rr*.04);q.fill();
          q.fillStyle=tierGlow;q.fillRect(-L*.38,-hullB*.49,L*.22,rr*.035);q.fillRect(-L*.38,hullB*.455,L*.22,rr*.035);
        }
        if(previewHullTier>=3){
          q.fillStyle=tierDark;for(const sy of [-1,1]){q.beginPath();q.roundRect(-L*.48,sy*(hullB*.47)-rr*.075,L*.82,rr*.15,rr*.055);q.fill()}
          q.fillStyle=tierMetal;q.beginPath();q.moveTo(L*.40,-hullB*.30);q.lineTo(L*.61,-hullB*.13);q.lineTo(L*.61,hullB*.13);q.lineTo(L*.40,hullB*.30);q.lineTo(L*.28,hullB*.18);q.lineTo(L*.48,0);q.lineTo(L*.28,-hullB*.18);q.closePath();q.fill();
          q.fillStyle=tierGlow;for(const sy of [-1,1])q.fillRect(-L*.26,sy*(hullB*.43)-rr*.025,L*.42,rr*.05);
          q.globalAlpha=.8;q.fillRect(-L*.47,-hullB*.24,rr*.07,hullB*.48);q.globalAlpha=1;
          q.strokeStyle=tierGlow;q.lineWidth=Math.max(1,rr*.045);q.beginPath();q.arc(-L*.30,0,rr*.11,0,6.283);q.stroke();
        }
        q.fillStyle=tierGlow;q.globalAlpha=.98;q.fillRect(-rr*.055,-hullB*.22,rr*.11,hullB*.44);q.globalAlpha=1;
        q.strokeStyle=tierGlow;q.lineWidth=Math.max(1.2,rr*.045);
        q.beginPath();q.moveTo(-L*.48,-hullB*.18);q.lineTo(-L*.30,-hullB*.30);q.lineTo(-L*.12,-hullB*.18);q.stroke();
        q.beginPath();q.moveTo(-L*.48,hullB*.18);q.lineTo(-L*.30,hullB*.30);q.lineTo(-L*.12,hullB*.18);q.stroke();
      }

      // Match the actual hull's turret ring and placement.
      q.fillStyle='#343c34';q.beginPath();q.arc(turretX,0,rr*(isMammoth?.68:isTitan?.62:isWasp?.50:.57),0,6.283);q.fill();
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
      const smokyVisualTier=item.id==='standard'?smokyTiers[Math.max(0,Math.min(3,smokyTier))]:null;
      const smokyPreviewAccent=smokyVisualTier&&smokyVisualTier.tier>0?smokyVisualTier.accent:null;
      const thunderVisualTier=item.id==='thunder'?thunderTiers[Math.max(0,Math.min(3,thunderTier))]:null;
      const railAccent=railTier&&railTier.tier>0?(railTier.tier===1?railgunTiers[0].beam:railTier.beam):null;

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
      }else if(visualTurret.id==='standard'&&smokyPreviewAccent){
        q.fillStyle=smokyPreviewAccent;q.globalAlpha=.92;
        q.beginPath();q.moveTo(-r*.34,-r*.27);q.lineTo(r*.16,-r*.31);q.lineTo(r*.28,-r*.19);q.lineTo(-r*.25,-r*.15);q.closePath();q.fill();
        q.beginPath();q.moveTo(-r*.34,r*.27);q.lineTo(r*.16,r*.31);q.lineTo(r*.28,r*.19);q.lineTo(-r*.25,r*.15);q.closePath();q.fill();
        q.globalAlpha=1;q.strokeStyle=smokyPreviewAccent;q.lineWidth=r*.055;
        q.beginPath();q.moveTo(-r*.20,-r*.21);q.lineTo(r*.29,-r*.12);q.stroke();
        q.beginPath();q.moveTo(-r*.20,r*.21);q.lineTo(r*.29,r*.12);q.stroke();
      }else if(visualTurret.id==='fast'){
        q.moveTo(-r*.52,-r*.36);
        q.lineTo(-r*.12,-r*.49);
        q.lineTo(r*.34,-r*.40);
        q.quadraticCurveTo(r*.55,-r*.20,r*.55,0);
        q.quadraticCurveTo(r*.55,r*.20,r*.34,r*.40);
        q.lineTo(-r*.12,r*.49);
        q.lineTo(-r*.52,r*.36);
        q.quadraticCurveTo(-r*.63,0,-r*.52,-r*.36);
      }else if(visualTurret.id==='freeze'){
        // EXACT same Freeze turret body used by tankBody(); only the canvas variable changes.
        const freezeVisual=freezeTiers[Math.max(0,Math.min(3,freezeTier))]||freezeTiers[0];
        const ft=Math.max(0,Math.min(3,freezeTier));
        q.fillStyle='#263f4a';
        q.beginPath();
        q.moveTo(-r*.50,-r*.25);q.lineTo(-r*.24,-r*.43);q.lineTo(r*.18,-r*.39);
        q.lineTo(r*.48,-r*.18);q.lineTo(r*.52,0);q.lineTo(r*.48,r*.18);
        q.lineTo(r*.18,r*.39);q.lineTo(-r*.24,r*.43);q.lineTo(-r*.50,r*.25);
        q.lineTo(-r*.58,0);q.closePath();q.fill();
        if(ft>0){
          q.fillStyle=freezeVisual.accent;q.globalAlpha=.9;
          q.beginPath();q.moveTo(-r*.42,-r*.34);q.lineTo(r*.10,-r*.46);q.lineTo(r*.30,-r*.32);q.lineTo(-r*.25,-r*.22);q.closePath();q.fill();
          q.beginPath();q.moveTo(-r*.42,r*.34);q.lineTo(r*.10,r*.46);q.lineTo(r*.30,r*.32);q.lineTo(-r*.25,r*.22);q.closePath();q.fill();
          q.globalAlpha=1;
        }
        q.fillStyle='#17313b';q.beginPath();q.roundRect(-r*.27,-r*.19,r*.45,r*.38,r*.06);q.fill();
        q.fillStyle=freezeVisual.flame;q.globalAlpha=.95;
        q.beginPath();q.moveTo(-r*.24,-r*.13);q.lineTo(r*.16,-r*.16);q.lineTo(r*.34,-r*.08);q.lineTo(r*.17,0);q.lineTo(r*.34,r*.08);q.lineTo(r*.16,r*.16);q.lineTo(-r*.24,r*.13);q.closePath();q.fill();
        q.globalAlpha=1;
        q.fillStyle=freezeVisual.core;q.globalAlpha=.95;q.fillRect(-r*.02,-r*.09,r*.25,r*.18);q.globalAlpha=1;
        q.fillStyle=freezeVisual.accent;q.globalAlpha=.95;
        q.beginPath();q.moveTo(r*.24,-r*.22);q.lineTo(r*.49,-r*.11);q.lineTo(r*.37,0);q.lineTo(r*.49,r*.11);q.lineTo(r*.24,r*.22);q.lineTo(r*.30,0);q.closePath();q.fill();
        q.globalAlpha=1;
        if(ft>=2){
          q.strokeStyle=freezeVisual.accent;q.lineWidth=r*.055;
          q.beginPath();q.moveTo(-r*.42,-r*.29);q.lineTo(-r*.14,-r*.34);q.lineTo(r*.08,-r*.27);q.stroke();
          q.beginPath();q.moveTo(-r*.42,r*.29);q.lineTo(-r*.14,r*.34);q.lineTo(r*.08,r*.27);q.stroke();
        }
        if(ft>=3){
          q.strokeStyle=freezeVisual.core;q.lineWidth=r*.045;
          q.beginPath();q.moveTo(-r*.50,-r*.15);q.lineTo(-r*.31,-r*.30);q.lineTo(-r*.06,-r*.33);q.stroke();
          q.beginPath();q.moveTo(-r*.50,r*.15);q.lineTo(-r*.31,r*.30);q.lineTo(-r*.06,r*.33);q.stroke();
        }
      }else if(visualTurret.id==='thunder'){
        q.moveTo(-r*.50,-r*.31);q.quadraticCurveTo(-r*.18,-r*.47,r*.24,-r*.41);q.lineTo(r*.50,-r*.22);q.quadraticCurveTo(r*.58,0,r*.50,r*.22);q.lineTo(r*.24,r*.41);q.quadraticCurveTo(-r*.18,r*.47,-r*.50,r*.31);q.quadraticCurveTo(-r*.61,0,-r*.50,-r*.31);
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

      if(visualTurret.id==='railgun'&&railAccent){
        q.strokeStyle=railAccent;q.lineWidth=1.7;
        q.beginPath();q.moveTo(-r*.34,-r*.27);q.lineTo(r*.20,-r*.23);q.lineTo(r*.35,-r*.10);q.stroke();
        q.beginPath();q.moveTo(-r*.34,r*.27);q.lineTo(r*.20,r*.23);q.lineTo(r*.35,r*.10);q.stroke();
      }else if(visualTurret.id==='rapid'){
        const twinsVisualTier=Math.max(0,Math.min(3,twinsTier)); const twinsAccent=(twinsTiers[twinsVisualTier]||twinsTiers[0]).tier===0?'rgba(0,0,0,0)':(twinsTiers[twinsVisualTier]||twinsTiers[0]).col;
        q.fillStyle=twinsAccent;q.globalAlpha=.98;
        q.fillRect(-r*.34,-r*.29,r*.20,r*.12);
        q.fillRect(-r*.34,r*.17,r*.20,r*.12);
        q.strokeStyle=twinsAccent;q.lineWidth=r*.055;
        q.beginPath();q.moveTo(-r*.20,-r*.20);q.lineTo(r*.26,-r*.13);q.stroke();
        q.beginPath();q.moveTo(-r*.20,r*.20);q.lineTo(r*.26,r*.13);q.stroke();
        q.fillRect(r*.08,-r*.045,r*.30,r*.09);
        q.beginPath();q.arc(-r*.08,0,r*.10,0,6.283);q.fill();
        q.globalAlpha=1;
      }else if(visualTurret.id==='thunder'){
        q.fillStyle=thunderVisualTier.tier>0?thunderVisualTier.accent:'rgba(0,0,0,0)';q.fillRect(-r*.30,-r*.29,r*.22,r*.10);q.fillRect(-r*.30,r*.19,r*.22,r*.10);
        q.strokeStyle=thunderVisualTier.tier>0?thunderVisualTier.accent:'#89967c';q.lineWidth=r*.05;q.beginPath();q.moveTo(-r*.18,-r*.18);q.lineTo(r*.30,-r*.12);q.stroke();q.beginPath();q.moveTo(-r*.18,r*.18);q.lineTo(r*.30,r*.12);q.stroke();
      }else if(visualTurret.id==='fast'){
        const fireAccent=fireTier.tier===0?'rgba(0,0,0,0)':fireTier.accent,fireFlame=fireTier.tier===0?'rgba(0,0,0,0)':fireTier.flame,fireCore=fireTier.tier===0?'rgba(0,0,0,0)':fireTier.core;
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

      const twinsNeutral=visualTurret.id==='rapid'&&Math.max(0,Math.min(3,twinsTier))===0; const freezePreview=visualTurret.id==='freeze'?(freezeTiers[Math.max(0,Math.min(3,freezeTier))]||freezeTiers[0]):null; q.strokeStyle=visualTurret.id==='freeze'?freezePreview.accent:(visualTurret.id==='rapid'?(twinsNeutral?'#202320':(twinsTiers[Math.max(0,Math.min(3,twinsTier))]||twinsTiers[0]).col):(railAccent||smokyPreviewAccent||'#7f8b75'));q.lineWidth=1.25;
      q.beginPath();q.moveTo(-r*.28,-r*.40);q.quadraticCurveTo(-r*.08,-r*.29,r*.04,-r*.28);q.stroke();
      q.beginPath();q.moveTo(-r*.28,r*.40);q.quadraticCurveTo(-r*.08,r*.29,r*.04,r*.28);q.stroke();

      q.fillStyle='#292e2a';q.beginPath();q.ellipse(-r*.18,0,r*.17,r*.12,0,0,6.283);q.fill();
      q.strokeStyle=visualTurret.id==='freeze'?freezePreview.accent:(visualTurret.id==='rapid'?(twinsNeutral?'#202320':(twinsTiers[Math.max(0,Math.min(3,twinsTier))]||twinsTiers[0]).col):(smokyPreviewAccent||'#89967c'));q.stroke();
      q.fillStyle='#292f2a';
      q.beginPath();q.roundRect(r*.08,-r*.18,r*.34,r*.36,5);q.fill();

      const barrelScale=visualBarrel.scale,barrelLength=visualBarrel.length;
      const barrelWidth=.15*barrelScale;
      if(visualTurret.id==='thunder'){
        q.fillStyle='#151819';q.beginPath();q.moveTo(r*.28,-r*.15);q.lineTo(r*1.02,-r*.18);q.lineTo(r*1.15,-r*.12);q.lineTo(r*1.15,r*.12);q.lineTo(r*1.02,r*.18);q.lineTo(r*.28,r*.15);q.closePath();q.fill();q.fillStyle='#0b0d0c';q.beginPath();q.arc(r*1.14,0,r*.12,0,6.283);q.fill();q.fillStyle='#ffd24a';q.fillRect(r*.72,-r*.16,r*.08,r*.32);
      }else if(visualTurret.id==='rapid'){
        q.fillStyle='#151819';
        for(const sy of [-1,1]){
          const yy=sy*r*.115;
          q.fillRect(r*.35,yy-r*barrelWidth*.32,r*1.16*barrelLength,r*barrelWidth*.64);
          q.fillStyle='#0e1112';q.fillRect(r*(1.46*barrelLength),yy-r*.07,r*.14,r*.14);
          q.fillStyle='#151819';
        }
      }else if(visualTurret.id==='freeze'){
        // Exact Freeze muzzle copied from tankBody(); the shop has no separate Freeze design.
        const freezeVisual=freezePreview;
        q.fillStyle='#171a18';
        q.beginPath();q.moveTo(r*.30,-r*.12);q.lineTo(r*.84,-r*.14);q.lineTo(r*1.22,-r*.12);q.lineTo(r*1.30,0);
        q.lineTo(r*1.22,r*.12);q.lineTo(r*.84,r*.14);q.lineTo(r*.30,r*.12);q.closePath();q.fill();
        q.fillStyle='#0b0d0c';q.beginPath();q.arc(r*1.27,0,r*.11,0,6.283);q.fill();
        q.fillStyle=freezeVisual.flame;q.globalAlpha=.9;q.fillRect(r*.76,-r*.13,r*.08,r*.26);q.globalAlpha=1;
        q.strokeStyle=freezeVisual.accent;q.lineWidth=1.7;
        q.beginPath();q.moveTo(r*.55,-r*.13);q.lineTo(r*1.02,-r*.18);q.stroke();
        q.beginPath();q.moveTo(r*.55,r*.13);q.lineTo(r*1.02,r*.18);q.stroke();
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
        const activeHull=effectiveHull(item);
        p.hullId=item.id;
        p.r=20*activeHull.scale;
        p.max=activeHull.hp;
        p.speed=activeHull.speed*((engines.find(v=>v.id===equippedEngine)||engines[0]).speed);
        p.hp=Math.min(p.hp,p.max);
        p.hullTier=hullTierById[item.id]||0;
      }
     }else if(type==='turret'){
      if(!ownedTurrets.includes(item.id))ownedTurrets.push(item.id);
      equippedTurret=item.id;
      if(p){
        p.turretId=item.id;
        p.railCharging=false;
        p.railCharge=0;
        p.firebirdTier=firebirdTier; p.freezeTier=freezeTier; p.twinsTier=twinsTier; p.smokyTier=smokyTier;
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
    if(type==='hull'&&isSelected){
      const tiers=document.createElement('div');tiers.className='railgunTierMini';
      hullTiers.forEach(t=>{
        const owned=t.tier<=(hullOwnedTierById[item.id]||0);
        const current=t.tier===(hullTierById[item.id]||0);
        const tier=document.createElement('div');
        tier.className='railgunTierMiniRow'+(current?' current':'');
        const label=document.createElement('span');
        label.innerHTML='<b>T'+t.tier+'</b><small>'+t.name+'</small>';
        const b=document.createElement('button');
        b.className='tierInlineButton';
        b.textContent=current?'CURRENT':owned?'SELECT':t.tier===(hullOwnedTierById[item.id]||0)+1?'UPGRADE':'LOCKED';
        b.disabled=current||(!owned&&t.tier!==(hullOwnedTierById[item.id]||0)+1);
        b.onclick=e=>{
          e.stopPropagation();initAudio();soundUi();
          if(!owned&&t.tier===(hullOwnedTierById[item.id]||0)+1)hullOwnedTierById[item.id]=t.tier;
          hullTierById[item.id]=t.tier;
          if(p&&p.hullId===item.id){
            const activeHull=effectiveHull(item);
            p.hullTier=t.tier;
            p.max=activeHull.hp;
            p.hp=Math.min(p.hp,p.max);
            p.r=20*activeHull.scale;
            p.speed=activeHull.speed*((engines.find(v=>v.id===equippedEngine)||engines[0]).speed);
          }
          saveShop();renderShop();
        };
        tier.appendChild(label);tier.appendChild(b);tiers.appendChild(tier);
      });
      info.appendChild(tiers);
    }
    if(type==='turret'&&item.id==='standard'&&isSelected){
      const tiers=document.createElement('div');tiers.className='railgunTierMini';
      smokyTiers.forEach(t=>{
        const owned=t.tier<=smokyOwnedTier;
        const tier=document.createElement('div');tier.className='railgunTierMiniRow'+(t.tier===smokyTier?' current':'');
        const label=document.createElement('span');label.innerHTML='<b>T'+t.tier+'</b><small>'+t.name+'</small>';
        const b=document.createElement('button');b.className='tierInlineButton';
        b.textContent=t.tier===smokyTier?'CURRENT':owned?'SELECT':t.tier===smokyOwnedTier+1?'UPGRADE':'LOCKED';
        b.disabled=t.tier===smokyTier||(!owned&&t.tier!==smokyOwnedTier+1);
        b.onclick=e=>{e.stopPropagation();initAudio();soundUi();if(!owned&&t.tier===smokyOwnedTier+1)smokyOwnedTier=t.tier;smokyTier=t.tier;if(p)p.smokyTier=smokyTier;saveShop();renderShop()};
        tier.appendChild(label);tier.appendChild(b);tiers.appendChild(tier);
      });
      info.appendChild(tiers);
    }
    if(type==='turret'&&item.id==='thunder'&&isSelected){
      const tiers=document.createElement('div');tiers.className='railgunTierMini';
      thunderTiers.forEach(t=>{
        const owned=t.tier<=thunderOwnedTier;const tier=document.createElement('div');tier.className='railgunTierMiniRow'+(t.tier===thunderTier?' current':'');
        const label=document.createElement('span');label.innerHTML='<b>T'+t.tier+'</b><small>'+t.name+'</small>';
        const b=document.createElement('button');b.className='tierInlineButton';
        b.textContent=t.tier===thunderTier?'CURRENT':owned?'SELECT':t.tier===thunderOwnedTier+1?'UPGRADE':'LOCKED';
        b.disabled=t.tier===thunderTier||(!owned&&t.tier!==thunderOwnedTier+1);
        b.onclick=e=>{e.stopPropagation();initAudio();soundUi();if(!owned&&t.tier===thunderOwnedTier+1)thunderOwnedTier=t.tier;thunderTier=t.tier;if(p)p.thunderTier=thunderTier;saveShop();renderShop()};
        tier.appendChild(label);tier.appendChild(b);tiers.appendChild(tier);
      });info.appendChild(tiers);
    }
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
    if(type==='turret'&&item.id==='rapid'&&isSelected){
      const tiers=document.createElement('div');tiers.className='railgunTierMini';
      twinsTiers.forEach(t=>{
        const owned=t.tier<=twinsOwnedTier;
        const tier=document.createElement('div');
        tier.className='railgunTierMiniRow'+(t.tier===twinsTier?' current':'');
        const label=document.createElement('span');
        label.innerHTML='<b>T'+t.tier+'</b><small>'+t.name+'</small>';
        const b=document.createElement('button');
        b.className='tierInlineButton';
        b.textContent=t.tier===twinsTier?'CURRENT':owned?'SELECT':t.tier===twinsOwnedTier+1?'UPGRADE':'LOCKED';
        b.disabled=t.tier===twinsTier||(!owned&&t.tier!==twinsOwnedTier+1);
        b.onclick=e=>{e.stopPropagation();initAudio();soundUi();if(!owned&&t.tier===twinsOwnedTier+1)twinsOwnedTier=t.tier;twinsTier=t.tier;if(p)p.twinsTier=twinsTier;saveShop();renderShop()};
        tier.appendChild(label);tier.appendChild(b);tiers.appendChild(tier);
      });
      info.appendChild(tiers);
    }
    if(type==='turret'&&item.id==='freeze'&&isSelected){
      const tiers=document.createElement('div');tiers.className='railgunTierMini';
      freezeTiers.forEach(t=>{
        const owned=t.tier<=freezeOwnedTier,tier=document.createElement('div');tier.className='railgunTierMiniRow'+(t.tier===freezeTier?' current':'');
        const label=document.createElement('span');label.innerHTML='<b>T'+t.tier+'</b><small>'+t.name+'</small>';
        const b=document.createElement('button');b.className='tierInlineButton';b.textContent=t.tier===freezeTier?'CURRENT':owned?'SELECT':t.tier===freezeOwnedTier+1?'UPGRADE':'LOCKED';b.disabled=t.tier===freezeTier||(!owned&&t.tier!==freezeOwnedTier+1);
        b.onclick=e=>{e.stopPropagation();initAudio();soundUi();if(!owned&&t.tier===freezeOwnedTier+1)freezeOwnedTier=t.tier;freezeTier=t.tier;if(p)p.freezeTier=freezeTier;saveShop();renderShop()};
        tier.appendChild(label);tier.appendChild(b);tiers.appendChild(tier);
      });info.appendChild(tiers);
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
        const ht=effectiveHull(item);
        addStat('Hit Points',ht.hp,true);addStat('Forward Speed',ht.speed.toFixed(1));addStat('Reverse Speed',ht.reverse.toFixed(1));addStat('Hull Turn',ht.turn.toFixed(2));
        addStat('Size',ht.scale.toFixed(2)+'x');addStat('Tier','T'+ht.tier);
      }else if(type==='turret'){
        const gun=gunForTurret(item.id);
        if(item.id==='rapid'){
          const t=twinsTiers[Math.max(0,Math.min(3,twinsTier))]||twinsTiers[0];
          addStat('Turret Rotation',(item.turn*(t.turnMult||1)).toFixed(2),true);addStat('Damage',(gun.minDamage*t.damageMult).toFixed(1)+'-'+(gun.maxDamage*t.damageMult).toFixed(1));addStat('Reload Time',t.reloadTime.toFixed(2)+'s');addStat('Projectile Speed',Math.round(900*t.speedMult));addStat('Tier','T'+t.tier);
        }else if(item.id==='standard'){
          const t=smokyTiers[Math.max(0,Math.min(3,smokyTier))]||smokyTiers[0];
          addStat('Turret Rotation',(item.turn+(t.turnBonus||0)).toFixed(2),true);addStat('Damage',(gun.minDamage+t.damageBonus)+'-'+(gun.maxDamage+t.damageBonus));addStat('Reload Time',t.reloadTime.toFixed(2)+'s');addStat('Critical Chance',Math.round(((gun.critChance||0)+(t.critBonus||0))*100)+'%');addStat('Tier','T'+t.tier);
        }else if(item.id==='thunder'){
          const t=thunderTiers[Math.max(0,Math.min(3,thunderTier))]||thunderTiers[0];
          addStat('Turret Rotation',(item.turn+(t.turnBonus||0)).toFixed(2),true);addStat('Damage',(gun.minDamage+t.damageBonus)+'-'+(gun.maxDamage+t.damageBonus));addStat('Reload Time',t.reloadTime.toFixed(2)+'s');addStat('Blast Radius',t.radius+' px');addStat('Critical Chance','0%');addStat('Tier','T'+t.tier);
        }else if(item.id==='freeze'){
          const t=freezeTiers[Math.max(0,Math.min(3,freezeTier))]||freezeTiers[0];
          addStat('Turret Rotation',(item.turn*(t.turnMult||1)).toFixed(2),true);addStat('Damage',(15+t.directBonus)+'-'+(26+t.directBonus));addStat('Reload Time',gun.reloadTime.toFixed(2)+'s');addStat('Range',t.range+' px');addStat('Slow / Stack','10%');addStat('Max Freeze Stacks','5');addStat('Tier','T'+t.tier);
        }else if(item.id==='fast'){
          const t=firebirdTiers[Math.max(0,Math.min(3,firebirdTier))]||firebirdTiers[0];
          addStat('Turret Rotation',(item.turn*(t.turnMult||1)).toFixed(2),true);addStat('Damage',(15+t.directBonus)+'-'+(26+t.directBonus));addStat('Reload Time',gun.reloadTime.toFixed(2)+'s');addStat('Range',t.range+' px');addStat('Burn / Stack',3+t.burnBonus);addStat('Max Burn Stacks','5');addStat('Tier','T'+t.tier);
        }else{
          const rt=item.id==='railgun'?railgunTiers[Math.max(0,Math.min(3,railgunTier))]:null;const turn=item.id==='railgun'?item.turn*(rt?.turnMult||1):item.turn;const min=Math.round(gun.minDamage*(rt?.damageMult||1));const max=Math.round(gun.maxDamage*(rt?.damageMult||1));const reload=gun.reloadTime*(rt?.reloadMult||1);addStat('Turret Rotation',turn.toFixed(2),true);addStat('Damage',min+'-'+max);addStat('Reload Time',reload.toFixed(2)+'s');addStat('Size',item.scale.toFixed(2)+'x');
        }
      }else if(type==='engine'){
        addStat('Forward Speed', '+'+Math.round((item.speed-1)*100)+'%',true);addStat('Reverse Speed','+'+Math.round((item.speed-1)*100)+'%');addStat('Hull Rotation','+'+Math.round((item.turn-1)*100)+'%');if(item.id==='better')addStat('Passive','After 2s forward: +30% forward speed',true);
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
  // During the 3-second death sequence, keep visual effects fully animated.
  // Gameplay is paused, but particles, shells, beams, wreck drift and damage text
  // continue updating so the death scene never appears frozen.
  if(playerDeathTimer>0){
    playerDeathElapsed+=dt;
    playerDeathTimer-=dt;

    for(let i=ps.length-1;i>=0;i--){
      const q=ps[i];
      q.x+=(q.vx||0)*dt;
      q.y+=(q.vy||0)*dt;
      q.vx=(q.vx||0)*Math.pow(.94,dt*60);
      q.vy=(q.vy||0)*Math.pow(.94,dt*60);
      q.life-=dt;
      if(q.life<=0)ps.splice(i,1);
    }
    for(let i=smokyTracers.length-1;i>=0;i--){
      smokyTracers[i].life-=dt;
      if(smokyTracers[i].life<=0)smokyTracers.splice(i,1);
    }
    for(let i=railBeams.length-1;i>=0;i--){
      railBeams[i].life-=dt;
      if(railBeams[i].life<=0)railBeams.splice(i,1);
    }
    for(let i=deadTanks.length-1;i>=0;i--){
      const e=deadTanks[i];
      if((e.deathDrift||0)>0){
        const factor=Math.max(0,e.deathDrift);
        moveWithWalls(e,(e.deathVx||0)*factor*dt,(e.deathVy||0)*factor*dt);
        e.deathDrift=Math.max(0,e.deathDrift-dt);
        e.deathVx=(e.deathVx||0)*Math.max(0,1-dt);
        e.deathVy=(e.deathVy||0)*Math.max(0,1-dt);
      }
      e.corpseTime=Math.max(0,(e.corpseTime||0)-dt);
      if(e.corpseTime<=0)deadTanks.splice(i,1);
    }
    for(let i=dmgTexts.length-1;i>=0;i--){
      const q=dmgTexts[i];
      q.life-=dt;
      q.y-=24*dt;
      if(q.life<=0)dmgTexts.splice(i,1);
    }

    if(playerDeathTimer<=0){
      playerDeathTimer=0;
      playerDeathTank=null;
      showMenu(false);
      return;
    }
    return;
  }
  if(over||gameScreen!=='game'){stopEngineSound();return;}
  autoSaveTimer+=dt;if(autoSaveTimer>=5){autoSaveTimer=0;saveCurrent();}
  p.cd=Math.max(0,p.cd-dt);p.inv=Math.max(0,p.inv-dt);
  // Better Engine passive stays active for the entire forward-driving period.
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

  // Firebird and Freeze both use a 5-second continuous firing pool.
  if(p.turretId==='freeze' && p.freezeFuel<5 && !mouse.down && !mobileFire && !keys.has(' '))p.freezeFuel=Math.min(5,p.freezeFuel+dt*.5);
  // Firebird fuel: 5 seconds of firing capacity, recovering fully in 10 seconds when not firing.
  if(p.turretId==='fast' && p.firebirdFuel<8 && !mouse.down && !mobileFire && !keys.has(' ')){
    p.firebirdFuel=Math.min(5,p.firebirdFuel+dt*.5);
  }
  // Burning tanks take 3 damage every 1 second per stack, up to 5 stacks.
  if(p.freezeStacks>0){p.freezeTick=(p.freezeTick||2)-dt;if(p.freezeTick<=0){p.freezeStacks=Math.max(0,p.freezeStacks-1);p.freezeTick=2;}}
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
  const hull=hullForPlayer(), turret=turretForPlayer();
  const engine=engines.find(v=>v.id===equippedEngine)||engines[0];
  const freezeMoveMult=Math.max(.1,1-(p.freezeStacks||0)*.18);
  const hullTurnRate=hull.turn*engine.turn*freezeMoveMult;
  const driveSpeed=hull.speed*engine.speed*freezeMoveMult;
  const reverseSpeed=hull.reverse*engine.speed*freezeMoveMult;
  const movingForward=drive>0;
  if(engine.id==='better' && movingForward){
    p.betterEngineForwardTime=(p.betterEngineForwardTime||0)+dt;
  }else{
    p.betterEngineForwardTime=0;
  }
  const betterEngineBoostActive=engine.id==='better' && movingForward && p.betterEngineForwardTime>=2;
  const boostedDriveSpeed=betterEngineBoostActive?driveSpeed*1.30:driveSpeed;
  // Better Engine exhaust smoke begins when the passive activates.
  if(betterEngineBoostActive && Math.random()<dt*7){
    const smokeX=p.x-Math.cos(p.angle)*p.r*.9;
    const smokeY=p.y-Math.sin(p.angle)*p.r*.9;
    burst(smokeX,smokeY,'#b8c0c8',2);
  }
  p.currentDriveSpeed=drive* (drive>=0?boostedDriveSpeed:reverseSpeed);
  if(drive||turn)startEngineSound();else stopEngineSound();
  let hullTurnDelta=0;
  if(turn){
    // When reversing, left/right steering reverses naturally.
    const reverseFactor=drive<0?-1:1;
    hullTurnDelta=turn*hullTurnRate*dt*reverseFactor;
    p.angle+=hullTurnDelta;
  }
  if(drive){
    const moveSpeed=drive<0?reverseSpeed:boostedDriveSpeed;
    moveWithWalls(p,Math.cos(p.angle)*drive*moveSpeed*dt,Math.sin(p.angle)*drive*moveSpeed*dt);
  }
  p.x=Math.max(p.r+8,Math.min(W-p.r-8,p.x));p.y=Math.max(p.r+8,Math.min(H-p.r-8,p.y));
  // The turret is mounted to the hull, so hull rotation carries the turret with it.
  // If the turret is also rotating toward the same direction, the two angular
  // speeds combine instead of making the turret fight the hull rotation.
  p.turretAngle+=hullTurnDelta;
  const targetTurret=Math.atan2(mouse.y-p.y,mouse.x-p.x);
  let turretDa=((targetTurret-p.turretAngle+Math.PI*3)%(Math.PI*2))-Math.PI;
  const playerTurretTurnRate=turret.turn*freezeMoveMult;
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
    }
    }else{
      p.firebirdActive=false;
    }
  }
  if(firebird.id==='122mmFreeze'&&firebird.freeze){
    if(fireHeld&&p.freezeFuel>0){
      p.freezeFireDelay=Math.min(.5,(p.freezeFireDelay||0)+dt);
      const freezeAngle=p.turretAngle,muzzle=playerMuzzlePosition(firebird,freezeAngle);
      const freezeTierData=freezeTiers[Math.max(0,Math.min(3,freezeTier))]||freezeTiers[0];
      spawnFreezeParticles(p,muzzle,freezeAngle,freezeTierData,firebird.cone||.42,freezeTierData.range||firebird.range||230,18);
      p.freezeActive=true;
    }else{
      p.freezeActive=false;
      p.freezeFireDelay=0;
    }
  }
  if(firebird.id==='122mm'&&firebird.flame&&fireHeld&&p.firebirdFuel>0)p.firebirdFuel=Math.max(0,p.firebirdFuel-dt);
  if(firebird.id==='122mmFreeze'&&firebird.freeze&&fireHeld&&p.freezeFuel>0)p.freezeFuel=Math.max(0,p.freezeFuel-dt);
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

    if(e.freezeStacks>0){e.freezeTick=(e.freezeTick||2)-dt;if(e.freezeTick<=0){e.freezeStacks=Math.max(0,e.freezeStacks-1);e.freezeTick=2;}}
    const freezeMoveMult=Math.max(.1,1-(e.freezeStacks||0)*.18);

    const enemyBarrel=gunForTurret(e.turretId);
    const isEnemyFirebird=enemyBarrel.id==='122mm'&&enemyBarrel.flame;
    const enemyFireTier=firebirdTiers[Math.max(0,Math.min(3,e.firebirdTier||0))]||firebirdTiers[0];
    const firebirdEngageRange=Math.min(enemyFireTier.range||230,300);
    const isEnemyFreeze=enemyBarrel.id==='122mmFreeze'&&enemyBarrel.freeze;
    const enemyFreezeTier=freezeTiers[Math.max(0,Math.min(3,e.freezeTier||0))]||freezeTiers[0];
    const freezeEngageRange=Math.min(enemyFreezeTier.range||230,300);


    // Firebirds actively close the distance instead of trying to flame the player from far away.
    if(isEnemyFirebird && d>firebirdEngageRange){
      e.idle=false;
      e.wanderTime=0;
      const chaseAngle=enemyAvoidanceAngle(e,p.x,p.y);
      const chaseDelta=((chaseAngle-e.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
      const chaseTurnRate=2.6*freezeMoveMult;
      e.angle+=Math.max(-chaseTurnRate*dt,Math.min(chaseTurnRate*dt,chaseDelta));
      const moveVx=Math.cos(e.angle)*e.speed*freezeMoveMult;
      const moveVy=Math.sin(e.angle)*e.speed*freezeMoveMult;
      const moved=moveWithWalls(e,moveVx*dt,moveVy*dt);
      if(moved){e.vx=moveVx;e.vy=moveVy;}
      if(!moved){
        const point=findOpenPoint(e.r);
        e.wanderX=point.x;e.wanderY=point.y;e.wanderTime=1.5+Math.random()*2;
        e.angle+=(Math.random()<.5?1:-1)*Math.PI*.35;
      }
    }else{
      // Other enemies keep their normal wandering behavior.
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
        const wa=enemyAvoidanceAngle(e,e.wanderX,e.wanderY);
        const wda=((wa-e.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
        const turnRate=2.1*freezeMoveMult;
        e.angle+=Math.max(-turnRate*dt,Math.min(turnRate*dt,wda));
        const wd=Math.hypot(e.wanderX-e.x,e.wanderY-e.y);
        if(wd>28){
          const moveVx=Math.cos(e.angle)*e.speed*freezeMoveMult;
          const moveVy=Math.sin(e.angle)*e.speed*freezeMoveMult;
          const moved=moveWithWalls(e,moveVx*dt,moveVy*dt);
          if(moved){e.vx=moveVx;e.vy=moveVy;}
          if(!moved){
            const point=findOpenPoint(e.r);
            e.wanderX=point.x;e.wanderY=point.y;e.wanderTime=1.5+Math.random()*2;
            e.angle+=(Math.random()<.5?1:-1)*Math.PI*.35;
          }
        }
      }
    }

    // Keep bots inside the battlefield.
    e.x=Math.max(e.r+10,Math.min(W-e.r-10,e.x));
    e.y=Math.max(e.r+10,Math.min(H-e.r-10,e.y));

    // Bots keep their hull pointed along their movement path while the turret independently tracks the player.
    const targetTurret=Math.atan2(p.y-e.y,p.x-e.x);
    let tda=((targetTurret-e.turretAngle+Math.PI*3)%(Math.PI*2))-Math.PI;
    // Deliberate turret traverse: fast enough to track normally, but slow enough
    // that a player can circle an enemy and get around its gun arc.
    const enemyTurret=turrets.find(t=>t.id===e.turretId)||turrets[0];
    let turretTurnRate=enemyTurret.turn;
    if(e.turretId==='standard') turretTurnRate+=([0,.20,.40,1.05][Math.max(0,Math.min(3,e.smokyTier||0))]||0);
    else if(e.turretId==='freeze') turretTurnRate*=([1,1.2,1.44,1.728][Math.max(0,Math.min(3,e.freezeTier||0))]||1);
    else if(e.turretId==='railgun') turretTurnRate*=([1,1.25,1.5625,2.1904761905][Math.max(0,Math.min(3,e.turretTier||0))]||1);
    else if(e.turretId==='thunder') turretTurnRate+=([0,.20,.40,1.05][Math.max(0,Math.min(3,e.thunderTier||0))]||0);
    // Player Freeze slows the enemy's final turret traverse after all turret-tier bonuses.
    // 18% per stack, up to 90% at 5 stacks, matching the player's turret slowdown.
    turretTurnRate*=Math.max(.1,1-(e.freezeStacks||0)*.18);
    e.turretAngle+=Math.max(-turretTurnRate*dt,Math.min(turretTurnRate*dt,tda));

    // Firebirds only fire after closing to their dedicated close-range distance.
    // Their flame consumes a limited fuel pool and regenerates while they are not firing.
    if(isEnemyFreeze){
      if(d>freezeEngageRange){
        e.idle=false;e.wanderTime=0;
        const chaseAngle=enemyAvoidanceAngle(e,p.x,p.y),chaseDelta=((chaseAngle-e.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
        e.angle+=Math.max(-2.6*dt,Math.min(2.6*dt,chaseDelta));
        const moveVx=Math.cos(e.angle)*e.speed*freezeMoveMult,moveVy=Math.sin(e.angle)*e.speed*freezeMoveMult;
        const moved=moveWithWalls(e,moveVx*dt,moveVy*dt);if(moved){e.vx=moveVx;e.vy=moveVy;}
      }
      // Enemy Freeze uses a true fuel state machine:
      // firing drains fuel; hitting zero locks the weapon; only a real recharge
      // period can unlock it again. This prevents zero-fuel -> tiny recharge ->
      // fire -> zero-fuel loops that effectively create infinite ammo.
      const freezeMaxFuel=e.freezeMaxFuel||5;
      if(e.freezeExhausted){
        e.freezeFuel=Math.min(freezeMaxFuel,e.freezeFuel+dt*.5);
        // Require a meaningful reserve before allowing Freeze to resume.
        if(e.freezeFuel>=1)e.freezeExhausted=false;
      }else{
        const freezeCanFire=d<=freezeEngageRange&&Math.abs(tda)<.10&&e.freezeFuel>0.001;
        if(freezeCanFire){
          enemyShoot(e);
          e.freezeFuel=Math.max(0,e.freezeFuel-dt);
          if(e.freezeFuel<=0.001){
            e.freezeFuel=0;
            e.freezeExhausted=true;
          }
        }else{
          // Normal idle recharge, but never enough to bypass the exhausted lock.
          e.freezeFuel=Math.min(freezeMaxFuel,e.freezeFuel+dt*.5);
        }
      }
    }else if(isEnemyFirebird){
      if(d<=firebirdEngageRange && e.firebirdFuel>0 && Math.abs(tda)<0.10){
        enemyShoot(e);
        e.firebirdFuel=Math.max(0,e.firebirdFuel-dt);
      }else{
        e.firebirdFuel=Math.min(e.firebirdMaxFuel||5,e.firebirdFuel+dt*.5);
      }
    }else if(e.turretId==='railgun'){
      // Railguns charge before firing, just like the player's Railgun.
      if(e.railCharging){
        e.railCharge=Math.max(0,e.railCharge-dt);
        if(e.railCharge<=0){
          e.railCharging=false;
          enemyShoot(e);
        }
      }else if(e.fire<=0){
        const enemyAttackRange=1400;
        if(d<enemyAttackRange&&!wallRayHit(e.x,e.y,targetTurret,d)){
          // Railgun charging also requires the turret to be genuinely aimed.
          // This prevents the old instant-lock behavior when charge begins.
          if(Math.abs(tda)<0.08){
            e.railCharging=true;
            e.railCharge=1;
          }
        }
      }
    }else if(e.fire<=0){
      // Do not fire until the turret is actually facing the player.
      if(d<620&&Math.abs(tda)<0.12&&!wallRayHit(e.x,e.y,targetTurret,d))enemyShoot(e);
    }
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
  // Tank collisions are purely physical. They never deal collision/ram damage.\n  for(const e of [...en]){\n    if(!en.includes(e))continue;\n    const d=Math.hypot(p.x-e.x,p.y-e.y),min=p.r+e.r;\n    if(d<min)safeSeparateTanks(p,e);\n  }
  for(let i=ps.length-1;i>=0;i--){const q=ps[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.94;q.vy*=.94;q.life-=dt;if(q.life<=0)ps.splice(i,1)}
  for(let i=dmgTexts.length-1;i>=0;i--){const q=dmgTexts[i];q.y-=24*dt;q.life-=dt;if(q.life<=0)dmgTexts.splice(i,1)}
}

function tankBody(cx,cy,r,hullAngle,turretAngle,enemy=false,heavy=false,flash=false,turretId='standard',hullId='standard',firebirdTierVisual=0,twinsTierVisual=0,smokyTierVisual=0,railgunTierVisual=0,hullTierVisual=0,freezeTierVisual=0,freezeStacksVisual=0,thunderTierVisual=0){
  x.save();x.translate(cx,cy);x.rotate(hullAngle);

  const isWasp=hullId==='scout',isHornet=hullId==='standard',isTitan=hullId==='heavy',isMammoth=hullId==='mammoth';
  const freezeStacks=Math.max(0,Math.min(5,freezeStacksVisual||0));
  const freezeAmount=Math.min(1,Math.pow(freezeStacks/5,0.72));
  const frostColor=v=>{if(!freezeAmount)return v;if(!/^#[0-9a-f]{6}$/i.test(v))return v;const n=parseInt(v.slice(1),16),r0=n>>16,g0=(n>>8)&255,b0=n&255;const rr=Math.round(r0*(1-freezeAmount)+45*freezeAmount),gg=Math.round(g0*(1-freezeAmount)+155*freezeAmount),bb=Math.round(b0*(1-freezeAmount)+235*freezeAmount);return '#'+[rr,gg,bb].map(q=>q.toString(16).padStart(2,'0')).join('')};
  const L=r*2.55*(isMammoth?1.22:isTitan?1.10:isWasp?.94:1);
  const B=r*1.18*(isMammoth?1.16:isTitan?1.08:isWasp?.90:1);
  const trackW=r*(isMammoth?.48:isTitan?.42:isWasp?.25:.34);
  const trackL=L*(isMammoth?1.08:isTitan?1.02:isWasp?.82:.94);
  const hullB=B*(isMammoth?1.08:isTitan?1.02:isWasp?.84:1);
  const turretX=isWasp?-L*.22:isMammoth?-L*.04:isTitan?L*.18:0;

  x.save();x.rotate(-hullAngle);
  x.fillStyle='rgba(0,0,0,.30)';
  x.beginPath();x.ellipse(3,5,r*(isMammoth?1.82:isTitan?1.65:1.40),r*(isMammoth?1.10:isTitan?1.0:.80),0,0,6.283);x.fill();
  x.restore();

  const trackDark=frostColor(flash?'#b89d84':(enemy?(heavy?'#292b2c':'#4b3033'):'#202520'));
  const trackEdge=frostColor(enemy?(heavy?'#5b5954':'#704347'):'#4a5148');
  const wheelOuter=frostColor(enemy?(heavy?'#66635d':'#75464a'):'#596158');
  const wheelInner=frostColor(enemy?(heavy?'#353735':'#303530'):'#303530');

  for(const sy of [-1,1]){
    const ty=sy*(hullB/2+trackW/2);
    x.fillStyle=trackDark;
    x.beginPath();x.roundRect(-trackL/2,ty-trackW/2,trackL,trackW,7);x.fill();
    x.strokeStyle=trackEdge;x.lineWidth=2;x.stroke();
    const wheels=isWasp?4:isMammoth?8:isTitan?6:5;
    for(let i=0;i<wheels;i++){
      const wx=-trackL*.38+i*(trackL*.76/Math.max(1,wheels-1));
      const wr=r*(isMammoth?.19:isTitan?.18:isWasp?.13:.16);
      x.fillStyle=wheelOuter;x.beginPath();x.arc(wx,ty,wr,0,6.283);x.fill();
      x.strokeStyle='#202320';x.lineWidth=1.5;x.stroke();
      x.fillStyle=wheelInner;x.beginPath();x.arc(wx,ty,wr*.34,0,6.283);x.fill();
    }
  }

  const body=frostColor(flash?'#e5c6a8':(enemy?(heavy?'#4e4942':'#713d41'):(isMammoth?'#424d43':isTitan?'#4b5747':isWasp?'#506347':'#566b4c')));
  const bodyDark=frostColor(enemy?(heavy?'#373532':'#593337'):(isMammoth?'#2b332e':isTitan?'#30382f':isWasp?'#354238':'#384337'));
  const bodyLight=frostColor(enemy?(heavy?'#625a50':'#758267'):(isMammoth?'#66736a':isTitan?'#687563':isWasp?'#758267':'#74836a'));
  const metal=frostColor(enemy?(heavy?'#756f66':'#9b5559'):'#a3aaa3');

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
  }else if(isMammoth){
    x.moveTo(L*.48,-hullB*.40);x.lineTo(L*.28,-hullB*.58);x.lineTo(-L*.36,-hullB*.60);
    x.lineTo(-L*.58,-hullB*.42);x.lineTo(-L*.62,-hullB*.18);x.lineTo(-L*.62,hullB*.18);
    x.lineTo(-L*.58,hullB*.42);x.lineTo(-L*.36,hullB*.60);x.lineTo(L*.28,hullB*.58);x.lineTo(L*.48,hullB*.40);
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
  }else if(isMammoth){
    x.moveTo(L*.32,-hullB*.42);x.lineTo(-L*.28,-hullB*.46);x.lineTo(-L*.48,-hullB*.25);
    x.lineTo(-L*.48,hullB*.25);x.lineTo(-L*.28,hullB*.46);x.lineTo(L*.32,hullB*.42);
    x.lineTo(L*.40,hullB*.18);x.lineTo(L*.40,-hullB*.18);
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
  }else if(isMammoth){
    x.fillStyle=metal;
    x.fillRect(L*.18,-hullB*.46,L*.25,hullB*.92);
    x.fillStyle=bodyDark;x.fillRect(-L*.48,-hullB*.50,L*.34,hullB*.14);x.fillRect(-L*.48,hullB*.36,L*.34,hullB*.14);
    x.fillStyle=metal;x.fillRect(-L*.54,-hullB*.32,L*.13,hullB*.64);
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
  if(isMammoth){
    x.fillRect(-L*.50,-hullB*.39,L*.36,hullB*.78);x.fillStyle=metal;
    for(let i=0;i<7;i++)x.fillRect(-L*.45+i*L*.052,-hullB*.28,L*.022,hullB*.56);
  }else if(isTitan){
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
  x.strokeStyle=frostColor(enemy?(heavy?'#81796d':'#9a5559'):'#788478');x.lineWidth=1.1;
  x.beginPath();x.moveTo(-L*.20,-hullB*.38);x.lineTo(-L*.20,hullB*.38);x.stroke();
  x.beginPath();x.moveTo(L*.18,-hullB*.30);x.lineTo(L*.18,hullB*.30);x.stroke();
  x.fillStyle=frostColor(enemy?(heavy?'#aaa092':'#ad5d60'):'#aeb7ad');
  for(const px of [-L*.25,L*.14])for(const py of [-hullB*.32,hullB*.32]){
    x.beginPath();x.arc(px,py,r*.035,0,6.283);x.fill();
  }
  if(!enemy){x.fillStyle='#46d9df';x.fillRect(L*.39,-r*.045,r*.11,r*.09)}

  // Hull upgrade visuals: each player hull tier adds increasingly obvious armor,
  // reinforcement and machinery without changing the base hull identity.
  const hullTier=Math.max(0,Math.min(3,Number(hullTierVisual)||0));
  if(hullTier>0){
    const tierMetal=hullTier===1?'#20c85a':hullTier===2?'#a13cff':'#ffd23f';
    const tierDark=hullTier===1?'#126b32':hullTier===2?'#4a176f':'#755300';
    const tierGlow=tierVisual(hullTier).glow;

    // Tier 1: reinforced side armor and extra fasteners.
    x.fillStyle=tierDark;
    for(const sy of [-1,1]){
      x.beginPath();
      x.roundRect(-L*.30,sy*hullB*.34-r*.055,L*.62,r*.11,r*.045);x.fill();
    }
    x.fillStyle=tierMetal;
    for(const sy of [-1,1]){
      x.beginPath();x.roundRect(-L*.04,sy*hullB*.34-r*.035,L*.32,r*.07,r*.025);x.fill();
    }
    if(hullTier>=2){
      // Tier 2: larger bolt-on armor modules and a reinforced nose wedge.
      x.fillStyle=tierMetal;
      x.beginPath();
      x.moveTo(L*.20,-hullB*.42);x.lineTo(L*.52,-hullB*.16);x.lineTo(L*.52,hullB*.16);x.lineTo(L*.20,hullB*.42);
      x.lineTo(L*.12,hullB*.30);x.lineTo(L*.39,0);x.lineTo(L*.12,-hullB*.30);x.closePath();x.fill();
      x.fillStyle=tierDark;
      x.beginPath();x.roundRect(-L*.42,-hullB*.52,L*.30,hullB*.12,r*.04);x.fill();
      x.beginPath();x.roundRect(-L*.42,hullB*.40,L*.30,hullB*.12,r*.04);x.fill();
      x.fillStyle=tierGlow;
      x.fillRect(-L*.38,-hullB*.49,L*.22,r*.035);
      x.fillRect(-L*.38,hullB*.455,L*.22,r*.035);
    }
    if(hullTier>=3){
      // Tier 3: heavy external armor skirts, front ram plate and glowing power vents.
      x.fillStyle=tierDark;
      for(const sy of [-1,1]){
        x.beginPath();
        x.roundRect(-L*.48,sy*(hullB*.47)-r*.075,L*.82,r*.15,r*.055);x.fill();
      }
      x.fillStyle=tierMetal;
      x.beginPath();
      x.moveTo(L*.40,-hullB*.30);x.lineTo(L*.61,-hullB*.13);x.lineTo(L*.61,hullB*.13);x.lineTo(L*.40,hullB*.30);
      x.lineTo(L*.28,hullB*.18);x.lineTo(L*.48,0);x.lineTo(L*.28,-hullB*.18);x.closePath();x.fill();
      x.fillStyle=tierGlow;
      for(const sy of [-1,1]){
        x.fillRect(-L*.26,sy*(hullB*.43)-r*.025,L*.42,r*.05);
      }
      x.globalAlpha=.8;
      x.fillRect(-L*.47,-hullB*.24,r*.07,hullB*.48);
      x.globalAlpha=1;
      x.strokeStyle=tierGlow;x.lineWidth=Math.max(1,r*.045);
      x.beginPath();x.arc(-L*.30,0,r*.11,0,6.283);x.stroke();
    }
    // Upgrade badge/tech strip sits behind the turret so it reads as part of the hull.
    x.fillStyle=tierGlow;x.globalAlpha=.9;
    x.fillRect(-r*.035,-hullB*.18,r*.07,hullB*.36);x.globalAlpha=1;
  }

  // One turret ring only. Placement is part of the hull silhouette.
  x.fillStyle=frostColor(enemy?(heavy?'#363432':'#513033'):'#343c34');
  x.beginPath();x.arc(turretX,0,r*(isMammoth?.68:isTitan?.62:isWasp?.50:.57),0,6.283);x.fill();
  x.strokeStyle=frostColor(enemy?(heavy?'#696258':'#8c4b4f'):'#697760');x.lineWidth=1.4;x.stroke();

  x.save();x.translate(turretX,0);x.rotate(turretAngle-hullAngle);
  const visualBarrel=gunForTurret(turretId);
  const visualTurret=turrets.find(v=>v.id===turretId)||turrets[0];
  const tr=r*(visualTurret.scale||1);
  const visualTierIndex=Math.max(0,Math.min(3,visualTurret.id==='railgun'?(enemy?railgunTierVisual:railgunTier):visualTurret.id==='rapid'?(enemy?twinsTierVisual:twinsTier):visualTurret.id==='fast'?(enemy?firebirdTierVisual:firebirdTier):visualTurret.id==='freeze'?freezeTierVisual:visualTurret.id==='thunder'?(enemy?thunderTierVisual:thunderTier):(enemy?smokyTierVisual:smokyTier)));
  const visualTier=tierVisual(visualTierIndex);
  const railAccent=visualTurret.id==='railgun'&&visualTierIndex>0?visualTier.accent:null;
  const smokyAccent=visualTurret.id==='standard'&&visualTierIndex>0?visualTier.accent:null;
  const universalTurretAccent=visualTierIndex>0?visualTier.accent:null;

  // Turret silhouette varies with weapon class.
  x.fillStyle=frostColor(enemy?(heavy?'#45413b':'#61373a'):'#424d3f');x.beginPath();
  if(visualTurret.id==='railgun'){
    x.moveTo(-tr*.50,-tr*.30);x.lineTo(tr*.08,-tr*.36);x.quadraticCurveTo(tr*.42,-tr*.27,tr*.48,0);
    x.quadraticCurveTo(tr*.42,tr*.27,tr*.08,tr*.36);x.lineTo(-tr*.50,tr*.30);x.quadraticCurveTo(-tr*.60,0,-tr*.50,-tr*.30);
  }else if(visualTurret.id==='fast'){
    // Firebird: old Tanki-style low, armored flamethrower body.
    // Broad wedge, sloped nose, recessed center channel and heavy side armor.
    x.moveTo(-tr*.52,-tr*.36);
    x.lineTo(-tr*.12,-tr*.49);
    x.lineTo(tr*.34,-tr*.40);
    x.quadraticCurveTo(tr*.55,-tr*.20,tr*.55,0);
    x.quadraticCurveTo(tr*.55,tr*.20,tr*.34,tr*.40);
    x.lineTo(-tr*.12,tr*.49);
    x.lineTo(-tr*.52,tr*.36);
    x.quadraticCurveTo(-tr*.63,0,-tr*.52,-tr*.36);
  }else if(visualTurret.id==='freeze'){
    x.moveTo(-tr*.54,-tr*.34);x.lineTo(tr*.05,-tr*.48);x.lineTo(tr*.43,-tr*.28);x.quadraticCurveTo(tr*.56,0,tr*.43,tr*.28);x.lineTo(tr*.05,tr*.48);x.lineTo(-tr*.54,tr*.34);x.quadraticCurveTo(-tr*.62,0,-tr*.54,-tr*.34);
  }else if(visualTurret.id==='thunder'){
    x.moveTo(-tr*.50,-tr*.31);x.quadraticCurveTo(-tr*.18,-tr*.47,tr*.24,-tr*.41);x.lineTo(tr*.50,-tr*.22);x.quadraticCurveTo(tr*.58,0,tr*.50,tr*.22);x.lineTo(tr*.24,tr*.41);x.quadraticCurveTo(-tr*.18,tr*.47,-tr*.50,tr*.31);x.quadraticCurveTo(-tr*.61,0,-tr*.50,-tr*.31);
  }else if(visualTurret.id==='rapid'){
    // Twins: compact rounded turret with a broad front and twin gun mounts.
    x.moveTo(-tr*.50,-tr*.34);x.quadraticCurveTo(-tr*.18,-tr*.45,tr*.24,-tr*.39);
    x.quadraticCurveTo(tr*.52,-tr*.24,tr*.52,0);x.quadraticCurveTo(tr*.52,tr*.24,tr*.24,tr*.39);
    x.quadraticCurveTo(-tr*.18,tr*.45,-tr*.50,tr*.34);x.quadraticCurveTo(-tr*.58,0,-tr*.50,-tr*.34);
  }else{
    // Smoky: classic Tanki-style compact, rounded turret with a distinct sloped front.
    x.moveTo(-tr*.48,-tr*.30);x.quadraticCurveTo(-tr*.28,-tr*.46,tr*.02,-tr*.43);
    x.lineTo(tr*.31,-tr*.30);x.quadraticCurveTo(tr*.48,-tr*.15,tr*.50,0);
    x.quadraticCurveTo(tr*.48,tr*.15,tr*.31,tr*.30);x.lineTo(tr*.02,tr*.43);
    x.quadraticCurveTo(-tr*.28,tr*.46,-tr*.48,tr*.30);x.quadraticCurveTo(-tr*.57,0,-tr*.48,-tr*.30);
  }
  x.closePath();x.fill();

  if(visualTurret.id==='railgun'&&railAccent){
    x.strokeStyle=railAccent;x.lineWidth=1.7;
    x.beginPath();x.moveTo(-tr*.34,-tr*.27);x.lineTo(tr*.20,-tr*.23);x.lineTo(tr*.35,-tr*.10);x.stroke();
    x.beginPath();x.moveTo(-tr*.34,tr*.27);x.lineTo(tr*.20,tr*.23);x.lineTo(tr*.35,tr*.10);x.stroke();
  }else if(visualTurret.id==='rapid'){
    const activeTwinsVisualTier=Math.max(0,Math.min(3,enemy?twinsTierVisual:twinsTier)); const twinsAccent=(twinsTiers[activeTwinsVisualTier]||twinsTiers[0]).tier===0?'rgba(0,0,0,0)':(twinsTiers[activeTwinsVisualTier]||twinsTiers[0]).col;
    x.fillStyle=twinsAccent;x.globalAlpha=.9;
    x.beginPath();x.roundRect(-tr*.38,-tr*.31,tr*.22,tr*.13,tr*.04);x.fill();
    x.beginPath();x.roundRect(-tr*.38,tr*.18,tr*.22,tr*.13,tr*.04);x.fill();
    x.globalAlpha=1;x.strokeStyle=twinsAccent;x.lineWidth=tr*.055;
    x.beginPath();x.moveTo(-tr*.24,-tr*.23);x.lineTo(tr*.28,-tr*.16);x.stroke();
    x.beginPath();x.moveTo(-tr*.24,tr*.23);x.lineTo(tr*.28,tr*.16);x.stroke();
    x.fillStyle=twinsAccent;x.fillRect(tr*.08,-tr*.045,tr*.30,tr*.09);
    x.globalAlpha=.8;x.beginPath();x.arc(-tr*.08,0,tr*.10,0,6.283);x.fill();x.globalAlpha=1;
  }else if(visualTurret.id==='standard'&&smokyAccent){
    x.fillStyle=smokyAccent;x.globalAlpha=.92;
    x.beginPath();x.moveTo(-tr*.34,-tr*.27);x.lineTo(tr*.16,-tr*.31);x.lineTo(tr*.28,-tr*.19);x.lineTo(-tr*.25,-tr*.15);x.closePath();x.fill();
    x.beginPath();x.moveTo(-tr*.34,tr*.27);x.lineTo(tr*.16,tr*.31);x.lineTo(tr*.28,tr*.19);x.lineTo(-tr*.25,tr*.15);x.closePath();x.fill();
    x.globalAlpha=1;x.strokeStyle=smokyAccent;x.lineWidth=tr*.055;
    x.beginPath();x.moveTo(-tr*.20,-tr*.21);x.lineTo(tr*.29,-tr*.12);x.stroke();
    x.beginPath();x.moveTo(-tr*.20,tr*.21);x.lineTo(tr*.29,tr*.12);x.stroke();
  }else if(visualTurret.id==='freeze'){
    // Freeze is deliberately a cryogenic projector, not a Firebird clone:
    // angular ice-shell body, split side fins and a faceted front shroud.
    const freezeVisual=freezeTiers[Math.max(0,Math.min(3,freezeTierVisual||0))]||freezeTiers[0];
    const ft=Math.max(0,Math.min(3,freezeTierVisual||0));
    x.fillStyle=frostColor(enemy?'#273b43':'#263f4a');
    x.beginPath();
    x.moveTo(-tr*.50,-tr*.25);x.lineTo(-tr*.24,-tr*.43);x.lineTo(tr*.18,-tr*.39);
    x.lineTo(tr*.48,-tr*.18);x.lineTo(tr*.52,0);x.lineTo(tr*.48,tr*.18);
    x.lineTo(tr*.18,tr*.39);x.lineTo(-tr*.24,tr*.43);x.lineTo(-tr*.50,tr*.25);
    x.lineTo(-tr*.58,0);x.closePath();x.fill();

    // Tier-colored cryo armor rails — same upgrade language as the other turrets.
    if(ft>0){
      x.fillStyle=freezeVisual.accent;x.globalAlpha=.9;
      x.beginPath();x.moveTo(-tr*.42,-tr*.34);x.lineTo(tr*.10,-tr*.46);x.lineTo(tr*.30,-tr*.32);x.lineTo(-tr*.25,-tr*.22);x.closePath();x.fill();
      x.beginPath();x.moveTo(-tr*.42,tr*.34);x.lineTo(tr*.10,tr*.46);x.lineTo(tr*.30,tr*.32);x.lineTo(-tr*.25,tr*.22);x.closePath();x.fill();
      x.globalAlpha=1;
    }

    // Recessed cryo core and ice-shaped front collar.
    x.fillStyle='#17313b';x.beginPath();x.roundRect(-tr*.27,-tr*.19,tr*.45,tr*.38,tr*.06);x.fill();
    x.fillStyle=freezeVisual.flame;x.globalAlpha=.95;
    x.beginPath();x.moveTo(-tr*.24,-tr*.13);x.lineTo(tr*.16,-tr*.16);x.lineTo(tr*.34,-tr*.08);x.lineTo(tr*.17,0);x.lineTo(tr*.34,tr*.08);x.lineTo(tr*.16,tr*.16);x.lineTo(-tr*.24,tr*.13);x.closePath();x.fill();
    x.globalAlpha=1;
    x.fillStyle=freezeVisual.core;x.globalAlpha=.95;x.fillRect(-tr*.02,-tr*.09,tr*.25,tr*.18);x.globalAlpha=1;

    x.fillStyle=freezeVisual.accent;x.globalAlpha=.95;
    x.beginPath();x.moveTo(tr*.24,-tr*.22);x.lineTo(tr*.49,-tr*.11);x.lineTo(tr*.37,0);x.lineTo(tr*.49,tr*.11);x.lineTo(tr*.24,tr*.22);x.lineTo(tr*.30,0);x.closePath();x.fill();
    x.globalAlpha=1;

    if(ft>=2){
      x.strokeStyle=freezeVisual.accent;x.lineWidth=tr*.055;
      x.beginPath();x.moveTo(-tr*.42,-tr*.29);x.lineTo(-tr*.14,-tr*.34);x.lineTo(tr*.08,-tr*.27);x.stroke();
      x.beginPath();x.moveTo(-tr*.42,tr*.29);x.lineTo(-tr*.14,tr*.34);x.lineTo(tr*.08,tr*.27);x.stroke();
    }
    if(ft>=3){
      x.strokeStyle=freezeVisual.core;x.lineWidth=tr*.045;
      x.beginPath();x.moveTo(-tr*.50,-tr*.15);x.lineTo(-tr*.31,-tr*.30);x.lineTo(-tr*.06,-tr*.33);x.stroke();
      x.beginPath();x.moveTo(-tr*.50,tr*.15);x.lineTo(-tr*.31,tr*.30);x.lineTo(-tr*.06,tr*.33);x.stroke();
    }
  }else if(visualTurret.id==='fast'){
    // Firebird armor accents use the exact same palette as the active flame tier.
    // This keeps the turret visually tied to its flame instead of using one fixed accent color.
    const fireAccentTier=firebirdTiers[Math.max(0,Math.min(3,firebirdTierVisual||0))]||firebirdTiers[0];
    const fireAccent=fireAccentTier.tier===0?'rgba(0,0,0,0)':fireAccentTier.accent;
    const fireFlame=fireAccentTier.tier===0?'rgba(0,0,0,0)':fireAccentTier.flame;
    const fireCore=fireAccentTier.tier===0?'rgba(0,0,0,0)':fireAccentTier.core;

    // Strong, unmistakable Firebird tier accents.
    x.fillStyle=frostColor(enemy?'#352d29':'#343a31');
    x.beginPath();
    x.moveTo(-tr*.34,-tr*.27);x.lineTo(tr*.18,-tr*.31);x.lineTo(tr*.38,-tr*.15);
    x.lineTo(tr*.38,tr*.15);x.lineTo(tr*.18,tr*.31);x.lineTo(-tr*.34,tr*.27);
    x.closePath();x.fill();

    // Bright tier-colored side armor plates.
    x.fillStyle=fireFlame;
    x.globalAlpha=.95;
    x.beginPath();x.moveTo(-tr*.34,-tr*.27);x.lineTo(tr*.18,-tr*.31);x.lineTo(tr*.28,-tr*.20);
      x.lineTo(-tr*.25,-tr*.16);x.closePath();x.fill();
    x.beginPath();x.moveTo(-tr*.34,tr*.27);x.lineTo(tr*.18,tr*.31);x.lineTo(tr*.28,tr*.20);
      x.lineTo(-tr*.25,tr*.16);x.closePath();x.fill();
    x.globalAlpha=1;

    // Large tier-colored heat vents.
    x.fillStyle=fireAccent;
    for(const sy of [-1,1]){
      for(let j=0;j<4;j++){
        const vx=-tr*.20+j*tr*.105;
        x.beginPath();x.ellipse(vx,sy*tr*.30,tr*.035,tr*.065,0,0,6.283);x.fill();
      }
    }

    // Raised twin fuel channels.
    x.strokeStyle=fireAccent;x.lineWidth=tr*.065;
    x.beginPath();x.moveTo(-tr*.18,-tr*.22);x.lineTo(tr*.30,-tr*.11);x.stroke();
    x.beginPath();x.moveTo(-tr*.18,tr*.22);x.lineTo(tr*.30,tr*.11);x.stroke();

    // Bright core stripe.
    x.strokeStyle=fireCore;x.lineWidth=tr*.045;
    x.globalAlpha=.9;
    x.beginPath();x.moveTo(-tr*.08,0);x.lineTo(tr*.36,0);x.stroke();
    x.globalAlpha=1;
  }

  x.strokeStyle=universalTurretAccent||frostColor(enemy?(heavy?'#746c61':'#925055'):'#7f8b75');x.lineWidth=1.25;
  x.beginPath();x.moveTo(-tr*.28,-tr*.40);x.quadraticCurveTo(-tr*.08,-tr*.29,tr*.04,-tr*.28);x.stroke();
  x.beginPath();x.moveTo(-tr*.28,tr*.40);x.quadraticCurveTo(-tr*.08,tr*.29,tr*.04,tr*.28);x.stroke();

  // Hatch and mantlet.
  x.fillStyle='#292e2a';x.beginPath();x.ellipse(-tr*.18,0,tr*.17,tr*.12,0,0,6.283);x.fill();
  x.strokeStyle=universalTurretAccent||'#89967c';x.stroke();
  x.fillStyle=frostColor(enemy?'#252729':'#292f2a');
  x.beginPath();x.roundRect(tr*.08,-tr*.18,tr*.34,tr*.36,5);x.fill();

  const barrelScale=visualBarrel.scale,barrelLength=visualBarrel.length;
  const barrelWidth=.15*barrelScale;
  if(visualTurret.id==='rapid'){
    // Two parallel cannons, mounted high/low like the classic Twins turret.
    x.fillStyle='#151819';
    for(const sy of [-1,1]){
      const yy=sy*tr*.115;
      x.fillRect(tr*.35,yy-tr*barrelWidth*.32,tr*1.16*barrelLength,tr*barrelWidth*.64);
      x.fillStyle='#0e1112';x.fillRect(tr*(1.46*barrelLength),yy-tr*.07,tr*.14,tr*.14);
      x.fillStyle='#151819';
    }
  }else if(visualTurret.id==='freeze'){
    const freezeVisual=freezeTiers[Math.max(0,Math.min(3,enemy?(freezeTierVisual||0):freezeTier))]||freezeTiers[0];
    x.fillStyle='#171a18';x.beginPath();x.moveTo(tr*.30,-tr*.12);x.lineTo(tr*.84,-tr*.14);x.lineTo(tr*1.22,-tr*.12);x.lineTo(tr*1.30,0);x.lineTo(tr*1.22,tr*.12);x.lineTo(tr*.84,tr*.14);x.lineTo(tr*.30,tr*.12);x.closePath();x.fill();
    x.fillStyle='#0b0d0c';x.beginPath();x.arc(tr*1.27,0,tr*.11,0,6.283);x.fill();x.fillStyle=freezeVisual.flame;x.globalAlpha=.9;x.fillRect(tr*.76,-tr*.13,tr*.08,tr*.26);x.globalAlpha=1;x.strokeStyle=freezeVisual.accent;x.lineWidth=1.7;x.beginPath();x.moveTo(tr*.55,-tr*.13);x.lineTo(tr*1.02,-tr*.18);x.stroke();x.beginPath();x.moveTo(tr*.55,tr*.13);x.lineTo(tr*1.02,tr*.18);x.stroke();
  }else if(visualTurret.id==='fast'){
    // Thick Firebird nozzle with tier-matched heat bands.
    const fireAccentTier=firebirdTiers[Math.max(0,Math.min(3,firebirdTierVisual||0))]||firebirdTiers[0];
    const fireAccent=fireAccentTier.accent;
    const fireFlame=fireAccentTier.flame;
    x.fillStyle='#171a18';
    x.beginPath();
    x.moveTo(tr*.30,-tr*.105);x.lineTo(tr*.83,-tr*.115);x.lineTo(tr*1.08,-tr*.19);
    x.lineTo(tr*1.22,-tr*.19);x.lineTo(tr*1.31,-tr*.11);x.lineTo(tr*1.31,tr*.11);
    x.lineTo(tr*1.22,tr*.19);x.lineTo(tr*1.08,tr*.19);x.lineTo(tr*.83,tr*.115);
    x.lineTo(tr*.30,tr*.105);x.closePath();x.fill();
    x.fillStyle='#4a5049';x.fillRect(tr*.45,-tr*.13,tr*.13,tr*.26);
    x.fillStyle='#0b0d0c';
    x.beginPath();x.ellipse(tr*1.28,0,tr*.10,tr*.105,0,0,6.283);x.fill();

    // Hot-metal band around the nozzle and matching tier-colored rails.
    x.fillStyle=fireFlame;
    x.globalAlpha=.9;
    x.fillRect(tr*.78,-tr*.13,tr*.07,tr*.26);
    x.globalAlpha=1;
    x.strokeStyle=fireAccent;x.lineWidth=1.6;
    x.beginPath();x.moveTo(tr*.58,-tr*.12);x.lineTo(tr*.98,-tr*.17);x.stroke();
    x.beginPath();x.moveTo(tr*.58,tr*.12);x.lineTo(tr*.98,tr*.17);x.stroke();
  }else{
    x.fillStyle='#151819';x.fillRect(tr*.35,-tr*barrelWidth/2,tr*1.16*barrelLength,tr*barrelWidth);
    if(visualBarrel.id==='122mm'){
      x.fillStyle='#0e1112';x.fillRect(tr*(1.32*barrelLength),-tr*.065,tr*.10,tr*.13);
    }else{
      x.fillStyle='#0e1112';x.fillRect(tr*(1.46*barrelLength),-tr*.105,tr*.14,tr*.21);
    }
  }

  x.fillStyle=universalTurretAccent||frostColor(enemy?(heavy?'#746a5d':'#9b5458'):'#849176');
  x.beginPath();x.arc(-tr*.36,-tr*.23,tr*.04,0,6.283);x.fill();
  x.beginPath();x.arc(-tr*.36,tr*.23,tr*.04,0,6.283);x.fill();

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
  // Enemy Railgun charge animations use the same 1-second energy buildup as the player's Railgun.
  for(const e of en){
    if(e.turretId!=='railgun'||!e.railCharging)continue;
    const a=e.turretAngle;
    const muzzle=enemyMuzzlePosition(e,gunForTurret(e.turretId),a);
    const muzzleX=muzzle.x,muzzleY=muzzle.y;
    const progress=1-e.railCharge;
    const tier=railgunTiers[Math.max(0,Math.min(3,e.turretTier||0))]||railgunTiers[0];
    x.save();x.translate(muzzleX,muzzleY);x.rotate(a);x.globalAlpha=.35+.65*progress;
    x.strokeStyle=tier.beam;x.lineWidth=3+5*progress;
    x.beginPath();x.arc(0,0,8+14*progress,0,6.283);x.stroke();
    x.strokeStyle=tier.glow||'#bffcff';x.lineWidth=2+3*progress;
    x.beginPath();x.moveTo(-10,0);x.lineTo(18+30*progress,0);x.stroke();
    x.fillStyle=tier.glow||'#bffcff';x.globalAlpha=.5+.5*progress;
    x.beginPath();x.arc(0,0,4+7*progress,0,6.283);x.fill();
    x.restore();
  }
  // Railgun beams linger and fade smoothly for 2 seconds.
  for(const b of railBeams){
    const a=Math.max(0,b.life/b.maxLife);
    x.save();x.globalAlpha=a;
    x.lineCap='round';const beamTier=Math.max(0,Math.min(3,b.tier===undefined?railgunTier:b.tier));const railTierVisual=railgunTiers[beamTier]||railgunTiers[0];
    x.strokeStyle=railTierVisual.tier===0?'#ffffff':railTierVisual.beam;x.lineWidth=4*a;x.beginPath();x.moveTo(b.x1,b.y1);x.lineTo(b.x2,b.y2);x.stroke();
    x.strokeStyle='#ffffff';x.lineWidth=1*a;x.beginPath();x.moveTo(b.x1,b.y1);x.lineTo(b.x2,b.y2);x.stroke();
    x.restore();
  }
  // Player death: keep the destroyed tank visible during its explosion, then return to menu.
  if(playerDeathTank){
    const d=playerDeathTank;
    x.save();
    x.globalAlpha=Math.max(0,Math.min(1,playerDeathTimer/.55));
    x.globalCompositeOperation='multiply';
    tankBody(d.x,d.y,d.r,d.angle,d.turretAngle,false,false,false,d.turretId,d.hullId,d.firebirdTier,d.twinsTier,d.smokyTier,d.turretId==='railgun'?d.railTier:0,d.hullTier||0,d.freezeTier||0,d.freezeStacks||0,d.thunderTier||0);
    x.globalCompositeOperation='source-over';
    x.restore();
  }
  // Death message fades in slowly over the first 1.6 seconds of the death sequence.
  if(playerDeathTank){
    const fade=Math.max(0,Math.min(1,playerDeathElapsed/1.6));
    x.save();
    x.globalAlpha=fade;
    x.textAlign='center';
    x.textBaseline='middle';
    x.font='900 58px system-ui, sans-serif';
    x.shadowColor='rgba(120,0,0,.45)';
    x.shadowBlur=10;
    x.fillStyle='#d71920';
    x.fillText('YOU DIED',W/2,H/2);
    x.restore();
  }
  // Destroyed tanks keep the exact normal tank geometry, but are rendered black.
  // Multiply only affects pixels actually painted by the tank, so it cannot create
  // rectangular black patches on the battlefield.
  for(const e of deadTanks){
    x.save();
    x.globalAlpha=1;
    x.globalCompositeOperation='multiply';
    tankBody(e.x,e.y,e.r,e.angle,e.turretAngle,true,e.heavy,false,e.turretId||'standard',e.hullId||'standard',e.firebirdTier||0,e.twinsTier||0,e.smokyTier||0,e.turretId==='railgun'?e.turretTier||0:0,e.hullTier||0,e.freezeTier||0,e.freezeStacks||0,e.thunderTier||0);
    x.globalCompositeOperation='source-over';
    x.restore();
  }
  // Smoky is an instant-hit cannon, so render a short-lived tracer to make the shot visible.
  for(let i=smokyTracers.length-1;i>=0;i--){
    const t=smokyTracers[i],a=Math.max(0,t.life/t.maxLife);
    x.save();x.globalAlpha=a;x.lineCap='round';
    x.strokeStyle=t.col||'#ff9d24';x.lineWidth=7*a;x.beginPath();x.moveTo(t.x1,t.y1);x.lineTo(t.x2,t.y2);x.stroke();
    x.strokeStyle=t.col||'#fff6d2';x.lineWidth=2.2*a;x.beginPath();x.moveTo(t.x1,t.y1);x.lineTo(t.x2,t.y2);x.stroke();
    x.fillStyle=t.col||'#fff6d2';x.beginPath();x.arc(t.x1,t.y1,6*a,0,6.283);x.fill();
    x.restore();
    t.life-=1/60;if(t.life<=0)smokyTracers.splice(i,1);
  }
  // shell trails / explosions
  for(const q of ps){x.globalAlpha=Math.max(0,q.life*2);x.fillStyle=q.col;x.beginPath();x.arc(q.x,q.y,q.size||3.5,0,6.283);x.fill()}x.globalAlpha=1;
  for(const b of bs){
    const col=b.col||'#ff8a00',trailCol=b.col?(b.col+''):'#ff9d24',coreCol=b.col?(b.col+''):'#fff4c2';
    for(let i=b.trail.length-1;i>=0;i--){const t=b.trail[i],a=t.life/.16*.55;x.globalAlpha=a;x.fillStyle=trailCol;x.beginPath();x.arc(t.x,t.y,b.r*(1.0+.9*a),0,6.283);x.fill();x.fillStyle=coreCol;x.globalAlpha=a*.9;x.beginPath();x.arc(t.x,t.y,b.r*(.55+.7*a),0,6.283);x.fill()}
    x.globalAlpha=1;x.fillStyle=col;x.beginPath();x.arc(b.x,b.y,b.r*1.7,0,6.283);x.fill();x.fillStyle=coreCol;x.beginPath();x.arc(b.x,b.y,b.r*1.05,0,6.283);x.fill();
  }
  for(const b of ebs){
    const col=b.col||'#ff3b18',trailCol=b.col?(b.col+''):'#ff4f2f',coreCol=b.col?(b.col+''):'#fff0d8';
    for(let i=b.trail.length-1;i>=0;i--){const t=b.trail[i],a=t.life/.16*.5;x.globalAlpha=a;x.fillStyle=trailCol;x.beginPath();x.arc(t.x,t.y,b.r*(.9+.8*a),0,6.283);x.fill();x.fillStyle=coreCol;x.globalAlpha=a*.85;x.beginPath();x.arc(t.x,t.y,b.r*(.5+.6*a),0,6.283);x.fill()}
    x.globalAlpha=1;x.fillStyle=col;x.beginPath();x.arc(b.x,b.y,b.r*1.65,0,6.283);x.fill();x.fillStyle=coreCol;x.beginPath();x.arc(b.x,b.y,b.r,0,6.283);x.fill();
  }
  // Shell impact flashes/explosions are represented by the particle bursts created on impact.
  for(const e of en){
    tankBody(e.x,e.y,e.r,e.angle,e.turretAngle,true,e.heavy,e.hitFlash>0,e.turretId||'standard',e.hullId||'standard',e.firebirdTier||0,e.twinsTier||0,e.smokyTier||0,e.turretId==='railgun'?e.turretTier||0:0,e.hullTier||0,e.freezeTier||0,e.freezeStacks||0,e.thunderTier||0);
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
  if(!p.dead)tankBody(p.x,p.y,p.r,p.angle,p.turretAngle,false,false,p.inv>0,p.turretId,p.hullId,firebirdTier,twinsTier,smokyTier,railgunTier,hullTierById[p.hullId]||0,freezeTier,p.freezeStacks||0,thunderTier);
  const barW=p.r*2.7, barX=p.x-barW/2, hpY=p.y-p.r-18, reloadY=p.y-p.r-10;
  const turret=turrets.find(v=>v.id===p.turretId)||turrets[0], barrel=gunForTurret(p.turretId);
  const activeRailTier=railgunTiers[Math.max(0,Math.min(3,railgunTier))];
  const activeSmokyTier=smokyTiers[Math.max(0,Math.min(3,smokyTier))]||smokyTiers[0];
  const actualThunderTier=thunderTiers[Math.max(0,Math.min(3,thunderTier))]||thunderTiers[0];
  const actualReloadTime=barrel.id==='122mmLong'
    ? barrel.reloadTime*(activeRailTier?.reloadMult||1)
    : barrel.id==='57mm'
      ? activeSmokyTier.reloadTime
      : barrel.id==='thunder'
        ? actualThunderTier.reloadTime
        : barrel.reloadTime;
  // Railgun charge drains the reload bar toward zero before the shot,
  // then the normal reload cycle starts from empty after firing.
  const reloadPct=(barrel.id==='122mm'&&barrel.flame)
    ?Math.max(0,Math.min(1,p.firebirdFuel/(p.firebirdMaxFuel||5)))
    :(barrel.id==='122mmFreeze'&&barrel.freeze)
      ?Math.max(0,Math.min(1,p.freezeFuel/(p.freezeMaxFuel||5)))
    :p.railCharging
      ?Math.max(0,Math.min(1,p.railCharge))
      :(actualReloadTime>0?Math.max(0,Math.min(1,1-p.cd/actualReloadTime)):1);
  x.fillStyle='#252c35';x.fillRect(barX,hpY,barW,4);x.fillStyle='#e15b64';x.fillRect(barX,hpY,barW*Math.max(0,p.hp/p.max),4);
  x.fillStyle='#252c35';x.fillRect(barX,reloadY,barW,3);x.fillStyle='#ffd21a';x.fillRect(barX,reloadY,barW*reloadPct,3);
  for(const q of dmgTexts){x.globalAlpha=Math.max(0,q.life/(q.kind==='burn'?.9:.7));x.fillStyle=q.col||'#ff3b3b';x.font=q.kind==='burn'?'bold 14px system-ui':'bold 18px system-ui';x.textAlign='center';x.fillText(q.kind==='burn'?'🔥 -'+q.text:'-'+q.text,q.x,q.y);x.globalAlpha=1}
  x.restore();

  const xp=Math.max(0,p.xp/p.next);
  $('xpBar').style.width=xp*100+'%';
  $('xpText').textContent=p.xp+'/'+p.next;
  $('levelText').textContent=p.lv;const topCoins=$('topCoinsText'),topKills=$('topKillsText');if(topCoins)topCoins.textContent=p.coins;if(topKills)topKills.textContent=p.kills;
  const reloadBar=$('reloadBar');
  if(reloadBar)reloadBar.style.width=(reloadPct*100)+'%';
  if((barrel.id==='122mm'&&barrel.flame)||(barrel.id==='122mmFreeze'&&barrel.freeze)){
    const reloadText=$('reloadText');
    if(reloadText)reloadText.textContent='FUEL';
    if(reloadText)reloadText.style.color='#ffd21a';
  }else{
    const reloadText=$('reloadText');
    if(reloadText)reloadText.textContent=p.cd>0?'RELOADING':'RELOAD TIME';
    if(reloadText)reloadText.style.color=p.cd>0?'#ff4b4b':'#39e66b';
  }
  // Reload countdown only; aiming/dispersion UI removed.
  const cursorReload=$('cursorReload');
  if(cursorReload){
    const activeBarrel=gunForTurret(p.turretId);
    const activeRailTier=railgunTiers[Math.max(0,Math.min(3,railgunTier))];
    const activeSmokyTier=smokyTiers[Math.max(0,Math.min(3,smokyTier))]||smokyTiers[0];
    const activeThunderTier=thunderTiers[Math.max(0,Math.min(3,thunderTier))]||thunderTiers[0];
    const actualReloadTime=activeBarrel.id==='122mmLong'
      ? activeBarrel.reloadTime*(activeRailTier?.reloadMult||1)
      : activeBarrel.id==='57mm'
        ? activeSmokyTier.reloadTime
        : activeBarrel.id==='thunder'
          ? activeThunderTier.reloadTime
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
let runtimeRecoveryUsed=false;
function showRuntimeError(err,context='GAME RUNTIME'){
  const message=err&&err.stack||err&&err.message||String(err||'Unknown error');
  let box=document.getElementById('bootError');
  if(!box){box=document.createElement('div');box.id='bootError';document.body.appendChild(box)}
  box.hidden=false;
  box.textContent=context+' ERROR:\\n'+message+'\\n\\nThe game stopped safely instead of freezing. Reload the page to retry.';
  box.style.cssText='position:fixed;inset:12px;z-index:99999;background:#5b1010;color:#fff;padding:18px;border:2px solid #f66;border-radius:12px;font:14px monospace;white-space:pre-wrap;overflow:auto';
}
function recoverRuntime(err){
  showRuntimeError(err);
  if(runtimeRecoveryUsed)return;
  runtimeRecoveryUsed=true;
  try{stopEngineSound()}catch(e){}
  try{over=true;gameScreen='menu';menuPausedGame=false}catch(e){}
  try{reset();showMenu(false)}catch(e){}
}
function frame(t){
  const dt=Math.min(.033,(t-last)/1000||0);last=t;
  try{update(dt);draw();runtimeRecoveryUsed=false}catch(err){recoverRuntime(err)}
  requestAnimationFrame(frame);
}
try{
  updateVersionLabel();
  reset();
  showMenu();
  window.__GAME_BOOT_OK=true;
}catch(err){
  showRuntimeError(err,'GAME STARTUP');
}
requestAnimationFrame(frame);