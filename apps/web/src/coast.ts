import {project} from './geoProjection.ts';
import type {OSMMap,Point} from './osm.ts';
// Provisional shoreline, intentionally separate from the existing Han River mask.
const shore=[[16.0732,108.2458],[16.0678,108.2468],[16.0624,108.2476],[16.057,108.2484],[16.0516,108.2492]].map(([lat,lon])=>project(lat,lon));
export const coastStart=shore[0].z,coastEnd=shore[shore.length-1].z;
export function shoreX(z:number){for(let i=1;i<shore.length;i++){const a=shore[i-1],b=shore[i];if(z<=b.z)return a.x+(b.x-a.x)*Math.max(0,Math.min(1,(z-a.z)/(b.z-a.z)))}return shore[shore.length-1].x}
export function hasCoast(map:OSMMap){return (map.bounds?.[2]??0)>=108.249&&map.roads.some(r=>r.points.some(p=>p.x>project(16.06,108.242).x))}
const enabledCache=new WeakMap<OSMMap,boolean>();
export function seaBlocked(map:OSMMap,p:Point){let enabled=enabledCache.get(map);if(enabled===undefined){enabled=hasCoast(map);enabledCache.set(map,enabled)}return enabled&&p.x>=shoreX(p.z)-1.2}
