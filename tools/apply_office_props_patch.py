from pathlib import Path

p=Path('src/visual-game.js')
s=p.read_text()
if 'function makeCabinet(' in s:
    raise SystemExit(0)

# Redesign levels 2 and 3 with office props while preserving stable layouts.
s=s.replace(
"{name:'Слабое звено',shots:3,build({x,y,beam,pillar,weakPillar,glass,metal,concrete,target}){return[",
"{name:'Слабое звено',shots:3,build({x,y,beam,pillar,weakPillar,glass,metal,concrete,cabinet,monitor,printer,target}){return["
)
s=s.replace(
"  metal(x,y-221,140,28),\n  pillar(x-120,y-270,110),pillar(x+120,y-270,110),",
"  metal(x,y-221,140,28),monitor(x-88,y-226),printer(x+82,y-228),\n  pillar(x-120,y-270,110),pillar(x+120,y-270,110),cabinet(x+166,y-284),"
)
s=s.replace(
"{name:'Каскад',shots:4,build({x,y,beam,pillar,weakPillar,glass,metal,concrete,target}){const l=x-190,r=x+190;return[",
"{name:'Каскад',shots:4,build({x,y,beam,pillar,weakPillar,glass,metal,concrete,cabinet,monitor,printer,target}){const l=x-190,r=x+190;return["
)
s=s.replace(
"  concrete(l-92,y-50,74,66),beam(l,y-15,250),pillar(l-82,y-94,126),weakPillar(l+82,y-94,126),glass(l,y-98,116,90),beam(l,y-176,250),metal(l,y-218,104,28),target(l+28,y-252),",
"  concrete(l-92,y-50,74,66),beam(l,y-15,250),pillar(l-82,y-94,126),weakPillar(l+82,y-94,126),glass(l,y-98,116,90),beam(l,y-176,250),metal(l,y-218,104,28),monitor(l-52,y-230),cabinet(l+105,y-292),target(l+28,y-252),"
)
s=s.replace(
"  concrete(r+92,y-50,74,66),beam(r,y-15,250),weakPillar(r-82,y-94,126),pillar(r+82,y-94,126),glass(r,y-98,116,90),beam(r,y-176,250),metal(r,y-218,104,28),target(r-28,y-252),",
"  concrete(r+92,y-50,74,66),beam(r,y-15,250),weakPillar(r-82,y-94,126),pillar(r+82,y-94,126),glass(r,y-98,116,90),beam(r,y-176,250),metal(r,y-218,104,28),printer(r+48,y-230),cabinet(r-105,y-292),target(r-28,y-252),"
)

marker="function makeTarget(x,y){const t=Bodies.circle(x,y,27,{density:.0014,friction:.28,restitution:.08,render:{visible:false}});t.gameType='target';t.defeated=false;t.start={x,y};t.variant=targets.length%2;targets.push(t);return t}"
props="""function setupOfficeProp(body,kind,damage,massScore){body.gameType='officeProp';body.material='office';body.propKind=kind;body.propDamage=damage;body.massScore=massScore;body.hitScored=false;return body}
function makeCabinet(x,y){return setupOfficeProp(Bodies.rectangle(x,y,70,138,{density:.0095,friction:.72,frictionStatic:.9,frictionAir:.008,restitution:.025,chamfer:{radius:5},render:{fillStyle:'#596878',strokeStyle:'#26323d',lineWidth:4}}),'cabinet',9,120)}
function makeMonitor(x,y){return setupOfficeProp(Bodies.rectangle(x,y,66,48,{density:.0022,friction:.38,frictionAir:.01,restitution:.12,chamfer:{radius:5},render:{fillStyle:'#263643',strokeStyle:'#8fd5e8',lineWidth:4}}),'monitor',5.5,70)}
function makePrinter(x,y){return setupOfficeProp(Bodies.rectangle(x,y,74,52,{density:.0055,friction:.58,frictionAir:.009,restitution:.04,chamfer:{radius:7},render:{fillStyle:'#e1e4e5',strokeStyle:'#59636a',lineWidth:4}}),'printer',7,90)}
function officePropImpact(prop,other,power,contact){if(!prop||prop.gameType!=='officeProp'||power<2.2)return;const hit=Math.max(power,prop.propDamage||0);if(other?.gameType==='target'&&hit>3.6){defeatTarget(other);setStatus(`${prop.propKind==='cabinet'?'Шкаф':prop.propKind==='printer'?'Принтер':'Монитор'} сбил менеджера`)}else if(other?.gameType==='glass'&&hit>2){damageGlass(other,hit+1.8,contact)}else if(other?.gameType==='structure'&&hit>3.2){activateStructure(other,135);damageWood(other,hit*.85,contact)}else if(other?.gameType==='concrete'&&hit>7){activateStructure(other,110);damageConcrete(other,hit*.72,contact)}else if(other?.gameType==='metal'&&hit>5){activateStructure(other,105);damageMetal(other,hit*.7,contact)}if(!prop.hitScored&&power>3){prop.hitScored=true;score+=prop.massScore||50;burst(contact?.x||prop.position.x,contact?.y||prop.position.y,8,prop.propKind==='monitor'?'#a7efff':'#d5d8dc');updateHud()}}
"""+marker
if marker not in s: raise SystemExit('target marker missing')
s=s.replace(marker,props)

s=s.replace(
"function isStructuralBody(b){return ['structure','glass','metal','concrete'].includes(b?.gameType)}",
"function isStructuralBody(b){return ['structure','glass','metal','concrete','officeProp'].includes(b?.gameType)}"
)

old_build="const levelBodies=LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,weakPillar:makeWeakPillar,glass:makeGlass,metal:makeMetal,concrete:makeConcrete,target:makeTarget});"
new_build="const levelBodies=LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,weakPillar:makeWeakPillar,glass:makeGlass,metal:makeMetal,concrete:makeConcrete,cabinet:makeCabinet,monitor:makeMonitor,printer:makePrinter,target:makeTarget});"
if old_build not in s: raise SystemExit('level build marker missing')
s=s.replace(old_build,new_build)

# Add generic office-prop chain reaction processing at the start of each collision pair.
needle="Events.on(engine,'collisionStart',event=>{for(const pair of event.pairs){const a=pair.bodyA,b=pair.bodyB,rvAll=Vector.sub(a.velocity,b.velocity),nAll=pair.collision?.normal||{x:1,y:0},pAll=Math.abs(Vector.dot(rvAll,nAll));"
insert=needle+"const contactAll=pair.collision?.supports?.[0]||{x:(a.position.x+b.position.x)/2,y:(a.position.y+b.position.y)/2};if(a.gameType==='officeProp')officePropImpact(a,b,pAll,contactAll);if(b.gameType==='officeProp')officePropImpact(b,a,pAll,contactAll);"
if needle not in s: raise SystemExit('collision marker missing')
s=s.replace(needle,insert,1)

p.write_text(s)
