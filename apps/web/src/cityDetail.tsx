import {settings} from './GraphicsSettings';
import React,{useMemo,useLayoutEffect,useRef,useEffect,useState} from 'react';
import * as THREE from 'three';
import {nearby,CHUNK_SIZE,type Chunk} from './world';
import {greenPlots} from './vegetationPlacement';
import {GroundGreenery} from './GroundGreenery';
import {Vegetation} from './Vegetation';
import {treePosition} from './environmentCollision';
import {RoadSurface,useRoadTextures,type Surface} from './roadVisuals';
import {facade} from './buildingVisuals';
import {useFrame} from '@react-three/fiber';
import {graphics,pointGrid} from './performance';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {environmentAt} from './environment';
import type {Point} from './osm';
type Box={x:number;y:number;z:number;w:number;h:number;d:number;a?:number;color:string};
function Batch({items,glass=false,detail=false,player}:{items:Box[];glass?:boolean;detail?:boolean;player?:React.RefObject<Point>}){
 const ref=useRef<THREE.InstancedMesh>(null);const material=useRef<THREE.MeshStandardMaterial>(null);const last=useRef(-1);useFrame(()=>{if((glass||detail)&&ref.current){const mesh=ref.current;const p=player?.current;const s=mesh.boundingSphere;const tier=settings.mode==='auto'?graphics.tier:settings.buildings;const range=tier===2?180:85;mesh.visible=tier>0&&(!p||!s||Math.hypot(s.center.x-p.x,s.center.z-p.z)<=s.radius+range);}if(!glass||!material.current)return;const n=Math.round(Math.max(0,1-environmentAt(new Date()).daylight)*10)/10*1.1;if(n!==last.current){last.current=n;material.current.emissiveIntensity=n}});
 useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const o=new THREE.Object3D();items.forEach((b,i)=>{o.position.set(b.x,b.y,b.z);o.rotation.set(0,b.a||0,0);o.scale.set(b.w,b.h,b.d);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,new THREE.Color(b.color))});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere()},[items]);
 return items.length?<instancedMesh ref={ref} receiveShadow args={[undefined,undefined,items.length]}><boxGeometry/><meshStandardMaterial ref={material} roughness={glass?.32:.85} metalness={glass?.15:0} emissive={glass?'#b99a60':'#000000'} emissiveIntensity={0}/></instancedMesh>:null;
}
function Houses({chunk}:{chunk:Chunk}){const geometry=useMemo(()=>{const parts:THREE.BufferGeometry[]=[];for(const {b,index} of chunk.buildings){const s=new THREE.Shape();const p=b.outline;if(p&&p.length>=3){s.moveTo(p[0].x-b.x,-(p[0].z-b.z));for(const v of p.slice(1))s.lineTo(v.x-b.x,-(v.z-b.z))}else{s.moveTo(-b.halfX,-b.halfZ);s.lineTo(b.halfX,-b.halfZ);s.lineTo(b.halfX,b.halfZ);s.lineTo(-b.halfX,b.halfZ)}s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:b.height,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(b.x,0,b.z);const color=new THREE.Color(['#e7d5b9','#d9e4df','#f0cdb6','#c6d4e4','#eee6d7','#b9c6b4'][index%6]);const arr=new Float32Array(g.attributes.position.count*3);for(let i=0;i<arr.length;i+=3){arr[i]=color.r;arr[i+1]=color.g;arr[i+2]=color.b}g.setAttribute('color',new THREE.BufferAttribute(arr,3));parts.push(g)}const merged=parts.length?mergeGeometries(parts):null;parts.forEach(g=>g.dispose());return merged},[chunk]);React.useEffect(()=>()=>geometry?.dispose(),[geometry]);return geometry?<mesh geometry={geometry} receiveShadow><meshStandardMaterial vertexColors roughness={.9}/></mesh>:null}
const ChunkDetail=React.memo(function ChunkDetail({chunk,context,textures,player}:{player:React.RefObject<Point>;chunk:Chunk;context:Chunk[];textures:ReturnType<typeof useRoadTextures>}){
 const items=useMemo(()=>{
 const trees:Point[]=[];const boxes:Box[]=[];const facadeBoxes:Box[]=[];const windows:Box[]=[];const asphalt:Surface[]=[],paving:Surface[]=[];const segments=context.flatMap(c=>c.segments);const buildings=context.flatMap(c=>c.buildings);
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
 const tree=treePosition(p,context);if(tree)trees.push(tree);
 }
 }
 const roadGrid=pointGrid(segments,100);
 for(const {b,index} of chunk.buildings){const f=facade(b,index,roadGrid(b.x,b.z,126).filter(p=>Math.hypot(p.x-b.x,p.z-b.z)<100+p.length/2));facadeBoxes.push(...f.boxes);windows.push(...f.windows)}
 const split=(items:Box[])=>{const cells=new Map<string,Box[]>();for(const b of items){const key=Math.floor(b.x/60)+':'+Math.floor(b.z/60);const list=cells.get(key)??[];list.push(b);cells.set(key,list)}return [...cells.entries()]};
 return {boxes,facadeBoxes:split(facadeBoxes),windows:split(windows),asphalt,paving,trees,plots:greenPlots(chunk,context)};
 },[chunk,context]);
 return <group><Houses chunk={chunk}/><Vegetation points={items.trees} player={player}/><GroundGreenery points={items.plots} player={player}/><RoadSurface items={items.asphalt} texture={textures.asphalt}/><RoadSurface items={items.paving} texture={textures.paving} tile={1.6}/><Batch items={items.boxes}/>{items.facadeBoxes.map(([key,boxes])=><Batch key={'f'+key} items={boxes} detail player={player}/>)}{items.windows.map(([key,boxes])=><Batch key={'w'+key} items={boxes} glass player={player}/>)}</group>;
});

// Stable context and keys keep overlapping chunks mounted across cell transitions.
export const CityDetail=React.memo(function CityDetail({world,chunks,player}:{player:React.RefObject<Point>;world:Map<string,Chunk>;chunks:Chunk[]}){
 const textures=useRoadTextures();
 const index=useMemo(()=>{const result=new Map<Chunk,{id:string;context:Chunk[]}>();for(const [id,chunk] of world){const [x,z]=id.split(':').map(Number);result.set(chunk,{id,context:nearby(world,x*CHUNK_SIZE,z*CHUNK_SIZE)});}return result},[world]);
 const ordered=useMemo(()=>{const p=player.current;const distance=(c:Chunk)=>{const id=index.get(c)?.id;if(!id||!p)return 0;const [x,z]=id.split(':').map(Number);return x===Math.floor(p.x/CHUNK_SIZE)&&z===Math.floor(p.z/CHUNK_SIZE)?-1:Math.hypot((x+.5)*CHUNK_SIZE-p.x,(z+.5)*CHUNK_SIZE-p.z)};return [...chunks].sort((a,b)=>distance(a)-distance(b))},[chunks,index,player]);
 const [loaded,setLoaded]=useState<Chunk[]>(()=>ordered.slice(0,1));
 useEffect(()=>{let cancelled=false;let timer=0;const start=performance.now();let pending=ordered.slice(1);const step=()=>{if(cancelled)return;const next=pending.shift();if(!next){console.info('[Rider startup] nearby chunks scheduled',Math.round(performance.now()-start));return}setLoaded(prev=>[...new Set([ordered[0],...prev.filter(c=>ordered.includes(c)),next].filter((c):c is Chunk=>!!c))]);timer=window.setTimeout(step,120)};timer=window.setTimeout(step,120);return()=>{cancelled=true;window.clearTimeout(timer)}},[ordered]);
 const visible=ordered.filter(c=>loaded.includes(c)||c===ordered[0]);
 return <group>{visible.map(chunk=>{const entry=index.get(chunk);return entry?<ChunkDetail key={entry.id} chunk={chunk} context={entry.context} textures={textures} player={player}/>:null})}</group>;
});
