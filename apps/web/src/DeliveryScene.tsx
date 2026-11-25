import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Point} from './osm';
export type CargoKind='food'|'drink'|'parcel'|'fragile';
export function cargoKind(kind?:string,product?:string):CargoKind{if(kind==='fragile')return 'fragile';if(/trà|cà phê|nước|sinh tố|sữa|coffee/i.test(product??''))return 'drink';return kind==='food'?'food':'parcel'}
export type DeliveryAction={kind:'pickup'|'dropoff';elapsed:number;cargo?:CargoKind};
export function CargoModel({kind}:{kind:CargoKind}){return <group>{kind==='drink'?<><mesh><cylinderGeometry args={[.105,.075,.24,12]}/><meshStandardMaterial color="#d5b18a"/></mesh><mesh position={[0,.125,0]}><cylinderGeometry args={[.115,.115,.025,12]}/><meshStandardMaterial color="#f5f1e8"/></mesh><mesh position={[.025,.19,0]}><cylinderGeometry args={[.012,.012,.14,6]}/><meshStandardMaterial color="#36a58d"/></mesh></>:<><mesh><boxGeometry args={[.30,.23,.25]}/><meshStandardMaterial color={kind==='food'?'#e9d7ac':kind==='fragile'?'#e8e4dc':'#b88b57'}/></mesh>{kind==='food'?<mesh position={[0,.14,0]} rotation={[0,0,0]}><torusGeometry args={[.065,.012,6,12]}/><meshStandardMaterial color="#9a7142"/></mesh>:<mesh position={[0,.118,0]}><boxGeometry args={[.065,.008,.25]}/><meshStandardMaterial color="#e8d6ac"/></mesh>}{kind==='fragile'&&<mesh position={[0,0,.127]}><boxGeometry args={[.12,.08,.005]}/><meshStandardMaterial color="#d33c35"/></mesh>}</>}</group>}

export const DELIVERY_SECONDS=6;
function Person({shirt,helmet=false}:{shirt:string;helmet?:boolean}){
 return <group><mesh position={[0,1.15,0]}><capsuleGeometry args={[.21,.36,4,8]}/><meshStandardMaterial color={shirt}/></mesh><mesh position={[0,1.65,0]}><sphereGeometry args={[.16,12,8]}/><meshStandardMaterial color={helmet?'#263746':'#d9a77f'}/></mesh>{[-1,1].map(s=><group key={s}><mesh position={[s*.12,.43,0]}><capsuleGeometry args={[.09,.62,4,8]}/><meshStandardMaterial color="#26364a"/></mesh><mesh position={[s*.27,1.12,-.17]} rotation={[.85,0,0]}><capsuleGeometry args={[.065,.36,4,8]}/><meshStandardMaterial color="#d9a77f"/></mesh></group>)}</group>
}
export function WaitingCustomer({target,stage,player}:{target:Point;stage:string;player:React.RefObject<Point>}){
 const root=useRef<THREE.Group>(null);
 useFrame(()=>{if(root.current)root.current.visible=stage!=='done'&&Math.hypot(player.current.x-target.x,player.current.z-target.z)<80});
 return <group ref={root} position={[target.x,0,target.z]} visible={false}><Person shirt={stage==='pickup'?'#698c65':'#a36b83'}/></group>
}
export function DeliveryScene({action,gender,target}:{action:React.RefObject<DeliveryAction|null>;gender:'male'|'female';target:Point}){
 const root=useRef<THREE.Group>(null),courier=useRef<THREE.Group>(null),parcel=useRef<THREE.Group>(null);
 const world=useRef(new THREE.Vector3());
 useFrame(()=>{const a=action.current,g=root.current,p=courier.current,b=parcel.current;if(!g||!p||!b)return;g.visible=!!a;if(!a)return;
 for(const child of b.children)child.visible=child.name===(a.cargo??'parcel');const t=a.elapsed, parent=g.parent;if(!parent)return;world.current.set(target.x,0,target.z);parent.worldToLocal(world.current);
 const dest=world.current;const side=dest.x<0?-1:1;const walk=Math.min(1,Math.max(0,(t-1)/1.4)),back=Math.min(1,Math.max(0,(t-3.3)/1.4));
 const x=side*.85+(dest.x-side*.85)*walk*(1-back),z=.3+(dest.z-.3)*walk*(1-back);
 p.position.set(x,Math.sin(t*12)*.035*(t>1&&t<4.7?1:0),z);p.rotation.y=Math.atan2(x-dest.x,z-dest.z);
 if(t<1){p.position.x=side*.85*t;p.position.y=.45*(1-t)}
 if(t>5){p.position.x=side*.85*(6-t);p.position.y=.45*(t-5)}
 const carrying=a.kind==='pickup'?t>=2.4&&t<4.7:t>=1.0&&t<2.8;
 b.visible=a.kind==='pickup'?t<5.1:t<4.8;
 if(carrying)b.position.set(p.position.x-Math.sin(p.rotation.y)*.28,1.12+p.position.y,p.position.z-Math.cos(p.rotation.y)*.28);
 else if(a.kind==='pickup'&&t>=4.7){const k=Math.min(1,(t-4.7)/.4);b.position.set(side*.85*(1-k),1.12+.18*k,.3+.55*k)}
 else if(a.kind==='dropoff'&&t<1){const k=t;b.position.set(side*.85*k,1.3-.18*k,.85-.55*k)}
 else b.position.set(dest.x,1.12,dest.z-.25);
 });
 return <group ref={root} visible={false}><group ref={courier}><Person shirt={gender==='female'?'#e58ca5':'#3676b7'} helmet/></group><group ref={parcel}>{(['food','drink','parcel','fragile'] as const).map(k=><group key={k} name={k}><CargoModel kind={k}/></group>)}</group></group>
}
