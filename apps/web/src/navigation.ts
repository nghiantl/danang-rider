import type {Point,Road} from './osm';
export const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
type Edge={to:number;cost:number;name:string};
export type Graph={points:Point[];edges:Edge[][]};
export type Route={points:Point[];names:string[];length:number};
export function buildGraph(roads:Road[]):Graph{
 const points:Point[]=[],edges:Edge[][]=[],ids=new Map<string,number>();
 const node=(p:Point)=>{const k=p.x.toFixed(3)+':'+p.z.toFixed(3);let id=ids.get(k);if(id===undefined){id=points.length;ids.set(k,id);points.push(p);edges.push([])}return id};
 for(const r of roads){if(r.kind==='pedestrian')continue;for(let i=1;i<r.points.length;i++){
 const a=node(r.points[i-1]),b=node(r.points[i]);if(a===b)continue;const cost=dist(points[a],points[b]);
 if(r.oneway!==-1)edges[a].push({to:b,cost,name:r.name});
 if(r.oneway!==1)edges[b].push({to:a,cost,name:r.name});
 }}
 return {points,edges};
}
export function nearest(g:Graph,p:Point){let best=-1,d=Infinity;g.points.forEach((q,i)=>{const v=dist(p,q);if(v<d){best=i;d=v}});return best}
export function findRoute(g:Graph,start:Point,end:Point):Route|null{
 const b=nearest(g,end);if(b<0)return null;
 const eligible=reachable(g,b,true);let a=-1,bestStart=Infinity;
 for(const i of eligible){const d=dist(g.points[i],start);if(d<bestStart){a=i;bestStart=d}}
 if(a<0||bestStart>Math.min(30,dist(g.points[nearest(g,start)],start)+12))return null;
 const costs=new Map<number,number>([[a,0]]),prev=new Map<number,{from:number;name:string}>(),open=new Set([a]),closed=new Set<number>();
 while(open.size){let u=-1,best=Infinity;for(const v of open){const score=costs.get(v)!+dist(g.points[v],g.points[b]);if(score<best){best=score;u=v}}open.delete(u);if(u===b){const points=[g.points[b]],names:string[]=[];while(u!==a){const p=prev.get(u)!;names.unshift(p.name);u=p.from;points.unshift(g.points[u])}return {points,names,length:costs.get(b)!}}closed.add(u);
 for(const e of g.edges[u]){if(closed.has(e.to))continue;const c=costs.get(u)!+e.cost;if(c<(costs.get(e.to)??Infinity)){costs.set(e.to,c);prev.set(e.to,{from:u,name:e.name});open.add(e.to)}}
 }return null;
}
export function progress(route:Route,p:Point){
 let best=Infinity,index=0,t=0;
 for(let i=0;i<route.points.length-1;i++){const a=route.points[i],b=route.points[i+1],dx=b.x-a.x,dz=b.z-a.z;const f=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));const d=dist(p,{x:a.x+dx*f,z:a.z+dz*f});if(d<best){best=d;index=i;t=f}}
 const a=route.points[index],b=route.points[index+1];let remaining=a&&b?dist(a,b)*(1-t):0;
 for(let i=index+1;i<route.points.length-1;i++)remaining+=dist(route.points[i],route.points[i+1]);
 let instruction='Đi thẳng',turnDistance=a&&b?dist(a,b)*(1-t):0;
 for(let i=index+1;i<route.points.length-1;i++){const a=route.points[i-1],b=route.points[i],c=route.points[i+1];const angle=Math.atan2((b.x-a.x)*(c.z-b.z)-(b.z-a.z)*(c.x-b.x),(b.x-a.x)*(c.x-b.x)+(b.z-a.z)*(c.z-b.z));if(Math.abs(angle)>0.55){instruction=Math.abs(angle)>2.6?'Quay đầu':angle>0?'Rẽ phải':'Rẽ trái';break}turnDistance+=dist(b,c)}
 return {off:route.points.length===1?dist(p,route.points[0]):best,remaining,index,instruction,turnDistance,name:route.names[index]||'Đường chưa có tên'};
}

export function reachable(g:Graph,start:number,reverse=false){
 const edges=reverse?g.points.map(()=>[] as number[]):g.edges.map(es=>es.map(e=>e.to));
 if(reverse)g.edges.forEach((es,i)=>es.forEach(e=>edges[e.to].push(i)));
 const seen=new Set<number>([start]),queue=[start];
 for(let i=0;i<queue.length;i++)for(const v of edges[queue[i]])if(!seen.has(v)){seen.add(v);queue.push(v)}
 return seen;
}
export function missionPoints(g:Graph,safe:(p:Point)=>boolean){
 const candidates=g.points.map((p,i)=>({p,i})).filter(v=>safe(v.p)).sort((a,b)=>dist(a.p,{x:0,z:0})-dist(b.p,{x:0,z:0}));
 const rejected=new Set<number>();
 for(const spawn of candidates){
 if(rejected.has(spawn.i))continue;
 const forward=reachable(g,spawn.i),back=reachable(g,spawn.i,true);
 const pool=candidates.filter(v=>forward.has(v.i)&&back.has(v.i));
 if(pool.length<3){for(const v of pool)rejected.add(v.i);continue}
 const pickup=pool.reduce((a,b)=>dist(a.p,spawn.p)>dist(b.p,spawn.p)?a:b);
 const delivery=pool.filter(v=>v.i!==pickup.i).reduce((a,b)=>dist(a.p,pickup.p)>dist(b.p,pickup.p)?a:b);
 return {spawn:spawn.p,pickup:pickup.p,delivery:delivery.p};
 }
 return null;
}
