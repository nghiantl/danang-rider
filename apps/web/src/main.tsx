import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import './style.css';

type VehicleType = 'petrol' | 'electric';
type Gender = 'male' | 'female';
type InputKey = 'forward' | 'back' | 'left' | 'right';
const initialFuel = { petrol: 4, electric: 100 };
const WORLD_LIMIT = 185;
const DELIVERY = new THREE.Vector3(110, 0, -100);
const PICKUP = new THREE.Vector3(-90, 0, 80);
const COLORS = ['#e9d5a4', '#d9c8aa', '#b9c7c0', '#b0bac5', '#e0bba9'];

function Building({ x, z, index }: {x:number; z:number; index:number}) {
  const height = 8 + ((index * 13) % 25);
  return <group position={[x,0,z]}>
    <mesh position={[0,height/2,0]} castShadow receiveShadow>
      <boxGeometry args={[14,height,14]}/><meshStandardMaterial color={COLORS[index % COLORS.length]} roughness={0.9}/>
    </mesh>
    <mesh position={[0,height+0.35,0]}><boxGeometry args={[15,0.7,15]}/><meshStandardMaterial color="#697982"/></mesh>
    {Array.from({length:Math.floor(height/5)},(_,i)=><group key={i} position={[0,3+i*5,0]}>
      <mesh position={[0,0,7.04]}><boxGeometry args={[9,2.2,0.08]}/><meshStandardMaterial color="#466a79" metalness={0.3}/></mesh>
      <mesh position={[7.04,0,0]} rotation={[0,Math.PI/2,0]}><boxGeometry args={[9,2.2,0.08]}/><meshStandardMaterial color="#466a79" metalness={0.3}/></mesh>
    </group>)}
  </group>;
}
function City() {
  const buildings = [];
  for(let x=-160;x<=160;x+=40) for(let z=-160;z<=160;z+=40){
    if(Math.abs(x)<20 || Math.abs(z)<20 || (x===80 && z===80)) continue;
    buildings.push({x,z,index:buildings.length});
  }
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[500,500]}/><meshStandardMaterial color="#6d977d"/></mesh>
    {[-180,-20,140].map((x,i)=><group key={'v'+i}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[x,0.04,0]} receiveShadow><planeGeometry args={[22,420]}/><meshStandardMaterial color="#384450"/></mesh>
      {Array.from({length:18},(_,j)=><mesh key={j} rotation={[-Math.PI/2,0,0]} position={[x,0.07,-190+j*22]}><planeGeometry args={[0.25,8]}/><meshBasicMaterial color="#e7d8a5"/></mesh>)}
    </group>)}
    {[-180,-20,140].map((z,i)=><group key={'h'+i}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,0.05,z]} receiveShadow><planeGeometry args={[420,22]}/><meshStandardMaterial color="#384450"/></mesh>
      {Array.from({length:18},(_,j)=><mesh key={j} rotation={[-Math.PI/2,0,0]} position={[-190+j*22,0.08,z]}><planeGeometry args={[8,0.25]}/><meshBasicMaterial color="#e7d8a5"/></mesh>)}
    </group>)}
    {buildings.map(b=><Building key={`${b.x}:${b.z}`} {...b}/>)}
    {Array.from({length:28},(_,i)=>{const x=-160+(i%7)*48,z=-150+Math.floor(i/7)*95;return <group key={i} position={[x,0,z]}>
      <mesh position={[0,3,0]}><cylinderGeometry args={[0.35,0.5,6,7]}/><meshStandardMaterial color="#745840"/></mesh>
      <mesh position={[0,7,0]}><coneGeometry args={[3.7,9,7]}/><meshStandardMaterial color="#287a56"/></mesh>
    </group>})}
    <Marker at={PICKUP} color="#ffd45a" label="NHẬN HÀNG"/>
    <Marker at={DELIVERY} color="#42e3aa" label="GIAO HÀNG"/>
  </group>;
}
function Marker({at,color,label}:{at:THREE.Vector3;color:string;label:string}) {
 return <group position={[at.x,0,at.z]}>
  <mesh position={[0,0.12,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[3,4,32]}/><meshBasicMaterial color={color} side={THREE.DoubleSide}/></mesh>
  <mesh position={[0,7,0]}><sphereGeometry args={[1.5,12,12]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45}/></mesh>
  <mesh position={[0,3.5,0]}><cylinderGeometry args={[0.12,0.12,7,8]}/><meshBasicMaterial color={color} transparent opacity={0.55}/></mesh>
 </group>
}
function Rider({vehicle,gender,inputs,onTick}:{vehicle:VehicleType;gender:Gender;inputs:React.MutableRefObject<Record<InputKey,boolean>>;onTick:(s:{speed:number;distance:number;x:number;z:number;heading:number})=>void}) {
 const group=useRef<THREE.Group>(null); const velocity=useRef(0);const heading=useRef(0);const distance=useRef(0);const lastUi=useRef(0);
 const {camera}=useThree(); const camTarget=useRef(new THREE.Vector3());
 useFrame((state,dtRaw)=>{
   const dt=Math.min(dtRaw,0.05);const g=group.current;if(!g)return;
   const throttle=inputs.current.forward?1:0, brake=inputs.current.back?1:0;
   velocity.current=Math.max(-5,Math.min(vehicle==='electric'?18:21,velocity.current+(throttle*12-brake*20-Math.sign(velocity.current)*3)*dt));
   if(!throttle&&!brake&&Math.abs(velocity.current)<0.15)velocity.current=0;
   const steer=(Number(inputs.current.left)-Number(inputs.current.right));
   heading.current+=steer*dt*1.35*Math.min(1,Math.abs(velocity.current)/4);
   const dx=-Math.sin(heading.current)*velocity.current*dt;
   const dz=-Math.cos(heading.current)*velocity.current*dt;
   const nextX=THREE.MathUtils.clamp(g.position.x+dx,-WORLD_LIMIT,WORLD_LIMIT);
   const nextZ=THREE.MathUtils.clamp(g.position.z+dz,-WORLD_LIMIT,WORLD_LIMIT);
   distance.current+=Math.hypot(nextX-g.position.x,nextZ-g.position.z);
   g.position.x=nextX;
   g.position.z=nextZ;
   g.rotation.y=heading.current;
   const behind=new THREE.Vector3(g.position.x+Math.sin(heading.current)*12,9,g.position.z+Math.cos(heading.current)*12);
   camTarget.current.lerp(behind,Math.min(1,dt*5));camera.position.copy(camTarget.current);
   camera.lookAt(g.position.x,3,g.position.z);
   if(state.clock.elapsedTime-lastUi.current>0.12){lastUi.current=state.clock.elapsedTime;onTick({speed:Math.abs(velocity.current)*3.6,distance:distance.current,x:g.position.x,z:g.position.z,heading:heading.current});}
 });
 return <group ref={group} position={[0,0,-20]}>
   <mesh position={[0,0.58,-1.1]} rotation={[Math.PI/2,0,0]} castShadow><torusGeometry args={[0.48,0.18,10,18]}/><meshStandardMaterial color="#161a20"/></mesh>
   <mesh position={[0,0.58,1.1]} rotation={[Math.PI/2,0,0]} castShadow><torusGeometry args={[0.48,0.18,10,18]}/><meshStandardMaterial color="#161a20"/></mesh>
   <mesh position={[0,1.05,0]} castShadow><boxGeometry args={[0.85,0.55,2.3]}/><meshStandardMaterial color={vehicle==='electric'?'#45b8a8':'#e45d4f'} metalness={0.4} roughness={0.35}/></mesh>
   <mesh position={[0,1.5,0.25]} castShadow><boxGeometry args={[0.65,0.24,1]}/><meshStandardMaterial color="#202a32"/></mesh>
   <mesh position={[0,2.25,0.2]} castShadow><capsuleGeometry args={[0.43,0.8,6,12]}/><meshStandardMaterial color={gender==='female'?'#f0b9ba':'#70a4dd'}/></mesh>
   <mesh position={[0,3.12,0.1]} castShadow><sphereGeometry args={[0.39,16,12]}/><meshStandardMaterial color="#f0c39b"/></mesh>
   <mesh position={[0,3.35,0.1]} castShadow><sphereGeometry args={[0.43,16,12,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#263646"/></mesh>
   <mesh position={[0,1.65,-0.8]}><boxGeometry args={[1.2,0.13,0.13]}/><meshStandardMaterial color="#28333d"/></mesh>
   <mesh position={[0,1.5,1.3]}><boxGeometry args={[0.85,0.8,0.65]}/><meshStandardMaterial color="#e6b84b"/></mesh>
 </group>;
}
function Game({vehicle,gender,inputs,onTick}:{vehicle:VehicleType;gender:Gender;inputs:React.MutableRefObject<Record<InputKey,boolean>>;onTick:(s:Telemetry)=>void}){
 return <Canvas shadows={false} dpr={[1,1.5]} camera={{position:[0,9,5],fov:65,near:0.1,far:700}} gl={{antialias:true}}>
  <color attach="background" args={['#a7d4e9']}/><fog attach="fog" args={['#a7d4e9',130,370]}/>
  <ambientLight intensity={1.8}/><directionalLight position={[80,140,50]} intensity={2}/>
  <City/><Rider vehicle={vehicle} gender={gender} inputs={inputs} onTick={onTick}/>
 </Canvas>;
}
type Telemetry={speed:number;distance:number;x:number;z:number;heading:number};
const fmt=(n:number)=>Math.round(n).toLocaleString('vi-VN');
function App(){
 const [started,setStarted]=useState(false),[gender,setGender]=useState<Gender>('male'),[vehicle,setVehicle]=useState<VehicleType>('petrol');
 const [telemetry,setTelemetry]=useState<Telemetry>({speed:0,distance:0,x:0,z:-20,heading:0});
 const [stage,setStage]=useState<'pickup'|'dropoff'|'done'>('pickup');const [wallet,setWallet]=useState(0);
 const inputs=useRef<Record<InputKey,boolean>>({forward:false,back:false,left:false,right:false});
 const lastDist=useRef(0);const [remaining,setRemaining]=useState(4);const [phone,setPhone]=useState(false);
 useEffect(()=>{if(!started)return;const down=(e:KeyboardEvent)=>{const k:Record<string,InputKey>={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};if(k[e.key]){inputs.current[k[e.key]]=true;e.preventDefault();}if(e.key==='Tab'){e.preventDefault();setPhone(p=>!p)}};
 const up=(e:KeyboardEvent)=>{const k:Record<string,InputKey>={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};if(k[e.key])inputs.current[k[e.key]]=false};
 const release=()=>{inputs.current={forward:false,back:false,left:false,right:false}};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
 return()=>{release();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release)}},[started]);
 const update=(s:Telemetry)=>{setTelemetry(s);const delta=Math.max(0,s.distance-lastDist.current);lastDist.current=s.distance;setRemaining(r=>Math.max(0,r-delta/1000/(vehicle==='petrol'?30:200)*(vehicle==='petrol'?1:100)));};
 const target=stage==='pickup'?PICKUP:DELIVERY;
 const distanceTo=Math.hypot(telemetry.x-target.x,telemetry.z-target.z);
 const interact=()=>{if(stage==='pickup'&&distanceTo<10)setStage('dropoff');else if(stage==='dropoff'&&distanceTo<10){setStage('done');setWallet(w=>w+18000)}};
 const reset=()=>{setStage('pickup');setPhone(false);};
 if(!started)return <div className="menu"><div className="menu-card"><span className="eyebrow">SPRINT 01 · PLAYABLE PROTOTYPE</span><h1>ĐÀ NẴNG<br/><em>RIDER</em></h1><p>Chạy xe, khám phá phố 3D và hoàn thành đơn giao hàng đầu tiên.</p><label>Nhân vật</label><div className="options"><button className={gender==='male'?'selected':''} onClick={()=>setGender('male')}>👨 Nam</button><button className={gender==='female'?'selected':''} onClick={()=>setGender('female')}>👩 Nữ</button></div><label>Phương tiện</label><div className="options"><button className={vehicle==='petrol'?'selected':''} onClick={()=>setVehicle('petrol')}>⛽ Xe xăng</button><button className={vehicle==='electric'?'selected':''} onClick={()=>setVehicle('electric')}>⚡ Xe điện</button></div><button className="primary" onClick={()=>{setRemaining(initialFuel[vehicle]);setStarted(true)}}>BẮT ĐẦU CHẠY XE →</button><small>Đường phố 3D mô phỏng · Chưa phải bản đồ OSM thật</small></div></div>;
 return <div className="game"><Game vehicle={vehicle} gender={gender} inputs={inputs} onTick={update}/><div className="topbar"><div className="brand">ĐÀ NẴNG <b>RIDER</b><small>SPRINT 01 · KHU PHỐ MẪU</small></div><div className="wallet">💰 {fmt(wallet)}đ</div></div><div className="mission"><b>{stage==='pickup'?'📦 ĐẾN ĐIỂM NHẬN HÀNG':stage==='dropoff'?'🛵 GIAO HÀNG CHO KHÁCH':'🎉 HOÀN THÀNH ĐƠN!'}</b><span>{stage==='done'?'Đã nhận 18.000đ':`Còn ${Math.round(distanceTo)} m · Đơn #DN-001`}</span>{stage!=='done'&&distanceTo<10&&<button onClick={interact}>{stage==='pickup'?'NHẬN HÀNG':'GIAO HÀNG'}</button>}{stage==='done'&&<button onClick={reset}>CHẠY LẠI ĐƠN</button>}</div><div className="stats"><strong>{Math.round(telemetry.speed)} <small>km/h</small></strong><span>{vehicle==='petrol'?'⛽ '+remaining.toFixed(2)+' lít':'⚡ '+remaining.toFixed(1)+'%'}</span><span>Đã chạy {(telemetry.distance/1000).toFixed(2)} km</span></div><button className="phone-toggle" onClick={()=>setPhone(p=>!p)}>📱</button>{phone&&<div className="phone"><h3>RIDER PHONE</h3><p>📦 Đơn #DN-001</p><p>📍 {stage==='pickup'?'Đến điểm lấy hàng':stage==='dropoff'?'Đến điểm giao hàng':'Đã giao hàng thành công'}</p><p>📏 {stage==='done'?'Hoàn tất':Math.round(distanceTo)+' m'}</p><p>💵 Cước 18.000đ</p><button onClick={()=>setPhone(false)}>Đóng</button></div>}<div className="controls left"><Touch keyName="left" inputs={inputs}>◀</Touch><Touch keyName="right" inputs={inputs}>▶</Touch></div><div className="controls right"><Touch keyName="back" inputs={inputs}>PHANH</Touch><Touch keyName="forward" inputs={inputs}>GA</Touch></div><div className="help">WASD / phím mũi tên · Tab mở điện thoại · đến gần cột sáng để tương tác</div></div>;
}
function Touch({keyName,inputs,children}:{keyName:InputKey;inputs:React.MutableRefObject<Record<InputKey,boolean>>;children:React.ReactNode}){return <button className="touch" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);inputs.current[keyName]=true}} onPointerUp={()=>inputs.current[keyName]=false} onPointerCancel={()=>inputs.current[keyName]=false} onLostPointerCapture={()=>inputs.current[keyName]=false}>{children}</button>}

createRoot(document.getElementById('root')!).render(<App/>);
