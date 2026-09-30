import ExcelJS from 'exceljs';

const timestamp=scan=>scan.createdAt?.toMillis?.()??(scan.createdAt?.seconds?scan.createdAt.seconds*1000:0);
function dateLabel(scan){const ms=timestamp(scan);return ms?new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'medium'}).format(new Date(ms)):'';}
function response(value){return ({BRANCO:'Em branco',REVISAR:'Revisar',MULTIPLA:'Múltipla'})[value]??value??'';}
// Real XLSX cells: no CSV delimiters, joining of answers or formula interpolation.
export function buildSchoolWorkbook(school,students,scans){
 const workbook=new ExcelJS.Workbook();workbook.creator='Gabarito Óptico';workbook.created=new Date();
 const ordered=[...scans].sort((a,b)=>timestamp(b)-timestamp(a)||String(b.id).localeCompare(String(a.id)));
 const latest=new Map();for(const scan of ordered)if(scan.studentId&&!latest.has(scan.studentId))latest.set(scan.studentId,scan);
 const questionCount=scans.reduce((max,s)=>Math.max(max,Math.min(60,Math.max(s.count||0,s.answers?.length||0))),40);
 const headers=['Escola','Série','Turma','Disciplina','Nome do aluno','ID do aluno','Situação','Data/hora (Brasília)','Quantidade de questões',...Array.from({length:questionCount},(_,i)=>`Questão ${i+1}`),'ID da leitura','Arquivo de origem','Modelo da folha'];
 function row(student,scan){return [school.name,student?.grade??scan?.grade??'',student?.classroom??scan?.classroom??'',student?.discipline??scan?.discipline??'',student?.name??scan?.name??'Não identificado',student?.id??scan?.studentId??'',!scan?'Sem leitura':!scan.studentId?'Aluno não identificado':scan.answers?.some(a=>a==='REVISAR'||a==='MULTIPLA')?'Conferir marcações':'Lido',scan?dateLabel(scan):'',scan?.count??'',...Array.from({length:questionCount},(_,i)=>response(scan?.answers?.[i])),scan?.id??'',scan?.label??'',scan?.layout??''];}
 function add(name,rows){const ws=workbook.addWorksheet(name,{views:[{state:'frozen',ySplit:1}]});ws.addRow(headers);for(const values of rows)ws.addRow(values);ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:headers.length}};ws.columns.forEach((col,i)=>{col.width=i===0||i===4?38:i===3?28:i===5?36:i===7?25:i>=9&&i<9+questionCount?14:22;});ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF087D73'}};ws.getRow(1).height=34;ws.eachRow((r,n)=>{r.alignment={vertical:'top',wrapText:true};if(n>1){const longest=Math.max(...r.values.filter(v=>typeof v==='string').map(v=>v.length),0);r.height=Math.max(30,Math.ceil(longest/30)*15);}});return ws;}
 add('Alunos',students.map(s=>row(s,latest.get(s.id))));
 add('Todas as leituras',ordered.map(s=>row(null,s)));
 return workbook;
}
export async function downloadSchoolWorkbook(school,students,scans){const workbook=buildSchoolWorkbook(school,students,scans),bytes=await workbook.xlsx.writeBuffer(),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=`alunos-respostas-${school.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]/g,'-')}-${new Date().toISOString().slice(0,10)}.xlsx`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
