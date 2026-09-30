import {W,H,MARKERS,detectMarkers,homography,map} from './engine.js';

// Printed GO4 frame OUTER corners. Keep in sync with the 8px stroke in sheet.js.
export const FRAME=[[91,88],[1169,88],[1169,1696],[91,1696]];
export const PAGE=[[0,0],[W-1,0],[W-1,H-1],[0,H-1]];
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;
function hull(points){
 points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const lower=[],upper=[];
 for(const p of points){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(let i=points.length-1;i>=0;i--){const p=points[i];while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 lower.pop();upper.pop();return lower.concat(upper);
}
function quad(points){
 const poly=hull(points),originalArea=area(poly);if(poly.length<4)return null;
 // Remove raster stair steps by their triangle area, preserving the four real corners.
 while(poly.length>4){let best=Infinity,index=0;for(let i=0;i<poly.length;i++){const a=Math.abs(cross(poly[(i+poly.length-1)%poly.length],poly[i],poly[(i+1)%poly.length]));if(a<best){best=a;index=i;}}poly.splice(index,1);}
 if(area(poly)<originalArea*.94)return null;
 const start=poly.reduce((best,p,i)=>p[0]+p[1]<poly[best][0]+poly[best][1]?i:best,0);
 return poly.map((_,i)=>poly[(start+i)%4]);
}
// Fit each outer border to many edge pixels, then intersect the four lines.
// This avoids using a single staircase pixel as the perspective corner.
function refineQuad(q,edge){
 const lines=q.map((a,i)=>{const b=q[(i+1)%4],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length,bins=Array(60).fill(null);
  for(const p of edge){const t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(length*length),d=(p[0]-a[0])*nx+(p[1]-a[1])*ny;if(t<.07||t>.93||Math.abs(d)>18)continue;const j=Math.floor(t*60);if(!bins[j]||d<bins[j].d)bins[j]={p,d};}
  const points=bins.filter(Boolean).map(v=>v.p);if(points.length<15)return null;
  const cx=points.reduce((s,p)=>s+p[0],0)/points.length,cy=points.reduce((s,p)=>s+p[1],0)/points.length;let xx=0,yy=0,xy=0;for(const p of points){xx+=(p[0]-cx)**2;yy+=(p[1]-cy)**2;xy+=(p[0]-cx)*(p[1]-cy);}const angle=.5*Math.atan2(2*xy,xx-yy),a1=-Math.sin(angle),b1=Math.cos(angle);return [a1,b1,a1*cx+b1*cy];
 });
 if(lines.some(l=>!l))return q;
 return lines.map((line,i)=>{const prev=lines[(i+3)%4],det=prev[0]*line[1]-line[0]*prev[1];if(Math.abs(det)<.1)return q[i];return [(prev[2]*line[1]-line[2]*prev[1])/det,(prev[0]*line[2]-line[0]*prev[2])/det];});
}
function distance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy,t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function prepare(image,maxSide){
 const scale=Math.min(1,maxSide/Math.max(image.width,image.height)),w=Math.round(image.width*scale),h=Math.round(image.height*scale),gray=new Uint8Array(w*h),sum=new Float64Array((w+1)*(h+1));
 for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){const k=(Math.min(image.height-1,Math.round(y/scale))*image.width+Math.min(image.width-1,Math.round(x/scale)))*4,i=y*w+x;gray[i]=image.data[k]*.299+image.data[k+1]*.587+image.data[k+2]*.114;row+=gray[i];sum[(y+1)*(w+1)+x+1]=row+sum[y*(w+1)+x+1];}}
 const mask=new Uint8Array(w*h),r=Math.max(12,Math.round(Math.min(w,h)*.04));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const x0=Math.max(0,x-r),x1=Math.min(w,x+r+1),y0=Math.max(0,y-r),y1=Math.min(h,y+r+1),mean=(sum[y1*(w+1)+x1]-sum[y0*(w+1)+x1]-sum[y1*(w+1)+x0]+sum[y0*(w+1)+x0])/((x1-x0)*(y1-y0));mask[y*w+x]=gray[y*w+x]<mean-Math.max(14,mean*.15)?1:0;}
 return {scale,w,h,gray,mask};
}
// Small morphological closing bridges 1–2px printing/JPEG gaps without joining the text.
function closeMask(mask,w,h){const dil=new Uint8Array(mask.length),out=new Uint8Array(mask.length);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(mask[i+dy*w+dx])dil[i]=1;}for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;let all=1;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!dil[i+dy*w+dx])all=0;out[i]=all;}return out;}
function contours(mask,w,h,kind){
 const work=mask.slice(),queue=new Int32Array(w*h),found=[];
 for(let i=0;i<work.length;i++){if(!work[i])continue;let head=0,tail=1;queue[0]=i;work[i]=0;let x0=w,x1=0,y0=h,y1=0;
 while(head<tail){const p=queue[head++],x=p%w,y=(p/w)|0;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&work[n]){work[n]=0;queue[tail++]=n;}}
 const box=(x1-x0)*(y1-y0),density=tail/box;
 if(box<w*h*.16||x0<2||y0<2||x1>w-3||y1>h-3||density<(kind==='frame'?.009:.5)||density>(kind==='frame'?.17:1.1))continue;
 const edge=[];for(let j=0;j<tail;j++){const p=queue[j],x=p%w,y=(p/w)|0;if(!mask[p-1]||!mask[p+1]||!mask[p-w]||!mask[p+w])edge.push([x,y]);}
 let q=quad(edge);if(!q||area(q)<w*h*.15)continue;q=refineQuad(q,edge);
 const lengths=q.map((p,i)=>Math.hypot(p[0]-q[(i+1)%4][0],p[1]-q[(i+1)%4][1]));if(Math.min(...lengths)<Math.min(w,h)*.25||Math.max(...lengths)/Math.min(...lengths)>3.3)continue;
 // A black frame must have support on every edge, not merely a quadrilateral hull.
 let supported=0;for(let side=0;side<4;side++){let hits=0;for(let t=1;t<20;t++){const a=q[side],b=q[(side+1)%4],x=Math.round(a[0]+(b[0]-a[0])*t/20),y=Math.round(a[1]+(b[1]-a[1])*t/20);let hit=false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(mask[(y+dy)*w+x+dx])hit=true;if(hit)hits++;}if(hits>=16)supported++;}
 if(supported<4)continue;
 if(kind==='frame'){let near=0;for(const p of edge)if(Math.min(...q.map((a,i)=>distance(p,a,q[(i+1)%4])))<Math.max(9,Math.min(w,h)*.018))near++;if(near/edge.length<.85)continue;}
 found.push({points:q,area:area(q),kind});
 }return found.sort((a,b)=>b.area-a.area).slice(0,3);
}
export function detectCandidates(image,{fast=false,paperOnly=false}={}){
 const p=prepare(image,fast?760:1100),{w,h,scale,gray,mask}=p;
 let frames=paperOnly?[]:contours(mask,w,h,'frame');
 if(!paperOnly&&!frames.length)frames=contours(closeMask(mask,w,h),w,h,'frame');
 const candidates=frames.map(c=>({points:c.points.map(([x,y])=>[x/scale,y/scale]),reference:FRAME,kind:'frame'}));
 if(!paperOnly&&(!fast||!candidates.length)){const points=detectMarkers(image);if(points)candidates.push({points,reference:MARKERS,kind:'markers'});}
 // Paper silhouette is a secondary hypothesis. QR and bubble geometry MUST validate it.
 if(paperOnly||!candidates.length){const histogram=new Uint32Array(256);for(const v of gray)histogram[v]++;let sum=0,percentile=255;for(let v=0;v<256;v++){sum+=histogram[v];if(sum>=gray.length*.75){percentile=v;break;}}const threshold=Math.max(90,percentile*.84),white=gray.map(v=>v>threshold?1:0);for(const c of contours(closeMask(white,w,h),w,h,'page'))candidates.push({points:c.points.map(([x,y])=>[x/scale,y/scale]),reference:PAGE,kind:'page'});}
 return candidates;
}
export function locateSheet(image){
 const candidate=detectCandidates(image,{fast:true})[0];if(!candidate)return {found:false,message:'Mostre a moldura inteira, sem cortar os cantos.'};
 const {points}=candidate,edges=points.map((p,i)=>Math.hypot(p[0]-points[(i+1)%4][0],p[1]-points[(i+1)%4][1]));
 const coverage=area(points)/(image.width*image.height),cropped=points.some(([x,y])=>x<image.width*.012||x>image.width*.988||y<image.height*.012||y>image.height*.988);
 // Measure edge detail inside the sheet, where text and bubbles must be sharp.
 const t=homography([[0,0],[1,0],[1,1],[0,1]],points);let energy=0,samples=0;
 const gray=(x,y)=>{const i=(y*image.width+x)*4;return (image.data[i]+image.data[i+1]+image.data[i+2])/3;};
 for(let v=.18;v<.92;v+=.014)for(let u=.12;u<.9;u+=.014){const [px,py]=map(t,u,v),x=Math.round(px),y=Math.round(py);if(x<1||x>=image.width-1||y<1||y>=image.height-1)continue;const lap=4*gray(x,y)-gray(x-1,y)-gray(x+1,y)-gray(x,y-1)-gray(x,y+1);energy+=lap*lap;samples++;}
 const sharpness=energy/Math.max(1,samples),ready=!cropped&&coverage>.27&&Math.min(...edges)>Math.min(image.width,image.height)*.48&&sharpness>140;
 return {found:true,points,reference:candidate.reference,kind:candidate.kind,coverage,sharpness,ready,message:cropped?'Afaste um pouco: a folha está cortada.':coverage<=.27||Math.min(...edges)<=Math.min(image.width,image.height)*.48?'Aproxime e deixe a câmera mais paralela à folha.':sharpness<=140?'Aguarde o foco e melhore a iluminação.':'Folha localizada. Mantenha o celular parado.'};
}
