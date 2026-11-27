type Sample={name:string;kind:'cpu'|'wait'|'render';ms:number};
const samples:Sample[]=[];let active=true;let source='unknown';let start=0;let total=0;let gap=0;let timer:ReturnType<typeof setInterval>|undefined;
export function recordStartup(name:string,kind:Sample['kind'],since:number){if(active)samples.push({name,kind,ms:Math.round(performance.now()-since)})}
export function startupSource(value:string){if(active)source=value}
export function beginStartup(){start=performance.now();let last=start;timer=setInterval(()=>{const now=performance.now();gap=Math.max(gap,now-last-100);last=now},100)}
export function finishStartup(){if(!active)return;total=Math.round(performance.now()-start);active=false;if(timer!==undefined)clearInterval(timer)}
export function startupReport(){return JSON.stringify({source,startClickToFrameMs:total,maxObservedTimerDelayMs:Math.round(gap),samples},null,2)}
