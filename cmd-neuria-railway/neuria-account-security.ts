/** CMD NEURIA account security primitives (Bun WebCrypto, no external dependency).
 * Does not store accounts or activate registration until persistent DB is connected.
 */
const enc=new TextEncoder();
export function validateEmail(raw:unknown):string {
 if(typeof raw!=="string"||raw.length>254)throw Error("Adresse e-mail invalide");
 const email=raw.trim().toLowerCase();
 if(!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email))throw Error("Adresse e-mail invalide");
 return email;
}
export function validatePassword(value:unknown):string {
 if(typeof value!=="string"||value.length<12||value.length>128)throw Error("Mot de passe : 12 à 128 caractères");
 return value;
}
function hex(bytes:Uint8Array):string{return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("")}
function unhex(s:string):Uint8Array {
 if(!/^[0-9a-f]+$/i.test(s)||s.length%2)throw Error("Encodage invalide");
 return Uint8Array.from(s.match(/../g)!.map(v=>parseInt(v,16)));
}
const ITERATIONS=310000;
async function pbkdf2(password:string,salt:Uint8Array,iterations:number):Promise<string>{
 const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations,hash:"SHA-256"},key,256);
 return hex(new Uint8Array(bits));
}
export async function hashPassword(password:unknown){
 const value=validatePassword(password);
 const salt=crypto.getRandomValues(new Uint8Array(16));
 return {password_hash:await pbkdf2(value,salt,ITERATIONS),password_salt:hex(salt),password_iterations:ITERATIONS};
}
export async function verifyPassword(password:unknown,record:{password_hash:string,password_salt:string,password_iterations:number}):Promise<boolean>{
 if(typeof password!=="string"||password.length>128||!Number.isInteger(record.password_iterations)||record.password_iterations<100000||record.password_iterations>1000000)return false;
 try{
  const candidate=unhex(await pbkdf2(password,unhex(record.password_salt),record.password_iterations));
  const expected=unhex(record.password_hash);
  if(candidate.length!==expected.length)return false;
  let mismatch=0;for(let i=0;i<candidate.length;i++)mismatch|=candidate[i]^expected[i];
  return mismatch===0;
 }catch{return false}
}
export function newSessionToken():string{
 return hex(crypto.getRandomValues(new Uint8Array(32)));
}
export async function hashSessionToken(token:string):Promise<string>{
 if(!/^[0-9a-f]{64}$/.test(token))throw Error("Jeton de session invalide");
 return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(token))));
}
