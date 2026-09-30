import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {sheet,testAnswers} from './sheet.js';
import {readSheet} from './reader.js';
import {W,H,detectMarkers,bubble} from './engine.js';
import {writeFileSync} from 'node:fs';
globalThis.document={createElement:()=>createCanvas(1,1)};
const expected=testAnswers(40),base=await sheet({count:40},expected),results=[];
function read(c){const t=performance.now(),data=c.getContext('2d').getImageData(0,0,c.width,c.height),points=detectMarkers(data);assert(points,'Marcadores não encontrados');const r=readSheet(data,points);return {r,ms:Math.round(performance.now()-t)};}
function check(name,c){const {r,ms}=read(c);assert.deepEqual(r.answers,expected,name);results.push({test:name,questions:40,ms,result:'PASS'});}
function copy(){const c=createCanvas(W,H);c.getContext('2d').drawImage(base,0,0);return c;}
check('Folha original',base);
const small=createCanvas(840,1188);small.getContext('2d').drawImage(base,0,0,840,1188);check('Redução para 840 px',small);
const shadow=copy(),sc=shadow.getContext('2d'),data=sc.getImageData(0,0,W,H);let seed=7123;for(let y=0;y<H;y++)for(let x=0;x<W;x++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed/2**32-.5)*24,factor=.45+.55*x/W,k=(y*W+x)*4;for(let a=0;a<3;a++)data.data[k+a]=Math.max(0,Math.min(255,data.data[k+a]*factor+noise));}sc.putImageData(data,0,0);check('Sombra gradual e ruído',shadow);
const compressed=await loadImage(base.toBuffer('image/jpeg',55)),jpeg=createCanvas(W,H);jpeg.getContext('2d').drawImage(compressed,0,0);check('Compressão JPEG',jpeg);
const desk=createCanvas(1800,2000),dc=desk.getContext('2d');dc.fillStyle='#777';dc.fillRect(0,0,1800,2000);dc.drawImage(base,450,300,900,1273);check('Folha com margens de fundo',desk);
const rotated=createCanvas(H,W),rc=rotated.getContext('2d');rc.translate(H,0);rc.rotate(Math.PI/2);rc.drawImage(base,0,0);check('Rotação de 90 graus',rotated);
const faint=copy(),fc=faint.getContext('2d'),[x,y]=bubble(0,0);fc.fillStyle='#c8c8c8';fc.beginPath();fc.arc(x,y,10.5,0,Math.PI*2);fc.fill();assert.equal(read(faint).r.answers[0],'REVISAR');results.push({test:'Marca clara sinalizada como duvidosa',result:'PASS'});
const missing=copy(),mc=missing.getContext('2d'),[mx,my]=bubble(1,2);mc.fillStyle='#fff';mc.fillRect(mx-26,my-26,52,52);assert.equal(read(missing).r.answers[1],'REVISAR');results.push({test:'Bolinha ausente não vira resposta em branco',result:'PASS'});
const tiny=createCanvas(400,566);tiny.getContext('2d').drawImage(base,0,0,400,566);assert.throws(()=>read(tiny),/pequena|Marcadores/);results.push({test:'Foto pequena rejeitada',result:'PASS'});
writeFileSync('tmp/quality-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
