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

export function collidesWithBuildings(x, z, radius = RIDER_RADIUS) {
  for (const b of BUILDINGS) {
    const nearestX = Math.max(b.x - BUILDING_HALF_SIZE, Math.min(x, b.x + BUILDING_HALF_SIZE));
    const nearestZ = Math.max(b.z - BUILDING_HALF_SIZE, Math.min(z, b.z + BUILDING_HALF_SIZE));
    if ((x - nearestX) ** 2 + (z - nearestZ) ** 2 < radius ** 2) return true;
  }
  return false;
}

// Move in small increments to avoid tunnelling at high speed.
// Resolve each axis independently to allow natural wall sliding.
export function moveWithBuildingCollision(x, z, dx, dz, radius = RIDER_RADIUS) {
  let nextX = x;
  let nextZ = z;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / Math.max(radius * 0.5, 0.1)));
  const stepX = dx / steps;
  const stepZ = dz / steps;
  let blocked = false;
  for (let i = 0; i < steps; i++) {
    const candidateX = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, nextX + stepX));
    if (!collidesWithBuildings(candidateX, nextZ, radius)) nextX = candidateX;
    else blocked = true;
    const candidateZ = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, nextZ + stepZ));
    if (!collidesWithBuildings(nextX, candidateZ, radius)) nextZ = candidateZ;
    else blocked = true;
  }
  return { x: nextX, z: nextZ, blocked };
}
