import type {OSMMap,Point} from './osm.ts';
import {lanesFor,signalsFor} from './traffic.ts';
export type Checkpoint={junction:Point;officer:Point;car:Point;heading:number};
export function checkpoints(map:OSMMap,random=Math.random):Checkpoint[]{
 const lanes=lanesFor(map.roads),signals=signalsFor(lanes);
 const segments=map.roads.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,width:r.width})));
 const clear=(p:Point,r:number)=>!map.buildings.some(b=>Math.abs(p.x-b.x)<b.halfX+r&&Math.abs(p.z-b.z)<b.halfZ+r)&&!segments.some(({a,b,width})=>{const dx=b.x-a.x,dz=b.z-a.z,d=dx*dx+dz*dz;if(!d)return false;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/d));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)<width/2+r});
 const candidates=[...signals.values()];for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}
 const target=3+Math.floor(random()*3),out:Checkpoint[]=[];
 for(const s of candidates){
 if(out.length>=target)break;
 if(out.some(c=>Math.hypot(c.junction.x-s.point.x,c.junction.z-s.point.z)<65))continue;
 if(map.roads.some(r=>r.bridge&&r.points.some(p=>Math.hypot(p.x-s.point.x,p.z-s.point.z)<45)))continue;
 let found:Checkpoint|undefined;
 for(const l of lanes){if(Math.hypot(l.b.x-s.point.x,l.b.z-s.point.z)>0.002||l.length<22)continue;
 for(const side of [-1,1]){for(const offset of [5,7,9]){
 const at=(t:number,d:number)=>({x:l.b.x-l.ux*t-l.uz*d*side,z:l.b.z-l.uz*t+l.ux*d*side});
 const officer=at(10,l.width/2+offset),car=at(17,l.width/2+offset);
 if(clear(officer,1.5)&&clear(car,2.7)&&Math.hypot(car.x-map.spawn.x,car.z-map.spawn.z)>10&&Math.hypot(officer.x-map.spawn.x,officer.z-map.spawn.z)>10){found={junction:s.point,officer,car,heading:Math.atan2(l.ux,l.uz)};break}
 }if(found)break}if(found)break}
 if(found)out.push(found);
 }return out;
}
