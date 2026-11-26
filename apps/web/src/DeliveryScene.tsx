import {FaceDetails,ShirtDetails} from './characterVisuals';
import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Point} from './osm';
export type CargoKind='food'|'drink'|'parcel'|'fragile';
export function cargoKind(kind?:string,product?:string):CargoKind{if(kind==='fragile')return 'fragile';if(/trà|cà phê|nước|sinh tố|sữa|coffee/i.test(product??''))return 'drink';return kind==='food'?'food':'parcel'}
export type DeliveryAction={kind:'pickup'|'dropoff';elapsed:number;cargo?:CargoKind};
export function CargoModel({kind}:{kind:CargoKind}){return <group>{kind==='drink'?<><mesh><cylinderGeometry args={[.105,.075,.24,12]}/><meshStandardMaterial color="#d5b18a"/></mesh><mesh position={[0,.125,0]}><cylinderGeometry args={[.115,.115,.025,12]}/><meshStandardMaterial color="#f5f1e8"/></mesh><mesh position={[.025,.19,0]}><cylinderGeometry args={[.012,.012,.14,6]}/><meshStandardMaterial color="#36a58d"/></mesh></>:<><mesh><boxGeometry args={[.30,.23,.25]}/><meshStandardMaterial color={kind==='food'?'#e9d7ac':kind==='fragile'?'#e8e4dc':'#b88b57'}/></mesh>{kind==='food'?<mesh position={[0,.14,0]} rotation={[0,0,0]}><torusGeometry args={[.065,.012,6,12]}/><meshStandardMaterial color="#9a7142"/></mesh>:<mesh position={[0,.118,0]}><boxGeometry args={[.065,.008,.25]}/><meshStandardMaterial color="#e8d6ac"/></mesh>}{kind==='fragile'&&<mesh position={[0,0,.127]}><boxGeometry args={[.12,.08,.005]}/><meshStandardMaterial color="#d33c35"/></mesh>}</>}</group>}

export const DELIVERY_SECONDS=6;
type Pose={stride:number;carry:number;mount:number;phase:number};
function Person({shirt,helmet=false,pose}:{shirt:string;helmet?:boolean;pose?:React.RefObject<Pose>}){
 const body=useRef<THREE.Group>(null),legs=useRef<(THREE.Group|null)[]>([]),arms=useRef<(THREE.Group|null)[]>([]),knees=useRef<(THREE.Group|null)[]>([]);
 useFrame(({clock},dt)=>{const p=pose?.current??{stride:0,carry:0,mount:0,phase:clock.elapsedTime};const damp=THREE.MathUtils.damp;if(body.current){body.current.rotation.x=damp(body.current.rotation.x,p.mount*.22,12,dt);body.current.position.y=damp(body.current.position.y,Math.sin(p.phase*2)*.012*(1-p.stride)-p.mount*.12,12,dt)}for(let i=0;i<2;i++){const s=i===0?-1:1,step=Math.sin(p.phase)*s*p.stride;const l=legs.current[i],k=knees.current[i],a=arms.current[i];if(l)l.rotation.x=damp(l.rotation.x,step*.55-p.mount*.45,14,dt);if(k)k.rotation.x=damp(k.rotation.x,Math.max(0,-step)*.65+p.mount*.6,14,dt);if(a)a.rotation.x=damp(a.rotation.x,-step*.45*(1-p.carry)-p.carry*.95,14,dt)}});
 return <group><group ref={body}><mesh position={[0,1.15,0]}><capsuleGeometry args={[.21,.36,4,8]}/><meshStandardMaterial color={shirt}/></mesh><mesh position={[0,1.65,0]}><sphereGeometry args={[.16,12,8]}/><meshStandardMaterial color="#d9a77f"/></mesh><group position={[0,1.65,0]}><FaceDetails helmet={helmet}/></group><mesh position={[0,1.76,.025]} scale={[.33,.19,.33]}><sphereGeometry args={[.5,12,8]}/><meshStandardMaterial color={helmet?'#263746':'#352a24'}/></mesh><group position={[0,1.15,0]}><ShirtDetails/></group>{[-1,1].map((s,i)=><group key={s} ref={g=>{arms.current[i]=g}} position={[s*.26,1.4,0]}><mesh position={[0,-.14,0]}><capsuleGeometry args={[.075,.18,4,8]}/><meshStandardMaterial color={shirt}/></mesh><group position={[0,-.27,0]} rotation={[-.25,0,0]}><mesh position={[0,-.12,0]}><capsuleGeometry args={[.055,.16,4,8]}/><meshStandardMaterial color="#d9a77f"/></mesh><mesh position={[0,-.25,0]} scale={[.11,.12,.11]}><sphereGeometry args={[.5,10,8]}/><meshStandardMaterial color="#d9a77f"/></mesh></group></group>)}</group>{[-1,1].map((s,i)=><group key={s} ref={g=>{legs.current[i]=g}} position={[s*.12,.88,0]}><mesh position={[0,-.20,0]}><capsuleGeometry args={[.09,.24,4,8]}/><meshStandardMaterial color="#26364a"/></mesh><group ref={g=>{knees.current[i]=g}} position={[0,-.40,0]}><mesh position={[0,-.18,0]}><capsuleGeometry args={[.075,.22,4,8]}/><meshStandardMaterial color="#26364a"/></mesh><mesh position={[0,-.39,-.055]} scale={[.18,.13,.29]}><sphereGeometry args={[.5,10,8]}/><meshStandardMaterial color="#252b30"/></mesh></group></group>)}</group>
}
export function WaitingCustomer({target,stage,player}:{target:Point;stage:string;player:React.RefObject<Point>}){
 const root=useRef<THREE.Group>(null);
 useFrame(()=>{if(root.current)root.current.visible=stage!=='done'&&Math.hypot(player.current.x-target.x,player.current.z-target.z)<80});
 return <group ref={root} position={[target.x,0,target.z]} visible={false}><Person shirt={stage==='pickup'?'#698c65':'#a36b83'}/></group>
}
export function DeliveryScene({action,gender,target}:{action:React.RefObject<DeliveryAction|null>;gender:'male'|'female';target:Point}){
 const root=useRef<THREE.Group>(null),courier=useRef<THREE.Group>(null),parcel=useRef<THREE.Group>(null);
 const world=useRef(new THREE.Vector3());const pose=useRef<Pose>({stride:0,carry:0,mount:0,phase:0});
 useFrame(()=>{const a=action.current,g=root.current,p=courier.current,b=parcel.current;if(!g||!p||!b)return;g.visible=!!a;if(!a)return;
 for(const child of b.children)child.visible=child.name===(a.cargo??'parcel');const t=a.elapsed, parent=g.parent;if(!parent)return;world.current.set(target.x,0,target.z);parent.worldToLocal(world.current);
 const dest=world.current;const side=dest.x<0?-1:1;const smooth=(x:number)=>{const k=THREE.MathUtils.clamp(x,0,1);return k*k*(3-2*k)};const walk=smooth((t-1)/1.4),back=smooth((t-3.3)/1.4);
 const x=side*.85+(dest.x-side*.85)*walk*(1-back),z=.3+(dest.z-.3)*walk*(1-back);
 const walking=t>1&&t<2.4||t>3.3&&t<4.7;const heading=Math.atan2(side*.85-dest.x,.3-dest.z);p.position.set(x,walking?Math.abs(Math.sin(t*12))*.025:0,z);p.rotation.y=heading+Math.PI*smooth((t-2.9)/.4);
 if(t<1){p.position.x=side*.85*smooth(t);p.position.y=.45*(1-smooth(t))}
 if(t>5){p.position.x=side*.85*(1-smooth(t-5));p.position.y=.45*smooth(t-5)}
 const carrying=a.kind==='pickup'?t>=2.4&&t<4.7:t>=1.0&&t<2.8;
 pose.current={stride:walking?1:0,carry:carrying?1:0,mount:t<1?Math.sin(t*Math.PI):t>5?Math.sin((t-5)*Math.PI):0,phase:t*12};
 b.visible=a.kind==='pickup'?t<5.1:t<4.8;
 if(carrying)b.position.set(p.position.x-Math.sin(p.rotation.y)*.28,1.12+p.position.y,p.position.z-Math.cos(p.rotation.y)*.28);
 else if(a.kind==='pickup'&&t>=4.7){const k=Math.min(1,(t-4.7)/.4);b.position.set(side*.85*(1-k),1.12+.18*k,.3+.55*k)}
 else if(a.kind==='dropoff'&&t<1){const k=t;b.position.set(side*.85*k,1.3-.18*k,.85-.55*k)}
 else b.position.set(dest.x,1.12,dest.z-.25);
 });
 return <group ref={root} visible={false}><group ref={courier}><Person shirt={gender==='female'?'#e58ca5':'#3676b7'} helmet pose={pose}/></group><group ref={parcel}>{(['food','drink','parcel','fragile'] as const).map(k=><group key={k} name={k}><CargoModel kind={k}/></group>)}</group></group>
}
