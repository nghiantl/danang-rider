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
  assert.equal(map.buildings[0].height,9.9);
  const moved=moveWithBuildingCollision(-20,20,40,0,1.15,map.buildings);
  assert.equal(moved.blocked,true);
  assert.ok(moved.x<0);
});
test('empty OSM response fails explicitly instead of spawning an unusable world',()=>{
  assert.throws(()=>parseOSM([]),/insufficient/);
});
