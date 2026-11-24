import {project,type OSMMap,type Point} from './osm.ts';
const west=[[16.0516,108.2247],[16.059,108.2248],[16.0678,108.2249],[16.0732,108.2244]],east=[[16.0732,108.2288],[16.0678,108.2291],[16.059,108.2294],[16.0516,108.2298]];
const polygon=[...west,...east].map(([lat,lon])=>project(lat,lon));
function inside(p:Point){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)hit=!hit}return hit}
export function waterGrid(map:OSMMap){
 const size=4,wet=new Set<string>(),cells:Point[]=[];
 if(!map.roads.some(r=>r.bridge))return {cells,blocked:(_p:Point)=>false};
 const land=new Set<string>(),key=(x:number,z:number)=>x+':'+z;
 const mark=(x:number,z:number,r:number)=>{for(let i=Math.floor((x-r)/size);i<=Math.floor((x+r)/size);i++)for(let j=Math.floor((z-r)/size);j<=Math.floor((z+r)/size);j++)land.add(key(i,j))};
 for(const b of map.buildings)for(let i=Math.floor((b.x-b.halfX-3)/size);i<=Math.floor((b.x+b.halfX+3)/size);i++)for(let j=Math.floor((b.z-b.halfZ-3)/size);j<=Math.floor((b.z+b.halfZ+3)/size);j++)land.add(key(i,j));
 for(const r of map.roads)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2));for(let j=0;j<=n;j++)mark(a.x+(b.x-a.x)*j/n,a.z+(b.z-a.z)*j/n,r.width/2+(r.bridge?0:3))}
 for(let i=Math.floor(Math.min(...polygon.map(p=>p.x))/size);i<=Math.ceil(Math.max(...polygon.map(p=>p.x))/size);i++)for(let j=Math.floor(Math.min(...polygon.map(p=>p.z))/size);j<=Math.ceil(Math.max(...polygon.map(p=>p.z))/size);j++){const p={x:(i+.5)*size,z:(j+.5)*size};if(inside(p)&&!land.has(key(i,j))){wet.add(key(i,j));cells.push(p)}}
 // Keep only the main river corridor on each cross-section, not isolated inland pockets.
 const rows=new Map<number,Point[]>();
 for(const p of cells){const j=Math.floor(p.z/size);const row=rows.get(j)||[];row.push(p);rows.set(j,row)}
 const retained:Point[]=[];wet.clear();
 for(const row of rows.values()){
  row.sort((a,b)=>a.x-b.x);const runs:Point[][]=[];
  for(const p of row){const last=runs[runs.length-1];if(last&&p.x-last[last.length-1].x<=size+0.01)last.push(p);else runs.push([p])}
  const main=runs.sort((a,b)=>b.length-a.length)[0];
  if(!main||main.length<8)continue;
  for(const p of main){retained.push(p);wet.add(key(Math.floor(p.x/size),Math.floor(p.z/size)))}
 }
 return {cells:retained,blocked:(p:Point)=>wet.has(key(Math.floor(p.x/size),Math.floor(p.z/size)))};
}
const cache=new WeakMap<OSMMap,ReturnType<typeof waterGrid>>();
export function riverGrid(map:OSMMap){let g=cache.get(map);if(!g){g=waterGrid(map);cache.set(map,g)}return g}
