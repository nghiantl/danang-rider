import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Point} from './osm';
export type DeliveryAction={kind:'pickup'|'dropoff';elapsed:number};
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
 const root=useRef<THREE.Group>(null),courier=useRef<THREE.Group>(null),parcel=useRef<THREE.Mesh>(null);
 const world=useRef(new THREE.Vector3());
 useFrame(()=>{const a=action.current,g=root.current,p=courier.current,b=parcel.current;if(!g||!p||!b)return;g.visible=!!a;if(!a)return;
 const t=a.elapsed, parent=g.parent;if(!parent)return;world.current.set(target.x,0,target.z);parent.worldToLocal(world.current);
 const dest=world.current;const side=dest.x<0?-1:1;const walk=Math.min(1,Math.max(0,(t-1)/1.4)),back=Math.min(1,Math.max(0,(t-3.3)/1.4));
 const x=side*.85+(dest.x-side*.85)*walk*(1-back),z=.3+(dest.z-.3)*walk*(1-back);
 p.position.set(x,Math.sin(t*12)*.035*(t>1&&t<4.7?1:0),z);p.rotation.y=Math.atan2(x-dest.x,z-dest.z);
 if(t<1){p.position.x=side*.85*t;p.position.y=.45*(1-t)}
 if(t>5){p.position.x=side*.85*(6-t);p.position.y=.45*(t-5)}
 const carrying=a.kind==='pickup'?t>=2.4&&t<4.8:t>=.8&&t<2.8;
 b.visible=carrying||(a.kind==='pickup'&&t<2.4)||(a.kind==='dropoff'&&t>=2.8&&t<4.8);
 if(carrying)b.position.set(p.position.x,1.12+p.position.y,p.position.z-.25);else b.position.set(dest.x,1.12,dest.z-.25);
 });
 return <group ref={root} visible={false}><group ref={courier}><Person shirt={gender==='female'?'#e58ca5':'#3676b7'} helmet/></group><mesh ref={parcel}><boxGeometry args={[.32,.25,.28]}/><meshStandardMaterial color="#c89a60"/></mesh></group>
}
