import {useMemo,useLayoutEffect,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {OSMMap,Point} from './osm';
import {riverGrid} from './riverGeometry';
import {riverfrontSites,loveBridgeAnchor} from './riverfrontSites';
type Part={x:number;z:number;y:number;w:number;h:number;d:number};
function distance(p:Point,a:Point,b:Point){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)}
function Batch({parts,color,tiles=false}:{parts:Part[];color:string;tiles?:boolean}){const ref=useRef<THREE.InstancedMesh>(null);const texture=useMemo(()=>{if(!tiles)return null;const canvas=document.createElement('canvas');canvas.width=64;canvas.height=256;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#693c35';ctx.fillRect(0,0,64,256);for(let j=0;j<8;j++)for(let i=0;i<2;i++){ctx.fillStyle=['#ad5545','#bc6552','#9f493c'][(i+j)%3];ctx.fillRect(i*32+1,j*32+1,30,30)}const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex},[tiles]);useEffect(()=>()=>texture?.dispose(),[texture]);useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const o=new THREE.Object3D();parts.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.scale.set(p.w,p.h,p.d);o.updateMatrix();mesh.setMatrixAt(i,o.matrix)});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()},[parts]);if(!parts.length)return null;return <instancedMesh ref={ref} args={[undefined,undefined,parts.length]}><boxGeometry/><meshStandardMaterial color={color} map={texture} roughness={.85}/></instancedMesh>}
export function RiverPromenade({map}:{map:OSMMap}){
 const {paving,rails,benches}=useMemo(()=>{const cells=riverGrid(map).cells,rows=new Map<number,{west:number;east:number}>();for(const p of cells){const row=rows.get(p.z);if(row){row.west=Math.min(row.west,p.x-2);row.east=Math.max(row.east,p.x+2)}else rows.set(p.z,{west:p.x-2,east:p.x+2})}
 const paving:Part[]=[],rails:Part[]=[],benches:{x:number;z:number;side:number}[]=[];const love=loveBridgeAnchor(cells,riverfrontSites[0].point);
 const roads=map.roads.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,w:r.width,bridge:r.bridge})));
 for(const [z,row] of rows)for(const side of [-1,1]){const edge=side===1?row.east:row.west;
 const x=edge+side*.35,p={x,z};
 // Rail clearance is independent of the wider pavement clearance.
 const clear=(q:Point,pad:number)=>!roads.some(r=>distance(q,r.a,r.b)<r.w/2+pad)&&!map.buildings.some(b=>Math.abs(q.x-b.x)<b.halfX+pad&&Math.abs(q.z-b.z)<b.halfZ+pad);
 if(!clear(p,.35))continue;
 for(let i=0;i<160;i++){const q={x:edge+side*(i+.5),z};if(!clear(q,.55))break;paving.push({x:q.x,z,y:.065,w:1,h:.13,d:4});}
 if(side===1&&love&&Math.abs(z-love.z)<5)continue;
 rails.push({x,z,y:.8,w:.16,h:1.6,d:.16},{x,z,y:1.4,w:.16,h:.16,d:4},{x,z,y:.75,w:.12,h:.12,d:4});
 }const tiles=new Set(paving.map(p=>p.x+':'+p.z));for(const [z,row] of [...rows].sort((a,b)=>a[0]-b[0]))for(const side of [-1,1]){const x=(side===1?row.east:row.west)+side*2.5;if(benches.filter(b=>b.side===side).length>=8||benches.some(b=>b.side===side&&Math.abs(b.z-z)<65))continue;if(love&&Math.abs(z-love.z)<12)continue;if([-8,-4,0,4,8].every(d=>[0,side,side*2].every(dx=>tiles.has((x+dx)+':'+(z+d)))))benches.push({x,z,side});}return {paving,rails,benches}},[map]);
 return <group><Batch parts={paving} color="#ffffff" tiles/><Batch parts={rails} color="#b8c2c8"/>{benches.map((b,i)=><BenchScene key={i} {...b} index={i}/>)}</group>
}

function BenchScene({x,z,side,index}:{x:number;z:number;side:number;index:number}){
 const person=useRef<THREE.Group>(null),legs=useRef<THREE.Group>(null),walker=useRef<THREE.Group>(null),left=useRef<THREE.Group>(null),right=useRef<THREE.Group>(null),root=useRef<THREE.Group>(null);
 useFrame(({clock,camera})=>{if(!root.current)return;const near=Math.hypot(camera.position.x-x,camera.position.z-z)<110;root.current.visible=near;if(!near)return;const t=(clock.elapsedTime+index*7)%36;const sit=t>=10&&t<24;const progress=t<10?1-t/10:t<24?0:Math.min(1,(t-24)/10);if(person.current){person.current.position.set(side*(sit?0:1.1),sit?.48:.13,progress*7);person.current.rotation.y=sit?side*Math.PI/2:t<10?Math.PI:0;}if(legs.current){legs.current.rotation.x=sit?-Math.PI/2:Math.sin(t*7)*.2;legs.current.position.y=sit?0:.43;}if(walker.current){const u=(clock.elapsedTime*.95+index*3)%14;walker.current.position.set(side*2,.13,u<7?u-3.5:10.5-u);walker.current.rotation.y=u<7?0:Math.PI;}if(left.current)left.current.rotation.x=Math.sin(clock.elapsedTime*7)*.45;if(right.current)right.current.rotation.x=-Math.sin(clock.elapsedTime*7)*.45;});
 const box=(p:[number,number,number],s:[number,number,number],color:string)=><mesh position={p}><boxGeometry args={s}/><meshStandardMaterial color={color}/></mesh>;
 const body=(shirt:string)=><>{box([0,.78,0],[.36,.55,.24],shirt)}<mesh position={[0,1.18,0]}><sphereGeometry args={[.14,8,6]}/><meshStandardMaterial color="#c58d64"/></mesh>{box([-.24,.74,0],[.11,.44,.12],shirt)}{box([.24,.74,0],[.11,.44,.12],shirt)}</>;
 return <group ref={root} position={[x,0,z]}>{box([0,.48,0],[.52,.14,1.8],'#bdb9ae')}{box([-side*.23,.77,0],[.12,.55,1.8],'#bdb9ae')}{[-.65,.65].map(d=><group key={d}>{box([0,.25,d],[.43,.5,.18],'#9b998f')}</group>)}<group ref={person}>{body('#477b99')}<group ref={legs}>{box([-.1,-.18,0],[.15,.43,.16],'#34424d')}{box([.1,-.18,0],[.15,.43,.16],'#34424d')}</group></group><group ref={walker}>{body('#b34c45')}<group ref={left} position={[-.1,.48,0]}>{box([0,-.23,0],[.15,.46,.16],'#34424d')}</group><group ref={right} position={[.1,.48,0]}>{box([0,-.23,0],[.15,.46,.16],'#34424d')}</group></group></group>
}
