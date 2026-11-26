import type {OSMMap,Point,Road} from './osm';
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
function projection(p:Point,a:Point,b:Point){const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);const t=l?Math.max(0,Math.min(l,((p.x-a.x)*dx+(p.z-a.z)*dz)/l)):0;return {x:a.x+(l?dx*t/l:0),z:a.z+(l?dz*t/l:0),l,t,dx,dz}}
const fallback:Road[]=[...[-180,-20,140].map(x=>({points:[{x,z:-210},{x,z:210}],width:22,name:''})),...[-180,-20,140].map(z=>({points:[{x:-210,z},{x:210,z}],width:22,name:''}))];
export function sidewalkTarget(map:OSMMap|null,anchor:Point):Point{
 const roads=map?.roads??fallback;
 const segments=roads.flatMap(r=>r.points.slice(1).map((b,i)=>({r,a:r.points[i],b})));
 const nearby=segments.filter(s=>!s.r.bridge&&s.r.kind!=='pedestrian'&&s.r.width>=8&&distance(anchor,projection(anchor,s.a,s.b))<15).sort((a,b)=>distance(anchor,projection(anchor,a.a,a.b))-distance(anchor,projection(anchor,b.a,b.b)));
 for(const s of nearby){const q=projection(anchor,s.a,s.b);if(q.l<4)continue;for(const shift of [0,3,-3,6,-6,9,-9,12,-12]){const t=Math.max(1,Math.min(q.l-1,q.t+shift));for(const side of [1,-1]){const offset=s.r.width/2+.7,p={x:s.a.x+q.dx*t/q.l-q.dz/q.l*offset*side,z:s.a.z+q.dz*t/q.l+q.dx/q.l*offset*side};if(map&&(Math.abs(p.x)>map.extent-1||Math.abs(p.z)>map.extent-1||map.buildings.some(b=>Math.abs(p.x-b.x)<b.halfX+.4&&Math.abs(p.z-b.z)<b.halfZ+.4)))continue;if(segments.some(v=>v!==s&&distance(p,projection(p,v.a,v.b))<v.r.width/2+.35))continue;return p}}}
 return anchor;
}
