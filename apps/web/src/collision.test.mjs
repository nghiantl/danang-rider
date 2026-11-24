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
