import {useMemo,useRef,useEffect} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import type {OSMMap,Point} from './osm';
import {environmentAt,clockLabel,parseWeather,validCache,weatherLabel,WEATHER_URL,REFRESH_MS,CACHE_KEY,type Weather} from './environment';
const RAIN=350,LAMPS=12;
export function Environment({map,player,onStatus,audioWeather}:{audioWeather:React.RefObject<{rain:number;night:boolean}>;map:OSMMap|null;player:React.RefObject<Point>;onStatus:(s:string)=>void}){
 const {scene}=useThree();
 const hemi=useRef<THREE.HemisphereLight>(null),sun=useRef<THREE.DirectionalLight>(null),rain=useRef<THREE.LineSegments>(null);
 const lamps=useRef<THREE.InstancedMesh>(null),lights=useRef<(THREE.PointLight|null)[]>([]);
 const elapsed=useRef(0),last=useRef(''),wet=useRef(0),cloud=useRef(0),lastScan=useRef(-10);
 const weather=useRef<Weather|null>(null),failed=useRef(false),mist=useRef(0);
 useEffect(()=>{
  let active=true,controller:AbortController|null=null;
  try{const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(validCache(cached))weather.current=cached}catch{/* storage unavailable */}
  const refresh=async()=>{if(controller)return;const request=new AbortController();controller=request;const timeout=setTimeout(()=>request.abort(),10000);
   try{const res=await fetch(WEATHER_URL,{signal:request.signal});if(!res.ok)throw new Error('Weather HTTP '+res.status);const next=parseWeather(await res.json());if(!active)return;weather.current=next;failed.current=false;try{localStorage.setItem(CACHE_KEY,JSON.stringify(next))}catch{/* storage unavailable */}}
   catch{if(active)failed.current=true}finally{clearTimeout(timeout);controller=null}
  };
  if(!weather.current||Date.now()-weather.current.fetchedAt>=REFRESH_MS)void refresh();
  const timer=setInterval(refresh,REFRESH_MS);window.addEventListener('online',refresh);
  const visible=()=>{if(!document.hidden&&(!weather.current||failed.current||Date.now()-weather.current.fetchedAt>=REFRESH_MS))void refresh()};document.addEventListener('visibilitychange',visible);
  return()=>{active=false;controller?.abort();clearInterval(timer);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',visible)};
 },[]);
 const colors=useMemo(()=>({day:new THREE.Color('#a7d4e9'),night:new THREE.Color('#101c36'),dusk:new THREE.Color('#e7a27a'),gray:new THREE.Color('#8494a3'),sky:new THREE.Color(),sun:new THREE.Color()}),[]);
 const drops=useMemo(()=>Array.from({length:RAIN},()=>({x:Math.random()*40-20,y:Math.random()*18,z:Math.random()*40-20})),[]);
 const geometry=useMemo(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(RAIN*6),3));return g},[]);
 const dummy=useMemo(()=>new THREE.Object3D(),[]);
 const locations=useMemo(()=>{const out:Point[]=[];if(map)for(const r of map.roads){if(r.width<8)continue;for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],len=Math.hypot(b.x-a.x,b.z-a.z);if(len<18)continue;const ux=(b.x-a.x)/len,uz=(b.z-a.z)/len;for(let t=9;t<len-5;t+=30)out.push({x:a.x+ux*t-uz*(r.width/2+1.5),z:a.z+uz*t+ux*(r.width/2+1.5)})}}return out},[map]);
 useFrame((_,raw)=>{
 const dt=Math.min(raw,0.05);elapsed.current+=dt;
 const now=new Date(),e=environmentAt(now),p=player.current;
 wet.current+=((weather.current?.rain??0)-wet.current)*(1-Math.exp(-dt*0.8));
 cloud.current+=((weather.current?.cloud??0)-cloud.current)*(1-Math.exp(-dt*0.5));
 mist.current+=((weather.current?.fog??0)-mist.current)*(1-Math.exp(-dt*0.5));
 audioWeather.current.rain=wet.current;audioWeather.current.night=e.night;
 colors.sky.copy(colors.night).lerp(colors.day,e.daylight).lerp(colors.dusk,e.twilight*0.55).lerp(colors.gray,cloud.current*e.daylight*0.65);
 if(scene.background instanceof THREE.Color)scene.background.copy(colors.sky);else scene.background=colors.sky.clone();
 if(scene.fog instanceof THREE.Fog){scene.fog.color.copy(colors.sky);scene.fog.near=180-100*Math.max(wet.current,mist.current);scene.fog.far=600-450*Math.max(wet.current,mist.current)}
 if(hemi.current)hemi.current.intensity=0.48+e.daylight*(1.62-cloud.current*0.6);
 if(sun.current){sun.current.intensity=0.08+e.daylight*(2.12-cloud.current*1.3);sun.current.color.copy(colors.sun.set('#ffffff').lerp(colors.dusk,e.twilight*0.7));const angle=(e.hour-6)/12*Math.PI;sun.current.position.set(Math.cos(angle)*140,Math.max(15,Math.sin(angle)*140),50)}
 const status=clockLabel(now)+' · '+now.toLocaleDateString('vi-VN')+' · '+weatherLabel(weather.current,failed.current,now.getTime());if(status!==last.current){last.current=status;onStatus(status)}
 if(rain.current){rain.current.visible=wet.current>0.02;rain.current.position.set(p.x,0,p.z);const mat=rain.current.material as THREE.LineBasicMaterial;mat.opacity=wet.current*0.55;if(rain.current.visible){const attr=geometry.getAttribute('position');drops.forEach((d,i)=>{d.y-=dt*15;if(d.y<0){d.y+=18;d.x=Math.random()*40-20;d.z=Math.random()*40-20}attr.setXYZ(i*2,d.x,d.y,d.z);attr.setXYZ(i*2+1,d.x+0.12,d.y+0.65,d.z)});geometry.setDrawRange(0,Math.ceil(RAIN*wet.current)*2);attr.needsUpdate=true}}
 if(lamps.current){lamps.current.visible=e.night;if(elapsed.current-lastScan.current>0.7){lastScan.current=elapsed.current;const near=locations.filter(q=>Math.hypot(q.x-p.x,q.z-p.z)<100).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0,LAMPS);for(let i=0;i<LAMPS;i++){const q=near[i];dummy.position.set(q?.x??0,q?6:-100,q?.z??0);dummy.scale.setScalar(q?1:0);dummy.updateMatrix();lamps.current.setMatrixAt(i,dummy.matrix);if(i<3&&lights.current[i]){lights.current[i]!.position.set(q?.x??0,q?5.5:-100,q?.z??0)}}lamps.current.instanceMatrix.needsUpdate=true}}
 for(const l of lights.current)if(l)l.intensity=e.night?22:0;
 });
 return <><hemisphereLight ref={hemi} args={['#dceeff','#a49b83',2.1]}/><directionalLight ref={sun} position={[80,140,50]} intensity={2.2}/><lineSegments ref={rain} geometry={geometry} frustumCulled={false} visible={false}><lineBasicMaterial color="#c9e3ff" transparent opacity={0} depthWrite={false}/></lineSegments><instancedMesh ref={lamps} args={[undefined,undefined,LAMPS]} frustumCulled={false} visible={false}><sphereGeometry args={[0.24,8,6]}/><meshBasicMaterial color="#ffe5a3"/></instancedMesh>{[0,1,2].map(i=><pointLight key={i} ref={l=>{lights.current[i]=l}} position={[0,-100,0]} color="#ffd58a" intensity={0} distance={18} decay={2}/>)}</>
}
