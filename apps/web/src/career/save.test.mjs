import test from 'node:test';
import assert from 'node:assert/strict';
import {newCareer,parseCareer,settle} from './save.ts';
test('new career and legacy migration',()=>{assert.equal(newCareer(null).income.wallet,100000);assert.deepEqual(newCareer('{"wallet":500,"completed":2,"meters":300}').income,{wallet:500,completed:2,meters:300})});
test('roundtrip and invalid save',()=>{const c=newCareer(null);assert.deepEqual(parseCareer(JSON.stringify(c)),c);assert.throws(()=>parseCareer('{}'));assert.throws(()=>parseCareer(JSON.stringify({...c,remaining:-1})))});
test('settlement idempotence',()=>{const c=newCareer(null),o={id:'test',shop:'shop',pickup:{x:0,z:0},delivery:{x:1,z:1},fare:12000,meters:120};const n=settle(c,o);assert.equal(n.income.wallet,112000);assert.equal(n.income.completed,1);assert.equal(n.ledger.length,1);assert.equal(settle(n,o),n)});
