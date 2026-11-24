import type {VehicleCollider} from './vehicleCollision';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import './style.css';
import { BUILDINGS, moveWithBuildingCollision } from './collision';
import { loadDaNangMap, type OSMMap, type Point } from './osm';

import { buildWorld, nearby, obstaclesNear, cell, CHUNK_SIZE, type Chunk } from './world';

import { CityDetail } from './cityDetail';

import { RiderModel } from './riderModel';

import { GPS } from './GPS';
import { Traffic } from './Traffic';
import { Pedestrians } from './Pedestrians';
import { GameAudio } from './gameAudio';
import { Environment } from './Environment';

type VehicleType = 'petrol' | 'electric';
type Gender = 'male' | 'female';
type InputKey = 'forward' | 'back' | 'left' | 'right';
const initialFuel = { petrol: 4, electric: 100 };
const DELIVERY = new THREE.Vector3(140, 0, -100);
const PICKUP = new THREE.Vector3(-20, 0, 80);
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
function City({map,world,position}:{map:OSMMap|null;world:Map<string,Chunk>;position:Point}) {
  const cx=cell(position.x),cz=cell(position.z);
  const active=useMemo(()=>nearby(world,cx*CHUNK_SIZE,cz*CHUNK_SIZE),[world,cx,cz]);
  if(map)return <group>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[map.extent*2+150,map.extent*2+150]}/><meshStandardMaterial color="#a0a58c"/></mesh>
    <CityDetail chunks={active}/>
    <Marker at={new THREE.Vector3(map.pickup.x,0,map.pickup.z)} color="#ffd45a" label="NHẬN HÀNG"/>
    <Marker at={new THREE.Vector3(map.delivery.x,0,map.delivery.z)} color="#42e3aa" label="GIAO HÀNG"/>
  </group>;
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
    {BUILDINGS.map(b=><Building key={`${b.x}:${b.z}`} {...b}/>)}
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
function Rider({vehicle,gender,inputs,onTick,map,world,player,vehicles}:{player:React.RefObject<Point>;vehicles:React.RefObject<VehicleCollider[]>;vehicle:VehicleType;gender:Gender;inputs:React.MutableRefObject<Record<InputKey,boolean>>;onTick:(s:{speed:number;distance:number;x:number;z:number;heading:number;fps:number})=>void;map:OSMMap|null;world:Map<string,Chunk>}) {
 const group=useRef<THREE.Group>(null); const velocity=useRef(0);const heading=useRef(0);const distance=useRef(0);const lastUi=useRef(0);
 const frames=useRef(0), elapsed=useRef(0), fps=useRef(0);
 const collisionCache=useRef<{x:number;z:number;items:OSMMap['buildings']}|null>(null);
 const {camera}=useThree(); const camTarget=useRef(new THREE.Vector3()); const cameraReady=useRef(false); const motion=useRef({speed:0,steer:0,distance:0,brake:false});
 useFrame((state,dtRaw)=>{
   frames.current++;elapsed.current+=dtRaw;if(elapsed.current>=1){fps.current=Math.round(frames.current/elapsed.current);frames.current=0;elapsed.current=0;}
   const dt=Math.min(dtRaw,0.05);const g=group.current;if(!g)return;
   const throttle=inputs.current.forward?1:0, brake=inputs.current.back?1:0;
   velocity.current=Math.max(-5,Math.min(vehicle==='electric'?18:21,velocity.current+(throttle*12-brake*20-Math.sign(velocity.current)*3)*dt));
   if(!throttle&&!brake&&Math.abs(velocity.current)<0.15)velocity.current=0;
   const steer=(Number(inputs.current.left)-Number(inputs.current.right));
   heading.current+=steer*dt*1.35*Math.min(1,Math.abs(velocity.current)/4);
   const dx=-Math.sin(heading.current)*velocity.current*dt;
   const dz=-Math.cos(heading.current)*velocity.current*dt;
   if(map&&(!collisionCache.current||collisionCache.current.x!==cell(g.position.x)||collisionCache.current.z!==cell(g.position.z)))collisionCache.current={x:cell(g.position.x),z:cell(g.position.z),items:obstaclesNear(world,g.position.x,g.position.z)};
   const next=moveWithBuildingCollision(g.position.x,g.position.z,dx,dz,1.15,map?collisionCache.current?.items:undefined,map?map.extent+15:185,vehicles.current);
   const travelled=Math.hypot(next.x-g.position.x,next.z-g.position.z);
   distance.current+=travelled;
   motion.current.distance+=travelled*Math.sign(velocity.current);
   g.position.x=next.x;
   g.position.z=next.z;
   player.current={x:next.x,z:next.z};
   if(next.blocked && Math.hypot(dx,dz)>0.01 && travelled<Math.hypot(dx,dz)*0.1) velocity.current=0;
   g.rotation.y=heading.current;
   motion.current.speed=velocity.current;motion.current.steer=steer;motion.current.brake=Boolean(brake);
   const chase=5.5+Math.min(Math.abs(velocity.current)/21,1)*1.5;
   const behind=new THREE.Vector3(g.position.x+Math.sin(heading.current)*chase,3.8,g.position.z+Math.cos(heading.current)*chase);
   if(!cameraReady.current){camTarget.current.copy(behind);cameraReady.current=true;}
   camTarget.current.lerp(behind,1-Math.exp(-dt*6));camera.position.copy(camTarget.current);
   camera.lookAt(g.position.x-Math.sin(heading.current)*2,1.35,g.position.z-Math.cos(heading.current)*2);
   if(state.clock.elapsedTime-lastUi.current>0.12){lastUi.current=state.clock.elapsedTime;onTick({speed:Math.abs(velocity.current)*3.6,distance:distance.current,x:g.position.x,z:g.position.z,heading:heading.current,fps:fps.current});}
 });
 return <group ref={group} position={[map?.spawn.x||0,0,map?.spawn.z??-20]}>
   <RiderModel vehicle={vehicle} gender={gender} motion={motion}/>
 </group>;
}
function Game({vehicle,gender,inputs,onTick,map,onStatus,audio}:{audio:GameAudio;onStatus:(s:string)=>void;vehicle:VehicleType;gender:Gender;inputs:React.MutableRefObject<Record<InputKey,boolean>>;onTick:(s:Telemetry)=>void;map:OSMMap|null}){
 const world=useMemo(()=>map?buildWorld(map):new Map<string,Chunk>(),[map]);
 const [position,setPosition]=useState<Point>(map?.spawn||{x:0,z:-20});
 const vehicles=useRef<VehicleCollider[]>([]);
 const player=useRef<Point>(map?.spawn||{x:0,z:-20});
 const audioWeather=useRef({rain:0,night:false});
 const tick=(s:Telemetry)=>{audio.update(s.speed,vehicle==='electric',audioWeather.current.rain,audioWeather.current.night,vehicles.current.filter(v=>Math.hypot(v.x-s.x,v.z-s.z)<45).length/6);setPosition(p=>cell(p.x)===cell(s.x)&&cell(p.z)===cell(s.z)?p:{x:s.x,z:s.z});onTick(s)};
 return <Canvas shadows={false} dpr={[1,1.5]} camera={{position:[0,9,5],fov:65,near:0.1,far:1000}} gl={{antialias:true}}>
  <color attach="background" args={['#a7d4e9']}/><fog attach="fog" args={['#a7d4e9',180,600]}/>
  <Environment map={map} player={player} onStatus={onStatus} audioWeather={audioWeather}/>
  <City map={map} world={world} position={position}/>{map&&<Traffic roads={map.roads} player={player} vehicles={vehicles}/>}{map&&<Pedestrians map={map} player={player}/>}<Rider vehicle={vehicle} gender={gender} inputs={inputs} onTick={tick} map={map} world={world} player={player} vehicles={vehicles}/>
 </Canvas>;
}
type Telemetry={speed:number;distance:number;x:number;z:number;heading:number;fps:number};
const fmt=(n:number)=>Math.round(n).toLocaleString('vi-VN');
function App(){
 const audio=useMemo(()=>new GameAudio(),[]);const [muted,setMuted]=useState(false);
 useEffect(()=>()=>audio.dispose(),[audio]);
 const [map,setMap]=useState<OSMMap|null>(null);const [mapStatus,setMapStatus]=useState<'loading'|'osm'|'fallback'>('loading');
 const [mapError,setMapError]=useState('');const [mapAttempt,setMapAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();setMapStatus('loading');setMapError('');loadDaNangMap(controller.signal).then(data=>{if(!controller.signal.aborted){setMap(data);setMapStatus('osm')}}).catch(error=>{if(!controller.signal.aborted){setMapError(error instanceof Error?error.message:String(error));setMapStatus('fallback')}});return()=>controller.abort()},[mapAttempt]);
 const [environmentStatus,setEnvironmentStatus]=useState('Đang tải thời tiết…');
 const [started,setStarted]=useState(false),[gender,setGender]=useState<Gender>('male'),[vehicle,setVehicle]=useState<VehicleType>('petrol');
 useEffect(()=>{const visibility=()=>{if(document.hidden)audio.suspend();else if(started)void audio.unlock().catch(()=>{})};document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility)},[audio,started]);
 const [telemetry,setTelemetry]=useState<Telemetry>({speed:0,distance:0,x:0,z:-20,heading:0,fps:0});
 const [stage,setStage]=useState<'pickup'|'dropoff'|'done'>('pickup');const [wallet,setWallet]=useState(0);
 const inputs=useRef<Record<InputKey,boolean>>({forward:false,back:false,left:false,right:false});
 const lastDist=useRef(0);const [remaining,setRemaining]=useState(4);const [phone,setPhone]=useState(false);
 useEffect(()=>{if(!started)return;const down=(e:KeyboardEvent)=>{const k:Record<string,InputKey>={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};if(k[e.key]){inputs.current[k[e.key]]=true;e.preventDefault();}if(e.key.toLowerCase()==='h'&&!e.repeat){void audio.unlock().then(()=>audio.horn()).catch(()=>{})}if(e.key==='Tab'){e.preventDefault();setPhone(p=>!p)}};
 const up=(e:KeyboardEvent)=>{const k:Record<string,InputKey>={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};if(k[e.key])inputs.current[k[e.key]]=false};
 const release=()=>{inputs.current={forward:false,back:false,left:false,right:false}};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
 return()=>{release();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release)}},[started,audio]);
 const update=(s:Telemetry)=>{setTelemetry(s);const delta=Math.max(0,s.distance-lastDist.current);lastDist.current=s.distance;setRemaining(r=>Math.max(0,r-delta/1000/(vehicle==='petrol'?30:200)*(vehicle==='petrol'?1:100)));};
 const target:Point=stage==='pickup'?(map?.pickup||{x:PICKUP.x,z:PICKUP.z}):(map?.delivery||{x:DELIVERY.x,z:DELIVERY.z});
 const distanceTo=Math.hypot(telemetry.x-target.x,telemetry.z-target.z);
 const interact=()=>{if(stage==='pickup'&&distanceTo<10)setStage('dropoff');else if(stage==='dropoff'&&distanceTo<10){setStage('done');setWallet(w=>w+18000)}};
 const reset=()=>{setStage('pickup');setPhone(false);};
 if(!started)return <div className="menu"><div className="menu-card"><span className="eyebrow">SPRINT 03.5 · ENVIRONMENTAL AUDIO</span><h1>ĐÀ NẴNG<br/><em>RIDER</em></h1><p>Chạy xe, khám phá phố 3D và hoàn thành đơn giao hàng đầu tiên.</p><label>Nhân vật</label><div className="options"><button className={gender==='male'?'selected':''} onClick={()=>setGender('male')}>👨 Nam</button><button className={gender==='female'?'selected':''} onClick={()=>setGender('female')}>👩 Nữ</button></div><label>Phương tiện</label><div className="options"><button className={vehicle==='petrol'?'selected':''} onClick={()=>setVehicle('petrol')}>⛽ Xe xăng</button><button className={vehicle==='electric'?'selected':''} onClick={()=>setVehicle('electric')}>⚡ Xe điện</button></div><button className="primary" disabled={mapStatus==='loading'} onClick={()=>{void audio.unlock().catch(()=>{});setRemaining(initialFuel[vehicle]);setStarted(true)}}>BẮT ĐẦU CHẠY XE →</button><small>{mapStatus==='loading'?'Đang thử tải bản đồ OpenStreetMap…':mapStatus==='osm'?'Đường phố và công trình từ OpenStreetMap · khu vực trung tâm Đà Nẵng':'Không tải được OSM · dùng khu phố mẫu ngoại tuyến'}</small>{mapStatus==='fallback'&&<div className="map-error" role="status"><p>{mapError}</p><button onClick={()=>setMapAttempt(v=>v+1)}>THỬ TẢI OSM LẠI</button></div>}</div></div>;
 return <div className="game"><Game vehicle={vehicle} gender={gender} inputs={inputs} onTick={update} map={map} onStatus={setEnvironmentStatus} audio={audio}/><div className="topbar"><div className="hud-left"><div className="brand">ĐÀ NẴNG <b>RIDER</b><small>{environmentStatus}</small><small><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" style={{color:'inherit'}}>Thời tiết Đà Nẵng: Open-Meteo</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" style={{color:'inherit'}}>CC BY 4.0</a></small></div><div className="mission"><b>{stage==='pickup'?'📦 ĐẾN ĐIỂM NHẬN HÀNG':stage==='dropoff'?'🛵 GIAO HÀNG CHO KHÁCH':'🎉 HOÀN THÀNH ĐƠN!'}</b><span>{stage==='done'?'Đã nhận 18.000đ':`Còn ${Math.round(distanceTo)} m · Đơn #DN-001`}</span>{stage!=='done'&&distanceTo<10&&<button onClick={interact}>{stage==='pickup'?'NHẬN HÀNG':'GIAO HÀNG'}</button>}{stage==='done'&&<button onClick={reset}>CHẠY LẠI ĐƠN</button>}</div></div><div className="hud-right"><div className="hud-actions"><button className="phone-toggle" aria-label={muted?"Bật âm thanh":"Tắt âm thanh"} onClick={()=>{const next=!muted;setMuted(next);audio.setMuted(next);if(!next)void audio.unlock().catch(()=>{})}}>{muted?"🔇":"🔊"}</button><button className="phone-toggle" aria-label="Mở điện thoại" onClick={()=>setPhone(p=>!p)}>📱</button><div className="wallet">💰 {fmt(wallet)}đ</div></div><GPS roads={map?.roads} position={telemetry} heading={telemetry.heading} target={target} done={stage==='done'}/></div></div><div className="stats"><strong>{Math.round(telemetry.speed)} <small>km/h</small></strong><span>{vehicle==='petrol'?'⛽ '+remaining.toFixed(2)+' lít':'⚡ '+remaining.toFixed(1)+'%'}</span><span>{telemetry.fps||'–'} FPS · Ô {cell(telemetry.x)}, {cell(telemetry.z)}</span><span>Đã chạy {(telemetry.distance/1000).toFixed(2)} km</span></div>{phone&&<div className="phone-backdrop" onClick={()=>setPhone(false)}><div className="phone" onClick={e=>e.stopPropagation()}><h3>RIDER PHONE</h3><p>📦 Đơn #DN-001</p><p>📍 {stage==='pickup'?'Đến điểm lấy hàng':stage==='dropoff'?'Đến điểm giao hàng':'Đã giao hàng thành công'}</p><p>📏 {stage==='done'?'Hoàn tất':Math.round(distanceTo)+' m'}</p><p>💵 Cước 18.000đ</p><button onClick={()=>setPhone(false)}>Đóng</button></div></div>}<div className="controls left"><Touch keyName="left" inputs={inputs}>◀</Touch><Touch keyName="right" inputs={inputs}>▶</Touch></div><button className="horn" aria-label="Bấm còi" onClick={()=>{void audio.unlock().then(()=>audio.horn()).catch(()=>{})}}>📣</button><div className="controls right"><Touch keyName="back" inputs={inputs}>PHANH</Touch><Touch keyName="forward" inputs={inputs}>GA</Touch></div><div className="help">WASD / phím mũi tên · Tab mở điện thoại · đến gần cột sáng để tương tác</div></div>;
}
function Touch({keyName,inputs,children}:{keyName:InputKey;inputs:React.MutableRefObject<Record<InputKey,boolean>>;children:React.ReactNode}){return <button className="touch" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);inputs.current[keyName]=true}} onPointerUp={()=>inputs.current[keyName]=false} onPointerCancel={()=>inputs.current[keyName]=false} onLostPointerCapture={()=>inputs.current[keyName]=false}>{children}</button>}

createRoot(document.getElementById('root')!).render(<App/>);
