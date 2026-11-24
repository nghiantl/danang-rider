import test from 'node:test';
import assert from 'node:assert/strict';
import {walkPaths,walkerPose,stepWalker} from './pedestrians.ts';
const road={points:[{x:0,z:0},{x:0,z:30}],width:8,name:'Test'};
const paths=walkPaths([road]);
test('two sidewalk paths match city geometry',()=>{assert.equal(paths.length,2);assert.equal(Math.abs(paths[0].a.x),4.7);assert.equal(paths[0].length,22);assert.equal(paths[0].a.z,4)});
test('narrow roads and short segments excluded',()=>{assert.equal(walkPaths([{...road,width:6},{...road,points:[{x:0,z:0},{x:0,z:8}]}]).length,0)});
test('walker stops near player and resumes when clear',()=>{const w={path:0,t:5,direction:1,speed:1,phase:0};assert.equal(stepWalker(w,paths[0],walkerPose(w,paths[0]),1),false);assert.equal(w.t,5);assert.equal(stepWalker(w,paths[0],{x:100,z:100},1),true);assert.equal(w.t,6)});
test('walker reverses at path endpoint',()=>{const w={path:0,t:21.5,direction:1,speed:1,phase:0};stepWalker(w,paths[0],{x:100,z:100},1);assert.equal(w.t,22);assert.equal(w.direction,-1)});

test('four-way junction generates four crossing paths',()=>{const roads=[road,{...road,points:[{x:0,z:0},{x:0,z:-30}]},{...road,points:[{x:0,z:0},{x:30,z:0}]},{...road,points:[{x:0,z:0},{x:-30,z:0}]}];assert.equal(walkPaths(roads).filter(p=>p.crossing).length,4)});

test('ordinary junction crossing geometry unchanged without bridge',()=>{const roads=[road,{...road,points:[{x:0,z:0},{x:0,z:-30}]},{...road,points:[{x:0,z:0},{x:30,z:0}]},{...road,points:[{x:0,z:0},{x:-30,z:0}]}];assert.ok(walkPaths(roads).filter(p=>p.crossing).every(p=>Math.abs(p.length-9.4)<1e-6));});
