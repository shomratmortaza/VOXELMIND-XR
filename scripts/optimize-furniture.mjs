import fs from 'node:fs/promises';
import path from 'node:path';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,weld,simplify,meshopt,textureCompress,getBounds} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder,MeshoptSimplifier} from 'meshoptimizer';
import sharp from 'sharp';
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready,MeshoptSimplifier.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const root=path.resolve('src/assets/furniture');
await fs.mkdir('/tmp/model-pipeline',{recursive:true});
const active=['dining_table','dining-chair-lite','desk-correct','sofa-real','plant-correct-vr','shelf-correct','bench','street-light','tree-vr-lite','parked-car','coffee-station','bar-stool','bed','cabinet','bookshelf','microwave'];
const count=d=>d.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION')?.getCount()??0)/3,0),0);
const report=[];
for(const name of active){
 const pointer=JSON.parse(await fs.readFile(path.join(root,name+'.asset.json'),'utf8'));
 const response=await fetch('http://localhost:8080'+pointer.url);if(!response.ok)throw Error(name+' download '+response.status);
 const data=new Uint8Array(await response.arrayBuffer());await fs.writeFile('/tmp/model-pipeline/'+name+'-source.glb',data);
 const original=await io.readBinary(data),bounds=getBounds(original.getRoot().listScenes()[0]),triangles=count(original);
 for(const [tier,ratio] of [['full',1],['lod',0.3]]){
  const doc=await io.readBinary(data);
  await doc.transform(dedup(),weld());
  if(ratio<1&&triangles>1000)await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio,error:0.002,lockBorder:true}));
  await doc.transform(textureCompress({encoder:sharp,targetFormat:'webp',resize:tier==='full'?[1024,1024]:[512,512],quality:85}),meshopt({encoder:MeshoptEncoder,level:'medium'}));
  const output=await io.writeBinary(doc);const check=await io.readBinary(output);const after=getBounds(check.getRoot().listScenes()[0]);
  if(![...after.min,...after.max].every(Number.isFinite)||count(check)<=0)throw Error(name+' invalid geometry');
  const extent=bounds.max.map((v,i)=>v-bounds.min[i]);const drift=Math.max(...after.min.map((v,i)=>Math.abs(v-bounds.min[i])/Math.max(extent[i],0.01)),...after.max.map((v,i)=>Math.abs(v-bounds.max[i])/Math.max(extent[i],0.01)));
  if(drift>0.06)throw Error(name+' excessive bounds drift '+drift);
  await fs.writeFile('/tmp/model-pipeline/'+name+'-'+tier+'.glb',output);
  report.push({name,tier,sourceBytes:data.length,outputBytes:output.length,sourceTriangles:triangles,triangles:count(check),boundsDrift:drift,extensions:check.getRoot().listExtensionsUsed().map(e=>e.extensionName)});
 }
 console.log('Processed',name,report.slice(-2).map(r=>[r.tier,r.outputBytes,r.triangles]));
 await fs.writeFile('/tmp/model-pipeline/report.json',JSON.stringify(report,null,2));
}
