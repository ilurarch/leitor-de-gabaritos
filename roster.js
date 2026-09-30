const headers=['ESCOLA','SERIE','TURMA','NOME'];
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
// CSV with semicolon (Excel PT-BR), comma or tab. Quotes and embedded newlines are supported.
export function parseCsv(text){
 text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0];
 const delimiter=[';',',','\t'].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===delimiter&&!quoted){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=ch;}
 if(quoted)throw Error('O CSV tem aspas sem fechamento. Exporte novamente a planilha.');
 if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
export async function importStudents(rows){
 const headerIndex=rows.findIndex(row=>row.some(v=>v!==null&&v!==undefined&&String(v).trim()!==''));
 if(headerIndex<0)throw Error('A planilha está vazia.');
 const names=rows[headerIndex].map(normalize),positions=headers.map(h=>names.indexOf(h));
 const missing=headers.filter((_,i)=>positions[i]<0);if(missing.length)throw Error(`Colunas ausentes: ${missing.join(', ')}. Use ESCOLA, SÉRIE, TURMA e NOME na primeira linha.`);
 if(headers.some(h=>names.filter(n=>n===h).length>1))throw Error('Existem cabeçalhos duplicados. Mantenha uma coluna de cada tipo.');
 const students=[],errors=[],occurrences=new Map();
 for(let index=headerIndex+1;index<rows.length;index++){
  const row=rows[index];if(row.every(v=>v===null||v===undefined||String(v).trim()===''))continue;
  const values=positions.map(p=>row[p]);
  const invalid=values.findIndex(v=>!['string','number'].includes(typeof v)||String(v).trim()==='');
  if(invalid>=0){errors.push(`Linha ${index+1}: preencha ${headers[invalid]}.`);continue;}
  const [school,grade,classroom,name]=values.map(v=>String(v).trim().replace(/\s+/g,' '));
  if(school.length>120||name.length>120||grade.length>40||classroom.length>40){errors.push(`Linha ${index+1}: use até 120 caracteres em escola/nome e 40 em série/turma.`);continue;}
  const canonical=JSON.stringify([school,grade,classroom,name]),ordinal=(occurrences.get(canonical)||0)+1;occurrences.set(canonical,ordinal);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical+'|'+ordinal));
  const id=Array.from(new Uint8Array(digest).slice(0,16),x=>x.toString(16).padStart(2,'0')).join('');
  students.push({id,school,grade,classroom,name});
  if(students.length>500)throw Error('Importe até 500 alunos por vez. Divida a planilha em lotes menores.');
 }
 if(errors.length)throw Error(errors.slice(0,8).join('\n')+(errors.length>8?`\nMais ${errors.length-8} linha(s) com problema.`:''));
 if(!students.length)throw Error('Não há alunos abaixo do cabeçalho.');return students;
}
