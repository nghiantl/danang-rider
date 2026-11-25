import type {Point,Road} from '../osm';
import {lanesFor,signalsFor,stopPosition,light} from '../traffic';
import type {Career} from './save';
export const FINES={speed:10000,red:20000,wrong:15000,vehicle:15000,pedestrian:30000} as const;
export type Violation=keyof typeof FINES;
export const LABELS:Record<Violation,string>={speed:'Quá tốc độ',red:'Vượt đèn đỏ',wrong:'Đi ngược chiều',vehicle:'Va chạm phương tiện',pedestrian:'Va chạm người đi bộ'};
export function fine(c:Career,kind:Violation,id:string):Career{if(c.ledger.some(t=>t.id===id))return c;const amount=Math.min(c.income.wallet,FINES[kind]);return {...c,income:{...c.income,wallet:c.income.wallet-amount},ledger:[...c.ledger,{id,amount,at:new Date().toISOString(),direction:'expense'}]}}
export function trafficMonitor(roads:Road[]){
 const lanes=lanesFor(roads),signals=signalsFor(lanes);
 const grid=new Map<string,number[]>(),size=50;
 lanes.forEach((l,i)=>{for(let x=Math.floor((Math.min(l.a.x,l.b.x)-l.width)/size);x<=Math.floor((Math.max(l.a.x,l.b.x)+l.width)/size);x++)for(let z=Math.floor((Math.min(l.a.z,l.b.z)-l.width)/size);z<=Math.floor((Math.max(l.a.z,l.b.z)+l.width)/size);z++){const k=x+':'+z;const a=grid.get(k)??[];a.push(i);grid.set(k,a)}});
 const stops=lanes.map((l,i)=>signals.has(l.b.x.toFixed(3)+':'+l.b.z.toFixed(3))?stopPosition({lane:i,t:0,speed:0,kind:0},l,lanes):null);
 let speeding=0,wrong=0;const active=new Set<Violation>();
 return (a:Point,b:Point,speed:number,time:number,dt:number):Violation[]=>{
 const result:Violation[]=[],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);let nearest=Infinity,aligned=false,road=false;
 for(const i of grid.get(Math.floor(b.x/size)+':'+Math.floor(b.z/size))??[]){const l=lanes[i],x=b.x-l.a.x,z=b.z-l.a.z,t=x*l.ux+z*l.uz,side=-x*l.uz+z*l.ux;if(t<0||t>l.length||Math.abs(side)>l.width/2)continue;road=true;const d=Math.abs(side-l.offset),dot=len?(dx*l.ux+dz*l.uz)/len:0;if(d<nearest-.3){nearest=d;aligned=dot>.5}else if(d<=nearest+.3&&dot>.5)aligned=true;
 const stop=stops[i],prev=(a.x-l.a.x)*l.ux+(a.z-l.a.z)*l.uz,s=signals.get(l.b.x.toFixed(3)+':'+l.b.z.toFixed(3));if(stop!==null&&s&&dot>.5&&prev<stop&&t>=stop&&side>=-.25&&light(s,Math.abs(l.ux)>Math.abs(l.uz)?0:1,time)==='red')result.push('red');
 }
 speeding=road&&speed>45?speeding+dt:0;wrong=road&&speed>10&&!aligned&&len>.01?wrong+dt:0;
 for(const [kind,duration] of [['speed',speeding],['wrong',wrong]] as const){if(duration>=2&&!active.has(kind)){active.add(kind);result.push(kind)}if(duration===0)active.delete(kind)}
 return [...new Set(result)];
 }
}
