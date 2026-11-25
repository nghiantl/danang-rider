import type {Career} from './save';
export const CATALOG=[
{id:'starter-petrol',name:'City Basic',kind:'petrol',level:1,price:0,speed:21},
{id:'starter-electric',name:'Eco Basic',kind:'electric',level:1,price:0,speed:18},
{id:'urban-pro',name:'Urban Pro',kind:'petrol',level:10,price:350000,speed:24},
{id:'electric-max',name:'Electric Max',kind:'electric',level:15,price:550000,speed:23},
{id:'speed-rider',name:'Speed Rider',kind:'petrol',level:25,price:900000,speed:29},
{id:'cargo-master',name:'Cargo Master',kind:'petrol',level:30,price:1200000,speed:25}
] as const;
export type VehicleId=typeof CATALOG[number]['id'];
export type Fleet={active:VehicleId;owned:Partial<Record<VehicleId,{remaining:number;health:number;upgrades?:Upgrades}>>};
export const spec=(id:VehicleId)=>CATALOG.find(v=>v.id===id)!;
export const starter=(kind:Career['vehicle']):VehicleId=>kind==='petrol'?'starter-petrol':'starter-electric';
export function fleet(c:Career):Fleet{const active=c.fleet?.active??starter(c.vehicle);return {active,owned:{...c.fleet?.owned,[active]:{...c.fleet?.owned[active],remaining:c.remaining,health:c.health??100}}}}
export function validFleet(f:any,kind:Career['vehicle']):boolean{return !!f&&!!f.owned&&typeof f.owned==='object'&&!Array.isArray(f.owned)&&CATALOG.some(v=>v.id===f.active&&v.kind===kind)&&!!f.owned[f.active]&&Object.entries(f.owned).every(([id,value])=>{const v=CATALOG.find(x=>x.id===id),p=value as any;return !!v&&!!p&&Number.isFinite(p.remaining)&&p.remaining>=0&&p.remaining<=tankCapacity(v.kind,p.upgrades)&&validUpgrades(p.upgrades)&&Number.isFinite(p.health)&&p.health>=0&&p.health<=100})}
export function buyVehicle(c:Career,id:VehicleId):Career{const v=spec(id),f=fleet(c);if(!v||f.owned[id]||c.level<v.level||c.income.wallet<v.price||c.stage!=='done')return c;return {...c,fleet:{...f,owned:{...f.owned,[id]:{remaining:v.kind==='petrol'?4:100,health:100}}},income:{...c.income,wallet:c.income.wallet-v.price},ledger:v.price?[...c.ledger,{id:'VEHICLE-'+id,amount:v.price,at:new Date().toISOString(),direction:'expense'}]:c.ledger}}
export function selectVehicle(c:Career,id:VehicleId):Career{const f=fleet(c),p=f.owned[id];if(!p||c.stage!=='done')return c;return {...c,vehicle:spec(id).kind,remaining:p.remaining,health:p.health,fleet:{...f,active:id}}}

export const COLORS=['#d94b39','#36b6a7','#326ca6','#20272e','#f4f4f4','#e7b84b'] as const;
export const PARTS=['engine','brake','tires','range'] as const;
export type Part=typeof PARTS[number];
export type Upgrades={engine:number;brake:number;tires:number;range:number;paint?:string;box?:string};
export const defaults:Upgrades={engine:0,brake:0,tires:0,range:0};
export function validUpgrades(u:any){return u===undefined||!!u&&PARTS.every(k=>Number.isInteger(u[k])&&u[k]>=0&&u[k]<=3)&&['paint','box'].every(k=>u[k]===undefined||COLORS.some(c=>c===u[k]))}
export function upgrades(c:Career):Upgrades{return fleet(c).owned[fleet(c).active]?.upgrades??defaults}
export function tankCapacity(kind:Career['vehicle'],u?:Upgrades){return kind==='petrol'?4+(u?.range??0):100}
export const upgradePrice=(part:Part,level:number)=>({engine:60000,brake:40000,tires:35000,range:50000}[part])*(level+1);
export function customize(c:Career,part:Part|'paint'|'box',color?:string):Career{if(c.stage!=='done')return c;const f=fleet(c),p=f.owned[f.active]!,u={...defaults,...p.upgrades};let cost:number;if(part==='paint'||part==='box'){if(!COLORS.some(x=>x===color)||u[part]===color)return c;cost=15000;u[part]=color}else{if(u[part]>=3||c.level<1+u[part]*5)return c;cost=upgradePrice(part,u[part]);u[part]++}if(c.income.wallet<cost)return c;return {...c,fleet:{...f,owned:{...f.owned,[f.active]:{...p,upgrades:u}}},income:{...c.income,wallet:c.income.wallet-cost},ledger:[...c.ledger,{id:'UPGRADE-'+f.active+'-'+part+'-'+c.ledger.length,amount:cost,at:new Date().toISOString(),direction:'expense'}]}}
