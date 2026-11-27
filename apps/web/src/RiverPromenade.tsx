import {useMemo,useLayoutEffect,useRef} from 'react';
import * as THREE from 'three';
import type {OSMMap,Point} from './osm';
import {riverGrid} from './riverGeometry';
import {riverfrontSites,loveBridgeAnchor} from './riverfrontSites';
type Part={x:number;z:number;y:number;w:number;h:number;d:number};
function distance(p:Point,a:Point,b:Point){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)}
function Batch({parts,color}:{parts:Part[];color:string}){const ref=useRef<THREE.InstancedMesh>(null);useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const o=new THREE.Object3D();parts.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.scale.set(p.w,p.h,p.d);o.updateMatrix();mesh.setMatrixAt(i,o.matrix)});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()},[parts]);if(!parts.length)return null;return <instancedMesh ref={ref} args={[undefined,undefined,parts.length]}><boxGeometry/><meshStandardMaterial color={color} roughness={.8}/></instancedMesh>}
export function RiverPromenade({map}:{map:OSMMap}){
 const {paving,rails}=useMemo(()=>{const cells=riverGrid(map).cells,rows=new Map<number,{west:number;east:number}>();for(const p of cells){const row=rows.get(p.z);if(row){row.west=Math.min(row.west,p.x-2);row.east=Math.max(row.east,p.x+2)}else rows.set(p.z,{west:p.x-2,east:p.x+2})}
 const paving:Part[]=[],rails:Part[]=[];const love=loveBridgeAnchor(cells,riverfrontSites[0].point);
 const roads=map.roads.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,w:r.width,bridge:r.bridge})));
 for(const [z,row] of rows)for(const side of [-1,1]){const edge=side===1?row.east:row.west;
 const x=edge+side*.35,p={x,z};
 // Rail clearance is independent of the wider pavement clearance.
 const clear=(q:Point,pad:number)=>!roads.some(r=>distance(q,r.a,r.b)<r.w/2+pad)&&!map.buildings.some(b=>Math.abs(q.x-b.x)<b.halfX+pad&&Math.abs(q.z-b.z)<b.halfZ+pad);
 if(!clear(p,.35))continue;
 for(let i=0;i<4;i++){const q={x:edge+side*(i+.5),z};if(clear(q,.55))paving.push({x:q.x,z,y:.12,w:1,h:.24,d:4});}
 if(side===1&&love&&Math.abs(z-love.z)<5)continue;
 rails.push({x,z,y:.8,w:.16,h:1.6,d:.16},{x,z,y:1.4,w:.16,h:.16,d:4},{x,z,y:.75,w:.12,h:.12,d:4});
 }return {paving,rails}},[map]);
 return <group><Batch parts={paving} color="#ded4c2"/><Batch parts={rails} color="#b8c2c8"/></group>
}
