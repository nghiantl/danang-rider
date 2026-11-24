import {useMemo} from 'react';
import * as THREE from 'three';
import {project,type OSMMap,type Point} from './osm';
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
export function Landmarks({map,position}:{map:OSMMap;position:Point}){
 const bridges=useMemo(()=>['cau rong','cau song han'].flatMap((name,index)=>{
 const roads=map.roads.filter(r=>normalize(r.name).includes(name));
 const pts=roads.flatMap(r=>r.points);if(pts.length<2)return [];
 const a=pts.reduce((a,b)=>a.x<b.x?a:b),b=pts.reduce((a,b)=>a.x>b.x?a:b);
 const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<100)return [];
 return [{index,a,b,length,x:(a.x+b.x)/2,z:(a.z+b.z)/2,angle:-Math.atan2(b.z-a.z,b.x-a.x),width:Math.max(...roads.map(r=>r.width))}];
 }),[map]);
 const water=useMemo(()=>{const shape=new THREE.Shape();const west=[[16.0516,108.2247],[16.059,108.2248],[16.0678,108.2249],[16.0732,108.2244]],east=[[16.0732,108.2288],[16.0678,108.2291],[16.059,108.2294],[16.0516,108.2298]];[...west,...east].forEach(([lat,lon],i)=>{const p=project(lat,lon);if(i===0)shape.moveTo(p.x,-p.z);else shape.lineTo(p.x,-p.z)});shape.closePath();return shape},[]);
 const river=project(16.063,108.227);
 return <group>
 {bridges.length>0&&Math.abs(position.x-river.x)<1500&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,0.012,0]}><shapeGeometry args={[water]}/><meshStandardMaterial color="#377f9a" roughness={0.35} metalness={0.12}/></mesh>}
 {bridges.filter(b=>Math.hypot(b.x-position.x,b.z-position.z)<900).map(b=><Bridge key={b.index} {...b}/>)}
 </group>
}
function Bridge({index,x,z,angle,length,width}:{index:number;x:number;z:number;angle:number;length:number;width:number}){
 const curve=useMemo(()=>new THREE.CatmullRomCurve3(Array.from({length:33},(_,i)=>{const t=i/32;return new THREE.Vector3((t-.5)*length,5+7*Math.pow(Math.sin(t*Math.PI*5),2),width/2+2.2)})),[length,width]);
 const gold='#e5b52d';
 return <group position={[x,0,z]} rotation={[0,angle,0]}>
 {[-1,1].map(side=><mesh key={side} position={[0,0.65,side*(width/2+0.65)]}><boxGeometry args={[length,0.8,0.3]}/><meshStandardMaterial color="#b7bec0"/></mesh>)}
 {index===0?<><mesh><tubeGeometry args={[curve,96,1.5,8,false]}/><meshStandardMaterial color={gold} emissive="#8b5800" emissiveIntensity={0.3}/></mesh><group position={[length/2,7,width/2+2.2]}><mesh><sphereGeometry args={[2.8,10,8]}/><meshStandardMaterial color={gold}/></mesh><mesh position={[3,0,0]}><boxGeometry args={[4,1.6,3]}/><meshStandardMaterial color={gold}/></mesh>{[-1,1].map(s=><mesh key={s} position={[1,1.2,s*2]}><sphereGeometry args={[0.45,8,6]}/><meshBasicMaterial color="#e94b28"/></mesh>)}</group></>:<>{[-1,1].map(s=><group key={s} position={[s*length*.15,0,width/2+1]}><mesh position={[0,10,0]}><boxGeometry args={[1.4,20,1.4]}/><meshStandardMaterial color="#e1e5e5"/></mesh>{[-1,1].flatMap(d=>[1,2,3,4].map(i=>{const dx=d*i*length*.065,dy=17;return <mesh key={d+':'+i} position={[dx/2,dy/2,0]} rotation={[0,0,Math.atan2(-dx,dy)]}><cylinderGeometry args={[.09,.09,Math.hypot(dx,dy),5]}/><meshStandardMaterial color="#c7d0d3"/></mesh>}))}</group>)}</>}
 </group>
}
