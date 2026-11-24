import test from 'node:test';import assert from 'node:assert/strict';import {fare,readIncome,credit,makeOrders} from './orders.ts';
test('distance fare',()=>{assert.equal(fare(1000),17000);assert.equal(fare(1001),17500)});
test('invalid storage resets',()=>{assert.equal(readIncome('bad').wallet,0);assert.equal(readIncome('{"wallet":-1}').wallet,0)});
test('fallback orders and income',()=>{const orders=makeOrders(null,0);assert.equal(orders.length,3);const v=credit(readIncome(null),orders[0]);assert.equal(v.wallet,orders[0].fare);assert.equal(v.completed,1);assert.deepEqual(readIncome(JSON.stringify(v)),v)});
