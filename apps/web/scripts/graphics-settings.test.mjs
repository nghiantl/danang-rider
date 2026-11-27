import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=n=>readFileSync(new URL('../src/'+n,import.meta.url),'utf8');
test('graphics settings isolated from career storage',()=>{assert.match(source('GraphicsSettings.tsx'),/rider-graphics-v1/);assert.match(source('GraphicsSettings.tsx'),/mode:'auto'/)});
test('both menus expose graphics settings',()=>assert.equal((source('main.tsx').match(/<GraphicsSettings\/>/g)||[]).length,2));
test('manual render loop preserves simulation callbacks',()=>{assert.match(source('main.tsx'),/gl\.render\(state\.scene,state\.camera\)/);assert.match(source('main.tsx'),/\},1\);return null/)});
test('density limits clear disabled entities',()=>{assert.match(source('Traffic.tsx'),/delete cars\.current\[i\]/);assert.match(source('Pedestrians.tsx'),/walkers\.current\[i\]=null/)});
test('independent quality settings connected',()=>{for(const [file,key] of [['Vegetation.tsx','vegetation'],['LandmarkWater.tsx','water'],['cityDetail.tsx','buildings'],['Environment.tsx','shadowSize']])assert.ok(source(file).includes('settings.'+key))});
