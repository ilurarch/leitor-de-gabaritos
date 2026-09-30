import QRCode from 'qrcode';
import {W,H,MARKERS,bubble} from './engine.js';
export const testAnswers=count=>Array.from({length:count},(_,i)=>'ABCD'[i%4]);
function textFit(ctx,text,x,y,max,size=28){ctx.font=`600 ${size}px Arial`;while(ctx.measureText(text).width>max&&size>12)ctx.font=`600 ${--size}px Arial`;ctx.fillText(text,x,y);}
// QR describes only the printed layout. It NEVER contains marked answers.
export async function sheet({organization='',subtitle='',count=20,student=null},marks=Array(count).fill('')){
 const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#000';
 for(const [x,y]of MARKERS)ctx.fillRect(x-17,y-17,34,34);
 ctx.font='bold 17px Arial';textFit(ctx,organization||'FOLHA-RESPOSTA',95,130,820,18);
 textFit(ctx,student?.school||'Escola: ___________________________________',95,190,820,30);
 textFit(ctx,student?`Nome: ${student.name}`:'Nome: ___________________________________',95,238,820,27);
 textFit(ctx,student?`Série: ${student.grade}     Turma: ${student.classroom}`:'Série: _______________     Turma: _______________',95,284,820,22);
 textFit(ctx,subtitle||`${count} questões • Alternativas A, B, C e D`,95,330,820,20);
 const qr=await QRCode.toCanvas(document.createElement('canvas'),JSON.stringify({model:'GO2',n:count,c:4,...(student?{sid:student.id}:{})}),{width:200,margin:2,errorCorrectionLevel:'M'});
 ctx.drawImage(qr,970,105,200,200);
 ctx.font='17px Arial';ctx.fillText('Fotografe a folha inteira, mantendo os quatro quadrados e o QR Code visíveis.',95,378);
 ctx.fillText('Coloque a folha em uma superfície plana e bem iluminada.',95,408);
 for(let col=0;col<Math.ceil(count/20);col++){ctx.font='bold 16px Arial';ctx.fillText('Nº',85+400*col,450);for(let a=0;a<4;a++)ctx.fillText('ABCD'[a],140+400*col+44*a,450);}
 for(let q=0;q<count;q++){const [bx,by]=bubble(q,0);ctx.font='20px Arial';ctx.fillText(String(q+1).padStart(2,'0'),bx-60,by+7);for(let a=0;a<4;a++){const[x,y]=bubble(q,a);ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.lineWidth=1.7;ctx.stroke();if(marks[q]?.includes('ABCD'[a]))ctx.fill();}}
 ctx.font='16px Arial';ctx.fillText('A4 · Imprimir em tamanho real (100%) · Preserve as marcas nos quatro cantos.',95,1623);
 ctx.font='14px Arial';ctx.fillText('Modelo GO2 · O QR Code identifica o formato da folha, não as respostas.',95,1662);return c;
}
