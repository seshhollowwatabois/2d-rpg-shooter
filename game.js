const c=document.getElementById('game'),x=c.getContext('2d'),$=id=>document.getElementById(id);
let W,H,last=0,spawn=0,over=false,shake=0,p,en=[],bs=[],ebs=[],ps=[];
const keys=new Set(),mouse={x:0,y:0,down:false},touch={active:false,x:0,y:0};

function resize(){const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);W=r.width;H=r.height;c.width=W*d;c.height=H*d;x.setTransform(d,0,0,d,0,0)}
addEventListener('resize',resize);resize();

function reset(){
  p={x:W/2,y:H/2,r:20,speed:190,hp:400,max:400,lv:1,xp:0,next:120,coins:0,kills:0,cd:0,inv:0,angle:0};
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
  const a=Math.atan2(mouse.y-p.y,mouse.x-p.x);p.angle=a;
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
  if(dx||dy){p.x+=dx/l*p.speed*dt;p.y+=dy/l*p.speed*dt}
  p.x=Math.max(p.r+8,Math.min(W-p.r-8,p.x));p.y=Math.max(p.r+8,Math.min(H-p.r-8,p.y));
  p.angle=Math.atan2(mouse.y-p.y,mouse.x-p.x);
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

function tankBody(cx,cy,r,angle,enemy=false,heavy=false,flash=false){
  x.save();x.translate(cx,cy);x.rotate(angle);
  // tracks
  x.fillStyle=flash?'#f2d0b0':(enemy?(heavy?'#34363b':'#542f35'):'#30382f');
  x.fillRect(-r-5,-r*.72,r*2+10,r*.38);x.fillRect(-r-5,r*.34,r*2+10,r*.38);
  x.fillStyle=enemy?(heavy?'#554d49':'#713f43'):'#53634b';
  x.fillRect(-r,-r*.58,r*2,r*1.16);
  x.fillStyle=enemy?(heavy?'#6b625c':'#985052'):'#71845f';
  x.beginPath();x.roundRect(-r*.72,-r*.72,r*1.44,r*1.44,6);x.fill();
  // turret
  x.fillStyle=enemy?(heavy?'#514943':'#7f4548'):'#657554';
  x.beginPath();x.arc(0,0,r*.56,0,6.283);x.fill();
  x.fillStyle=enemy?'#29272a':'#31392e';x.fillRect(r*.1,-r*.16,r*1.25,r*.32);
  x.fillStyle='#1c2024';x.fillRect(r*.92,-r*.10,r*.55,r*.20);
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
    tankBody(e.x,e.y,e.r,e.angle,true,e.heavy,e.hitFlash>0);
    const bw=e.r*2.7;x.fillStyle='#252c35';x.fillRect(e.x-bw/2,e.y-e.r-11,bw,5);
    x.fillStyle=e.heavy?'#d28a55':'#d85b68';x.fillRect(e.x-bw/2,e.y-e.r-11,bw*Math.max(0,e.hp/e.max),5);
  }
  tankBody(p.x,p.y,p.r,p.angle,false,false,p.inv>0);
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