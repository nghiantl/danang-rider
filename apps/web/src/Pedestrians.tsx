import {useMemo,useRef,useLayoutEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {OSMMap,Point} from './osm';
import {walkPaths,walkerPose,stepWalker,type Walker} from './pedestrians';
import {collidesWithBuildings} from './collision';
const COUNT=24;
export function Pedestrians({map,player}:{map:OSMMap;player:React.RefObject<Point>}){
 const paths=useMemo(()=>walkPaths(map.roads),[map]);
 const walkers=useRef<(Walker|null)[]>([]);
 const torso=useRef<THREE.InstancedMesh>(null),head=useRef<THREE.InstancedMesh>(null),limbs=useRef<THREE.InstancedMesh>(null);
 const dummy=useMemo(()=>new THREE.Object3D(),[]);
 const nearby=useRef<number[]>([]),last=useRef(-10);
 const clear=(x:number,z:number)=>!collidesWithBuildings(x,z,0.35,map.buildings);
 useLayoutEffect(()=>{walkers.current=[];last.current=-10;
 for(let i=0;i<COUNT;i++){
 torso.current?.setColorAt(i,new THREE.Color(['#b34c45','#386b94','#e3bd68','#487e68','#e0d9cf','#775c91'][i%6]));
 head.current?.setColorAt(i,new THREE.Color(['#c58d64','#e0b08a','#a87550'][i%3]));
 }
 for(const mesh of [torso.current,head.current])if(mesh?.instanceColor)mesh.instanceColor.needsUpdate=true;
 },[paths]);
 useFrame(({clock},raw)=>{
 if(!torso.current||!head.current||!limbs.current)return;
 const p=player.current,dt=Math.min(raw,0.05);
 if(clock.elapsedTime-last.current>1){last.current=clock.elapsedTime;nearby.current=paths.flatMap((v,i)=>{const t=Math.max(0,Math.min(v.length,(p.x-v.a.x)*v.ux+(p.z-v.a.z)*v.uz));return Math.hypot(v.a.x+v.ux*t-p.x,v.a.z+v.uz*t-p.z)<110?[i]:[]})}
 const place=(mesh:THREE.InstancedMesh,i:number,x:number,y:number,z:number,h:number,w:number,l:number,d:number,tilt=0)=>{
 dummy.position.set(x,y,z);dummy.rotation.set(tilt,h,0,'YXZ');dummy.scale.set(w,l,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
 };
 for(let i=0;i<COUNT;i++){
 let w=walkers.current[i];let q=w?walkerPose(w,paths[w.path]):null;
 if(!w||!q||Math.hypot(q.x-p.x,q.z-p.z)>145){
 w=null;
 for(let tries=0;tries<8&&nearby.current.length;tries++){
 const id=nearby.current[Math.floor(Math.random()*nearby.current.length)],path=paths[id];
 const candidate={path:id,t:Math.random()*path.length,direction:Math.random()<0.5?-1:1,speed:0.8+Math.random()*0.65,phase:Math.random()*6};
 const pos=walkerPose(candidate,path),dist=Math.hypot(pos.x-p.x,pos.z-p.z);
 if(dist>15&&dist<110&&clear(pos.x,pos.z)&&walkers.current.every(other=>{if(!other)return true;const o=walkerPose(other,paths[other.path]);return Math.hypot(o.x-pos.x,o.z-pos.z)>1.2})){w=candidate;break}
 }
 walkers.current[i]=w;
 }
 if(!w){place(torso.current,i,0,-100,0,0,0,0,0);place(head.current,i,0,-100,0,0,0,0,0);for(let j=0;j<4;j++)place(limbs.current,i*4+j,0,-100,0,0,0,0,0);continue}
 const path=paths[w.path],old={...w};
 let moving=stepWalker(w,path,p,dt);q=walkerPose(w,path);
 if(moving&&!clear(q.x,q.z)){Object.assign(w,old);w.direction*=-1;q=walkerPose(w,path);moving=false}
 const h=q.heading,scale=0.88+(i%5)*0.045,swing=moving?Math.sin(w.phase)*0.55:0;
 place(torso.current,i,q.x,1.16*scale+0.11,q.z,h,0.42*scale,0.58*scale,0.25*scale);
 place(head.current,i,q.x,1.65*scale+0.11,q.z,h,0.27*scale,0.32*scale,0.27*scale);
 for(let j=0;j<4;j++){
 const arm=j>=2,side=j%2?1:-1,x=side*(arm?0.27:0.12)*scale;
 place(limbs.current,i*4+j,q.x+Math.cos(h)*x,(arm?1.12:0.46)*scale+0.11,q.z-Math.sin(h)*x,h,0.13*scale,(arm?0.48:0.69)*scale,0.15*scale,swing*side*(arm?-1:1));
 }
 }
 for(const mesh of [torso.current,head.current,limbs.current])mesh.instanceMatrix.needsUpdate=true;
 });
 return <group><instancedMesh ref={torso} args={[undefined,undefined,COUNT]} frustumCulled={false}><boxGeometry/><meshStandardMaterial/></instancedMesh><instancedMesh ref={head} args={[undefined,undefined,COUNT]} frustumCulled={false}><sphereGeometry args={[0.5,8,6]}/><meshStandardMaterial/></instancedMesh><instancedMesh ref={limbs} args={[undefined,undefined,COUNT*4]} frustumCulled={false}><boxGeometry/><meshStandardMaterial color="#34424d"/></instancedMesh></group>
}
