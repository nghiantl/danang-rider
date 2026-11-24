import type {OSMMap,Point} from './osm';
import {buildGraph,nearest,reachable,findRoute,dist} from './navigation.ts';
import {ORDER_TYPES,kindFor,orderFare,suggestedMinutes,type OrderKind} from './career/orderCatalog.ts';
export type Order={id:string;pickup:Point;delivery:Point;meters:number;fare:number;shop:string;kind?:OrderKind;size?:number;minutes?:number};
export type Income={wallet:number;completed:number;meters:number};
export const emptyIncome:Income={wallet:0,completed:0,meters:0};
export function fare(meters:number){return 12000+Math.ceil(Math.max(0,meters)/100)*500}
export function readIncome(raw:string|null):Income{try{const v=JSON.parse(raw||'null');if(v&&['wallet','completed','meters'].every(k=>Number.isSafeInteger(v[k])&&v[k]>=0))return {wallet:v.wallet,completed:v.completed,meters:v.meters}}catch{}return {...emptyIncome}}
export function credit(income:Income,order:Order):Income{return {wallet:income.wallet+order.fare,completed:income.completed+1,meters:income.meters+Math.round(order.meters)}}
export function makeOrders(map:OSMMap|null,batch:number,level=1):Order[]{
 const result:Order[]=[];
 const add=(pickup:Point,delivery:Point,meters:number)=>{const i=result.length,kind=kindFor(batch,i,level),c=ORDER_TYPES[kind];result.push({id:'DN-'+String(batch*3+i+1).padStart(3,'0'),pickup,delivery,meters,fare:orderFare(kind,meters),shop:c.shop,kind,size:c.size,minutes:suggestedMinutes(kind,meters)})};
 if(!map){add({x:-20,z:80},{x:140,z:-100},340);add({x:140,z:0},{x:-180,z:-20},340);add({x:-20,z:140},{x:140,z:140},160);return result}
 const g=buildGraph(map.roads),start=nearest(g,map.spawn);if(start<0)return result;
 const back=reachable(g,start,true),pool=[...reachable(g,start)].filter(i=>back.has(i)).map(i=>g.points[i]).filter(p=>!map.buildings.some(b=>Math.abs(p.x-b.x)<b.halfX+2&&Math.abs(p.z-b.z)<b.halfZ+2));
 if(pool.length<2)return result;
 for(let i=0;i<24&&result.length<3;i++){const a=pool[(batch*97+i*137)%pool.length],b=pool[(batch*173+i*251+Math.floor(pool.length/3))%pool.length];if(dist(a,b)<120)continue;const route=findRoute(g,a,b);if(route&&route.length>=120&&!result.some(o=>dist(o.pickup,a)<10&&dist(o.delivery,b)<10))add(a,b,route.length)}
 if(!result.length){const route=findRoute(g,map.pickup,map.delivery);if(route)add(map.pickup,map.delivery,route.length)}
 return result;
}
