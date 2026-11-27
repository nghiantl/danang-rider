import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {OSMMap,Point} from './osm';
import {streetShops,shopOpen,type Shop} from './streetLife';
import {graphics,pointGrid} from './performance';
import {environmentAt,weatherVisual} from './environment';
function Box({p,s,c}:{p:[number,number,number];s:[number,number,number];c:string}){return <mesh position={p}><boxGeometry args={s}/><meshStandardMaterial color={c}/></mesh>}
function Stall({shop}:{shop:Shop}){
 const root=useRef<THREE.Group>(null),guest=useRef<THREE.Group>(null),lamp=useRef<THREE.MeshStandardMaterial>(null);
 useFrame(({clock})=>{const e=environmentAt(new Date()),open=shopOpen(shop.kind,e.hour);if(root.current)root.current.visible=open;if(guest.current){guest.current.visible=open&&graphics.tier>0&&(shop.covered||weatherVisual.rain<.3);guest.current.rotation.y=Math.sin(clock.elapsedTime*.7)*.12}if(lamp.current)lamp.current.emissiveIntensity=open&&e.night?1.4:0});
 return <group ref={root} position={[shop.x,.12,shop.z]} rotation={[0,shop.angle,0]}>
 <Box p={[0,.65,0]} s={[.85,.08,.65]} c="#a8a6a0"/><Box p={[0,.32,0]} s={[.12,.65,.12]} c="#777777"/>
 {[-1,1].map(s=><group key={s}><Box p={[s*.68,.27,0]} s={[.38,.1,.38]} c="#b62e36"/><Box p={[s*.68,.12,0]} s={[.27,.25,.27]} c="#b62e36"/></group>)}
 <Box p={[0,.76,0]} s={[.09,.14,.09]} c="#e9d6a0"/>
 {shop.covered&&<><Box p={[0,1.15,0]} s={[.06,2.3,.06]} c="#777777"/><mesh position={[0,2.3,0]}><coneGeometry args={[1.15,.45,8]}/><meshStandardMaterial color={['#d84d43','#467f9b','#e3b34b'][shop.kind%3]}/></mesh></>}
 <mesh position={[0,1.65,-.55]}><boxGeometry args={[.8,.2,.08]}/><meshStandardMaterial ref={lamp} color="#f5d7a1" emissive="#ffc36b"/></mesh>
 <group ref={guest} position={[.68,.28,0]}><Box p={[0,.35,0]} s={[.32,.48,.24]} c="#477b99"/><mesh position={[0,.72,0]}><sphereGeometry args={[.13,8,6]}/><meshStandardMaterial color="#c58d64"/></mesh><Box p={[-.15,.08,0]} s={[.3,.15,.25]} c="#34424d"/></group>
 </group>
}
export function StreetLife({map,position}:{map:OSMMap;position:Point}){const near=useMemo(()=>pointGrid(streetShops(map),80),[map]);const shops=useMemo(()=>near(position.x,position.z,100).sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z)).slice(0,graphics.tier===0?8:24),[near,Math.floor(position.x/20),Math.floor(position.z/20),graphics.tier]);return <group>{shops.map(s=><Stall key={s.x+':'+s.z} shop={s}/>)}</group>}
