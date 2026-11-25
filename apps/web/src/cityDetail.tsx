import React,{useMemo,useLayoutEffect,useRef} from 'react';
import * as THREE from 'three';
import {nearby,CHUNK_SIZE,type Chunk} from './world';
import {treePosition} from './environmentCollision';
import {RoadSurface,useRoadTextures,type Surface} from './roadVisuals';
import type {Footprint} from './osm';
type Box={x:number;y:number;z:number;w:number;h:number;d:number;a?:number;color:string};
function Batch({items}:{items:Box[]}){
 const ref=useRef<THREE.InstancedMesh>(null);
 useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const o=new THREE.Object3D();items.forEach((b,i)=>{o.position.set(b.x,b.y,b.z);o.rotation.set(0,b.a||0,0);o.scale.set(b.w,b.h,b.d);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,new THREE.Color(b.color))});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere()},[items]);
 return items.length?<instancedMesh ref={ref} args={[undefined,undefined,items.length]}><boxGeometry/><meshStandardMaterial roughness={0.85}/></instancedMesh>:null;
}
function House({b,index}:{b:Footprint;index:number}){
 const shape=useMemo(()=>{const s=new THREE.Shape();const p=b.outline;if(p&&p.length>=3){s.moveTo(p[0].x-b.x,-(p[0].z-b.z));p.slice(1).forEach(v=>s.lineTo(v.x-b.x,-(v.z-b.z)))}else{s.moveTo(-b.halfX,-b.halfZ);s.lineTo(b.halfX,-b.halfZ);s.lineTo(b.halfX,b.halfZ);s.lineTo(-b.halfX,b.halfZ)}s.closePath();return s},[b]);
 const options=useMemo(()=>({depth:b.height,bevelEnabled:false}),[b.height]);
 return <mesh position={[b.x,0,b.z]} rotation={[-Math.PI/2,0,0]}><extrudeGeometry args={[shape,options]}/><meshStandardMaterial color={['#e7d5b9','#d9e4df','#f0cdb6','#c6d4e4','#eee6d7','#b9c6b4'][index%6]} roughness={0.9}/></mesh>;
}
const ChunkDetail=React.memo(function ChunkDetail({chunk,context,textures}:{chunk:Chunk;context:Chunk[];textures:ReturnType<typeof useRoadTextures>}){
 const items=useMemo(()=>{
 const boxes:Box[]=[];const asphalt:Surface[]=[],paving:Surface[]=[];const segments=context.flatMap(c=>c.segments);const buildings=context.flatMap(c=>c.buildings);
 for(const p of chunk.segments){
 const a=-p.angle, ux=Math.cos(p.angle),uz=Math.sin(p.angle),nx=-uz,nz=ux;
 const add=(along:number,side:number,y:number,w:number,h:number,d:number,color:string)=>boxes.push({x:p.x+ux*along+nx*side,z:p.z+uz*along+nz*side,y,w,h,d,a,color});
 asphalt.push({x:p.x,z:p.z,y:.07,w:p.length+.025,d:p.width,a});
 const candidates=segments.filter(q=>q!==p&&Math.hypot(q.x-p.x,q.z-p.z)<(q.length+p.length)/2+q.width+p.width+10);
 if(p.width>=8){for(const side of [-1,1]){for(const [offset,y,h,d,color] of [[p.width/2+0.7,0.055,0.11,1.4,'#b7b4a9'],[p.width/2-0.3,0.079,0.012,0.12,'#e6e2d5']] as const){

 const n=Math.ceil(p.length),step=p.length/n;let start=-1;
 for(let i=0;i<=n;i++){const t=-p.length/2+(i+0.5)*step,x=p.x+ux*t+nx*side*offset,z=p.z+uz*t+nz*side*offset;
 const blocked=i===n||candidates.some(q=>{const dx=x-q.x,dz=z-q.z,c=Math.cos(q.angle),s=Math.sin(q.angle),pad=Math.hypot(step,d)/2;return Math.abs(dx*c+dz*s)<q.length/2+pad&&Math.abs(-dx*s+dz*c)<q.width/2+pad});
 if(!blocked&&start<0)start=i;if(blocked&&start>=0){const along=-p.length/2+(start+i)*step/2;add(along,side*offset,y,(i-start)*step,h,d,color);if(h>.05){paving.push({x:p.x+ux*along+nx*side*offset,z:p.z+uz*along+nz*side*offset,y:y+h/2+.002,w:(i-start)*step,d,a});add(along,side*(p.width/2+.06),.065,(i-start)*step,.13,.12,'#aaa9a2');}start=-1}
 }
 }}
 for(let t=-p.length/2+3;t<p.length/2-2;t+=8){const x=p.x+ux*t,z=p.z+uz*t;if(!candidates.some(q=>{const dx=x-q.x,dz=z-q.z,c=Math.cos(q.angle),s=Math.sin(q.angle);return Math.abs(dx*c+dz*s)<q.length/2+1.5&&Math.abs(-dx*s+dz*c)<q.width/2+.2&&Math.abs(Math.sin(q.angle-p.angle))>.25}))add(t,0,.085,Math.min(3,p.length/2-t),.012,.15,'#e8d69a');}if(p.length>=24){for(const side of [-1,1]){const offset=side*(p.width/2-.65),x=p.x+nx*offset,z=p.z+nz*offset;if(!candidates.some(q=>{const dx=x-q.x,dz=z-q.z,c=Math.cos(q.angle),s=Math.sin(q.angle);return Math.abs(dx*c+dz*s)<q.length/2+1&&Math.abs(-dx*s+dz*c)<q.width/2+1})){add(0,offset,.074,.65,.008,.42,'#34383a');for(let j=-2;j<=2;j++)add(j*.11,offset,.08,.035,.006,.36,'#171c20')}}}
 if(treePosition(p,context)){add(5,p.width/2+2,1.5,0.35,3,0.35,'#775d43');add(5,p.width/2+2,4,2.6,2.8,2.6,'#56865a')}
 }
 }
 for(const {b,index} of chunk.buildings){const pts=b.outline;if(!pts||pts.length<3)continue;for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length],dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz);if(len<3)continue;const a=-Math.atan2(dz,dx);for(let y=2.2;y<b.height-0.6;y+=3.3){boxes.push({x:(p.x+q.x)/2,z:(p.z+q.z)/2,y,w:len*0.65,h:1.25,d:0.12,a,color:'#557789'})}if(index%4===0)boxes.push({x:(p.x+q.x)/2,z:(p.z+q.z)/2,y:2.9,w:len*0.8,h:0.25,d:1.2,a,color:['#b65b48','#458779','#c79a45'][index%3]})}}
 return {boxes,asphalt,paving};
 },[chunk,context]);
 return <group>{chunk.buildings.map(({b,index})=><House key={index} b={b} index={index}/>)}<RoadSurface items={items.asphalt} texture={textures.asphalt}/><RoadSurface items={items.paving} texture={textures.paving} tile={1.6}/><Batch items={items.boxes}/></group>;
});

// Stable context and keys keep overlapping chunks mounted across cell transitions.
export const CityDetail=React.memo(function CityDetail({world,chunks}:{world:Map<string,Chunk>;chunks:Chunk[]}){
 const textures=useRoadTextures();
 const index=useMemo(()=>{const result=new Map<Chunk,{id:string;context:Chunk[]}>();for(const [id,chunk] of world){const [x,z]=id.split(':').map(Number);result.set(chunk,{id,context:nearby(world,x*CHUNK_SIZE,z*CHUNK_SIZE)});}return result},[world]);
 return <group>{chunks.map(chunk=>{const entry=index.get(chunk);return entry?<ChunkDetail key={entry.id} chunk={chunk} context={entry.context} textures={textures}/>:null})}</group>;
});
