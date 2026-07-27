from pathlib import Path
p=Path('src/visual-game.js')
s=p.read_text()
if 'officeRoomBackground' in s:
    raise SystemExit(0)

s=s.replace("window.officeBirdAtlas=officeBirdAtlas;","window.officeBirdAtlas=officeBirdAtlas;\nconst officeRoomBackground=new Image();officeRoomBackground.src='./assets/backgrounds/office-room.svg';window.officeRoomBackground=officeRoomBackground;")

s=s.replace("World.add(engine.world,Bodies.rectangle(innerWidth/2,floorY+45,innerWidth+500,90,{isStatic:true,friction:1,render:{fillStyle:'#283846',strokeStyle:'#17232d',lineWidth:2}}));","World.add(engine.world,Bodies.rectangle(innerWidth/2,floorY+45,innerWidth+500,90,{isStatic:true,friction:1,render:{visible:false}}));")

start=s.index('function drawBackground(ctx){')
end=s.index('function drawSlingshot(ctx){',start)
new_bg="""function drawBackground(ctx){const w=render.canvas.width,h=render.canvas.height,pr=render.options.pixelRatio||1;ctx.save();ctx.setTransform(1,0,0,1,0,0);const img=window.officeRoomBackground;if(img&&img.complete&&img.naturalWidth>0){ctx.drawImage(img,0,0,w,h)}else{const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#dfeaf5');g.addColorStop(.72,'#f8fbfd');g.addColorStop(1,'#9b6b42');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}ctx.restore()}\n"""
s=s[:start]+new_bg+s[end:]

s=s.replace("ctx.lineWidth=30;","ctx.lineWidth=38;",1)
s=s.replace("ctx.moveTo(anchor.x-53,anchor.y-50);","ctx.moveTo(anchor.x-64,anchor.y-62);",1)
s=s.replace("ctx.moveTo(anchor.x+53,anchor.y-50);","ctx.moveTo(anchor.x+64,anchor.y-62);",1)
s=s.replace("ctx.roundRect(anchor.x-72,floorY-4,144,28,8);","ctx.roundRect(anchor.x-86,floorY-6,172,34,10);",1)
s=s.replace("for(const x of [anchor.x-42,anchor.x+42])","for(const x of [anchor.x-52,anchor.x+52])",1)
s=s.replace("ctx.moveTo(anchor.x-53,anchor.y-50);ctx.lineTo(ball.position.x,ball.position.y);ctx.lineTo(anchor.x+53,anchor.y-50);","ctx.moveTo(anchor.x-64,anchor.y-62);ctx.lineTo(ball.position.x,ball.position.y);ctx.lineTo(anchor.x+64,anchor.y-62);",1)

s=s.replace("const spacing=58,startX=Math.max(70,anchor.x-120-(waiting-1)*spacing),y=floorY-42;","const spacing=72,startX=Math.max(82,anchor.x-150-(waiting-1)*spacing),y=floorY-56;")
s=s.replace("drawSprite(ctx,SPRITES.heroIdle,x,y,52,64,0)","drawSprite(ctx,SPRITES.heroIdle,x,y,68,84,0)")
s=s.replace("ctx.ellipse(x,floorY-8,22,5,0,0,Math.PI*2)","ctx.ellipse(x,floorY-10,28,7,0,0,Math.PI*2)")

s=s.replace("let sprite=SPRITES.heroIdle,w=116,h=116","let sprite=SPRITES.heroIdle,w=138,h=138")
s=s.replace("w=150;h=125","w=176;h=148")
s=s.replace("w=sprite===SPRITES.heroStunned?125:130;h=sprite===SPRITES.heroStunned?110:118","w=sprite===SPRITES.heroStunned?146:154;h=sprite===SPRITES.heroStunned?130:140")

s=s.replace("const w=t.defeated?112:100,h=t.defeated?90:112;","const w=t.defeated?132:122,h=t.defeated?106:138;")

# make structures more visually cohesive by adding larger contact shadow in drawWorldArt
needle="function drawWorldArt(ctx){for(const b of Composite.allBodies(engine.world)){"
replacement="function drawWorldArt(ctx){ctx.save();ctx.fillStyle='rgba(39,25,12,.14)';for(const b of Composite.allBodies(engine.world)){if(['structure','glass','metal','concrete','officeProp'].includes(b.gameType)){ctx.beginPath();ctx.ellipse(b.position.x,floorY-6,Math.max(20,(b.woodWidth||b.glassWidth||b.metalWidth||b.concreteWidth||70)*.42),7,0,0,Math.PI*2);ctx.fill()}}ctx.restore();for(const b of Composite.allBodies(engine.world)){"
s=s.replace(needle,replacement)

p.write_text(s)
