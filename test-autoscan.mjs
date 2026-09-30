import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {sheet,testAnswers} from './sheet.js';
import {W,H,MARKERS,homography,map} from './engine.js';
import {detectCandidates,locateSheet,PAGE} from './scanner.js';
import {readAutomatic} from './reader.js';
import {stabilityStep} from './camera.js';
import {writeFileSync,mkdirSync} from 'node:fs';
import QRCode from 'qrcode';
globalThis.document={createElement:()=>createCanvas(1,1)};
mkdirSync('tmp',{recursive:true});const answers=testAnswers(40),base=await sheet({count:40,student:{id:'a'.repeat(32),school:'Escola Municipal de Teste',name:'Aluno de Teste',grade:'5º ano',classroom:'A'}},answers),results=[];
function pixels(c){return c.getContext('2d').getImageData(0,0,c.width,c.height);}
function copy(){const c=createCanvas(W,H);c.getContext('2d').drawImage(base,0,0);return c;}
function check(name,c,expected='frame'){const start=performance.now(),r=readAutomatic(pixels(c));assert.deepEqual(r.answers,answers,name);if(expected)assert.equal(r.alignment,expected,name);assert.equal(r.studentId,'a'.repeat(32));results.push({name,ms:Math.round(performance.now()-start),alignment:r.alignment});}
const noMarkers=copy(),nc=noMarkers.getContext('2d');nc.fillStyle='white';for(const[x,y]of MARKERS)nc.fillRect(x-22,y-22,44,44);
check('Moldura sozinha: quatro quadrados apagados',noMarkers);
function project(c,corners,width=1600,height=2100){const src=pixels(c),out=createCanvas(width,height),ctx=out.getContext('2d');ctx.fillStyle='#80766e';ctx.fillRect(0,0,width,height);const image=ctx.getImageData(0,0,width,height),inverse=homography(corners,PAGE);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const[u,v]=map(inverse,x,y),ix=Math.round(u),iy=Math.round(v);if(ix<0||ix>=W||iy<0||iy>=H)continue;const a=(iy*W+ix)*4,b=(y*width+x)*4;image.data[b]=src.data[a];image.data[b+1]=src.data[a+1];image.data[b+2]=src.data[a+2];}ctx.putImageData(image,0,0);return out;}
const perspectives=[[[180,120],[1420,260],[1310,1920],[80,1750]],[[430,200],[1460,500],[1220,1920],[180,1610]],[[80,400],[1150,100],[1480,1710],[350,1930]]];
for(let i=0;i<perspectives.length;i++){const c=project(noMarkers,perspectives[i]);check(`Perspectiva ${i+1}, sem quadrados`,c);if(i===1)writeFileSync('tmp/foto-perspectiva.png',c.toBuffer('image/png'));}
for(const degrees of [23,90,180,270]){const c=createCanvas(2300,2300),ctx=c.getContext('2d');ctx.fillStyle='#354048';ctx.fillRect(0,0,2300,2300);ctx.translate(1150,1150);ctx.rotate(degrees*Math.PI/180);ctx.drawImage(noMarkers,-W/2,-H/2);check(`Rotação ${degrees}°, sem quadrados`,c);}
const shadow=copy(),ctx=shadow.getContext('2d'),d=pixels(shadow);let seed=89;for(let y=0;y<H;y++)for(let x=0;x<W;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const f=.5+.5*x/W,n=(seed/2**32-.5)*15,i=(y*W+x)*4;for(let k=0;k<3;k++)d.data[i+k]=d.data[i+k]*f+n;}ctx.putImageData(d,0,0);check('Sombra e ruído',shadow);
const jpeg=createCanvas(W,H);jpeg.getContext('2d').drawImage(await loadImage(base.toBuffer('image/jpeg',50)),0,0);check('JPEG 50%',jpeg);
const small=createCanvas(840,1188);small.getContext('2d').drawImage(base,0,0,840,1188);check('Foto de 840px',small);
// Compatibility: the former GO3 dotted sheet uses exactly the old printed geometry.
const old=copy(),oc=old.getContext('2d');oc.strokeStyle='white';oc.lineWidth=14;oc.strokeRect(95,92,1070,1600);oc.strokeStyle='black';oc.lineWidth=2;oc.setLineDash([18,12]);oc.strokeRect(95,92,1070,1600);oc.setLineDash([]);const qr=await QRCode.toCanvas(createCanvas(1,1),JSON.stringify({model:'GO3',n:40,c:4,sid:'a'.repeat(32)}),{width:240,margin:2,errorCorrectionLevel:'M'});oc.drawImage(qr,910,107);check('Compatibilidade GO3',old,'markers');
const blank=createCanvas(W,H),bc=blank.getContext('2d');bc.fillStyle='white';bc.fillRect(0,0,W,H);bc.strokeStyle='black';bc.lineWidth=8;bc.strokeRect(95,92,1070,1600);assert.throws(()=>readAutomatic(pixels(blank)),/QR Code/);
const cropped=copy();cropped.getContext('2d').clearRect(85,80,1090,40);assert.throws(()=>readAutomatic(pixels(cropped)),/moldura|folha|QR Code/);
let stable=null;const found={ready:true,points:[[100,100],[500,100],[500,800],[100,800]]};for(const time of [0,500,1200])stable=stabilityStep(stable,found,time,700,1000);assert(stable.capture);stable=stabilityStep(stable,{...found,points:found.points.map(([x,y])=>[x+80,y])},1300,700,1000);assert(!stable.capture);assert(!stabilityStep(stable,{ready:false},1600,700,1000).capture);
const blurred=createCanvas(W,H),blur=blurred.getContext('2d');blur.filter='blur(8px)';blur.drawImage(base,0,0);assert(!locateSheet(pixels(blurred)).ready,'Desfoque forte não deve autorizar captura');
writeFileSync('tmp/autoscan-results.json',JSON.stringify(results,null,2));console.log(results);console.log('PASS: moldura sem marcadores, perspectivas, rotações, sombra, JPEG, GO3, rejeição de moldura sem QR, corte e desfoque; estabilidade.');

// Slow drift must reset the timer even if consecutive frames move only a few pixels.
let drift=null;for(let i=0;i<5;i++){drift=stabilityStep(drift,{ready:true,points:found.points.map(([x,y])=>[x+i*9,y])},i*400,700,1000);assert(!drift.capture);}
console.log('PASS: movimento acumulado não dispara captura automática.');
