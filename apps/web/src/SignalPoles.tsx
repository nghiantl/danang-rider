import {useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {signalState,signalApproaches,type Lane,type Signal} from './traffic';
import type {Point} from './osm';
type Approach=ReturnType<typeof signalApproaches>[number];
const palette={red:'#ff3434',yellow:'#ffcf28',green:'#35ed67'};
function Pole({a,player}:{a:Approach;player:React.RefObject<Point>}){
 const group=useRef<THREE.Group>(null),lights=useRef<(THREE.MeshBasicMaterial|null)[]>([]),last=useRef('');
 const board=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return {canvas,texture}},[]);
 useEffect(()=>()=>board.texture.dispose(),[board]);
 useFrame(({clock})=>{
 if(!group.current)return;
 group.current.visible=Math.hypot(a.x-player.current.x,a.z-player.current.z)<160;
 if(!group.current.visible)return;
 const {color,remaining}=signalState(a.signal,a.axis,clock.elapsedTime),key=color+remaining;
 if(last.current===key)return;last.current=key;
 (['red','yellow','green'] as const).forEach((c,i)=>lights.current[i]?.color.set(c===color?palette[c]:'#20272a'));
 const ctx=board.canvas.getContext('2d');if(ctx){ctx.fillStyle='#101518';ctx.fillRect(0,0,128,64);ctx.fillStyle=palette[color];ctx.font='bold 54px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(remaining).padStart(2,'0'),64,34);board.texture.needsUpdate=true}
 });
 return <group ref={group} position={[a.x,0,a.z]} rotation={[0,a.heading,0]}>
 <mesh position={[0,0.12,0]}><cylinderGeometry args={[0.22,0.3,0.24,8]}/><meshStandardMaterial color="#777e82"/></mesh>
 <mesh position={[0,1.75,0]}><cylinderGeometry args={[0.065,0.085,3.5,8]}/><meshStandardMaterial color="#777e82"/></mesh>
 <mesh position={[0,3.35,0]}><boxGeometry args={[0.43,1.02,0.23]}/><meshStandardMaterial color="#20272a"/></mesh>
 {['red','yellow','green'].map((c,i)=><mesh key={c} position={[0,3.67-i*0.32,0.125]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[0.12,0.12,0.035,16]}/><meshBasicMaterial ref={m=>{lights.current[i]=m}} color="#20272a"/></mesh>)}
 <mesh position={[0,4.04,0]}><boxGeometry args={[0.65,0.35,0.23]}/><meshStandardMaterial color="#20272a"/></mesh>
 <mesh position={[0,4.04,0.121]}><planeGeometry args={[0.59,0.29]}/><meshBasicMaterial map={board.texture}/></mesh>
 </group>
}
export function SignalPoles({lanes,signals,player}:{lanes:Lane[];signals:Map<string,Signal>;player:React.RefObject<Point>}){
 const approaches=useMemo(()=>signalApproaches(lanes,signals),[lanes,signals]);
 return <group>{approaches.map((a,i)=><Pole key={i} a={a} player={player}/>)}</group>
}
