import {useMemo,useLayoutEffect,useRef} from 'react';
import * as THREE from 'three';
import type {OSMMap} from './osm';
export const bridgeColor=(seconds:number)=>['#ff3030','#26e86b','#ffdb32','#b45cff','#ffffff','#28aaff'][Math.floor(seconds/15)%6];
export function BridgeRails({map}:{map:OSMMap}){
 const parts=useMemo(()=>{const roads=map.roads.filter(r=>r.bridge&&/cau rong|cau song han/.test(r.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase()));const segments=roads.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,w:r.width})));const result:{x:number;z:number;y:number;w:number;h:number;d:number;angle:number}[]=[];
 for(const s of segments){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz);if(len<.1)continue;const ux=dx/len,uz=dz/len,n=Math.ceil(len/3);for(const side of [-1,1])for(let i=0;i<n;i++){const t=(i+.5)*len/n,x=s.a.x+ux*t-uz*side*(s.w/2+.65),z=s.a.z+uz*t+ux*side*(s.w/2+.65);
 // Suppress inner rails between parallel carriageways.
 if(segments.some(o=>{if(o===s)return false;const vx=o.b.x-o.a.x,vz=o.b.z-o.a.z,k=Math.max(0,Math.min(1,((x-o.a.x)*vx+(z-o.a.z)*vz)/(vx*vx+vz*vz||1)));return Math.hypot(x-o.a.x-vx*k,z-o.a.z-vz*k)<o.w/2+1}))continue;
 const angle=-Math.atan2(uz,ux);result.push({x,z,y:.72,w:.13,h:1.44,d:.13,angle},{x,z,y:1.28,w:len/n+.02,h:.13,d:.13,angle},{x,z,y:.65,w:len/n+.02,h:.09,d:.09,angle});}}
 return result},[map]);const ref=useRef<THREE.InstancedMesh>(null);useLayoutEffect(()=>{if(!ref.current)return;const o=new THREE.Object3D();parts.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.rotation.y=p.angle;o.scale.set(p.w,p.h,p.d);o.updateMatrix();ref.current?.setMatrixAt(i,o.matrix)});ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere()},[parts]);return parts.length?<instancedMesh ref={ref} args={[undefined,undefined,parts.length]}><boxGeometry/><meshStandardMaterial color="#aebac1" metalness={.45} roughness={.55}/></instancedMesh>:null;
}
