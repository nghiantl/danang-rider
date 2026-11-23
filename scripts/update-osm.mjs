// Generate a versioned static OSM snapshot for the browser from public Overpass.
// Run: node scripts/update-osm.mjs
import { mkdir, writeFile } from 'node:fs/promises';
const bbox='16.0662,108.2191,16.0694,108.2225';
const query='[out:json][timeout:30];(way[highway~"^(primary|secondary|tertiary|residential|service|living_street|unclassified|pedestrian)$"]('+bbox+');way[building]('+bbox+'););out geom;';
const endpoints=[
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
  'https://overpass-api.de/api/interpreter'
];
const errors=[];
for(const endpoint of endpoints){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),45000);
  try {
    const response=await fetch(endpoint,{method:'POST',body:new URLSearchParams({data:query}),signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('HTTP '+response.status);
    const data=await response.json();
    const ways=(data.elements||[]).filter(e=>e.type==='way'&&Array.isArray(e.geometry)&&e.geometry.length>=2);
    const roads=ways.filter(e=>e.tags?.highway).length;
    if(roads<3)throw Error('Too few roads: '+roads);
    const out={elements:ways};
    const path='apps/web/public/data/danang-osm.json';
    await mkdir('apps/web/public/data',{recursive:true});
    await writeFile(path,JSON.stringify(out));
    console.log('Saved real OSM snapshot:',path,'roads:',roads,'buildings:',ways.length-roads,'source:',endpoint);
    process.exit(0);
  }catch(error){errors.push(endpoint+': '+String(error));console.warn('Overpass unavailable:',endpoint,String(error));}
  finally{clearTimeout(timeout);}
}
console.error(errors.join('\n'));
process.exit(1);
