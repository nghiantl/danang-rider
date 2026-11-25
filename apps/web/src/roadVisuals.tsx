import React,{useEffect,useMemo} from 'react';
import * as THREE from 'three';
export function roadTextures(){
 let seed=613;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const make=(paving:boolean)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;const data=ctx.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;const grout=paving&&(y%32<2||(x+(Math.floor(y/32)%2)*32)%64<2);const v=grout?75:paving?145+rand()*24:68+rand()*35;data.data[i]=v;data.data[i+1]=v+(paving?0:2);data.data[i+2]=v+(paving?-8:4);data.data[i+3]=255}ctx.putImageData(data,0,0);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=2;return t};
 return {asphalt:make(false),paving:make(true)};
}
export function useRoadTextures(){const textures=useMemo(roadTextures,[]);useEffect(()=>()=>{textures.asphalt.dispose();textures.paving.dispose()},[textures]);return textures}
export type Surface={x:number;z:number;y:number;w:number;d:number;a?:number};
export function RoadSurface({items,texture,tile=4}:{items:Surface[];texture:THREE.Texture;tile?:number}){
 const geometry=useMemo(()=>{const positions:number[]=[],uv:number[]=[],indices:number[]=[];for(const p of items){const c=Math.cos(p.a??0),s=Math.sin(p.a??0),i=positions.length/3;for(const [x,z] of [[-p.w/2,-p.d/2],[-p.w/2,p.d/2],[p.w/2,p.d/2],[p.w/2,-p.d/2]]){const wx=p.x+x*c+z*s,wz=p.z-x*s+z*c;positions.push(wx,p.y,wz);uv.push(wx/tile,wz/tile)}indices.push(i,i+1,i+2,i,i+2,i+3)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();return g},[items,tile]);useEffect(()=>()=>geometry.dispose(),[geometry]);return items.length?<mesh geometry={geometry} receiveShadow><meshStandardMaterial map={texture} roughness={.96} metalness={0}/></mesh>:null
}
