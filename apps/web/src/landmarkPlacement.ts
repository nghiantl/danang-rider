import type {Footprint,OSMMap,Point} from './osm.ts';
export const normalizeLandmark=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
export function landmarkKind(b:Footprint){const n=normalizeLandmark(b.name||'');return /nha tho con ga|nha tho chinh toa|da nang cathedral/.test(n)?'cathedral':/cho han|han market/.test(n)?'market':/ca chep hoa rong|dragon carp/.test(n)?'carp':/cau tinh yeu|love bridge/.test(n)?'love':null}
export function landmarkSites(map:OSMMap){return map.buildings.flatMap(b=>{const kind=landmarkKind(b);return kind&&b.halfX>=1&&b.halfZ>=1?[{b,kind}]:[]})}
export function landmarkRange(tier:number){return [180,300,450][Math.max(0,Math.min(2,tier))]}
export function segmentDistance(p:Point,a:Point,b:Point){const x=b.x-a.x,z=b.z-a.z,l=x*x+z*z,t=l?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.z-a.z)*z)/l)):0;return Math.hypot(p.x-a.x-t*x,p.z-a.z-t*z)}
