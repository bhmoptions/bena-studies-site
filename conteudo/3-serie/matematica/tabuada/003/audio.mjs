// Small synthesized mechanical cues; no downloaded audio and no music.
export function createAudio() {
  let ctx = null, muted = false;
  try { muted = localStorage.getItem('bena-audio-muted') === 'true'; } catch {}
  function play(kind) {
    if(muted)return;
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
      const patterns={pick:[610],place:[310,390],move:[185],invalid:[220,190],error:[245,205],success:[392,494,587],unlock:[170,240,340],open:[196,294,392,587],scroll:[660,784]};
      const notes=patterns[kind]||patterns.place;
      notes.forEach((freq,i)=>{
        const oscillator=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime+i*.085;
        oscillator.type=kind==='unlock'?'triangle':'sine';oscillator.frequency.setValueAtTime(freq,t);
        gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.045,t+.012);gain.gain.exponentialRampToValueAtTime(.001,t+.17);
        oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(t);oscillator.stop(t+.19);
      });
    } catch {}
  }
  return {play,get muted(){return muted;},toggle(){muted=!muted;try{localStorage.setItem('bena-audio-muted',String(muted));}catch{}return muted;},dispose(){ctx?.close().catch(()=>{});ctx=null;}};
}

