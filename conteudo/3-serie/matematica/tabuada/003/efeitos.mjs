import * as T from 'three';
import { SIDES } from './logica.mjs';
const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => { const t=clamp(value); return t*t*(3-2*t); };
export function createBoxEffects(box, assets, onUnlock, reducedMotion=false) {
  const cloud=assets.texture(assets.canvas(128,128,(ctx)=>{
    // Soft, original volume sprites; no flashes or continuously emitting particles.
    for(const [x,y,r] of [[56,68,48],[78,47,36],[37,45,29],[81,83,29]]){
      const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
      gradient.addColorStop(0,'rgba(239,238,220,.3)');gradient.addColorStop(.48,'rgba(219,228,216,.15)');gradient.addColorStop(1,'rgba(206,219,216,0)');
      ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    }
  }));
  const smokeMaterials=[];
  for(const side of SIDES){
    const face=box.faces[side];
    face.openTime=null;face.jamTime=null;face.pressTime=null;face.observedErrors=0;face.wasSolved=false;face.userAngle=0;face.hovered=false;face.keyAngle=0;
    face.smoke=new T.Group();face.group.add(face.smoke);face.puffs=[];
    for(let i=0;i<12;i++){
      const material=new T.SpriteMaterial({map:cloud,color:'#e8efe2',transparent:true,opacity:0,depthWrite:false});
      smokeMaterials.push(material);const puff=new T.Sprite(material);puff.visible=false;puff.renderOrder=2;
      face.smoke.add(puff);face.puffs.push(puff);
    }
  }
  function sync(state,now=performance.now()){
    for(const side of SIDES){
      const f=box.faces[side],p=state.sides[side];
      if(p.solved&&!f.wasSolved){f.openTime=now;f.jamTime=null;onUnlock?.(side);}
      if(p.errors>f.observedErrors&&!p.solved)f.jamTime=now;
      f.observedErrors=p.errors;f.wasSolved=p.solved;
    }
  }
  function tick(now){
    for(const side of SIDES){
      const f=box.faces[side],t=f.openTime===null?-1:(now-f.openTime)/1000;
      const progress=t<0?0:reducedMotion?1:ease((t-.13)/1.15);
      f.progress=progress;
      let jam=0;
      if(f.jamTime!==null){
        const j=(now-f.jamTime)/1000;
        if(j>=1.15)f.jamTime=null;
        else if(!reducedMotion)jam=Math.sin(clamp(j/.16)*Math.PI/2)*.027*(.65+.35*Math.sin(j*39))*clamp((1.15-j)/.22);
      }
      // The right edge swings out while the left vertical hinge remains in place.
      f.hinge.rotation.y=-(progress*.17+jam);
      f.gear.rotation.z=(side==='blue'?f.userAngle:0)+progress*Math.PI*1.25;
      if(side==='red')f.smallGear.rotation.z=f.userAngle-progress*Math.PI*2;
      if(side==='purple')f.bolt.position.x=.83+progress*.23;
      const press=f.pressTime===null?1:(now-f.pressTime)/220;
      const depth=press<1?Math.sin(press*Math.PI)*.055:0;
      if(side==='purple')f.knob.position.z=.13-depth;
      if(side==='yellow')f.emblem.position.z=.08-depth;
      f.glow.emissiveIntensity=.06+progress*.95+(f.hovered?.2:0);
      f.backlight.emissiveIntensity=.008+progress*1.15;
      f.backlight.color.set('#131813');
      
      f.innerLight.intensity=progress*1.3;
      let visible=0;
      f.puffs.forEach((puff,i)=>{
        const age=t-.38-i*.07;
        puff.visible=!reducedMotion&&t>=0&&age>0&&age<2.2;
        if(!puff.visible){puff.material.opacity=0;return;}
        visible++;
        const phase=age/2.2;
        puff.position.set(1.24+Math.sin(i*2.1+phase)*.12, .88+(i%5)*.32+phase*.95, 1.5+progress*.19+phase*.37);
        puff.scale.setScalar(.28+phase*.65+(i%3)*.06);
        puff.material.opacity=Math.sin(phase*Math.PI)*.58;
        puff.material.rotation=(i%2?1:-1)*phase*.3;
      });
      f.smokeCount=visible;
    }
  }
  return {
    sync,tick,press(side){box.faces[side].pressTime=performance.now();},
    setReducedMotion(value){reducedMotion=value;},
    inspect:()=>Object.fromEntries(SIDES.map(side=>{const f=box.faces[side];return[side,{openAngle:f.hinge.rotation.y,lit:f.backlight.emissiveIntensity,
      smoke:f.smokeCount||0,jammed:f.jamTime!==null,solved:f.wasSolved,gearAngle:side==='red'?f.smallGear.rotation.z:f.gear.rotation.z}];})),
    dispose(){smokeMaterials.forEach(m=>m.dispose());SIDES.forEach(side=>box.faces[side].smoke.removeFromParent());}
  };
}


