import type {Road,Point} from './osm';
export type WalkPath={a:Point;b:Point;length:number;ux:number;uz:number};
export type Walker={path:number;t:number;direction:number;speed:number;phase:number};
export function walkPaths(roads:Road[]):WalkPath[]{
 const paths:WalkPath[]=[];
 for(const r of roads){if(r.width<8||r.kind==='pedestrian')continue;
 for(let i=1;i<r.points.length;i++){
 const a=r.points[i-1],b=r.points[i],length=Math.hypot(b.x-a.x,b.z-a.z);
 if(length<12)continue;
 const ux=(b.x-a.x)/length,uz=(b.z-a.z)/length,offset=r.width/2+0.7;
 for(const side of [-1,1]){
 const x=-uz*offset*side,z=ux*offset*side;
 paths.push({a:{x:a.x+x+ux*4,z:a.z+z+uz*4},b:{x:b.x+x-ux*4,z:b.z+z-uz*4},length:length-8,ux,uz});
 }
 }}
 return paths;
}
export function walkerPose(w:Walker,p:WalkPath){return {x:p.a.x+p.ux*w.t,z:p.a.z+p.uz*w.t,heading:Math.atan2(p.ux*w.direction,p.uz*w.direction)}}
export function stepWalker(w:Walker,p:WalkPath,player:Point,dt:number){
 const q=walkerPose(w,p);
 if(Math.hypot(q.x-player.x,q.z-player.z)<3)return false;
 w.t+=w.direction*w.speed*dt;
 if(w.t>=p.length){w.t=p.length;w.direction=-1}
 else if(w.t<=0){w.t=0;w.direction=1}
 w.phase+=dt*w.speed*6;
 return true;
}
