import test from 'node:test';
import assert from 'node:assert/strict';
import {lanesFor,pose,advance,signalsFor,light,desiredSpeed,signalState,signalApproaches,stopPosition,insideJunction} from './traffic.ts';
const a={x:0,z:0},b={x:0,z:20},c={x:20,z:20};
const road=(points,oneway=0)=>({points,oneway,width:8,name:'Test'});
test('one-way lane and right-hand offset',()=>{const l=lanesFor([road([a,b],1)]);assert.equal(l.length,1);assert.equal(pose(l[0],10).x,-2)});
test('vehicle continues onto connected segment',()=>{const l=lanesFor([road([a,b,c],1)]);const v={lane:0,t:19,speed:5,kind:0};assert.equal(advance(v,l,1,()=>0),true);assert.equal(v.lane,1);assert.equal(v.t,4)});
test('dead end returns false',()=>{const l=lanesFor([road([a,b],1)]);assert.equal(advance({lane:0,t:19,speed:5,kind:0},l,1),false)});

test('signal phases never give both axes green',()=>{const s={point:a,axis:0,phase:0};for(let t=0;t<92;t+=0.25)assert.ok(!(light(s,0,t)==='green'&&light(s,1,t)==='green'))});
test('AI stops for player ahead and ignores player behind',()=>{const l=lanesFor([road([a,b],1)]),v={lane:0,t:5,speed:8,kind:0};assert.equal(desiredSpeed(v,l,[v],{x:-2,z:8},new Map(),0),0);assert.equal(desiredSpeed(v,l,[v],{x:-2,z:0},new Map(),0),8)});
test('red and yellow stop AI before intersection; green releases it',()=>{
 const l=lanesFor([road([a,b,c]),road([b,{x:-20,z:20}]),road([b,{x:0,z:40}])]);
 const signals=signalsFor(l);assert.equal(signals.size,1);
 const signal=[...signals.values()][0];
 const v={lane:0,t:0,speed:8,kind:0};v.t=stopPosition(v,l[0],l);
 const axis=Math.abs(l[0].ux)>Math.abs(l[0].uz)?0:1;
 for(const [phase,expected] of [[0,'green'],[20,'yellow'],[23,'red']]){
  const time=(phase-signal.phase-axis*23+92)%46;
  assert.equal(light(signal,axis,time),expected);
  assert.equal(desiredSpeed(v,l,[v],{x:100,z:100},signals,time),expected==='green'?8:0);
 }
});

test('T junction has no signal; four-way junction has four approaches',()=>{
 assert.equal(signalsFor(lanesFor([road([a,b,c]),road([b,{x:-20,z:20}])])).size,0);
 const l=lanesFor([road([a,b,{x:0,z:40}]),road([{x:-20,z:20},b,c])]);
 const signals=signalsFor(l);assert.equal(signals.size,1);assert.equal(signalApproaches(l,signals).length,4);
});
test('countdown follows exact phase boundaries',()=>{
 const s={point:a,axis:0,phase:0};
 for(const [t,color,remaining] of [[0,'green',20],[19,'green',1],[20,'yellow',3],[22,'yellow',1],[23,'red',23],[26,'red',20],[45,'red',1],[46,'green',20]])assert.deepEqual(signalState(s,0,t),{color,remaining});
});

test('committed vehicle clears intersection even after red',()=>{
 const l=lanesFor([road([a,b,{x:0,z:40}]),road([{x:-20,z:20},b,c])]),signals=signalsFor(l),s=[...signals.values()][0];
 const v={lane:0,t:18,speed:8,kind:1};
 const time=(23-s.phase-23+92)%46;
 assert.equal(light(s,1,time),'red');
 assert.equal(desiredSpeed(v,l,[v],{x:100,z:100},signals,time),8);
 assert.ok(insideJunction(l[0],v.t,l,signals));
});
test('green approach waits for vehicle clearing junction',()=>{
 const l=lanesFor([road([a,b,{x:0,z:40}]),road([{x:-20,z:20},b,c])]),signals=signalsFor(l),s=[...signals.values()][0];
 const v={lane:0,t:0,speed:8,kind:1};v.t=stopPosition(v,l[0],l);
 const cross=l.findIndex(q=>q.a.x===-20&&q.b.x===0);
 const other={lane:cross,t:19,speed:8,kind:1};
 const time=(0-s.phase-23+92)%46;
 assert.equal(desiredSpeed(v,l,[v,other],{x:100,z:100},signals,time),0);
 assert.equal(desiredSpeed(v,l,[v],{x:100,z:100},signals,time),8);
 assert.ok(l[0].length-v.t>=6.8);
});
