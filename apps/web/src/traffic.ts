import type {Road,Point} from './osm';
export type Lane={a:Point;b:Point;length:number;ux:number;uz:number;offset:number;width:number;next:number[]};
export type Car={lane:number;t:number;speed:number;kind:number;cruise?:number};
const key=(p:Point)=>p.x.toFixed(3)+':'+p.z.toFixed(3);
export function lanesFor(roads:Road[]){
 const lanes:Lane[]=[],starts=new Map<string,number[]>();
 function add(a:Point,b:Point,width:number){const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<0.1)return;const id=lanes.length;lanes.push({a,b,length,ux:(b.x-a.x)/length,uz:(b.z-a.z)/length,offset:Math.min(width/4,2),width,next:[]});const k=key(a);starts.set(k,[...(starts.get(k)||[]),id])}
 for(const r of roads){if(r.kind==='pedestrian')continue;for(let i=1;i<r.points.length;i++){if(r.oneway!==-1)add(r.points[i-1],r.points[i],r.width);if(r.oneway!==1)add(r.points[i],r.points[i-1],r.width)}}
 for(const l of lanes){const all=starts.get(key(l.b))||[];const forward=all.filter(i=>key(lanes[i].b)!==key(l.a));l.next=forward.length?forward:all}
 return lanes;
}
export function pose(l:Lane,t:number){return {x:l.a.x+l.ux*t-l.uz*l.offset,z:l.a.z+l.uz*t+l.ux*l.offset,heading:Math.atan2(l.ux,l.uz)}}
export function advance(c:Car,lanes:Lane[],dt:number,random=Math.random){
 c.t+=c.speed*dt;
 for(let i=0;i<32&&c.t>=lanes[c.lane].length;i++){const l=lanes[c.lane];if(!l.next.length){c.t=l.length;return false}c.t-=l.length;c.lane=l.next[Math.floor(random()*l.next.length)]}
 return true;
}

export type Signal={point:Point;axis:number;phase:number};
export function signalsFor(lanes:Lane[]){
 const nodes=new Map<string,{point:Point;neighbors:Set<string>}>();
 for(const l of lanes){for(const [a,b] of [[l.a,l.b],[l.b,l.a]]){const k=key(a);let n=nodes.get(k);if(!n){n={point:a,neighbors:new Set()};nodes.set(k,n)}n.neighbors.add(key(b))}}
 const signals=new Map<string,Signal>();
 for(const [k,n] of nodes)if(n.neighbors.size===4)signals.set(k,{point:n.point,axis:0,phase:Math.abs(Math.floor(n.point.x+n.point.z))%46});
 return signals;
}
export function signalState(s:Signal,axis:number,time:number){
 const t=((time+s.phase+axis*23)%46+46)%46;
 const color:'green'|'yellow'|'red'=t<20?'green':t<23?'yellow':'red';
 return {color,remaining:Math.ceil((t<20?20:t<23?23:46)-t)};
}
export function light(s:Signal,axis:number,time:number){return signalState(s,axis,time).color}
export function signalApproaches(lanes:Lane[],signals:Map<string,Signal>){
 const seen=new Set<string>();
 return lanes.flatMap(l=>{
 const s=signals.get(key(l.b));const k=key(l.a)+'>'+key(l.b);
 if(!s||seen.has(k))return [];seen.add(k);
 const setback=Math.max(5,l.width/2+1),side=l.width/2+0.8;
 return [{signal:s,axis:Math.abs(l.ux)>Math.abs(l.uz)?0:1,x:l.b.x-l.ux*setback-l.uz*side,z:l.b.z-l.uz*setback+l.ux*side,heading:Math.atan2(-l.ux,-l.uz)}];
 });
}
export function junctionRadius(l:Lane,lanes:Lane[]){return Math.max(5,l.width/2+1,...l.next.map(i=>lanes[i].width/2+1))}
export function stopPosition(c:Car,l:Lane,lanes:Lane[]){return Math.max(0,l.length-junctionRadius(l,lanes)-(c.kind===1?1.8:0.825)-0.5)}
export function insideJunction(l:Lane,t:number,lanes:Lane[],signals:Map<string,Signal>){return (signals.has(key(l.b))&&l.length-t<junctionRadius(l,lanes)+2)||(signals.has(key(l.a))&&t<Math.max(5,l.width/2+1)+2)}
export function desiredSpeed(c:Car,lanes:Lane[],others:Car[],player:Point,signals:Map<string,Signal>,time:number){
 const l=lanes[c.lane],q=pose(l,c.t);let gap=Infinity;
 const signal=signals.get(key(l.b));
 if(signal){
 const stop=stopPosition(c,l,lanes);
 if(c.t<=stop+1e-6){
 const occupied=others.some(other=>{if(!other||other===c)return false;const ol=lanes[other.lane],op=pose(ol,other.t);return Math.hypot(op.x-l.b.x,op.z-l.b.z)<junctionRadius(l,lanes)+1&&insideJunction(ol,other.t,lanes,signals)});
 if(light(signal,Math.abs(l.ux)>Math.abs(l.uz)?0:1,time)!=='green'||occupied)gap=Math.min(gap,Math.max(0,stop-c.t));
 }
 }
 const consider=(p:Point,clearance:number)=>{const dx=p.x-q.x,dz=p.z-q.z,along=dx*l.ux+dz*l.uz,side=Math.abs(-dx*l.uz+dz*l.ux);if(along>=0&&side<2)gap=Math.min(gap,Math.max(0,along-clearance))};
 consider(player,3.5);
 for(const other of others)if(other&&other!==c){const ol=lanes[other.lane];if(ol.ux*l.ux+ol.uz*l.uz>0.5)consider(pose(ol,other.t),other.kind===1?5:3);}
 return Math.min(c.cruise??8,Math.sqrt(2*4*gap),gap/0.8);
}
