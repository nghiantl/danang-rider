import {LandmarkWater} from './LandmarkWater';
import {coastalPalms} from './vegetationPlacement';
import {Vegetation} from './Vegetation';
import {useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {type OSMMap,type Point} from './osm';
import {coastStart,coastEnd,shoreX,hasCoast} from './coast';
function strip(from:number,to:number,start:number,end:number){const v:number[]=[];for(let z=start;z<end;z+=20){const q=Math.min(end,z+20),a=shoreX(z),b=shoreX(q);v.push(a+from,.018,z,a+from,.018,q,b+to,.018,q,a+from,.018,z,b+to,.018,q,a+to,.018,z); // corrected second vertex below
 const k=v.length-18;v[k+3]=b+from;
 }const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();return g}
export function Beach({map,position,player}:{map:OSMMap;position:Point;player:React.RefObject<Point>}){
 
 const enabled=hasCoast(map),near=position.x>shoreX(position.z)-950;
 const sand=useMemo(()=>strip(-28,0,coastStart,coastEnd),[]),sea=useMemo(()=>strip(0,1800,coastStart,coastEnd),[]);
 const foam=useRef<THREE.Group>(null);
 const palms=useMemo(()=>coastalPalms(map),[map]);
 const waves=useMemo(()=>[2,9,17].map(d=>strip(d,d+1.1,coastStart,coastEnd)),[]);
 useFrame(({clock})=>{if(foam.current){const t=clock.elapsedTime;foam.current.children.forEach((child,i)=>{child.position.x=-((t*.8+i*2)%6);const mat=(child as THREE.Mesh).material as THREE.MeshStandardMaterial;mat.opacity=.15+.45*Math.sin(Math.PI*((t*.8+i*2)%6)/6)})}});
 useEffect(()=>()=>{sand.dispose();sea.dispose();waves.forEach(g=>g.dispose())},[sand,sea,waves]);
 if(!enabled||!near)return null;
 return <group><mesh geometry={sand}><meshStandardMaterial color="#e1cda7" roughness={1}/></mesh><LandmarkWater geometry={sea} sea/><group ref={foam} position={[0,.025,0]}>{waves.map((g,i)=><mesh key={i} geometry={g}><meshStandardMaterial color="#c8e5e5" transparent opacity={.55}/></mesh>)}</group><Vegetation points={palms} player={player} palm/></group>
}
