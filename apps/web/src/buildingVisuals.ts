import type {Footprint,Point} from './osm';
import type {Segment} from './world';
export type FacadeBox={x:number;y:number;z:number;w:number;h:number;d:number;a?:number;color:string};
export function facade(b:Footprint,index:number,roads:Segment[]):{boxes:FacadeBox[];windows:FacadeBox[]}{
 const boxes:FacadeBox[]=[],windows:FacadeBox[]=[];
 const pts:Point[]=b.outline&&b.outline.length>=3?b.outline:[{x:b.x-b.halfX,z:b.z-b.halfZ},{x:b.x+b.halfX,z:b.z-b.halfZ},{x:b.x+b.halfX,z:b.z+b.halfZ},{x:b.x-b.halfX,z:b.z+b.halfZ}];
 const area=pts.reduce((s,p,i)=>{const q=pts[(i+1)%pts.length];return s+p.x*q.z-q.x*p.z},0);
 const edges=pts.map((p,i)=>{const q=pts[(i+1)%pts.length],dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz),ux=dx/Math.max(len,.001),uz=dz/Math.max(len,.001),nx=uz*Math.sign(area),nz=-ux*Math.sign(area),x=(p.x+q.x)/2,z=(p.z+q.z)/2;let score=Infinity;for(const r of roads){const c=Math.cos(r.angle),s=Math.sin(r.angle),t=Math.max(-r.length/2,Math.min(r.length/2,(x-r.x)*c+(z-r.z)*s)),rx=r.x+t*c-x,rz=r.z+t*s-z;if(rx*nx+rz*nz>0)score=Math.min(score,Math.hypot(rx,rz)-r.width/2)}return {len,ux,uz,nx,nz,x,z,score,a:-Math.atan2(dz,dx)}});
 const front=edges.filter(e=>e.len>=3).sort((a,b)=>a.score-b.score)[0];
 for(const e of edges){if(e.len<2.2||b.height<2.4)continue;const add=(u:number,y:number,w:number,h:number,d:number,color:string,out=.035,lit=false)=>{if(y-h/2<0||y+h/2>b.height+.01)return;(lit?windows:boxes).push({x:e.x+e.ux*u+e.nx*out,z:e.z+e.uz*u+e.nz*out,y,w,h,d,a:e.a,color})};
 const n=Math.min(8,Math.max(1,Math.floor(e.len/2.8))),step=e.len/n,trim=['#eee5d6','#d8d5c9','#a9b5b5'][index%3];
 for(let y=4.5;y+1<b.height;y+=3.2){for(let j=0;j<n;j++){const u=(j+.5)*step-e.len/2,w=Math.min(1.55,step*.68);add(u,y,w+.16,1.48,.09,trim);add(u,y,w,1.28,.06,(index+j+Math.round(y))%4===0?'#c5a66d':'#45616e',.10,true);add(u,y,.055,1.28,.035,trim,.15);add(u,y-.72,w+.23,.10,.16,trim,.10)}if(e===front&&index%3===0){const w=e.len*.72;add(0,y-.92,w,.13,.28,trim,.14);add(0,y-.45,w,.08,.06,'#59656a',.26);for(let j=0;j<=Math.min(8,n*2);j++){const count=Math.min(8,n*2);add((j/count-.5)*w,y-.68,.055,.48,.055,'#59656a',.26)}}}
 if(e===front){const w=Math.min(e.len*.8,5.5),shop=!!b.name||index%3===0;add(0,1.25,w,2.35,.10,shop?'#68777b':'#64554b');if(shop){if(index%2===0){for(let y=.25;y<2.4;y+=.23)add(0,y,w,.035,.035,'#9ba4a5',.105)}else{add(0,1.25,w*.88,2.1,.06,'#557680',.11,true);add(0,1.25,.09,2.1,.06,trim,.16)}add(0,2.65,w,.26,.16,['#a34e42','#427b72','#aa813d'][index%3],.10)}else{add(0,1.15,.08,2,.04,trim,.12)}}
 add(0,b.height-.13,e.len*.98,.20,.13,trim,.055);
 }
 return {boxes,windows};
}
