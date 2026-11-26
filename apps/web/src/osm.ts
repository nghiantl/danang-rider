import {clearRoadBuildings} from './buildingGeometry.ts';
import {buildGraph,missionPoints} from './navigation.ts';
// Real OpenStreetMap geometry loaded at runtime; no API key required.
// The area is deliberately small to keep iPhone rendering affordable.
export type Point = { x: number; z: number };
export type Road = { points: Point[]; width: number; name: string; kind?: string; oneway?: number; bridge?: boolean };
export type Footprint = { x: number; z: number; halfX: number; halfZ: number; height: number; outline?: Point[]; kind?: string; name?:string };
export type OSMMap = { roads: Road[]; buildings: Footprint[]; pickup: Point; delivery: Point; spawn: Point; extent: number; bounds?:number[] };
const CENTER_LAT = 16.0678;
const CENTER_LON = 108.2208;
const LAT_METERS = 111320;
const LON_METERS = Math.cos(CENTER_LAT * Math.PI / 180) * LAT_METERS;
const BBOX = '16.0662,108.2191,16.0694,108.2225';
export function project(lat: number, lon: number): Point {
  return { x: (lon - CENTER_LON) * LON_METERS, z: -(lat - CENTER_LAT) * LAT_METERS };
}
type Element = { type: string; tags?: Record<string,string>; geometry?: { lat:number; lon:number }[] };
const WIDTH: Record<string,number> = { primary: 14, secondary: 12, tertiary: 10, residential: 8, service: 6, living_street: 6, unclassified: 8, pedestrian: 5 };
// Clip full OSM ways to the downloaded coverage; preserve shared interior vertices.
export function clipRoad(points:Point[],bounds:number[]):Point[][]{
 const lo=project(bounds[3],bounds[0]),hi=project(bounds[1],bounds[2]),runs:Point[][]=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z;let t0=0,t1=1;
  for(const [p,q] of [[-dx,a.x-lo.x],[dx,hi.x-a.x],[-dz,a.z-lo.z],[dz,hi.z-a.z]]){
   if(p===0){if(q<0){t0=2;break}}else if(p<0)t0=Math.max(t0,q/p);else t1=Math.min(t1,q/p);
  }
  if(t0>=t1)continue;
  const start=t0===0?a:{x:a.x+dx*t0,z:a.z+dz*t0},end=t1===1?b:{x:a.x+dx*t1,z:a.z+dz*t1};
  const run=runs[runs.length-1],last=run?.[run.length-1];
  if(last&&Math.hypot(last.x-start.x,last.z-start.z)<1e-6)run.push(end);else runs.push([start,end]);
 }
 return runs;
}
export function parseOSM(elements: Element[], bounds?:number[]): OSMMap {
  const roads: Road[] = [];
  let buildings: Footprint[] = [];
  for (const element of elements) {
    if (element.type !== 'way' || !element.geometry || element.geometry.length < 2) continue;
    const points = element.geometry.map(p => project(p.lat,p.lon));
    if (element.tags?.highway && WIDTH[element.tags.highway]) {
      const runs:Point[][]=bounds?clipRoad(points,bounds):[points];
      for(const points of runs)roads.push({ points, width: WIDTH[element.tags.highway], name: element.tags.name || 'Đường chưa có tên', kind:element.tags.highway, bridge:!!element.tags.bridge&&element.tags.bridge!=='no', oneway:element.tags.oneway==='-1'?-1:element.tags.oneway==='no'?0:['yes','1','true'].includes(element.tags.oneway)||element.tags.junction==='roundabout'?1:0 });
    }
    if (element.tags?.building && points.length >= 3) {
      const xs=points.map(p=>p.x), zs=points.map(p=>p.z);
      const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
      if (maxX-minX > 2 && maxZ-minZ > 2) {
        const levels = Number(element.tags['building:levels']);
        buildings.push({x:(minX+maxX)/2,z:(minZ+maxZ)/2,halfX:(maxX-minX)/2,halfZ:(maxZ-minZ)/2,outline:points,kind:element.tags.building,name:element.tags['name:vi']||element.tags.name,height:Number.isFinite(levels)&&levels>0?Math.min(levels*3.3,70):12});
      }
    }
  }
  buildings=clearRoadBuildings(buildings,roads);
  // Choose targets along the actual road network, not inside building footprints.
  let extent=200;for(const r of roads)for(const p of r.points)extent=Math.max(extent,Math.abs(p.x),Math.abs(p.z));
  const mission=missionPoints(buildGraph(roads),p=>Math.abs(p.x)<extent-8&&Math.abs(p.z)<extent-8&&!buildings.some(b=>Math.abs(p.x-b.x)<b.halfX+2&&Math.abs(p.z-b.z)<b.halfZ+2));
  if(!mission)throw new Error('OSM roads insufficient for connected gameplay');
  const {spawn,pickup,delivery}=mission;
  return {roads,buildings,pickup,delivery,spawn,extent,bounds};
}
// Try independent public Overpass instances. GET avoids POST preflight on mobile Safari.
// Keep a short per-server timeout and report failures instead of silently hiding them.
export const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];
export async function loadBundledDaNangMap(signal?: AbortSignal): Promise<OSMMap> {
  const cached=await readPreparedCache();if(signal?.aborted)throw new Error('OSM request cancelled');if(cached)return cached;
  try{const prepared=await fetch(import.meta.env.BASE_URL+'data/danang-prepared-v1.json',{signal,cache:'default'});if(prepared.ok){const map=await prepared.json() as OSMMap;if(map.roads?.length&&Array.isArray(map.buildings)&&map.spawn&&map.pickup&&map.delivery&&Number.isFinite(map.extent)){void writePreparedCache(map);return map}}}catch(error){if(signal?.aborted)throw error}
  // The file is generated from real OSM data by scripts/update-osm.mjs.
  // Never treat an empty or missing snapshot as a valid city.
  const response=await fetch(import.meta.env.BASE_URL+'data/danang-osm.json',{signal,cache:'default'});
  if(!response.ok)throw new Error('OSM snapshot HTTP '+response.status);
  const data: {elements?:Element[];bounds?:number[]}=await response.json();
  return parseOSM(data.elements||[],data.bounds??[108.2152,16.0516,108.2376,16.0732]);
}
export async function loadDaNangMap(signal?: AbortSignal): Promise<OSMMap> {
  try { return await loadBundledDaNangMap(signal); } catch(error) {
    if(signal?.aborted)throw error;
    console.warn('[DaNang Rider] Bundled OSM unavailable; trying public servers',error);
  }
  const query='[out:json][timeout:20];(way[highway~"^(primary|secondary|tertiary|residential|service|living_street|unclassified|pedestrian)$"]('+BBOX+');way[building]('+BBOX+'););out geom;';
  const errors: string[]=[];
  for(const endpoint of OVERPASS_ENDPOINTS) {
    if(signal?.aborted) throw new Error('OSM request cancelled');
    const controller=new AbortController();
    const abort=()=>controller.abort();
    signal?.addEventListener('abort',abort,{once:true});
    const timeout=setTimeout(()=>controller.abort(),5000);
    try {
      const url=endpoint+'?data='+encodeURIComponent(query);
      const response=await fetch(url,{method:'GET',signal:controller.signal,headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data: {elements?:Element[]}=await response.json();
      const map=parseOSM(data.elements||[]);
      console.info('[DaNang Rider] OSM loaded from',endpoint,'roads:',map.roads.length,'buildings:',map.buildings.length);
      return map;
    } catch(error) {
      if(signal?.aborted)throw new Error('OSM request cancelled');
      const reason=error instanceof Error?error.message:String(error);
      errors.push(new URL(endpoint).host+': '+reason);
      console.warn('[DaNang Rider] OSM endpoint failed',endpoint,reason);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort',abort);
    }
  }
  throw new Error('Không tải được OSM: '+errors.join(' | '));
}

const MAP_CACHE_KEY='prepared-v1-'+(import.meta.env?.VITE_VERCEL_GIT_COMMIT_SHA||'local');
function mapDB():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open('rider-map',1);req.onupgradeneeded=()=>req.result.createObjectStore('maps');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function readPreparedCache():Promise<OSMMap|null>{try{const db=await mapDB();return await new Promise(resolve=>{const tx=db.transaction('maps','readonly'),req=tx.objectStore('maps').get(MAP_CACHE_KEY);req.onsuccess=()=>{const m=req.result as OSMMap|undefined;resolve(m?.roads?.length&&Array.isArray(m.buildings)&&m.spawn&&m.pickup&&m.delivery&&Number.isFinite(m.extent)?m:null)};req.onerror=()=>resolve(null);tx.oncomplete=()=>db.close();tx.onabort=()=>{db.close();resolve(null)}})}catch{return null}}
async function writePreparedCache(map:OSMMap){try{const db=await mapDB();const tx=db.transaction('maps','readwrite'),store=tx.objectStore('maps');store.clear();store.put(map,MAP_CACHE_KEY);tx.oncomplete=tx.onabort=()=>db.close()}catch{/* optional cache */}}
