import {detectMarkers} from './engine.js';

// Camera capture shares exactly the same reading pipeline as uploaded images.
export function setupCamera({validate,onFiles,status,isBusy}) {
  const $=id=>document.getElementById(id);
  const dialog=$('cameraDialog'),video=$('cameraVideo'),shot=$('cameraShot'),frame=$('cameraFrame');
  let stream=null,request=0,timer=null,photoReady=false,encoding=false;
  const stopTracks=s=>s?.getTracks().forEach(track=>track.stop());
  function stop(){request++;clearTimeout(timer);timer=null;stopTracks(stream);stream=null;video.srcObject=null;}
  function close(){stop();photoReady=false;encoding=false;if(dialog.open)dialog.close();}
  function fail(error){
    $('cameraError').hidden=false;
    $('cameraError').textContent=error?.name==='NotAllowedError'?'A câmera não foi autorizada. Libere o acesso nas permissões do navegador ou use “Câmera externa (sem guia)”.':error?.name==='NotFoundError'?'Nenhuma câmera disponível. Use uma foto da galeria.':error?.name==='NotReadableError'?'A câmera está ocupada. Feche outros aplicativos de câmera e tente novamente.':error?.message||'Não foi possível abrir a câmera. Use “Câmera externa (sem guia)”.';
    $('cameraHint').textContent='A câmera ao vivo não está disponível.';
    $('capturePhoto').disabled=true;
  }
  function fitGuide(){
    const stage=$('cameraStage'),sw=stage.clientWidth,sh=stage.clientHeight;
    if(!sw||!sh)return;
    const vw=video.videoWidth||1260,vh=video.videoHeight||1782;
    const scale=Math.min(sw/vw,sh/vh);
    const visibleW=vw*scale,visibleH=vh*scale;
    const height=Math.min(visibleH*.88,visibleW*.88*297/210);
    frame.style.height=`${height}px`;frame.style.width=`${height*210/297}px`;
  }
  function inspect(){
    if(!stream||photoReady||!dialog.open)return;
    try {
      if(video.readyState>=2&&video.videoWidth){
        const c=document.createElement('canvas'),scale=Math.min(520/video.videoWidth,740/video.videoHeight);
        c.width=Math.round(video.videoWidth*scale);c.height=Math.round(video.videoHeight*scale);
        const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0,c.width,c.height);
        const found=detectMarkers(ctx.getImageData(0,0,c.width,c.height));
        frame.classList.toggle('ready',!!found);
        const message=found?'Quatro marcas localizadas. Confira a nitidez e toque em Fotografar.':'Encaixe os quatro quadrados pretos nos alvos amarelos.';
        if($('cameraHint').textContent!==message)$('cameraHint').textContent=message;
      }
    }catch{/* The framing guide remains usable if live marker detection is unavailable. */}
    timer=setTimeout(inspect,800);
  }
  async function start(){
    stop();const ticket=request;photoReady=false;encoding=false;
    shot.hidden=true;video.hidden=false;frame.hidden=false;frame.classList.remove('ready');
    $('cameraError').hidden=true;$('capturePhoto').hidden=false;$('capturePhoto').disabled=true;
    $('readPhoto').hidden=true;$('readPhoto').disabled=false;$('retakePhoto').hidden=true;$('retakePhoto').disabled=false;fitGuide();
    $('cameraHint').textContent='Aguardando permissão para abrir a câmera…';
    try {
      if(!navigator.mediaDevices?.getUserMedia)throw Error('Abra o aplicativo pelo link HTTPS no navegador do celular ou use a câmera do celular.');
      const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1920}}});
      if(ticket!==request||!dialog.open){stopTracks(acquired);return;}
      stream=acquired;video.srcObject=stream;await video.play();
      if(ticket!==request||!dialog.open)return;
      fitGuide();$('capturePhoto').disabled=false;
      $('cameraHint').textContent='Encaixe os quatro quadrados nos alvos amarelos e aguarde o foco.';
      inspect();
    }catch(error){if(ticket===request&&dialog.open){stop();fail(error);}}
  }
  $('openCamera').onclick=()=>{
    if(isBusy())return;
    try{validate();}catch(e){status(e.message);return;}
    dialog.showModal();start();
  };
  $('closeCamera').onclick=close;
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',stop);
  $('capturePhoto').onclick=()=>{
    if(!stream||video.readyState<2||!video.videoWidth)return;
    try{
      // Keep the whole frame: never cut alignment markers at the guide boundary.
      const scale=Math.min(1,2500/Math.max(video.videoWidth,video.videoHeight));
      shot.width=Math.round(video.videoWidth*scale);shot.height=Math.round(video.videoHeight*scale);
      shot.getContext('2d').drawImage(video,0,0,shot.width,shot.height);
      photoReady=true;stop();video.hidden=true;shot.hidden=false;frame.hidden=true;
      $('capturePhoto').hidden=true;$('readPhoto').hidden=false;$('retakePhoto').hidden=false;
      $('cameraHint').textContent='A foto ficou nítida? Confira o QR Code e os quatro quadrados antes de continuar.';
    }catch(e){fail(e);}
  };
  $('retakePhoto').onclick=()=>{if(!encoding)start();};
  $('readPhoto').onclick=()=>{
    if(!photoReady||encoding)return;
    encoding=true;$('readPhoto').disabled=true;$('retakePhoto').disabled=true;
    const ticket=request;
    shot.toBlob(async blob=>{
      $('retakePhoto').disabled=false;
      if(ticket!==request||!dialog.open){encoding=false;return;}
      if(!blob){encoding=false;$('readPhoto').disabled=false;fail(Error('Não foi possível preparar a foto. Tire outra.'));return;}
      const file=new File([blob],`cartao-camera-${Date.now()}.jpg`,{type:'image/jpeg'});
      close();await onFiles([file]);
    },'image/jpeg',.95);
  };
  function native(){
    if(isBusy())return;
    try{validate();}catch(e){status(e.message);return;}
    close();$('cameraFile').value='';$('cameraFile').click();
  }
  $('nativeCamera').onclick=native;$('cameraFallback').onclick=native;
  $('cameraFile').onchange=async()=>{const files=[...$('cameraFile').files];$('cameraFile').value='';if(files.length)await onFiles(files);};
  video.addEventListener('loadedmetadata',fitGuide);
  video.addEventListener('resize',fitGuide);
  window.addEventListener('resize',fitGuide);
  window.addEventListener('pagehide',close);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open&&!photoReady)close();});
  return {close};
}
