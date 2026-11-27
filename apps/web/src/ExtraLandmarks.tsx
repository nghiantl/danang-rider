import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {OSMMap,Point,Footprint} from './osm';
import {landmarkSites,landmarkRange} from './landmarkPlacement';
import {graphics} from './performance';
import {environmentAt} from './environment';
function Block({p,s,c}:{p:[number,number,number];s:[number,number,number];c:string}){return <mesh position={p} scale={s}><boxGeometry/><meshStandardMaterial color={c}/></mesh>}
function Site({b,kind,position}:{b:Footprint;kind:string;position:Point}){
 const group=useRef<THREE.Group>(null),lamp=useRef<THREE.MeshStandardMaterial>(null);
 useFrame(()=>{if(group.current)group.current.visible=Math.hypot(b.x-position.x,b.z-position.z)<landmarkRange(graphics.tier);if(lamp.current)lamp.current.emissiveIntensity=(1-environmentAt(new Date()).daylight)*1.5});
 const w=b.halfX*1.5,d=b.halfZ*1.5,h=b.height;
 return <group ref={group} position={[b.x,h,b.z]}>
 {kind==='cathedral'?<><Block p={[0,2,0]} s={[w,4,d]} c="#e9a2b3"/><Block p={[0,7,0]} s={[w*.28,14,d*.28]} c="#e9a2b3"/><mesh position={[0,17,0]}><coneGeometry args={[Math.min(w,d)*.2,6,4]}/><meshStandardMaterial color="#b96b81"/></mesh><Block p={[0,20.5,0]} s={[.2,2,.2]} c="#eee4d5"/><Block p={[0,21,0]} s={[1.2,.2,.2]} c="#eee4d5"/></>:kind==='market'?<><Block p={[0,.6,0]} s={[w,1.2,d]} c="#e9cf83"/><Block p={[0,1.5,0]} s={[w*.7,.6,d*.65]} c="#a33e30"/></>:kind==='carp'?<><mesh position={[0,2,0]} scale={[Math.min(w,d)*.3,2,Math.min(w,d)*.3]}><sphereGeometry args={[1,10,8]}/><meshStandardMaterial color="#e4e2d8"/></mesh><mesh position={[0,4,0]}><coneGeometry args={[.6,1.5,8]}/><meshStandardMaterial color="#e4e2d8"/></mesh></>:<>{[-1,1].map(s=><group key={s} position={[s*w*.3,0,0]}><Block p={[0,1,0]} s={[.12,2,.12]} c="#783c3c"/><mesh position={[0,2.2,0]}><sphereGeometry args={[.35,8,6]}/><meshStandardMaterial color="#d63848"/></mesh></group>)}</>}
 <mesh position={[0,.1,0]}><boxGeometry args={[w*.5,.15,d*.5]}/><meshStandardMaterial ref={lamp} color="#f2d9a3" emissive="#f1b85e" emissiveIntensity={0}/></mesh>
 </group>
}
export function ExtraLandmarks({map,position}:{map:OSMMap;position:Point}){const sites=useMemo(()=>landmarkSites(map),[map]);return <group>{sites.filter(s=>s.kind!=='carp'&&s.kind!=='love').map(({b,kind},i)=><Site key={i} b={b} kind={kind} position={position}/>)}</group>}
