import type {VehicleCollider} from './vehicleCollision';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import './style.css';

const SPRINT_LABEL = 'SPRINT 04.6.1 · MOBILE HUD';
const RELEASE_VERSION = '4.6.1';
const BUILD_SHA = (import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || '').trim();
const BUILD_LABEL = `v${RELEASE_VERSION} · Build ${BUILD_SHA ? BUILD_SHA.slice(0, 7) : 'unknown'}`;
import {treePosition,type EnvironmentCollider} from './environmentCollision';
import {checkpoints,type Checkpoint} from './policeCheckpoints';
import {PoliceCheckpoints} from './PoliceCheckpointsView';
import { BUILDINGS, moveWithBuildingCollision } from './collision';
import { loadDaNangMap, type OSMMap, type Point } from './osm';

import { buildWorld, nearby, obstaclesNear, cell, CHUNK_SIZE, type Chunk } from './world';

import { CityDetail } from './cityDetail';

import {DeliveryScene,WaitingCustomer,DELIVERY_SECONDS,type DeliveryAction} from './DeliveryScene';
import { RiderModel } from './riderModel';

import {ORDER_TYPES} from './career/orderCatalog';
import {makeOrders,type Order} from './orders';
import {rank,threshold,MAX_LEVEL} from './career/progression';
import {startRun,damage,average,vipEligible,type DeliveryRun} from './career/deliveryRating';
import {stations as makeStations,capacity,quote,purchase,type Station} from './career/energy';
import {wear,impact as vehicleImpact,performanceFactor,repairQuote,repair,garages as makeGarages,type Garage} from './career/maintenance';
import {Garages,type RepairPose} from './Garages';
import {EnergyStations,type ServicePose} from './EnergyStations';
import {KEY,parseCareer,newCareer,settle,type Career} from './career/save';
import { GPS } from './GPS';
import { Traffic } from './Traffic';
import { Pedestrians } from './Pedestrians';
import {pedestrianImpact,type PedestrianCollider,type PedestrianHit} from './pedestrians';
import { GameAudio } from './gameAudio';
import { riverGrid } from './riverGeometry';
import { Beach } from './Beach';
import { seaBlocked } from './coast';
import { Landmarks } from './Landmarks';
import { Environment } from './Environment';

type VehicleType = 'petrol' | 'electric';
type Gender = 'male' | 'female';
type InputKey = 'forward' | 'back' | 'left' | 'right';
const initialFuel = { petrol: 4, electric: 100 };
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
function City({map,world,position,target,stage}:{target:Point;stage:string;map:OSMMap|null;world:Map<string,Chunk>;position:Point}) {
  const cx=cell(position.x),cz=cell(position.z);
  const active=useMemo(()=>nearby(world,cx*CHUNK_SIZE,cz*CHUNK_SIZE),[world,cx,cz]);
  if(map)return <group>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[map.extent*2+150,map.extent*2+150]}/><meshStandardMaterial color="#a0a58c"/></mesh>
    <CityDetail world={world} chunks={active}/><Landmarks map={map} position={position}/><Beach map={map} position={position}/>
    {stage!=='done'&&<Marker at={new THREE.Vector3(target.x,0,target.z)} color={stage==='pickup'?'#ffd45a':'#42e3aa'} label="ĐƠN HÀNG"/>}
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
    {stage!=='done'&&<Marker at={new THREE.Vector3(target.x,0,target.z)} color={stage==='pickup'?'#ffd45a':'#42e3aa'} label="ĐƠN HÀNG"/>}
  </group>;
}
function Marker({at,color,label}:{at:THREE.Vector3;color:string;label:string}) {
 return <group position={[at.x,0,at.z]}>
  <mesh position={[0,0.12,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[3,4,32]}/><meshBasicMaterial color={color} side={THREE.DoubleSide}/></mesh>
  <mesh position={[0,7,0]}><sphereGeometry args={[1.5,12,12]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45}/></mesh>
  <mesh position={[0,3.5,0]}><cylinderGeometry args={[0.12,0.12,7,8]}/><meshBasicMaterial color={color} transparent opacity={0.55}/></mesh>
 </group>
}
function Rider({health,servicePose,energyLocked,spawn,action,target,onDeliveryComplete,vehicle,gender,inputs,onTick,map,world,player,vehicles,people,hits,onCollision,lampColliders,signalColliders}:{health:number;servicePose:ServicePose|null;energyLocked:React.RefObject<boolean>;spawn:Point;action:React.RefObject<DeliveryAction|null>;target:Point;onDeliveryComplete:()=>void;lampColliders:React.RefObject<EnvironmentCollider[]>;signalColliders:React.RefObject<EnvironmentCollider[]>;onCollision:(strength:number,car:boolean)=>void;people:React.RefObject<PedestrianCollider[]>;hits:React.RefObject<PedestrianHit[]>;player:React.RefObject<Point>;vehicles:React.RefObject<VehicleCollider[]>;vehicle:VehicleType;gender:Gender;inputs:React.MutableRefObject<Record<InputKey,boolean>>;onTick:(s:{speed:number;distance:number;x:number;z:number;heading:number;fps:number})=>void;map:OSMMap|null;world:Map<string,Chunk>}) {
 const impactTime=useRef(-10),shake=useRef(0);
 const group=useRef<THREE.Group>(null); const velocity=useRef(0);const heading=useRef(0);const distance=useRef(0);const lastUi=useRef(0);
 const frames=useRef(0), elapsed=useRef(0), fps=useRef(0);
 const collisionCache=useRef<{x:number;z:number;items:OSMMap['buildings'];trees:EnvironmentCollider[]}|null>(null);
 const {camera}=useThree(); const camTarget=useRef(new THREE.Vector3()); const cameraReady=useRef(false); const motion=useRef({speed:0,steer:0,distance:0,brake:false});
 useFrame((state,dtRaw)=>{
   frames.current++;elapsed.current+=dtRaw;if(elapsed.current>=1){fps.current=Math.round(frames.current/elapsed.current);frames.current=0;elapsed.current=0;}
   const dt=Math.min(dtRaw,0.05);const g=group.current;if(!g)return;
   const active=action.current;if(active){velocity.current=0;for(const k of Object.keys(inputs.current) as InputKey[])inputs.current[k]=false;active.elapsed=Math.min(DELIVERY_SECONDS,active.elapsed+dt);if(active.elapsed>=DELIVERY_SECONDS)onDeliveryComplete();}
   if(energyLocked.current)velocity.current=0;
   const throttle=!energyLocked.current&&!active&&inputs.current.forward?1:0, brake=!energyLocked.current&&!active&&inputs.current.back?1:0;
   velocity.current=Math.max(-5,Math.min((vehicle==='electric'?18:21)*performanceFactor(health),velocity.current+(throttle*12-brake*20-Math.sign(velocity.current)*3)*dt));
   if(!throttle&&!brake&&Math.abs(velocity.current)<0.15)velocity.current=0;
   const steer=active?0:(Number(inputs.current.left)-Number(inputs.current.right));
   heading.current+=steer*dt*1.35*Math.min(1,Math.abs(velocity.current)/4);
   const dx=-Math.sin(heading.current)*velocity.current*dt;
   const dz=-Math.cos(heading.current)*velocity.current*dt;
   if(map&&(!collisionCache.current||collisionCache.current.x!==cell(g.position.x)||collisionCache.current.z!==cell(g.position.z)))collisionCache.current={x:cell(g.position.x),z:cell(g.position.z),items:obstaclesNear(world,g.position.x,g.position.z),trees:nearby(world,g.position.x,g.position.z).flatMap(chunk=>{const entry=[...world.entries()].find(([,v])=>v===chunk);if(!entry)return [];const [x,z]=entry[0].split(':').map(Number);const context=nearby(world,x*CHUNK_SIZE,z*CHUNK_SIZE);return chunk.segments.flatMap(p=>{const t=treePosition(p,context);return t?[t]:[]})})};
   let next:ReturnType<typeof moveWithBuildingCollision>=moveWithBuildingCollision(g.position.x,g.position.z,dx,dz,1.15,map?collisionCache.current?.items:undefined,map?map.extent+15:185,vehicles.current,[...(collisionCache.current?.trees??[]),...lampColliders.current,...signalColliders.current].filter(o=>Math.hypot(o.x-g.position.x,o.z-g.position.z)<10));
   if((next.vehicleHit||next.objectHit)&&Math.abs(velocity.current)>=1.5&&state.clock.elapsedTime-impactTime.current>0.65){const strength=Math.min(1,Math.abs(velocity.current)/14);impactTime.current=state.clock.elapsedTime;shake.current=strength;onCollision(strength,next.objectHit?true:(next.vehicleHit?.halfLength??0)>1);}
   if(map){const water=riverGrid(map);if((water.blocked(next)&&!water.blocked(g.position))||(seaBlocked(map,next)&&!seaBlocked(map,g.position)))next={x:g.position.x,z:g.position.z,blocked:true,vehicleHit:undefined,objectHit:undefined};}
   const impact=pedestrianImpact(g.position,next,Math.abs(velocity.current),people.current);if(impact){hits.current.push(impact);people.current=people.current.filter(p=>p.id!==impact.id);velocity.current*=0.35;}
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
   camTarget.current.lerp(behind,1-Math.exp(-dt*6));camera.position.copy(camTarget.current);if(shake.current>0.001&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const a=shake.current*0.14;camera.position.x+=Math.sin(state.clock.elapsedTime*65)*a;camera.position.y+=Math.cos(state.clock.elapsedTime*83)*a;shake.current*=Math.exp(-dt*12);}
   camera.lookAt(g.position.x-Math.sin(heading.current)*2,1.35,g.position.z-Math.cos(heading.current)*2);
   if(state.clock.elapsedTime-lastUi.current>0.12){lastUi.current=state.clock.elapsedTime;onTick({speed:Math.abs(velocity.current)*3.6,distance:distance.current,x:g.position.x,z:g.position.z,heading:heading.current,fps:fps.current});}
 });
 return <group ref={group} position={[spawn.x,0,spawn.z]}>
   <RiderModel dismounted={servicePose?.station.kind==='electric'} vehicle={vehicle} gender={gender} motion={motion} action={action}/><DeliveryScene action={action} gender={gender} target={target}/>
 </group>;
}
// Sample sustained frame times rather than reacting to individual slow frames.
function AdaptiveResolution(){
 const {gl,setDpr}=useThree();const sample=useRef({elapsed:0,frames:0,cooldown:0});
 useFrame((_,dt)=>{const s=sample.current;if(dt>0.25){s.elapsed=0;s.frames=0;return} s.elapsed+=dt;s.frames++;if(s.elapsed<3)return;
 const fps=s.frames/s.elapsed;s.elapsed=0;s.frames=0;if(s.cooldown>0){s.cooldown--;return}
 const current=gl.getPixelRatio(),max=Math.min(1.25,window.devicePixelRatio||1);
 const next=fps<38?Math.max(0.85,current-0.15):fps>55?Math.min(max,current+0.1):current;
 if(Math.abs(next-current)>0.01){setDpr(next);s.cooldown=2}
 });return null;
}
function WebGLNotice({message}:{message:string}){return <div role="alert" style={{position:'absolute',inset:0,zIndex:1000,display:'grid',placeItems:'center',background:'#111827',color:'white',padding:24,textAlign:'center'}}><div><h2>Không thể hiển thị đồ họa 3D</h2><p>{message}</p><p>Nếu vẫn lỗi, đóng các tab game khác và khởi động lại trình duyệt.</p><button onClick={()=>window.location.reload()}>Tải lại game</button></div></div>}
class WebGLBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true}};render(){return this.state.failed?<WebGLNotice message="Không tạo được WebGL context. Hãy thử tải lại game."/>:this.props.children}}
function ContextMonitor({onLost,onRestored}:{onLost:()=>void;onRestored:()=>void}){const {gl,setFrameloop}=useThree();useEffect(()=>{const canvas=gl.domElement;const lost=(e:Event)=>{e.preventDefault();setFrameloop('never');onLost()};const restored=()=>{setFrameloop('always');onRestored()};canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);return()=>{canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored)}},[gl,setFrameloop,onLost,onRestored]);return null}
function Game({health,garages,repairPose,servicePose,energyLocked,stations,onCargoImpact,spawn,action,onDeliveryComplete,vehicle,gender,inputs,onTick,map,onStatus,audio,target,stage,police}:{health:number;garages:Garage[];repairPose:RepairPose|null;servicePose:ServicePose|null;energyLocked:React.RefObject<boolean>;stations:Station[];onCargoImpact:(strength:number)=>void;spawn:Point;action:React.RefObject<DeliveryAction|null>;onDeliveryComplete:()=>void;police:Checkpoint[];target:Point;stage:string;audio:GameAudio;onStatus:(s:string)=>void;vehicle:VehicleType;gender:Gender;inputs:React.MutableRefObject<Record<InputKey,boolean>>;onTick:(s:Telemetry)=>void;map:OSMMap|null}){
 const world=useMemo(()=>map?buildWorld(map):new Map<string,Chunk>(),[map]);

 const [position,setPosition]=useState<Point>(spawn);
 const vehicles=useRef<VehicleCollider[]>([]);const crossingPeople=useRef<Point[]>([]);const people=useRef<PedestrianCollider[]>([]),hits=useRef<PedestrianHit[]>([]);
 const player=useRef<Point>(spawn);
 const audioWeather=useRef({rain:0,night:false});
 const tick=(s:Telemetry)=>{audio.update(s.speed,vehicle==='electric',audioWeather.current.rain,audioWeather.current.night,vehicles.current.filter(v=>Math.hypot(v.x-s.x,v.z-s.z)<45).length/6);setPosition(p=>cell(p.x)===cell(s.x)&&cell(p.z)===cell(s.z)?p:{x:s.x,z:s.z});onTick(s)};
 const [contextLost,setContextLost]=useState(false);
 const lampColliders=useRef<EnvironmentCollider[]>([]),signalColliders=useRef<EnvironmentCollider[]>([]);
 const flash=useRef<HTMLDivElement>(null);const animation=useRef<Animation|null>(null);
 const onCollision=React.useCallback((strength:number,car:boolean)=>{onCargoImpact(strength);audio.collision(strength,car);if(typeof navigator.vibrate==='function')navigator.vibrate(Math.round(45+strength*100));if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&flash.current){animation.current?.cancel();animation.current=flash.current.animate([{opacity:strength*0.32},{opacity:0}],{duration:220,easing:'ease-out'});}},[audio,onCargoImpact]);
 useEffect(()=>()=>animation.current?.cancel(),[]);
 const onLost=React.useCallback(()=>{for(const key of Object.keys(inputs.current) as InputKey[])inputs.current[key]=false;setContextLost(true)},[inputs]);const onRestored=React.useCallback(()=>setContextLost(false),[]);
 return <WebGLBoundary><Canvas fallback={<WebGLNotice message="Trình duyệt không hỗ trợ WebGL."/>} shadows={false} dpr={[0.85,1]} camera={{position:[0,9,5],fov:65,near:0.1,far:1000}} gl={{antialias:false,powerPreference:'default',preserveDrawingBuffer:false}}>
  <ContextMonitor onLost={onLost} onRestored={onRestored}/>
  <color attach="background" args={['#a7d4e9']}/><fog attach="fog" args={['#a7d4e9',180,600]}/>
  <Environment map={map} player={player} onStatus={onStatus} audioWeather={audioWeather} lampColliders={lampColliders}/>
  <AdaptiveResolution/><Garages items={garages} pose={repairPose}/><EnergyStations items={stations} service={servicePose} gender={gender}/><WaitingCustomer target={target} stage={stage} player={player}/><PoliceCheckpoints items={police} player={player}/><City map={map} world={world} position={position} target={target} stage={stage}/>{map&&<Traffic roads={map.roads} player={player} vehicles={vehicles} crossingPeople={crossingPeople} signalColliders={signalColliders}/>}{map&&<Pedestrians map={map} player={player} world={world} crossingPeople={crossingPeople} people={people} hits={hits}/>}<Rider health={health} servicePose={servicePose} energyLocked={energyLocked} spawn={spawn} action={action} target={target} onDeliveryComplete={onDeliveryComplete} vehicle={vehicle} gender={gender} inputs={inputs} onTick={tick} map={map} world={world} player={player} vehicles={vehicles} people={people} hits={hits} onCollision={onCollision} lampColliders={lampColliders} signalColliders={signalColliders}/>
 </Canvas><div ref={flash} aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',background:'#ff6347',opacity:0,zIndex:20}}/>{contextLost&&<WebGLNotice message="WebGL context bị mất. Game đang chờ trình duyệt phục hồi; nếu không tự phục hồi, hãy tải lại."/>}</WebGLBoundary>
}
type Telemetry={speed:number;distance:number;x:number;z:number;heading:number;fps:number};
const fmt=(n:number)=>Math.round(n).toLocaleString('vi-VN');
function App(){
 const [initial]=useState(()=>{try{const raw=localStorage.getItem(KEY);if(raw)return {career:parseCareer(raw),error:''};return {career:newCareer(localStorage.getItem('danang-rider-income-v1')),error:''}}catch{return {career:newCareer(null),error:'Không đọc được dữ liệu lưu. Hãy nhập bản sao lưu trước khi chơi.'}}});
 const [career,setCareer]=useState(initial.career);const [saveError,setSaveError]=useState(initial.error);const blockedSave=useRef(!!initial.error);const latest=useRef(career);const [spawn,setSpawn]=useState<Point>({x:0,z:-20});
 const audio=useMemo(()=>new GameAudio(),[]);const [muted,setMuted]=useState(false);
 useEffect(()=>()=>audio.dispose(),[audio]);
 const [map,setMap]=useState<OSMMap|null>(null);const [mapStatus,setMapStatus]=useState<'loading'|'osm'|'fallback'>('loading');
 const police=useMemo(()=>map?checkpoints(map):[],[map]);
 const [mapError,setMapError]=useState('');const [mapAttempt,setMapAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();setMapStatus('loading');setMapError('');loadDaNangMap(controller.signal).then(data=>{if(!controller.signal.aborted){setMap(data);setMapStatus('osm')}}).catch(error=>{if(!controller.signal.aborted){setMapError(error instanceof Error?error.message:String(error));setMapStatus('fallback')}});return()=>controller.abort()},[mapAttempt]);
 const [environmentStatus,setEnvironmentStatus]=useState('Đang tải thời tiết…');
 const [started,setStarted]=useState(false),[gender,setGender]=useState<Gender>(career.gender),[vehicle,setVehicle]=useState<VehicleType>(career.vehicle);
 useEffect(()=>{
  if(!started)return;
  const root=document.documentElement,v=window.visualViewport;
  if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
  window.scrollTo(0,0);root.classList.add('game-active');
  const sync=()=>{window.scrollTo(0,0);root.style.setProperty('--game-height',Math.round(v?.height??window.innerHeight)+'px');root.style.setProperty('--game-width',Math.round(v?.width??window.innerWidth)+'px');root.style.setProperty('--game-top',Math.round(v?.offsetTop??0)+'px');root.style.setProperty('--game-left',Math.round(v?.offsetLeft??0)+'px')};
  sync();const frame=requestAnimationFrame(sync);const timer=window.setTimeout(sync,350);
  window.addEventListener('resize',sync);window.addEventListener('pageshow',sync);v?.addEventListener('resize',sync);v?.addEventListener('scroll',sync);
  return()=>{cancelAnimationFrame(frame);clearTimeout(timer);window.removeEventListener('resize',sync);window.removeEventListener('pageshow',sync);v?.removeEventListener('resize',sync);v?.removeEventListener('scroll',sync);root.classList.remove('game-active');for(const k of ['height','width','top','left'])root.style.removeProperty('--game-'+k)};
 },[started]);
 useEffect(()=>{
 if(!started)return;
 let timers:number[]=[];
 const clear=()=>{timers.forEach(t=>window.clearTimeout(t));timers=[]};
 const restore=()=>{if(document.hidden)return;clear();audio.recover();timers=[350,1100,2200].map(ms=>window.setTimeout(()=>audio.recover(),ms))};
 const hide=()=>{clear();audio.markInterrupted();audio.suspend()};
 const visibility=()=>{if(document.hidden)hide();else restore()};
 const gesture=()=>audio.recover(true);
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pageshow',restore);window.addEventListener('pagehide',hide);window.addEventListener('focus',restore);
 window.addEventListener('pointerdown',gesture,true);window.addEventListener('touchend',gesture,true);window.addEventListener('keydown',gesture,true);
 return()=>{clear();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pageshow',restore);window.removeEventListener('pagehide',hide);window.removeEventListener('focus',restore);window.removeEventListener('pointerdown',gesture,true);window.removeEventListener('touchend',gesture,true);window.removeEventListener('keydown',gesture,true)};
 },[audio,started]);
 const [telemetry,setTelemetry]=useState<Telemetry>({speed:0,distance:0,x:0,z:-20,heading:0,fps:0});
 const [stage,setStage]=useState<'pickup'|'dropoff'|'done'>(career.stage);
 const income=career.income;
 const [batch,setBatch]=useState(career.batch),[order,setOrder]=useState<Order|null>(career.order);
 const run=useRef<DeliveryRun|null>(career.run??null);const [now,setNow]=useState(Date.now);
 useEffect(()=>{if(!started)return;const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[started]);
 const ratings=career.ratings??[],vip=vipEligible(ratings),rating=average(ratings);
 const offers=useMemo(()=>makeOrders(map,batch,vip?career.level:Math.min(19,career.level)),[map,batch,career.level,vip]);
 const [health,setHealth]=useState(career.health??100);const [repairPopup,setRepairPopup]=useState(false);const [repairPose,setRepairPose]=useState<RepairPose|null>(null);const [repairBudget,setRepairBudget]=useState(20000);
 const cargoImpact=React.useCallback((strength:number)=>{setHealth(h=>vehicleImpact(h,strength));if(lock.current==='dropoff'&&run.current)run.current=damage(run.current,strength,order?.kind==='fragile')},[order]);
 const seconds=run.current?Math.ceil((run.current.deadline-now)/1000):0;
 const timerText=(seconds<0?'Trễ ':'Còn ')+Math.floor(Math.abs(seconds)/60)+':'+String(Math.abs(seconds)%60).padStart(2,'0');
 const lastRating=ratings[ratings.length-1];
 const lock=useRef<'pickup'|'dropoff'|'done'>(career.stage);
 const action=useRef<DeliveryAction|null>(null);const [busy,setBusy]=useState(false);
 const wallet=income.wallet;const [xpNotice,setXpNotice]=useState('');
 const progress=<div><b>Cấp {career.level} · {rank(career.level)}</b><div><progress aria-label="Tiến độ XP" max={career.level===MAX_LEVEL?1:threshold(career.level+1)-threshold(career.level)} value={career.level===MAX_LEVEL?1:career.xp-threshold(career.level)}/></div><small>{career.level===MAX_LEVEL?'Đã đạt cấp tối đa':(career.xp-threshold(career.level))+' / '+(threshold(career.level+1)-threshold(career.level))+' XP'}</small></div>;

 const inputs=useRef<Record<InputKey,boolean>>({forward:false,back:false,left:false,right:false});
 const lastDist=useRef(0);const [remaining,setRemaining]=useState(career.remaining);const [phone,setPhone]=useState(false);const [weatherOpen,setWeatherOpen]=useState(()=>!window.matchMedia('(max-width:760px), (max-height:430px)').matches);const [missionOpen,setMissionOpen]=useState(()=>!window.matchMedia('(max-width:760px), (max-height:430px)').matches);
 const energyLocked=useRef(false),serviceLock=useRef(false);const [servicing,setServicing]=useState(false);const [servicePose,setServicePose]=useState<ServicePose|null>(null);const [energyPopup,setEnergyPopup]=useState(false);const [energyTarget,setEnergyTarget]=useState<Station|null>(null);const [budget,setBudget]=useState(20000);const [energyNotice,setEnergyNotice]=useState('');const serviceTimer=useRef<number|undefined>(undefined);const stationList=useMemo(()=>makeStations(map),[map]);
 useEffect(()=>()=>clearTimeout(serviceTimer.current),[]);
 useEffect(()=>{if(!started)return;const down=(e:KeyboardEvent)=>{if(e.target instanceof HTMLElement&&['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const k:Record<string,InputKey>={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};if(k[e.key]){inputs.current[k[e.key]]=true;e.preventDefault();}if(e.key.toLowerCase()==='h'&&!e.repeat){void audio.unlock().then(()=>audio.horn()).catch(()=>{})}if(e.key==='Tab'){e.preventDefault();setPhone(p=>!p)}};
 const up=(e:KeyboardEvent)=>{const k:Record<string,InputKey>={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};if(k[e.key])inputs.current[k[e.key]]=false};
 const release=()=>{inputs.current={forward:false,back:false,left:false,right:false}};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
 return()=>{release();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release)}},[started,audio]);
 const update=(s:Telemetry)=>{setTelemetry(s);const delta=Math.max(0,s.distance-lastDist.current);lastDist.current=s.distance;setHealth(h=>wear(h,delta));setRemaining(r=>Math.max(0,r-delta/1000/(vehicle==='petrol'?30:200)*(vehicle==='petrol'?1:100)));};
 const persist=(c:Career)=>{latest.current=c;if(blockedSave.current)return;try{localStorage.setItem(KEY,JSON.stringify(c));setSaveError('')}catch{setSaveError('Không thể lưu tiến trình. Hãy xuất bản sao lưu.')}};
 const snapshot=():Career=>({...career,health,run:run.current,name:career.name.trim()||'Shipper Đà Nẵng',vehicle,gender,remaining,position:started?{x:telemetry.x,z:telemetry.z}:career.position,stage,order,batch,mapMode:started?(map?'osm':'fallback'):career.mapMode});
 useEffect(()=>{latest.current=snapshot()});
 useEffect(()=>{if(!started)return;const save=()=>persist(latest.current);const timer=window.setInterval(save,5000);const hidden=()=>{if(document.hidden)save()};window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',hidden);return()=>{window.clearInterval(timer);window.removeEventListener('pagehide',save);document.removeEventListener('visibilitychange',hidden)}},[started]);
 useEffect(()=>{if(started)persist(latest.current)},[started,stage,order,batch,career]);
 const exportSave=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(latest.current,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='danang-rider-career.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const importSave=async(file:File)=>{try{if(file.size>5000000)throw Error('File quá lớn');const c=parseCareer(await file.text());if(!window.confirm('Thay thế tiến trình hiện tại bằng bản sao lưu?'))return;localStorage.setItem(KEY,JSON.stringify(c));window.location.reload()}catch(e){setSaveError(e instanceof Error?e.message:'Không thể nhập dữ liệu')}};
 const target:Point=order?(stage==='pickup'?order.pickup:order.delivery):telemetry;
 const distanceTo=Math.hypot(telemetry.x-target.x,telemetry.z-target.z);
 const garages=useMemo(()=>makeGarages(map,stationList),[map,stationList]);const nearbyGarage=garages.find(g=>Math.hypot(g.access.x-telemetry.x,g.access.z-telemetry.z)<12);
 const nearbyStation=stationList.find(s=>s.kind===vehicle&&Math.hypot(s.access.x-telemetry.x,s.access.z-telemetry.z)<12);
 energyLocked.current=remaining<=0||servicing||energyPopup||repairPopup;
 const repairVehicle=()=>{if(serviceLock.current||action.current||!nearbyGarage||telemetry.speed>2)return;const q=repairQuote(health,wallet,repairBudget);if(!q.cost)return;serviceLock.current=true;energyLocked.current=true;setServicing(true);setRepairPopup(false);setRepairPose({garage:nearbyGarage,bike:{x:telemetry.x,z:telemetry.z},started:performance.now()});for(const k of Object.keys(inputs.current) as InputKey[])inputs.current[k]=false;const id='REPAIR-'+Date.now();serviceTimer.current=window.setTimeout(()=>{const next=repair({...latest.current,health},repairBudget,id);setHealth(next.health??100);setCareer(next);persist(next);setRepairPose(null);setServicing(false);serviceLock.current=false;setEnergyNotice('Đã sửa xe · '+fmt(q.cost)+'đ')},5000)};
 const service=(rescue=false)=>{if(serviceLock.current||action.current||telemetry.speed>2||(!rescue&&!nearbyStation)||(rescue&&remaining>0))return;const amount=rescue?Math.min(budget,vehicle==='petrol'?11500:2000):budget;const q=quote(vehicle,remaining,wallet,amount);if(!q.cost){setEnergyNotice('Không đủ tiền hoặc đã đầy');return}serviceLock.current=true;energyLocked.current=true;setServicing(true);setEnergyPopup(false);setServicePose(!rescue&&nearbyStation?{station:nearbyStation,bike:{x:telemetry.x,z:telemetry.z},heading:telemetry.heading,started:performance.now()}:null);setPhone(false);for(const k of Object.keys(inputs.current) as InputKey[])inputs.current[k]=false;const id='ENERGY-'+Date.now();serviceTimer.current=window.setTimeout(()=>{const next=purchase({...latest.current,remaining},amount,id);setRemaining(next.remaining);setCareer(next);persist(next);serviceLock.current=false;setServicing(false);setServicePose(null);setEnergyNotice('Đã tiếp năng lượng · '+fmt(q.cost)+'đ')},rescue?1500:4000)};
 const interact=()=>{if(serviceLock.current||energyPopup||repairPopup)return;if(!order||distanceTo>=10||telemetry.speed>2||action.current||lock.current!==stage||stage==='done')return;action.current={kind:stage,elapsed:0};setBusy(true);setPhone(false);for(const k of Object.keys(inputs.current) as InputKey[])inputs.current[k]=false;};
 const completeDelivery=()=>{const a=action.current;if(!a||!order||lock.current!==a.kind)return;action.current=null;setBusy(false);if(a.kind==='pickup'){lock.current='dropoff';setStage('dropoff')}else{lock.current='done';setStage('done');const next=settle({...snapshot(),stage:'done'},order);setXpNotice('+'+(next.xp-career.xp)+' XP'+(next.level>career.level?' · LÊN CẤP '+next.level+' · Thưởng '+fmt(next.income.wallet-career.income.wallet-order.fare-(next.ratings?.at(-1)?.tip??0))+'đ':''));run.current=null;persist(next);setCareer(next);setBatch(next.batch);audio.deliverySuccess()}};
 const accept=(o:Order)=>{setXpNotice('');if(serviceLock.current||lock.current!=='done'||career.paid.includes(o.id)||(o.kind&&career.level<ORDER_TYPES[o.kind].level)||(o.kind==='vip'&&!vip))return;run.current=startRun(o);setNow(Date.now());lock.current='pickup';setOrder(o);setStage('pickup');setPhone(false)};
 const reset=()=>{setPhone(true);};
 if(!started)return <div className="menu"><div className="menu-card"><span className="eyebrow">{SPRINT_LABEL}</span><h1>ĐÀ NẴNG<br/><em>RIDER</em></h1><p>Chạy xe, khám phá phố 3D và hoàn thành đơn giao hàng đầu tiên.</p><label>Tên shipper</label><input maxLength={40} value={career.name} onChange={e=>setCareer(c=>({...c,name:e.target.value}))}/><p>💰 {fmt(wallet)}đ · {career.xp} XP</p>{progress}<button onClick={exportSave}>Xuất bản sao lưu JSON</button><label>Nhập bản sao lưu <input type="file" accept=".json,application/json" onChange={e=>{const file=e.target.files?.[0];if(file)void importSave(file)}}/></label>{saveError&&<p role="alert">{saveError}</p>}<label>Nhân vật</label><div className="options"><button className={gender==='male'?'selected':''} onClick={()=>setGender('male')}>👨 Nam</button><button className={gender==='female'?'selected':''} onClick={()=>setGender('female')}>👩 Nữ</button></div><label>Phương tiện</label><div className="options"><button className={vehicle==='petrol'?'selected':''} disabled={career.mapMode!==null} onClick={()=>setVehicle('petrol')}>⛽ Xe xăng</button><button className={vehicle==='electric'?'selected':''} disabled={career.mapMode!==null} onClick={()=>setVehicle('electric')}>⚡ Xe điện</button></div><button className="primary" disabled={mapStatus==='loading'||blockedSave.current} onClick={()=>{void audio.unlock().catch(()=>{});const mode=map?'osm':'fallback';if(career.mapMode&&career.mapMode!==mode&&stage!=='done'){setSaveError('Cần tải lại đúng bản đồ để tiếp tục đơn đang giao.');return}const start=career.mapMode===mode&&career.position?career.position:map?.spawn??{x:0,z:-20};setSpawn(start);setTelemetry(t=>({...t,...start}));setRemaining(vehicle===career.vehicle?career.remaining:initialFuel[vehicle]);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();window.scrollTo(0,0);setStarted(true)}}>BẮT ĐẦU CHẠY XE →</button><small>{mapStatus==='loading'?'Đang thử tải bản đồ OpenStreetMap…':mapStatus==='osm'?'Đường phố và công trình từ OpenStreetMap · khu vực trung tâm Đà Nẵng':'Không tải được OSM · dùng khu phố mẫu ngoại tuyến'}</small><small title={BUILD_SHA || 'Commit SHA unavailable'}>{BUILD_LABEL}</small>{mapStatus==='fallback'&&<div className="map-error" role="status"><p>{mapError}</p><button onClick={()=>setMapAttempt(v=>v+1)}>THỬ TẢI OSM LẠI</button></div>}</div></div>;
 return <div className="game"><Game health={health} garages={garages} repairPose={repairPose} servicePose={servicePose} energyLocked={energyLocked} stations={stationList} onCargoImpact={cargoImpact} spawn={spawn} action={action} onDeliveryComplete={completeDelivery} police={police} vehicle={vehicle} gender={gender} inputs={inputs} onTick={update} map={map} onStatus={setEnvironmentStatus} audio={audio} target={target} stage={stage}/><div className="topbar"><div className="hud-left"><button type="button" className="hud-collapse" aria-expanded={weatherOpen} aria-controls="weather-hud" onClick={()=>setWeatherOpen(v=>!v)}>☁ Thời tiết {weatherOpen?"▴":"▾"}</button><div id="weather-hud" className="brand" hidden={!weatherOpen}>ĐÀ NẴNG <b>RIDER</b><small>{environmentStatus}</small><small title={BUILD_SHA || 'Commit SHA unavailable'}>{BUILD_LABEL}</small><small><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" style={{color:'inherit'}}>Thời tiết Đà Nẵng: Open-Meteo</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" style={{color:'inherit'}}>CC BY 4.0</a></small></div><button type="button" className="hud-collapse" aria-expanded={missionOpen} aria-controls="mission-hud" onClick={()=>setMissionOpen(v=>!v)}>📋 HUD {missionOpen?"▴":"▾"}{!missionOpen&&(nearbyGarage||nearbyStation||remaining<=0||(stage!=='done'&&distanceTo<10))?" · !":""}</button><div id="mission-hud" className="mission" hidden={!missionOpen}><small style={{color:health<30?"#ff9696":undefined}}>🔧 Độ bền {Math.round(health)}%</small>{nearbyGarage&&!servicing&&<button disabled={busy||telemetry.speed>2} onClick={()=>{setPhone(false);setRepairPopup(true);for(const k of Object.keys(inputs.current) as InputKey[])inputs.current[k]=false}}>SỬA XE</button>}{(nearbyStation||remaining<=0)&&!servicing&&<button disabled={busy||telemetry.speed>2} onClick={()=>{setPhone(false);setEnergyPopup(true);for(const k of Object.keys(inputs.current) as InputKey[])inputs.current[k]=false}}>{nearbyStation?(vehicle==='petrol'?'ĐỔ XĂNG':'SẠC ĐIỆN'):'CỨU HỘ NĂNG LƯỢNG'}</button>}<small>Cấp {career.level} · {career.xp} XP</small>{remaining<=capacity(vehicle)*.15&&<small style={{color:'#ffb86b'}}>{remaining<=0?'HẾT NĂNG LƯỢNG':'Sắp hết năng lượng'}</small>}{servicing&&<small role="status">{repairPose?'Đang sửa xe…':'Đang tiếp năng lượng…'}</small>}{energyNotice&&<small>{energyNotice}</small>}{stage!=='done'&&run.current&&<small style={{color:seconds<0?'#ff9696':'#4ce4c3'}}>⏱ {timerText} · Hàng {run.current.condition}%</small>}{stage==='done'&&lastRating?.id===order?.id&&lastRating&&<small>{'★'.repeat(lastRating.stars)} · {lastRating.late?'Giao trễ':'Đúng giờ'} · Tip {fmt(lastRating.tip)}đ · Hàng {lastRating.condition}%</small>}{xpNotice&&<small role="status">{xpNotice}</small>}<b>{stage==='pickup'?'📦 ĐẾN ĐIỂM NHẬN HÀNG':stage==='dropoff'?'🛵 GIAO HÀNG CHO KHÁCH':order?'🎉 HOÀN THÀNH ĐƠN!':'📱 CHỌN ĐƠN HÀNG'}</b><span>{stage==='done'?(order?'Đã nhận '+fmt(order.fare)+'đ':'Mở điện thoại để nhận đơn'):`Còn ${Math.round(distanceTo)} m · Đơn #${order?.id}`}</span>{stage!=='done'&&distanceTo<10&&<button disabled={busy||telemetry.speed>2} onClick={interact}>{busy?(stage==='pickup'?'ĐANG NHẬN HÀNG…':'ĐANG GIAO HÀNG…'):telemetry.speed>2?'DỪNG XE ĐỂ TƯƠNG TÁC':stage==='pickup'?'NHẬN HÀNG':'GIAO HÀNG'}</button>}{stage==='done'&&<button onClick={reset}>NHẬN ĐƠN MỚI</button>}</div></div><div className="hud-right"><div className="hud-actions"><button className="phone-toggle" aria-label={muted?"Bật âm thanh":"Tắt âm thanh"} onClick={()=>{const next=!muted;setMuted(next);audio.setMuted(next);if(!next)void audio.unlock().catch(()=>{})}}>{muted?"🔇":"🔊"}</button><button className="phone-toggle" aria-label="Mở điện thoại" onClick={()=>setPhone(p=>!p)}>📱</button><div className="wallet">💰 {fmt(wallet)}đ</div></div><GPS garages={garages} vehicle={vehicle} stations={stationList} energyTarget={energyTarget} onEnergyTarget={setEnergyTarget} police={police} roads={map?.roads} position={telemetry} heading={telemetry.heading} target={target} done={stage==='done'}/></div></div><div className="stats"><strong>{Math.round(telemetry.speed)} <small>km/h</small></strong><span>{vehicle==='petrol'?'⛽ '+remaining.toFixed(2)+' lít':'⚡ '+remaining.toFixed(1)+'%'}</span><span>{telemetry.fps||'–'} FPS · Ô {cell(telemetry.x)}, {cell(telemetry.z)}</span><span>Đã chạy {(telemetry.distance/1000).toFixed(2)} km</span></div>{repairPopup&&<div className="phone-backdrop" onClick={()=>setRepairPopup(false)}><div className="phone" role="dialog" aria-modal="true" aria-label="Sửa xe" onClick={e=>e.stopPropagation()}><h3>🔧 SỬA CHỮA XE</h3><p>Độ bền {health.toFixed(1)}% · 500đ/1%</p><label>Ngân sách<select value={repairBudget} onChange={e=>setRepairBudget(Number(e.target.value))}>{[5000,10000,20000,50000].map(n=><option key={n} value={n}>{fmt(n)}đ</option>)}</select></label><p>Chi phí {fmt(repairQuote(health,wallet,repairBudget).cost)}đ · Sau sửa {repairQuote(health,wallet,repairBudget).health.toFixed(1)}%</p><button disabled={!nearbyGarage||busy||!repairQuote(health,wallet,repairBudget).cost} onClick={repairVehicle}>Xác nhận sửa xe</button><button onClick={()=>setRepairPopup(false)}>Hủy</button></div></div>}{energyPopup&&<div className="phone-backdrop" onClick={()=>setEnergyPopup(false)}><div className="phone" role="dialog" aria-modal="true" aria-label="Tiếp năng lượng" onClick={e=>e.stopPropagation()}><h3>{nearbyStation?(vehicle==='petrol'?'⛽ ĐỔ XĂNG':'⚡ SẠC ĐIỆN'):'CỨU HỘ NĂNG LƯỢNG'}</h3><p>{vehicle==='petrol'?'23.000đ/lít':'200đ/% pin'}</p><p>Hiện tại: {remaining.toFixed(2)} {vehicle==='petrol'?'lít':'%'}</p><label>Ngân sách (đ)<select value={budget} onChange={e=>setBudget(Number(e.target.value))}>{[5000,10000,20000,50000,100000].map(n=><option key={n} value={n}>{fmt(n)}đ</option>)}</select></label><p>Dự kiến {fmt(quote(vehicle,remaining,wallet,nearbyStation?budget:Math.min(budget,vehicle==='petrol'?11500:2000)).cost)}đ</p><button disabled={busy||servicing||(!nearbyStation&&remaining>0)||!quote(vehicle,remaining,wallet,budget).cost} onClick={()=>service(!nearbyStation)}>Xác nhận {nearbyStation?(vehicle==='petrol'?'đổ xăng':'sạc điện'):'cứu hộ'}</button><button onClick={()=>setEnergyPopup(false)}>Hủy</button></div></div>}{phone&&<div className="phone-backdrop" onClick={()=>setPhone(false)}><div className="phone" onClick={e=>e.stopPropagation()}><h3>RIDER PHONE</h3><p>⭐ {ratings.length?rating.toFixed(2):'Chưa có đánh giá'} · {ratings.length} lượt</p><small>VIP: cấp 20, ít nhất 5 đánh giá và trung bình 4,5 sao.</small><p>{career.name} · Tổng {career.xp} XP</p>{progress}<details><summary>Mốc mở khóa dự kiến</summary><p>Cấp 10: Urban Pro · Cấp 15: Electric Max · Cấp 25: Speed Rider · Cấp 30: Cargo Master</p><small>Cửa hàng sẽ có ở Sprint 4.7.</small></details><small>{saveError||'Tự động lưu mỗi 5 giây'}</small><button onClick={exportSave}>Xuất bản sao lưu JSON</button><details><summary>Lịch sử giao dịch</summary>{career.ledger.slice(-20).reverse().map(t=><p key={t.id}>{t.id} · {t.direction==='expense'?'-':'+'}{fmt(t.amount)}đ</p>)}</details><p>💰 {fmt(wallet)}đ · {income.completed} đơn hoàn thành</p><p>📏 Quãng đường giao hàng: {(income.meters/1000).toFixed(1)} km</p>{stage==='done'?<><h4>Đơn hàng khả dụng</h4><details><summary>Loại đơn và cấp mở khóa</summary>{Object.values(ORDER_TYPES).map(c=><p key={c.label}>{c.label} · Cấp {c.level} · {career.level>=c.level&&(c!==ORDER_TYPES.vip||vip)?'Đã mở khóa':'Chưa mở khóa'}</p>)}</details>{!offers.length&&<p>Chưa có tuyến đường phù hợp. Hãy làm mới đơn.</p>}{offers.map(o=><div className="order-card" key={o.id}><b>{ORDER_TYPES[o.kind??'parcel'].label} · #{o.id} · {o.shop}</b><p>{ORDER_TYPES[o.kind??'parcel'].note} · {o.size??2}/2 ô hàng · Dự kiến {o.minutes??5} phút</p><p>{(o.meters/1000).toFixed(1)} km · {fmt(o.fare)}đ</p><button onClick={()=>accept(o)}>Nhận đơn</button></div>)}<button onClick={()=>setBatch(v=>v+1)}>Làm mới đơn</button></>:<><p>📦 {ORDER_TYPES[order?.kind??'parcel'].label} · #{order?.id} · {order?.shop}</p><p>{ORDER_TYPES[order?.kind??'parcel'].note} · Dự kiến {order?.minutes??5} phút</p><p>{stage==='pickup'?'Đến điểm lấy hàng':'Đến điểm giao hàng'} · {Math.round(distanceTo)} m</p><p>💵 Cước {fmt(order?.fare??0)}đ</p></>}<button onClick={()=>setPhone(false)}>Đóng</button></div></div>}<div className="controls left"><Touch keyName="left" inputs={inputs}>◀</Touch><Touch keyName="right" inputs={inputs}>▶</Touch></div><button className="horn" aria-label="Bấm còi" onClick={()=>{void audio.unlock().then(()=>audio.horn()).catch(()=>{})}}>📣</button><div className="controls right"><Touch keyName="back" inputs={inputs}>PHANH</Touch><Touch keyName="forward" inputs={inputs}>GA</Touch></div><div className="help">WASD / phím mũi tên · Tab mở điện thoại · đến gần cột sáng để tương tác</div></div>;
}
function Touch({keyName,inputs,children}:{keyName:InputKey;inputs:React.MutableRefObject<Record<InputKey,boolean>>;children:React.ReactNode}){return <button className="touch" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);inputs.current[keyName]=true}} onPointerUp={()=>inputs.current[keyName]=false} onPointerCancel={()=>inputs.current[keyName]=false} onLostPointerCapture={()=>inputs.current[keyName]=false}>{children}</button>}

createRoot(document.getElementById('root')!).render(<App/>);
