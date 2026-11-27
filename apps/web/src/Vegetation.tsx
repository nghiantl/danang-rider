import React,{useMemo,useRef,useEffect} from 'react';
import * as THREE from 'three';
import {useFrame} from '@react-three/fiber';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {graphics} from './performance';
import {weatherVisual} from './environment';
import type {Point} from './osm';
type Part={geometry:THREE.BufferGeometry;leaf:boolean};
function model(kind:number,detail:boolean):Part[]{
 const wood:THREE.BufferGeometry[]=[],leaves:THREE.BufferGeometry[]=[];
 const branch=(a:THREE.Vector3,b:THREE.Vector3,r:number)=>{const d=b.clone().sub(a);const g=new THREE.CylinderGeometry(r*.45,r,d.length(),5);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());wood.push(g)};
 const palm=kind===3,h=palm?6:3.4;
 branch(new THREE.Vector3(),new THREE.Vector3(0,h,0),.175);
 if(palm){for(let i=0;i<(detail?9:5);i++){const a=i*Math.PI*2/(detail?9:5),v:number[]=[];for(let j=0;j<5;j++){const t=j/5,u=(j+1)/5;const p=(s:number,side:number)=>[Math.cos(a)*s*2.7-Math.sin(a)*side*.32*Math.sin(Math.PI*s),h+.7*Math.sin(Math.PI*s)-s*s*.9,Math.sin(a)*s*2.7+Math.cos(a)*side*.32*Math.sin(Math.PI*s)];v.push(...p(t,-1),...p(t,1),...p(u,1),...p(t,-1),...p(u,1),...p(u,-1))}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();leaves.push(g)}}else{for(let i=0;i<(detail?6:1);i++){const a=i*2.39996,x=detail?Math.cos(a)*.85:0,z=detail?Math.sin(a)*.85:0,y=h+(detail?i%3*.36:.5);if(detail)branch(new THREE.Vector3(0,2.1,0),new THREE.Vector3(x,y,z),.075);const g=new THREE.IcosahedronGeometry(1,detail?1:0);g.scale(detail?1.15:1.9,detail?.95:1.5,detail?1.15:1.9);g.translate(x,y,z);leaves.push(g)}}
 const combine=(parts:THREE.BufferGeometry[])=>{const normalized=parts.map(g=>{const n=g.index?g.toNonIndexed():g.clone();for(const k of Object.keys(n.attributes))if(k!=='position'&&k!=='normal')n.deleteAttribute(k);return n});const result=mergeGeometries(normalized)!;parts.forEach(g=>g.dispose());normalized.forEach(g=>g.dispose());return result};
 return [{geometry:combine(wood),leaf:false},{geometry:combine(leaves),leaf:true}]
}
const colors=['#477d3e','#ad5944','#8264a1','#397d42'];
export function Vegetation({points,player,palm=false}:{points:Point[];player:React.RefObject<Point>;palm?:boolean}){
 const batches=useMemo(()=>{const out:{mesh:THREE.InstancedMesh;points:Point[];leaf:boolean;detail:boolean;kind:number}[]=[];for(let k=0;k<4;k++){const list=points.filter(p=> (palm?3:Math.abs(Math.floor(p.x*17+p.z*31))%3)===k);if(!list.length)continue;for(const detail of [true,false])for(const part of model(k,detail)){const mat=new THREE.MeshStandardMaterial({color:part.leaf?colors[k]:'#806347',roughness:.9,side:THREE.DoubleSide});const mesh=new THREE.InstancedMesh(part.geometry,mat,list.length);mesh.frustumCulled=false;mesh.count=0;out.push({mesh,points:list,leaf:part.leaf,detail,kind:k})}}return out},[points,palm]);
 useEffect(()=>()=>{for(const b of batches){b.mesh.geometry.dispose();(b.mesh.material as THREE.Material).dispose();b.mesh.dispose()}},[batches]);
 const dummy=useMemo(()=>new THREE.Object3D(),[]),last=useRef(-1);
 useFrame(({clock})=>{const t=clock.elapsedTime;if(t-last.current<.2)return;last.current=t;const p=player.current,tier=graphics.tier,near=[25,45,65][tier],far=[100,160,220][tier];for(const b of batches){let n=0;for(const q of b.points){const d=Math.hypot(q.x-p.x,q.z-p.z);if(d>far||(d<near)!==b.detail)continue;dummy.position.set(q.x,0,q.z);dummy.rotation.set(b.leaf&&b.detail?Math.sin(t*2+q.x)*Math.min(.025,Math.abs(weatherVisual.windZ)*.002+.004):0,q.x*.17,b.leaf&&b.detail?Math.cos(t*2+q.z)*Math.min(.025,Math.abs(weatherVisual.windX)*.002+.004):0);dummy.scale.setScalar(1);dummy.updateMatrix();b.mesh.setMatrixAt(n++,dummy.matrix)}b.mesh.count=n;b.mesh.instanceMatrix.needsUpdate=true;if(b.leaf){const mat=b.mesh.material as THREE.MeshStandardMaterial;mat.color.set(colors[b.kind]).multiplyScalar(1-.18*weatherVisual.wetness);mat.roughness=.9-.2*weatherVisual.wetness}}});
 return <group>{batches.map((b,i)=><primitive key={i} object={b.mesh}/>)}</group>
}
