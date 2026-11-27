import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {environmentAt,weatherVisual} from './environment';
export function LandmarkWater({geometry,sea=false}:{geometry:THREE.BufferGeometry;sea?:boolean}){
 const material=useRef<THREE.ShaderMaterial>(null);
 const uniforms=useRef({time:{value:0},day:{value:1},rain:{value:0},sea:{value:sea?1:0}});
 useFrame(({clock})=>{uniforms.current.time.value=clock.elapsedTime;uniforms.current.day.value=environmentAt(new Date()).daylight;uniforms.current.rain.value=weatherVisual.rain});
 return <mesh geometry={geometry}><shaderMaterial ref={material} uniforms={uniforms.current} vertexShader={`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`varying vec3 p;uniform float time,day,rain,sea;void main(){float a=sin(p.x*.21+p.z*.13-time*1.4);float b=sin(p.z*.36-p.x*.08+time*.9);float ripple=pow(max(0.,a*b),5.);vec3 base=mix(vec3(.045,.24,.34),vec3(.04,.38,.48),sea);vec3 c=base*(.27+.73*day)*(1.-rain*.18)+vec3(.23,.32,.35)*ripple*(.25+.75*day);gl_FragColor=vec4(c,1.);}`}/></mesh>
}
