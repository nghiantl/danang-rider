import type {OSMMap,Point} from './osm';
import {findRoute,dist} from './navigation.ts';
import {ORDER_TYPES,kindFor,orderFare,suggestedMinutes,type OrderKind} from './career/orderCatalog.ts';
import {deliveryLocations} from './career/deliveryLocations.ts';
export type Order={id:string;pickup:Point;delivery:Point;meters:number;fare:number;shop:string;pickupStreet?:string;deliveryStreet?:string;kind?:OrderKind;size?:number;minutes?:number};
export type Income={wallet:number;completed:number;meters:number};
export const emptyIncome:Income={wallet:0,completed:0,meters:0};
export function fare(meters:number){return 12000+Math.ceil(Math.max(0,meters)/100)*500}
export function readIncome(raw:string|null):Income{try{const v=JSON.parse(raw||'null');if(v&&['wallet','completed','meters'].every(k=>Number.isSafeInteger(v[k])&&v[k]>=0))return {wallet:v.wallet,completed:v.completed,meters:v.meters}}catch{}return {...emptyIncome}}
export function credit(income:Income,order:Order):Income{return {wallet:income.wallet+order.fare,completed:income.completed+1,meters:income.meters+Math.round(order.meters)}}
export function makeOrders(map:OSMMap|null,batch:number,level=1):Order[]{
 const result:Order[]=[];
 const add=(pickup:Point,delivery:Point,meters:number,pickupStreet?:string,deliveryStreet?:string)=>{const i=result.length,kind=kindFor(batch,i,level),c=ORDER_TYPES[kind];result.push({id:'DN-'+String(batch*3+i+1).padStart(3,'0'),pickup,delivery,meters,fare:orderFare(kind,meters),shop:c.shop,pickupStreet,deliveryStreet,kind,size:c.size,minutes:suggestedMinutes(kind,meters)})};
 if(!map){add({x:-20,z:80},{x:140,z:-100},340);add({x:140,z:0},{x:-180,z:-20},340);add({x:-20,z:140},{x:140,z:140},160);return result}
 const {graph:g,pickups,deliveries}=deliveryLocations(map);
 if(!pickups.length||!deliveries.length)return result;
 for(let i=0;i<48&&result.length<3;i++){const a=pickups[(batch*97+i*137)%pickups.length],b=deliveries[(batch*173+i*251+Math.floor(deliveries.length/3))%deliveries.length];if(dist(a.point,b.point)<120||result.some(o=>dist(o.pickup,a.point)<10||dist(o.delivery,b.point)<10))continue;const route=findRoute(g,a.point,b.point);if(route&&route.length>=120)add(a.point,b.point,route.length,a.street,b.street)}
 if(!result.length){const route=findRoute(g,map.pickup,map.delivery);if(route)add(map.pickup,map.delivery,route.length)}
 return result;
}
