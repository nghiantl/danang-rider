import {CargoModel,type CargoKind,type DeliveryAction} from './DeliveryScene';
import {memo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
type Motion={speed:number;steer:number;distance:number;brake:boolean};
type V=[number,number,number];
function Dashboard({motion}:{motion:React.RefObject<Motion>}){const needle=useRef<THREE.Group>(null);useFrame(()=>{if(needle.current)needle.current.rotation.y=-1.2+Math.min(1,Math.abs(motion.current.speed)/30)*2.4});return <group position={[0,1.218,-.49]}><mesh><cylinderGeometry args={[.068,.068,.012,24]}/><meshStandardMaterial color="#15242d"/></mesh>{Array.from({length:9},(_,i)=><group key={i} rotation={[0,-1.2+i*.3,0]}><Body at={[0,.009,-.055]} size={[.005,.005,.012]} color="#c9e7ef"/></group>)}<group ref={needle}><Body at={[0,.014,-.025]} size={[.006,.005,.05]} color="#ff6945"/></group></group>}
const glowVertex='varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const glowFragment='varying vec2 vUv; uniform vec3 tint; uniform float strength; void main(){float d=length((vUv-0.5)*2.0);float a=1.0-smoothstep(0.0,1.0,d);gl_FragColor=vec4(tint,a*a*strength);}';
function Body({at,size,color,round=false,metal=0}:{at:V;size:V;color:string;round?:boolean;metal?:number}){
 return <mesh position={at} scale={size}>{round?<sphereGeometry args={[0.5,16,12]}/>:<boxGeometry/>}<meshStandardMaterial color={color} roughness={metal?0.32:0.55} metalness={metal}/></mesh>;
}
function Limb({a,b,r,color}:{a:V;b:V;r:number;color:string}){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
 const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
 return <mesh position={start.add(end).multiplyScalar(0.5)} quaternion={q}><capsuleGeometry args={[r,Math.max(0.01,delta.length()-2*r),4,8]}/><meshStandardMaterial color={color}/></mesh>;
}
function Wheel({spin}:{spin:React.RefObject<THREE.Group|null>}){
 return <group ref={spin}><mesh rotation={[0,Math.PI/2,0]}><torusGeometry args={[0.25,0.075,12,32]}/><meshStandardMaterial color="#20252a" roughness={.92}/></mesh>
 <mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.18,0.18,0.09,24]}/><meshStandardMaterial color="#aab3bb" metalness={0.65} roughness={0.35}/></mesh>
 {[0,1,2,3,4].map(i=><group key={i} rotation={[i*Math.PI/5,0,0]}><Body at={[0.055,0,0]} size={[0.025,0.43,0.035]} color="#454d55" metal={0.5}/></group>)}<mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.095,0.095,0.13,12]}/><meshStandardMaterial color="#626c74" metalness={0.6}/></mesh></group>;
}
export const RiderModel=memo(function RiderModel({cargo=[],vehicle,gender,motion,action,dismounted=false,firstPerson=false,customPaint,boxPaint}:{cargo?:CargoKind[];customPaint?:string;boxPaint?:string;firstPerson?:boolean;dismounted?:boolean;action:React.RefObject<DeliveryAction|null>;vehicle:'petrol'|'electric';gender:'male'|'female';motion:React.RefObject<Motion>}){
 const lean=useRef<THREE.Group>(null),front=useRef<THREE.Group>(null),fw=useRef<THREE.Group>(null),rw=useRef<THREE.Group>(null),lamp=useRef<THREE.MeshStandardMaterial>(null),headlight=useRef<THREE.SpotLight>(null),aim=useRef<THREE.Object3D>(null),brakeGlow=useRef<THREE.Mesh>(null);
 const indicators=useRef<(THREE.MeshStandardMaterial|null)[]>([]);const lid=useRef<THREE.Group>(null);const last=useRef(0);const seated=useRef<THREE.Group>(null);
 useFrame((_,dt)=>{const m=motion.current;if(!m)return;const a=action.current,t=a?.elapsed??0;const open=!!a&&(a.kind==='pickup'?t>4.2&&t<5.5:t<1.25);if(lid.current)lid.current.rotation.x=THREE.MathUtils.damp(lid.current.rotation.x,open?-1.65:0,12,dt);if(seated.current)seated.current.visible=!action.current&&!dismounted;const step=m.distance-last.current;last.current=m.distance;
 if(lean.current)lean.current.rotation.z=THREE.MathUtils.damp(lean.current.rotation.z,m.steer*Math.min(Math.abs(m.speed)/8,1)*0.23,8,dt);
 if(front.current)front.current.rotation.y=THREE.MathUtils.damp(front.current.rotation.y,m.steer*0.24,10,dt);
 for(const w of [fw.current,rw.current])if(w)w.rotation.x-=step/0.325;
 for(let i=0;i<2;i++){const mat=indicators.current[i];if(mat)mat.emissiveIntensity=Math.abs(m.steer)>.25&&Math.sign(m.steer)===(i===0?-1:1)&&Math.floor(performance.now()/350)%2===0?2.8:.05;}if(lamp.current)lamp.current.emissiveIntensity=m.brake?3:0.55;
 if(brakeGlow.current)brakeGlow.current.visible=m.brake;
 if(headlight.current&&aim.current){headlight.current.target=aim.current;headlight.current.intensity=85;}
 });
 const electric=vehicle==='electric',paint=customPaint??(electric?'#36b6a7':'#d94b39'),shirt=gender==='female'?'#e58ca5':'#3676b7',skin='#d9a77f',pants='#26364a';
 return <group>
 <mesh position={[0,0.115,-6.3]} rotation={[-Math.PI/2,0,0]} renderOrder={2}>
 <planeGeometry args={[5.4,11]}/><shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} uniforms={{tint:{value:new THREE.Color('#fff0bd')},strength:{value:0.48}}} vertexShader={glowVertex} fragmentShader={glowFragment}/>
 </mesh>
 <mesh ref={brakeGlow} visible={false} position={[0,0.116,1.6]} rotation={[-Math.PI/2,0,0]} renderOrder={2}>
 <planeGeometry args={[3.2,3.5]}/><shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} uniforms={{tint:{value:new THREE.Color('#ff2418')},strength:{value:0.85}}} vertexShader={glowVertex} fragmentShader={glowFragment}/>
 </mesh>
 <group ref={lean}>
 <group position={[0,0.325,-0.68]} ref={front}><Wheel spin={fw}/><Limb a={[-0.11,0,0]} b={[-0.11,0.65,0.12]} r={0.045} color="#aeb7bd"/><Limb a={[0.11,0,0]} b={[0.11,0.65,0.12]} r={0.045} color="#aeb7bd"/><Body at={[0,0.29,0]} size={[0.32,0.13,0.62]} color={paint} round/></group>
 <group position={[0,0.325,0.65]}><Wheel spin={rw}/></group>{[-1,1].map(side=><group key={"shock"+side}><Limb a={[side*.17,.34,.65]} b={[side*.17,.76,.40]} r={.035} color="#b3bbc0"/>{Array.from({length:6},(_,i)=><Body key={i} at={[side*.17,.39+i*.055,.62-i*.033]} size={[.10,.025,.10]} color="#414b53" round metal={.4}/>)}</group>)}
 <Body at={[0,0.52,0.05]} size={[0.43,0.3,1.25]} color="#303940" round/>
 <Body at={[0,0.69,0.37]} size={[0.52,0.48,0.92]} color={paint} round/>
 <Body at={[0,0.83,-0.46]} size={[0.43,0.72,0.42]} color={paint} round/>
 <Body at={[0,0.48,-0.16]} size={[0.45,0.12,0.65]} color="#343b40"/>
 <Body at={[0,.76,-.34]} size={[.48,.44,.27]} color={paint} round/><Body at={[0,.70,-.48]} size={[.32,.22,.09]} color="#303b43" round/><Body at={[0,0.95,0.27]} size={[0.43,0.16,0.78]} color="#20272e" round/>
 <mesh position={[0,1.05,-0.66]} scale={[0.32,0.17,0.10]}><sphereGeometry args={[0.5,16,12]}/><meshStandardMaterial color="#fff4cc" emissive="#fff1ce" emissiveIntensity={1.3}/></mesh>
 <object3D ref={aim} position={[0,0,-12]}/><spotLight ref={headlight} position={[0,1.05,-0.72]} color="#fff1d5" angle={0.38} penumbra={0.65} distance={22} decay={2} castShadow={false}/>
 <Body at={[0,1.13,-0.51]} size={[0.35,0.13,0.24]} color="#202b35" round/>
 <Body at={[0,1.20,-0.49]} size={[0.21,0.025,0.12]} color="#17232b"/><Dashboard motion={motion}/>
 {[-1,1].map(side=><group key={'trim'+side}><Body at={[side*0.22,0.71,0.38]} size={[0.065,0.11,0.64]} color={electric?'#c3f5e9':'#e8e4da'} round/><mesh position={[side*.17,1.01,-.64]} scale={[.075,.07,.08]}><sphereGeometry args={[.5,12,8]}/><meshStandardMaterial ref={mat=>{indicators.current[side===-1?0:1]=mat}} color="#e8a33a" emissive="#ff9a18" emissiveIntensity={.05}/></mesh></group>)}
 <Body at={[0,0.59,0.65]} size={[0.33,0.12,0.55]} color={paint} round/>
 {electric?<><Body at={[0,0.49,0.19]} size={[0.37,0.21,0.53]} color="#263b43" round/><Body at={[0.195,0.53,0.19]} size={[0.015,0.09,0.25]} color="#65e6c3"/></>:<Body at={[-0.20,0.45,0.37]} size={[0.16,0.25,0.32]} color="#69747c" round metal={0.5}/>}
 {!electric&&<>{Array.from({length:5},(_,i)=><Body key={i} at={[-.23,.36+i*.035,.37]} size={[.16,.018,.26]} color="#a0a9af" metal={.5}/>)}<Body at={[.25,.37,.78]} size={[.085,.085,.025]} color="#20272b" round/></>}<Body at={[0,0.64,0.91]} size={[0.22,0.12,0.035]} color="#f3eee0"/>
 <Body at={[0,0.64,0.932]} size={[0.15,0.035,0.008]} color="#343a40"/>
 <mesh position={[0,0.79,0.81]}><boxGeometry args={[0.28,0.1,0.05]}/><meshStandardMaterial ref={lamp} color="#d32d28" emissive="#ff2010" emissiveIntensity={0.25}/></mesh>
 {!electric&&<Body at={[0.25,0.37,0.48]} size={[0.12,0.13,0.58]} color="#a1a7ac" round metal={0.7}/>}
 <Body at={[0,1.16,-0.48]} size={[0.68,0.055,0.07]} color="#242b32"/>
 {[-1,1].map(side=><group key={side}><Limb a={[side*0.27,1.15,-0.48]} b={[side*0.39,1.42,-0.48]} r={0.022} color="#555e65"/><Body at={[side*.39,1.43,-.48]} size={[.19,.12,.05]} color="#222b32" round/><Body at={[side*.39,1.43,-.452]} size={[.16,.09,.018]} color="#a9c7d2" round metal={.7}/><Body at={[side*.32,1.16,-.48]} size={[.13,.075,.075]} color="#24292d" round/><Body at={[side*.31,1.145,-.55]} size={[.13,.025,.035]} color="#b7c0c6" metal={.6}/>
 </group>)}
 <group ref={seated}>{[-1,1].map(side=><group key={side}><Limb a={[side*0.14,1.03,0.24]} b={[side*0.22,0.78,-0.12]} r={0.105} color={pants}/><Limb a={[side*0.22,0.78,-0.12]} b={[side*0.18,0.51,-0.12]} r={0.085} color={pants}/><Body at={[side*0.18,0.51,-0.2]} size={[0.17,0.12,0.29]} color="#20272d" round/>
 <Limb a={[side*0.19,1.48,0.12]} b={[side*0.28,1.28,-0.17]} r={0.075} color={shirt}/><Limb a={[side*0.28,1.28,-0.17]} b={[side*0.32,1.16,-0.48]} r={0.055} color={skin}/><Body at={[side*0.32,1.16,-0.48]} size={[0.12,0.12,0.12]} color={skin} round/></group>)}
 <Body at={[0,1.31,0.18]} size={[gender==='female'?0.39:0.46,0.57,0.32]} color={shirt} round/>
 {!firstPerson&&<>
 <Body at={[0,1.65,0.08]} size={[0.14,0.19,0.14]} color={skin} round/>
 <Body at={[0,1.79,0.06]} size={[0.29,0.34,0.29]} color={skin} round/>
 <Body at={[0,1.88,0.08]} size={[0.35,0.29,0.36]} color="#263746" round/>
 <Body at={[0,1.86,-0.085]} size={[0.29,0.12,0.09]} color="#7797a8" round/>
 {gender==='female'&&<Body at={[0,1.65,0.24]} size={[0.13,0.31,0.13]} color="#332720" round/>}
 </>}
 </group>
 <Body at={[0,0.99,0.85]} size={[0.54,0.055,0.48]} color="#303a43" metal={0.4}/>
 <Body at={[0,1.04,.85]} size={[.49,.055,.42]} color={boxPaint??"#e7b84b"}/>{[-1,1].map(side=><group key={side}><Body at={[side*.23,1.24,.85]} size={[.035,.38,.42]} color={boxPaint??"#e7b84b"}/><Body at={[0,1.24,.85+side*.195]} size={[.49,.38,.035]} color={boxPaint??"#e7b84b"}/></group>)}{cargo.map((kind,i)=><group key={i} position={[cargo.length===1?0:(i-.5)*.22,1.19,.85]} scale={[.65,.65,.65]}><CargoModel kind={kind}/></group>)}<group ref={lid} position={[0,1.46,.63]}><Body at={[0,0,.22]} size={[.52,.055,.45]} color={boxPaint??"#f4ce68"}/></group>
 <Body at={[0,1.36,1.066]} size={[0.48,0.035,0.012]} color="#65502c"/>
 <Body at={[0,1.20,1.066]} size={[0.34,0.08,0.015]} color="#fff0b8"/>
 {[-1,1].map(side=><group key={'box'+side}><Body at={[side*0.17,1.23,1.07]} size={[0.035,0.39,0.018]} color="#55504a"/><Body at={[side*0.249,1.18,0.85]} size={[0.012,0.065,0.30]} color="#fff0b8"/></group>)}
 </group></group>;
});
