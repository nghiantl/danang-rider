import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOSM, project } from './osm.ts';
import { moveWithBuildingCollision } from './collision.ts';

test('OSM geographic projection centers Da Nang correctly', () => {
  const center=project(16.0678,108.2208);
  assert.ok(Math.abs(center.x)<0.001);
  assert.ok(Math.abs(center.z)<0.001);
});
test('OSM road and building geometry can be parsed and collided with', () => {
  const geo=(x,z)=>({lat:16.0678-z/111320,lon:108.2208+x/(111320*Math.cos(16.0678*Math.PI/180))});
  const elements=[
    {type:'way',tags:{highway:'residential',name:'Test Road'},geometry:[geo(-100,0),geo(-30,0),geo(30,0),geo(100,0)]},
    {type:'way',tags:{highway:'residential'},geometry:[geo(-100,90),geo(100,90)]},
    {type:'way',tags:{building:'yes','building:levels':'3'},geometry:[geo(0,15),geo(10,15),geo(10,25),geo(0,25),geo(0,15)]}
  ];
  const map=parseOSM(elements);
  assert.equal(map.roads.length,2);
  assert.equal(map.buildings.length,1);
  assert.ok(Math.abs(map.buildings[0].height - 9.9) < 1e-9, 'building height should be approximately 9.9m');
  const moved=moveWithBuildingCollision(-20,20,40,0,1.15,map.buildings);
  assert.equal(moved.blocked,true);
  assert.ok(moved.x<0);
});
test('empty OSM response fails explicitly instead of spawning an unusable world',()=>{
  assert.throws(()=>parseOSM([]),/insufficient/);
});

import {clearRoadBuildings} from './buildingGeometry.ts';
const road={points:[{x:-100,z:0},{x:100,z:0}],width:8,name:'Road'};
const house=(x,z,halfX,halfZ)=>({x,z,halfX,halfZ,height:12,outline:[{x:x-halfX,z:z-halfZ},{x:x+halfX,z:z-halfZ},{x:x+halfX,z:z+halfZ},{x:x-halfX,z:z+halfZ}]});
test('road clearance preserves safe houses and shrinks overlapping footprint consistently',()=>{const safe=house(0,20,4,4),overlap=house(0,9,4,5);const result=clearRoadBuildings([safe,overlap],[road]);assert.equal(result[0],safe);assert.equal(result.length,2);assert.ok(result[1].halfZ<5);assert.ok(result[1].outline.every(p=>p.z>6.2));assert.equal(moveWithBuildingCollision(-10,0,20,0,1.15,result).blocked,false);assert.equal(result[1].height,12)});
test('unrecoverable building in road is omitted, including corridor containment',()=>{assert.deepEqual(clearRoadBuildings([house(0,0,10,10),house(0,0,200,200)],[road]),[])});
test('diagonal road and cell boundary are handled',()=>{const r={...road,points:[{x:40,z:40},{x:90,z:90}]};assert.deepEqual(clearRoadBuildings([house(64,64,4,4)],[r]),[])});

test('environment poles block movement and allow retreat',()=>{const objects=[{x:0,z:0,radius:0.12,kind:'lamp'}];const hit=moveWithBuildingCollision(-5,0,10,0,1.15,[],185,[],objects);assert.equal(hit.objectHit,objects[0]);assert.ok(hit.x<0);assert.equal(moveWithBuildingCollision(hit.x,0,-3,0,1.15,[],185,[],objects).blocked,false);assert.equal(moveWithBuildingCollision(-5,3,10,0,1.15,[],185,[],objects).blocked,false)});
