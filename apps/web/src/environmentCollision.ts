import type {Point} from './osm.ts';
import type {Chunk,Segment} from './world.ts';
export type EnvironmentCollider=Point & {radius:number;kind:'tree'|'lamp'|'signal'|'shop'};
export function treePosition(p:Segment,context:Chunk[]):EnvironmentCollider|null{
 if(p.width<8||p.length<18)return null;
 const ux=Math.cos(p.angle),uz=Math.sin(p.angle),x=p.x+ux*5-uz*(p.width/2+2),z=p.z+uz*5+ux*(p.width/2+2);
 if(context.some(c=>c.buildings.some(({b})=>Math.abs(x-b.x)<b.halfX+2&&Math.abs(z-b.z)<b.halfZ+2)||c.segments.some(q=>{const dx=x-q.x,dz=z-q.z;return Math.abs(dx*Math.cos(q.angle)+dz*Math.sin(q.angle))<q.length/2+2&&Math.abs(-dx*Math.sin(q.angle)+dz*Math.cos(q.angle))<q.width/2+2})))return null;
 return {x,z,radius:Math.hypot(0.175,0.175),kind:'tree'};
}
export function environmentHit(x:number,z:number,nx:number,nz:number,r:number,objects:EnvironmentCollider[]){
 return objects.find(o=>{const before=Math.hypot(x-o.x,z-o.z),after=Math.hypot(nx-o.x,nz-o.z);return after<r+o.radius&&after<before-1e-8});
}
