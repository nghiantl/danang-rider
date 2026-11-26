export const graphics={tier:2,fps:60,drawCalls:0,triangles:0,renderer:'unknown'};
export const budgets=[{dpr:.65,lights:2,rain:200},{dpr:.85,lights:4,rain:400},{dpr:1,lights:6,rain:700}] as const;

export function nextQuality(tier:number,good:number,fps:number){if(fps<32)return {tier:Math.max(0,tier-1),good:0};if(fps>55){good++;if(good>=5)return {tier:Math.min(2,tier+1),good:0};return {tier,good}}return {tier,good:0}}
export function pointGrid<T extends {x:number;z:number}>(points:T[],size=100){const cells=new Map<string,T[]>();for(const p of points){const k=Math.floor(p.x/size)+':'+Math.floor(p.z/size);const a=cells.get(k)??[];a.push(p);cells.set(k,a)}return (x:number,z:number,r:number)=>{const out:T[]=[];for(let i=Math.floor((x-r)/size);i<=Math.floor((x+r)/size);i++)for(let j=Math.floor((z-r)/size);j<=Math.floor((z+r)/size);j++)for(const p of cells.get(i+':'+j)??[])if((p.x-x)**2+(p.z-z)**2<r*r)out.push(p);return out}}
