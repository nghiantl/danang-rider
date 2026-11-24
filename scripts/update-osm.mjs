// Download a small real Da Nang map extract from the official OSM API.
// OSM API map bbox order is: min longitude, min latitude, max longitude, max latitude.
// This is an occasional manually triggered export, NOT a live gameplay request.
import { mkdir, writeFile } from 'node:fs/promises';
// Approximately 1.2 km x 1.2 km around the original downtown center.
export const tiles=['108.2152,16.0624,108.2264,16.0732','108.2264,16.0624,108.2376,16.0732','108.2152,16.0516,108.2264,16.0624','108.2264,16.0516,108.2376,16.0624'];
const output='apps/web/public/data/danang-osm.json';
const acceptedHighways=new Set(['primary','secondary','tertiary','residential','service','living_street','unclassified','pedestrian']);
function attributes(tag){
  const out={};
  for(const match of tag.matchAll(/([\w:-]+)="([^"]*)"/g))out[match[1]]=match[2];
  return out;
}
function decodeEntities(value){
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi,entity=>{
    const named={'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'};
    if(named[entity])return named[entity];
    if(entity.startsWith('&#')) {
      const hex=entity[2]?.toLowerCase()==='x';
      const num=Number.parseInt(entity.slice(hex?3:2,-1),hex?16:10);
      return Number.isFinite(num)&&num<=0x10ffff?String.fromCodePoint(num):entity;
    }
    return entity;
  });
}
export function parseOsmXml(xml){
  const nodes=new Map();
  for(const match of xml.matchAll(/<node\b[^>]*\/?\s*>/g)){
    const a=attributes(match[0]);
    const lat=Number(a.lat),lon=Number(a.lon);
    if(a.id&&Number.isFinite(lat)&&Number.isFinite(lon))nodes.set(a.id,{lat,lon});
  }
  const elements=[];
  for(const match of xml.matchAll(/<way\b[^>]*>([\s\S]*?)<\/way>/g)){
    const body=match[1],tags={};
    for(const t of body.matchAll(/<tag\b[^>]*\/?\s*>/g)){
      const a=attributes(t[0]);
      if(a.k!==undefined&&a.v!==undefined)tags[decodeEntities(a.k)]=decodeEntities(a.v);
    }
    if(!tags.building&&!acceptedHighways.has(tags.highway))continue;
    const geometry=[];
    for(const nd of body.matchAll(/<nd\b[^>]*\/?\s*>/g)){
      const ref=attributes(nd[0]).ref;
      const point=nodes.get(ref);
      if(point)geometry.push(point);
    }
    if(geometry.length>=2)elements.push({type:'way',id:attributes(match[0].split('>')[0]).id,tags,geometry});
  }
  return {elements};
}
export function validateSnapshot(data){
  const roads=data.elements.filter(e=>acceptedHighways.has(e.tags.highway)).length;
  const buildings=data.elements.filter(e=>Boolean(e.tags.building)).length;
  if(roads<3)throw Error('Insufficient OSM roads: '+roads);
  return {roads,buildings};
}
export function mergeSnapshots(snapshots){
 const ways=new Map();
 for(const snapshot of snapshots)for(const e of snapshot.elements){const key=e.id??JSON.stringify(e.geometry);ways.set(key,e)}
 return {elements:[...ways.values()]};
}
async function main(){
 const snapshots=[];
 for(const bbox of tiles){
  const url='https://api.openstreetmap.org/api/0.6/map?bbox='+bbox;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
  try{
   const response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'DaNangRiderOSMExporter/1.0 (https://github.com/nghiantl/danang-rider)','Accept':'application/xml'}});
   if(!response.ok)throw Error('OSM HTTP '+response.status+' '+bbox);
   const xml=await response.text();if(!xml.includes('<osm'))throw Error('Unexpected OSM response');
   const data=parseOsmXml(xml);validateSnapshot(data);snapshots.push(data);
  }finally{clearTimeout(timer)}
  if(snapshots.length<tiles.length)await new Promise(resolve=>setTimeout(resolve,2000));
 }
 const data=mergeSnapshots(snapshots),counts=validateSnapshot(data);
 await mkdir('apps/web/public/data',{recursive:true});
 await writeFile(output,JSON.stringify(data));
 console.log('Saved expanded snapshot',counts);
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)main().catch(error=>{console.error(error);process.exitCode=1});
