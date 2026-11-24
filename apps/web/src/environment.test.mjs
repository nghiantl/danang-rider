import test from 'node:test';
import assert from 'node:assert/strict';
import {environmentAt,clockLabel} from './environment.ts';
test('starts at 08:00 and wraps after 12 minutes',()=>{assert.equal(environmentAt(0).hour,8);assert.equal(environmentAt(720).hour,8)});
test('night and daylight',()=>{assert.equal(environmentAt(0).daylight,1);assert.equal(environmentAt(480).night,true);assert.equal(environmentAt(480).daylight,0)});
test('twilight is gradual',()=>{assert.equal(environmentAt(300).daylight,0.5);assert.equal(environmentAt(300).twilight,1)});
test('weather cycles',()=>{assert.deepEqual([0,120,240,360,480].map(t=>environmentAt(t).weather),['sunny','cloudy','rain','cloudy','sunny'])});
test('clock formatting',()=>{assert.equal(clockLabel(8.5),'08:30');assert.equal(clockLabel(0),'00:00')});
