import test from 'node:test';
import assert from 'node:assert/strict';
import {lanesFor,pose,advance,signalsFor,light,desiredSpeed} from './traffic.ts';
const a={x:0,z:0},b={x:0,z:20},c={x:20,z:20};
const road=(points,oneway=0)=>({points,oneway,width:8,name:'Test'});
test('one-way lane and right-hand offset',()=>{const l=lanesFor([road([a,b],1)]);assert.equal(l.length,1);assert.equal(pose(l[0],10).x,-2)});
test('vehicle continues onto connected segment',()=>{const l=lanesFor([road([a,b,c],1)]);const v={lane:0,t:19,speed:5,kind:0};assert.equal(advance(v,l,1,()=>0),true);assert.equal(v.lane,1);assert.equal(v.t,4)});
test('dead end returns false',()=>{const l=lanesFor([road([a,b],1)]);assert.equal(advance({lane:0,t:19,speed:5,kind:0},l,1),false)});

test('signal phases never give both axes green',()=>{const s={point:a,axis:0,phase:0};for(let t=0;t<52;t+=0.25)assert.ok(!(light(s,0,t)==='green'&&light(s,1,t)==='green'))});
test('AI stops for player ahead and ignores player behind',()=>{const l=lanesFor([road([a,b],1)]),v={lane:0,t:5,speed:8,kind:0};assert.equal(desiredSpeed(v,l,[v],{x:-2,z:8},new Map(),0),0);assert.equal(desiredSpeed(v,l,[v],{x:-2,z:0},new Map(),0),8)});
test('red signal stops AI before intersection',()=>{const l=lanesFor([road([a,b,c]),road([b,{x:-20,z:20}])]);const signals=signalsFor(l);assert.equal(signals.size,1);const v={lane:0,t:17,speed:8,kind:0};assert.equal(desiredSpeed(v,l,[v],{x:100,z:100},signals,0),0)});
