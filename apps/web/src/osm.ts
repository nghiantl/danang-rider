// Real OpenStreetMap geometry loaded at runtime; no API key required.
// The area is deliberately small to keep iPhone rendering affordable.
export type Point = { x: number; z: number };
export type Road = { points: Point[]; width: number; name: string };
export type Footprint = { x: number; z: number; halfX: number; halfZ: number; height: number };
export type OSMMap = { roads: Road[]; buildings: Footprint[]; pickup: Point; delivery: Point; spawn: Point };
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
export function parseOSM(elements: Element[]): OSMMap {
  const roads: Road[] = [];
  const buildings: Footprint[] = [];
  for (const element of elements) {
    if (element.type !== 'way' || !element.geometry || element.geometry.length < 2) continue;
    const points = element.geometry.map(p => project(p.lat,p.lon));
    if (element.tags?.highway && WIDTH[element.tags.highway]) {
      roads.push({ points, width: WIDTH[element.tags.highway], name: element.tags.name || element.tags.highway });
    }
    if (element.tags?.building && points.length >= 3) {
      const xs=points.map(p=>p.x), zs=points.map(p=>p.z);
      const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
      if (maxX-minX > 2 && maxZ-minZ > 2) {
        const levels = Number(element.tags['building:levels']);
        buildings.push({x:(minX+maxX)/2,z:(minZ+maxZ)/2,halfX:(maxX-minX)/2,halfZ:(maxZ-minZ)/2,height:Number.isFinite(levels)&&levels>0?Math.min(levels*3.3,70):12});
      }
    }
  }
  // Choose targets along the actual road network, not inside building footprints.
  const roadPoints = roads.flatMap(r=>r.points).filter(p=>Math.abs(p.x)<155&&Math.abs(p.z)<155&&!buildings.some(b=>Math.abs(p.x-b.x)<b.halfX+2&&Math.abs(p.z-b.z)<b.halfZ+2));
  if (roadPoints.length < 3) throw new Error('OSM roads insufficient for gameplay');
  const spawn=roadPoints.reduce((a,b)=>Math.hypot(a.x,a.z)<Math.hypot(b.x,b.z)?a:b);
  const pickup=roadPoints.reduce((a,b)=>Math.hypot(a.x-spawn.x,a.z-spawn.z)>Math.hypot(b.x-spawn.x,b.z-spawn.z)?a:b);
  const delivery=roadPoints.reduce((a,b)=>Math.hypot(a.x-pickup.x,a.z-pickup.z)>Math.hypot(b.x-pickup.x,b.z-pickup.z)?a:b);
  return {roads,buildings,pickup,delivery,spawn};
}
// Try independent public Overpass instances. GET avoids POST preflight on mobile Safari.
// Keep a short per-server timeout and report failures instead of silently hiding them.
export const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];
export async function loadDaNangMap(signal?: AbortSignal): Promise<OSMMap> {
  const query='[out:json][timeout:20];(way[highway~"^(primary|secondary|tertiary|residential|service|living_street|unclassified|pedestrian)$"]('+BBOX+');way[building]('+BBOX+'););out geom;';
  const errors: string[]=[];
  for(const endpoint of OVERPASS_ENDPOINTS) {
    if(signal?.aborted) throw new Error('OSM request cancelled');
    const controller=new AbortController();
    const abort=()=>controller.abort();
    signal?.addEventListener('abort',abort,{once:true});
    const timeout=setTimeout(()=>controller.abort(),12000);
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
