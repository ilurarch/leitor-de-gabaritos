import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {setupCamera} from './camera.js';
import {sheet} from './sheet.js';
import {detectMarkers,warp,readMarks} from './engine.js';
class Element{constructor(){this.hidden=false;this.disabled=false;this.style={};this.classList={toggle(){},remove(){}};this.events={};this.clientWidth=400;this.clientHeight=600;this.files=[];}addEventListener(n,f){(this.events[n]??=[]).push(f);}emit(n,e={}){for(const f of this.events[n]||[])f(e);}showModal(){this.open=true;}close(){this.open=false;this.emit('close');}click(){this.clicked=true;this.onclick?.();}}
function enhance(c){Object.assign(c,{hidden:false,style:{},events:{},addEventListener:Element.prototype.addEventListener,emit:Element.prototype.emit});return c;}
const ids=['cameraDialog','cameraVideo','cameraShot','cameraFrame','cameraStage','cameraError','cameraHint','capturePhoto','readPhoto','retakePhoto','openCamera','closeCamera','nativeCamera','cameraFallback','cameraFile'];
const els=Object.fromEntries(ids.map(id=>[id,new Element()]));
const doc=new Element();doc.getElementById=id=>els[id];doc.createElement=()=>createCanvas(1,1);globalThis.document=doc;globalThis.window=new Element();
const e={id:'camera-test',title:'Teste',classroom:'Turma',names:['Aluno'],count:20,choices:4,key:Array(20).fill('B')};
const card=await sheet(e,e.key);const video=enhance(card);video.videoWidth=card.width;video.videoHeight=card.height;video.readyState=2;video.play=async()=>{};els.cameraVideo=video;
const shot=enhance(createCanvas(1,1));shot.toBlob=(fn)=>fn(new Blob([shot.toBuffer('image/jpeg')],{type:'image/jpeg'}));els.cameraShot=shot;
let stopped=0,opts,calls=0,lastFile;const media={getUserMedia:async options=>{opts=options;return {getTracks:()=>[{stop:()=>stopped++}]};}};Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:media},configurable:true});
const control=setupCamera({validate(){},isBusy:()=>false,status(){},onFiles:async files=>{calls++;lastFile=files[0];}});
const tick=()=>new Promise(r=>setTimeout(r,20));
els.openCamera.click();await tick();assert.equal(opts.audio,false);assert.equal(opts.video.facingMode.ideal,'environment');assert.equal(els.capturePhoto.disabled,false);
els.capturePhoto.click();assert.equal(stopped,1);assert.equal(shot.hidden,false);els.readPhoto.click();await tick();assert.equal(calls,1);assert.equal(els.cameraDialog.open,false);assert.equal(lastFile.type,'image/jpeg');
const img=await loadImage(Buffer.from(await lastFile.arrayBuffer())),c=createCanvas(img.width,img.height);c.getContext('2d').drawImage(img,0,0);const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height);const points=detectMarkers(pixels);assert(points);assert.deepEqual(readMarks(warp(pixels,points),20,4).answers,e.key);
// Permission granted after dismissal must not leave the camera running.
let resolve;media.getUserMedia=()=>new Promise(r=>resolve=r);els.openCamera.click();els.closeCamera.click();resolve({getTracks:()=>[{stop:()=>stopped++}]});await tick();assert.equal(stopped,2);assert.equal(video.srcObject,null);
// Permission rejection leaves a usable native-camera fallback.
media.getUserMedia=async()=>{const e=Error('Denied');e.name='NotAllowedError';throw e;};els.openCamera.click();await tick();assert.equal(els.cameraError.hidden,false);assert.match(els.cameraError.textContent,/autorizada/);els.cameraFallback.click();assert.equal(els.cameraFile.clicked,true);assert.equal(els.cameraDialog.open,false);control.close();
console.log('PASS: rear-camera request, photo capture → OMR, stream cleanup, late permission, denied permission, native fallback.');
