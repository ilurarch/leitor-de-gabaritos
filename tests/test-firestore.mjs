import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,serverTimestamp} from 'firebase/firestore';
import {readFileSync} from 'node:fs';
const env=await initializeTestEnvironment({projectId:'demo-leitoroptico',firestore:{rules:readFileSync('firestore.rules','utf8')}});
try{
 const db=env.unauthenticatedContext().firestore(),path='leitoroptico/main/schools/a';
 await assertSucceeds(setDoc(doc(db,path),{name:'Escola A',passwordHash:'a'.repeat(64),passwordSalt:'s'.repeat(36),createdAt:serverTimestamp()}));
 await assertSucceeds(getDoc(doc(db,path)));
 await assertFails(setDoc(doc(db,'unrelated/app'),{name:'Outside scope'}));
 await assertSucceeds(setDoc(doc(db,path+'/roster/current'),{students:[],revision:1,updatedBy:'a',updatedAt:serverTimestamp()}));
 await assertSucceeds(getDoc(doc(db,path+'/roster/current')));
 const scan={answers:['A','BRANCO'],count:2,createdBy:'a',createdAt:serverTimestamp()};
 await assertSucceeds(setDoc(doc(db,path+'/scans/one'),scan));
 await assertFails(setDoc(doc(db,path+'/scans/invalid'),{...scan,answers:['Z','A']}));
 console.log('PASS: requested no-auth mode, document validation, no grants outside the app namespace.');
}finally{await env.cleanup();}
