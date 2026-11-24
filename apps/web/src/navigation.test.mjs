import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGraph,findRoute,progress} from './navigation.ts';
const a={x:0,z:0},b={x:0,z:-100},c={x:100,z:-100};
const road=(points,oneway=0)=>({points,oneway,width:8,name:'Test'});
test('routes through connected roads and reports right turn',()=>{const r=findRoute(buildGraph([road([a,b]),road([b,c])]),a,c);assert.equal(r.length,200);assert.equal(progress(r,a).instruction,'Rẽ phải');assert.equal(progress(r,{x:0,z:-50}).remaining,150)});
test('respects one-way direction',()=>{const g=buildGraph([road([a,b],1)]);assert.ok(findRoute(g,a,b));assert.equal(findRoute(g,b,a),null)});
test('disconnected roads do not invent a route',()=>{assert.equal(findRoute(buildGraph([road([a,b]),road([c,{x:200,z:-100}])]),a,c),null)});
