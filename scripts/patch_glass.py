from pathlib import Path

p = Path('src/visual-game.js')
s = p.read_text()
if 'function makeGlass(' in s:
    raise SystemExit(0)

s = s.replace(
"{name:'Две цели',shots:4,build({x,y,beam,pillar,target}){return[beam(x,y-15,300),pillar(x-108,y-90,120),pillar(x+108,y-90,120),beam(x,y-165,300),pillar(x-108,y-240,120),pillar(x+108,y-240,120),beam(x,y-315,300),target(x-72,y-365),target(x+72,y-365)]}},",
"{name:'Две цели',shots:4,build({x,y,beam,pillar,glass,target}){return[beam(x,y-15,300),pillar(x-108,y-90,120),pillar(x+108,y-90,120),glass(x,y-92,155,82),beam(x,y-165,300),pillar(x-108,y-240,120),pillar(x+108,y-240,120),beam(x,y-315,300),target(x-72,y-365),target(x+72,y-365)]}},")

s = s.replace(
"{name:'Двойная башня',shots:5,build({x,y,beam,pillar,target}){const l=x-150,r=x+150;return[beam(l,y-15,220),pillar(l-72,y-90,120),pillar(l+72,y-90,120),beam(l,y-165,220),target(l,y-215),beam(r,y-15,220),pillar(r-72,y-90,120),pillar(r+72,y-90,120),beam(r,y-165,220),target(r,y-215),beam(x,y-285,520),target(x,y-335)]}}",
"{name:'Двойная башня',shots:5,build({x,y,beam,pillar,glass,target}){const l=x-150,r=x+150;return[beam(l,y-15,220),pillar(l-72,y-90,120),pillar(l+72,y-90,120),glass(l,y-92,112,82),beam(l,y-165,220),target(l,y-215),beam(r,y-15,220),pillar(r-72,y-90,120),pillar(r+72,y-90,120),glass(r,y-92,112,82),beam(r,y-165,220),target(r,y-215),beam(x,y-285,520),target(x,y-335)]}}")

pillar = "function makePillar(x,y,h){return setupWood(Bodies.rectangle(x,y,34,h,{density:.0027,friction:.75,frictionStatic:.95,frictionAir:.008,restitution:.02,chamfer:{radius:5},render:woodRender('pillar')}),'pillar',34,h)}"
glass = pillar + "\nfunction makeGlass(x,y,w,h){const g=Bodies.rectangle(x,y,w,h,{density:.0007,friction:.08,frictionAir:.003,restitution:.08,render:{fillStyle:'rgba(157,225,245,.36)',strokeStyle:'rgba(224,250,255,.95)',lineWidth:3}});g.gameType='glass';g.material='glass';g.maxHealth=34;g.health=34;g.damageState=0;g.glassWidth=w;g.glassHeight=h;g.breakable=true;return g}\nfunction makeGlassShard(source,x,y,size,angle){const shard=Bodies.polygon(x,y,3,size,{density:.00035,friction:.04,frictionAir:.018,restitution:.22,render:{fillStyle:'rgba(171,235,250,.42)',strokeStyle:'rgba(230,254,255,.8)',lineWidth:1}});shard.gameType='glassShard';shard.material='glass';shard.createdAt=performance.now();Body.setAngle(shard,angle);Body.setVelocity(shard,{x:source.velocity.x+(Math.random()-.5)*6,y:source.velocity.y-2-Math.random()*4});Body.setAngularVelocity(shard,(Math.random()-.5)*.45);return shard}\nfunction breakGlass(body,contact){if(!body||body.broken)return;body.broken=true;const count=Math.min(12,Math.max(7,Math.round((body.glassWidth*body.glassHeight)/1800))),shards=[];for(let i=0;i<count;i++){const ox=(Math.random()-.5)*body.glassWidth*.75,oy=(Math.random()-.5)*body.glassHeight*.75;shards.push(makeGlassShard(body,body.position.x+ox,body.position.y+oy,6+Math.random()*8,body.angle+Math.random()*Math.PI))}World.remove(engine.world,body);World.add(engine.world,shards);burst(contact?.x||body.position.x,contact?.y||body.position.y,20,'#d7f7ff');impactRings.push({x:contact?.x||body.position.x,y:contact?.y||body.position.y,r:6,life:18,power:6});score+=75;setStatus('Стекло разбито');updateHud()}\nfunction damageGlass(body,power,contact){if(!body||body.material!=='glass'||body.broken)return;const damage=Math.max(0,(power-1.2)*14);if(damage<3)return;body.health=Math.max(0,body.health-damage);body.damageState=body.health<body.maxHealth*.55?1:0;if(body.damageState){body.render.fillStyle='rgba(144,213,235,.27)';body.render.strokeStyle='rgba(235,253,255,.98)';body.render.lineWidth=4}if(body.health<=0||power>4.6)breakGlass(body,contact);else{burst(contact?.x||body.position.x,contact?.y||body.position.y,5,'#e3fbff');setStatus('Стекло треснуло')}}\nfunction drawGlassDamage(ctx){for(const b of Composite.allBodies(engine.world)){if(b.material!=='glass'||b.gameType==='glassShard'||!b.damageState||b.broken)continue;ctx.save();ctx.translate(b.position.x,b.position.y);ctx.rotate(b.angle);ctx.strokeStyle='rgba(245,255,255,.95)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-b.glassWidth*.08,-b.glassHeight*.45);ctx.lineTo(0,-b.glassHeight*.12);ctx.lineTo(-b.glassWidth*.18,b.glassHeight*.16);ctx.lineTo(-b.glassWidth*.03,b.glassHeight*.44);ctx.moveTo(0,-b.glassHeight*.12);ctx.lineTo(b.glassWidth*.24,-b.glassHeight*.02);ctx.moveTo(-b.glassWidth*.18,b.glassHeight*.16);ctx.lineTo(b.glassWidth*.2,b.glassHeight*.3);ctx.stroke();ctx.restore()}}"
if pillar not in s: raise SystemExit('pillar marker missing')
s = s.replace(pillar, glass)

s = s.replace(
"World.add(engine.world,LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,target:makeTarget}));",
"World.add(engine.world,LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,glass:makeGlass,target:makeTarget}));")

old = "if(other.gameType==='target'&&power>2.2){defeatTarget(other);setStatus('Менеджер выбит')}else if(other.gameType==='structure'&&power>2.5){const c=pair.collision?.supports?.[0]||other.position;damageWood(other,power,c);score+=Math.min(25,Math.round(power));if(!other.broken)setStatus(other.damageState?'Дерево повреждено':'Сильный удар');updateHud()}"
new = "if(other.gameType==='target'&&power>2.2){defeatTarget(other);setStatus('Менеджер выбит')}else if(other.gameType==='glass'&&power>1.2){const c=pair.collision?.supports?.[0]||other.position;damageGlass(other,power,c);score+=Math.min(18,Math.round(power*2));updateHud()}else if(other.gameType==='structure'&&power>2.5){const c=pair.collision?.supports?.[0]||other.position;damageWood(other,power,c);score+=Math.min(25,Math.round(power));if(!other.broken)setStatus(other.damageState?'Дерево повреждено':'Сильный удар');updateHud()}"
if old not in s: raise SystemExit('collision marker missing')
s = s.replace(old, new)

old = "for(const t of targets){if(t.defeated)continue;const moved=Vector.magnitude(Vector.sub(t.position,t.start));if(t.position.y>floorY-36||moved>115||Math.abs(t.angle)>1.1)defeatTarget(t)}if(detached&&!respawnQueued){"
new = "for(const t of targets){if(t.defeated)continue;const moved=Vector.magnitude(Vector.sub(t.position,t.start));if(t.position.y>floorY-36||moved>115||Math.abs(t.angle)>1.1)defeatTarget(t)}for(const b of Composite.allBodies(engine.world)){if(b.gameType==='glassShard'&&performance.now()-b.createdAt>4200)World.remove(engine.world,b)}if(detached&&!respawnQueued){"
if old not in s: raise SystemExit('beforeUpdate marker missing')
s = s.replace(old, new)

old = "Events.on(render,'afterRender',()=>{if(!anchor)return;const ctx=render.context;drawTrajectory(ctx);drawHeroQueue(ctx);drawSlingshot(ctx);drawWoodDamage(ctx);drawTargets(ctx);drawHero(ctx);drawEffects(ctx)});"
new = "Events.on(render,'afterRender',()=>{if(!anchor)return;const ctx=render.context;drawTrajectory(ctx);drawHeroQueue(ctx);drawSlingshot(ctx);drawWoodDamage(ctx);drawGlassDamage(ctx);drawTargets(ctx);drawHero(ctx);drawEffects(ctx)});"
if old not in s: raise SystemExit('render marker missing')
s = s.replace(old, new)

p.write_text(s)
