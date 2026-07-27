from pathlib import Path

p=Path('src/visual-game.js')
s=p.read_text()
if 'function makeWeakPillar(' in s:
    raise SystemExit(0)

start=s.index('const LEVELS=[')
end=s.index('];',start)+2
levels="""const LEVELS=[
{name:'Точная разминка',shots:2,build({x,y,beam,pillar,weakPillar,glass,target}){return[
  beam(x,y-15,290),
  pillar(x-112,y-92,122),weakPillar(x+112,y-92,122),
  glass(x,y-92,168,82),
  beam(x,y-170,300),
  pillar(x-86,y-238,106),pillar(x+86,y-238,106),
  beam(x,y-305,230),
  target(x+42,y-352)
]}},
{name:'Слабое звено',shots:3,build({x,y,beam,pillar,weakPillar,glass,metal,concrete,target}){return[
  concrete(x-150,y-48,76,64),concrete(x+150,y-48,76,64),
  beam(x,y-15,390),
  pillar(x-145,y-95,130),weakPillar(x,y-95,130),pillar(x+145,y-95,130),
  glass(x-72,y-98,88,90),glass(x+72,y-98,88,90),
  beam(x,y-178,390),
  metal(x,y-221,140,28),
  pillar(x-120,y-270,110),pillar(x+120,y-270,110),
  beam(x,y-338,300),
  target(x-82,y-388),target(x+82,y-388)
]}},
{name:'Каскад',shots:4,build({x,y,beam,pillar,weakPillar,glass,metal,concrete,target}){const l=x-190,r=x+190;return[
  concrete(l-92,y-50,74,66),beam(l,y-15,250),pillar(l-82,y-94,126),weakPillar(l+82,y-94,126),glass(l,y-98,116,90),beam(l,y-176,250),metal(l,y-218,104,28),target(l+28,y-252),
  concrete(r+92,y-50,74,66),beam(r,y-15,250),weakPillar(r-82,y-94,126),pillar(r+82,y-94,126),glass(r,y-98,116,90),beam(r,y-176,250),metal(r,y-218,104,28),target(r-28,y-252),
  pillar(x-55,y-300,120),weakPillar(x+55,y-300,120),beam(x,y-370,560),target(x,y-420)
]}}
];"""
s=s[:start]+levels+s[end:]

marker="function makePillar(x,y,h){return setupWood(Bodies.rectangle(x,y,34,h,{density:.0027,friction:.75,frictionStatic:.95,frictionAir:.008,restitution:.02,chamfer:{radius:5},render:woodRender('pillar')}),'pillar',34,h)}"
weak=marker+"\nfunction makeWeakPillar(x,y,h){const b=setupWood(Bodies.rectangle(x,y,30,h,{density:.0019,friction:.68,frictionStatic:.82,frictionAir:.01,restitution:.025,chamfer:{radius:4},render:{fillStyle:'#d69a45',strokeStyle:'#7a4818',lineWidth:3}}),'pillar',30,h);b.maxHealth=58;b.health=58;b.isSupport=true;b.weakPoint=true;b.render.fillStyle='#d69a45';b.render.strokeStyle='#7a4818';return b}"
if marker not in s: raise SystemExit('pillar marker missing')
s=s.replace(marker,weak)

s=s.replace(
"World.add(engine.world,LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,glass:makeGlass,metal:makeMetal,concrete:makeConcrete,target:makeTarget}));",
"World.add(engine.world,LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,weakPillar:makeWeakPillar,glass:makeGlass,metal:makeMetal,concrete:makeConcrete,target:makeTarget}));"
)

s=s.replace(
"score+=body.isSupport?250:100;setStatus(body.isSupport?'Несущая опора сломана':'Дерево раскололось');",
"score+=body.weakPoint?400:(body.isSupport?250:100);setStatus(body.weakPoint?'Слабая опора выбита!':(body.isSupport?'Несущая опора сломана':'Дерево раскололось'));"
)

s=s.replace(
"function currentStars(){const r=remainingShots();return r>=2?3:r===1?2:1}",
"function currentStars(){const r=remainingShots();const max=LEVELS[levelIndex].shots;return r>=Math.max(2,max-1)?3:r>=1?2:1}"
)

p.write_text(s)
