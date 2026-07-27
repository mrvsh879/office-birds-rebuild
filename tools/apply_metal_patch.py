from pathlib import Path

p=Path('src/visual-game.js')
s=p.read_text()
if 'function makeMetal(' in s:
    raise SystemExit(0)

s=s.replace(
"{name:'Две цели',shots:4,build({x,y,beam,pillar,glass,target}){return[beam(x,y-15,300),pillar(x-108,y-90,120),pillar(x+108,y-90,120),glass(x,y-92,155,82),beam(x,y-165,300),pillar(x-108,y-240,120),pillar(x+108,y-240,120),beam(x,y-315,300),target(x-72,y-365),target(x+72,y-365)]}},",
"{name:'Две цели',shots:4,build({x,y,beam,pillar,glass,metal,target}){return[beam(x,y-15,300),pillar(x-108,y-90,120),pillar(x+108,y-90,120),glass(x,y-92,155,82),beam(x,y-165,300),metal(x,y-205,110,28),pillar(x-108,y-240,120),pillar(x+108,y-240,120),beam(x,y-315,300),target(x-72,y-365),target(x+72,y-365)]}},"
)
s=s.replace(
"{name:'Двойная башня',shots:5,build({x,y,beam,pillar,glass,target}){const l=x-150,r=x+150;return[beam(l,y-15,220),pillar(l-72,y-90,120),pillar(l+72,y-90,120),glass(l,y-92,112,82),beam(l,y-165,220),target(l,y-215),beam(r,y-15,220),pillar(r-72,y-90,120),pillar(r+72,y-90,120),glass(r,y-92,112,82),beam(r,y-165,220),target(r,y-215),beam(x,y-285,520),target(x,y-335)]}}",
"{name:'Двойная башня',shots:5,build({x,y,beam,pillar,glass,metal,target}){const l=x-150,r=x+150;return[beam(l,y-15,220),pillar(l-72,y-90,120),pillar(l+72,y-90,120),glass(l,y-92,112,82),beam(l,y-165,220),metal(l,y-205,92,26),target(l,y-235),beam(r,y-15,220),pillar(r-72,y-90,120),pillar(r+72,y-90,120),glass(r,y-92,112,82),beam(r,y-165,220),metal(r,y-205,92,26),target(r,y-235),beam(x,y-305,520),target(x,y-355)]}}"
)

marker="function drawGlassDamage(ctx){for(const b of Composite.allBodies(engine.world)){if(b.material!=='glass'||b.gameType==='glassShard'||!b.damageState||b.broken)continue;ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);ctx.strokeStyle='rgba(245,255,255,.95)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-b.glassWidth*.08,-b.glassHeight*.45);ctx.lineTo(0,-b.glassHeight*.12);ctx.lineTo(-b.glassWidth*.18,b.glassHeight*.16);ctx.lineTo(-b.glassWidth*.03,b.glassHeight*.44);ctx.moveTo(0,-b.glassHeight*.12);ctx.lineTo(b.glassWidth*.24,-b.glassHeight*.02);ctx.moveTo(-b.glassWidth*.18,b.glassHeight*.16);ctx.lineTo(b.glassWidth*.2,b.glassHeight*.3);ctx.stroke();ctx.restore()}}"
metal=marker+"\nfunction makeMetal(x,y,w,h){const m=Bodies.rectangle(x,y,w,h,{density:.0085,friction:.62,frictionStatic:.8,frictionAir:.004,restitution:.04,chamfer:{radius:6},render:{fillStyle:'#6f7f8d',strokeStyle:'#303c46',lineWidth:4}});m.gameType='metal';m.material='metal';m.maxHealth=160;m.health=160;m.damageState=0;m.metalWidth=w;m.metalHeight=h;return m}\nfunction damageMetal(body,power,contact){if(!body||body.material!=='metal')return;const damage=Math.max(0,(power-4)*4);if(damage<2)return;body.health=Math.max(0,body.health-damage);body.damageState=body.health<body.maxHealth*.65?1:0;if(body.health<body.maxHealth*.3)body.damageState=2;if(body.damageState===1){body.render.fillStyle='#5e6d79';body.render.strokeStyle='#26323a'}else if(body.damageState===2){body.render.fillStyle='#4b5862';body.render.strokeStyle='#1e272e';body.render.lineWidth=5}const count=Math.min(14,4+Math.round(power));for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*5;particles.push({x:contact?.x||body.position.x,y:contact?.y||body.position.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,life:14+Math.random()*14,size:1.5+Math.random()*2.5,color:'#ffd36b'})}setStatus(body.damageState?'Металл погнут':'Удар о металл');score+=Math.min(15,Math.round(power));updateHud()}\nfunction drawMetalDamage(ctx){for(const b of Composite.allBodies(engine.world)){if(b.material!=='metal'||!b.damageState)continue;ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);ctx.strokeStyle=b.damageState===1?'rgba(30,40,48,.85)':'rgba(15,22,28,.95)';ctx.lineWidth=b.damageState===1?2.5:4;ctx.beginPath();ctx.ellipse(0,0,b.metalWidth*.16,b.metalHeight*.28,0,0,Math.PI*2);if(b.damageState>1){ctx.moveTo(-b.metalWidth*.22,-b.metalHeight*.2);ctx.lineTo(b.metalWidth*.22,b.metalHeight*.18)}ctx.stroke();ctx.restore()}}"
if marker not in s: raise SystemExit('glass marker not found')
s=s.replace(marker,metal)

s=s.replace(
"World.add(engine.world,LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,glass:makeGlass,target:makeTarget}));",
"World.add(engine.world,LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,glass:makeGlass,metal:makeMetal,target:makeTarget}));"
)

old="if(other.gameType==='target'&&power>2.2){defeatTarget(other);setStatus('Менеджер выбит')}else if(other.gameType==='glass'&&power>1.2){const c=pair.collision?.supports?.[0]||other.position;damageGlass(other,power,c);score+=Math.min(18,Math.round(power*2));updateHud()}else if(other.gameType==='structure'&&power>2.5){"
new="if(other.gameType==='target'&&power>2.2){defeatTarget(other);setStatus('Менеджер выбит')}else if(other.gameType==='glass'&&power>1.2){const c=pair.collision?.supports?.[0]||other.position;damageGlass(other,power,c);score+=Math.min(18,Math.round(power*2));updateHud()}else if(other.gameType==='metal'&&power>3.2){const c=pair.collision?.supports?.[0]||other.position;damageMetal(other,power,c)}else if(other.gameType==='structure'&&power>2.5){"
if old not in s: raise SystemExit('collision marker not found')
s=s.replace(old,new)

s=s.replace(
"drawWoodDamage(ctx);drawGlassDamage(ctx);drawTargets(ctx);",
"drawWoodDamage(ctx);drawGlassDamage(ctx);drawMetalDamage(ctx);drawTargets(ctx);"
)

p.write_text(s)
