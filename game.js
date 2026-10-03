const c=document.getElementById('game'),x=c.getContext('2d'),$=id=>document.getElementById(id);
let W,H,last=0,spawn=0,over=false,shake=0,p,en=[],bs=[],ebs=[],ps=[],dmgTexts=[];
const keys=new Set(),mouse={x:0,y:0,down:false},touch={active:false,x:0,y:0};

function resize(){const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;c.width=W*d;c.height=H*d;x.setTransform(d,0,0,d,0,0)}
addEventListener('resize',resize);resize();

function reset(){
  p={x:W/2,y:H/2,r:20,speed:190,hp:400,max:400,lv:1,xp:0,next:120,coins:0,kills:0,cd:0,inv:0,angle:0,turretAngle:0};
  en=[];bs=[];ebs=[];ps=[];dmgTexts=[];spawn=.8;over=false;
  $('death').hidden=true;
}

function pos(e){const r=c.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top}
c.addEventListener('pointermove',pos);
c.addEventListener('pointerdown',e=>{pos(e);mouse.down=true;c.setPointerCapture?.(e.pointerId)});
addEventListener('pointerup',()=>mouse.down=false);
addEventListener('pointercancel',()=>mouse.down=false);
addEventListener('keydown',e=>{keys.add(e.key.toLowerCase());if(e.code==='Space')e.preventDefault();if(over&&(e.key==='Enter'||e.code==='Space'))reset()});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
$('restart').onclick=reset;

function burst(a,b,col,n=8){
  for(let i=0;i<n;i++){let q=Math.random()*6.283,s=40+Math.random()*150;
    ps.push({x:a,y:b,vx:Math.cos(q)*s,vy:Math.sin(q)*s,life:.35+Math.random()*.35,col});
  }
}
function addXp(n){
  p.xp+=n;
  while(p.xp>=p.next){p.xp-=p.next;p.lv++;p.next=Math.floor(p.next*1.28);p.max+=45;p.hp=p.max;p.speed+=3;burst(p.x,p.y,'#78b7ff',35)}
}
function makeEnemy(){
  if(en.length>=4)return;
  const side=Math.floor(Math.random()*4);let a,b;
  if(side===0){a=-45;b=Math.random()*H}else if(side===1){a=W+45;b=Math.random()*H}
  else if(side===2){a=Math.random()*W;b=-45}else{a=Math.random()*W;b=H+45}
  const heavy=Math.random()<Math.min(.35,.08+p.lv*.02);
  const hp=heavy?520+p.lv*35:260+p.lv*20;
  en.push({
    x:a,y:b,r:heavy?23:19,speed:heavy?48:64,hp,max:hp,dmg:heavy?35:20,
    heavy,angle:0,turretAngle:0,fire:.8+Math.random()*1.5,hitFlash:0,
    wanderX:Math.random()*W,wanderY:Math.random()*H,wanderTime:1+Math.random()*3,
    idle:Math.random()<.3
  });
}
function shoot(){
  if(p.cd>0)return;
  const a=Math.atan2(mouse.y-p.y,mouse.x-p.x);p.turretAngle=a;
  bs.push({x:p.x+Math.cos(a)*34,y:p.y+Math.sin(a)*34,vx:Math.cos(a)*820,vy:Math.sin(a)*820,r:3.5,life:1.8,dmg:72+p.lv*8});
  p.cd=.9;burst(p.x+Math.cos(a)*25,p.y+Math.sin(a)*25,'#ffd27a',6);
}
function enemyShoot(e){
  const a=Math.atan2(p.y-e.y,p.x-e.x);e.turretAngle=a;
  ebs.push({x:e.x+Math.cos(a)*(e.r+10),y:e.y+Math.sin(a)*(e.r+10),vx:Math.cos(a)*560,vy:Math.sin(a)*560,r:3,life:2.4,dmg:e.heavy?32:20});
  e.fire=e.heavy?2.2+Math.random()*.8:1.4+Math.random()*.7;
  burst(e.x+Math.cos(a)*e.r,e.y+Math.sin(a)*e.r,'#ff875f',4);
}
function killEnemy(e,j){
  p.kills++;p.coins+=e.heavy?15:7;addXp(e.heavy?70:35);
  burst(e.x,e.y,e.heavy?'#c77d52':'#d85b68',28);en.splice(j,1);
}
function die(){reset()}

function update(dt){
  if(over)return;
  p.cd=Math.max(0,p.cd-dt);p.inv=Math.max(0,p.inv-dt);
  spawn-=dt;if(spawn<=0){makeEnemy();spawn=Math.max(2.8,5.2-p.lv*.10)}
  let dx=0,dy=0;
  if(keys.has('w')||keys.has('arrowup'))dy--;if(keys.has('s')||keys.has('arrowdown'))dy++;
  if(keys.has('a')||keys.has('arrowleft'))dx--;if(keys.has('d')||keys.has('arrowright'))dx++;
  if(touch.active){dx=touch.x;dy=touch.y}
  const l=Math.hypot(dx,dy)||1;
  if(dx||dy){
    p.x+=dx/l*p.speed*dt;p.y+=dy/l*p.speed*dt;
    // Smooth hull rotation so the tank turns into its travel direction instead of snapping instantly.
    const targetAngle=Math.atan2(dy,dx);
    let da=((targetAngle-p.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
    const turnRate=7.0;
    p.angle+=Math.max(-turnRate*dt,Math.min(turnRate*dt,da));
  }
  p.x=Math.max(p.r+8,Math.min(W-p.r-8,p.x));p.y=Math.max(p.r+8,Math.min(H-p.r-8,p.y));
  p.turretAngle=Math.atan2(mouse.y-p.y,mouse.x-p.x);
  if(mouse.down||keys.has(' '))shoot();

  for(let i=bs.length-1;i>=0;i--){
    const b=bs[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let hit=false;
    for(let j=en.length-1;j>=0;j--){
      const e=en[j];
      if(Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){
        e.hp-=b.dmg;e.hitFlash=.08;hit=true;dmgTexts.push({x:e.x,y:e.y-e.r-8,text:Math.round(b.dmg),life:.7});burst(b.x,b.y,'#ffd27a',14);
        if(e.hp<=0)killEnemy(e,j);break;
      }
    }
    if(hit||b.life<=0||b.x<-60||b.x>W+60||b.y<-60||b.y>H+60)bs.splice(i,1);
  }

  for(let i=ebs.length-1;i>=0;i--){
    const b=ebs[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(Math.hypot(b.x-p.x,b.y-p.y)<b.r+p.r){
      if(p.inv<=0){p.hp-=b.dmg;p.inv=.28;shake=10;burst(b.x,b.y,'#ff765d',14);if(p.hp<=0)die()}
      ebs.splice(i,1);continue;
    }
    if(b.life<=0||b.x<-60||b.x>W+60||b.y<-60||b.y>H+60)ebs.splice(i,1);
  }

  for(const e of en){
    const d=Math.hypot(p.x-e.x,p.y-e.y);
    e.fire-=dt;e.hitFlash=Math.max(0,e.hitFlash-dt);

    // Bots wander around the battlefield instead of constantly chasing the player.
    e.wanderTime-=dt;
    if(e.wanderTime<=0){
      e.wanderX=60+Math.random()*Math.max(1,W-120);
      e.wanderY=60+Math.random()*Math.max(1,H-120);
      e.wanderTime=1.5+Math.random()*4;
      e.idle=Math.random()<.35;
    }

    if(!e.idle){
      const wa=Math.atan2(e.wanderY-e.y,e.wanderX-e.x);
      let wda=((wa-e.angle+Math.PI*3)%(Math.PI*2))-Math.PI;
      const turnRate=2.1;
      e.angle+=Math.max(-turnRate*dt,Math.min(turnRate*dt,wda));
      const wd=Math.hypot(e.wanderX-e.x,e.wanderY-e.y);
      if(wd>28){
        e.x+=Math.cos(e.angle)*e.speed*dt;
        e.y+=Math.sin(e.angle)*e.speed*dt;
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
  for(let i=ps.length-1;i>=0;i--){const q=ps[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.94;q.vy*=.94;q.life-=dt;if(q.life<=0)ps.splice(i,1)}
  for(let i=dmgTexts.length-1;i>=0;i--){const q=dmgTexts[i];q.y-=24*dt;q.life-=dt;if(q.life<=0)dmgTexts.splice(i,1)}
  shake=Math.max(0,shake-dt*25);
}

function tankBody(cx,cy,r,hullAngle,turretAngle,enemy=false,heavy=false,flash=false){
  x.save();x.translate(cx,cy);x.rotate(hullAngle);

  // T-34-85-inspired top-down proportions:
  // long hull, sharply sloped glacis, rounded rear, wide side tracks and five road wheels.
  const L=r*2.55, B=r*1.18, trackW=r*.34, trackL=L*.92;
  const hullB=r*.88;

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
  x.fillStyle=enemy?(heavy?'#45413b':'#61373a'):'#424d3f';
  x.beginPath();
  x.moveTo(-r*.48,-r*.30);
  x.quadraticCurveTo(-r*.28,-r*.48,r*.05,-r*.47);
  x.lineTo(r*.36,-r*.33);
  x.quadraticCurveTo(r*.55,-r*.17,r*.55,0);
  x.quadraticCurveTo(r*.55,r*.17,r*.36,r*.33);
  x.lineTo(r*.05,r*.47);
  x.quadraticCurveTo(-r*.28,r*.48,-r*.48,r*.30);
  x.quadraticCurveTo(-r*.58,0,-r*.48,-r*.30);
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
  x.fillStyle='#151819';x.fillRect(r*.38,-r*.075,r*1.16,r*.15);
  x.fillStyle='#0e1112';x.fillRect(r*1.48,-r*.105,r*.14,r*.21);

  // Small turret fittings.
  x.fillStyle=enemy?(heavy?'#746a5d':'#9b5458'):'#849176';
  x.beginPath();x.arc(-r*.36,-r*.23,r*.04,0,6.283);x.fill();
  x.beginPath();x.arc(-r*.36,r*.23,r*.04,0,6.283);x.fill();

  x.restore();
  x.restore();
}
function draw(){
  x.save();x.clearRect(0,0,W,H);x.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  x.fillStyle='#121713';x.fillRect(-20,-20,W+40,H+40);
  x.strokeStyle='#202820';
  for(let a=-40;a<W+40;a+=48){x.beginPath();x.moveTo(a,0);x.lineTo(a,H);x.stroke()}
  for(let a=-40;a<H+40;a+=48){x.beginPath();x.moveTo(0,a);x.lineTo(W,a);x.stroke()}
  // shell trails / explosions
  for(const q of ps){x.globalAlpha=Math.max(0,q.life*2);x.fillStyle=q.col;x.beginPath();x.arc(q.x,q.y,3.5,0,6.283);x.fill()}x.globalAlpha=1;
  for(const b of bs){x.fillStyle='#ffe08b';x.beginPath();x.arc(b.x,b.y,b.r,0,6.283);x.fill()}
  for(const b of ebs){x.fillStyle='#ff765d';x.beginPath();x.arc(b.x,b.y,b.r,0,6.283);x.fill()}
  // Shell impact flashes/explosions are represented by the particle bursts created on impact.
  for(const e of en){
    tankBody(e.x,e.y,e.r,e.angle,e.turretAngle,true,e.heavy,e.hitFlash>0);
    const bw=e.r*2.7;x.fillStyle='#252c35';x.fillRect(e.x-bw/2,e.y-e.r-11,bw,5);
    x.fillStyle=e.heavy?'#d28a55':'#d85b68';x.fillRect(e.x-bw/2,e.y-e.r-11,bw*Math.max(0,e.hp/e.max),5);
  }
  tankBody(p.x,p.y,p.r,p.angle,p.turretAngle,false,false,p.inv>0);
  for(const q of dmgTexts){x.globalAlpha=Math.max(0,q.life/.7);x.fillStyle='#ffd27a';x.font='bold 13px system-ui';x.textAlign='center';x.fillText('-'+q.text,q.x,q.y);x.globalAlpha=1}
  x.restore();

  const hp=Math.max(0,p.hp/p.max),xp=Math.max(0,p.xp/p.next);
  $('hpBar').style.width=hp*100+'%';$('xpBar').style.width=xp*100+'%';
  $('hpText').textContent=Math.ceil(Math.max(0,p.hp))+'/'+p.max;$('xpText').textContent=p.xp+'/'+p.next;
  $('levelText').textContent=p.lv;$('coinsText').textContent=p.coins;$('killsText').textContent=p.kills;
  $('reloadBar').style.width=((1-p.cd/.9)*100)+'%';$('damageText').textContent=(72+p.lv*8);$('reloadText').textContent=p.cd>0?'RELOADING':'READY';
}
function joy(e){
  const r=$('joystick').getBoundingClientRect(),dx0=e.clientX-(r.left+r.width/2),dy0=e.clientY-(r.top+r.height/2),m=Math.hypot(dx0,dy0),max=r.width*.34;
  const dx=m>max?dx0/m*max:dx0,dy=m>max?dy0/m*max:dy0;
  touch.x=dx/max;touch.y=dy/max;$('knob').style.transform='translate('+dx+'px,'+dy+'px)';
}
$('joystick').addEventListener('pointerdown',e=>{touch.active=true;joy(e)});
$('joystick').addEventListener('pointermove',e=>{if(touch.active)joy(e)});
$('joystick').addEventListener('pointerup',()=>{touch.active=false;touch.x=touch.y=0;$('knob').style.transform='translate(0,0)'});
$('joystick').addEventListener('pointercancel',()=>{touch.active=false;touch.x=touch.y=0;$('knob').style.transform='translate(0,0)'});
$('fireButton').addEventListener('pointerdown',e=>{e.preventDefault();mouse.down=true});
$('fireButton').addEventListener('pointerup',e=>{e.preventDefault();mouse.down=false});
$('fireButton').addEventListener('pointercancel',()=>mouse.down=false);
function frame(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(frame)}
reset();requestAnimationFrame(frame);