import {initializeApp} from 'firebase/app';
import {passwordHash,checkPassword,checkMaster} from './password-access.js';
import {getFirestore,collection,doc,getDocs,getDoc,setDoc,runTransaction,serverTimestamp,addDoc,query,orderBy,limit,startAfter,documentId} from 'firebase/firestore';
export const firebaseConfig={apiKey:'AIzaSyAwFesjgYP_kIR3_Xmgdz7CacGr95RmFLo',authDomain:'gen-lang-client-0646380614.firebaseapp.com',projectId:'gen-lang-client-0646380614',storageBucket:'gen-lang-client-0646380614.firebasestorage.app',messagingSenderId:'986177589102',appId:'1:986177589102:web:50e4a9e4629c82eca2fb7f'};
const app=initializeApp(firebaseConfig),db=getFirestore(app,'leitoroptico');
const root=['leitoroptico','main','schools'];
let session=null;const listeners=new Set();
// Session exists only in memory. Reloading asks for the password again.
async function updateSession(next){session=next;await Promise.all([...listeners].map(fn=>fn(next)));}
export function watchSession(fn){listeners.add(fn);queueMicrotask(()=>fn(session));return ()=>listeners.delete(fn);}
export const logout=()=>updateSession(null);
export async function listSchools(){const snapshot=await getDocs(collection(db,...root));return snapshot.docs.map(d=>({id:d.id,name:d.data().name})).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));}
export async function loginSchool(id,password){const snap=await getDoc(doc(db,...root,id));if(!snap.exists()||!await checkPassword(password,snap.data()))throw Error('Escola ou senha incorreta.');await updateSession({master:false,school:{id,name:snap.data().name}});}
export async function loginMaster(password){if(!checkMaster(password))throw Error('Senha administrativa incorreta.');await updateSession({master:true});}
export async function identity(user){if(user!==session)throw Error('Entre novamente.');return user;}
function requireSchool(id){if(!session||(!session.master&&session.school?.id!==id))throw Error('Entre na escola para continuar.');}
const author=()=>session?.master?'master':session?.school?.id||'unknown';
export async function createSchool(name,password){
 if(!session?.master)throw Error('Acesso exclusivo do administrador.');
 name=name.trim().replace(/\s+/g,' ');if(!name||name.length>120||password.length<1||password.length>100)throw Error('Informe a escola e uma senha de até 100 caracteres.');
 const schools=await listSchools();if(schools.some(s=>s.name.localeCompare(name,'pt-BR',{sensitivity:'base'})===0))throw Error('Já existe uma escola com esse nome.');
 const id=crypto.randomUUID(),salt=crypto.randomUUID(),hash=await passwordHash(password,salt);
 await setDoc(doc(db,...root,id),{name,passwordSalt:salt,passwordHash:hash,createdAt:serverTimestamp()});return id;
}
export async function loadRoster(schoolId){requireSchool(schoolId);const snap=await getDoc(doc(db,...root,schoolId,'roster','current'));return snap.exists()?snap.data():{students:[],revision:0};}
export async function saveRoster(schoolId,students,revision){requireSchool(schoolId);
 const reference=doc(db,...root,schoolId,'roster','current');
 return runTransaction(db,async tx=>{const old=await tx.get(reference),current=old.exists()?old.data().revision:0;if(current!==revision)throw Error('A lista foi alterada em outro dispositivo. Saia e entre novamente antes de editar.');tx.set(reference,{students,revision:current+1,updatedAt:serverTimestamp(),updatedBy:author()});return current+1;});
}
export async function saveScan(schoolId,result,student,label){requireSchool(schoolId);return addDoc(collection(db,...root,schoolId,'scans'),{studentId:student?.id||null,name:student?.name||'Não identificado',grade:student?.grade||'',classroom:student?.classroom||'',discipline:student?.discipline||'',answers:result.answers,count:result.count,layout:result.layout||'',label:label.slice(0,180),createdAt:serverTimestamp(),createdBy:author()});}
export async function listScans(schoolId){requireSchool(schoolId);const result=await getDocs(query(collection(db,...root,schoolId,'scans'),orderBy('createdAt','desc'),limit(50)));return result.docs.map(d=>({id:d.id,...d.data()}));}
// Export reads every page; the 50-row limit applies only to the on-screen history.
export async function listAllScans(schoolId){requireSchool(schoolId);const all=[];let cursor=null;
 while(true){requireSchool(schoolId);const constraints=[orderBy(documentId()),limit(500)];if(cursor)constraints.push(startAfter(cursor));const page=await getDocs(query(collection(db,...root,schoolId,'scans'),...constraints));all.push(...page.docs.map(d=>({id:d.id,...d.data()})));if(page.size<500)break;cursor=page.docs.at(-1);}return all;
}
export function explainFirebase(error){const code=error?.code||'';if(/permission-denied/.test(code))return 'O banco recusou a operação. Aplique firestore.rules no banco leitoroptico para permitir o modo de senha simples.';if(/network|unavailable/.test(code))return 'Sem conexão com o Firebase. A gravação não foi confirmada. Tente novamente.';return error?.message||'Não foi possível concluir a operação.';}
