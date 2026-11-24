import test from 'node:test';
import assert from 'node:assert/strict';
import {audioLevels} from './gameAudio.ts';
test('petrol idles, electric silent at rest',()=>{assert.ok(audioLevels(0,false,0,false,0).engine>0);assert.equal(audioLevels(0,true,0,false,0).engine,0)});
test('speed raises pitch and wind',()=>{for(const electric of [true,false]){const a=audioLevels(0,electric,0,false,0),b=audioLevels(60,electric,0,false,0);assert.ok(b.frequency>a.frequency);assert.ok(b.wind>a.wind)}});
test('weather and traffic levels bounded',()=>{const a=audioLevels(100,false,2,false,2);assert.equal(a.rain,0.12);assert.equal(a.traffic,0.045);assert.equal(audioLevels(0,false,-1,false,-1).rain,0)});
test('night quieter than day',()=>{assert.ok(audioLevels(0,false,0,true,0).ambient<audioLevels(0,false,0,false,0).ambient)});
