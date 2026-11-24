import type { OSMMap, Footprint } from './osm';
export const CHUNK_SIZE=500;
export const cell=(v:number)=>Math.floor(v/CHUNK_SIZE);
export const key=(x:number,z:number)=>x+':'+z;
export type Segment={x:number;z:number;length:number;width:number;angle:number};
export type Chunk={buildings:{b:Footprint;index:number}[];segments:Segment[];obstacles:Footprint[]};
export function buildWorld(map:OSMMap){
 const chunks=new Map<string,Chunk>();
 const get=(x:number,z:number)=>{const k=key(x,z);let c=chunks.get(k);if(!c){c={buildings:[],segments:[],obstacles:[]};chunks.set(k,c)}return c};
 map.buildings.forEach((b,index)=>{
  get(cell(b.x),cell(b.z)).buildings.push({b,index});
  for(let x=cell(b.x-b.halfX);x<=cell(b.x+b.halfX);x++)for(let z=cell(b.z-b.halfZ);z<=cell(b.z+b.halfZ);z++)get(x,z).obstacles.push(b);
 });
 for(const road of map.roads)for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
  if(len<0.01)continue;
  const n=Math.ceil(len/50);
  for(let j=0;j<n;j++){const t=(j+0.5)/n,x=a.x+dx*t,z=a.z+dz*t;get(cell(x),cell(z)).segments.push({x,z,length:len/n,width:road.width,angle:Math.atan2(dz,dx)})}
 }
 return chunks;
}
export function nearby(chunks:Map<string,Chunk>,x:number,z:number,radius=1){
 const result:Chunk[]=[];
 for(let i=cell(x)-radius;i<=cell(x)+radius;i++)for(let j=cell(z)-radius;j<=cell(z)+radius;j++){const c=chunks.get(key(i,j));if(c)result.push(c)}
 return result;
}
export function obstaclesNear(chunks:Map<string,Chunk>,x:number,z:number){
 return [...new Set(nearby(chunks,x,z).flatMap(c=>c.obstacles))];
}
