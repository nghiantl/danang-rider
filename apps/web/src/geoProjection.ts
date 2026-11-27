const CENTER_LAT = 16.0678;
const CENTER_LON = 108.2208;
const LAT_METERS = 111320;
const LON_METERS = Math.cos(CENTER_LAT * Math.PI / 180) * LAT_METERS;
export function project(lat: number, lon: number): {x:number;z:number} {
  return { x: (lon - CENTER_LON) * LON_METERS, z: -(lat - CENTER_LAT) * LAT_METERS };
}
