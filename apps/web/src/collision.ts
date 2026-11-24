import {blocksVehicleMove,type VehicleCollider} from './vehicleCollision.ts';
// Sprint 1.1: lightweight 2D collision for static buildings.
// Coordinates are in game-world metres; building footprints are 14 x 14.
export const BUILDING_HALF_SIZE = 7;
export const RIDER_RADIUS = 1.15;
export const WORLD_LIMIT = 185;

export function getBuildings() {
  const buildings = [];
  for (let x = -160; x <= 160; x += 40) {
    for (let z = -160; z <= 160; z += 40) {
      if (Math.abs(x) < 20 || Math.abs(z) < 20 || (x === 80 && z === 80)) continue;
      buildings.push({ x, z, index: buildings.length });
    }
  }
  return buildings;
}
export const BUILDINGS = getBuildings();

export type Obstacle = { x:number; z:number; halfX:number; halfZ:number; outline?: {x:number;z:number}[] };
export function collidesWithBuildings(x: number, z: number, radius: number = RIDER_RADIUS, obstacles?: Obstacle[]) {
  const candidates: Obstacle[] = obstacles ?? BUILDINGS.map(v=>({...v,halfX:BUILDING_HALF_SIZE,halfZ:BUILDING_HALF_SIZE}));
  for (const b of candidates) {
    const nearestX = Math.max(b.x - b.halfX, Math.min(x, b.x + b.halfX));
    const nearestZ = Math.max(b.z - b.halfZ, Math.min(z, b.z + b.halfZ));
    if ((x - nearestX) ** 2 + (z - nearestZ) ** 2 >= radius ** 2) continue;
    const polygon=b.outline;
    if(!polygon || polygon.length<3) return true;
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[j],c=polygon[i],dx=c.x-a.x,dz=c.z-a.z;
      const len=dx*dx+dz*dz;
      const t=len?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/len)):0;
      if((x-a.x-t*dx)**2+(z-a.z-t*dz)**2<radius**2)return true;
      if((a.z>z)!==(c.z>z)&&x<(c.x-a.x)*(z-a.z)/(c.z-a.z)+a.x)inside=!inside;
    }
    if(inside)return true;
  }
  return false;
}

// Move in small increments to avoid tunnelling at high speed.
// Resolve each axis independently to allow natural wall sliding.
export function moveWithBuildingCollision(x: number, z: number, dx: number, dz: number, radius: number = RIDER_RADIUS, obstacles?: Obstacle[], worldLimit: number = WORLD_LIMIT, vehicles:VehicleCollider[] = []) {
  let nextX = x;
  let nextZ = z;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.max(radius * 0.25, 0.1)));
  const stepX = dx / steps;
  const stepZ = dz / steps;
  let blocked = false;
  for (let i = 0; i < steps; i++) {
    if(stepX!==0){
    const candidateX = Math.max(-worldLimit, Math.min(worldLimit, nextX + stepX));
    if(candidateX!==nextX+stepX)blocked=true;
    if (!collidesWithBuildings(candidateX, nextZ, radius, obstacles) && !blocksVehicleMove(nextX,nextZ,candidateX,nextZ,radius,vehicles)) nextX = candidateX;
    else blocked = true;
    }
    if(stepZ!==0){
    const candidateZ = Math.max(-worldLimit, Math.min(worldLimit, nextZ + stepZ));
    if(candidateZ!==nextZ+stepZ)blocked=true;
    if (!collidesWithBuildings(nextX, candidateZ, radius, obstacles) && !blocksVehicleMove(nextX,nextZ,nextX,candidateZ,radius,vehicles)) nextZ = candidateZ;
    else blocked = true;
    }
  }
  return { x: nextX, z: nextZ, blocked };
}
