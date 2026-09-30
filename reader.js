import jsQR from 'jsqr';
import {W,H,warp,readMarks} from './engine.js';
// Independent of generator inputs or any saved assessment; only pixels and layout metadata.
export function readSheet(image,points){
 let reason='Não foi possível ler o QR Code. Confira a nitidez e o alinhamento.';
 for(let turn=0;turn<4;turn++){
  const ordered=points.map((_,i)=>points[(i+turn)%4]);
  const out=warp(image,ordered),qr=jsQR(out.data,W,H,{inversionAttempts:'dontInvert'});
  if(!qr)continue;
  const loc=qr.location,qx=(loc.topLeftCorner.x+loc.bottomRightCorner.x)/2,qy=(loc.topLeftCorner.y+loc.bottomRightCorner.y)/2;
  if(qx<W*.7||qy>H*.24)continue;
  let meta;try{meta=JSON.parse(qr.data);}catch{continue;}
  if(meta.model!=='GO2'){reason='Use uma folha de teste gerada nesta versão simplificada. Os cartões antigos usam outro formato de identificação.';break;}
  if(!Number.isInteger(meta.n)||meta.n<1||meta.n>60||meta.c!==4){reason='Formato da folha inválido.';break;}
  return {...readMarks(out,meta.n,meta.c),out,count:meta.n,studentId:typeof meta.sid==='string'&&/^[0-9a-f]{32}$/.test(meta.sid)?meta.sid:null};
 }
 throw Error(reason);
}
