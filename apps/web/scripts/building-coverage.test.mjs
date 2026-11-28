import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fillBuildingGaps} from '../src/buildingCoverage.ts';
const original=[0,12,24].map(x=>({x,z:30,halfX:3,halfZ:3,height:6}));
const map={roads:[{points:[{x:-30,z:0},{x:100,z:0}],width:8,kind:'residential',name:'test'}],buildings:original,spawn:{x:-100,z:-100},pickup:{x:-100,z:-100},delivery:{x:-100,z:-100},extent:200};
test('infill preserves originals and is deterministic',()=>{const a=fillBuildingGaps(map);assert.ok(a.buildings.length>original.length);assert.deepEqual(a.buildings.slice(0,3),original);assert.deepEqual(a,fillBuildingGaps(map));assert.deepEqual(a,fillBuildingGaps(a));});
test('protected park excludes new buildings',()=>{const a=fillBuildingGaps({...map,protectedAreas:[[{x:-100,z:-100},{x:150,z:-100},{x:150,z:100},{x:-100,z:100}]]});assert.deepEqual(a.buildings,original)});
test('bridge and pedestrian roads are excluded',()=>{for(const road of [{...map.roads[0],bridge:true},{...map.roads[0],kind:'pedestrian'}])assert.deepEqual(fillBuildingGaps({...map,roads:[road]}).buildings,original)});
test('named landmark buffer excludes adjacent infill',()=>{const a=fillBuildingGaps({...map,buildings:[{...original[0],name:'Chợ Hàn'},...original.slice(1)]});assert.ok(a.buildings.slice(3).every(b=>Math.hypot(b.x,b.z-30)>=Math.hypot(3,3)+20+Math.hypot(b.halfX,b.halfZ)))});

test('empty urban frontage can receive houses',()=>{assert.ok(fillBuildingGaps({...map,buildings:[]}).buildings.length>0)});

import {shopOpen,streetShops,shopColliders} from '../src/streetLife.ts';
test('shop opening hours',()=>{assert.equal(shopOpen(4,12),false);assert.equal(shopOpen(4,19),true);assert.equal(shopOpen(4,2),true);assert.equal(shopOpen(4,3),false);assert.equal(shopOpen(1,7),true);assert.equal(shopOpen(1,20),false)});
test('no stalls without frontage',()=>assert.deepEqual(streetShops({...map,buildings:[]}),[]));

test('street shops respect frontage, protected areas and opening hours',()=>{const m={...map,roads:[{...map.roads[0],width:12}],buildings:[{x:-15,z:18,halfX:4,halfZ:5,height:9}]};const shops=streetShops(m);assert.ok(shops.length>0);assert.deepEqual(streetShops(m),shops);assert.equal(shopColliders(m,2).length,shops.length);assert.equal(shopColliders(m,12).length,shops.length);for(const [i,s] of shops.entries())assert.equal(shopColliders(m,2)[i].radius,shopOpen(s.kind,2)?1.25:.65);assert.deepEqual(streetShops({...m,protectedAreas:[[{x:-100,z:-100},{x:150,z:-100},{x:150,z:100},{x:-100,z:100}]]}),[]);});

test('local shop collision index matches full scan',()=>{const m={...map,roads:[{...map.roads[0],width:12}],buildings:[{x:-15,z:18,halfX:4,halfZ:5,height:9}]};for(const s of streetShops(m))for(const hour of [2,7,12,19,23]){const expected=shopColliders(m,hour).filter(p=>Math.hypot(p.x-s.x,p.z-s.z)<12);const actual=shopColliders(m,hour,s).map(({x,z,radius,kind})=>({x,z,radius,kind}));const sort=a=>a.sort((p,q)=>p.x-q.x||p.z-q.z);assert.deepEqual(sort(actual),sort(expected))}});

test('procedural footprint stays outside protected boundary including clearance',()=>{const protectedAreas=[[{x:5,z:10},{x:35,z:10},{x:35,z:35},{x:5,z:35}]];const result=fillBuildingGaps({...map,protectedAreas});assert.ok(result.buildings.length>original.length);for(const b of result.buildings.filter(b=>b.kind==='procedural-residential'))assert.ok(b.x+b.halfX+3<5||b.x-b.halfX-3>35||b.z+b.halfZ+3<10||b.z-b.halfZ-3>35);});
