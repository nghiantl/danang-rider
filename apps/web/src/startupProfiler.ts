type Sample={name:string;kind:'cpu'|'wait'|'render';ms:number;startMs:number;endMs:number};
const samples:Sample[]=[];const stalls:{startMs:number;endMs:number;delayMs:number}[]=[];let active=true;let source='unknown';let start=0;let total=0;let gap=0;let timer:ReturnType<typeof setInterval>|undefined;
export const diagnosticSystems=['StreetLife','CitySigns','Landmarks','Beach','Traffic','Pedestrians','Shadows'] as const;
export const diagnosticPreview=import.meta.env?.VITE_VERCEL_ENV==='preview'||import.meta.env?.DEV===true;
export const disabledSystems=diagnosticPreview&&typeof location!=='undefined'?diagnosticSystems.filter(s=>new URLSearchParams(location.search).getAll('skip').includes(s)):[];
export function diagnosticEnabled(name:typeof diagnosticSystems[number]){return !disabledSystems.includes(name)}
export function recordStartup(name:string,kind:Sample['kind'],since:number){if(active&&samples.length<2000){const now=performance.now();samples.push({name,kind,ms:Math.round(now-since),startMs:Math.round(since),endMs:Math.round(now)})}}
export function startupSource(value:string){if(active)source=value}
export function beginStartup(){start=performance.now();let last=start;timer=setInterval(()=>{const now=performance.now(),delay=now-last-100;gap=Math.max(gap,delay);if(delay>50&&stalls.length<500)stalls.push({startMs:Math.round(last-start),endMs:Math.round(now-start),delayMs:Math.round(delay)});last=now},100)}
export function finishStartup(){if(!active)return;total=Math.round(performance.now()-start);active=false;if(timer!==undefined)clearInterval(timer)}
export function startupReport(){return JSON.stringify({source,disabledSystems,startClickToFrameMs:total,maxObservedTimerDelayMs:Math.round(gap),stalls,samples:samples.map(s=>({...s,startMs:s.startMs-Math.round(start),endMs:s.endMs-Math.round(start)})),resources:performance.getEntriesByType('resource').map(e=>({name:e.name.split('?')[0],startMs:Math.round(e.startTime-start),ms:Math.round(e.duration)})).filter(e=>e.startMs<=total).slice(-200)},null,2)}
