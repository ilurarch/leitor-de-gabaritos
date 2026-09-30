import {locateSheet} from './scanner.js';
import {readSheet,readAutomatic,identifySheet} from './reader.js';
self.onmessage=({data})=>{
 const {id,image,points,operation}=data;
 try{
  if(operation==='locate'){const location=locateSheet(image);if(location.ready){location.identified=!!identifySheet(image,location.points,location.reference);if(!location.identified){location.ready=false;location.message='Contorno localizado. Aproxime e aguarde o foco no QR Code.';}}self.postMessage({id,location});return;}
  const result=points?readSheet(image,points):readAutomatic(image);
  self.postMessage({id,result},[result.out.data.buffer]);
 }catch(error){self.postMessage({id,error:error.message||String(error),needsAlignment:!!error.needsAlignment});}
};
