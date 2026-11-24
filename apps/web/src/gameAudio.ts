export function audioLevels(speed:number,electric:boolean,rain:number,night:boolean,traffic:number){
 const v=Math.max(0,Math.min(1,speed/75));
 return {frequency:electric?90+v*420:35+v*105,engine:electric?0.025*v:0.035+v*0.045,wind:v*v*0.09,rain:Math.max(0,Math.min(1,rain))*0.12,ambient:night?0.012:0.025,traffic:Math.max(0,Math.min(1,traffic))*0.045};
}
export class GameAudio{
 private ctx:AudioContext|null=null;
 private master:GainNode|null=null;
 private engine:OscillatorNode|null=null;
 private motor:GainNode|null=null;
 private layers:GainNode[]=[];
 private muted=false;
 private needsRecovery=false;
 private lastRecovery=0;
 recover(gesture=false){
  if(this.muted||document.hidden)return;
  if(gesture&&this.needsRecovery){this.dispose();this.needsRecovery=false;void this.unlock().catch(()=>{this.needsRecovery=true});return;}
  if(this.ctx?.state==='running'&&!this.needsRecovery)return;
  if(!gesture&&Date.now()-this.lastRecovery<700)return;
  this.lastRecovery=Date.now();void this.unlock().catch(()=>{});
 }
 markInterrupted(){this.needsRecovery=true;}

 async unlock(){
  if(this.ctx?.state==='closed')this.dispose();
  if(!this.ctx){
   const C=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
   if(!C)return false;
   const c=this.ctx=new C(),master=this.master=c.createGain();master.gain.value=this.muted?0:0.55;
   const limiter=c.createDynamicsCompressor();master.connect(limiter);limiter.connect(c.destination);
   this.engine=c.createOscillator();this.motor=c.createGain();this.motor.gain.value=0;this.engine.connect(this.motor);this.motor.connect(master);this.engine.start();
   const buffer=c.createBuffer(1,c.sampleRate*3,c.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
   for(const [type,freq] of [['highpass',650],['lowpass',4200],['lowpass',350],['bandpass',180]] as const){
    const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=freq;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(master);source.start();this.layers.push(gain);
   }
  }
  try{const c=this.ctx;await c.resume();return c===this.ctx&&c.state==='running'}catch{return false}
 }
 setMuted(value:boolean){this.muted=value;if(this.ctx&&this.master)this.master.gain.setTargetAtTime(value?0:0.55,this.ctx.currentTime,0.05)}
 update(speed:number,electric:boolean,rain:number,night:boolean,traffic:number){
  const c=this.ctx;if(!c||c.state!=='running'||!this.engine||!this.motor)return;
  const l=audioLevels(speed,electric,rain,night,traffic),t=c.currentTime;
  this.engine.type=electric?'sine':'triangle';this.engine.frequency.setTargetAtTime(l.frequency,t,0.12);this.motor.gain.setTargetAtTime(l.engine,t,0.12);
  [l.wind,l.rain,l.ambient,l.traffic].forEach((v,i)=>this.layers[i]?.gain.setTargetAtTime(v,t,0.2));
 }
 collision(strength:number,car:boolean){const c=this.ctx,master=this.master;if(!c||!master||this.muted||c.state!=='running')return;const t=c.currentTime,duration=car?0.32:0.19,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-5*i/data.length);const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=car?950:2100;gain.gain.value=0.12+0.35*Math.max(0,Math.min(1,strength));source.connect(filter);filter.connect(gain);gain.connect(master);source.start(t);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.setValueAtTime(car?95:180,t);o.frequency.exponentialRampToValueAtTime(car?35:65,t+0.12);g.gain.setValueAtTime(0.12*strength,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.15);o.connect(g);g.connect(master);o.start(t);o.stop(t+0.16);o.onended=()=>{o.disconnect();g.disconnect()}}
 horn(){const c=this.ctx;if(!c||!this.master||c.state!=='running')return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=440;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.15,t+0.025);g.gain.setTargetAtTime(0,t+0.22,0.035);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+0.4);o.onended=()=>{o.disconnect();g.disconnect()}}
 suspend(){void this.ctx?.suspend().catch(()=>{})}
 dispose(){void this.ctx?.close().catch(()=>{});this.ctx=null;this.master=null;this.engine=null;this.motor=null;this.layers=[]}
}
