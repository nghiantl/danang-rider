import {useEffect,useMemo,useState} from 'react';
import type {Checkpoint} from './policeCheckpoints';
import type {Point,Road} from './osm';
import {buildGraph,findRoute,progress,type Route} from './navigation';
const fallback:Road[]=[-180,-20,140].flatMap(v=>[{name:'Đường mô phỏng',width:22,points:[-180,-100,-20,80,140,180].map(z=>({x:v,z}))},{name:'Đường mô phỏng',width:22,points:[-180,-100,-20,80,140,180].map(x=>({x,z:v}))}]);
export function GPS({roads,position,heading,target,done,police=[]}:{police?:Checkpoint[];roads?:Road[];position:Point;heading:number;target:Point;done:boolean}){
 const [selected,setSelected]=useState<number|null>(null);
 const checkpoint=selected===null?undefined:police[selected];
 const destination=checkpoint?.junction??target,finished=done&&!checkpoint;
 const network=roads||fallback;
 const graph=useMemo(()=>buildGraph(network),[network]);
 const [route,setRoute]=useState<Route|null>(null);
 const [last,setLast]=useState<Point|null>(null);
 const p=route?progress(route,position):null;
 useEffect(()=>{setRoute(finished?null:findRoute(graph,position,destination));setLast(position)},[graph,destination.x,destination.z,finished]);
 useEffect(()=>{if(finished||!last)return;if((!p||p.off>25)&&Math.hypot(position.x-last.x,position.z-last.z)>20){setRoute(findRoute(graph,position,destination));setLast(position)}},[position.x,position.z,finished,graph,destination.x,destination.z,p?.off,last]);
 const scale=0.65,xy=(q:Point)=>[80+(q.x-position.x)*scale,80+(q.z-position.z)*scale];
 const path=(pts:Point[])=>pts.map(q=>xy(q).join(',')).join(' ');
 const visible=network.filter(r=>r.points.some(q=>Math.abs(q.x-position.x)<300&&Math.abs(q.z-position.z)<300));
 const [tx,tz]=xy(destination);
 return <aside className="gps-panel" aria-label="GPS trong game">
 <svg viewBox="0 0 160 160" className="gps-map"><rect width="160" height="160" fill="#233b38"/>
 {visible.map((r,i)=><polyline key={i} points={path(r.points)} fill="none" stroke="#81908e" strokeWidth={Math.max(2,r.width*scale)} strokeLinejoin="round"/>)}
 {!finished&&route&&<polyline points={path(route.points.slice(p?.index||0))} fill="none" stroke="#4ce4c3" strokeWidth="3.5" strokeLinejoin="round"/>}
 {!finished&&<circle cx={Math.max(7,Math.min(153,tx))} cy={Math.max(7,Math.min(153,tz))} r="5" fill="#ffd45a" stroke="#fff"/>}
 {police.map((c,i)=>{const [x,z]=xy(c.officer),dx=x-80,dz=z-80,k=Math.min(1,69/Math.max(1,Math.abs(dx),Math.abs(dz)));return <g key={i} transform={`translate(${80+dx*k} ${80+dz*k})`} onClick={()=>setSelected(i)} role="button" aria-label={`Chốt CSGT ${i+1}`} style={{cursor:'pointer'}}><circle r="8" fill={selected===i?'#ffd45a':'#2563eb'} stroke="white"/><text y="3" textAnchor="middle" fontSize="9" fill={selected===i?'#111':'white'}>{i+1}</text></g>})}
 <g transform={`translate(80 80) rotate(${-heading*180/Math.PI})`}><path d="M0 -9 L6 7 L0 4 L-6 7Z" fill="#fff" stroke="#087f79" strokeWidth="1.5"/></g><text x="8" y="14" fill="white" fontSize="10">B</text></svg>
 <div className="gps-instruction"><b>{finished?'✓ Hoàn thành':p?p.off>25?'Đang tìm lại đường':p.instruction:'Chưa tìm được tuyến'}</b><span>{!finished&&p?Math.round(p.turnDistance)+' m · '+p.name:''}</span><span>{!finished&&p?'Còn '+Math.round(p.remaining)+' m theo đường':''}</span><small>© OpenStreetMap contributors</small><label style={{fontSize:11}}>CSGT: {police.length} chốt<select aria-label="Chọn chốt CSGT" style={{width:'100%',fontSize:12}} value={checkpoint?String(selected):''} onChange={e=>setSelected(e.target.value===''?null:Number(e.target.value))}><option value="">GPS giao hàng</option>{police.map((c,i)=><option key={i} value={i}>Chốt {i+1} · {Math.round(Math.hypot(c.officer.x-position.x,c.officer.z-position.z))}m</option>)}</select></label>{checkpoint&&<small>Đang dẫn đến chốt {Number(selected)+1} · {Math.round(Math.hypot(checkpoint.officer.x-position.x,checkpoint.officer.z-position.z))}m (đường chim bay)</small>}{!police.length&&<small>Không có chốt phù hợp trên bản đồ này.</small>}</div></aside>;
}
