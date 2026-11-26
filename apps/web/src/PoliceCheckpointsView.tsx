import {FaceDetails} from './characterVisuals';
import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Point} from './osm';
import type {Checkpoint} from './policeCheckpoints';
function Box({p,s,color}:{p:[number,number,number];s:[number,number,number];color:string}){return <mesh position={p}><boxGeometry args={s}/><meshStandardMaterial color={color}/></mesh>}
function Station({c,player}:{c:Checkpoint;player:React.RefObject<Point>}){
 const root=useRef<THREE.Group>(null),arm=useRef<THREE.Group>(null),red=useRef<THREE.MeshBasicMaterial>(null),blue=useRef<THREE.MeshBasicMaterial>(null);
 useFrame(({clock})=>{if(!root.current)return;root.current.visible=Math.hypot(player.current.x-c.junction.x,player.current.z-c.junction.z)<150;if(!root.current.visible)return;const t=clock.elapsedTime;if(arm.current)arm.current.rotation.x=-0.5+Math.sin(t*2.5)*0.65;const phase=Math.floor(t*4)%2;if(red.current)red.current.color.set(phase?'#ff2020':'#541919');if(blue.current)blue.current.color.set(phase?'#192b59':'#2266ff')});
 return <group ref={root} visible={false}>
 <group position={[c.officer.x,0,c.officer.z]} rotation={[0,Math.atan2(c.junction.x-c.officer.x,c.junction.z-c.officer.z),0]}>
 <Box p={[0,1.13,0]} s={[0.43,0.58,0.25]} color="#d8b56b"/>
 {[-1,1].map(s=><group key={s}><Box p={[s*.12,.48,0]} s={[.19,.72,.21]} color="#c5a05b"/><Box p={[s*.12,.1,.06]} s={[.2,.16,.31]} color="#252a2b"/><Box p={[s*.16,1.43,0]} s={[.13,.05,.25]} color="#b92c32"/></group>)}
 <mesh position={[0,1.65,0]}><sphereGeometry args={[.15,10,8]}/><meshStandardMaterial color="#d6a47e"/></mesh>
 <group position={[0,1.65,0]}><FaceDetails skin="#d6a47e" forward={1}/></group><Box p={[0,.88,.13]} s={[.43,.07,.035]} color="#493e2c"/><Box p={[.11,1.24,.14]} s={[.13,.12,.025]} color="#b99a59"/><Box p={[-.11,1.24,.14]} s={[.13,.12,.025]} color="#b99a59"/><mesh position={[0,1.79,0]}><cylinderGeometry args={[.19,.19,.12,12]}/><meshStandardMaterial color="#c9a35b"/></mesh>
 <Box p={[0,1.75,.12]} s={[.31,.035,.24]} color="#39302a"/><Box p={[0,1.4,.14]} s={[.1,.12,.025]} color="#b72b31"/>
 <Box p={[-.29,1.1,0]} s={[.15,.55,.16]} color="#d8b56b"/>
 <group ref={arm} position={[.29,1.4,0]}><Box p={[0,-.22,0]} s={[.15,.44,.16]} color="#d8b56b"/><Box p={[0,-.47,0]} s={[.12,.13,.13]} color="#d6a47e"/>{[0,1,2,3].map(i=><Box key={i} p={[0,-.47,.09+i*.09]} s={[.065,.065,.09]} color={i%2?'#f5f5e9':'#222222'}/>)}</group>
 </group>
 <group position={[c.car.x,0,c.car.z]} rotation={[0,c.heading,0]}>
 <Box p={[0,.66,0]} s={[1.65,.78,3.6]} color="#f1f2ef"/><Box p={[0,1.25,-.12]} s={[1.4,.52,1.95]} color="#344a58"/><Box p={[0,1.55,-.12]} s={[1.35,.12,1.85]} color="#f1f2ef"/>
 {[-1,1].map(s=><group key={s}><Box p={[s*.831,.7,0]} s={[.025,.22,2.6]} color="#275a9b"/>{[-1,1].map(z=><mesh key={z} position={[s*.73,.28,z*1.22]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.27,.27,.22,12]}/><meshStandardMaterial color="#25292b"/></mesh>)}</group>)}
 <Box p={[0,1.65,0]} s={[1.05,.08,.32]} color="#22282d"/>
 <mesh position={[-.27,1.76,0]}><boxGeometry args={[.49,.17,.29]}/><meshBasicMaterial ref={red} color="#ff2020"/></mesh><mesh position={[.27,1.76,0]}><boxGeometry args={[.49,.17,.29]}/><meshBasicMaterial ref={blue} color="#2266ff"/></mesh>
 </group></group>
}
export function PoliceCheckpoints({items,player}:{items:Checkpoint[];player:React.RefObject<Point>}){return <group>{items.map((c,i)=><Station key={i} c={c} player={player}/>)}</group>}
