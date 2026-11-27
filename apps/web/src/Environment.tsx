import {settings} from './GraphicsSettings';
import {graphics,budgets,pointGrid} from './performance';
import {useMemo,useRef,useEffect,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import type {EnvironmentCollider} from './environmentCollision';
import type {OSMMap,Point} from './osm';
import {environmentAt,clockLabel,parseWeather,validCache,weatherLabel,WEATHER_URL,REFRESH_MS,CACHE_KEY,type Weather,weatherVisual,prefetchWeather} from './environment';
const RAIN=1000,LAMPS=12,ACTIVE_LIGHTS=8;
export function Environment({map,player,onStatus,audioWeather,lampColliders}:{lampColliders:React.RefObject<EnvironmentCollider[]>;audioWeather:React.RefObject<{rain:number;night:boolean}>;map:OSMMap|null;player:React.RefObject<Point>;onStatus:(s:string)=>void}){
 const {scene}=useThree();const [lightCount,setLightCount]=useState(6);const lastQuality=useRef(-1);const statusAt=useRef(-10);
 useEffect(()=>()=>{weatherVisual.rain=0;weatherVisual.wetness=0;weatherVisual.windX=0;weatherVisual.windZ=0},[]);
 const lampMaterial=useRef<THREE.MeshStandardMaterial>(null);const shadowAnchor=useMemo(()=>new THREE.Vector3(),[]);
 useEffect(()=>()=>{lampColliders.current=[]},[lampColliders]);
 const hemi=useRef<THREE.HemisphereLight>(null),sun=useRef<THREE.DirectionalLight>(null),rain=useRef<THREE.LineSegments>(null);
 const pools=useRef<THREE.InstancedMesh>(null);const poolMaterial=useRef<THREE.ShaderMaterial>(null);
 const poles=useRef<THREE.InstancedMesh>(null),lamps=useRef<THREE.InstancedMesh>(null),lights=useRef<(THREE.PointLight|null)[]>([]);
 const elapsed=useRef(0),last=useRef(''),wet=useRef(0),cloud=useRef(0),lastScan=useRef(-10);
 const weather=useRef<Weather|null>(null),failed=useRef(false),mist=useRef(0);
 useEffect(()=>{
  let active=true;
  try{const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(validCache(cached))weather.current=cached}catch{/* storage unavailable */}
  const refresh=async()=>{const next=await prefetchWeather();if(active){weather.current=next;failed.current=!next||Date.now()-next.fetchedAt>REFRESH_MS}};
  if(!weather.current||Date.now()-weather.current.fetchedAt>=REFRESH_MS)void refresh();
  const timer=setInterval(refresh,REFRESH_MS);window.addEventListener('online',refresh);
  const visible=()=>{if(!document.hidden&&(!weather.current||failed.current||Date.now()-weather.current.fetchedAt>=REFRESH_MS))void refresh()};document.addEventListener('visibilitychange',visible);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',visible)};
 },[]);
 const colors=useMemo(()=>({day:new THREE.Color('#a7d4e9'),night:new THREE.Color('#101c36'),dusk:new THREE.Color('#e7a27a'),gray:new THREE.Color('#8494a3'),sky:new THREE.Color(),sun:new THREE.Color()}),[]);
 const drops=useMemo(()=>Array.from({length:RAIN},()=>({x:Math.random()*40-20,y:Math.random()*18,z:Math.random()*40-20})),[]);
 const geometry=useMemo(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(RAIN*6),3));return g},[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const dummy=useMemo(()=>new THREE.Object3D(),[]);
 const locations=useMemo(()=>{const out:Point[]=[];if(map)for(const r of map.roads){if(r.width<8)continue;for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],len=Math.hypot(b.x-a.x,b.z-a.z);if(len<18)continue;const ux=(b.x-a.x)/len,uz=(b.z-a.z)/len;for(let t=9;t<len-5;t+=30)out.push({x:a.x+ux*t-uz*(r.width/2+1.5),z:a.z+uz*t+ux*(r.width/2+1.5)})}}if(!map)return out;
 const segments=map.roads.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,width:r.width})));
 return out.filter(p=>!segments.some(({a,b,width})=>{const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;if(!l)return false;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)<width/2+0.65})&&!map.buildings.some(b=>Math.abs(p.x-b.x)<b.halfX+0.5&&Math.abs(p.z-b.z)<b.halfZ+0.5));
 },[map]);
 const nearbyLamps=useMemo(()=>pointGrid(locations),[locations]);
 useFrame((_,raw)=>{
 const dt=Math.min(raw,0.1);elapsed.current+=dt;const budget=settings.mode==='auto'?budgets[graphics.tier]:settings;if(lastQuality.current!==budget.lights){lastQuality.current=budget.lights;setLightCount(budget.lights);lastScan.current=-10;}
 const now=new Date(),e=environmentAt(now),p=player.current;
 wet.current+=((weather.current?.rain??0)-wet.current)*(1-Math.exp(-dt*0.8));
 cloud.current+=((weather.current?.cloud??0)-cloud.current)*(1-Math.exp(-dt*0.5));
 mist.current+=((weather.current?.fog??0)-mist.current)*(1-Math.exp(-dt*0.5));
 weatherVisual.rain=wet.current;weatherVisual.wetness=THREE.MathUtils.damp(weatherVisual.wetness,wet.current>0.05?Math.min(1,wet.current*2):0,wet.current>.05?.12:.025,dt);
 const wind=weather.current?.windDirection??0, speed=Math.min(12,(weather.current?.windSpeed??0)/3.6);
 weatherVisual.windX=THREE.MathUtils.damp(weatherVisual.windX,-Math.sin(wind*Math.PI/180)*speed,1,dt);weatherVisual.windZ=THREE.MathUtils.damp(weatherVisual.windZ,Math.cos(wind*Math.PI/180)*speed,1,dt);
 audioWeather.current.rain=wet.current;audioWeather.current.night=e.night;
 colors.sky.copy(colors.night).lerp(colors.day,e.daylight).lerp(colors.dusk,e.twilight*0.55).lerp(colors.gray,cloud.current*e.daylight*0.65);
 if(scene.background instanceof THREE.Color)scene.background.copy(colors.sky);else scene.background=colors.sky.clone();
 if(scene.fog instanceof THREE.Fog){scene.fog.color.copy(colors.sky);scene.fog.near=180-100*Math.max(wet.current,mist.current);scene.fog.far=600-450*Math.max(wet.current,mist.current)}
 if(hemi.current){hemi.current.intensity=(graphics.tier===0?1.05:.78)+e.daylight*(.85+cloud.current*.25);hemi.current.color.copy(colors.sky).lerp(colors.day,.52);hemi.current.groundColor.set('#8b8171');}
 if(sun.current){const light=sun.current;light.intensity=.04+e.daylight*(2.3-cloud.current*1.85);light.color.copy(colors.sun.set('#fff8eb').lerp(colors.dusk,e.twilight*.8));const angle=(e.hour-6)/12*Math.PI;shadowAnchor.set(Math.round(p.x/4)*4,0,Math.round(p.z/4)*4);light.target.position.copy(shadowAnchor);light.target.updateMatrixWorld();light.position.set(shadowAnchor.x+Math.cos(angle)*100,Math.max(12,Math.sin(angle)*100),shadowAnchor.z+35);const size=settings.mode==='auto'?[0,256,512][graphics.tier]:settings.shadowSize;if(size>0&&light.shadow.mapSize.x!==size){light.shadow.map?.dispose();light.shadow.map=null;light.shadow.mapSize.set(size,size);light.shadow.needsUpdate=true;}light.castShadow=settings.shadow&&size>0&&e.daylight>.35&&cloud.current<.85;}
 if(elapsed.current-statusAt.current>1){statusAt.current=elapsed.current;const status=clockLabel(now)+' · '+now.toLocaleDateString('vi-VN')+' · '+weatherLabel(weather.current,failed.current,now.getTime());if(status!==last.current){last.current=status;onStatus(status)}}
 if(rain.current){rain.current.visible=wet.current>0.02;rain.current.position.set(p.x,0,p.z);const mat=rain.current.material as THREE.LineBasicMaterial;mat.opacity=wet.current*.65;if(rain.current.visible){const attr=geometry.getAttribute('position');for(let i=0;i<budget.rain;i++){const d=drops[i];d.y-=dt*(14+wet.current*9);d.x+=weatherVisual.windX*dt;d.z+=weatherVisual.windZ*dt;if(Math.abs(d.x)>20)d.x-=Math.sign(d.x)*40;if(Math.abs(d.z)>20)d.z-=Math.sign(d.z)*40;if(d.y<0){d.y+=18;d.x=Math.random()*40-20;d.z=Math.random()*40-20}attr.setXYZ(i*2,d.x,d.y,d.z);attr.setXYZ(i*2+1,d.x-weatherVisual.windX*.045,d.y+.45+wet.current*.45,d.z-weatherVisual.windZ*.045)}geometry.setDrawRange(0,Math.ceil(budget.rain*wet.current)*2);attr.needsUpdate=true}}
 if(lamps.current){lamps.current.visible=true;if(elapsed.current-lastScan.current>0.7){lastScan.current=elapsed.current;const near=nearbyLamps(p.x,p.z,100).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0,LAMPS);lampColliders.current=near.map(q=>({...q,radius:0.12,kind:'lamp'}));for(let i=0;i<LAMPS;i++){const q=near[i];dummy.position.set(q?.x??0,q?3:-100,q?.z??0);dummy.scale.setScalar(q?1:0);dummy.updateMatrix();poles.current?.setMatrixAt(i,dummy.matrix);dummy.position.set(q?.x??0,q?6:-100,q?.z??0);dummy.scale.setScalar(q?1:0);dummy.updateMatrix();lamps.current.setMatrixAt(i,dummy.matrix);dummy.position.set(q?.x??0,q?.z===undefined?-100:.095,q?.z??0);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(q?1:0);dummy.updateMatrix();pools.current?.setMatrixAt(i,dummy.matrix);dummy.rotation.set(0,0,0);if(i<ACTIVE_LIGHTS&&lights.current[i]){lights.current[i]!.position.set(q?.x??0,q?5.5:-100,q?.z??0)}}if(pools.current)pools.current.instanceMatrix.needsUpdate=true;lamps.current.instanceMatrix.needsUpdate=true;if(poles.current)poles.current.instanceMatrix.needsUpdate=true}}
 const lampPower=THREE.MathUtils.clamp((.65-e.daylight)/.5,0,1);if(poolMaterial.current)poolMaterial.current.uniforms.power.value=lampPower*(graphics.tier===0?.24:.12);if(pools.current)pools.current.visible=lampPower>.01;for(const l of lights.current)if(l)l.intensity=lampPower*(graphics.tier===0?150:115);if(lampMaterial.current)lampMaterial.current.emissiveIntensity=lampPower*2.2;
 });
 return <><hemisphereLight ref={hemi} args={['#dceeff','#a49b83',2.1]}/><directionalLight ref={sun} position={[80,140,50]} intensity={2.2} castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} shadow-camera-near={1} shadow-camera-far={220} shadow-bias={-.0004} shadow-normalBias={.08}/><lineSegments ref={rain} geometry={geometry} frustumCulled={false} visible={false}><lineBasicMaterial color="#c9e3ff" transparent opacity={0} depthWrite={false}/></lineSegments><instancedMesh ref={poles} args={[undefined,undefined,LAMPS]} frustumCulled={false}><cylinderGeometry args={[0.09,0.12,6,8]}/><meshStandardMaterial color="#69777a"/></instancedMesh><instancedMesh ref={lamps} args={[undefined,undefined,LAMPS]} frustumCulled={false} visible={false}><sphereGeometry args={[0.24,8,6]}/><meshStandardMaterial ref={lampMaterial} color="#ffe5a3" emissive="#ffd58a" emissiveIntensity={0}/></instancedMesh><instancedMesh ref={pools} args={[undefined,undefined,LAMPS]} frustumCulled={false} visible={false}><planeGeometry args={[22,22]}/><shaderMaterial ref={poolMaterial} transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={{power:{value:0}}} vertexShader={'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}'} fragmentShader={'varying vec2 vUv; uniform float power; void main(){float a=max(0.0,1.0-length(vUv-0.5)*2.0);gl_FragColor=vec4(1.0,0.76,0.35,a*a*power);}'} /></instancedMesh>{Array.from({length:lightCount},(_,i)=>i).map(i=><pointLight key={i} ref={l=>{lights.current[i]=l}} position={[0,-100,0]} color="#ffd58a" intensity={0} distance={42} decay={2}/>)}</>
}
