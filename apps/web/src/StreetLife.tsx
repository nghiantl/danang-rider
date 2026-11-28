import {useMemo,useRef,useLayoutEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {Text} from '@react-three/drei';
import * as THREE from 'three';
import type {OSMMap,Point} from './osm';
import {streetShops,shopOpen,shopNames,registerRenderedShop,selectVisibleShops,type Shop} from './streetLife';
import {graphics,pointGrid} from './performance';
import {environmentAt,weatherVisual} from './environment';
type Vec=[number,number,number];
type Piece={p:Vec;s:Vec;c:string};
function Boxes({items}:{items:Piece[]}){const ref=useRef<THREE.InstancedMesh>(null);useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const o=new THREE.Object3D();items.forEach(({p,s,c},i)=>{o.position.set(...p);o.scale.set(...s);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,new THREE.Color(c))});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere()},[items]);return <instancedMesh ref={ref} args={[undefined,undefined,items.length]}><boxGeometry/><meshStandardMaterial/></instancedMesh>}
function Box({p,s,c}:Piece){return <mesh position={p}><boxGeometry args={s}/><meshStandardMaterial color={c}/></mesh>}
function Stall({shop,map}:{shop:Shop;map:OSMMap}){
 useLayoutEffect(()=>registerRenderedShop(map,shop),[map,shop]);
 const furniture=useRef<THREE.Group>(null),closed=useRef<THREE.Group>(null),guest=useRef<THREE.Group>(null),lamp=useRef<THREE.MeshStandardMaterial>(null);
 useFrame(({clock})=>{const e=environmentAt(new Date()),open=shopOpen(shop.kind,e.hour);if(furniture.current)furniture.current.visible=open;if(closed.current)closed.current.visible=!open;if(guest.current){guest.current.visible=open&&graphics.tier>0&&(shop.covered||weatherVisual.rain<.3);guest.current.rotation.y=Math.sin(clock.elapsedTime*.7)*.12}if(lamp.current)lamp.current.emissiveIntensity=open&&e.night?1.4:0});
 return <group position={[shop.x,.12,shop.z]} rotation={[0,shop.angle,0]}>
 <group ref={closed} visible={false}><Boxes items={[{p:[0,.35,0],s:[.85,.7,.65],c:"#777777"},{p:[0,.76,0],s:[.85,.12,.65],c:"#a8a6a0"}]}/></group>
 <group ref={furniture}><Boxes items={[{p:[0,.65,0],s:[.85,.08,.65],c:"#a8a6a0"},{p:[0,.32,0],s:[.12,.65,.12],c:"#777777"},{p:[-.68,.27,0],s:[.38,.1,.38],c:"#b62e36"},{p:[-.68,.12,0],s:[.27,.25,.27],c:"#b62e36"},{p:[.68,.27,0],s:[.38,.1,.38],c:"#b62e36"},{p:[.68,.12,0],s:[.27,.25,.27],c:"#b62e36"}]}/>
 {(shop.kind===1||shop.kind===3||shop.kind===2)&&<group position={[0,0,-.8]}><Box p={[0,.45,0]} s={[1.1,.8,.48]} c="#999e9f"/><Box p={[0,1.02,0]} s={[1.1,.35,.48]} c="#b7d5d9"/>{[-.4,.4].map(x=><Box key={x} p={[x,.13,0]} s={[.16,.26,.5]} c="#333333"/>)}</group>}
 {shop.kind===4&&<Box p={[0,.72,0]} s={[.45,.12,.35]} c="#d5c5a4"/>}
 <Box p={[0,.76,0]} s={[.09,.14,.09]} c="#e9d6a0"/>
 {shop.covered&&<><Box p={[0,1.15,0]} s={[.06,2.3,.06]} c="#777777"/><mesh position={[0,2.3,0]}><coneGeometry args={[1.15,.45,8]}/><meshStandardMaterial color={['#d84d43','#467f9b','#e3b34b'][shop.kind%3]}/></mesh></>}
 </group>
 <mesh position={[0,1.65,-.55]}><boxGeometry args={[.8,.2,.08]}/><meshStandardMaterial ref={lamp} color="#f5d7a1" emissive="#ffc36b"/></mesh>
 <Text position={[0,1.65,-.49]} fontSize={.11} color="#442c20" anchorX="center" anchorY="middle">{shopNames[shop.kind]}</Text>
 <group ref={guest} position={[.68,.28,0]}><Box p={[0,.35,0]} s={[.32,.48,.24]} c="#477b99"/><mesh position={[0,.72,0]}><sphereGeometry args={[.13,8,6]}/><meshStandardMaterial color="#c58d64"/></mesh><Box p={[-.15,.08,0]} s={[.3,.15,.25]} c="#34424d"/></group>
 </group>
}
export function StreetLife({map,position}:{map:OSMMap;position:Point}){const near=useMemo(()=>pointGrid(streetShops(map),80),[map]);const shops=useMemo(()=>selectVisibleShops(near(position.x,position.z,100),position,graphics.tier===0?8:24),[near,Math.floor(position.x/20),Math.floor(position.z/20),graphics.tier]);return <group>{shops.map(s=><Stall key={s.x+':'+s.z} shop={s} map={map}/>)}</group>}
