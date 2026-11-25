import type {Career} from './save';
import type {Station} from './energy';
import type {OSMMap} from '../osm';
export type Garage=Pick<Station,'id'|'point'|'access'>;
export function garages(map:OSMMap|null,stations:Station[]):Garage[]{
 if(!map)return [{id:'R0',point:{x:-166,z:80},access:{x:-180,z:80}},{id:'R1',point:{x:166,z:-100},access:{x:180,z:-100}}];
 const seg=map.roads.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,w:r.width,bridge:r.bridge,kind:r.kind})));const out:Garage[]=[];
 for(const s of seg){if(s.bridge||s.kind==='pedestrian'||s.w<8)continue;const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,l=Math.hypot(dx,dz);if(l<25)continue;const access={x:(s.a.x+s.b.x)/2,z:(s.a.z+s.b.z)/2};if([...stations,...out].some(t=>Math.hypot(t.access.x-access.x,t.access.z-access.z)<100))continue;
 for(const side of [-1,1]){const point={x:access.x-dz/l*(s.w/2+6)*side,z:access.z+dx/l*(s.w/2+6)*side};if(map.buildings.some(b=>Math.abs(b.x-point.x)<b.halfX+5&&Math.abs(b.z-point.z)<b.halfZ+5))continue;if(seg.some(t=>{const x=t.b.x-t.a.x,z=t.b.z-t.a.z,d=x*x+z*z;if(!d)return false;const k=Math.max(0,Math.min(1,((point.x-t.a.x)*x+(point.z-t.a.z)*z)/d));return Math.hypot(point.x-t.a.x-k*x,point.z-t.a.z-k*z)<t.w/2+5}))continue;out.push({id:'R'+out.length,point,access});break}if(out.length>=6)break;}return out;
}
export const wear=(h:number,m:number)=>Math.max(0,h-Math.max(0,m)*.0005);
export const impact=(h:number,s:number)=>Math.max(0,h-Math.max(0,Math.min(1,s))*8);
export const performanceFactor=(h:number)=>.35+.65*Math.max(0,Math.min(100,h))/100;
export function repairQuote(h:number,w:number,b:number){const cost=Math.max(0,Math.min(Math.floor(w),Math.floor(b),Math.ceil((100-h)*500)));return {cost,health:Math.min(100,h+cost/500)}}
export function repair(c:Career,b:number,id:string):Career{if(c.ledger.some(t=>t.id===id))return c;const q=repairQuote(c.health??100,c.income.wallet,b);if(!q.cost)return c;return {...c,health:q.health,income:{...c.income,wallet:c.income.wallet-q.cost},ledger:[...c.ledger,{id,amount:q.cost,at:new Date().toISOString(),direction:'expense'}]}}
