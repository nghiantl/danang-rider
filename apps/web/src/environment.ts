export type Weather={temperature:number;code:number;cloud:number;rain:number;fog:number;label:string;fetchedAt:number};
export const WEATHER_URL='https://api.open-meteo.com/v1/forecast?latitude=16.0678&longitude=108.2208&current=temperature_2m,weather_code,cloud_cover,precipitation&timezone=Asia%2FHo_Chi_Minh';
export const REFRESH_MS=15*60*1000;
export const CACHE_KEY='danang-rider-weather-v1';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function parseWeather(data:unknown,now=Date.now()):Weather{
 const c=(data as {current?:Record<string,unknown>}|null)?.current;
 if(!c)throw new Error('Missing current weather');
 const {temperature_2m:t,weather_code:code,cloud_cover:cloud,precipitation:rain}=c;
 if(typeof t!=='number'||!Number.isFinite(t)||typeof code!=='number'||!Number.isInteger(code)||typeof cloud!=='number'||!Number.isFinite(cloud)||typeof rain!=='number'||!Number.isFinite(rain))throw new Error('Invalid weather');
 const fog=code===45||code===48;
 const storm=code>=95&&code<=99;
 const rainy=(code>=51&&code<=67)||(code>=80&&code<=82)||storm||rain>0;
 const heavy=[65,67,82].includes(code)||storm||rain>=2;
 return {temperature:t,code,cloud:clamp(Math.max(cloud/100,rainy?0.65:0)),rain:rainy?(heavy?1:0.45):0,fog:fog?0.8:0,label:storm?'⛈️ Giông':rainy?(heavy?'🌧️ Mưa lớn':'🌦️ Mưa nhẹ'):fog?'🌫️ Sương mù':code===0?'☀️ Trời quang':code===1||code===2?'⛅ Ít mây':code===3?'☁️ Nhiều mây':'☁️ Có mây',fetchedAt:now};
}
export function validCache(v:unknown):v is Weather{
 if(!v||typeof v!=='object')return false;
 const w=v as Weather;
 return [w.temperature,w.code,w.cloud,w.rain,w.fog,w.fetchedAt].every(Number.isFinite)&&typeof w.label==='string'&&w.cloud>=0&&w.cloud<=1&&w.rain>=0&&w.rain<=1&&w.fog>=0&&w.fog<=1;
}
export function environmentAt(date:Date){
 const hour=date.getHours()+date.getMinutes()/60+date.getSeconds()/3600;
 const daylight=clamp(Math.min((hour-5)/2,(19-hour)/2));
 const twilight=Math.max(0,1-Math.min(Math.abs(hour-6),Math.abs(hour-18))/2);
 return {hour,daylight,twilight,night:daylight<0.35};
}
export function clockLabel(date:Date){return [date.getHours(),date.getMinutes()].map(n=>String(n).padStart(2,'0')).join(':')}
export function weatherLabel(w:Weather|null,failed:boolean,now=Date.now()){
 if(!w)return failed?'Ngoại tuyến · Chưa có thời tiết':'Đang tải thời tiết…';
 return Math.round(w.temperature)+'°C · '+w.label+(failed||now-w.fetchedAt>REFRESH_MS*2?' · Dữ liệu cũ':'');
}
