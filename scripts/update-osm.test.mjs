import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOsmXml,validateSnapshot,mergeSnapshots,tiles} from './update-osm.mjs';
test('official OSM XML nodes and ways become game-compatible geometry',()=>{
  const nodes=Array.from({length:8},(_,i)=>'<node id="'+(i+1)+'" lat="16.067'+i+'" lon="108.220'+i+'"/>').join('');
  const ways=Array.from({length:3},(_,i)=>'<way id="'+(i+10)+'"><nd ref="'+(i+1)+'"/><nd ref="'+(i+2)+'"/><tag k="highway" v="residential"/><tag k="name" v="Đường &amp; phố"/></way>').join('');
  const building='<way id="30"><nd ref="4"/><nd ref="5"/><nd ref="6"/><tag k="building" v="yes"/><tag k="building:levels" v="3"/></way>';
  const parsed=parseOsmXml('<osm version="0.6">'+nodes+ways+building+'</osm>');
  assert.deepEqual(validateSnapshot(parsed),{roads:3,buildings:1});
  assert.equal(parsed.elements[0].tags.name,'Đường & phố');
  assert.equal(parsed.elements[3].geometry.length,3);
});
test('rejects incomplete or non-road snapshots',()=>assert.throws(()=>validateSnapshot(parseOsmXml('<osm/>')),/Insufficient/));

test('six extracts merge duplicate way IDs',()=>{const a={type:'way',id:'1',geometry:[],tags:{highway:'primary'}},b={...a,id:'2'};assert.equal(tiles.length,6);assert.deepEqual(mergeSnapshots([{elements:[a]},{elements:[a,b]}]).elements,[a,b])});
