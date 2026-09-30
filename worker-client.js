let worker=null,nextId=0;
const pending=new Map();
function reset(message){worker?.terminate();worker=null;for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(message));}pending.clear();}
export function processImage(image,points,operation='read'){
 if(!worker){worker=new Worker(new URL('./omr-worker.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;pending.delete(data.id);clearTimeout(p.timer);if(data.error&&!data.needsAlignment)p.reject(Error(data.error));else p.resolve(data);};worker.onerror=()=>reset('Não foi possível iniciar o leitor. Recarregue a página e confira se todos os arquivos foram publicados.');}
 return new Promise((resolve,reject)=>{const id=++nextId,copy=new Uint8ClampedArray(image.data);const timer=setTimeout(()=>reset('A leitura demorou demais. Tente uma foto menor, nítida e bem enquadrada.'),45000);pending.set(id,{resolve,reject,timer});worker.postMessage({id,image:{width:image.width,height:image.height,data:copy},points,operation},[copy.buffer]);});
}
