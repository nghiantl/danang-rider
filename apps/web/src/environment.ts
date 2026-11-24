export type Weather='sunny'|'cloudy'|'rain';
export function environmentAt(seconds:number){
 const hour=(8+Math.max(0,seconds)/30)%24;
 const daylight=Math.max(0,Math.min(1,(hour-5)/2,(19-hour)/2));
 const twilight=Math.max(0,1-Math.min(Math.abs(hour-6),Math.abs(hour-18))/2);
 const weather:Weather=(['sunny','cloudy','rain','cloudy'] as const)[Math.floor(Math.max(0,seconds)/120)%4];
 return {hour,daylight,twilight,weather,night:daylight<0.35};
}
export function clockLabel(hour:number){const m=Math.floor(hour*60)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
