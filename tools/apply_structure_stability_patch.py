from pathlib import Path

p=Path('src/visual-game.js')
s=p.read_text()
if 'function addStabilityJoints(' in s:
    raise SystemExit(0)

s=s.replace(
"let particles=[],impactRings=[],flash=0,heroStunnedUntil=0,heroSpawnAt=0;",
"let particles=[],impactRings=[],flash=0,heroStunnedUntil=0,heroSpawnAt=0,stabilityJoints=[];"
)

marker="function makeTarget(x,y){const t=Bodies.circle(x,y,27,{density:.0014,friction:.28,restitution:.08,render:{visible:false}});t.gameType='target';t.defeated=false;t.start={x,y};t.variant=targets.length%2;targets.push(t);return t}"
code=marker+"\nfunction isStructuralBody(b){return ['structure','glass','metal','concrete'].includes(b?.gameType)}\nfunction boundsGap(a,b){const dx=Math.max(0,Math.max(a.bounds.min.x,b.bounds.min.x)-Math.min(a.bounds.max.x,b.bounds.max.x));const dy=Math.max(0,Math.max(a.bounds.min.y,b.bounds.min.y)-Math.min(a.bounds.max.y,b.bounds.max.y));return Math.hypot(dx,dy)}\nfunction addStabilityJoints(bodies){stabilityJoints=[];const parts=bodies.filter(isStructuralBody),degree=new Map();for(let i=0;i<parts.length;i++){for(let j=i+1;j<parts.length;j++){const a=parts[i],b=parts[j];if(boundsGap(a,b)>7)continue;if((degree.get(a.id)||0)>=4||(degree.get(b.id)||0)>=4)continue;const distance=Vector.magnitude(Vector.sub(a.position,b.position));if(distance>260)continue;const joint=Constraint.create({bodyA:a,bodyB:b,length:distance,stiffness:.16,damping:.22,render:{visible:false}});joint.gameType='stabilityJoint';stabilityJoints.push(joint);degree.set(a.id,(degree.get(a.id)||0)+1);degree.set(b.id,(degree.get(b.id)||0)+1)}}if(stabilityJoints.length)World.add(engine.world,stabilityJoints)}\nfunction releaseJointsFor(body,radius=0){if(!body||!stabilityJoints.length)return;const removed=[];for(const joint of stabilityJoints){const direct=joint.bodyA===body||joint.bodyB===body;const near=radius>0&&((joint.bodyA&&Vector.magnitude(Vector.sub(joint.bodyA.position,body.position))<radius)||(joint.bodyB&&Vector.magnitude(Vector.sub(joint.bodyB.position,body.position))<radius));if(direct||near){World.remove(engine.world,joint);removed.push(joint)}}if(removed.length)stabilityJoints=stabilityJoints.filter(j=>!removed.includes(j))}"
if marker not in s: raise SystemExit('target marker missing')
s=s.replace(marker,code)

old="World.add(engine.world,LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,weakPillar:makeWeakPillar,glass:makeGlass,metal:makeMetal,concrete:makeConcrete,target:makeTarget}));setupMouse();"
new="const levelBodies=LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,weakPillar:makeWeakPillar,glass:makeGlass,metal:makeMetal,concrete:makeConcrete,target:makeTarget});World.add(engine.world,levelBodies);addStabilityJoints(levelBodies);setupMouse();"
if old not in s: raise SystemExit('load level build marker missing')
s=s.replace(old,new)

s=s.replace(
"function loadLevel(index){woodDamageLedger.clear();",
"function loadLevel(index){stabilityJoints=[];woodDamageLedger.clear();"
)

s=s.replace(
"function breakWood(body,contact){if(!body||body.broken||!body.breakable)return;body.broken=true;",
"function breakWood(body,contact){if(!body||body.broken||!body.breakable)return;releaseJointsFor(body,body.weakPoint?190:0);body.broken=true;"
)
s=s.replace(
"function breakGlass(body,contact){if(!body||body.broken)return;body.broken=true;",
"function breakGlass(body,contact){if(!body||body.broken)return;releaseJointsFor(body,80);body.broken=true;"
)
s=s.replace(
"function breakConcrete(body,contact){if(!body||body.broken)return;body.broken=true;",
"function breakConcrete(body,contact){if(!body||body.broken)return;releaseJointsFor(body,110);body.broken=true;"
)

old_collision="const other=pair.bodyA===ball?pair.bodyB:pair.bodyA,rv=Vector.sub(pair.bodyA.velocity,pair.bodyB.velocity),normal=pair.collision?.normal||{x:1,y:0},power=Math.abs(Vector.dot(rv,normal));"
new_collision="const other=pair.bodyA===ball?pair.bodyB:pair.bodyA,rv=Vector.sub(pair.bodyA.velocity,pair.bodyB.velocity),normal=pair.collision?.normal||{x:1,y:0},power=Math.abs(Vector.dot(rv,normal));if(isStructuralBody(other)&&power>2.1)releaseJointsFor(other,other.weakPoint?170:0);"
if old_collision not in s: raise SystemExit('collision header missing')
s=s.replace(old_collision,new_collision)

p.write_text(s)
