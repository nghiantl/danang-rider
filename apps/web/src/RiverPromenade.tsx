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
 const named=map.roads.filter(r=>/bach dang|tran hung dao/.test(r.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase())).flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b})));
 for(const [z,row] of rows)for(const side of [-1,1]){const edge=side===1?row.east:row.west,p={x:edge+side*2,z};if(!named.some(r=>distance(p,r.a,r.b)<65))continue;
 if(roads.some(r=>distance(p,r.a,r.b)<r.w/2+3))continue;
 if(map.buildings.some(b=>Math.abs(p.x-b.x)<b.halfX+3&&Math.abs(z-b.z)<b.halfZ+3))continue;
 paving.push({x:p.x,z,y:.08,w:4,h:.16,d:4});
 if(side===1&&love&&Math.abs(z-love.z)<5)continue;
 const x=edge+side*.3;rails.push({x,z,y:.65,w:.13,h:1.3,d:.13},{x,z,y:1.15,w:.12,h:.12,d:4},{x,z,y:.55,w:.09,h:.09,d:4});
 }return {paving,rails}},[map]);
 return <group><Batch parts={paving} color="#c8c2b5"/><Batch parts={rails} color="#647078"/></group>
}
