import jsQR from 'jsqr';
import {W,H,MARKERS,warp,readMarks,validateGeometry} from './engine.js';
function borderVisible(image){let hits=0,total=0;for(const y of [92,1692])for(let x=180;x<1080;x+=8){total++;let dark=false;for(let dy=-2;dy<=2;dy++){const i=((y+dy)*W+x)*4;if(image.data[i]<155&&image.data[i+1]<155)dark=true;}if(dark)hits++;}return hits/total>.29;}
import {detectCandidates} from './scanner.js';
// Lightweight identity check for live capture: a random rectangle must not trigger it.
export function identifySheet(image,points,reference=MARKERS){
 for(let turn=0;turn<4;turn++){
  const ordered=points.map((_,i)=>points[(i+turn)%4]);
  const crop=warp(image,ordered,reference,{x:885,y:75,width:300,height:300}).data;
  const qr=jsQR(crop,300,300,{inversionAttempts:'dontInvert'});if(!qr)continue;
  try{const m=JSON.parse(qr.data);if(['GO2','GO3','GO4'].includes(m.model)&&Number.isInteger(m.n)&&m.n>=1&&m.n<=(m.model==='GO2'?60:40)&&m.c===4)return m;}catch{}
 }return null;
}
function frameVisible(image){
 const gray=(x,y)=>{const i=(Math.round(y)*W+Math.round(x))*4;return (image.data[i]+image.data[i+1]+image.data[i+2])/3;};
 const edges=[[[95,92],[1165,92],[0,14]],[[1165,92],[1165,1692],[-14,0]],[[1165,1692],[95,1692],[0,-14]],[[95,1692],[95,92],[14,0]]];
 return edges.every(([a,b,inward])=>{let hits=0;for(let j=1;j<40;j++){const x=a[0]+(b[0]-a[0])*j/40,y=a[1]+(b[1]-a[1])*j/40,bg=gray(x+inward[0],y+inward[1]);let low=255;for(let d=-3;d<=3;d++)low=Math.min(low,gray(x+(inward[0]?d:0),y+(inward[1]?d:0)));if(bg-low>30)hits++;}return hits>=28;});
}
// Independent of generator inputs or any saved assessment; only pixels and layout metadata.
export function readSheet(image,points,reference=MARKERS){
 validateGeometry(image,points);
 let reason='Não foi possível ler o QR Code. Confira a nitidez e o alinhamento.';
 for(let turn=0;turn<4;turn++){
  const ordered=points.map((_,i)=>points[(i+turn)%4]);
  const crop=warp(image,ordered,reference,{x:885,y:75,width:300,height:300}).data,qr=jsQR(crop,300,300,{inversionAttempts:'dontInvert'});
  if(!qr)continue;
  const loc=qr.location,qx=885+(loc.topLeftCorner.x+loc.bottomRightCorner.x)/2,qy=75+(loc.topLeftCorner.y+loc.bottomRightCorner.y)/2;
  if(qx<W*.7||qy>H*.24)continue;
  let meta;try{meta=JSON.parse(qr.data);}catch{continue;}
  if(!['GO2','GO3','GO4'].includes(meta.model)){reason='Modelo de folha desconhecido.';break;}
  if(!Number.isInteger(meta.n)||meta.n<1||meta.n>(meta.model==='GO2'?60:40)||meta.c!==4){reason='Formato da folha inválido.';break;}
  const out=warp(image,ordered,reference);
  if(meta.model==='GO3'&&!borderVisible(out))throw Error('A borda pontilhada não aparece por completo. Fotografe a folha inteira, plana e bem iluminada.');
  if(meta.model==='GO4'&&!frameVisible(out))throw Error('A moldura preta está cortada ou deformada. Fotografe a folha plana, com a moldura inteira visível.');
  const marks=readMarks(out,meta.n,meta.c,meta.model);if(marks.quality.filter(Boolean).length>Math.max(2,meta.n*.25))throw Error('Muitas bolinhas não estão nítidas ou alinhadas. Refaça a foto com mais luz, foco e a folha plana.');
  return {...marks,out,count:meta.n,layout:meta.model,studentId:typeof meta.sid==='string'&&/^[0-9a-f]{32}$/.test(meta.sid)?meta.sid:null};
 }
 throw Error(reason);
}

// Try independent geometric hypotheses; never report an answer without QR + print validation.
export function readAutomatic(image){
 const candidates=detectCandidates(image);let reason='Não localizei a folha. Mostre toda a moldura preta e aproxime a câmera.';
 for(const candidate of candidates){try{return {...readSheet(image,candidate.points,candidate.reference),alignment:candidate.kind};}catch(e){reason=e.message;}}
 // An unrelated rectangular object must not prevent trying the actual paper silhouette.
 if(!candidates.some(c=>c.kind==='page'))for(const candidate of detectCandidates(image,{paperOnly:true})){try{return {...readSheet(image,candidate.points,candidate.reference),alignment:candidate.kind};}catch(e){reason=e.message;}}
 const error=Error(reason);error.needsAlignment=true;throw error;
}
