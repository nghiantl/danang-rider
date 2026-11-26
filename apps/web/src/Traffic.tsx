import type {EnvironmentCollider} from './environmentCollision';
import {vehicleCollider,penetration,type VehicleCollider} from './vehicleCollision';
import {useMemo,useRef,useLayoutEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Road,Point} from './osm';
import {lanesFor,pose,advance,signalsFor,desiredSpeed,insideJunction,type Car} from './traffic';
import {SignalPoles} from './SignalPoles';
const COUNT=20;
export function Traffic({roads,player,vehicles,crossingPeople,signalColliders}:{signalColliders:React.RefObject<EnvironmentCollider[]>;crossingPeople:React.RefObject<Point[]>;roads:Road[];player:React.RefObject<Point>;vehicles:React.RefObject<VehicleCollider[]>}){
 const lanes=useMemo(()=>lanesFor(roads),[roads]);
 const indexed=useMemo(()=>lanes.map((l,i)=>({l,i})),[lanes]);
 const signals=useMemo(()=>signalsFor(lanes),[lanes]);
 const brakes=useRef<THREE.InstancedMesh>(null);
 const colors=useMemo(()=>({red:new THREE.Color('#ff2929'),yellow:new THREE.Color('#ffcb22'),green:new THREE.Color('#24e85a'),dim:new THREE.Color('#651d20')}),[]);
 const localCache=useRef<{l:ReturnType<typeof lanesFor>[number];i:number}[]>([]),lastScan=useRef(-10);
 const cars=useRef<Car[]>([]),body=useRef<THREE.InstancedMesh>(null),top=useRef<THREE.InstancedMesh>(null),wheels=useRef<THREE.InstancedMesh>(null);
 const details=useRef<THREE.InstancedMesh>(null),lights=useRef<THREE.InstancedMesh>(null),rims=useRef<THREE.InstancedMesh>(null);
 const wheelGeometry=useMemo(()=>{const g=new THREE.CylinderGeometry(0.5,0.5,1,12);g.rotateZ(Math.PI/2);return g},[]);
 const dummy=useMemo(()=>new THREE.Object3D(),[]);const tintColor=useMemo(()=>new THREE.Color(),[]);
 useLayoutEffect(()=>{cars.current=[];vehicles.current=[];lastScan.current=-10;for(let i=0;i<COUNT;i++){body.current?.setColorAt(i,new THREE.Color(['#d9dce1','#bf5348','#477eab','#e2bc66','#3d474d'][i%5]));top.current?.setColorAt(i,new THREE.Color(i%3===0?'#536b79':'#263d4a'))}if(body.current?.instanceColor)body.current.instanceColor.needsUpdate=true;if(top.current?.instanceColor)top.current.instanceColor.needsUpdate=true},[lanes]);
 useFrame((state,raw)=>{
 if(!body.current||!top.current||!wheels.current||!details.current||!lights.current||!rims.current)return;
 const p=player.current,dt=Math.min(raw,0.05);
 const time=state.clock.elapsedTime;
 if(time-lastScan.current>0.5){lastScan.current=time;localCache.current=indexed.filter(({l})=>Math.hypot((l.a.x+l.b.x)/2-p.x,(l.a.z+l.b.z)/2-p.z)<180)}
 const local=localCache.current;
 const place=(mesh:THREE.InstancedMesh,i:number,x:number,y:number,z:number,h:number,w:number,height:number,d:number)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,h,0);dummy.scale.set(w,height,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)};
 const published:VehicleCollider[]=[];
 const targets=cars.current.map(c=>c?desiredSpeed(c,lanes,cars.current,p,signals,time,crossingPeople.current):0);
 for(let i=0;i<COUNT;i++){
 let c=cars.current[i];let q=c?pose(lanes[c.lane],c.t):null;
 const before=c?{...c}:null;
 if(c){const target=targets[i]??0;c.speed=Math.min(target,c.speed+3*dt);}
 if(!c||!q||Math.hypot(q.x-p.x,q.z-p.z)>240||!advance(c,lanes,dt)){
 const choices=local.filter(({l})=>{const q=pose(l,l.length/2);return !insideJunction(l,l.length/2,lanes,signals)&&Math.hypot(q.x-p.x,q.z-p.z)>30&&cars.current.every(other=>{if(!other)return true;const o=pose(lanes[other.lane],other.t);return Math.hypot(q.x-o.x,q.z-o.z)>8})});
 if(choices.length){const {l,i:id}=choices[Math.floor(Math.random()*choices.length)];c={lane:id,t:l.length/2,speed:0,cruise:5+Math.random()*5,kind:i%3===0?1:0};cars.current[i]=c;q=pose(l,c.t)}else{delete cars.current[i];q=null}
 }else {q=pose(lanes[c.lane],c.t);if(before&&penetration(p.x,p.z,1.15,vehicleCollider(q.x,q.z,q.heading,c.kind))>0){Object.assign(c,before);c.speed=0;q=pose(lanes[c.lane],c.t);}}
 if(!q){for(let j=0;j<14;j++)place(details.current,i*14+j,0,-100,0,0,0,0,0);for(let j=0;j<4;j++){place(lights.current,i*4+j,0,-100,0,0,0,0,0);place(rims.current,i*4+j,0,-100,0,0,0,0,0)}if(brakes.current)place(brakes.current,i,0,-100,0,0,0,0,0);place(body.current,i,0,-100,0,0,0,0,0);place(top.current,i,0,-100,0,0,0,0,0);for(let j=0;j<4;j++)place(wheels.current,i*4+j,0,-100,0,0,0,0,0);continue}
 if(!c)continue;
 published.push(vehicleCollider(q.x,q.z,q.heading,c.kind));
 const car=c.kind===1,w=car?1.65:0.48,d=car?3.6:1.65,h=q.heading;
 const origin=q;
 const localPart=(mesh:THREE.InstancedMesh,index:number,x:number,y:number,z:number,width:number,height:number,depth:number)=>place(mesh,index,origin.x+Math.cos(h)*x+Math.sin(h)*z,y,origin.z-Math.sin(h)*x+Math.cos(h)*z,h,width,height,depth);
 const suv=i%2===0,roof=car?(suv?1.43:1.26):1.16;
 localPart(body.current,i,0,car?0.64:0.58,0,w,car?0.74:0.44,d);
 localPart(top.current,i,0,roof,car?-0.15:0,car?1.42:0.36,car?(suv?0.69:0.54):0.64,car?(suv?2.25:1.75):0.42);
 const braking=c.speed<(c.cruise??8)-0.5;
 if(brakes.current){localPart(brakes.current,i,0,car?0.76:0.67,-d*0.495,car?1.32:0.29,0.09,0.045);brakes.current.setColorAt(i,braking?colors.red:colors.dim)}
 const parts=car?[
 [0,roof+0.31,-0.15,1.28,0.09,suv?1.9:1.45,'paint'],
 [0,0.92,1.12,1.46,0.16,1.12,'paint'],
 [0,0.88,-1.3,1.48,0.18,0.72,'paint'],
 [0,0.42,1.75,1.55,0.16,0.10,'trim'],
 [0,0.42,-1.75,1.55,0.16,0.10,'trim'],
 [-0.77,1.06,0.62,0.11,0.13,0.22,'paint'],
 [0.77,1.06,0.62,0.11,0.13,0.22,'paint'],
 [0,0.64,1.80,0.72,0.18,0.025,'trim'],
 [0,0.52,-1.80,0.35,0.12,0.025,'plate'],
 [0,0.52,1.80,0.35,0.12,0.025,'plate'],[-.72,1.20,-.15,.045,.42,.065,'paint'],[.72,1.20,-.15,.045,.42,.065,'paint'],[-.82,.77,0,.025,.055,1.55,'trim'],[.82,.77,0,.025,.055,1.55,'trim']
 ]:[
 [0,0.84,-0.26,0.36,0.12,0.62,'trim'],
 [0,0.72,0.54,0.38,0.52,0.28,'paint'],
 [0,0.44,0.52,0.40,0.12,0.45,'paint'],
 [0,0.44,-0.52,0.38,0.12,0.42,'paint'],
 [0,1.03,0.52,0.46,0.07,0.12,'trim'],
 [0,1.52,0.03,0.28,0.31,0.28,'helmet'],
 [-0.14,0.78,0.03,0.13,0.52,0.20,'trim'],
 [0.14,0.78,0.03,0.13,0.52,0.20,'trim'],
 [-0.17,1.14,0.24,0.12,0.15,0.46,'jacket'],
 [0.17,1.14,0.24,0.12,0.15,0.46,'jacket'],[-.18,.45,-.20,.10,.15,.46,'trim'],[.18,.45,-.20,.10,.15,.46,'trim'],[-.23,1.22,.52,.10,.07,.07,'mirror'],[.23,1.22,.52,.10,.07,.07,'mirror']
 ];
 for(let j=0;j<14;j++){const [x,y,z,width,height,depth,tint]=parts[j] as [number,number,number,number,number,number,string];localPart(details.current,i*14+j,x,y,z,width,height,depth);details.current.setColorAt(i*14+j,tintColor.set(tint==='paint'?['#d9dce1','#bf5348','#477eab','#e2bc66','#3d474d'][i%5]:tint==='mirror'?'#a9c7d2':tint==='plate'?'#e8e8dd':tint==='helmet'?'#d9dce1':tint==='jacket'?'#536b79':'#252b30'))}
 for(let j=0;j<4;j++){const side=j%2?1:-1,along=j<2?1:-1;const x=car?side*w*0.44:0,z=car?along*d*0.34:along*d*0.34;const active=car||j%2===0;localPart(wheels.current,i*4+j,x,0.28,z,active?(car?0.22:0.16):0,active?0.52:0,active?0.52:0);localPart(rims.current,i*4+j,x,0.28,z,active?(car?0.235:0.175):0,active?0.32:0,active?0.32:0);localPart(lights.current,i*4+j,car?side*0.59:0,car?0.79:0.83,along*d*0.495,active?(car?0.34:0.24):0,active?0.12:0,active?0.055:0);lights.current.setColorAt(i*4+j,tintColor.set(along===1?'#fff1c6':braking?'#ff2929':'#8a2225'))}

 }

 vehicles.current=published;
 if(brakes.current){brakes.current.instanceMatrix.needsUpdate=true;if(brakes.current.instanceColor)brakes.current.instanceColor.needsUpdate=true;}
 for(const mesh of [body.current,top.current,wheels.current,details.current,lights.current,rims.current]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 });
 return <group><SignalPoles lanes={lanes} signals={signals} player={player} signalColliders={signalColliders}/><instancedMesh ref={brakes} args={[undefined,undefined,COUNT]} frustumCulled={false}><boxGeometry/><meshBasicMaterial/></instancedMesh><instancedMesh ref={body} args={[undefined,undefined,COUNT]} frustumCulled={false}><sphereGeometry args={[0.5,16,12]}/><meshStandardMaterial roughness={0.42} metalness={0.15}/></instancedMesh><instancedMesh ref={top} args={[undefined,undefined,COUNT]} frustumCulled={false}><sphereGeometry args={[0.5,12,8]}/><meshStandardMaterial roughness={0.35}/></instancedMesh><instancedMesh ref={wheels} args={[undefined,undefined,COUNT*4]} frustumCulled={false}><primitive object={wheelGeometry} attach="geometry"/><meshStandardMaterial color="#22282d"/></instancedMesh><instancedMesh ref={details} args={[undefined,undefined,COUNT*14]} frustumCulled={false}><boxGeometry/><meshStandardMaterial roughness={0.55}/></instancedMesh><instancedMesh ref={lights} args={[undefined,undefined,COUNT*4]} frustumCulled={false}><boxGeometry/><meshBasicMaterial/></instancedMesh><instancedMesh ref={rims} args={[undefined,undefined,COUNT*4]} frustumCulled={false}><primitive object={wheelGeometry} attach="geometry"/><meshStandardMaterial color="#a5adb3" metalness={0.35} roughness={0.5}/></instancedMesh></group>
}
