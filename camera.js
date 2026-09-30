import {processImage} from './worker-client.js';

// Stability is measured against the detected document, never against a fixed screen guide.
export function stabilityStep(previous,location,now,width,height){
 if(!location?.ready)return {points:null,since:now,count:0,capture:false};
 const anchor=previous?.anchor||previous?.points;
 const diagonal=Math.hypot(width,height),movement=anchor?Math.max(...location.points.map((p,i)=>Math.hypot(p[0]-anchor[i][0],p[1]-anchor[i][1])))/diagonal:Infinity;
 const stable=movement<.012,since=stable?previous.since:now,count=stable?previous.count+1:1;
 return {points:location.points,anchor:stable?anchor:location.points,since,count,capture:count>=3&&now-since>=1100};
}
export function setupCamera({validate,onFiles,status,isBusy,locate=async image=>(await processImage(image,null,'locate')).location}) {
 const $=id=>document.getElementById(id),dialog=$('cameraDialog'),video=$('cameraVideo'),shot=$('cameraShot'),frame=$('cameraFrame'),overlay=$('cameraOverlay');
 let stream=null,request=0,timer=null,photoReady=false,encoding=false,stability=null;
 const stopTracks=s=>s?.getTracks().forEach(track=>track.stop());
 function stop(){request++;clearTimeout(timer);timer=null;stopTracks(stream);stream=null;video.srcObject=null;stability=null;}
 function close(){stop();photoReady=false;encoding=false;if(dialog.open)dialog.close();}
 function fail(error){$('cameraError').hidden=false;$('cameraError').textContent=error?.name==='NotAllowedError'?'Autorize a câmera no navegador ou use a câmera externa.':error?.name==='NotFoundError'?'Nenhuma câmera disponível. Envie uma foto da galeria.':error?.name==='NotReadableError'?'A câmera está ocupada. Feche outros aplicativos de câmera e tente novamente.':error?.message||'Não foi possível abrir a câmera.';$('capturePhoto').disabled=!stream;}
 function fitGuide(){const stage=$('cameraStage'),sw=stage.clientWidth,sh=stage.clientHeight;if(!sw||!sh)return;const scale=Math.min(sw/(video.videoWidth||1260),sh/(video.videoHeight||1782)),height=Math.min((video.videoHeight||1782)*scale*.88,(video.videoWidth||1260)*scale*.88*297/210);frame.style.height=`${height}px`;frame.style.width=`${height*210/297}px`;frame.hidden=!$('showGuide')?.checked;}
 function draw(location,width,height){
  if(!overlay)return;const stage=$('cameraStage'),sw=stage.clientWidth,sh=stage.clientHeight;overlay.width=sw*2;overlay.height=sh*2;const ctx=overlay.getContext('2d'),scale=Math.min(overlay.width/width,overlay.height/height),ox=(overlay.width-width*scale)/2,oy=(overlay.height-height*scale)/2;
  ctx.clearRect(0,0,overlay.width,overlay.height);if(!location?.found)return;
  const points=location.points.map(([x,y])=>[ox+x*scale,oy+y*scale]);ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=location.ready?'#1dd3a522':'#ffcc3322';ctx.fill();ctx.strokeStyle=location.ready?'#39efba':'#ffd34d';ctx.lineWidth=5;ctx.stroke();for(const[x,y]of points){ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fillStyle=ctx.strokeStyle;ctx.fill();}
 }
 async function inspect(ticket){
  if(ticket!==request||!stream||photoReady||!dialog.open)return;
  try{if(video.readyState>=2&&video.videoWidth){
   const c=document.createElement('canvas'),scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight));c.width=Math.round(video.videoWidth*scale);c.height=Math.round(video.videoHeight*scale);const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0,c.width,c.height);
   const location=await locate(ctx.getImageData(0,0,c.width,c.height));if(ticket!==request||!stream||photoReady||!dialog.open)return;
   draw(location,c.width,c.height);stability=stabilityStep(stability,location,performance.now(),c.width,c.height);
   const auto=$('autoCapture')?.checked;
   $('cameraHint').textContent=location?.ready?(auto?`Mantenha parado… ${Math.min(3,stability.count)}/3`:'Folha localizada. Toque em Fotografar e ler.'):(location?.message||'Mostre a moldura preta inteira.');
   if(auto&&stability.capture){capture();return;}
  }}catch{stability=null;if(ticket===request)$('cameraHint').textContent='Fotografe a folha inteira. O recorte será tentado após a captura.';}
  if(ticket===request)timer=setTimeout(()=>inspect(ticket),400);
 }
 async function start(){
  stop();const ticket=request;photoReady=false;encoding=false;shot.hidden=true;video.hidden=false;if(overlay){overlay.hidden=false;overlay.getContext('2d').clearRect(0,0,overlay.width,overlay.height);}fitGuide();$('cameraError').hidden=true;$('capturePhoto').hidden=false;$('capturePhoto').disabled=true;$('cameraHint').textContent='Aguardando permissão para abrir a câmera…';
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Abra pelo endereço HTTPS no navegador do celular ou use a câmera externa.');
   const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1920}}});
   if(ticket!==request||!dialog.open){stopTracks(acquired);return;}stream=acquired;video.srcObject=stream;
   // Apply continuous focus/exposure only if the device advertises those controls.
   const track=stream.getVideoTracks?.()[0],caps=track?.getCapabilities?.(),advanced={};if(caps?.focusMode?.includes('continuous'))advanced.focusMode='continuous';if(caps?.exposureMode?.includes('continuous'))advanced.exposureMode='continuous';if(Object.keys(advanced).length)await track.applyConstraints({advanced:[advanced]}).catch(()=>{});
   if(ticket!==request||!dialog.open)return;await video.play();if(ticket!==request||!dialog.open)return;fitGuide();$('capturePhoto').disabled=false;inspect(ticket);
  }catch(error){if(ticket===request&&dialog.open){stop();fail(error);}}
 }
 function capture(){
  if(!stream||photoReady||encoding||video.readyState<2||!video.videoWidth)return;
  try{const scale=Math.min(1,2800/Math.max(video.videoWidth,video.videoHeight));shot.width=Math.round(video.videoWidth*scale);shot.height=Math.round(video.videoHeight*scale);shot.getContext('2d').drawImage(video,0,0,shot.width,shot.height);photoReady=true;encoding=true;stop();video.hidden=true;shot.hidden=false;frame.hidden=true;if(overlay)overlay.hidden=true;$('capturePhoto').disabled=true;$('cameraHint').textContent='Foto capturada. Preparando o recorte e a leitura…';const ticket=request;
   // PNG avoids adding JPEG artifacts to the captured bubbles.
   shot.toBlob(async blob=>{if(ticket!==request||!dialog.open)return;if(!blob){encoding=false;fail(Error('Não foi possível preparar a foto. Abra a câmera novamente.'));return;}const file=new File([blob],`folha-camera-${Date.now()}.png`,{type:'image/png'});close();await onFiles([file]);},'image/png');
  }catch(error){encoding=false;fail(error);}
 }
 $('openCamera').onclick=()=>{if(isBusy())return;try{validate();}catch(e){status(e.message);return;}dialog.showModal();start();};
 $('closeCamera').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',stop);$('capturePhoto').onclick=capture;
 if($('showGuide'))$('showGuide').onchange=fitGuide;
 if($('autoCapture'))$('autoCapture').onchange=()=>{stability=null;};
 function native(){if(isBusy())return;try{validate();}catch(e){status(e.message);return;}close();$('cameraFile').value='';$('cameraFile').click();}
 $('nativeCamera').onclick=native;$('cameraFallback').onclick=native;$('cameraFile').onchange=async()=>{const files=[...$('cameraFile').files];$('cameraFile').value='';if(files.length)await onFiles(files);};
 video.addEventListener('loadedmetadata',fitGuide);video.addEventListener('resize',fitGuide);window.addEventListener('resize',fitGuide);window.addEventListener('pagehide',close);document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open&&!photoReady)close();});
 return {close};
}
