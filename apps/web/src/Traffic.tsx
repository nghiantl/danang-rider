import {vehicleCollider,penetration,type VehicleCollider} from './vehicleCollision';
import {useMemo,useRef,useLayoutEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Road,Point} from './osm';
import {lanesFor,pose,advance,signalsFor,desiredSpeed,insideJunction,type Car} from './traffic';
import {SignalPoles} from './SignalPoles';
const COUNT=20;
export function Traffic({roads,player,vehicles}:{roads:Road[];player:React.RefObject<Point>;vehicles:React.RefObject<VehicleCollider[]>}){
 const lanes=useMemo(()=>lanesFor(roads),[roads]);
 const indexed=useMemo(()=>lanes.map((l,i)=>({l,i})),[lanes]);
 const signals=useMemo(()=>signalsFor(lanes),[lanes]);
 const brakes=useRef<THREE.InstancedMesh>(null);
 const colors=useMemo(()=>({red:new THREE.Color('#ff2929'),yellow:new THREE.Color('#ffcb22'),green:new THREE.Color('#24e85a'),dim:new THREE.Color('#651d20')}),[]);
 const localCache=useRef<{l:ReturnType<typeof lanesFor>[number];i:number}[]>([]),lastScan=useRef(-10);
 const cars=useRef<Car[]>([]),body=useRef<THREE.InstancedMesh>(null),top=useRef<THREE.InstancedMesh>(null),wheels=useRef<THREE.InstancedMesh>(null);
 const dummy=useMemo(()=>new THREE.Object3D(),[]);
 useLayoutEffect(()=>{cars.current=[];vehicles.current=[];lastScan.current=-10;for(let i=0;i<COUNT;i++){body.current?.setColorAt(i,new THREE.Color(['#d9dce1','#bf5348','#477eab','#e2bc66','#3d474d'][i%5]));top.current?.setColorAt(i,new THREE.Color(i%3===0?'#536b79':'#263d4a'))}if(body.current?.instanceColor)body.current.instanceColor.needsUpdate=true;if(top.current?.instanceColor)top.current.instanceColor.needsUpdate=true},[lanes]);
 useFrame((state,raw)=>{
 if(!body.current||!top.current||!wheels.current)return;
 const p=player.current,dt=Math.min(raw,0.05);
 const time=state.clock.elapsedTime;
 if(time-lastScan.current>0.5){lastScan.current=time;localCache.current=indexed.filter(({l})=>Math.hypot((l.a.x+l.b.x)/2-p.x,(l.a.z+l.b.z)/2-p.z)<180)}
 const local=localCache.current;
 const place=(mesh:THREE.InstancedMesh,i:number,x:number,y:number,z:number,h:number,w:number,height:number,d:number)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,h,0);dummy.scale.set(w,height,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)};
 const published:VehicleCollider[]=[];
 const targets=cars.current.map(c=>c?desiredSpeed(c,lanes,cars.current,p,signals,time):0);
 for(let i=0;i<COUNT;i++){
 let c=cars.current[i];let q=c?pose(lanes[c.lane],c.t):null;
 const before=c?{...c}:null;
 if(c){const target=targets[i]??0;c.speed=Math.min(target,c.speed+3*dt);}
 if(!c||!q||Math.hypot(q.x-p.x,q.z-p.z)>240||!advance(c,lanes,dt)){
 const choices=local.filter(({l})=>{const q=pose(l,l.length/2);return !insideJunction(l,l.length/2,lanes,signals)&&Math.hypot(q.x-p.x,q.z-p.z)>30&&cars.current.every(other=>{if(!other)return true;const o=pose(lanes[other.lane],other.t);return Math.hypot(q.x-o.x,q.z-o.z)>8})});
 if(choices.length){const {l,i:id}=choices[Math.floor(Math.random()*choices.length)];c={lane:id,t:l.length/2,speed:0,cruise:5+Math.random()*5,kind:i%3===0?1:0};cars.current[i]=c;q=pose(l,c.t)}else{delete cars.current[i];q=null}
 }else {q=pose(lanes[c.lane],c.t);if(before&&penetration(p.x,p.z,1.15,vehicleCollider(q.x,q.z,q.heading,c.kind))>0){Object.assign(c,before);c.speed=0;q=pose(lanes[c.lane],c.t);}}
 if(!q){if(brakes.current)place(brakes.current,i,0,-100,0,0,0,0,0);place(body.current,i,0,-100,0,0,0,0,0);place(top.current,i,0,-100,0,0,0,0,0);for(let j=0;j<4;j++)place(wheels.current,i*4+j,0,-100,0,0,0,0,0);continue}
 if(!c)continue;
 published.push(vehicleCollider(q.x,q.z,q.heading,c.kind));
 const car=c.kind===1,w=car?1.65:0.48,d=car?3.6:1.65,h=q.heading;
 place(body.current,i,q.x,car?0.65:0.58,q.z,h,w,car?0.8:0.45,d);
 if(brakes.current){place(brakes.current,i,q.x-Math.sin(h)*d*0.49,0.7,q.z-Math.cos(h)*d*0.49,h,w*0.75,0.12,0.08);brakes.current.setColorAt(i,c.speed<(c.cruise??8)-0.5?colors.red:colors.dim)}
 place(top.current,i,q.x,car?1.25:1.15,q.z,h,car?1.45:0.38,car?0.65:0.8,car?1.9:0.38);
 for(let j=0;j<4;j++){const side=j%2?1:-1,along=j<2?1:-1;const x=car?side*w*0.48:0,z=along*d*0.34;place(wheels.current,i*4+j,q.x+Math.cos(h)*x+Math.sin(h)*z,0.28,q.z-Math.sin(h)*x+Math.cos(h)*z,h,car?0.22:0.16,0.52,0.52)}
 }

 vehicles.current=published;
 if(brakes.current){brakes.current.instanceMatrix.needsUpdate=true;if(brakes.current.instanceColor)brakes.current.instanceColor.needsUpdate=true;}
 for(const mesh of [body.current,top.current,wheels.current])mesh.instanceMatrix.needsUpdate=true;
 });
 return <group><SignalPoles lanes={lanes} signals={signals} player={player}/><instancedMesh ref={brakes} args={[undefined,undefined,COUNT]} frustumCulled={false}><boxGeometry/><meshBasicMaterial/></instancedMesh><instancedMesh ref={body} args={[undefined,undefined,COUNT]} frustumCulled={false}><boxGeometry/><meshStandardMaterial roughness={0.6}/></instancedMesh><instancedMesh ref={top} args={[undefined,undefined,COUNT]} frustumCulled={false}><boxGeometry/><meshStandardMaterial/></instancedMesh><instancedMesh ref={wheels} args={[undefined,undefined,COUNT*4]} frustumCulled={false}><boxGeometry/><meshStandardMaterial color="#22282d"/></instancedMesh></group>
}
