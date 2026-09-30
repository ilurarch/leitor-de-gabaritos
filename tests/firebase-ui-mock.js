let observer,school={id:'school-a',name:'Escola de teste',uid:'user-a'},roster={students:[],revision:0},scans=[];
export const explainFirebase=e=>e.message;
export function watchSession(fn){observer=fn;queueMicrotask(()=>fn(null));}
export async function identity(user){return user.master?{master:true}:{master:false,school};}
export async function listSchools(){return [school];}
export async function loginSchool(id,p){if(p!=='senha123')throw Error('Senha incorreta');await observer({uid:'user-a'});}
export async function loginMaster(p){if(p!=='SME26')throw Error('Senha incorreta');await observer({master:true});}
export async function logout(){await observer(null);}
export async function createSchool(name,p){school={...school,name};return school.id;}
export async function loadRoster(){return structuredClone(roster);}
export async function saveRoster(id,students,revision){roster={students,revision:revision+1};return roster.revision;}
export async function saveScan(id,result,student,label){scans.push({...student,answers:result.answers,label});}
export async function listScans(){return scans;}

export async function listAllScans(){return scans;}
