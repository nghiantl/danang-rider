import {LandmarkWater} from './LandmarkWater';
import {useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {environmentAt} from './environment';
import * as THREE from 'three';
import {type OSMMap,type Point} from './osm';
import {riverGrid} from './riverGeometry';
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
export function Landmarks({map,position}:{map:OSMMap;position:Point}){
 const bridges=useMemo(()=>['cau rong','cau song han'].flatMap((name,index)=>{
 const roads=map.roads.filter(r=>normalize(r.name).includes(name)&&r.bridge);
 const pts=roads.flatMap(r=>r.points);if(pts.length<2)return [];
 const a=pts.reduce((a,b)=>a.x<b.x?a:b),b=pts.reduce((a,b)=>a.x>b.x?a:b);
 const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<100)return [];
 const ux=(b.x-a.x)/length,uz=(b.z-a.z)/length;
 const segments=roads.flatMap(r=>r.points.slice(1).map((q,i)=>({p:r.points[i],q})));
 const centerline=Array.from({length:65},(_,i)=>{
  const t=length*i/64,offsets:number[]=[];
  for(const {p,q} of segments){const u=(p.x-a.x)*ux+(p.z-a.z)*uz,v=(q.x-a.x)*ux+(q.z-a.z)*uz;if(Math.abs(v-u)<.01||t<Math.min(u,v)||t>Math.max(u,v))continue;const f=(t-u)/(v-u),x=p.x+(q.x-p.x)*f,z=p.z+(q.z-p.z)*f;offsets.push(-(x-a.x)*uz+(z-a.z)*ux)}
  return {x:t-length/2,z:offsets.length?(Math.min(...offsets)+Math.max(...offsets))/2:NaN,paired:offsets.length>1&&Math.max(...offsets)-Math.min(...offsets)>2};
 });
 // At staggered carriageway ends a single road center is not the median.
 if(index===0){const paired=centerline.filter(p=>p.paired);if(paired.length>=2){const end=paired[paired.length-1];while(centerline.length>2&&centerline[centerline.length-1].x>end.x)centerline.pop();}}
 const valid=centerline.filter(p=>Number.isFinite(p.z));
 if(index===0&&valid.length<2)return [];
 for(const p of centerline)if(!Number.isFinite(p.z))p.z=valid.reduce((best,q)=>Math.abs(q.x-p.x)<Math.abs(best.x-p.x)?q:best,valid[0]??{x:0,z:0}).z;
 return [{index,a,b,length,centerline,x:(a.x+b.x)/2,z:(a.z+b.z)/2,angle:-Math.atan2(b.z-a.z,b.x-a.x),width:Math.max(...roads.map(r=>r.width))}];
 }),[map]);
 const water=useMemo(()=>{const cells=riverGrid(map).cells;const vertices:number[]=[];for(const p of cells){const x=p.x,z=p.z;vertices.push(x-2,.012,z-2,x-2,.012,z+2,x+2,.012,z+2,x-2,.012,z-2,x+2,.012,z+2,x+2,.012,z-2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g},[map]);
 useEffect(()=>()=>water.dispose(),[water]);
 return <group>
 <LandmarkWater geometry={water}/>
 {bridges.filter(b=>Math.hypot(b.x-position.x,b.z-position.z)<900).map(b=><Bridge key={b.index} {...b}/>)}
 </group>
}
function Bridge({index,x,z,angle,length,width,centerline}:{index:number;x:number;z:number;angle:number;length:number;width:number;centerline:Point[]}){
 const curve=useMemo(()=>new THREE.CatmullRomCurve3(centerline.map((p,i)=>{const t=i/(centerline.length-1);return new THREE.Vector3(p.x,5+7*Math.pow(Math.sin(t*Math.PI*5),2),p.z)})),[centerline]);
 const dragonGeometry=useMemo(()=>{const g=new THREE.TubeGeometry(curve,96,1.5,8,false);const a=g.getAttribute('position');for(let i=0;i<=96;i++){const t=i/96,p=curve.getPointAt(t),scale=Math.min(1,0.08+t*8);for(let j=0;j<=8;j++){const k=i*9+j;a.setXYZ(k,p.x+(a.getX(k)-p.x)*scale,p.y+(a.getY(k)-p.y)*scale,p.z+(a.getZ(k)-p.z)*scale)}}g.computeVertexNormals();return g},[curve]);
 const head=curve.getPoint(1),tangent=curve.getTangent(1);
 const gold='#e5b52d';
 const light=useRef<THREE.MeshStandardMaterial>(null);
 useFrame(()=>{if(light.current)light.current.emissiveIntensity=.12+(1-environmentAt(new Date()).daylight)*1.3});
 useEffect(()=>()=>dragonGeometry.dispose(),[dragonGeometry]);
 return <group position={[x,0,z]} rotation={[0,angle,0]}>
 {/* Rails omitted until separate bridge elevations are available. */}
 {index===0?<><mesh><primitive object={dragonGeometry} attach="geometry"/><meshStandardMaterial ref={light} color={gold} metalness={.55} roughness={.42} emissive="#b87912" emissiveIntensity={0.3}/></mesh><group position={[head.x,head.y,head.z]} rotation={[0,-Math.atan2(tangent.z,tangent.x),0]}><mesh><sphereGeometry args={[2.8,10,8]}/><meshStandardMaterial color={gold}/></mesh><mesh position={[3,0,0]} scale={[2.3,.8,1.5]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color={gold}/></mesh>{[-1,1].map(s=><mesh key={'horn'+s} position={[-1,3,s*1.6]} rotation={[0,0,0.5]}><coneGeometry args={[0.65,3,8]}/><meshStandardMaterial color={gold}/></mesh>)}{[-1,1].map(s=><mesh key={"jaw"+s} position={[2,-1,s*.85]} scale={[2,.35,.6]}><sphereGeometry args={[1,10,6]}/><meshStandardMaterial color="#b98516" metalness={.4}/></mesh>)}{[-1,1].map(s=><mesh key={s} position={[1,1.2,s*2]}><sphereGeometry args={[0.45,8,6]}/><meshBasicMaterial color="#e94b28"/></mesh>)}</group></>:<>{[-1,1].map(s=><group key={s} position={[s*length*.15,0,0]}><mesh position={[0,10,0]}><boxGeometry args={[1.4,20,1.4]}/><meshStandardMaterial color="#e1e5e5"/></mesh>{[-1,1].flatMap(side=>[-1,1].flatMap(d=>[1,2,3,4].map(i=>{const dx=d*i*length*.065,dy=17,dz=side*(width/2+1);const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(dx,-dy,dz).normalize());return <mesh key={side+':'+d+':'+i} position={[dx/2,dy/2,dz/2]} quaternion={q}><cylinderGeometry args={[.09,.09,Math.hypot(dx,dy,dz),5]}/><meshStandardMaterial color="#c7d0d3" metalness={.6} roughness={.35}/></mesh>})))}</group>)}</>}
 </group>
}
