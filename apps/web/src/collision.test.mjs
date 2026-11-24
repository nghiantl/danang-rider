import test from 'node:test';
import assert from 'node:assert/strict';
import { collidesWithBuildings, moveWithBuildingCollision, BUILDINGS } from './collision.ts';

test('static building footprints exist', () => {
  assert.ok(BUILDINGS.length > 30);
  assert.ok(collidesWithBuildings(-80, 80));
  assert.equal(collidesWithBuildings(-20, 80), false);
  assert.equal(collidesWithBuildings(140, -100), false);
});
test('motorbike stops before the building wall', () => {
  const result = moveWithBuildingCollision(-95, 80, 35, 0);
  assert.equal(result.blocked, true);
  assert.ok(result.x < -88);
  assert.equal(collidesWithBuildings(result.x, result.z), false);
});
test('large movement cannot tunnel through a building', () => {
  const result = moveWithBuildingCollision(-110, 80, 80, 0);
  assert.ok(result.x < -88);
  assert.equal(collidesWithBuildings(result.x, result.z), false);
});
test('motorbike can slide along a wall', () => {
  const result = moveWithBuildingCollision(-95, 80, 35, 12);
  assert.ok(result.z > 80);
  assert.equal(collidesWithBuildings(result.x, result.z), false);
});
test('movement remains inside world boundary', () => {
  const result = moveWithBuildingCollision(180, 0, 100, 0);
  assert.equal(result.x, 185);
});

const diamond={x:0,z:0,halfX:10,halfZ:10,outline:[{x:0,z:-10},{x:10,z:0},{x:0,z:10},{x:-10,z:0},{x:0,z:-10}]};
test('empty corner of rotated building bounds is driveable',()=>{
 assert.equal(collidesWithBuildings(8,8,1.15,[diamond]),false);
 const r=moveWithBuildingCollision(7,8,8,0,1.15,[diamond]);
 assert.equal(r.blocked,false);assert.ok(Math.abs(r.x-15)<1e-8);
});
test('polygon interior and wall clearance remain solid',()=>{
 assert.equal(collidesWithBuildings(0,0,1.15,[diamond]),true);
 assert.equal(collidesWithBuildings(5.5,5.5,1.15,[diamond]),true);
 const r=moveWithBuildingCollision(20,0,-40,0,1.15,[diamond]);
 assert.ok(r.blocked);assert.ok(r.x>=11.15);
});

import {vehicleCollider,penetration} from './vehicleCollision.ts';
test('fast rider cannot tunnel through AI car or scooter',()=>{
 for(const kind of [0,1]){
 const v=vehicleCollider(0,0,0,kind);
 const result=moveWithBuildingCollision(0,-8,0,16,1.15,[],185,[v]);
 assert.equal(result.blocked,true);assert.ok(result.z<0);assert.ok(penetration(result.x,result.z,1.15,v)<=0);
 }
});
test('rotated vehicle uses oriented footprint',()=>{
 const v=vehicleCollider(0,0,Math.PI/2,1);
 assert.ok(penetration(2.5,0,1.15,v)>0);
 assert.ok(penetration(0,2.5,1.15,v)<0);
});
test('rider can escape existing overlap',()=>{
 const v=vehicleCollider(0,0,0,1);
 const result=moveWithBuildingCollision(1,0,3,0,1.15,[],185,[v]);
 assert.ok(Math.abs(result.x-4)<1e-9, `Expected x near 4, got ${result.x}`);
 assert.ok(penetration(result.x,result.z,1.15,v)<=0);
 assert.equal(result.blocked,false);
});
