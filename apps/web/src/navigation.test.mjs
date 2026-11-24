import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGraph,findRoute,progress,missionPoints} from './navigation.ts';
const a={x:0,z:0},b={x:0,z:-100},c={x:100,z:-100};
const road=(points,oneway=0)=>({points,oneway,width:8,name:'Test'});
test('routes through connected roads and reports right turn',()=>{const r=findRoute(buildGraph([road([a,b]),road([b,c])]),a,c);assert.equal(r.length,200);assert.equal(progress(r,a).instruction,'Rẽ phải');assert.equal(progress(r,{x:0,z:-50}).remaining,150)});
test('respects one-way direction',()=>{const g=buildGraph([road([a,b],1)]);assert.ok(findRoute(g,a,b));assert.equal(findRoute(g,b,a),null)});
test('disconnected roads do not invent a route',()=>{assert.equal(findRoute(buildGraph([road([a,b]),road([c,{x:200,z:-100}])]),a,c),null)});

test('mission targets exclude disconnected and irreversible roads',()=>{
 const g=buildGraph([road([a,b,c]),road([c,{x:900,z:-100}],1),road([{x:2000,z:0},{x:3000,z:0}])]);
 const m=missionPoints(g,()=>true);
 assert.ok(m);assert.ok(findRoute(g,m.spawn,m.pickup));assert.ok(findRoute(g,m.pickup,m.delivery));
 assert.deepEqual(m.pickup,c);
});
test('GPS snaps to a nearby reachable vertex instead of isolated nearest vertex',()=>{
 const g=buildGraph([road([a,b,c]),road([{x:5,z:0},{x:5,z:10}])]);
 assert.ok(findRoute(g,{x:5,z:0},c));
});
