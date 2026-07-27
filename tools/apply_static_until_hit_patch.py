from pathlib import Path

p=Path('src/visual-game.js')
s=p.read_text()
if 'function activateStructure(' in s:
    raise SystemExit(0)

start=s.index("function isStructuralBody(b)")
end=s.index("function createProjectile()",start)
replacement="""function isStructuralBody(b){return ['structure','glass','metal','concrete'].includes(b?.gameType)}
function freezeStructure(bodies){stabilityJoints=[];for(const b of bodies){if(isStructuralBody(b)){Body.setStatic(b,true);b.structureFrozen=true}}}
function activateStructure(body,radius=95){if(!body)return;for(const b of Composite.allBodies(engine.world)){if(!isStructuralBody(b)||!b.isStatic)continue;const near=b===body||Vector.magnitude(Vector.sub(b.position,body.position))<=radius;if(near){Body.setStatic(b,false);b.structureFrozen=false;Body.setVelocity(b,{x:b.velocity.x,y:b.velocity.y+.15})}}}
function releaseJointsFor(body,radius=0){activateStructure(body,radius||95)}

"""
s=s[:start]+replacement+s[end:]

s=s.replace("addStabilityJoints(levelBodies);setupMouse();","freezeStructure(levelBodies);setupMouse();")

old="if(isStructuralBody(other)&&power>2.1)releaseJointsFor(other,other.weakPoint?170:0);"
new="if(isStructuralBody(other)&&power>2.1)activateStructure(other,other.weakPoint?220:115);"
s=s.replace(old,new)

# Add propagation for falling activated pieces hitting frozen pieces.
marker="Events.on(engine,'collisionStart',event=>{for(const pair of event.pairs){"
if marker not in s: raise SystemExit('collision start marker missing')
insert="Events.on(engine,'collisionStart',event=>{for(const pair of event.pairs){const a=pair.bodyA,b=pair.bodyB,rvAll=Vector.sub(a.velocity,b.velocity),nAll=pair.collision?.normal||{x:1,y:0},pAll=Math.abs(Vector.dot(rvAll,nAll));if(pAll>2.8){if(isStructuralBody(a)&&a.isStatic&&isStructuralBody(b)&&!b.isStatic)activateStructure(a,90);if(isStructuralBody(b)&&b.isStatic&&isStructuralBody(a)&&!a.isStatic)activateStructure(b,90)}"
s=s.replace(marker,insert,1)

# Frozen targets must not auto-defeat before any shot due to initial settling noise.
s=s.replace(
"if(t.position.y>floorY-36||moved>115||Math.abs(t.angle)>1.1)defeatTarget(t)",
"if(shotStartedAt&&(t.position.y>floorY-36||moved>115||Math.abs(t.angle)>1.1))defeatTarget(t)"
)

p.write_text(s)
