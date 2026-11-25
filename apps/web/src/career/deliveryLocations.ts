import type {OSMMap,Point} from './osm';
import {buildGraph,nearest,reachable,dist} from './navigation.ts';
export type DeliveryLocation={point:Point;street:string};
const cache=new WeakMap<OSMMap,{graph:ReturnType<typeof buildGraph>;pickups:DeliveryLocation[];deliveries:DeliveryLocation[]}>();
export function deliveryLocations(map:OSMMap){
 const existing=cache.get(map);if(existing)return existing;
 const graph=buildGraph(map.roads),start=nearest(graph,map.spawn);
 const back=start<0?new Set<number>():reachable(graph,start,true);
 const bridge=new Set(map.roads.filter(r=>r.bridge).flatMap(r=>r.points.map(p=>p.x.toFixed(3)+':'+p.z.toFixed(3))));
 const candidates=(start<0?[]:[...reachable(graph,start)]).filter(i=>back.has(i)).map(i=>({point:graph.points[i],street:graph.edges[i].find(e=>e.name!=='Đường chưa có tên')?.name??'Đường chưa có tên'})).filter(({point:p})=>!bridge.has(p.x.toFixed(3)+':'+p.z.toFixed(3))&&Math.abs(p.x)<map.extent-8&&Math.abs(p.z)<map.extent-8&&!map.buildings.some(b=>Math.abs(p.x-b.x)<b.halfX+2&&Math.abs(p.z-b.z)<b.halfZ+2));
 const spread=(count:number,spacing:number)=>{const result:DeliveryLocation[]=[];const ordered=[...candidates].sort((a,b)=>a.point.x-b.point.x||a.point.z-b.point.z);for(const gap of [spacing,spacing/2,8]){for(const p of ordered){if(result.length>=count)return result;if(result.every(q=>dist(p.point,q.point)>=gap))result.push(p)}}return result};
 const value={graph,pickups:spread(100,35),deliveries:spread(200,25)};cache.set(map,value);return value;
}
