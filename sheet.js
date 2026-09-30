import QRCode from 'qrcode';
import {W,H,MARKERS,bubble} from './engine.js';
export const testAnswers=count=>Array.from({length:count},(_,i)=>'ABCD'[i%4]);
function textFit(ctx,text,x,y,max,size=28){ctx.font=`600 ${size}px Arial`;while(ctx.measureText(text).width>max&&size>12)ctx.font=`600 ${--size}px Arial`;ctx.fillText(text,x,y);}
// QR describes only the printed layout. It NEVER contains marked answers.
export async function sheet({count=20,student=null},marks=Array(count).fill('')){
 if(!Number.isInteger(count)||count<1||count>40)throw Error('Escolha de 1 a 40 questões.');
 const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#000';
 for(const [x,y]of MARKERS)ctx.fillRect(x-17,y-17,34,34);
 ctx.save();ctx.strokeStyle='#000';ctx.lineWidth=8;ctx.setLineDash([]);ctx.strokeRect(95,92,1070,1600);ctx.restore();
 ctx.font='bold 17px Arial';textFit(ctx,'FOLHA-RESPOSTA',120,130,780,18);
 textFit(ctx,student?.school||'Escola: ___________________________________',120,190,780,30);
 textFit(ctx,student?`Nome: ${student.name}`:'Nome: ___________________________________',120,238,780,27);
 textFit(ctx,student?`Série: ${student.grade}     Turma: ${student.classroom}`:'Série: _______________     Turma: _______________',120,284,780,22);
 textFit(ctx,student?.discipline?`Disciplina: ${student.discipline}`:`${count} questões • Alternativas A, B, C e D`,120,330,780,20);
 const qr=await QRCode.toCanvas(document.createElement('canvas'),JSON.stringify({model:'GO4',n:count,c:4,...(student?{sid:student.id}:{})}),{width:240,margin:2,errorCorrectionLevel:'M'});
 ctx.drawImage(qr,910,107,240,240);
 ctx.font='17px Arial';ctx.fillText('Fotografe com toda a moldura preta visível. O recorte é automático.',120,378);
 ctx.fillText('Preencha uma bolinha por questão. Use papel plano e boa iluminação.',120,408);
 for(let col=0;col<Math.ceil(count/20);col++){ctx.font='bold 19px Arial';ctx.fillText('Nº',120+550*col,437);for(let a=0;a<4;a++)ctx.fillText('ABCD'[a],172+550*col+90*a,437);}
 for(let q=0;q<count;q++){const [bx,by]=bubble(q,0);ctx.font='22px Arial';ctx.fillText(String(q+1).padStart(2,'0'),bx-60,by+7);for(let a=0;a<4;a++){const[x,y]=bubble(q,a);ctx.beginPath();ctx.arc(x,y,21,0,Math.PI*2);ctx.lineWidth=2.3;ctx.stroke();if(marks[q]?.includes('ABCD'[a]))ctx.fill();}if(q%5===0){ctx.fillRect(bx-76,by-2,10,4);}}
 ctx.font='16px Arial';ctx.fillText('A4 · Imprimir em tamanho real (100%) · Preserve a moldura preta e as quatro marcas.',120,1650);
 ctx.font='14px Arial';ctx.fillText('Modelo GO4 · O QR Code identifica o formato da folha, não as respostas.',120,1673);return c;
}
