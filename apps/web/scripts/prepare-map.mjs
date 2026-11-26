import {readFile,writeFile} from 'node:fs/promises';
import {parseOSM} from '../src/osm.ts';
const data=JSON.parse(await readFile(new URL('../public/data/danang-osm.json',import.meta.url),'utf8'));
const map=parseOSM(data.elements||[],data.bounds??[108.2152,16.0516,108.2376,16.0732]);
await writeFile(new URL('../public/data/danang-prepared-v1.json',import.meta.url),JSON.stringify(map));
console.log('Prepared OSM',map.roads.length,map.buildings.length);
