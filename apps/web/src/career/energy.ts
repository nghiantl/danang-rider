import type {OSMMap,Point} from '../osm';
import {tankCapacity,upgrades} from './vehicleShop.ts';
import type {Career} from './save';
export type Station={id:string;kind:'petrol'|'electric';point:Point;access:Point};
export const capacity=(v:Station['kind'])=>v==='petrol'?4:100;
export const price=(v:Station['kind'])=>v==='petrol'?23000:200;
export function stations(map:OSMMap|null):Station[]{
 if(!map)return [-100,80].flatMap((z,i)=>[{id:'G'+i,kind:'petrol' as const,point:{x:-34,z},access:{x:-20,z}},{id:'E'+i,kind:'electric' as const,point:{x:154,z},access:{x:140,z}}]);
 const segments=map.roads.filter(r=>r.kind!=='pedestrian').flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,w:r.width,bridge:r.bridge})));
 const out:Station[]=[];
 for(const s of segments){if(s.bridge||s.w<8)continue;const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,len=Math.hypot(dx,dz);if(len<25)continue;
 const access={x:(s.a.x+s.b.x)/2,z:(s.a.z+s.b.z)/2};if(out.some(t=>Math.hypot(t.access.x-access.x,t.access.z-access.z)<180))continue;
 for(const side of [-1,1]){const point={x:access.x-dz/len*(s.w/2+5)*side,z:access.z+dx/len*(s.w/2+5)*side};
 if(map.buildings.some(b=>Math.abs(b.x-point.x)<b.halfX+4&&Math.abs(b.z-point.z)<b.halfZ+4))continue;
 if(segments.some(t=>{const x=t.b.x-t.a.x,z=t.b.z-t.a.z,d=x*x+z*z;if(!d)return false;const k=Math.max(0,Math.min(1,((point.x-t.a.x)*x+(point.z-t.a.z)*z)/d));return Math.hypot(point.x-t.a.x-k*x,point.z-t.a.z-k*z)<t.w/2+3}))continue;
 out.push({id:'S'+out.length,kind:out.length%2?'electric':'petrol',point,access});break}
 if(out.length>=12)break;
 }return out;
}
export function quote(v:Station['kind'],remaining:number,wallet:number,budget:number,max=capacity(v)){const cost=Math.max(0,Math.min(Math.floor(wallet),Math.floor(budget),Math.ceil(Math.max(0,max-remaining)*price(v))));return {cost,remaining:Math.min(max,remaining+cost/price(v))}}
export function purchase(c:Career,budget:number,id:string):Career{if(c.ledger.some(t=>t.id===id))return c;const q=quote(c.vehicle,c.remaining,c.income.wallet,budget,tankCapacity(c.vehicle,upgrades(c)));if(!q.cost)return c;return {...c,remaining:q.remaining,income:{...c.income,wallet:c.income.wallet-q.cost},ledger:[...c.ledger,{id,amount:q.cost,at:new Date().toISOString(),direction:'expense'}]}}
