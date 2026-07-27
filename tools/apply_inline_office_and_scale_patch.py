from pathlib import Path

p=Path('src/visual-game.js')
s=p.read_text()
if 'function scaleLevelBodies(' in s:
    raise SystemExit(0)

# Add physical level scaling before loadLevel.
marker="function createProjectile(){"
scale_fn="""function scaleLevelBodies(bodies,cx,cy,scale){
  if(scale===1)return;
  for(const b of bodies){
    Body.setPosition(b,{x:cx+(b.position.x-cx)*scale,y:cy+(b.position.y-cy)*scale});
    if(b.gameType==='target'){
      Body.scale(b,1.08,1.08);
      b.start={x:b.position.x,y:b.position.y};
      b.visualScale=(b.visualScale||1)*1.12;
      continue;
    }
    Body.scale(b,scale,scale);
    if(Number.isFinite(b.woodWidth))b.woodWidth*=scale;
    if(Number.isFinite(b.woodHeight))b.woodHeight*=scale;
    if(Number.isFinite(b.glassWidth))b.glassWidth*=scale;
    if(Number.isFinite(b.glassHeight))b.glassHeight*=scale;
    if(Number.isFinite(b.metalWidth))b.metalWidth*=scale;
    if(Number.isFinite(b.metalHeight))b.metalHeight*=scale;
    if(Number.isFinite(b.concreteWidth))b.concreteWidth*=scale;
    if(Number.isFinite(b.concreteHeight))b.concreteHeight*=scale;
    if(b.gameType==='officeProp')b.propScale=(b.propScale||1)*scale;
  }
}

"""
if marker not in s: raise SystemExit('createProjectile marker missing')
s=s.replace(marker,scale_fn+marker,1)

old="const levelBodies=LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,weakPillar:makeWeakPillar,glass:makeGlass,metal:makeMetal,concrete:makeConcrete,cabinet:makeCabinet,monitor:makeMonitor,printer:makePrinter,target:makeTarget});World.add(engine.world,levelBodies);freezeStructure(levelBodies);"
new="const levelBodies=LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,weakPillar:makeWeakPillar,glass:makeGlass,metal:makeMetal,concrete:makeConcrete,cabinet:makeCabinet,monitor:makeMonitor,printer:makePrinter,target:makeTarget});const levelScale=innerWidth>=1500?1.2:innerWidth>=1100?1.1:1;scaleLevelBodies(levelBodies,towerX,floorY,levelScale);World.add(engine.world,levelBodies);freezeStructure(levelBodies);"
if old not in s: raise SystemExit('level build marker missing')
s=s.replace(old,new,1)

# Replace unreliable external-image background with a fully inline office scene.
start=s.index('function drawBackground(ctx){')
end=s.index('function drawSlingshot(ctx){',start)
background="""function drawBackground(ctx){
  const pr=render.options.pixelRatio||1,W=render.canvas.width/pr,H=render.canvas.height/pr,F=floorY;
  ctx.save();ctx.setTransform(pr,0,0,pr,0,0);
  const wall=ctx.createLinearGradient(0,0,0,F);wall.addColorStop(0,'#d9e4ef');wall.addColorStop(.65,'#fbfdff');wall.addColorStop(1,'#e9dfd0');ctx.fillStyle=wall;ctx.fillRect(0,0,W,F);
  ctx.fillStyle='#cbd5df';ctx.fillRect(0,0,W,82);ctx.strokeStyle='rgba(87,103,120,.2)';ctx.lineWidth=2;for(let x=0;x<W;x+=150){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,82);ctx.stroke()}ctx.beginPath();ctx.moveTo(0,41);ctx.lineTo(W,41);ctx.stroke();
  ctx.save();ctx.shadowColor='rgba(255,224,155,.55)';ctx.shadowBlur=28;ctx.fillStyle='#fff1c8';ctx.beginPath();ctx.roundRect(W*.76,18,Math.min(230,W*.16),42,7);ctx.fill();ctx.restore();
  const wx=Math.max(400,W*.28),wy=112,ww=Math.max(520,W-wx-110),wh=Math.max(280,F-wy-105);const sky=ctx.createLinearGradient(0,wy,0,wy+wh);sky.addColorStop(0,'#72c7f3');sky.addColorStop(1,'#e7f8ff');ctx.fillStyle=sky;ctx.fillRect(wx,wy,ww,wh);
  ctx.save();ctx.globalAlpha=.5;for(let i=0;i<16;i++){const bw=40+(i%4)*16,bh=100+(i%6)*43,x=wx+18+i*(ww/15),y=wy+wh-bh;ctx.fillStyle=i%2?'#679ab6':'#82b0c5';ctx.fillRect(x,y,bw,bh);ctx.fillStyle='rgba(255,246,194,.55)';for(let yy=y+15;yy<y+bh-10;yy+=25)for(let xx=x+9;xx<x+bw-7;xx+=16)ctx.fillRect(xx,yy,5,8)}ctx.restore();
  ctx.fillStyle='rgba(89,151,91,.58)';for(const [x,y,r] of [[wx+100,wy+wh-35,62],[wx+225,wy+wh-28,80],[wx+ww*.67,wy+wh-30,76],[wx+ww-110,wy+wh-35,62]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
  ctx.strokeStyle='#778fa4';ctx.lineWidth=10;ctx.strokeRect(wx,wy,ww,wh);for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(wx+ww*i/4,wy);ctx.lineTo(wx+ww*i/4,wy+wh);ctx.stroke()}
  ctx.fillStyle='#e9dfd1';ctx.fillRect(0,F-90,W,90);ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(0,F-90,W,8);
  // Left poster and office desk.
  ctx.save();ctx.shadowColor='rgba(30,49,65,.2)';ctx.shadowBlur=12;ctx.shadowOffsetY=7;ctx.fillStyle='#f8f2e8';ctx.strokeStyle='#78848f';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(34,300,138,178,7);ctx.fill();ctx.stroke();ctx.fillStyle='#62717e';ctx.textAlign='center';ctx.font='800 23px Arial';ctx.fillText('TEAM',103,350);ctx.fillText('WORK',103,382);ctx.fillStyle='#8ca0af';ctx.fillRect(65,420,18,30);ctx.fillRect(92,401,18,49);ctx.fillRect(119,380,18,70);ctx.restore();
  ctx.fillStyle='#9a6137';ctx.beginPath();ctx.roundRect(28,F-175,255,27,7);ctx.fill();ctx.fillStyle='#744629';ctx.fillRect(48,F-150,22,120);ctx.fillRect(240,F-150,22,120);ctx.fillStyle='#26333f';ctx.beginPath();ctx.roundRect(85,F-225,94,58,7);ctx.fill();ctx.fillStyle='#536372';ctx.fillRect(126,F-167,13,26);ctx.beginPath();ctx.roundRect(188,F-205,92,160,22);ctx.fill();
  // Right poster and shelving.
  ctx.save();ctx.fillStyle='#f8f1e6';ctx.strokeStyle='#7a858f';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(W-165,275,126,205,7);ctx.fill();ctx.stroke();ctx.fillStyle='#5f6c78';ctx.textAlign='center';ctx.font='800 21px Arial';ctx.fillText('WORK',W-102,320);ctx.fillText('SMART',W-102,353);ctx.fillText('WIN',W-102,386);ctx.font='800 17px Arial';ctx.fillText('TOGETHER',W-102,420);ctx.restore();
  ctx.fillStyle='#7f573a';ctx.beginPath();ctx.roundRect(W-180,F-250,150,210,8);ctx.fill();ctx.strokeStyle='#533821';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(W-170,F-185);ctx.lineTo(W-40,F-185);ctx.moveTo(W-170,F-120);ctx.lineTo(W-40,F-120);ctx.moveTo(W-125,F-240);ctx.lineTo(W-125,F-50);ctx.stroke();
  // Plants.
  function plant(x,y,flip=1){ctx.save();ctx.translate(x,y);ctx.scale(flip,1);ctx.fillStyle='#43895d';for(let i=0;i<7;i++){ctx.save();ctx.rotate(-.8+i*.26);ctx.beginPath();ctx.ellipse(0,-42-i*5,15,47,0,0,Math.PI*2);ctx.fill();ctx.restore()}ctx.fillStyle='#e8e5dc';ctx.strokeStyle='#9a9589';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(-39,-2,78,65,10);ctx.fill();ctx.stroke();ctx.restore()}
  plant(52,F-58,1);plant(W-72,F-50,-1);
  // Warm wooden foreground floor.
  const fg=ctx.createLinearGradient(0,F,0,H);fg.addColorStop(0,'#c88a50');fg.addColorStop(1,'#86502d');ctx.fillStyle=fg;ctx.fillRect(0,F,W,H-F);ctx.strokeStyle='rgba(91,48,23,.38)';ctx.lineWidth=2;for(let x=0;x<W;x+=135){ctx.beginPath();ctx.moveTo(x,F);ctx.lineTo(x+22,H);ctx.stroke()}ctx.fillStyle='#172c42';ctx.fillRect(0,H-38,W,38);ctx.fillStyle='#f2ae23';ctx.fillRect(0,H-38,W,5);
  ctx.restore();
}
"""
s=s[:start]+background+s[end:]

# Make slingshot symmetric and more substantial.
s=s.replace("ctx.moveTo(anchor.x,anchor.y+25);ctx.lineTo(anchor.x-53,anchor.y-50);ctx.moveTo(anchor.x,anchor.y+25);ctx.lineTo(anchor.x+53,anchor.y-50);", "ctx.moveTo(anchor.x,anchor.y+25);ctx.lineTo(anchor.x-68,anchor.y-68);ctx.moveTo(anchor.x,anchor.y+25);ctx.lineTo(anchor.x+68,anchor.y-68);")
s=s.replace("ctx.moveTo(anchor.x-64,anchor.y-62);ctx.lineTo(ball.position.x,ball.position.y);ctx.lineTo(anchor.x+53,anchor.y-50);", "ctx.moveTo(anchor.x-68,anchor.y-68);ctx.lineTo(ball.position.x,ball.position.y);ctx.lineTo(anchor.x+68,anchor.y-68);")

# Enlarge queue, active hero and targets.
s=s.replace("const spacing=72,startX=Math.max(82,anchor.x-150-(waiting-1)*spacing),y=floorY-56", "const spacing=82,startX=Math.max(88,anchor.x-165-(waiting-1)*spacing),y=floorY-66")
s=s.replace("SPRITES.heroIdle,x,y,68,84,0", "SPRITES.heroIdle,x,y,78,98,0")
s=s.replace("let sprite=SPRITES.heroIdle,w=138,h=138", "let sprite=SPRITES.heroIdle,w=154,h=154")
s=s.replace("w=176;h=148", "w=194;h=164")
s=s.replace("w=sprite===SPRITES.heroStunned?146:154;h=sprite===SPRITES.heroStunned?128:142", "w=sprite===SPRITES.heroStunned?160:170;h=sprite===SPRITES.heroStunned?140:156")

# Scale office prop art together with its body.
s=s.replace("ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);if(b.propKind==='cabinet')", "ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);ctx.scale(b.propScale||1,b.propScale||1);if(b.propKind==='cabinet')")

# Target visual scale based on body scaling.
old_targets="const w=t.defeated?112:100,h=t.defeated?90:112;if(!drawSprite(ctx,sprite,t.position.x,t.position.y,w,h,t.angle))"
new_targets="const vs=t.visualScale||1,w=(t.defeated?128:118)*vs,h=(t.defeated?104:136)*vs;if(!drawSprite(ctx,sprite,t.position.x,t.position.y,w,h,t.angle))"
if old_targets in s:s=s.replace(old_targets,new_targets)

p.write_text(s)
