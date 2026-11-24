import type {Road,Point} from './osm';
import {lanesFor,signalsFor,signalApproaches,crossingSetback,type Signal} from './traffic.ts';
export type WalkPath={a:Point;b:Point;length:number;ux:number;uz:number;crossing?:Signal;axis?:number};
export type Walker={path:number;t:number;direction:number;speed:number;phase:number};
export function walkPaths(roads:Road[]):WalkPath[]{
 const paths:WalkPath[]=[];
 const lanes=lanesFor(roads),signals=signalsFor(lanes);
 for(const approach of signalApproaches(lanes,signals)){const l=approach.lane,signal=approach.signal,setback=crossingSetback(l,lanes);const x=l.b.x-l.ux*setback,z=l.b.z-l.uz*setback,offset=l.width/2+0.7;paths.push({a:{x:x+l.uz*offset,z:z-l.ux*offset},b:{x:x-l.uz*offset,z:z+l.ux*offset},length:2*offset,ux:-l.uz,uz:l.ux,crossing:signal,axis:approach.axis});}
 
 for(const r of roads){if(r.width<8||r.kind==='pedestrian')continue;
 for(let i=1;i<r.points.length;i++){
 const a=r.points[i-1],b=r.points[i],length=Math.hypot(b.x-a.x,b.z-a.z);
 if(length<12)continue;
 const ux=(b.x-a.x)/length,uz=(b.z-a.z)/length,offset=r.width/2+0.7;
 for(const side of [-1,1]){
 const x=-uz*offset*side,z=ux*offset*side;
 const start={x:a.x+x+ux*4,z:a.z+z+uz*4};
 const nearby=lanes.filter(l=>Math.hypot(l.a.x-a.x,l.a.z-a.z)<length+l.length+l.width+5);const safe=(p:Point)=>!nearby.some(l=>{const dx=p.x-l.a.x,dz=p.z-l.a.z,t=dx*l.ux+dz*l.uz;return t>=0&&t<=l.length&&Math.abs(-dx*l.uz+dz*l.ux)<l.width/2+0.15});
 const n=Math.ceil(length-8),step=(length-8)/n;let from=-1;for(let j=0;j<=n;j++){const ok=j<n&&safe({x:start.x+ux*j*step,z:start.z+uz*j*step})&&safe({x:start.x+ux*(j+1)*step,z:start.z+uz*(j+1)*step});if(ok&&from<0)from=j;if(!ok&&from>=0){if((j-from)*step>=2)paths.push({a:{x:start.x+ux*from*step,z:start.z+uz*from*step},b:{x:start.x+ux*j*step,z:start.z+uz*j*step},length:(j-from)*step,ux,uz});from=-1}}

 }
 }}
 return paths;
}
export function walkerPose(w:Walker,p:WalkPath){return {x:p.a.x+p.ux*w.t,z:p.a.z+p.uz*w.t,heading:Math.atan2(p.ux*w.direction,p.uz*w.direction)}}
export function stepWalker(w:Walker,p:WalkPath,player:Point,dt:number){
 const q=walkerPose(w,p);
 if(Math.hypot(q.x-player.x,q.z-player.z)<3)return false;
 w.t+=w.direction*w.speed*dt;
 if(w.t>=p.length){w.t=p.length;w.direction=-1}
 else if(w.t<=0){w.t=0;w.direction=1}
 w.phase+=dt*w.speed*6;
 return true;
}
