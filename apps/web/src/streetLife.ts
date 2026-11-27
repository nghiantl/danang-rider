import type {OSMMap,Point} from './osm.ts';
import {pointGrid} from './performance.ts';
import {segmentDistance} from './landmarkPlacement.ts';
export const shopNames=['CÀ PHÊ','MÌ QUẢNG','NƯỚC MÍA','BÁNH MÌ','QUÁN ĂN'] as const;
export type Shop=Point&{angle:number;kind:number;covered:boolean};
export function shopOpen(kind:number,hour:number){return kind===4?hour>=17&&hour<23:kind===1?hour>=5&&hour<14:hour>=6&&hour<22}
export function streetShops(map:OSMMap):Shop[]{
 const houses=pointGrid(map.buildings,40);
 const nearbyBuildings=pointGrid(map.buildings,80);
 const segments=map.roads.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,w:r.width,bridge:r.bridge})));
 const out:Shop[]=[];
 for(const road of map.roads){if(road.bridge||road.width<10)continue;
 for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);if(l<30)continue;
 for(let t=15;t<l-15;t+=34)for(const side of [-1,1]){
 const ux=dx/l,uz=dz/l,offset=side*(road.width/2+3.3),x=a.x+ux*t-uz*offset,z=a.z+uz*t+ux*offset;
 if(!houses(x,z,22).some(h=>{const outward=((h.x-x)*(-uz)+(h.z-z)*ux)*side;return outward>0&&Math.abs((h.x-x)*ux+(h.z-z)*uz)<h.halfX+h.halfZ+2;}))continue;
 if((map.protectedAreas||[]).some(poly=>poly.length>=3&&x>=Math.min(...poly.map(p=>p.x))-2&&x<=Math.max(...poly.map(p=>p.x))+2&&z>=Math.min(...poly.map(p=>p.z))-2&&z<=Math.max(...poly.map(p=>p.z))+2))continue;
 if(segments.some(s=>segmentDistance({x,z},s.a,s.b)<s.w/2+2.5))continue;
 if(nearbyBuildings(x,z,100).some(h=>Math.abs(h.x-x)<h.halfX+1.1&&Math.abs(h.z-z)<h.halfZ+1.1))continue;
 if(out.some(p=>Math.hypot(p.x-x,p.z-z)<8))continue;
 if([map.spawn,map.pickup,map.delivery].some(p=>Math.hypot(p.x-x,p.z-z)<8))continue;
 const hash=Math.abs(Math.floor(x*97+z*173));out.push({x,z,angle:Math.atan2(-uz,ux),kind:hash%5,covered:hash%3!==0});
 if(out.length>=500)return out;
 }}}
 return out;
}
