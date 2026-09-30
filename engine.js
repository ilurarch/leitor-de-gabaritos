// Deterministic OMR: shared geometry, connected components, homography and pixel density.
export const W=1260,H=1782,MARKERS=[[60,60],[1200,60],[1200,1722],[60,1722]];
export function bubble(q,a,layout='GO4'){return layout==='GO2'?[145+400*Math.floor(q/20)+44*a,480+54*(q%20)]:[180+550*Math.floor(q/20)+90*a,470+59*(q%20)];}
export function homography(src,dst){const A=[],b=[];for(let i=0;i<4;i++){const [x,y]=src[i],[u,v]=dst[i];A.push([x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]);b.push(u,v);}for(let i=0;i<8;i++){let p=i;for(let j=i+1;j<8;j++)if(Math.abs(A[j][i])>Math.abs(A[p][i]))p=j;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];const d=A[i][i];if(Math.abs(d)<1e-9)throw Error('Marcas inválidas. Selecione novamente.');for(let k=i;k<8;k++)A[i][k]/=d;b[i]/=d;for(let j=0;j<8;j++)if(j!==i){const t=A[j][i];for(let k=i;k<8;k++)A[j][k]-=t*A[i][k];b[j]-=t*b[i];}}return [...b,1];}
export function map(h,x,y){const z=h[6]*x+h[7]*y+1;return [(h[0]*x+h[1]*y+h[2])/z,(h[3]*x+h[4]*y+h[5])/z];}
export function warp(image,points,reference=MARKERS,region={x:0,y:0,width:W,height:H}){
 const {width:ow,height:oh}=region;
 const h=homography(reference,points),out=new Uint8ClampedArray(ow*oh*4),{width:sw,height:sh,data}=image;
 for(let yy=0;yy<oh;yy++)for(let xx=0;xx<ow;xx++){
  const x=xx+region.x,y=yy+region.y;
  const z=h[6]*x+h[7]*y+1,u=(h[0]*x+h[1]*y+h[2])/z,v=(h[3]*x+h[4]*y+h[5])/z,ix=Math.floor(u),iy=Math.floor(v),o=(yy*ow+xx)*4;
  if(ix>=0&&ix<sw-1&&iy>=0&&iy<sh-1){const dx=u-ix,dy=v-iy,k=(iy*sw+ix)*4;for(let c=0;c<3;c++)out[o+c]=data[k+c]*(1-dx)*(1-dy)+data[k+4+c]*dx*(1-dy)+data[k+sw*4+c]*(1-dx)*dy+data[k+sw*4+4+c]*dx*dy;}
  else out[o]=out[o+1]=out[o+2]=255;out[o+3]=255;
 }return {data:out,width:ow,height:oh};
}
// Locally adaptive thresholding on a reduced image. Search for similar square markers
// anywhere around the sheet, instead of assuming they lie at the image's corners.
export function detectMarkers(image){
 const scale=Math.min(1,1000/Math.max(image.width,image.height)),w=Math.round(image.width*scale),h=Math.round(image.height*scale),gray=new Uint8Array(w*h),integral=new Float64Array((w+1)*(h+1));
 for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){const k=(Math.min(image.height-1,Math.round(y/scale))*image.width+Math.min(image.width-1,Math.round(x/scale)))*4,i=y*w+x;gray[i]=image.data[k]*.299+image.data[k+1]*.587+image.data[k+2]*.114;row+=gray[i];integral[(y+1)*(w+1)+x+1]=row+integral[y*(w+1)+x+1];}}
 const mask=new Uint8Array(w*h),radius=Math.max(14,Math.round(Math.min(w,h)*.04));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const x0=Math.max(0,x-radius),x1=Math.min(w,x+radius+1),y0=Math.max(0,y-radius),y1=Math.min(h,y+radius+1),mean=(integral[y1*(w+1)+x1]-integral[y0*(w+1)+x1]-integral[y1*(w+1)+x0]+integral[y0*(w+1)+x0])/((x1-x0)*(y1-y0));mask[y*w+x]=gray[y*w+x]<mean-Math.max(18,mean*.18)?1:0;}
 const queue=new Int32Array(w*h),found=[];
 for(let i=0;i<w*h;i++){if(!mask[i])continue;let head=0,tail=1;queue[0]=i;mask[i]=0;let xmin=w,xmax=0,ymin=h,ymax=0;
 while(head<tail){const p=queue[head++],x=p%w,y=(p/w)|0;xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);for(const n of [x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(n>=0&&mask[n]){mask[n]=0;queue[tail++]=n;}}
 const bw=xmax-xmin+1,bh=ymax-ymin+1;if(bw>=6&&bh>=6&&bw<w*.08&&bh<h*.08&&bw/bh>.55&&bw/bh<1.8&&tail/(bw*bh)>.72)found.push({p:[(xmin+xmax)/2,(ymin+ymax)/2],size:Math.sqrt(bw*bh)});
 }
 let best=null,bestScore=0;
 for(const anchor of found){const group=found.filter(f=>f.size>anchor.size*.7&&f.size<anchor.size*1.4);if(group.length<4)continue;
 const extremes=[(p)=>p[0]/w+p[1]/h,(p)=>-p[0]/w+p[1]/h,(p)=>-p[0]/w-p[1]/h,(p)=>p[0]/w-p[1]/h].map(fn=>group.reduce((a,b)=>fn(a.p)<fn(b.p)?a:b));
 if(new Set(extremes).size<4)continue;const points=extremes.map(v=>v.p);let area=0;for(let i=0;i<4;i++)area+=points[i][0]*points[(i+1)%4][1]-points[(i+1)%4][0]*points[i][1];area=Math.abs(area)/2;if(area<w*h*.13)continue;
 const sizes=extremes.map(v=>v.size),score=area/(Math.max(...sizes)/Math.min(...sizes));if(score>bestScore){bestScore=score;best=points.map(([x,y])=>[x/scale,y/scale]);}
 }return best;
}
export function validateGeometry(image,points){
 if(!Array.isArray(points)||points.length!==4||points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v))))throw Error('Selecione os quatro quadrados corretamente.');
 const edges=points.map((p,i)=>Math.hypot(p[0]-points[(i+1)%4][0],p[1]-points[(i+1)%4][1]));
 if(Math.min(...edges)<500)throw Error('A folha está pequena na foto. Aproxime a câmera e fotografe novamente.');
 const signs=points.map((p,i)=>{const b=points[(i+1)%4],c=points[(i+2)%4];return (b[0]-p[0])*(c[1]-b[1])-(b[1]-p[1])*(c[0]-b[0]);});
 if(!signs.every(x=>x>0)&&!signs.every(x=>x<0))throw Error('Os cantos se cruzam. Selecione os quadrados na ordem indicada.');
}
export function readMarks(image,count,choices,layout='GO4'){
 const large=layout!=='GO2',ring=large?21:12,inside=large?14:8,background=large?31:20;
 const gray=(x,y)=>{const i=(Math.round(y)*W+Math.round(x))*4;return image.data[i]*.299+image.data[i+1]*.587+image.data[i+2]*.114;};
 const answers=[],densities=[],quality=[];
 for(let q=0;q<count;q++){const scores=[],weak=[];let unreliable=false;
 for(let a=0;a<choices;a++){let [cx,cy]=bubble(q,a,layout);const outer=[];for(let t=0;t<24;t++)outer.push(gray(cx+background*Math.cos(t*Math.PI/12),cy+background*Math.sin(t*Math.PI/12)));outer.sort((a,b)=>a-b);const bg=outer[12];
 // Find the actual circle locally and measure its contrast. Missing or washed-out
 // printing must not silently become an unanswered question.
 let best=-1,contrast=0;
 for(const oy of [0,-2,2])for(const ox of [0,-2,2]){let evidence=0,total=0;for(let t=0;t<20;t++){const angle=t*Math.PI/10;let low=255;for(let r=ring-2;r<=ring+2;r++)low=Math.min(low,gray(cx+ox+r*Math.cos(angle),cy+oy+r*Math.sin(angle)));const delta=bg-low;total+=delta;if(delta>35)evidence++;}const merit=evidence+total/5000-(ox*ox+oy*oy)*.04;if(merit>best){best=merit;contrast=total/20;var bestX=cx+ox,bestY=cy+oy;}}
 cx=bestX;cy=bestY;const valid=best>=15&&contrast>=38&&bg>=80;if(!valid)unreliable=true;
 const threshold=bg-Math.max(22,contrast*.35);let dark=0,soft=0,total=0;
 for(let y=-inside;y<=inside;y++)for(let x=-inside;x<=inside;x++)if(x*x+y*y<=inside*inside){total++;const value=gray(cx+x,cy+y);if(value<threshold)dark++;if(value<bg-Math.max(12,contrast*.14))soft++;}
 scores.push(dark/total);weak.push(soft/total);
 }
 const filled=scores.map((s,i)=>s>=.6?i:-1).filter(i=>i>=0),faint=scores.some((s,i)=>(s>.10||weak[i]>.14)&&s<.6);
 answers.push(unreliable?'REVISAR':filled.length>1?'MULTIPLA':faint?'REVISAR':filled.length===1?'ABCDE'[filled[0]]:'BRANCO');densities.push(scores);quality.push(unreliable?'Impressão, foco ou alinhamento insuficiente':'');
 }return {answers,densities,quality};
}
