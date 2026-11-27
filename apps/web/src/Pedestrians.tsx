import {settings} from './GraphicsSettings';
import {graphics} from './performance';
import {useMemo,useRef,useLayoutEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {OSMMap,Point} from './osm';
import {signalState,CROSSWALK_DEPTH} from './traffic';
import {walkPaths,walkerPose,stepWalker,fallPose,type Walker,type PedestrianCollider,type PedestrianHit} from './pedestrians';
import {type Chunk,obstaclesNear,cell} from './world';
import {collidesWithBuildings} from './collision';
const COUNT=24;
export function Pedestrians({map,player,world,crossingPeople,people,hits}:{people:React.RefObject<PedestrianCollider[]>;hits:React.RefObject<PedestrianHit[]>;crossingPeople:React.RefObject<Point[]>;world:Map<string,Chunk>;map:OSMMap;player:React.RefObject<Point>}){
 const paths=useMemo(()=>walkPaths(map.roads),[map]);
 const stripes=useMemo(()=>paths.filter(p=>p.crossing).flatMap(p=>{const width=p.length-1.4,n=Math.max(2,Math.ceil(width/0.8)),pitch=width/n,bar=pitch*0.55;return Array.from({length:n},(_,i)=>{const t=0.7+bar/2+i*(width-bar)/(n-1);return {x:p.a.x+p.ux*t,z:p.a.z+p.uz*t,angle:Math.atan2(p.ux,p.uz),bar}})}),[paths]);
 const falls=useRef(new Map<number,{age:number;hit:PedestrianHit;x:number;z:number}>());
 const walkers=useRef<(Walker|null)[]>([]);
 const torso=useRef<THREE.InstancedMesh>(null),head=useRef<THREE.InstancedMesh>(null),limbs=useRef<THREE.InstancedMesh>(null);
 const accessories=useRef<THREE.InstancedMesh>(null);const hair=useRef<THREE.InstancedMesh>(null),shoes=useRef<THREE.InstancedMesh>(null),hands=useRef<THREE.InstancedMesh>(null);
 const root=useMemo(()=>new THREE.Object3D(),[]),part=useMemo(()=>new THREE.Matrix4(),[]);
 const dummy=useMemo(()=>new THREE.Object3D(),[]);
 const nearby=useRef<number[]>([]),last=useRef(-10);
 const cache=useMemo(()=>new Map<string,OSMMap['buildings']>(),[world]);
 const clear=(x:number,z:number)=>{const k=cell(x)+':'+cell(z);let items=cache.get(k);if(!items){items=obstaclesNear(world,x,z);if(cache.size>=16)cache.clear();cache.set(k,items)}return !collidesWithBuildings(x,z,0.35,items)};
 useLayoutEffect(()=>{walkers.current=[];falls.current.clear();hits.current=[];last.current=-10;
 for(let i=0;i<COUNT;i++){
 torso.current?.setColorAt(i,new THREE.Color(['#b34c45','#386b94','#e3bd68','#487e68','#e0d9cf','#775c91'][i%6]));
 head.current?.setColorAt(i,new THREE.Color(['#c58d64','#e0b08a','#a87550'][i%3]));hair.current?.setColorAt(i,new THREE.Color(['#25201e','#3c3028','#56504b'][i%3]));for(let j=0;j<2;j++){hands.current?.setColorAt(i*2+j,new THREE.Color(['#c58d64','#e0b08a','#a87550'][i%3]));}for(let j=0;j<4;j++)limbs.current?.setColorAt(i*4+j,new THREE.Color(j<2?['#34424d','#24334b','#65594e'][i%3]:['#b34c45','#386b94','#e3bd68','#487e68','#e0d9cf','#775c91'][i%6]));
 }
 for(const mesh of [torso.current,head.current,hair.current,hands.current,limbs.current])if(mesh?.instanceColor)mesh.instanceColor.needsUpdate=true;
 },[paths]);
 useFrame(({clock},raw)=>{
 if(!torso.current||!head.current||!limbs.current||!hair.current||!shoes.current||!hands.current||!accessories.current)return;
 const crossing:Point[]=[],colliders:PedestrianCollider[]=[];
 for(const hit of hits.current.splice(0)){const w=walkers.current[hit.id];if(w&&!falls.current.has(hit.id)){const q=walkerPose(w,paths[w.path]);falls.current.set(hit.id,{age:0,hit,x:q.x,z:q.z})}}
 const p=player.current,dt=Math.min(raw,0.05);
 if(clock.elapsedTime-last.current>1){last.current=clock.elapsedTime;nearby.current=paths.flatMap((v,i)=>{const t=Math.max(0,Math.min(v.length,(p.x-v.a.x)*v.ux+(p.z-v.a.z)*v.uz));return Math.hypot(v.a.x+v.ux*t-p.x,v.a.z+v.uz*t-p.z)<110?[i]:[]})}
 const place=(mesh:THREE.InstancedMesh,i:number,x:number,y:number,z:number,h:number,w:number,l:number,d:number,tilt=0)=>{
 dummy.position.set(x,y,z);dummy.rotation.set(tilt,h,0,'YXZ');dummy.scale.set(w,l,d);dummy.updateMatrix();mesh.setMatrixAt(i,part.multiplyMatrices(root.matrix,dummy.matrix));
 };
 for(let i=0;i<COUNT;i++){
 root.position.set(0,0,0);root.rotation.set(0,0,0);root.updateMatrix();
 const limit=settings.mode==='auto'?[10,17,24][graphics.tier]:settings.people;let w=walkers.current[i];let q=w?walkerPose(w,paths[w.path]):null;
 if(i>=limit){w=null;walkers.current[i]=null;falls.current.delete(i);}else if(!w||!q||Math.hypot(q.x-p.x,q.z-p.z)>145){
 w=null;falls.current.delete(i);
 for(let tries=0;tries<8&&nearby.current.length;tries++){
 const id=nearby.current[Math.floor(Math.random()*nearby.current.length)],path=paths[id];
 const candidate={path:id,t:path.crossing?0:Math.random()*path.length,direction:path.crossing?1:Math.random()<0.5?-1:1,speed:0.8+Math.random()*0.65,phase:Math.random()*6};
 const pos=walkerPose(candidate,path),dist=Math.hypot(pos.x-p.x,pos.z-p.z);
 if(dist>15&&dist<110&&clear(pos.x,pos.z)&&walkers.current.every(other=>{if(!other)return true;const o=walkerPose(other,paths[other.path]);return Math.hypot(o.x-pos.x,o.z-pos.z)>1.2})){w=candidate;break}
 }
 walkers.current[i]=w;
 }
 if(!w){place(accessories.current,i,0,-100,0,0,0,0,0);place(hair.current,i,0,-100,0,0,0,0,0);for(let j=0;j<2;j++){place(shoes.current,i*2+j,0,-100,0,0,0,0,0);place(hands.current,i*2+j,0,-100,0,0,0,0,0)}place(torso.current,i,0,-100,0,0,0,0,0);place(head.current,i,0,-100,0,0,0,0,0);for(let j=0;j<4;j++)place(limbs.current,i*4+j,0,-100,0,0,0,0,0);continue}
 const path=paths[w.path],old={...w};
 const atEnd=w.t<=0.001||w.t>=path.length-0.001;const signal=path.crossing?signalState(path.crossing,path.axis??0,clock.elapsedTime):null;
 let moving=!falls.current.has(i)&&(!atEnd||!signal||(signal.color==='red'&&signal.remaining>path.length/w.speed+1))&&stepWalker(w,path,path.crossing&&!atEnd?{x:Infinity,z:Infinity}:p,dt);q=walkerPose(w,path);
 if(moving&&!clear(q.x,q.z)){Object.assign(w,old);w.direction*=-1;q=walkerPose(w,path);moving=false}
 if(path.crossing&&w.t>0.01&&w.t<path.length-0.01)crossing.push({x:q.x,z:q.z});
 let fall=falls.current.get(i);let x=q.x,z=q.z,y=0.11,h=q.heading,tilt=0;if(fall){fall.age+=dt;const f=fallPose(fall.age,fall.hit.speed);const ox=fall.x+fall.hit.dx*f.offset,oz=fall.z+fall.hit.dz*f.offset;if(clear(ox,oz)){x=ox;z=oz}y+=f.lift;h=Math.atan2(fall.hit.dx,fall.hit.dz);tilt=f.tilt;if(fall.age>2.1){const k=Math.min(1,(fall.age-2.1)/0.8);x+=(q.x-x)*k;z+=(q.z-z)*k}if(f.done)falls.current.delete(i);if(path.crossing)crossing.push({x,z});}else colliders.push({id:i,x,z});root.position.set(x,y,z);root.rotation.set(tilt,h,0,'YXZ');root.updateMatrix();
 const scale=0.88+(i%5)*0.045,swing=moving?Math.sin(w.phase)*0.55:0,bob=moving?Math.abs(Math.sin(w.phase))*.035*scale:0;
 place(torso.current,i,0,1.16*scale+bob,0,0,(i%3===0?.36:.43)*scale,0.58*scale,0.25*scale);
 place(head.current,i,0,1.65*scale+bob,0,0,0.27*scale,0.32*scale,0.27*scale);
 place(hair.current,i,0,1.78*scale+bob,-0.025*scale,0,0.28*scale,(i%3===0?.25:.16)*scale,0.28*scale);
 place(accessories.current,i,0,1.15*scale+bob,-.18*scale,0,i%3===0?.30*scale:0,i%3===0?.38*scale:0,i%3===0?.16*scale:0);for(let j=0;j<2;j++){const side=j?1:-1;place(shoes.current,i*2+j,side*0.12*scale,0.10*scale+Math.max(0,-swing*side)*.12*scale,Math.sin(swing*side)*0.32*scale+0.035,0,0.16*scale,0.13*scale,0.28*scale);place(hands.current,i*2+j,side*0.27*scale,0.87*scale+bob,-Math.sin(swing*side)*0.22*scale,0,0.12*scale,0.16*scale,0.12*scale)}
 for(let j=0;j<4;j++){
 const arm=j>=2,side=j%2?1:-1,x=side*(arm?0.27:0.12)*scale;
 place(limbs.current,i*4+j,x,(arm?1.12:0.46)*scale+(arm?bob:0),0,0,0.13*scale,(arm?0.48:0.69)*scale,0.15*scale,swing*side*(arm?-1:1));
 }
 }
 crossingPeople.current=crossing;people.current=colliders;
 for(const mesh of [torso.current,head.current,limbs.current,hair.current,shoes.current,hands.current,accessories.current])mesh.instanceMatrix.needsUpdate=true;
 });
 return <group>{stripes.length>0&&<CrosswalkMarks stripes={stripes}/>}<instancedMesh castShadow ref={torso} args={[undefined,undefined,COUNT]} frustumCulled={false}><sphereGeometry args={[0.5,12,8]}/><meshStandardMaterial/></instancedMesh><instancedMesh castShadow ref={head} args={[undefined,undefined,COUNT]} frustumCulled={false}><sphereGeometry args={[0.5,12,8]}/><meshStandardMaterial/></instancedMesh><instancedMesh castShadow ref={limbs} args={[undefined,undefined,COUNT*4]} frustumCulled={false}><capsuleGeometry args={[0.5,0.01,4,8]}/><meshStandardMaterial/></instancedMesh><instancedMesh ref={accessories} args={[undefined,undefined,COUNT]} frustumCulled={false}><boxGeometry/><meshStandardMaterial color="#63574b"/></instancedMesh><instancedMesh ref={hair} args={[undefined,undefined,COUNT]} frustumCulled={false}><sphereGeometry args={[0.5,10,6]}/><meshStandardMaterial/></instancedMesh><instancedMesh ref={shoes} args={[undefined,undefined,COUNT*2]} frustumCulled={false}><sphereGeometry args={[0.5,8,6]}/><meshStandardMaterial color="#25282c"/></instancedMesh><instancedMesh ref={hands} args={[undefined,undefined,COUNT*2]} frustumCulled={false}><sphereGeometry args={[0.5,8,6]}/><meshStandardMaterial/></instancedMesh></group>
}

function CrosswalkMarks({stripes}:{stripes:{x:number;z:number;angle:number;bar:number}[]}){const ref=useRef<THREE.InstancedMesh>(null);useLayoutEffect(()=>{const d=new THREE.Object3D();stripes.forEach((s,i)=>{d.position.set(s.x,0.095,s.z);d.rotation.set(0,s.angle,0);d.scale.set(1,1,s.bar);d.updateMatrix();ref.current?.setMatrixAt(i,d.matrix)});if(ref.current){ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere()}},[stripes]);return <instancedMesh ref={ref} args={[undefined,undefined,stripes.length]}><boxGeometry args={[CROSSWALK_DEPTH,0.012,1]}/><meshStandardMaterial color="#eeeae0"/></instancedMesh>}
