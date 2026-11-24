import test from 'node:test';
import assert from 'node:assert/strict';
import {lanesFor,pose,advance} from './traffic.ts';
const a={x:0,z:0},b={x:0,z:20},c={x:20,z:20};
const road=(points,oneway=0)=>({points,oneway,width:8,name:'Test'});
test('one-way lane and right-hand offset',()=>{const l=lanesFor([road([a,b],1)]);assert.equal(l.length,1);assert.equal(pose(l[0],10).x,-2)});
test('vehicle continues onto connected segment',()=>{const l=lanesFor([road([a,b,c],1)]);const v={lane:0,t:19,speed:5,kind:0};assert.equal(advance(v,l,1,()=>0),true);assert.equal(v.lane,1);assert.equal(v.t,4)});
test('dead end returns false',()=>{const l=lanesFor([road([a,b],1)]);assert.equal(advance({lane:0,t:19,speed:5,kind:0},l,1),false)});
