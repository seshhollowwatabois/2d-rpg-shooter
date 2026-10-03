const c=document.getElementById('game'),x=c.getContext('2d'),$=id=>document.getElementById(id);
let W,H,last=0,spawn=0,over=false,shake=0,p,en=[],bs=[],ebs=[],ps=[];
const keys=new Set(),mouse={x:0,y:0,down:false},touch={active:false,x:0,y:0};

function resize(){const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;c.width=W*d;c.height=H*d;x.setTransform(d,0,0,d,0,0)}
addEventListener('resize',resize);resize();

function reset(){
  p={x:W/2,y:H/2,r:20,speed:190,hp:400,max:400,lv:1,xp:0,next:120,coins:0,kills:0,cd:0,inv:0,angle:0,turretAngle:0};
  en=[];bs=[];ebs=[];ps=[];spawn=.8;over=false;
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
  if(en.length>=7)return;
  const side=Math.floor(Math.random()*4);let a,b;
  if(side===0){a=-45;b=Math.random()*H}else if(side===1){a=W+45;b=Math.random()*H}
  else if(side===2){a=Math.random()*W;b=-45}else{a=Math.random()*W;b=H+45}
  const heavy=Math.random()<Math.min(.35,.08+p.lv*.02);
  const hp=heavy?520+p.lv*35:260+p.lv*20;
  en.push({
    x:a,y:b,r:heavy?23:19,speed:heavy?48:64,hp,max:hp,dmg:heavy?35:20,
    heavy,angle:0,fire:.8+Math.random()*1.5,hitFlash:0
  });
}
function shoot(){
  if(p.cd>0)return;
  const a=Math.atan2(mouse.y-p.y,mouse.x-p.x);p.turretAngle=a;
  bs.push({x:p.x+Math.cos(a)*34,y:p.y+Math.sin(a)*34,vx:Math.cos(a)*570,vy:Math.sin(a)*570,r:6,life:1.8,dmg:72+p.lv*8});
  p.cd=.52;burst(p.x+Math.cos(a)*25,p.y+Math.sin(a)*25,'#ffd27a',6);
}
function enemyShoot(e){
  const a=Math.atan2(p.y-e.y,p.x-e.x);e.angle=a;
  ebs.push({x:e.x+Math.cos(a)*(e.r+10),y:e.y+Math.sin(a)*(e.r+10),vx:Math.cos(a)*360,vy:Math.sin(a)*360,r:5,life:2.4,dmg:e.heavy?32:20});
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
  spawn-=dt;if(spawn<=0){makeEnemy();spawn=Math.max(1.8,3.6-p.lv*.12)}
  let dx=0,dy=0;
  if(keys.has('w')||keys.has('arrowup'))dy--;if(keys.has('s')||keys.has('arrowdown'))dy++;
  if(keys.has('a')||keys.has('arrowleft'))dx--;if(keys.has('d')||keys.has('arrowright'))dx++;
  if(touch.active){dx=touch.x;dy=touch.y}
  const l=Math.hypot(dx,dy)||1;
  if(dx||dy){
    p.x+=dx/l*p.speed*dt;p.y+=dy/l*p.speed*dt;
    // The hull faces the direction of travel; the turret stays independent and follows the mouse.
    p.angle=Math.atan2(dy,dx);
  }
  p.x=Math.max(p.r+8,Math.min(W-p.r-8,p.x));p.y=Math.max(p.r+8,Math.min(H-p.r-8,p.y));
  p.turretAngle=Math.atan2(mouse.y-p.y,mouse.x-p.x);
  if(mouse.down||keys.has(' '))shoot();

  for(let i=bs.length-1;i>=0;i--){
    const b=bs[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let hit=false;
    for(let j=en.length-1;j>=0;j--){
      const e=en[j];
      if(Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){
        e.hp-=b.dmg;e.hitFlash=.08;hit=true;burst(b.x,b.y,'#ffd27a',5);
        if(e.hp<=0)killEnemy(e,j);break;
      }
    }
    if(hit||b.life<=0||b.x<-60||b.x>W+60||b.y<-60||b.y>H+60)bs.splice(i,1);
  }

  for(let i=ebs.length-1;i>=0;i--){
    const b=ebs[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(Math.hypot(b.x-p.x,b.y-p.y)<b.r+p.r){
      if(p.inv<=0){p.hp-=b.dmg;p.inv=.28;shake=10;burst(p.x,p.y,'#e15b64',12);if(p.hp<=0)die()}
      ebs.splice(i,1);continue;
    }
    if(b.life<=0||b.x<-60||b.x>W+60||b.y<-60||b.y>H+60)ebs.splice(i,1);
  }

  for(const e of en){
    const d=Math.hypot(p.x-e.x,p.y-e.y),a=Math.atan2(p.y-e.y,p.x-e.x);e.angle=a;e.fire-=dt;e.hitFlash=Math.max(0,e.hitFlash-dt);
    if(d>260){e.x+=Math.cos(a)*e.speed*dt;e.y+=Math.sin(a)*e.speed*dt}
    if(d<620&&e.fire<=0)enemyShoot(e);
    if(d<p.r+e.r&&p.inv<=0){p.hp-=e.dmg*.45;p.inv=.4;shake=9;burst(p.x,p.y,'#e15b64',10);if(p.hp<=0)die()}
  }
  for(let i=ps.length-1;i>=0;i--){const q=ps[i];q.x+=q.vx*dt;q.y+=q.vy*dt;q.vx*=.94;q.vy*=.94;q.life-=dt;if(q.life<=0)ps.splice(i,1)}
  shake=Math.max(0,shake-dt*25);
}

function tankBody(cx,cy,r,hullAngle,turretAngle,enemy=false,heavy=false,flash=false){
  x.save();x.translate(cx,cy);x.rotate(hullAngle);

  const trackW=r*.42, trackH=r*1.75;
  const bodyW=r*1.48, bodyH=r*1.22;

  // Ground shadow
  x.save();x.rotate(-hullAngle);x.fillStyle='rgba(0,0,0,.28)';
  x.beginPath();x.ellipse(2,4,r*1.15,r*.9,0,0,6.283);x.fill();x.restore();

  // Left/right tracks: clearly different from the hull and visually show the tank's orientation.
  x.fillStyle=flash?'#f2d0b0':(enemy?(heavy?'#292b2f':'#40282c'):'#252b25');
  x.roundRect(-bodyW/2-trackW,-trackH/2,trackW,trackH,5);x.fill();
  x.roundRect(bodyW/2,-trackH/2,trackW,trackH,5);x.fill();

  // Track wheels and tread blocks.
  x.fillStyle=enemy?(heavy?'#575a5d':'#654044'):'#424942';
  for(const tx of [-bodyW/2-trackW/2,bodyW/2+trackW/2]){
    for(let wy=-trackH*.36;wy<=trackH*.36;wy+=trackH*.36){
      x.beginPath();x.arc(tx,wy,r*.14,0,6.283);x.fill();
    }
    x.strokeStyle='#171a19';x.lineWidth=2;
    for(let ty=-trackH*.45;ty<trackH*.45;ty+=r*.25){
      x.beginPath();x.moveTo(tx-trackW*.38,ty);x.lineTo(tx+trackW*.38,ty);x.stroke();
    }
  }

  // Hull: rear is the rounded back, front is the pointed/sloped glacis.
  x.fillStyle=enemy?(heavy?'#514943':'#713f43'):'#53634b';
  x.beginPath();
  x.moveTo(-bodyW*.48,-bodyH*.5);
  x.lineTo(bodyW*.28,-bodyH*.5);
  x.lineTo(bodyW*.52,-bodyH*.25);
  x.lineTo(bodyW*.52,bodyH*.25);
  x.lineTo(bodyW*.28,bodyH*.5);
  x.lineTo(-bodyW*.48,bodyH*.5);
  x.quadraticCurveTo(-bodyW*.6,0,-bodyW*.48,-bodyH*.5);
  x.closePath();x.fill();

  // Front glacis plate / nose.
  x.fillStyle=flash?'#ffe0c0':(enemy?(heavy?'#75695f':'#9a5153'):'#71845f');
  x.beginPath();
  x.moveTo(bodyW*.28,-bodyH*.5);
  x.lineTo(bodyW*.62,-bodyH*.28);
  x.lineTo(bodyW*.62,bodyH*.28);
  x.lineTo(bodyW*.28,bodyH*.5);
  x.closePath();x.fill();

  // Rear plate, visually flat and darker.
  x.fillStyle=enemy?(heavy?'#393634':'#4b2e32'):'#3d473c';
  x.fillRect(-bodyW*.55,-bodyH*.39,bodyW*.12,bodyH*.78);

  // Front headlights / details.
  x.fillStyle=enemy?'#d66b61':'#d6c777';
  x.fillRect(bodyW*.51,-bodyH*.25,r*.08,r*.16);
  x.fillRect(bodyW*.51,bodyH*.09,r*.08,r*.16);

  // Turret ring and turret.
  x.save();x.rotate(turretAngle-hullAngle);
  x.fillStyle=enemy?(heavy?'#3f3935':'#643a3d'):'#454e40';
  x.beginPath();x.arc(0,0,r*.62,0,6.283);x.fill();
  x.fillStyle=enemy?(heavy?'#625951':'#88484b'):'#68785c';
  x.beginPath();
  x.roundRect(-r*.48,-r*.43,r*.96,r*.86,7);x.fill();

  // Turret armor wedge + rear hatch.
  x.fillStyle=enemy?(heavy?'#756a5e':'#a25859'):'#7d8d70';
  x.beginPath();x.moveTo(-r*.38,-r*.4);x.lineTo(r*.35,-r*.34);x.lineTo(r*.48,0);
  x.lineTo(r*.35,r*.34);x.lineTo(-r*.38,r*.4);x.closePath();x.fill();
  x.fillStyle='#30352f';x.beginPath();x.arc(-r*.18,0,r*.16,0,6.283);x.fill();

  // Mantlet + cannon. The barrel follows the turret only.
  x.fillStyle=enemy?'#252426':'#292e29';
  x.roundRect(r*.18,-r*.15,r*.34,r*.30,3);x.fill();
  x.fillStyle='#171a1b';x.fillRect(r*.43,-r*.10,r*.78,r*.20);
  x.fillStyle='#0f1213';x.fillRect(r*1.08,-r*.13,r*.16,r*.26);

  // Tiny commander hatch/antenna.
  x.strokeStyle=enemy?(heavy?'#8a7e70':'#a25b5d'):'#9aa78a';x.lineWidth=1.5;
  x.beginPath();x.moveTo(-r*.12,-r*.18);x.lineTo(-r*.12,-r*.55);x.stroke();
  x.restore();

  // Hull front/rear markings.
  x.save();x.rotate(-hullAngle);x.font='bold '+Math.max(7,r*.3)+'px sans-serif';x.textAlign='center';
  x.fillStyle='rgba(255,255,255,.16)';x.fillText(enemy?'ENEMY':'',cx-cx,cy+r*1.25);x.restore();

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
  for(const e of en){
    tankBody(e.x,e.y,e.r,e.angle,e.angle,true,e.heavy,e.hitFlash>0);
    const bw=e.r*2.7;x.fillStyle='#252c35';x.fillRect(e.x-bw/2,e.y-e.r-11,bw,5);
    x.fillStyle=e.heavy?'#d28a55':'#d85b68';x.fillRect(e.x-bw/2,e.y-e.r-11,bw*Math.max(0,e.hp/e.max),5);
  }
  tankBody(p.x,p.y,p.r,p.angle,p.turretAngle,false,false,p.inv>0);
  x.restore();

  const hp=Math.max(0,p.hp/p.max),xp=Math.max(0,p.xp/p.next);
  $('hpBar').style.width=hp*100+'%';$('xpBar').style.width=xp*100+'%';
  $('hpText').textContent=Math.ceil(Math.max(0,p.hp))+'/'+p.max;$('xpText').textContent=p.xp+'/'+p.next;
  $('levelText').textContent=p.lv;$('coinsText').textContent=p.coins;$('killsText').textContent=p.kills;
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