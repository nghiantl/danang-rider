import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Point} from './osm';
import {graphics} from './performance';
import {weatherVisual} from './environment';
export function GroundGreenery({points,player}:{points:Point[];player:React.RefObject<Point>}){
 const grass=useRef<THREE.InstancedMesh>(null),shrubs=useRef<THREE.InstancedMesh>(null),flowers=useRef<THREE.InstancedMesh>(null);
 const dummy=useMemo(()=>new THREE.Object3D(),[]),last=useRef(-1);
 useFrame(({clock})=>{if(clock.elapsedTime-last.current<.25)return;last.current=clock.elapsedTime;const g=grass.current,s=shrubs.current,f=flowers.current;if(!g||!s||!f)return;let n=0,k=0,j=0;const range=[45,85,130][graphics.tier];for(const p of points){if(Math.hypot(p.x-player.current.x,p.z-player.current.z)>range)continue;dummy.rotation.set(0,0,0);dummy.position.set(p.x,.025,p.z);dummy.scale.set(4,.035,4);dummy.updateMatrix();g.setMatrixAt(n++,dummy.matrix);for(let i=0;i<3;i++){const a=i*2.094;dummy.position.set(p.x+Math.cos(a)*1.2,.28,p.z+Math.sin(a)*1.2);dummy.scale.set(.6,.4,.6);dummy.updateMatrix();s.setMatrixAt(k++,dummy.matrix);if(graphics.tier>0){dummy.position.y=.65;dummy.scale.set(.14,.12,.14);dummy.updateMatrix();f.setMatrixAt(j++,dummy.matrix)}}}g.count=n;s.count=k;f.count=j;for(const mesh of [g,s,f])mesh.instanceMatrix.needsUpdate=true;(g.material as THREE.MeshStandardMaterial).color.set('#63864b').multiplyScalar(1-.2*weatherVisual.wetness)});
 return points.length?<group><instancedMesh ref={grass} args={[undefined,undefined,points.length]} frustumCulled={false}><boxGeometry/><meshStandardMaterial color="#63864b"/></instancedMesh><instancedMesh ref={shrubs} args={[undefined,undefined,points.length*3]} frustumCulled={false}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color="#386e42"/></instancedMesh><instancedMesh ref={flowers} args={[undefined,undefined,points.length*3]} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#df8a45"/></instancedMesh></group>:null
}
