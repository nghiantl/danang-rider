import {project,type Point,type OSMMap} from './osm.ts';
export const riverfrontSites=[{id:'love',name:'Cầu Tình Yêu',symbol:'♥',point:project(16.064111,108.229667)},{id:'carp',name:'Cá chép hóa rồng',symbol:'C',point:project(16.062930,108.229820)}] as const;
export function riverfrontCovered(map:Pick<OSMMap,'bounds'|'roads'>){const b=map.bounds;if(b)return b[0]<=108.229667&&b[2]>=108.229820&&b[1]<=16.062930&&b[3]>=16.064111;return map.roads.some(r=>r.points.some(p=>Math.hypot(p.x-riverfrontSites[0].point.x,p.z-riverfrontSites[0].point.z)<300))}
export function riverfrontVisible(p:Point,site:Point){return Math.hypot(p.x-site.x,p.z-site.z)<900}

// East edge of the rendered 4m river grid, not the approximate geographic pin.
export function loveBridgeAnchor(cells:readonly Point[],reference:Point):Point|null{let edge=-Infinity;for(const p of cells)if(Math.abs(p.z-reference.z)<=5&&p.x<=reference.x+40&&p.x>=reference.x-180)edge=Math.max(edge,p.x+2);return Number.isFinite(edge)?{x:edge+1,z:reference.z}:null}
