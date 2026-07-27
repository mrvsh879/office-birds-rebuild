from pathlib import Path

p=Path('src/visual-game.js')
s=p.read_text()
if 'function makeConcrete(' in s:
    raise SystemExit(0)

s=s.replace(
"{name:'Две цели',shots:4,build({x,y,beam,pillar,glass,metal,target}){return[beam(x,y-15,300),pillar(x-108,y-90,120),pillar(x+108,y-90,120),glass(x,y-92,155,82),beam(x,y-165,300),metal(x,y-205,110,28),pillar(x-108,y-240,120),pillar(x+108,y-240,120),beam(x,y-315,300),target(x-72,y-365),target(x+72,y-365)]}},",
"{name:'Две цели',shots:4,build({x,y,beam,pillar,glass,metal,concrete,target}){return[concrete(x-132,y-46,74,62),beam(x,y-15,300),pillar(x-108,y-90,120),pillar(x+108,y-90,120),glass(x,y-92,155,82),beam(x,y-165,300),metal(x,y-205,110,28),pillar(x-108,y-240,120),pillar(x+108,y-240,120),beam(x,y-315,300),target(x-72,y-365),target(x+72,y-365)]}},"
)
s=s.replace(
"{name:'Двойная башня',shots:5,build({x,y,beam,pillar,glass,metal,target}){const l=x-150,r=x+150;return[beam(l,y-15,220),pillar(l-72,y-90,120),pillar(l+72,y-90,120),glass(l,y-92,112,82),beam(l,y-165,220),metal(l,y-205,92,26),target(l,y-235),beam(r,y-15,220),pillar(r-72,y-90,120),pillar(r+72,y-90,120),glass(r,y-92,112,82),beam(r,y-165,220),metal(r,y-205,92,26),target(r,y-235),beam(x,y-305,520),target(x,y-355)]}}",
"{name:'Двойная башня',shots:5,build({x,y,beam,pillar,glass,metal,concrete,target}){const l=x-150,r=x+150;return[concrete(l-95,y-48,68,64),beam(l,y-15,220),pillar(l-72,y-90,120),pillar(l+72,y-90,120),glass(l,y-92,112,82),beam(l,y-165,220),metal(l,y-205,92,26),target(l,y-235),concrete(r+95,y-48,68,64),beam(r,y-15,220),pillar(r-72,y-90,120),pillar(r+72,y-90,120),glass(r,y-92,112,82),beam(r,y-165,220),metal(r,y-205,92,26),target(r,y-235),beam(x,y-305,520),target(x,y-355)]}}"
)

marker="function drawMetalDamage(ctx){for(const b of Composite.allBodies(engine.world)){if(b.material!=='metal'||!b.damageState)continue;ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);ctx.strokeStyle=b.damageState===1?'rgba(30,40,48,.85)':'rgba(15,22,28,.95)';ctx.lineWidth=b.damageState===1?2.5:4;ctx.beginPath();ctx.ellipse(0,0,b.metalWidth*.16,b.metalHeight*.28,0,0,Math.PI*2);if(b.damageState>1){ctx.moveTo(-b.metalWidth*.22,-b.metalHeight*.2);ctx.lineTo(b.metalWidth*.22,b.metalHeight*.18)}ctx.stroke();ctx.restore()}}"
concrete=marker+"\nfunction makeConcrete(x,y,w,h){const c=Bodies.rectangle(x,y,w,h,{density:.012,friction:.85,frictionStatic:1,frictionAir:.006,restitution:.015,chamfer:{radius:5},render:{fillStyle:'#8b9196',strokeStyle:'#4d545a',lineWidth:4}});c.gameType='concrete';c.material='concrete';c.maxHealth=220;c.health=220;c.damageState=0;c.concreteWidth=w;c.concreteHeight=h;c.breakable=true;return c}\nfunction makeConcreteChunk(source,x,y,w,h){const chunk=Bodies.rectangle(x,y,w,h,{density:.009,friction:.88,frictionStatic:1,frictionAir:.012,restitution:.03,chamfer:{radius:3},render:{fillStyle:'#777d82',strokeStyle:'#42484d',lineWidth:3}});chunk.gameType='concreteChunk';chunk.material='concrete';chunk.createdAt=performance.now();Body.setAngle(chunk,source.angle+(Math.random()-.5)*.18);Body.setVelocity(chunk,{x:source.velocity.x+(Math.random()-.5)*2.4,y:source.velocity.y-1-Math.random()*1.4});Body.setAngularVelocity(chunk,(Math.random()-.5)*.12);return chunk}\nfunction breakConcrete(body,contact){if(!body||body.broken)return;body.broken=true;const w=body.concreteWidth,h=body.concreteHeight;const pieces=[makeConcreteChunk(body,body.position.x-w*.22,body.position.y-h*.12,w*.5,h*.58),makeConcreteChunk(body,body.position.x+w*.22,body.position.y-h*.12,w*.5,h*.58),makeConcreteChunk(body,body.position.x,body.position.y+h*.25,w*.62,h*.46)];World.remove(engine.world,body);World.add(engine.world,pieces);burst(contact?.x||body.position.x,contact?.y||body.position.y,30,'#b8b8b4');impactRings.push({x:contact?.x||body.position.x,y:contact?.y||body.position.y,r:10,life:24,power:11});score+=180;setStatus('Бетон расколот');updateHud()}\nfunction damageConcrete(body,power,contact){if(!body||body.material!=='concrete'||body.broken)return;const damage=Math.max(0,(power-6.2)*6.2);if(damage<3)return;body.health=Math.max(0,body.health-damage);body.damageState=body.health<body.maxHealth*.7?1:0;if(body.health<body.maxHealth*.35)body.damageState=2;if(body.damageState===1){body.render.fillStyle='#7d8388';body.render.strokeStyle='#444b50'}else if(body.damageState===2){body.render.fillStyle='#696f74';body.render.strokeStyle='#343a3f';body.render.lineWidth=5}burst(contact?.x||body.position.x,contact?.y||body.position.y,Math.min(18,5+Math.round(power)),'#c6c4bd');if(body.health<=0||power>15.5)breakConcrete(body,contact);else{setStatus(body.damageState>1?'Бетон сильно повреждён':'Бетон треснул');score+=Math.min(20,Math.round(power));updateHud()}}\nfunction drawConcreteDamage(ctx){for(const b of Composite.allBodies(engine.world)){if(b.material!=='concrete'||b.gameType==='concreteChunk'||!b.damageState||b.broken)continue;ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);ctx.strokeStyle=b.damageState===1?'rgba(48,52,55,.85)':'rgba(28,31,34,.96)';ctx.lineWidth=b.damageState===1?2.5:4;ctx.beginPath();ctx.moveTo(-b.concreteWidth*.18,-b.concreteHeight*.45);ctx.lineTo(-b.concreteWidth*.03,-b.concreteHeight*.08);ctx.lineTo(-b.concreteWidth*.2,b.concreteHeight*.2);ctx.lineTo(-b.concreteWidth*.06,b.concreteHeight*.44);if(b.damageState>1){ctx.moveTo(-b.concreteWidth*.03,-b.concreteHeight*.08);ctx.lineTo(b.concreteWidth*.22,b.concreteHeight*.02);ctx.moveTo(-b.concreteWidth*.2,b.concreteHeight*.2);ctx.lineTo(b.concreteWidth*.16,b.concreteHeight*.33)}ctx.stroke();ctx.restore()}}"
if marker not in s:
    raise SystemExit('metal marker not found')
s=s.replace(marker,concrete)

s=s.replace(
"World.add(engine.world,LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,glass:makeGlass,metal:makeMetal,target:makeTarget}));",
"World.add(engine.world,LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,glass:makeGlass,metal:makeMetal,concrete:makeConcrete,target:makeTarget}));"
)

old="else if(other.gameType==='metal'&&power>3.2){const c=pair.collision?.supports?.[0]||other.position;damageMetal(other,power,c)}else if(other.gameType==='structure'&&power>2.5){"
new="else if(other.gameType==='metal'&&power>3.2){const c=pair.collision?.supports?.[0]||other.position;damageMetal(other,power,c)}else if(other.gameType==='concrete'&&power>5.5){const c=pair.collision?.supports?.[0]||other.position;damageConcrete(other,power,c)}else if(other.gameType==='structure'&&power>2.5){"
if old not in s:
    raise SystemExit('collision marker not found')
s=s.replace(old,new)

s=s.replace(
"drawGlassDamage(ctx);drawMetalDamage(ctx);drawTargets(ctx);",
"drawGlassDamage(ctx);drawMetalDamage(ctx);drawConcreteDamage(ctx);drawTargets(ctx);"
)

p.write_text(s)
