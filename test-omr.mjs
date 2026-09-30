import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {writeFileSync,mkdirSync} from 'node:fs';
import {jsPDF} from 'jspdf';
import jsQR from 'jsqr';
import {sheet,testAnswers} from './sheet.js';
import {readSheet} from './reader.js';
import {W,H,MARKERS,bubble,detectMarkers,homography,map} from './engine.js';
globalThis.document={createElement:()=>createCanvas(1,1)};
const config={organization:'Secretaria Municipal de Educação',subtitle:'Teste de leitura óptica',count:60};
const marks=testAnswers(60),c=await sheet(config,marks),ctx=c.getContext('2d');
const original=ctx.getImageData(0,0,W,H),qr=jsQR(original.data,W,H);assert(qr);assert.deepEqual(JSON.parse(qr.data),{model:'GO2',n:60,c:4});
assert.deepEqual(readSheet(original,detectMarkers(original)).answers,marks);
// Change only pixels, keeping the QR unchanged: no answer can come from hidden metadata.
marks[0]='D';marks[1]='';marks[2]='AC';const altered=await sheet(config,marks),ac=altered.getContext('2d'),[fx,fy]=bubble(3,0);ac.fillStyle='#000';ac.fillRect(fx-7,fy-7,5,14);
const source=ac.getImageData(0,0,W,H),result=readSheet(source,detectMarkers(source));assert.equal(result.answers[0],'D');assert.equal(result.answers[1],'BRANCO');assert.equal(result.answers[2],'MULTIPLA');assert.equal(result.answers[3],'REVISAR');for(let i=4;i<60;i++)assert.equal(result.answers[i],marks[i]);
const corners=[[100,100],[1180,160],[1140,1700],[75,1660]],inverse=homography(corners,MARKERS),photo=new Uint8ClampedArray(W*H*4);photo.fill(255);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const[u,v]=map(inverse,x,y),ix=Math.round(u),iy=Math.round(v);if(ix>=0&&ix<W&&iy>=0&&iy<H){const a=(iy*W+ix)*4,b=(y*W+x)*4;photo[b]=source.data[a];photo[b+1]=source.data[a+1];photo[b+2]=source.data[a+2];}}
const pixels={data:photo,width:W,height:H};assert.deepEqual(readSheet(pixels,detectMarkers(pixels)).answers,result.answers);
// No prior state: a one-question sheet is recognized from its own QR geometry.
const single=await sheet({count:1},['C']),singlePixels=single.getContext('2d').getImageData(0,0,W,H);assert.deepEqual(readSheet(singlePixels,detectMarkers(singlePixels)).answers,['C']);
mkdirSync('tmp',{recursive:true});writeFileSync('tmp/folha-preenchida.png',c.toBuffer('image/png'));const pdf=new jsPDF({unit:'mm',format:'a4'});pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,210,297);pdf.addPage();pdf.addImage(altered.toDataURL('image/png'),'PNG',0,0,210,297);writeFileSync('tmp/cartoes-teste.pdf',Buffer.from(pdf.output('arraybuffer')));
console.log('PASS: 1–60 questões; ABCD; QR sem respostas; alterações nos pixels; branco; múltipla; duvidosa; perspectiva; PDF.');
