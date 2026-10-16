import {test,expect} from 'bun:test';
import {Window} from 'happy-dom';
import {accountUiRuntime} from './neuria-account-ui.ts';
async function until(predicate:()=>boolean){for(let i=0;i<100;i++){if(predicate())return;await Bun.sleep(10)}throw Error('UI did not reach the expected state');}
function browser(initialUser=null){
 const window=new Window({url:'https://neuria.example',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 window.document.body.innerHTML='<nav id="neuriaMenu"></nav><main><input id="message"></main>';
 let user=initialUser;const calls=[];
 window.fetch=(async(url,init)=>{
  calls.push({url,init});
  if(String(url).endsWith('/session'))return Response.json({user:user?.provider==='github'?null:user});
  if(String(url).endsWith('/github/status'))return Response.json(user?.provider==='github'?{connected:true,login:'existing-user'}:{connected:false});
  if(String(url).endsWith('/providers'))return Response.json({providers:{email:{enabled:true},github:{enabled:false}}});
  if(/\/(signup|login)$/.test(String(url))){const body=JSON.parse(init.body);user={id:'test-user',email:body.email,emailVerified:false,provider:'email'};return Response.json({user})}
  if(String(url).endsWith('/logout')){user=null;return Response.json({signedOut:true})}
  if(String(url).endsWith('/disconnect'))return Response.json({disconnected:true});
  throw Error('Unexpected request '+url);
 }) as any;
 window.eval('('+accountUiRuntime.toString()+')();');
 return {window,calls};
}
test('email account form submits, shows the account, then signs out',async()=>{
 const {window:w,calls}=browser();
 try{
  await until(()=>!!w.document.querySelector('#neuriaEmailSignIn'));
  w.document.querySelector('#neuriaEmailSignIn').click();
  const form=w.document.querySelector('#neuriaEmailForm');expect(form).not.toBeNull();
  form.querySelector('button[type=button]').click();
  form.querySelector('[name=email]').value='test@example.com';form.querySelector('[name=password]').value='phrase-longue-et-sure';
  form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await until(()=>!w.document.querySelector('#neuriaAuthEntry'));
  expect(calls.some(c=>String(c.url).endsWith('/signup'))).toBe(true);
  expect(w.document.querySelector('#neuriaAccountButton').textContent).toContain('test@example.com');
  expect(w.localStorage.getItem('password')).toBeNull();
  w.document.querySelector('#neuriaAccountButton').click();expect(w.document.querySelector('#neuriaAuthEntry').textContent).toContain('adresse non vérifiée');
  w.document.querySelector('#neuriaSignOut').click();await until(()=>!!w.document.querySelector('#neuriaEmailSignIn'));
  expect(w.document.querySelector('#neuriaAccountButton').textContent).toBe('Mon compte');
 }finally{await w.happyDOM.close()}
});
test('a restored email session skips onboarding and guest access remains available',async()=>{
 const {window:w}=browser({id:'existing',email:'existing@example.com',provider:'email'});
 try{
  await until(()=>w.document.querySelector('#neuriaAccountButton').textContent.includes('existing@example.com'));
  expect(w.document.querySelector('#neuriaAuthEntry')).toBeNull();
 }finally{await w.happyDOM.close()}
 const {window:guest}=browser();
 try{
  await until(()=>!!guest.document.querySelector('#neuriaGuestSignIn'));
  guest.document.querySelector('#neuriaGuestSignIn').click();
  expect(guest.localStorage.getItem('neuriaGuestContinue')).toBe('1');expect(guest.document.querySelector('#neuriaAuthEntry')).toBeNull();
  guest.document.querySelector('#neuriaAccountButton').click();expect(guest.document.querySelector('#neuriaAuthEntry')).not.toBeNull();
 }finally{await guest.happyDOM.close()}
});

test('an existing GitHub connection is also recognized',async()=>{
 const {window:w}=browser({provider:'github'});
 try{await until(()=>w.document.querySelector('#neuriaAccountButton').textContent.includes('GitHub @existing-user'));expect(w.document.querySelector('#neuriaAuthEntry')).toBeNull();w.document.querySelector('#neuriaAccountButton').click();expect(w.document.querySelector('#neuriaAuthEntry').textContent).toContain('compte GitHub connecté');}
 finally{await w.happyDOM.close()}
});
