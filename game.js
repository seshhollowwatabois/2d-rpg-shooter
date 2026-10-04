const c=document.getElementById('game'),x=c.getContext('2d'),$=id=>document.getElementById(id);
let W,H,last=0,spawn=0,over=false,shake=0,p,en=[],bs=[],ebs=[],ps=[],dmgTexts=[],walls=[];
let wave=1,waveRemaining=0,waveStarted=false,waveClearTimer=0;
const keys=new Set(),mouse={x:0,y:0,down:false},touch={active:false,x:0,y:0};
const mobileDrive={up:false,down:false,left:false,right:false};
const hulls=[
  {id:'heavy',name:'KV-1 Heavy',cost:80,hp:610,speed:90,reverse:60,turn:1.15,scale:1.12,armor:{front:120,side:80,rear:60}},
  {id:'standard',name:'T-34',cost:0,hp:370,speed:120,reverse:75,turn:1.65,scale:1,armor:{front:80,side:45,rear:35}},
  {id:'scout',name:'BT-7 Scout',cost:50,hp:270,speed:155,reverse:95,turn:2.1,scale:.92,armor:{front:45,side:30,rear:20}}
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
  {id:'57mm',name:'57mm Barrel',cost:0,minDamage:110,maxDamage:130,penetration:55,precision:.68,reloadTime:3,dispersionTime:4,scale:.82,length:.82},
  {id:'85mm',name:'85mm Barrel',cost:0,minDamage:240,maxDamage:270,penetration:90,precision:.88,reloadTime:4,dispersionTime:7,scale:1,length:1},
  {id:'122mm',name:'122mm Heavy Barrel',cost:0,minDamage:390,maxDamage:440,penetration:140,precision:1,reloadTime:8,dispersionTime:12,scale:1.22,length:1.12},
  {id:'122mmLong',name:'122mm Long Heavy Barrel',cost:0,minDamage:500,maxDamage:700,penetration:160,precision:1,reloadTime:12,dispersionTime:18,scale:1.28,length:1.65,instant:true}
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

function reset(){
  const hull=hulls.find(v=>v.id===equippedHull)||hulls[0], turret=turrets.find(v=>v.id===equippedTurret)||turrets[0], barrel=barrels.find(v=>v.id===equippedBarrel)||barrels[0], engine=engines.find(v=>v.id===equippedEngine)||engines[0];
  const totalHp=hull.hp+turret.hp;
  p={x:W/2,y:H/2,r:20*hull.scale,speed:hull.speed*engine.speed,hp:totalHp,max:totalHp,lv:1,aimPrecision:barrel.precision,xp:0,next:120,coins:0,kills:0,cd:0,inv:0,angle:0,turretAngle:0,burnTime:0,burnDamage:0,hullId:hull.id,turretId:turret.id,barrelId:barrel.id};
  en=[];bs=[];ebs=[];ps=[];dmgTexts=[];spawn=.8;over=false;wave=1;waveRemaining=waveSize(wave);waveStarted=true;waveClearTimer=0;
  walls=[
    {x:W*.18,y:H*.22,w:150,h:28},{x:W*.52,y:H*.18,w:190,h:28},{x:W*.76,y:H*.34,w:34,h:145},
    {x:W*.28,y:H*.55,w:190,h:30},{x:W*.58,y:H*.64,w:34,h:150},{x:W*.08,y:H*.70,w:145,h:28},
    {x:W*.42,y:H*.40,w:95,h:26}
  ];
  $('death').hidden=true;
}

function pos(e){const r=c.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top}
c.addEventListener('pointermove',pos);
c.addEventListener('pointerdown',e=>{pos(e);mouse.down=true;c.setPointerCapture?.(e.pointerId)});
addEventListener('pointerup',()=>mouse.down=false);
addEventListener('pointercancel',()=>mouse.down=false);
addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.code==='Space')e.preventDefault();if(over&&(e.key==='Enter'||e.code==='Space'))reset()});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
$('shopToggle').onclick=()=>{$('shop').classList.toggle('open');renderShop()};
$('restart').onclick=reset;

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
  const ox=obj.x,oy=obj.y;
  obj.x+=dx;if(wallHitCircle(obj.x,obj.y,obj.r))obj.x=ox;
  obj.y+=dy;if(wallHitCircle(obj.x,obj.y,obj.r))obj.y=oy;
}
function addXp(n){
  p.xp+=n;
  while(p.xp>=p.next){p.xp-=p.next;p.lv++;p.next=Math.floor(p.next*1.28);p.hp=p.max;p.speed+=3;burst(p.x,p.y,'#78b7ff',35)}
}
function waveSize(w){return 3+w*2;}
function startNextWave(){wave++;waveRemaining=waveSize(wave);waveClearTimer=0;}

function pickEnemyGun(){
  const roll=Math.random();
  if(roll<.55)return '57mm';
  if(roll<.85)return '85mm';
  if(roll<.97)return '122mm';
  return '122mmLong';
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
  const hullId=pickEnemyHull();
  const heavy=hullId==='heavy', hull=hulls.find(v=>v.id===hullId)||hulls[0];
  const enemyBarrelId=pickEnemyGun();
  const hp=100;
  en.push({
    x:a,y:b,r:20*hull.scale,speed:hull.speed*.4,hp,max:hp,dmg:heavy?35:20,
    heavy,hullId,enemyBarrelId,angle:0,turretAngle:0,fire:.8+Math.random()*1.5,hitFlash:0,burnTime:0,burnDamage:0,
    wanderX:Math.random()*W,wanderY:Math.random()*H,wanderTime:1+Math.random()*3,
    idle:Math.random()<.3
  });
  waveRemaining--;
}
function shoot(){
  if(p.cd>0)return;
  const barrel=barrels.find(v=>v.id===p.barrelId)||barrels[0];
  const a=Math.atan2(mouse.y-p.y,mouse.x-p.x);p.turretAngle=a;
  const spread=(1-p.aimPrecision)*0.45;
  const fireAngle=a+(Math.random()-.5)*spread;
  const muzzleX=p.x+Math.cos(fireAngle)*34,muzzleY=p.y+Math.sin(fireAngle)*34;
  const dmg=barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage);
  if(barrel.instant){
    const range=1400,cos=Math.cos(fireAngle),sin=Math.sin(fireAngle);
    let hit=null,best=Infinity;
    for(const e of en){
      const dx=e.x-muzzleX,dy=e.y-muzzleY,along=dx*cos+dy*sin,side=Math.abs(dx*sin-dy*cos);
      if(along>0&&along<range&&side<=e.r&&along<best){hit=e;best=along}
    }
    if(hit){
      const result=applyBulletHit(hit,dmg,hit.x,hit.y,barrel.penetration,null);
      if(hit.hp<=0)killEnemy(hit,en.indexOf(hit));
    }
    burst(muzzleX,muzzleY,'#ffd27a',12);
  }else{
    const speed=({"57mm":1000,"85mm":1300,"122mm":1600}[barrel.id]||1300);
    bs.push({x:muzzleX,y:muzzleY,vx:Math.cos(fireAngle)*speed,vy:Math.sin(fireAngle)*speed,r:2.8,life:1.8,dmg,penetration:barrel.penetration,trail:[]});
  }
  p.cd=barrel.reloadTime;burst(muzzleX,muzzleY,'#ffd27a',6);
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
    burst(bx,by,'#9aa5ad',6);
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
  burst(bx,by,penetrates?'#ffd27a':'#b8c0c8',penetrates?14:8);
  return {profile,ricochet:false};
}
function enemyShoot(e){
  const a=Math.atan2(p.y-e.y,p.x-e.x);e.turretAngle=a;
  const barrel=barrels.find(v=>v.id===e.enemyBarrelId)||barrels[0];
  const damage=barrel.minDamage+Math.random()*(barrel.maxDamage-barrel.minDamage);
  if(barrel.instant){
    const range=1400,cos=Math.cos(a),sin=Math.sin(a);
    const dx=p.x-e.x,dy=p.y-e.y,along=dx*cos+dy*sin,side=Math.abs(dx*sin-dy*cos);
    if(along>0&&along<range&&side<=p.r)applyBulletHit(p,damage,p.x,p.y,barrel.penetration,null);
  }else{
    const speed=({"57mm":1000,"85mm":1300,"122mm":1600}[barrel.id]||1300);
    ebs.push({x:e.x+Math.cos(a)*(e.r+10),y:e.y+Math.sin(a)*(e.r+10),vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:2.5,life:2.4,dmg:damage,penetration:barrel.penetration,trail:[]});
  }
  e.fire=barrel.reloadTime;
  burst(e.x+Math.cos(a)*e.r,e.y+Math.sin(a)*e.r,barrel.instant?'#ffd27a':'#ff875f',barrel.instant?9:4);
}
function killEnemy(e,j){
  p.kills++;p.coins+=e.heavy?15:7;addXp(e.heavy?70:35);
  burst(e.x,e.y,e.heavy?'#c77d52':'#d85b68',28);en.splice(j,1);
}
function die(){reset()}
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
  if(over)return;
  p.cd=Math.max(0,p.cd-dt);p.inv=Math.max(0,p.inv-dt);
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
  // Moving throws off the gun. Accuracy recovers while the hull is stationary.
  const moving=drive!==0;
  // Dispersion is continuous: movement pushes accuracy down gradually, while stopping
  // lets it recover gradually. The indicator therefore shows the actual current accuracy.
  const dispersionTime=barrel.dispersionTime||1;
  const aimChangeRate=moving?(0.50/Math.max(.1,dispersionTime)):(0.50/Math.max(.1,dispersionTime));
  const targetTurret=Math.atan2(mouse.y-p.y,mouse.x-p.x);
  let turretDa=((targetTurret-p.turretAngle+Math.PI*3)%(Math.PI*2))-Math.PI;
  const playerTurretTurnRate=turret.turn;
  p.turretAngle+=Math.max(-playerTurretTurnRate*dt,Math.min(playerTurretTurnRate*dt,turretDa));
  // Accuracy starts low while moving and settles toward 100% while stopped.
  p.aimPrecision=barrel.precision;
  const is122=barrel.id==='122mm'||barrel.id==='122mmLong';
  const aimTarget=moving?(is122?0.05:0.25):1;
  p.aimPrecision+=Math.sign(aimTarget-p.aimPrecision)*Math.min(Math.abs(aimTarget-p.aimPrecision),aimChangeRate*dt);
  if(mouse.down||keys.has(' '))shoot();

  for(let i=bs.length-1;i>=0;i--){
    const b=bs[i];b.trail.unshift({x:b.x,y:b.y,life:.16});if(b.trail.length>8)b.trail.pop();b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;b.trail=b.trail.map(t=>({...t,life:t.life-dt})).filter(t=>t.life>0);let hit=false;
    if(wallHitCircle(b.x,b.y,b.r)){hit=true;burst(b.x,b.y,'#b8c0c8',7);break;}
    for(let j=en.length-1;j>=0;j--){
      const e=en[j];
      if(Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){
        const result=applyBulletHit(e,b.dmg,b.x,b.y,b.penetration,b);
        hit=!result.ricochet;
        if(e.hp<=0)killEnemy(e,j);break;
      }
    }
    if(hit||b.life<=0||b.x<-60||b.x>W+60||b.y<-60||b.y>H+60)bs.splice(i,1);
  }

  for(let i=ebs.length-1;i>=0;i--){
    const b=ebs[i];b.trail.unshift({x:b.x,y:b.y,life:.16});if(b.trail.length>8)b.trail.pop();b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;b.trail=b.trail.map(t=>({...t,life:t.life-dt})).filter(t=>t.life>0);
    if(wallHitCircle(b.x,b.y,b.r)){burst(b.x,b.y,'#b8c0c8',7);ebs.splice(i,1);continue;}
    if(Math.hypot(b.x-p.x,b.y-p.y)<b.r+p.r){
      if(p.inv<=0){
        const profile=getHitProfile(p,b.x,b.y);
        if(Math.random()<ricochetChance(p,b.x,b.y,b.vx,b.vy)){
          reflectBullet(b,p,b.x,b.y);
          burst(b.x,b.y,'#f5f7f7',12);
          burst(b.x,b.y,'#9aa5ad',6);
          continue;
        }
        const armor=getArmor(p,profile.zone);
        const chance=penetrationChance(b.penetration,armor);
        const penetrates=Math.random()<chance;
        const damage=penetrates?b.dmg:0;
        if(penetrates){
          p.hp-=damage;p.inv=.28;shake=10;
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
    e.fire-=dt;e.hitFlash=Math.max(0,e.hitFlash-dt);
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
    if(!e.idle){
      const wa=Math.atan2(e.wanderY-e.y,e.wanderX-e.x);
      let wda=((wa-e.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
      const turnRate=2.1;
      e.angle+=Math.max(-turnRate*dt,Math.min(turnRate*dt,wda));
      const wd=Math.hypot(e.wanderX-e.x,e.wanderY-e.y);
      if(wd>28){
        moveWithWalls(e,Math.cos(e.angle)*e.speed*dt,Math.sin(e.angle)*e.speed*dt);
        if(e.x===oldEx&&e.y===oldEy)e.idle=true;
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
    if(d<p.r+e.r&&p.inv<=0){p.hp-=e.dmg*.45;p.inv=.4;shake=9;burst(p.x,p.y,'#e15b64',10);if(p.hp<=0)die()}
  }

  // Tank-to-tank collision damage. Heavy tanks hit harder and both tanks take damage.
  for(let i=0;i<en.length;i++){
    const a=en[i];
    for(let j=i+1;j<en.length;j++){
      const b=en[j],d=Math.hypot(a.x-b.x,a.y-b.y),min=a.r+b.r;
      if(d<min){
        const nx=(b.x-a.x)/(d||1),ny=(b.y-a.y)/(d||1),push=(min-d)*.5;
        a.x-=nx*push;a.y-=ny*push;b.x+=nx*push;b.y+=ny*push;
        const impact=14*dt;
        a.hp-=impact*(b.heavy?1.35:1);b.hp-=impact*(a.heavy?1.35:1);
        a.hitFlash=.08;b.hitFlash=.08;
        if(Math.random()<.12)burst((a.x+b.x)/2,(a.y+b.y)/2,'#ff9b55',3);
      }
    }
  }

  // Player also takes collision damage from enemy tanks.
  for(const e of en){
    const d=Math.hypot(p.x-e.x,p.y-e.y),min=p.r+e.r;
    if(d<min){
      const nx=(e.x-p.x)/(d||1),ny=(e.y-p.y)/(d||1),push=(min-d)*.65;
      p.x-=nx*push;p.y-=ny*push;e.x+=nx*push;e.y+=ny*push;
      if(p.inv<=0){const impact=22*(e.heavy?1.4:1);p.hp-=impact;p.inv=.25;shake=7;burst((p.x+e.x)/2,(p.y+e.y)/2,'#ff9b55',5);if(p.hp<=0)die()}
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
    tankBody(e.x,e.y,e.r,e.angle,e.turretAngle,true,e.heavy,e.hitFlash>0,'85mm','standard',e.heavy?'heavy':'standard');
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
  const reloadPct=Math.max(0,Math.min(1,1-p.cd/4));
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
  // Precision reticle around the cursor: smaller/tighter means more accurate.
  const accuracy=Math.max(0,Math.min(1,p.aimPrecision));
  // Radius directly represents the remaining dispersion: 100% accuracy = tight,
  // lower accuracy = progressively wider. No instant size jumps.
  const precisionRadius=18+66*(1-accuracy);
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
$('fireButton').addEventListener('pointerdown',e=>{e.preventDefault();mouse.down=true});
$('fireButton').addEventListener('pointerup',e=>{e.preventDefault();mouse.down=false});
$('fireButton').addEventListener('pointercancel',()=>mouse.down=false);
function frame(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(frame)}
reset();requestAnimationFrame(frame);