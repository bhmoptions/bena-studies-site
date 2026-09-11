// All edits commit on drop. Cancelled drags restore the source without changing the attempt.
export function connectInteraction(container, getScene, callbacks) {
  const abort=new AbortController();let drag=null;
  function begin(value,event,origin=null,sourceSide=null) {
    if(event.button!==undefined&&event.button!==0)return;
    event.preventDefault();
    callbacks.select(value,sourceSide||origin?.side);
    const started=getScene().beginDrag(value,event.clientX,event.clientY,origin,sourceSide);
    if(!started)return;
    callbacks.sound('pick');
    drag={value,origin,x:event.clientX,y:event.clientY,moved:false,pointerId:event.pointerId};
    container.classList.add('is-grabbing');
  }
  function clear() {
    if(!drag)return;
    drag=null;getScene().cancelDrag();container.classList.remove('is-grabbing');
    container.querySelectorAll('.drop-hover').forEach(el=>el.classList.remove('drop-hover'));
  }
  const on=(target,event,fn)=>target.addEventListener(event,fn,{signal:abort.signal});
  on(container,'pointerdown',event=>{
    const button=event.target.closest('[data-flask]');
    if(button&&!button.disabled)begin(Number(button.dataset.flask),event);
  });
  on(document,'pointermove',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>7)drag.moved=true;
    getScene().moveDrag(event.clientX,event.clientY);
    const hovered=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-drop]');
    container.querySelectorAll('.drop-hover').forEach(el=>el.classList.remove('drop-hover'));
    if(hovered&&!hovered.disabled)hovered.classList.add('drop-hover');
  });
  on(document,'pointerup',event=>{
    if(!drag||event.pointerId!==drag.pointerId)return;
    const current=drag;
    const el=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-drop]');
    const destination=el?{side:el.dataset.side,pan:el.dataset.drop}:getScene().targetAt(event.clientX,event.clientY);
    clear();
    if(!current.moved)return;
    if(current.origin){
      if(destination)callbacks.move(current.origin,destination);
      else callbacks.remove(current.origin);
    }else if(destination)callbacks.drop(current.value,destination);
    else callbacks.invalid('Solte no prato iluminado ou nos espaços “Colocar aqui”.');
  });
  on(document,'pointercancel',clear);on(window,'blur',clear);
  on(document,'keydown',event=>{if(event.key==='Escape')clear();});
  return {begin,dispose(){clear();abort.abort();}};
}

