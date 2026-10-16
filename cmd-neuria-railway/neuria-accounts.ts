import {quotaDatabase} from './neuria-generation-quota.ts';
import {validateEmail,validatePassword,hashPassword,verifyPassword,newSessionToken,hashSessionToken} from './neuria-account-security.ts';

const SESSION_MS=30*24*60*60*1000;
const COOKIE='neuria_session';
const failures=new Map<string,{count:number,until:number}>();
let initialized=false;
let dummyRecord:ReturnType<typeof hashPassword>|undefined;
function database(){
 const db=quotaDatabase();
 if(!initialized){
  db.exec(`CREATE TABLE IF NOT EXISTS neuria_accounts (
   id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
   password_salt TEXT NOT NULL, password_iterations INTEGER NOT NULL, created_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS neuria_sessions (
   token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES neuria_accounts(id),
   created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
   CREATE INDEX IF NOT EXISTS neuria_session_accounts ON neuria_sessions(account_id);`);
  initialized=true;
 }
 return db;
}
export function emailAccountsReady(){try{database();return true}catch{return false}}
const publicAccount=(row:any)=>({id:row.id,email:row.email,emailVerified:false,provider:"email"});
function cookieValue(req:Request){return (req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||''}
export async function accountForRequest(req:Request){
 const token=cookieValue(req);if(!/^[0-9a-f]{64}$/.test(token))return null;
 try{
  const row=database().query(`SELECT a.id,a.email FROM neuria_accounts a JOIN neuria_sessions s ON s.account_id=a.id WHERE s.token_hash=? AND s.expires_at>?`).get(await hashSessionToken(token),Date.now());
  return row?publicAccount(row):null;
 }catch{return null}
}
function sessionCookie(req:Request,token:string,maxAge:number){
 const secure=new URL(req.url).protocol==='https:'||!!Bun.env.RAILWAY_ENVIRONMENT_ID;
 return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`;
}
function json(data:unknown,status=200,cookie?:string){
 const headers=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
 if(cookie)headers.set('set-cookie',cookie);
 return new Response(JSON.stringify(data),{status,headers});
}
async function openSession(req:Request,row:any){
 const token=newSessionToken(),now=Date.now(),db=database(),digest=await hashSessionToken(token);
 db.transaction(()=>{
  db.query('DELETE FROM neuria_sessions WHERE expires_at<=?').run(now);
  db.query('INSERT INTO neuria_sessions(token_hash,account_id,created_at,expires_at) VALUES(?,?,?,?)').run(digest,row.id,now,now+SESSION_MS);
  db.query('DELETE FROM neuria_sessions WHERE account_id=? AND token_hash NOT IN (SELECT token_hash FROM neuria_sessions WHERE account_id=? ORDER BY created_at DESC,rowid DESC LIMIT 5)').run(row.id,row.id);
 })();
 return json({user:publicAccount(row)},200,sessionCookie(req,token,SESSION_MS/1000));
}
export async function handleAccountRequest(req:Request,clientIp='unknown'):Promise<Response|null>{
 const path=new URL(req.url).pathname;
 if(!['/api/neuria/auth/signup','/api/neuria/auth/login','/api/neuria/auth/logout','/api/neuria/auth/session','/api/neuria/auth/account'].includes(path))return null;
 if(path.endsWith('/session')){
  if(req.method!=='GET')return json({error:'Méthode non autorisée'},405);
  return json({user:await accountForRequest(req)});
 }
 if(req.method!==(path.endsWith('/account')?'DELETE':'POST'))return json({error:'Méthode non autorisée'},405);
 const origin=req.headers.get('origin'),site=req.headers.get('sec-fetch-site');
 const publicUrl=new URL(req.url);if(req.headers.get('x-forwarded-proto')==='https')publicUrl.protocol='https:';
 if(site==='cross-site'||(origin&&origin!==publicUrl.origin))return json({error:'Origine non autorisée'},403);
 if(!req.headers.get('content-type')?.startsWith('application/json'))return json({error:'Envoi JSON requis'},415);
 if(!emailAccountsReady())return json({error:'Stockage des comptes indisponible'},503);
 if(path.endsWith('/logout')){
  const token=cookieValue(req);
  if(/^[0-9a-f]{64}$/.test(token))database().query('DELETE FROM neuria_sessions WHERE token_hash=?').run(await hashSessionToken(token));
  return json({signedOut:true},200,sessionCookie(req,'',0));
 }
 const now=Date.now();
 if(failures.size>10000)for(const [key,value] of failures)if(value.until<=now)failures.delete(key);
 const key=clientIp+':'+path,previous=failures.get(key);
 if(!previous&&failures.size>=10000)return json({error:'Service très sollicité. Réessaie plus tard.'},429);
 if(previous&&previous.until>now&&previous.count>=10)return json({error:'Trop de tentatives. Réessaie dans 15 minutes.'},429);
 const counter=previous&&previous.until>now?previous:{count:0,until:now+15*60*1000};
 counter.count++;failures.set(key,counter);
 if(Number(req.headers.get('content-length')||0)>4096)return json({error:'Requête trop volumineuse'},413);
 let body:any,email:string,password:string;
 try{
  const raw=await req.text();if(raw.length>4096)return json({error:'Requête trop volumineuse'},413);
  body=JSON.parse(raw);if(!path.endsWith('/account'))email=validateEmail(body?.email);password=validatePassword(body?.password);
 }catch{return json({error:'Adresse e-mail valide et mot de passe de 12 à 128 caractères requis.'},400)}
 try{
  const db=database();
  if(path.endsWith('/account')){
   const account=await accountForRequest(req);if(!account)return json({error:'Connexion requise'},401);
   const row:any=db.query('SELECT * FROM neuria_accounts WHERE id=?').get(account.id);
   if(!row||!await verifyPassword(password,row))return json({error:'Mot de passe incorrect.'},401);
   db.transaction(()=>{db.query('DELETE FROM neuria_sessions WHERE account_id=?').run(account.id);db.query('DELETE FROM neuria_accounts WHERE id=?').run(account.id)})();
   return json({deleted:true},200,sessionCookie(req,'',0));
  }
  if(path.endsWith('/signup')){
   const credentials=await hashPassword(password),id=crypto.randomUUID();
   try{db.query('INSERT INTO neuria_accounts(id,email,password_hash,password_salt,password_iterations,created_at) VALUES(?,?,?,?,?,?)').run(id,email,credentials.password_hash,credentials.password_salt,credentials.password_iterations,now)}
   catch(e){if(String(e).includes('UNIQUE'))return json({error:'Impossible de créer ce compte. Essaie de te connecter.'},409);throw e}
   return await openSession(req,{id,email});
  }
  const row:any=db.query('SELECT * FROM neuria_accounts WHERE email=?').get(email);
  dummyRecord??=hashPassword('neuria-dummy-password-not-for-login');
  const valid=await verifyPassword(password,row||await dummyRecord);
  if(!row||!valid)return json({error:'Adresse e-mail ou mot de passe incorrect.'},401);
  return await openSession(req,row);
 }catch{return json({error:'Service de comptes temporairement indisponible'},503)}
}
