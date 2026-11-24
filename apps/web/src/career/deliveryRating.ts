import type {Order} from '../orders';
export type DeliveryRun={id:string;deadline:number;condition:number};
export type DeliveryResult={id:string;stars:number;late:boolean;condition:number;tip:number;bonusXP:number};
export const startRun=(o:Order,now=Date.now()):DeliveryRun=>({id:o.id,deadline:now+(o.minutes??5)*60000,condition:100});
export function damage(run:DeliveryRun,strength:number,fragile:boolean):DeliveryRun{return {...run,condition:Math.max(0,run.condition-Math.ceil(Math.max(0,Math.min(1,strength))*(fragile?25:12)))}}
export function evaluate(o:Order,run:DeliveryRun,now=Date.now()):DeliveryResult{const late=now>run.deadline;const stars=Math.max(1,5-(late?2:0)-Math.floor((100-run.condition)/25));return {id:o.id,stars,late,condition:run.condition,tip:stars===5?Math.round(o.fare*.1):stars===4?Math.round(o.fare*.05):0,bonusXP:late?0:20}}
export const average=(ratings:DeliveryResult[])=>ratings.length?ratings.reduce((s,r)=>s+r.stars,0)/ratings.length:0;
export const vipEligible=(ratings:DeliveryResult[])=>ratings.length>=5&&average(ratings)>=4.5;
