import { createServer } from 'node:http';
const PORT = Number(process.env.PORT || 3001);
const send = (res, status, data) => {res.writeHead(status, {'content-type':'application/json; charset=utf-8','access-control-allow-origin':process.env.CORS_ORIGIN || 'http://localhost:5173'});res.end(JSON.stringify(data));};
const server=createServer((req,res)=>{
 if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':process.env.CORS_ORIGIN || 'http://localhost:5173','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'content-type'});res.end();return;}
 if(req.url==='/health')return send(res,200,{status:'ok',service:'danang-rider-api',sprint:1});
 if(req.url==='/api/config')return send(res,200,{map:'procedural-demo',vehicles:{petrol:{litersPer30km:1,tankLiters:4},electric:{rangeKm:200}},missionReward:18000});
 send(res,404,{error:'Not found'});
});
server.listen(PORT,()=>console.log(`API http://localhost:${PORT}`));