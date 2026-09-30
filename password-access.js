// Simple screen-level access requested by the owner. This is not server authorization.
const encoder=new TextEncoder();
export async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:120000},key,256);return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('');}
export async function checkPassword(password,record){if(!record?.passwordHash||!record?.passwordSalt)return false;return await passwordHash(password,record.passwordSalt)===record.passwordHash;}
export const checkMaster=password=>password==='SME26';
