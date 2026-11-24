import type {Road,Point} from './osm';
export type Lane={a:Point;b:Point;length:number;ux:number;uz:number;offset:number;next:number[]};
export type Car={lane:number;t:number;speed:number;kind:number};
const key=(p:Point)=>p.x.toFixed(3)+':'+p.z.toFixed(3);
export function lanesFor(roads:Road[]){
 const lanes:Lane[]=[],starts=new Map<string,number[]>();
 function add(a:Point,b:Point,width:number){const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<0.1)return;const id=lanes.length;lanes.push({a,b,length,ux:(b.x-a.x)/length,uz:(b.z-a.z)/length,offset:Math.min(width/4,2),next:[]});const k=key(a);starts.set(k,[...(starts.get(k)||[]),id])}
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
