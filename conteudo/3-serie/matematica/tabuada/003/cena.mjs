import * as T from 'three';
import { OrbitControls } from '../../../../../assets/vendor/three/OrbitControls.js';
import { createWorkshopAssets, ANGLES } from './modelos.mjs?v=puzzles-json-8';
import { SIDES, total, balanceTilt, valuesForSide } from './logica.mjs?v=puzzles-json-8';
import { createBoxEffects } from './efeitos.mjs';
import { createBoxControls } from './controles-caixa.mjs';
import { MECHANISMS } from './mecanismos.mjs';
const lerp=T.MathUtils.lerp;
const clamp=T.MathUtils.clamp;
const smooth=t=>t*t*(3-2*t);
const ZOOM_FRAME_START=13.2,ZOOM_TARGET_SHIFT=4.4,ZOOM_TARGET_RISE=-.45,ZOOM_POLAR_LIFT=.12;
const DOUBLE_CLICK_DELAY=450,DOUBLE_CLICK_DISTANCE=14;
export function createScene(host,config,callbacks,reducedMotion=false) {
  const assets=createWorkshopAssets();let renderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}
  catch(error){assets.dispose();throw error;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.23;
  renderer.domElement.setAttribute('aria-label','Oficina 3D. Arraste o fundo para girar, use Shift + arraste ou arraste com o botão direito para deslocar, os frascos para colocar ou retirar, dê dois cliques em um frasco para esvaziar a balança, e use as engrenagens para conferir. Os controles da caixa também recebem foco com Tab.');
  renderer.domElement.tabIndex=0;host.append(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color('#293b3c');scene.fog=new T.Fog('#293b3c',23,55);
  const env=assets.texture(assets.canvas(1024,512,(ctx,w,h)=>{
    const gradient=ctx.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#b7cacc');gradient.addColorStop(.5,'#7c8170');gradient.addColorStop(1,'#363431');ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#f8e4bb';ctx.fillRect(70,80,180,150);ctx.fillStyle='#c4e0e6';ctx.fillRect(590,90,210,140);
  }));
  env.mapping=T.EquirectangularReflectionMapping;scene.environment=env;scene.environmentIntensity=.65;
  scene.add(new T.HemisphereLight('#fff2d7','#504236',2));
  const key=new T.DirectionalLight('#ffe3ae',4.3);key.position.set(-5,11,5);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:28});key.shadow.bias=-.0003;key.shadow.normalBias=.03;scene.add(key);
  const fill=new T.DirectionalLight('#a4dcf0',2.1);fill.position.set(7,6,-7);scene.add(fill);
  const magic=new T.PointLight('#e2bbff',0,10);magic.position.set(0,3.1,0);scene.add(magic);
  scene.add(assets.makeTable());
  const box=assets.makeBox();scene.add(box.root);
  const effects=createBoxEffects(box,assets,()=>callbacks.unlocked?.(),reducedMotion);
  const camera=new T.PerspectiveCamera(40,1,.1,80);camera.position.set(4.1,8.9,14.2);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,1.2,1.05);controls.enableDamping=true;controls.dampingFactor=.085;
  controls.enablePan=false;controls.minDistance=6.5;controls.maxDistance=20;
  controls.minPolarAngle=.43;controls.maxPolarAngle=1.24;controls.rotateSpeed=.65;controls.zoomSpeed=.7;
  const abort=new AbortController(),ray=new T.Raycaster(),pointer=new T.Vector2();
  const plane=new T.Plane(new T.Vector3(0,1,0),-2.7),world=new T.Vector3();
  const scales={},placed={},shelves={},hitObjects=new Set(),hitGeometries=new Map();
  const hitMat=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  function hit(parent,w,h,d,position,data) {
    const key=[w,h,d].join(':');
    if(!hitGeometries.has(key))hitGeometries.set(key,new T.BoxGeometry(w,h,d));
    const mesh=new T.Mesh(hitGeometries.get(key),hitMat);mesh.position.copy(position);mesh.userData={...data};
    parent.add(mesh);hitObjects.add(mesh);return mesh;
  }
  for(const side of SIDES) {
    const scale=side==='purple'?assets.makeBalance():assets.makeDial(side,config.targets[side]);
    scale.root.rotation.y=ANGLES[side];scale.root.position.set(Math.sin(ANGLES[side])*4.6,0,Math.cos(ANGLES[side])*4.6);
    scene.add(scale.root);scales[side]=scale;placed[side]={left:[],right:[]};
    // The clue belongs to the physical mechanism: a colored note rests at its right.
    const hint=assets.makeHintPaper(side,config.targets[side],config.hints?.[side]);hint.position.set(side==='purple'?2.45:1.72,0,.18);hint.rotation.y=-.08;scale.root.add(hint);
    for(const [pan,group]of Object.entries(scale.pans))hit(group,side==='purple'?1.7:2.1,.22,side==='purple'?1.7:2.1,new T.Vector3(0,.15,0),{kind:'pan',side,pan});
    const f=box.faces[side];
    hit(f.panel,2.6,2.4,.18,new T.Vector3(0,1.65,1.45),{kind:'face',side});
    const data={kind:'control',side,mode:MECHANISMS[side].kind};
    if(side==='purple')hit(f.bolt,.41,.4,.28,new T.Vector3(0,0,.14),data);
    else if(side==='yellow')hit(f.gear,.49,.49,.26,new T.Vector3(0,0,.13),data);
    else if(side==='red')hit(f.smallGear,.7,.7,.24,new T.Vector3(0,0,.06),data);
    else hit(f.gear,1.16,1.16,.26,new T.Vector3(0,0,.06),data);
    hit(scale.root,side==='purple'?3.4:2,1.3,1.6,new T.Vector3(0,.7,0),{kind:'scale',side});
    // Each shelf is permanently attached to its own place on the table.
    const shelf=new T.Group();shelf.rotation.y=ANGLES[side];scene.add(shelf);
    const flasks=valuesForSide(config,side).map((value,i)=>{
      const flask=assets.makeFlask(value,side,.78);flask.position.set((i-2)*.6,.05,6.25);shelf.add(flask);
      hit(flask,.64,1,.62,new T.Vector3(0,.43,0),{kind:'supply',value,side});return flask;
    });
    shelves[side]={root:shelf,flasks};
  }
  const haloGeometry=new T.RingGeometry(.62,.72,48);
  const haloMaterial=new T.MeshBasicMaterial({color:'#fff0ab',transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false});
  const halo=new T.Mesh(haloGeometry,haloMaterial);halo.rotation.x=-Math.PI/2;halo.visible=false;scene.add(halo);
  let active='blue',state=null,focusTween=null,dragging=null,down=null,panning=null,lastBottleClick=null;
  let reward=null,rewardStart=null,rewardShown=false,disposed=false,lastTime=0,visible=true;
  const boxControls=createBoxControls(host,camera,box,controls,effects,{
    activate:side=>callbacks.activate(side),stopCamera(){focusTween=null;down=null;},
    sound:kind=>callbacks.sound?.(kind),hint:message=>callbacks.hint?.(message)
  });
  function focus(side,animate=true) {
    active=side;
    const a=ANGLES[side]+(side==='red'?-.38:side==='purple'?.32:.18),end=new T.Vector3(Math.sin(a)*14.3,8.6,Math.cos(a)*14.3);
    const target=new T.Vector3(Math.sin(ANGLES[side])*.8,1.35,Math.cos(ANGLES[side])*.8);
    if(animate&&!reducedMotion)focusTween={from:camera.position.clone(),to:end,fromTarget:controls.target.clone(),target,start:performance.now()};
    else{camera.position.copy(end);controls.target.copy(target);controls.update();focusTween=null;}
  }
  function setRay(x,y) { camera.updateMatrixWorld();
    const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
  }
  function hitsAt(x,y) {
    setRay(x,y);scene.updateMatrixWorld(true);
    return ray.intersectObjects([...hitObjects],false).filter(({object})=>{
      const p=object.userData;
      if(p.kind==='control'&&!boxControls.inspect().targets[p.side]?.visible)return false;
      return !(p.kind==='flask'&&dragging?.origin&&p.side===dragging.origin.side&&p.pan===dragging.origin.pan&&p.index===dragging.origin.index);
    });
  }
  function pick(x,y) {
    const hits=hitsAt(x,y),first=hits[0]?.object.userData;
    if(first?.kind==='pan'){
      // A generous pan drop volume must not cover the individual flasks inside it.
      const flask=hits.find(({object,distance})=>object.userData.kind==='flask'&&object.userData.side===first.side&&object.userData.pan===first.pan&&distance<hits[0].distance+2);
      if(flask)return flask.object.userData;
    }
    return first;
  }
  function project(group,offset=new T.Vector3()) {
    const point=group.localToWorld(offset.clone());point.project(camera);const rect=host.getBoundingClientRect();
    return {x:rect.left+(point.x+1)*rect.width/2,y:rect.top+(1-point.y)*rect.height/2,visible:Math.abs(point.x)<1&&Math.abs(point.y)<1&&point.z>-1&&point.z<1};
  }
  function targetAt(x,y) {
    const rect=host.getBoundingClientRect();
    if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;
    const first=hitsAt(x,y)[0]?.object.userData;
    if(first?.kind==='pan'||first?.kind==='flask')return{side:first.side,pan:first.pan};
    // A flask dropped onto the table, a shelf or the box has left the pan.
    if(first&&first.kind!=='scale')return null;
    let closest=null,distance=Infinity;
    for(const side of SIDES){
      if(first?.side&&first.side!==side)continue;
      for(const [pan,group]of Object.entries(scales[side].pans)){
        const p=project(group,new T.Vector3(0,.25,0)),d=Math.hypot(p.x-x,p.y-y);
        if(p.visible&&d<Math.min(82,rect.width*.13)&&d<distance){distance=d;closest={side,pan};}
      }
    }
    return closest;
  }
  function highlight(destination) {
    halo.visible=Boolean(destination);
    if(destination){
      scales[destination.side].pans[destination.pan].getWorldPosition(world);halo.position.copy(world);halo.position.y+=.2;
      const p=state?.sides[destination.side],values=p?.[destination.pan]||[];
      const accepts=!p?.solved&&(!values.length||values[0]===dragging?.value);
      halo.material.color.set(accepts?'#fff0ab':'#f39477');
    }
  }
  function moveDrag(x,y) {
    if(!dragging)return;
    setRay(x,y);const point=new T.Vector3();if(ray.ray.intersectPlane(plane,point))dragging.root.position.copy(point);
    const destination=targetAt(x,y);highlight(destination);return destination;
  }
  function beginDrag(value,x,y,origin=null,sourceSide=null) {
    cancelDrag();boxControls.cancel();
    const source=origin?placed[origin.side]?.[origin.pan]?.[origin.index]:null;
    if(origin&&(!source||state?.sides[origin.side].solved))return false;
    if(state?.complete)return false;
    controls.enabled=false;focusTween=null;down=null;
    const root=assets.makeFlask(value,sourceSide||origin?.side||active,.73);scene.add(root);
    dragging={value,root,origin,source};if(source)source.visible=false;
    moveDrag(x,y);return true;
  }
  function cancelDrag() {
    if(dragging){if(dragging.source)dragging.source.visible=true;scene.remove(dragging.root);assets.release(dragging.root);dragging=null;}
    controls.enabled=true;halo.visible=false;
  }
  function sync(next) {
    state=next;effects.sync(state);boxControls.sync(state);
    for(const side of SIDES)for(const [pan,group]of Object.entries(scales[side].pans)){
      const values=state.sides[side][pan],old=placed[side][pan];
      if(old.length===values.length&&old.every((flask,i)=>flask.userData.value===values[i]))continue;
      old.forEach(flask=>{hitObjects.delete(flask.userData.hit);group.remove(flask);assets.release(flask);});
      placed[side][pan]=values.map((value,i)=>{
        const flask=assets.makeFlask(value,side,side==='purple'?.43:.5),cols=values.length>6?4:3;
        flask.position.set((i%cols-(cols-1)/2)*.39,.10,-.4+Math.floor(i/cols)*.35);
        flask.userData.value=value;group.add(flask);
        flask.userData.hit=hit(flask,.65,1.02,.64,new T.Vector3(0,.46,0),{kind:'flask',side,pan,index:i,value});
        return flask;
      });
    }
  }
  function reveal(score) {
    if(reward)return;
    reward=assets.makeScroll(score);scene.add(reward.root);rewardStart=performance.now()+(reducedMotion?-6000:900);
    focusTween={from:camera.position.clone(),to:new T.Vector3(.7,7.8,12.3),fromTarget:controls.target.clone(),target:new T.Vector3(0,2.45,0),start:performance.now()};
  }
  function thumbnails() {
    const r=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
    r.setSize(180,190);r.setPixelRatio(1);r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.5;
    const s=new T.Scene();s.environment=env;s.add(new T.HemisphereLight('#fff3dc','#92a9ab',3));
    const light=new T.DirectionalLight('#ffffff',4);light.position.set(-1,3,3);s.add(light);
    const c=new T.PerspectiveCamera(32,180/190,.1,10);c.position.set(.2,.65,2);c.lookAt(0,.44,0);
    const result={};
    for(const value of valuesForSide(config,active)){const flask=assets.makeFlask(value);s.add(flask);r.render(s,c);result[value]=r.domElement.toDataURL('image/png');s.remove(flask);assets.release(flask);}
    r.dispose();r.forceContextLoss();return result;
  }
  function resize(){const {width,height}=host.getBoundingClientRect();renderer.setSize(Math.max(1,width),Math.max(1,height));camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();focus('blue',false);
  // Open on the widest useful overview; the camera buttons and wheel can zoom in from here.
  zoom(controls.maxDistance/camera.position.distanceTo(controls.target));
  const on=(el,name,handler,capture=false)=>el.addEventListener(name,handler,{signal:abort.signal,capture});
  // OrbitControls only changes the distance to a fixed target. On this scene that
  // lowers the camera behind the front shelf, so wheel zoom follows the same
  // framed path as the accessible camera buttons instead.
  on(renderer.domElement,'wheel',event=>{
    if(event.ctrlKey||!controls.enabled)return;
    event.preventDefault();event.stopImmediatePropagation();
    const delta=clamp(event.deltaY,-120,120);
    zoom(Math.exp(delta*.0015*controls.zoomSpeed));
  },true);
  on(renderer.domElement,'contextmenu',event=>{
    // The right mouse button is reserved for panning inside the 3D scene.
    event.preventDefault();event.stopImmediatePropagation();
  },true);
  on(renderer.domElement,'pointerdown',event=>{
    if(event.button!==0&&event.button!==2)return;
    if(event.button===2||event.shiftKey){
      event.preventDefault();event.stopImmediatePropagation();focusTween=null;down=null;controls.enabled=false;
      panning={x:event.clientX,y:event.clientY};renderer.domElement.setPointerCapture?.(event.pointerId);renderer.domElement.style.cursor='grabbing';return;
    }
    focusTween=null;const p=pick(event.clientX,event.clientY);
    if(p?.kind!=='flask')lastBottleClick=null;
    if(['supply','flask','control'].includes(p?.kind)){
      event.preventDefault();event.stopImmediatePropagation();down=null;
      if(p.kind==='supply')callbacks.dragSupply(p.value,event,p.side);
      else if(p.kind==='flask'){
        if(!state?.sides[p.side].solved){
          const now=performance.now(),previous=lastBottleClick;
          const repeated=previous&&previous.side===p.side&&previous.pan===p.pan&&previous.index===p.index&&previous.value===p.value
            &&now-previous.time<=DOUBLE_CLICK_DELAY&&Math.hypot(event.clientX-previous.x,event.clientY-previous.y)<=DOUBLE_CLICK_DISTANCE;
          if(repeated){
            lastBottleClick=null;boxControls.cancel();callbacks.clearScale?.(p.side);return;
          }
          lastBottleClick={side:p.side,pan:p.pan,index:p.index,value:p.value,time:now,x:event.clientX,y:event.clientY};
          callbacks.dragPlaced(p,event);
        }
        else callbacks.hint?.('Este lado já está aberto.');
      }else boxControls.begin(p.side,event);
      return;
    }
    down={x:event.clientX,y:event.clientY,pick:p};
  },true);
  on(renderer.domElement,'pointermove',event=>{
    if(panning){panByPixels(event.clientX-panning.x,event.clientY-panning.y);panning.x=event.clientX;panning.y=event.clientY;return;}
    if(dragging&&lastBottleClick&&Math.hypot(event.clientX-lastBottleClick.x,event.clientY-lastBottleClick.y)>DOUBLE_CLICK_DISTANCE)lastBottleClick=null;
    if(dragging||!controls.enabled)return;
    const p=pick(event.clientX,event.clientY);
    boxControls.hover(p?.kind==='control'?p.side:null);
    renderer.domElement.style.cursor=['supply','flask'].includes(p?.kind)||p?.mode==='gear'?'grab':p?'pointer':'grab';
  });
  on(renderer.domElement,'pointerleave',()=>boxControls.hover(null));
  on(renderer.domElement,'pointerup',event=>{
    if(panning){panning=null;controls.enabled=true;renderer.domElement.releasePointerCapture?.(event.pointerId);renderer.domElement.style.cursor='grab';return;}
    if(!down||Math.hypot(down.x-event.clientX,down.y-event.clientY)>7){down=null;return;}
    const p=down.pick;down=null;
    if(p?.kind==='face'||p?.kind==='scale')callbacks.selectSide(p.side);
    else if(p?.kind==='pan')callbacks.pan(p.side,p.pan);
  });
  on(renderer.domElement,'keydown',event=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(event.key)){
      event.preventDefault();
      if(event.key==='ArrowLeft')orbit(-1);if(event.key==='ArrowRight')orbit(1);
      if(['ArrowUp','+','='].includes(event.key))zoom(.9);if(['ArrowDown','-'].includes(event.key))zoom(1.1);
    }
  });
  on(renderer.domElement,'pointercancel',event=>{if(panning){panning=null;controls.enabled=true;renderer.domElement.releasePointerCapture?.(event.pointerId);}});
  on(renderer.domElement,'webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);callbacks.contextLost();});
  on(document,'visibilitychange',()=>{visible=!document.hidden;lastTime=0;});
  function orbit(direction){focusTween=null;const v=camera.position.clone().sub(controls.target);v.applyAxisAngle(new T.Vector3(0,1,0),direction*.38);camera.position.copy(controls.target).add(v);controls.update();}
  function panByPixels(dx,dy){
    const rect=renderer.domElement.getBoundingClientRect(),distance=camera.position.distanceTo(controls.target);
    const unit=2*distance*Math.tan(T.MathUtils.degToRad(camera.fov/2))/Math.max(1,rect.height);
    const forward=controls.target.clone().sub(camera.position);forward.y=0;forward.normalize();
    const right=new T.Vector3().crossVectors(forward,new T.Vector3(0,1,0)).normalize();
    const desired=controls.target.clone().addScaledVector(right,-dx*unit).addScaledVector(forward,dy*unit);
    desired.x=clamp(desired.x,-6.8,6.8);desired.z=clamp(desired.z,-6.8,6.8);
    const shift=desired.sub(controls.target);controls.target.add(shift);camera.position.add(shift);controls.update();
  }
  function pan(direction){
    const amount=.72,directionPixels={left:[amount/unitForPan(),0],right:[-amount/unitForPan(),0],up:[0,amount/unitForPan()],down:[0,-amount/unitForPan()]}[direction];
    if(directionPixels)panByPixels(...directionPixels);
  }
  function unitForPan(){const rect=renderer.domElement.getBoundingClientRect(),distance=camera.position.distanceTo(controls.target);return 2*distance*Math.tan(T.MathUtils.degToRad(camera.fov/2))/Math.max(1,rect.height);}
  function zoomProgress(distance){return smooth(clamp((ZOOM_FRAME_START-distance)/(ZOOM_FRAME_START-controls.minDistance),0,1));}
  function zoomOffset(side,distance){
    const progress=zoomProgress(distance),angle=ANGLES[side];
    return new T.Vector3(Math.sin(angle)*ZOOM_TARGET_SHIFT*progress,ZOOM_TARGET_RISE*progress,Math.cos(angle)*ZOOM_TARGET_SHIFT*progress);
  }
  function zoom(factor){
    focusTween=null;
    const view=camera.position.clone().sub(controls.target),distance=view.length();
    const nextDistance=clamp(distance*factor,controls.minDistance,controls.maxDistance);
    if(Math.abs(nextDistance-distance)<.0001)return;
    const progress=zoomProgress(distance),nextProgress=zoomProgress(nextDistance);
    const shift=zoomOffset(active,nextDistance).sub(zoomOffset(active,distance));
    controls.target.add(shift);camera.position.add(shift);
    const spherical=new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    spherical.radius=nextDistance;
    spherical.phi=clamp(spherical.phi-(nextProgress-progress)*ZOOM_POLAR_LIFT,controls.minPolarAngle,controls.maxPolarAngle);
    camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(spherical));controls.update();
  }
  function tick(now) {
    if(disposed||!visible)return;
    const dt=lastTime?Math.min((now-lastTime)/1000,.25):.016;lastTime=now;
    const blend=reducedMotion?1:1-Math.exp(-dt*8);
    if(focusTween){
      const t=Math.min(1,(now-focusTween.start)/(reducedMotion?1:750));
      camera.position.lerpVectors(focusTween.from,focusTween.to,smooth(t));controls.target.lerpVectors(focusTween.fromTarget,focusTween.target,smooth(t));if(t===1)focusTween=null;
    }
    controls.update();camera.updateMatrixWorld();
    if(state)for(const side of SIDES){
      const s=scales[side],p=state.sides[side];
      if(side==='purple'){
        const wantedTilt=balanceTilt(total(p.left),total(p.right));s.tilt=lerp(s.tilt,wantedTilt,blend);
        if(Math.abs(s.tilt-wantedTilt)<.00005)s.tilt=wantedTilt;s.beam.rotation.z=s.tilt;
        for(const pan of Object.values(s.pans))pan.userData.suspension.rotation.z=-s.tilt;
      }else{s.total=lerp(s.total,total(p.left),blend);s.needle.rotation.z=(135-s.total*2.7)*Math.PI/180;s.pans.left.position.y=1.96-s.total*.0014;}
    }
    effects.tick(now);boxControls.tick();
    if(reward){
      const elapsed=(now-rewardStart)/1000,lidProgress=smooth(Math.max(0,Math.min(1,(elapsed-.5)/1.45)));
      box.lid.rotation.x=-lidProgress*1.95;magic.intensity=lidProgress*12;reward.root.visible=elapsed>1.4;
      reward.root.position.y=lerp(1.5,4.12,smooth(Math.max(0,Math.min(1,(elapsed-1.4)/1.8))));
      const unfold=Math.max(.04,Math.min(1,(elapsed-2)/1.1));reward.sheet.scale.y=unfold;reward.rolls[0].position.y=-1.3*unfold;reward.rolls[1].position.y=1.3*unfold;
      reward.root.rotation.y=Math.atan2(camera.position.x,camera.position.z);
      if(elapsed>3.5&&!rewardShown){rewardShown=true;callbacks.rewardReady();}
    }
    renderer.render(scene,camera);
  }
  renderer.setAnimationLoop(tick);
  return {sync,focus,beginDrag,moveDrag,cancelDrag,targetAt,highlight,reveal,thumbnails,orbit,pan,zoom,setActive(side){active=side;},
    setReducedMotion(value){reducedMotion=value;effects.setReducedMotion(value);},
    inspect:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,
      activeSide:active,dragging:dragging?{value:dragging.value,origin:dragging.origin}:null,
      panScreens:Object.fromEntries(Object.entries(scales[active].pans).map(([pan,group])=>[pan,project(group,new T.Vector3(0,.3,0))])),
      allPanScreens:Object.fromEntries(SIDES.map(side=>[side,Object.fromEntries(Object.entries(scales[side].pans).map(([pan,group])=>[pan,project(group,new T.Vector3(0,.3,0))]))])),
      placedScreens:Object.fromEntries(SIDES.map(side=>[side,Object.fromEntries(Object.entries(placed[side]).map(([pan,flasks])=>[pan,flasks.map((flask,index)=>({index,value:flask.userData.value,...project(flask,new T.Vector3(0,.46,0))}))]))])),
      shelves:Object.fromEntries(SIDES.map(side=>[side,{count:shelves[side].flasks.length,positions:shelves[side].flasks.map(f=>f.getWorldPosition(new T.Vector3()).toArray()),
        screens:shelves[side].flasks.map((f,i)=>({value:valuesForSide(config,side)[i],...project(f,new T.Vector3(0,.45,0))}))}])),
      mechanisms:boxControls.inspect().targets,turning:boxControls.inspect().turning,effects:effects.inspect(),azimuth:controls.getAzimuthalAngle(),lidAngle:box.lid.rotation.x,
      cameraPosition:camera.position.toArray(),cameraTarget:controls.target.toArray(),cameraDistance:camera.position.distanceTo(controls.target),cameraMoving:Boolean(focusTween),
      scrollVisible:reward?.root.visible||false,scrollUnfold:reward?.sheet.scale.y||0,tilt:scales.purple.beam.rotation.z,
      panLeftY:scales.purple.pans.left.getWorldPosition(new T.Vector3()).y,panRightY:scales.purple.pans.right.getWorldPosition(new T.Vector3()).y,
      needles:Object.fromEntries(SIDES.slice(0,3).map(side=>[side,scales[side].needle.rotation.z])),disposed}),
    dispose(){if(disposed)return;disposed=true;abort.abort();observer.disconnect();cancelDrag();boxControls.dispose();effects.dispose();renderer.setAnimationLoop(null);controls.dispose();
      scene.traverse(node=>{if(node.isInstancedMesh)node.dispose();});hitGeometries.forEach(g=>g.dispose());hitMat.dispose();haloGeometry.dispose();haloMaterial.dispose();key.shadow.dispose();assets.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}
  };
}







