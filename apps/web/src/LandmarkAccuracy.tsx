import {useMemo,useRef,useLayoutEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {type OSMMap,type Point} from './osm';
import {riverfrontSites,riverfrontCovered,riverfrontVisible,loveBridgeAnchor} from './riverfrontSites';
import {riverGrid} from './riverGeometry';
import {environmentAt} from './environment';

export function DragonDetails({curve}:{curve:THREE.CatmullRomCurve3}){
 const ref=useRef<THREE.InstancedMesh>(null);
 useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const o=new THREE.Object3D();for(let i=0;i<96;i++){const t=(i+4)/104,p=curve.getPointAt(t);for(let j=0;j<5;j++){const a=(j-2)*.62;o.position.set(p.x,p.y+Math.cos(a)*1.48,p.z+Math.sin(a)*1.48);o.rotation.set(a,0,-.25);o.scale.set(.65,.22,.48);o.updateMatrix();mesh.setMatrixAt(i*5+j,o.matrix)}}mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()},[curve]);
 return <group><instancedMesh ref={ref} args={[undefined,undefined,480]}><sphereGeometry args={[1,6,4]}/><meshStandardMaterial color="#efc54a" metalness={.5}/></instancedMesh>{[.12,.88].flatMap(t=>[-1,1].map(s=>{const p=curve.getPointAt(t);return <group key={t+':'+s} position={[p.x,p.y,p.z]}><mesh position={[0,-1.5,s*.65]} rotation={[s*.25,0,.3]}><capsuleGeometry args={[.48,2,3,6]}/><meshStandardMaterial color="#dca82c"/></mesh><mesh position={[.7,-3,s*1.05]} scale={[1.2,.45,.55]}><sphereGeometry args={[1,8,6]}/><meshStandardMaterial color="#e5b52d"/></mesh></group>}))}</group>
}
function Box({p,s,c}:{p:[number,number,number];s:[number,number,number];c:string}){return <mesh position={p}><boxGeometry args={s}/><meshStandardMaterial color={c}/></mesh>}
export function RiverfrontLandmarks({map,position}:{map:OSMMap;position:Point}){
 const [love,carp]=riverfrontSites;const anchor=useMemo(()=>loveBridgeAnchor(riverGrid(map).cells,love.point)??love.point,[map,love.point]);
 const heart=useMemo(()=>{const s=new THREE.Shape();s.moveTo(0,-.6);s.bezierCurveTo(-1,.05,-.8,.8,0,.35);s.bezierCurveTo(.8,.8,1,.05,0,-.6);s.closePath();return s},[]);
 const water=useRef<THREE.Group>(null),light=useRef<THREE.MeshStandardMaterial>(null);
 useFrame(({clock})=>{if(light.current)light.current.emissiveIntensity=.2+1.4*(1-environmentAt(new Date()).daylight);if(water.current)water.current.children.forEach((o,i)=>{const t=(clock.elapsedTime*.7+i/18)%1;o.position.set(-1-9*t,7+5*t-12*t*t,0)})});
 if(!riverfrontCovered(map)||!riverfrontSites.some(s=>riverfrontVisible(position,s.point)))return null;
 return <group position={[anchor.x,0,anchor.z]}><Box p={[-18,.25,0]} s={[36,.5,6]} c="#b79b7c"/>{[-1,1].map(s=><group key={s}><Box p={[-18,1.45,s*2.9]} s={[36,.12,.12]} c="#654c42"/><Box p={[-18,.85,s*2.9]} s={[36,.08,.08]} c="#654c42"/>{Array.from({length:13},(_,i)=><Box key={i} p={[-i*3,1,s*2.9]} s={[.12,1.5,.12]} c="#654c42"/>)}</group>)}{[0,1,2,3,4,5].map(i=><group key={i} position={[-3-i*6,0,2]}><Box p={[0,2,0]} s={[.14,4,.14]} c="#663a35"/>{[-1,0,1].map(j=><mesh key={j} position={[j*.85,4+Math.abs(j)*-.3,0]}><extrudeGeometry args={[heart,{depth:.15,bevelEnabled:false}]}/><meshStandardMaterial ref={i===0&&j===0?light:undefined} side={THREE.DoubleSide} color="#d7193f" emissive="#d7193f" emissiveIntensity={.6}/></mesh>)}</group>)}<group position={[carp.point.x-anchor.x,0,carp.point.z-anchor.z]}><Box p={[0,.5,0]} s={[5,1,5]} c="#b9b9ad"/><mesh position={[0,3.6,0]} scale={[1.2,2.8,1.1]}><sphereGeometry args={[1,16,12]}/><meshStandardMaterial color="#e7e6dc"/></mesh><mesh position={[-.6,6.2,0]} scale={[1.5,.85,.85]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#e7e6dc"/></mesh>{[-1,1].map(s=><mesh key={s} position={[0,7,s*.6]}><coneGeometry args={[.25,1.4,6]}/><meshStandardMaterial color="#e7e6dc"/></mesh>)}<group ref={water}>{Array.from({length:18},(_,i)=><mesh key={i}><sphereGeometry args={[.12,5,4]}/><meshBasicMaterial color="#bde9ff" transparent opacity={.7}/></mesh>)}</group></group></group>
}
