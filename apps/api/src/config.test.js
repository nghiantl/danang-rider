import test from 'node:test';import assert from 'node:assert/strict';
test('petrol consumption 30km/l',()=>assert.equal(30/30,1));
test('electric full charge 200km',()=>assert.equal(100-200/200*100,0));