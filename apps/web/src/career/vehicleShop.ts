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
export type Fleet={active:VehicleId;owned:Partial<Record<VehicleId,{remaining:number;health:number}>>};
export const spec=(id:VehicleId)=>CATALOG.find(v=>v.id===id)!;
export const starter=(kind:Career['vehicle']):VehicleId=>kind==='petrol'?'starter-petrol':'starter-electric';
export function fleet(c:Career):Fleet{const active=c.fleet?.active??starter(c.vehicle);return {active,owned:{...c.fleet?.owned,[active]:{remaining:c.remaining,health:c.health??100}}}}
export function validFleet(f:any,kind:Career['vehicle']):boolean{return !!f&&!!f.owned&&typeof f.owned==='object'&&!Array.isArray(f.owned)&&CATALOG.some(v=>v.id===f.active&&v.kind===kind)&&!!f.owned[f.active]&&Object.entries(f.owned).every(([id,value])=>{const v=CATALOG.find(x=>x.id===id),p=value as any;return !!v&&!!p&&Number.isFinite(p.remaining)&&p.remaining>=0&&p.remaining<=(v.kind==='petrol'?4:100)&&Number.isFinite(p.health)&&p.health>=0&&p.health<=100})}
export function buyVehicle(c:Career,id:VehicleId):Career{const v=spec(id),f=fleet(c);if(!v||f.owned[id]||c.level<v.level||c.income.wallet<v.price||c.stage!=='done')return c;return {...c,fleet:{...f,owned:{...f.owned,[id]:{remaining:v.kind==='petrol'?4:100,health:100}}},income:{...c.income,wallet:c.income.wallet-v.price},ledger:v.price?[...c.ledger,{id:'VEHICLE-'+id,amount:v.price,at:new Date().toISOString(),direction:'expense'}]:c.ledger}}
export function selectVehicle(c:Career,id:VehicleId):Career{const f=fleet(c),p=f.owned[id];if(!p||c.stage!=='done')return c;return {...c,vehicle:spec(id).kind,remaining:p.remaining,health:p.health,fleet:{...f,active:id}}}
