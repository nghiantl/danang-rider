import type {Point,Road,Footprint} from './osm.ts';
// Conservative rectangular road corridors, matching the rendered road segments.
type Corridor={a:Point;ux:number;uz:number;length:number;half:number};
const CELL=64;
const key=(x:number,z:number)=>x+':'+z;
function cells(minX:number,maxX:number,minZ:number,maxZ:number,visit:(k:string)=>void){
 for(let x=Math.floor(minX/CELL);x<=Math.floor(maxX/CELL);x++)for(let z=Math.floor(minZ/CELL);z<=Math.floor(maxZ/CELL);z++)visit(key(x,z));
}
function intersects(poly:Point[],r:Corridor){
 const p=poly.map(v=>{const x=v.x-r.a.x,z=v.z-r.a.z;return {x:x*r.ux+z*r.uz,z:-x*r.uz+z*r.ux}});
 const lo=-0.25,hi=r.length+0.25,h=r.half;
 // Clip each polygon edge against the rectangle; also detect a rectangle inside the polygon.
 for(let i=0;i<p.length;i++){
 const a=p[i],b=p[(i+1)%p.length],dx=b.x-a.x,dz=b.z-a.z;let t0=0,t1=1;
 for(const [d,q] of [[-dx,a.x-lo],[dx,hi-a.x],[-dz,a.z+h],[dz,h-a.z]]){
 if(d===0){if(q<0){t0=2;break}}else if(d<0)t0=Math.max(t0,q/d);else t1=Math.min(t1,q/d);
 }
 if(t0<=t1)return true;
 }
 let inside=false;const x=r.length/2;
 for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a.z>0)!==(b.z>0)&&x<(b.x-a.x)*(-a.z)/(b.z-a.z)+a.x)inside=!inside}
 return inside;
}
export function clearRoadBuildings(buildings:Footprint[],roads:Road[]):Footprint[]{
 const grid=new Map<string,Corridor[]>();
 for(const road of roads)for(let i=1;i<road.points.length;i++){
 const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<0.01)continue;
 const half=road.width/2+(road.width>=8?1.4:0)+0.8,r={a,ux:dx/length,uz:dz/length,length,half};
 cells(Math.min(a.x,b.x)-half-1,Math.max(a.x,b.x)+half+1,Math.min(a.z,b.z)-half-1,Math.max(a.z,b.z)+half+1,k=>{const list=grid.get(k);if(list)list.push(r);else grid.set(k,[r])});
 }
 return buildings.flatMap(b=>{
 const poly=b.outline??[{x:b.x-b.halfX,z:b.z-b.halfZ},{x:b.x+b.halfX,z:b.z-b.halfZ},{x:b.x+b.halfX,z:b.z+b.halfZ},{x:b.x-b.halfX,z:b.z+b.halfZ}];
 const candidates=new Set<Corridor>();cells(b.x-b.halfX,b.x+b.halfX,b.z-b.halfZ,b.z+b.halfZ,k=>grid.get(k)?.forEach(r=>candidates.add(r)));
 const safe=(p:Point[])=>![...candidates].some(r=>intersects(p,r));
 if(safe(poly))return [b];
 // Keep the largest tested uniform scale around the original center. Never publish an unsafe footprint.
 for(let scale=0.95;scale>=0.35-1e-8;scale-=0.05){
 if(Math.min(b.halfX,b.halfZ)*scale<0.75)break;
 const outline=poly.map(p=>({x:b.x+(p.x-b.x)*scale,z:b.z+(p.z-b.z)*scale}));
 if(safe(outline))return [{...b,halfX:b.halfX*scale,halfZ:b.halfZ*scale,outline}];
 }
 return [];
 });
}
