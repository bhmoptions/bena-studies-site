import * as T from 'three';
import { MECHANISMS, angleDelta, hasTurned } from './mecanismos.mjs';
export function createBoxControls(host, camera, box, orbitControls, effects, callbacks) {
  const abort=new AbortController(), elements={}, projected={};
  const layer=document.createElement('div');layer.className='physical-controls';host.append(layer);
  const point=new T.Vector3(),normal=new T.Vector3(),view=new T.Vector3();
  let turning=null,pressed=null,hovered=null,state=null;
  const anchor=side=>{const f=box.faces[side];return side==='blue'?f.gear:side==='red'?f.smallGear:side==='yellow'?f.emblem:f.knob;};
  const on=(target,event,handler)=>target.addEventListener(event,handler,{signal:abort.signal});
  function trigger(side) { effects.press(side);callbacks.activate(side); }
  function updateTurn(side,angle) {
    const f=box.faces[side];f.userAngle=angle;
    if(side==='red')f.smallGear.rotation.z=angle;else f.gear.rotation.z=angle;
  }
  function cancel(){
    if(turning)updateTurn(turning.side,turning.initial);
    for(const [side,f]of Object.entries(box.faces)){if(f.keyAngle){updateTurn(side,f.userAngle-f.keyAngle);f.keyAngle=0;}}
    turning=null;pressed=null;orbitControls.enabled=true;
    host.classList.remove('is-turning');
  }
  for(const [side,definition]of Object.entries(MECHANISMS)){
    const el=document.createElement(definition.kind==='button'?'button':'div');
    el.className='physical-control';el.dataset.physicalControl=side;
    el.setAttribute('aria-label',definition.label);el.setAttribute('title',definition.instruction);
    if(definition.kind==='button'){el.type='button';on(el,'click',event=>{if(event.detail===0)trigger(side);});}
    else {
      el.setAttribute('role','slider');el.setAttribute('aria-valuemin','0');el.setAttribute('aria-valuemax','45');
      el.setAttribute('aria-valuenow','0');el.setAttribute('aria-valuetext','Use as setas para girar a engrenagem.');
      on(el,'keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Enter',' '].includes(event.key)||event.repeat)return;
        event.preventDefault();event.stopPropagation();
        if(state?.sides[side].solved)return;
        const f=box.faces[side],amount=(event.key==='ArrowLeft'?1:-1)*Math.PI/12;
        f.keyAngle+=amount;updateTurn(side,f.userAngle+amount);
        el.setAttribute('aria-valuenow',String(Math.min(45,Math.round(Math.abs(f.keyAngle)*180/Math.PI))));
        el.setAttribute('aria-valuetext','Engrenagem girada. Continue com as setas para conferir.');
        if(hasTurned(f.keyAngle)){f.keyAngle=0;trigger(side);}
      });
    }
    on(el,'focus',()=>hover(side));on(el,'blur',()=>hover(null));
    el.tabIndex=-1;layer.append(el);elements[side]=el;
  }
  function begin(side,event) {
    if(state?.sides[side].solved)return false;
    event.preventDefault();cancel();orbitControls.enabled=false;callbacks.stopCamera();
    if(MECHANISMS[side].kind==='button')pressed={side,x:event.clientX,y:event.clientY,pointerId:event.pointerId};
    else{
      const f=box.faces[side],center=projected[side];
      turning={side,previous:{x:event.clientX,y:event.clientY},center:{...center},angle:0,initial:f.userAngle,pointerId:event.pointerId};
      host.classList.add('is-turning');callbacks.sound('pick');
    }
    hover(side);return true;
  }
  on(document,'pointermove',event=>{
    if(!turning||event.pointerId!==turning.pointerId)return;
    const current={x:event.clientX,y:event.clientY};
    turning.angle+=angleDelta(turning.previous,current,turning.center);
    turning.previous=current;updateTurn(turning.side,turning.initial-turning.angle);
    elements[turning.side].setAttribute('aria-valuenow',String(Math.min(45,Math.round(Math.abs(turning.angle)*180/Math.PI))));
  });
  on(document,'pointerup',event=>{
    if(turning&&event.pointerId===turning.pointerId){
      const turn=turning;turning=null;orbitControls.enabled=true;host.classList.remove('is-turning');
      hover(null);if(hasTurned(turn.angle))trigger(turn.side);else callbacks.hint('Arraste a engrenagem para girá-la antes de soltar.');
    }
    if(pressed&&event.pointerId===pressed.pointerId){
      const p=pressed;pressed=null;orbitControls.enabled=true;hover(null);
      if(Math.hypot(event.clientX-p.x,event.clientY-p.y)<9)trigger(p.side);
    }
  });
  on(document,'pointercancel',cancel);on(window,'blur',cancel);
  on(document,'keydown',event=>{if(event.key==='Escape')cancel();});
  function hover(side) {
    if(turning)return;
    hovered=side;
    for(const [key,f]of Object.entries(box.faces))f.hovered=key===side;
  }
  function tick(){ camera.updateMatrixWorld();
    const rect=host.getBoundingClientRect();box.root.updateMatrixWorld(true);
    for(const [side,el]of Object.entries(elements)){
      const object=anchor(side),f=box.faces[side];object.getWorldPosition(point);
      view.copy(camera.position).sub(point).normalize();normal.set(0,0,1).transformDirection(f.panel.matrixWorld);
      const facing=normal.dot(view)>.12;const distance=point.distanceTo(camera.position);
      point.project(camera);
      const x=rect.left+(point.x+1)*rect.width/2,y=rect.top+(1-point.y)*rect.height/2;
      const worldRadius=side==='blue'?.49:side==='red'?.23:side==='yellow'?.2:.11;
      const radius=Math.max(8,worldRadius*rect.height/(2*Math.tan(camera.fov*Math.PI/360)*distance));
      const visible=facing&&point.z>-1&&point.z<1&&Math.abs(point.x)<.94&&Math.abs(point.y)<.94;
      projected[side]={x,y,radius,visible,kind:MECHANISMS[side].kind};
      el.style.left=(x-rect.left)+'px';el.style.top=(y-rect.top)+'px';
      el.style.width=el.style.height=Math.max(24,radius*2.35)+'px';
      el.tabIndex=visible&&!state?.sides[side].solved?0:-1;
      el.setAttribute('aria-hidden',String(!visible));el.setAttribute('aria-disabled',String(Boolean(state?.sides[side].solved)));
    }
  }
  return {begin,hover,tick,cancel,sync(next){state=next;if(hovered&&state.sides[hovered].solved)hover(null);},
    inspect:()=>({targets:structuredClone(projected),turning:turning?.side||null}),
    dispose(){abort.abort();cancel();layer.remove();}
  };
}




