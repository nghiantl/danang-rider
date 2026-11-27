import {test} from 'node:test';import assert from 'node:assert/strict';import {greenClear,greenPlots} from '../src/vegetationPlacement.ts';
const road={x:0,z:0,length:40,width:10,angle:0};const chunk={segments:[road],buildings:[],obstacles:[]};
test('green plots stay beyond sidewalk',()=>{assert.equal(greenClear({x:0,z:5.7},[chunk],.5),false);const plots=greenPlots(chunk,[chunk]);assert.equal(plots.length,2);assert.ok(plots.every(p=>Math.abs(p.z)===12))});
test('building blocks green plot',()=>{const blocked={...chunk,obstacles:[{x:0,z:12,halfX:3,halfZ:3,height:8}]};assert.equal(greenPlots(blocked,[blocked]).length,1)});
