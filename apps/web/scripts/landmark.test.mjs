import {test} from 'node:test';import assert from 'node:assert/strict';import {landmarkKind,landmarkSites,landmarkRange,segmentDistance} from '../src/landmarkPlacement.ts';
const b={x:0,z:0,halfX:5,halfZ:5,height:10};
test('Vietnamese names match',()=>{for(const [name,kind] of [['Nhà thờ Con Gà','cathedral'],['Chợ Hàn','market'],['Cá chép hóa rồng','carp'],['Cầu Tình Yêu','love']])assert.equal(landmarkKind({...b,name}),kind)});
test('only named valid footprints receive decorations',()=>{assert.equal(landmarkSites({buildings:[b,{...b,name:'Chợ Hàn'},{...b,name:'Chợ Hàn',halfX:0}]}).length,1)});
test('LOD range and segment distance',()=>{assert.equal(landmarkRange(0),180);assert.equal(landmarkRange(2),450);assert.equal(segmentDistance({x:2,z:3},{x:0,z:0},{x:4,z:0}),3)});

import {riverfrontSites,riverfrontCovered,riverfrontVisible} from '../src/riverfrontSites.ts';
test('independent riverfront sites render without named roads',()=>{assert.equal(riverfrontCovered({bounds:[108.21,16.05,108.25,16.08],roads:[]}),true);assert.equal(riverfrontCovered({bounds:[108.21,16.05,108.22,16.08],roads:[]}),false);assert.notDeepEqual(riverfrontSites[0].point,riverfrontSites[1].point);assert.equal(riverfrontVisible(riverfrontSites[0].point,riverfrontSites[1].point),true)});

import {loveBridgeAnchor} from '../src/riverfrontSites.ts';
test('love bridge starts at rendered east water edge',()=>{assert.deepEqual(loveBridgeAnchor([{x:10,z:2},{x:14,z:2},{x:18,z:2},{x:99,z:40}],{x:50,z:2}),{x:21,z:2});assert.equal(loveBridgeAnchor([],{x:50,z:2}),null)});
