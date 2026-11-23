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
export async function loadDaNangMap(signal?: AbortSignal): Promise<OSMMap> {
  const query='[out:json][timeout:20];(way[highway~"^(primary|secondary|tertiary|residential|service|living_street|unclassified|pedestrian)$"]('+BBOX+');way[building]('+BBOX+'););out geom;';
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  const abort=()=>controller.abort();
  signal?.addEventListener('abort',abort,{once:true});
  try {
    const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:new URLSearchParams({data:query}),signal:controller.signal});
    if(!response.ok)throw new Error('OSM HTTP '+response.status);
    const data: {elements?:Element[]}=await response.json();
    return parseOSM(data.elements||[]);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort',abort);
  }
}
