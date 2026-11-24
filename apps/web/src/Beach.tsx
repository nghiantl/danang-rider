import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {type OSMMap,type Point} from './osm';
import {coastStart,coastEnd,shoreX,hasCoast} from './coast';
function strip(from:number,to:number,start:number,end:number){const v:number[]=[];for(let z=start;z<end;z+=20){const q=Math.min(end,z+20),a=shoreX(z),b=shoreX(q);v.push(a+from,.018,z,a+from,.018,q,b+to,.018,q,a+from,.018,z,b+to,.018,q,a+to,.018,z); // corrected second vertex below
 const k=v.length-18;v[k+3]=b+from;
 }const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();return g}
export function Beach({map,position}:{map:OSMMap;position:Point}){
 const enabled=hasCoast(map),near=position.x>shoreX(position.z)-950;
 const sand=useMemo(()=>strip(-28,0,coastStart,coastEnd),[]),sea=useMemo(()=>strip(0,1800,coastStart,coastEnd),[]);
 const foam=useRef<THREE.Group>(null);
 const palms=useMemo(()=>Array.from({length:48},(_,i)=>{const z=coastStart+25+i*(coastEnd-coastStart-50)/47;return {x:shoreX(z)-19,z}}).filter(p=>!map.buildings.some(b=>Math.abs(p.x-b.x)<b.halfX+3&&Math.abs(p.z-b.z)<b.halfZ+3)&&!map.roads.some(r=>r.points.slice(1).some((b,i)=>{const a=r.points[i],dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l)):0;return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)<r.width/2+3}))),[map]);
 const waves=useMemo(()=>[2,9,17].map(d=>strip(d,d+0.7,coastStart,coastEnd)),[]);
 useFrame(({clock})=>{if(foam.current)foam.current.position.x=Math.sin(clock.elapsedTime*0.8)*1.5});
 if(!enabled||!near)return null;
 return <group><mesh geometry={sand}><meshStandardMaterial color="#d8c39a"/></mesh><mesh geometry={sea}><meshStandardMaterial color="#247e9e" roughness={0.42}/></mesh><group ref={foam} position={[0,.025,0]}>{waves.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial color="#c8e5e5" transparent opacity={.55}/></mesh>)}</group>{palms.filter(p=>Math.abs(p.z-position.z)<450).map(p=><group key={p.z} position={[p.x,0,p.z]}><mesh position={[0,3,0]}><cylinderGeometry args={[.17,.3,6,6]}/><meshStandardMaterial color="#80674c"/></mesh>{Array.from({length:6},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI/3)*1.2,6,Math.sin(i*Math.PI/3)*1.2]} rotation={[0,-i*Math.PI/3,.18]}><boxGeometry args={[2.8,.16,.65]}/><meshStandardMaterial color="#377d42"/></mesh>)}</group>)}</group>
}
