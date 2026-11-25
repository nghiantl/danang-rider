import type {Order,Income} from '../orders';
import type {Point} from '../osm';
import {advanceXP,levelFor,reward,threshold,MAX_LEVEL} from './progression.ts';
import {isOrderKind,ORDER_TYPES} from './orderCatalog.ts';
import {evaluate,startRun,type DeliveryRun,type DeliveryResult} from './deliveryRating.ts';
import {validFleet,tankCapacity,type Fleet} from './vehicleShop.ts';
export const KEY='danang-rider-career-v1';
export type Career={version:1;fleet?:Fleet;health?:number;run?:DeliveryRun|null;ratings?:DeliveryResult[];name:string;created:string;xp:number;level:number;income:Income;vehicle:'petrol'|'electric';gender:'male'|'female';remaining:number;position:Point|null;stage:'pickup'|'dropoff'|'done';order:Order|null;batch:number;paid:string[];ledger:{id:string;amount:number;at:string;direction?:'expense'}[];mapMode:'osm'|'fallback'|null};
const int=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
const point=(p:any)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=20000&&Math.abs(p.z)<=20000;
export function parseCareer(raw:string):Career{
 const v=JSON.parse(raw);
 if(!v||v.version!==1||typeof v.name!=='string'||!v.name.trim()||v.name.length>40||typeof v.created!=='string'||!Number.isFinite(Date.parse(v.created))||!int(v.xp)||!int(v.level)||v.level<1||!v.income||!['wallet','completed','meters'].every(k=>int(v.income[k]))||!['petrol','electric'].includes(v.vehicle)||!['male','female'].includes(v.gender)||!Number.isFinite(v.remaining)||v.remaining<0||v.remaining>tankCapacity(v.vehicle,v.fleet?.owned?.[v.fleet?.active]?.upgrades)||!(v.position===null||point(v.position))||!['pickup','dropoff','done'].includes(v.stage)||!int(v.batch)||!Array.isArray(v.paid)||!v.paid.every((x:unknown)=>typeof x==='string')||!Array.isArray(v.ledger)||!v.ledger.every((x:any)=>x&&typeof x.id==='string'&&int(x.amount)&&typeof x.at==='string'&&(x.direction===undefined||x.direction==='expense'))||![null,'osm','fallback'].includes(v.mapMode))throw Error('Dữ liệu lưu không hợp lệ');
 if(v.health!==undefined&&(!Number.isFinite(v.health)||v.health<0||v.health>100))throw Error('Độ bền không hợp lệ');
 v.health=v.health??100;
 if(v.fleet!==undefined&&!validFleet(v.fleet,v.vehicle))throw Error('Garage không hợp lệ');
 const o=v.order;if(o!==null&&(!o||typeof o.id!=='string'||typeof o.shop!=='string'||!point(o.pickup)||!point(o.delivery)||!int(o.fare)||!Number.isFinite(o.meters)||o.meters<0))throw Error('Đơn hàng không hợp lệ');
 if(o!==null&&o.kind!==undefined&&(!isOrderKind(o.kind)||o.size!==ORDER_TYPES[o.kind as keyof typeof ORDER_TYPES].size||!int(o.minutes)||o.minutes<1))throw Error('Loại đơn hàng không hợp lệ');
 if(v.stage!=='done'&&(!o||v.paid.includes(o.id)))throw Error('Trạng thái đơn không hợp lệ');
 if(v.ratings!==undefined&&(!Array.isArray(v.ratings)||!v.ratings.every((r:any)=>r&&typeof r.id==='string'&&int(r.stars)&&r.stars>=1&&r.stars<=5&&typeof r.late==='boolean'&&int(r.condition)&&r.condition<=100&&int(r.tip)&&int(r.bonusXP))))throw Error('Đánh giá không hợp lệ');
 if(v.run!=null&&(!o||v.run.id!==o.id||!int(v.run.deadline)||!int(v.run.condition)||v.run.condition>100))throw Error('Tiến trình giao hàng không hợp lệ');
 if(v.stage!=='done'&&!v.run)v.run=startRun(o);
 v.xp=Math.min(v.xp,threshold(MAX_LEVEL));v.level=levelFor(v.xp);
 return v;
}
export function newCareer(legacy:string|null):Career{
 let income={wallet:100000,completed:0,meters:0};
 try{const v=JSON.parse(legacy||'null');if(v&&['wallet','completed','meters'].every(k=>int(v[k])))income={wallet:v.wallet,completed:v.completed,meters:v.meters}}catch{}
 return {version:1,health:100,name:'Shipper Đà Nẵng',created:new Date().toISOString(),xp:0,level:1,income,vehicle:'petrol',gender:'male',remaining:4,position:null,stage:'done',order:null,batch:Math.floor(Date.now()/1000),paid:[],ledger:[],mapMode:null};
}
export function settle(c:Career,o:Order):Career{
 if(c.paid.includes(o.id))return c;
 const result=c.run?.id===o.id?evaluate(o,c.run):null;const p=advanceXP(c.xp,o.meters,result?.bonusXP??0),at=new Date().toISOString(),bonuses=p.levels.map(l=>({id:'LEVEL-'+l,amount:reward(l),at})).filter(t=>!c.ledger.some(e=>e.id===t.id));
 return {...c,run:null,...(result?{ratings:[...(c.ratings??[]),result]}:{}),xp:p.xp,level:p.level,stage:'done',income:{wallet:c.income.wallet+o.fare+(result?.tip??0)+bonuses.reduce((sum,t)=>sum+t.amount,0),completed:c.income.completed+1,meters:c.income.meters+Math.round(o.meters)},paid:[...c.paid,o.id],ledger:[...c.ledger,{id:o.id,amount:o.fare,at},...(result?.tip?[{id:'TIP-'+o.id,amount:result.tip,at}]:[]),...bonuses],batch:c.batch+1};
}
