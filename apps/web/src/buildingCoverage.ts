import type {OSMMap,Footprint} from './osm.ts';
import {clearRoadBuildings} from './buildingGeometry.ts';
import {riverGrid} from './riverGeometry.ts';
import {shoreX,hasCoast} from './coast.ts';
import {landmarkSites,segmentDistance} from './landmarkPlacement.ts';
import {riverfrontSites} from './riverfrontSites.ts';
import {project} from './geoProjection.ts';
// Conservative infill only in established residential blocks; never infer an entire empty district.
export function fillBuildingGaps(map:OSMMap):OSMMap {
 const originals=map.buildings.filter(b=>b.kind!=='procedural-residential');
 const grid=new Map<string,Footprint[]>(),size=40;
 const key=(x:number,z:number)=>x+':'+z;
 function insert(b:Footprint){for(let x=Math.floor((b.x-b.halfX)/size);x<=Math.floor((b.x+b.halfX)/size);x++)for(let z=Math.floor((b.z-b.halfZ)/size);z<=Math.floor((b.z+b.halfZ)/size);z++){const k=key(x,z),a=grid.get(k)||[];a.push(b);grid.set(k,a)}}
 function near(x:number,z:number,r:number){const a=new Set<Footprint>();for(let i=Math.floor((x-r)/size);i<=Math.floor((x+r)/size);i++)for(let j=Math.floor((z-r)/size);j<=Math.floor((z+r)/size);j++)for(const b of grid.get(key(i,j))||[])a.add(b);return [...a]}
 originals.forEach(insert);
 const river=riverGrid(map),wet=river.blocked,coast=hasCoast(map),candidates:Footprint[]=[];
 const banks=new Map<number,{min:number;max:number}>();for(const p of river.cells){const row=banks.get(p.z);if(row){row.min=Math.min(row.min,p.x);row.max=Math.max(row.max,p.x)}else banks.set(p.z,{min:p.x,max:p.x})}
 const sites=[...riverfrontSites.map(s=>({...s.point,r:65})),...landmarkSites(map).map(({b})=>({x:b.x,z:b.z,r:Math.hypot(b.halfX,b.halfZ)+20})),{...project(16.0681,108.2242),r:65},{...project(16.0654,108.2234),r:45}];
 const areas=(map.protectedAreas||[]).filter(p=>p.length>=3).map(p=>({minX:Math.min(...p.map(q=>q.x)),maxX:Math.max(...p.map(q=>q.x)),minZ:Math.min(...p.map(q=>q.z)),maxZ:Math.max(...p.map(q=>q.z))}));
 const bridges=map.roads.filter(r=>r.bridge).flatMap(r=>r.points.slice(1).map((p,i)=>({a:r.points[i],b:p,w:r.width})));
 for(const road of map.roads){if(road.bridge||road.kind!=='residential')continue;
 for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<24)continue;
 const ux=dx/len,uz=dz/len;
 for(let t=12;t<len-10;t+=13)for(const side of [-1,1]){
 const offset=side*(road.width/2+9),x=a.x+ux*t-uz*offset,z=a.z+uz*t+ux*offset;
 const local=near(x,z,65);if(local.filter(b=>b.kind!=='procedural-residential'&&Math.hypot(b.x-x,b.z-z)<60).length<3)continue;
 const hash=Math.abs(Math.floor(x*173+z*97)),w=3.2+hash%3*.4,d=4.5+hash%2;
 const outline=[[-w,-d],[w,-d],[w,d],[-w,d]].map(([u,v])=>({x:x+ux*u-uz*v,z:z+uz*u+ux*v}));
 const halfX=Math.max(...outline.map(p=>Math.abs(p.x-x))),halfZ=Math.max(...outline.map(p=>Math.abs(p.z-z)));
 if(local.some(b=>Math.abs(b.x-x)<b.halfX+halfX+1.5&&Math.abs(b.z-z)<b.halfZ+halfZ+1.5))continue;
 if([map.spawn,map.pickup,map.delivery].some(p=>Math.hypot(p.x-x,p.z-z)<15))continue;
 let blocked=false;for(let px=x-halfX-12;px<=x+halfX+12;px+=3)for(let pz=z-halfZ-12;pz<=z+halfZ+12;pz+=3)if(wet({x:px,z:pz})||(coast&&px>shoreX(pz)-40))blocked=true;
 const radius=Math.hypot(halfX,halfZ);
 if(sites.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+radius)||areas.some(p=>x+halfX+3>=p.minX&&x-halfX-3<=p.maxX&&z+halfZ+3>=p.minZ&&z-halfZ-3<=p.maxZ)||bridges.some(p=>segmentDistance({x,z},p.a,p.b)<p.w/2+radius+12))blocked=true;
 for(let row=Math.floor((z-halfZ-4)/4)*4+2;row<=z+halfZ+4;row+=4){const bank=banks.get(row);if(bank&&x+halfX>=bank.min-165&&x-halfX<=bank.max+165)blocked=true;}
 if(blocked)continue;
 const house={x,z,halfX,halfZ,outline,height:3.3*(1+hash%5),kind:'procedural-residential'};
 candidates.push(house);insert(house);
 if(candidates.length>=1500)break;
 }if(candidates.length>=1500)break;
 }if(candidates.length>=1500)break;
 }
 const accepted=clearRoadBuildings(candidates,map.roads).filter(b=>candidates.includes(b));
 console.info('[Rider building coverage]',{osm:originals.length,generated:accepted.length});
 return {...map,buildings:[...originals,...accepted]};
}
