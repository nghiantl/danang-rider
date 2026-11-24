export type VehicleCollider={x:number;z:number;heading:number;halfWidth:number;halfLength:number};
export function penetration(x:number,z:number,r:number,v:VehicleCollider){
 const dx=x-v.x,dz=z-v.z,c=Math.cos(v.heading),s=Math.sin(v.heading);
 const u=Math.abs(dx*c-dz*s)-v.halfWidth,w=Math.abs(dx*s+dz*c)-v.halfLength;
 return r-(Math.hypot(Math.max(u,0),Math.max(w,0))+Math.min(Math.max(u,w),0));
}
export function blocksVehicleMove(x:number,z:number,nx:number,nz:number,r:number,vehicles:VehicleCollider[]){
 return vehicles.some(v=>{const after=penetration(nx,nz,r,v);return after>0&&after>=Math.max(0,penetration(x,z,r,v))-1e-7});
}
export function vehicleCollider(x:number,z:number,heading:number,kind:number):VehicleCollider{
 return {x,z,heading,halfWidth:kind===1?0.825:0.24,halfLength:kind===1?1.8:0.825};
}
