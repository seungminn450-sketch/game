const canvas=document.getElementById('canvas');
const ctx=canvas.getContext('2d');
const gearBadge=document.getElementById('gearBadge');
const speedBadge=document.getElementById('speedBadge');
const distBadge=document.getElementById('distBadge');
const blLeft=document.getElementById('blLeft');
const blRight=document.getElementById('blRight');
const gearButtons=[...document.querySelectorAll('.gear button')];
const needle=document.getElementById('needle');
const ldwBadge=document.getElementById('ldwBadge');
const hazardBtn=document.getElementById('hazardBtn');
let gear='P';
const roadWidth=560;
const roadLeft=(canvas.width-roadWidth)/2;
const roadRight=roadLeft+roadWidth;
let x=canvas.width/2;
let y=canvas.height*0.7;
let angle=0;
let lanes=4;
let laneW=roadWidth/lanes;
let currentLane=Math.max(0,Math.min(lanes-1,Math.floor((x-roadLeft)/laneW)));
let ldwActive=false;
let ldwUntil=0;
let blinkerCancelAt=0;
let velocityMS=0;
let distanceMeters=0;
let roadOffsetM=0;
const topSpeedMS=55;
const accelMS=3.6;
const accelRevMS=2.6;
const brakeMS=6.5;
const dragMS=0.8;
const mPerPx=0.14;
const epsilonStop=0.05;
let lateralVelPx=0;
let steerHoldTime=0;
const keys={ArrowUp:false,ArrowDown:false,ArrowLeft:false,ArrowRight:false,KeyQ:false,KeyE:false};
let blinkerLeft=false;
let blinkerRight=false;
let blinkOn=false;
let lastBlink=0;
let hazard=false;
let headlights=false;
let brakeLightStrength=0;
let kmhSmooth=0;
gearButtons.forEach(b=>{b.addEventListener('click',()=>{const target=b.dataset.gear;if(target==='R' && Math.abs(velocityMS)>0.3){return}gear=target;gearButtons.forEach(x=>x.classList.toggle('active',x.dataset.gear===gear));gearBadge.textContent='기어: '+gear;if(gear==='P'||gear==='R'||gear==='D'){velocityMS=0}})});
window.addEventListener('keydown',e=>{if(keys.hasOwnProperty(e.code)){keys[e.code]=true;e.preventDefault()}if(e.code==='KeyQ'){hazard=false;hazardBtn&&hazardBtn.classList.remove('active');blinkerLeft=!blinkerLeft;if(blinkerLeft)blinkerRight=false;blinkOn=true;lastBlink=tNow;e.preventDefault()}if(e.code==='KeyE'){hazard=false;hazardBtn&&hazardBtn.classList.remove('active');blinkerRight=!blinkerRight;if(blinkerRight)blinkerLeft=false;blinkOn=true;lastBlink=tNow;e.preventDefault()}if(e.code==='KeyH'){hazard=!hazard;blinkerLeft=hazard;blinkerRight=hazard;blinkOn=true;lastBlink=tNow;hazardBtn&&hazardBtn.classList.toggle('active',hazard);e.preventDefault()}if(e.code==='KeyL'){headlights=!headlights;e.preventDefault()}});
window.addEventListener('keyup',e=>{if(keys.hasOwnProperty(e.code)){keys[e.code]=false;e.preventDefault()}});

blLeft.addEventListener('click',()=>{hazard=false;hazardBtn&&hazardBtn.classList.remove('active');blinkerLeft=!blinkerLeft;if(blinkerLeft)blinkerRight=false;blinkOn=true;lastBlink=tNow});
blRight.addEventListener('click',()=>{hazard=false;hazardBtn&&hazardBtn.classList.remove('active');blinkerRight=!blinkerRight;if(blinkerRight)blinkerLeft=false;blinkOn=true;lastBlink=tNow});
hazardBtn&&hazardBtn.addEventListener('click',()=>{hazard=!hazard;blinkerLeft=hazard;blinkerRight=hazard;blinkOn=true;lastBlink=tNow;hazardBtn.classList.toggle('active',hazard)});

function update(dt){
  if(gear==='P'){velocityMS=0; lateralVelPx=0; brakeLightStrength=0; return}
  else{
    let a=0;
    if(gear==='D'){
      if(keys.ArrowUp)a+=accelMS;
      if(keys.ArrowDown&&velocityMS>0)a-=brakeMS;
    }else if(gear==='R'){
      if(keys.ArrowDown)a-=accelRevMS;
      if(keys.ArrowUp&&velocityMS<0)a+=brakeMS;
    }else if(gear==='N'){
      a-=Math.sign(velocityMS)*dragMS;
    }
    if(gear!=='N'){
      if(velocityMS>0)a-=dragMS; else if(velocityMS<0)a+=dragMS;
    }
    velocityMS+=a*dt;
    velocityMS=Math.max(-topSpeedMS,Math.min(topSpeedMS,velocityMS));
    if(gear==='D'&&velocityMS<0)velocityMS=0;
    if(gear==='R'&&velocityMS>0)velocityMS=0;
    if(Math.abs(velocityMS)<epsilonStop)velocityMS=0;
  }
  brakeLightStrength=((gear==='D'&&keys.ArrowDown&&velocityMS>0)||(gear==='R'&&keys.ArrowUp&&velocityMS<0))?1:0;
  let steer=0; if(keys.ArrowLeft)steer-=1; if(keys.ArrowRight)steer+=1;
  const steerAccelPx=480*(Math.min(1,Math.abs(velocityMS)/topSpeedMS)+0.2);
  lateralVelPx+=steer*steerAccelPx*dt;
  laneW=roadWidth/lanes;
  const laneCenter=roadLeft+currentLane*laneW+laneW/2;
  const centerPullAcc=0;
  lateralVelPx+=centerPullAcc*dt;
  lateralVelPx*=0.92;
  x+=lateralVelPx*dt;
  laneW=roadWidth/lanes;
  let bLeft=roadLeft+currentLane*laneW;
  let bRight=roadLeft+(currentLane+1)*laneW;
  if(x<bLeft && !blinkerLeft){x=bLeft; ldwActive=true; ldwUntil=tNow+1200}
  else if(x>bRight && !blinkerRight){x=bRight; ldwActive=true; ldwUntil=tNow+1200}
  else {
    const newLane=Math.max(0,Math.min(lanes-1,Math.floor((x-roadLeft)/laneW)));
    if(newLane!==currentLane){currentLane=newLane; if(blinkerLeft||blinkerRight){blinkerCancelAt=tNow+1200}}
  }
  if(x<roadLeft+20)x=roadLeft+20; if(x>roadRight-20)x=roadRight-20;
  roadOffsetM+=velocityMS*dt; distanceMeters+=Math.abs(velocityMS)*dt;
  if(steer!==0){steerHoldTime=tNow} else { if(tNow-steerHoldTime>5000){ if(blinkerLeft)blinkerLeft=false; if(blinkerRight)blinkerRight=false }}
}
const sideObjects=[]; 
function ensureSideObjects(){while(sideObjects.length<12){const side=Math.random()<0.5?'L':'R';const x= side==='L'? roadLeft-36 : roadRight+12;const y= -Math.random()*canvas.height;const w=10+Math.random()*10;const h=20+Math.random()*30;const color=Math.random()<0.5?'#2f7d32':'#3b8b3f';sideObjects.push({x,y,w,h,color,side});}} 
function drawRoad(){
  ctx.fillStyle='#0b1320'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#12213a'; ctx.fillRect(roadLeft,0,roadWidth,canvas.height);
  ctx.fillStyle='#e5e7eb'; ctx.fillRect(roadLeft+12,0,6,canvas.height); ctx.fillRect(roadRight-18,0,6,canvas.height);
  const dashLen=40, gap=30, period=dashLen+gap; const offset=((roadOffsetM/mPerPx)%period+period)%period;
  const curveAmp=38, curveFreq=0.003; ctx.fillStyle='#fffb';
  for(let i=1;i<lanes;i++){
    const baseX=roadLeft+i*laneW;
    for(let yPos=-offset; yPos<canvas.height; yPos+=period){
      const cx=curveAmp*Math.sin((yPos+roadOffsetM/mPerPx)*curveFreq);
      ctx.fillRect(baseX-2+cx,yPos,dashLen,6);
    }
  }
}
function drawCar(){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#2d9cdb';ctx.beginPath();ctx.moveTo(-22,28);ctx.lineTo(22,28);ctx.quadraticCurveTo(26,10,16,-28);ctx.lineTo(-16,-28);ctx.quadraticCurveTo(-26,10,-22,28);ctx.fill();ctx.fillStyle='#1b75bb';ctx.fillRect(-18,-26,36,8);ctx.fillStyle='#111827';ctx.fillRect(-24,-10,10,22);ctx.fillRect(14,-10,10,22);ctx.fillStyle='#0b2036';ctx.fillRect(-14,-22,28,12);if(headlights){ctx.save();ctx.globalAlpha=0.25;ctx.fillStyle='#fff5c0';ctx.beginPath();ctx.moveTo(-24,-28);ctx.lineTo(24,-28);ctx.lineTo(0,-180);ctx.closePath();ctx.fill();ctx.restore()}ctx.fillStyle='#ffd54f';if(velocityMS>0){ctx.fillRect(-16,-28,10,6);ctx.fillRect(6,-28,10,6)}ctx.fillStyle=brakeLightStrength? '#ff5a5a' : '#ff3b3b';if(brakeLightStrength){ctx.fillRect(-18,22,12,6);ctx.fillRect(6,22,12,6)}if(gear==='R'&&Math.abs(velocityMS)>0){ctx.fillStyle='#e6e6e6';ctx.fillRect(-18,22,12,6);ctx.fillRect(6,22,12,6)}if(blinkerLeft&&blinkOn){ctx.fillStyle='#ffbf00';ctx.beginPath();ctx.arc(-22,0,6,0,Math.PI*2);ctx.fill()}if(blinkerRight&&blinkOn){ctx.fillStyle='#ffbf00';ctx.beginPath();ctx.arc(22,0,6,0,Math.PI*2);ctx.fill()}ctx.restore();}
function draw(){drawRoad();drawCar();}
let last=performance.now();
let dtGlobal=0;let tNow=performance.now();
function loop(t){
  dtGlobal=(t-last)/1000; last=t; tNow=t; update(dtGlobal); draw();
  const kmhInstant=Math.abs(velocityMS)*3.6; kmhSmooth+= (kmhInstant-kmhSmooth)*0.2; const kmhDisplay= kmhSmooth<0.5? 0 : Math.round(kmhSmooth); speedBadge.textContent='속도: '+kmhDisplay+' km/h';
  const km=(distanceMeters/1000); const odo=Math.floor(km).toString().padStart(6,'0')+'.'+(km%1).toFixed(1).split('.')[1];
  distBadge.textContent='주행거리: '+odo+' km';
  const start=210,end=30; const gaugeAngle=start+(end-start)*(Math.min(1,kmh/220)); needle.style.transform='rotate('+gaugeAngle+'deg)';
  if(blinkerLeft||blinkerRight){ if(t-lastBlink>500){ blinkOn=!blinkOn; lastBlink=t } } else { blinkOn=false }
  if(hazard){ blinkerLeft=true; blinkerRight=true }
  if(blinkerCancelAt && t>blinkerCancelAt && !hazard){ blinkerLeft=false; blinkerRight=false; blinkerCancelAt=0 }
  ldwBadge.textContent=(ldwActive && t<ldwUntil)?'차선: 이탈':'차선: 정상';
  blLeft.classList.toggle('on',blinkerLeft&&blinkOn); blRight.classList.toggle('on',blinkerRight&&blinkOn);
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop);
