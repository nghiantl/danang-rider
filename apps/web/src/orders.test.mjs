import test from 'node:test';import assert from 'node:assert/strict';import {fare,readIncome,credit,makeOrders} from './orders.ts';
test('distance fare',()=>{assert.equal(fare(1000),17000);assert.equal(fare(1001),17500)});
test('invalid storage resets',()=>{assert.equal(readIncome('bad').wallet,0);assert.equal(readIncome('{"wallet":-1}').wallet,0)});
test('fallback orders and income',()=>{const orders=makeOrders(null,0);assert.equal(orders.length,3);const v=credit(readIncome(null),orders[0]);assert.equal(v.wallet,orders[0].fare);assert.equal(v.completed,1);assert.deepEqual(readIncome(JSON.stringify(v)),v)});

import {TEMPLATES,orderDetail} from './career/orderDetails.ts';
test('100 distinct delivery templates',()=>{assert.equal(TEMPLATES.length,100);assert.equal(new Set(TEMPLATES.map(t=>t.product)).size,100)});
test('deterministic details and eligible kinds',()=>{for(const level of [1,5,10,20])for(let b=0;b<100;b++){const orders=makeOrders(null,b,level);assert.deepEqual(orders,makeOrders(null,b,level));for(const o of orders){assert.ok(o.detail.quantity>=1&&o.detail.quantity<=3);assert.ok(TEMPLATES.some(t=>t.kind===o.kind&&t.product===o.detail.product));assert.ok(level>=({food:1,parcel:1,fragile:5,express:10,vip:20}[o.kind]));}}assert.equal(orderDetail('food',0,0).detail.product,'Mì Quảng gà')});
