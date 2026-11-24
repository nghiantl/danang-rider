import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWorld,cell,nearby,obstaclesNear} from './world.ts';
const b={x:499,z:0,halfX:5,halfZ:5,height:12};
const map={buildings:[b,{...b,x:2500}],roads:[{points:[{x:-600,z:0},{x:1100,z:0}],width:8,name:'test'}]};
test('negative coordinates and chunk boundaries',()=>{assert.equal(cell(-1),-1);assert.equal(cell(500),1)});
test('local collision includes cross-boundary building but excludes distant ones',()=>{const w=buildWorld(map);assert.deepEqual(obstaclesNear(w,501,0),[b]);assert.equal(nearby(w,0,0).flatMap(c=>c.buildings).length,1)});
test('long road is divided into local segments without losing length',()=>{const w=buildWorld(map);const segments=[...w.values()].flatMap(c=>c.segments);assert.ok(segments.every(s=>s.length<=50));assert.ok(Math.abs(segments.reduce((n,s)=>n+s.length,0)-1700)<1e-6)});
