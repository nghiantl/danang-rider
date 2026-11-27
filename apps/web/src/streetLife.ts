import type {OSMMap,Point} from './osm.ts';
import {pointGrid} from './performance.ts';
import {segmentDistance} from './landmarkPlacement.ts';
export const shopNames=['CÀ PHÊ','MÌ QUẢNG','NƯỚC MÍA','BÁNH MÌ','QUÁN ĂN'] as const;
export type Shop=Point&{angle:number;kind:number;covered:boolean};
export function shopOpen(kind:number,hour:number){return kind===4?hour>=17&&hour<23:kind===1?hour>=5&&hour<14:hour>=6&&hour<22}
export function streetShops(map:OSMMap):Shop[]{
 const houses=pointGrid(map.buildings.filter(b=>b.kind==='procedural-residential'),40);
 const segments=map.roads.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,w:r.width,bridge:r.bridge})));
 const out:Shop[]=[];
 for(const road of map.roads){if(road.bridge||road.width<10)continue;
 for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);if(l<30)continue;
 for(let t=15;t<l-15;t+=34)for(const side of [-1,1]){
 const ux=dx/l,uz=dz/l,offset=side*(road.width/2+3.3),x=a.x+ux*t-uz*offset,z=a.z+uz*t+ux*offset;
 if(!houses(x,z,12).some(h=>Math.abs(h.x-x)>h.halfX+.8||Math.abs(h.z-z)>h.halfZ+.8))continue;
 if(segments.some(s=>segmentDistance({x,z},s.a,s.b)<s.w/2+2.5))continue;
 if(map.buildings.some(h=>Math.abs(h.x-x)<h.halfX+1.1&&Math.abs(h.z-z)<h.halfZ+1.1))continue;
 if(out.some(p=>Math.hypot(p.x-x,p.z-z)<8))continue;
 const hash=Math.abs(Math.floor(x*97+z*173));out.push({x,z,angle:Math.atan2(-uz,ux),kind:hash%5,covered:hash%3!==0});
 if(out.length>=500)return out;
 }}}
 return out;
}
